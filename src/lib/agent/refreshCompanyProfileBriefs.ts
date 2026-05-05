import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { companies as localCompanies } from "@/data/market";
import {
  getCompanyProfileBriefSourceHash,
  isUsableBrief,
} from "@/lib/editorial/companyProfileBriefs";
import {
  createSupabasePrivilegedClient,
  hasSupabasePrivilegedCredentials,
} from "@/lib/supabase/privileged";
import { normalizeCompany } from "@/lib/supabase/market-data";
import type { CompanyProfileBriefs } from "@/types/market";

import {
  generateCompanyProfileBriefsWithAnthropic,
  isAnthropicCompanyBriefsEnabled,
} from "./generateCompanyProfileBriefsWithAnthropic";

type RefreshCompanyProfileBriefsOptions = {
  force?: boolean;
  limit?: number;
  persistJson?: boolean;
};

type CompanyProfileBriefsFile = {
  generatedAt: string;
  companies: Record<string, CompanyProfileBriefs>;
};

export type RefreshCompanyProfileBriefsResult = {
  ok: boolean;
  companiesChecked: number;
  briefsGenerated: number;
  briefsPersisted: number;
  skipped: number;
  errors: Array<{ company: string; error: string }>;
};

const briefsPath = path.join(
  process.cwd(),
  "src",
  "data",
  "company-profile-briefs.json",
);

export async function refreshCompanyProfileBriefs({
  force = false,
  limit = 60,
  persistJson = process.env.NODE_ENV !== "production",
}: RefreshCompanyProfileBriefsOptions = {}): Promise<RefreshCompanyProfileBriefsResult> {
  if (!isAnthropicCompanyBriefsEnabled()) {
    return {
      ok: false,
      companiesChecked: 0,
      briefsGenerated: 0,
      briefsPersisted: 0,
      skipped: 0,
      errors: [
        {
          company: "Anthropic",
          error: "ANTHROPIC_API_KEY is required to generate company profile briefs.",
        },
      ],
    };
  }

  const supabase = createSupabasePrivilegedClient();
  const canPersistSupabase = Boolean(supabase && hasSupabasePrivilegedCredentials());
  const companies = await loadCompaniesForBriefs(limit, supabase);
  const currentFile = await readBriefsFile();
  const nextFile: CompanyProfileBriefsFile = {
    generatedAt: currentFile.generatedAt,
    companies: { ...currentFile.companies },
  };

  let briefsGenerated = 0;
  let briefsPersisted = 0;
  let skipped = 0;
  const errors: RefreshCompanyProfileBriefsResult["errors"] = [];

  for (const company of companies) {
    const sourceHash = getCompanyProfileBriefSourceHash(company);
    const existingBriefs =
      company.generated.profileBriefs ?? nextFile.companies[company.id];

    if (!force && existingBriefs && isUsableBrief(existingBriefs, sourceHash)) {
      skipped += 1;
      continue;
    }

    const generated = await generateCompanyProfileBriefsWithAnthropic(company);
    if (!generated.briefs) {
      errors.push({
        company: company.name,
        error: generated.error ?? "Unable to generate company profile briefs.",
      });
      continue;
    }

    briefsGenerated += 1;
    nextFile.generatedAt = generated.briefs.generatedAt;
    nextFile.companies[company.id] = generated.briefs;

    if (canPersistSupabase && supabase) {
      const { error } = await supabase
        .from("companies")
        .update({
          generated: {
            ...company.generated,
            profileBriefs: generated.briefs,
          },
        })
        .eq("id", company.id);

      if (error) {
        errors.push({ company: company.name, error: error.message });
      } else {
        briefsPersisted += 1;
      }
    }
  }

  if (persistJson && briefsGenerated > 0) {
    await writeBriefsFile(nextFile);
  }

  if (!canPersistSupabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push({
      company: "Supabase",
      error:
        "SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY, or SUPABASE_AGENT_WRITE_SECRET is required to persist briefs in production.",
    });
  }

  return {
    ok: errors.length === 0,
    companiesChecked: companies.length,
    briefsGenerated,
    briefsPersisted,
    skipped,
    errors,
  };
}

async function loadCompaniesForBriefs(
  limit: number,
  supabase: ReturnType<typeof createSupabasePrivilegedClient>,
) {
  if (supabase) {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (!error && data) return data.map((row) => normalizeCompany(row));
  }

  return localCompanies
    .filter((company) => company.status === "published")
    .slice(0, limit);
}

async function readBriefsFile(): Promise<CompanyProfileBriefsFile> {
  const raw = await readFile(briefsPath, "utf8").catch(() => "");
  if (!raw) return { generatedAt: "", companies: {} };

  try {
    const parsed = JSON.parse(raw) as CompanyProfileBriefsFile;
    return {
      generatedAt: parsed.generatedAt ?? "",
      companies: parsed.companies ?? {},
    };
  } catch {
    return { generatedAt: "", companies: {} };
  }
}

async function writeBriefsFile(file: CompanyProfileBriefsFile) {
  await mkdir(path.dirname(briefsPath), { recursive: true });
  await writeFile(briefsPath, `${JSON.stringify(file, null, 2)}\n`);
}
