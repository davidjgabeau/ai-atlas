import { cache } from "react";

import {
  companies as localCompanies,
  submissions as localSubmissions,
} from "@/data/market";
import { validateDiscoveredCompanyCandidate } from "@/lib/agent/companyCandidateValidation";
import { generateCompanyHook } from "@/lib/editorial/generateCompanyHook";
import {
  getCompanyViewMetrics,
  normalizeCompanyMetric,
} from "@/lib/metrics/companyViews";
import { normalizeSignalLabel } from "@/lib/signals/companySignal";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  categories,
  companyStatuses,
  submissionStatuses,
  usagePotentials,
  type Category,
  type Company,
  type CompanyMetrics,
  type CompanyProfileBriefs,
  type CompanyStatus,
  type DiscoveryReason,
  type GeneratedCompanyFields,
  type InclusionReason,
  type Submission,
  type SubmissionStatus,
  type UsagePotential,
} from "@/types/market";

type CompanyRow = Partial<Company> & {
  generated?: GeneratedCompanyFields | null;
  discovery_reason?: DiscoveryReason | null;
  inclusion_reason?: InclusionReason | null;
  metrics?: CompanyMetrics | null;
};

type SubmissionRow = Partial<Submission>;

export const getMarketCompanies = cache(async (): Promise<Company[]> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) return localCompanies;

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.warn("Supabase companies fallback:", error?.message);
    return localCompanies;
  }

  return normalizeCompanyRowsWithMetrics(data as CompanyRow[]);
});

export async function getAdminMarketCompanies(): Promise<Company[]> {
  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) return localCompanies;

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.warn("Supabase admin companies fallback:", error?.message);
    return localCompanies;
  }

  return normalizeCompanyRowsWithMetrics(data as CompanyRow[]);
}

export const getPublishedCompanies = cache(async () => {
  const companies = await getMarketCompanies();
  return companies.filter(isPublicCompany);
});

export const getMarketSubmissions = cache(async (): Promise<Submission[]> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) return localSubmissions;

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("Supabase submissions fallback:", error?.message);
    return localSubmissions;
  }

  return (data as SubmissionRow[]).map(normalizeSubmission);
});

export async function getAdminMarketSubmissions(): Promise<Submission[]> {
  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) return localSubmissions;

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("Supabase admin submissions fallback:", error?.message);
    return localSubmissions;
  }

  return (data as SubmissionRow[]).map(normalizeSubmission);
}

export async function getCompanyBySlugFromData(slug: string) {
  const companies = await getMarketCompanies();
  return companies.find(
    (company) => company.slug === slug && isPublicCompany(company),
  );
}

export async function getCompaniesByCategoryFromData(category: Category) {
  const companies = await getMarketCompanies();
  return companies.filter(
    (company) => company.category === category && isPublicCompany(company),
  );
}

export function isPublicCompany(company: Company) {
  return (
    company.status === "published" &&
    validateDiscoveredCompanyCandidate({
      name: company.name,
      website: company.website_url,
      sourceText: [
        company.short_description,
        company.one_line_thesis,
        company.why_it_matters,
        company.funding_note,
      ].join("\n"),
    }).ok
  );
}

export function normalizeCompany(row: CompanyRow): Company {
  const id = safeString(row.id, `cmp_${safeString(row.slug, "unknown")}`);
  const now = new Date().toISOString();

  const company: Company = {
    id,
    name: safeString(row.name, "Untitled Startup"),
    slug: safeString(row.slug, id),
    logo_url: safeString(row.logo_url, ""),
    website_url: safeString(row.website_url, ""),
    x_handle: normalizeSocialHandle(row.x_handle),
    x_user_id: safeString(row.x_user_id, ""),
    x_last_synced_at: row.x_last_synced_at
      ? safeString(row.x_last_synced_at, "")
      : undefined,
    founder_name: row.founder_name ? String(row.founder_name) : undefined,
    office_address: safeString(row.office_address, ""),
    funding_round: safeString(row.funding_round, ""),
    funding_amount: safeString(row.funding_amount, ""),
    funding_date: safeString(row.funding_date, ""),
    total_raised: safeString(row.total_raised, ""),
    lead_investor: safeString(row.lead_investor, ""),
    funding_note: safeString(row.funding_note, ""),
    category: normalizeCategory(row.category),
    stage: safeString(row.stage, "Unknown"),
    short_description: safeString(row.short_description, ""),
    one_line_thesis: safeString(row.one_line_thesis, ""),
    why_it_matters: safeString(row.why_it_matters, ""),
    ai_usage_profile: safeString(row.ai_usage_profile, ""),
    openai_fit: safeString(row.openai_fit, ""),
    usage_potential: normalizeUsagePotential(row.usage_potential),
    recent_activity_text: safeString(row.recent_activity_text, ""),
    recent_activity_date: safeString(row.recent_activity_date, now),
    is_featured: Boolean(row.is_featured),
    is_breakout: Boolean(row.is_breakout),
    status: normalizeCompanyStatus(row.status),
    created_at: safeString(row.created_at, now),
    updated_at: safeString(row.updated_at, now),
    generated: createFallbackGenerated(row),
    discoveryReason: normalizeDiscoveryReason(
      row.discoveryReason ?? row.discovery_reason,
    ),
    inclusionReason: normalizeInclusionReason(
      row.inclusionReason ?? row.inclusion_reason,
    ),
    metrics: normalizeCompanyMetric(row.metrics),
  };

  const generated = normalizeGenerated(row.generated, company) ?? generateCompanyHook(company);

  return {
    ...company,
    generated: {
      ...generated,
      signalLabel: normalizeSignalLabel(generated.signalLabel, company),
    },
  };
}

async function normalizeCompanyRowsWithMetrics(rows: CompanyRow[]) {
  const metricsByCompanyId = await getCompanyViewMetrics(
    rows.map((row) => safeString(row.id, "")).filter(Boolean),
  );

  return rows.map((row) =>
    normalizeCompany({
      ...row,
      metrics: metricsByCompanyId.get(safeString(row.id, "")) ?? row.metrics,
    }),
  );
}

function normalizeDiscoveryReason(value: unknown): DiscoveryReason | undefined {
  if (!value || typeof value !== "object") return undefined;
  const reason = value as Partial<DiscoveryReason>;

  return {
    trigger: normalizeDiscoveryTrigger(reason.trigger),
    sourceEventIds: normalizeStringArray(reason.sourceEventIds),
    sourceUrls: normalizeStringArray(reason.sourceUrls),
    confidence: normalizeConfidence(reason.confidence),
    notes: safeString(reason.notes, ""),
  };
}

function normalizeInclusionReason(value: unknown): InclusionReason | undefined {
  if (!value || typeof value !== "object") return undefined;
  const reason = value as Partial<InclusionReason>;
  const body = safeString(reason.body, "");
  if (!body) return undefined;

  return {
    title: safeString(reason.title, "Why it was added"),
    body,
    generatedAt: safeString(reason.generatedAt, ""),
    sourceEventIds: normalizeStringArray(reason.sourceEventIds),
    sourceCompanyIds: normalizeStringArray(reason.sourceCompanyIds),
  };
}

function normalizeDiscoveryTrigger(value: unknown): DiscoveryReason["trigger"] {
  return value === "manual" ||
    value === "cron_discovery" ||
    value === "source_update" ||
    value === "funding_signal" ||
    value === "press_signal" ||
    value === "profile_import"
    ? value
    : "manual";
}

function normalizeConfidence(value: unknown): DiscoveryReason["confidence"] {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function normalizeSubmission(row: SubmissionRow): Submission {
  return {
    id: safeString(row.id, `sub_${Date.now()}`),
    company_name: safeString(row.company_name, ""),
    website_url: safeString(row.website_url, ""),
    founder_name: safeString(row.founder_name, ""),
    email: safeString(row.email, ""),
    description: safeString(row.description, ""),
    usage_potential: row.usage_potential
      ? normalizeUsagePotential(row.usage_potential)
      : undefined,
    status: normalizeSubmissionStatus(row.status),
    created_at: safeString(row.created_at, new Date().toISOString()),
  };
}

function createFallbackGenerated(row: CompanyRow): GeneratedCompanyFields {
  const description = safeString(row.short_description, "");

  return {
    hook: description.replace(/\s+/g, " ").replace(/\.$/, "").slice(0, 72),
    signalLabel: "Recently added",
    signalReason: "Generated editorial fields are missing in Supabase.",
    keywords: [],
    trendDimensions: [],
    generatedAt: "",
    sourceHash: "",
    profileBriefs: undefined,
  };
}

function normalizeGenerated(
  value: unknown,
  company?: Company,
): GeneratedCompanyFields | null {
  if (!value || typeof value !== "object") return null;

  const generated = value as Partial<GeneratedCompanyFields>;
  if (!generated.hook || !generated.signalLabel || !generated.signalReason) {
    return null;
  }

  return {
    hook: safeString(generated.hook, ""),
    signalLabel: normalizeSignalLabel(generated.signalLabel, company),
    signalReason: safeString(generated.signalReason, ""),
    keywords: Array.isArray(generated.keywords) ? generated.keywords : [],
    trendDimensions: Array.isArray(generated.trendDimensions)
      ? generated.trendDimensions
      : [],
    generatedAt: safeString(generated.generatedAt, ""),
    sourceHash: safeString(generated.sourceHash, ""),
    profileBriefs: normalizeProfileBriefs(generated.profileBriefs),
  };
}

function normalizeProfileBriefs(value: unknown): CompanyProfileBriefs | undefined {
  if (!value || typeof value !== "object") return undefined;
  const briefs = value as Partial<CompanyProfileBriefs>;
  const whySaving = safeString(briefs.whySaving, "");
  const whatBuilding = safeString(briefs.whatBuilding, "");
  const aiModelUse = safeString(briefs.aiModelUse, "");
  if (!whySaving || !whatBuilding || !aiModelUse) return undefined;

  return {
    whySaving,
    whatBuilding,
    aiModelUse,
    generatedAt: safeString(briefs.generatedAt, ""),
    sourceHash: safeString(briefs.sourceHash, ""),
    model: briefs.model ? safeString(briefs.model, "") : undefined,
  };
}

function normalizeCategory(value: unknown): Category {
  return categories.includes(value as Category)
    ? (value as Category)
    : "Fintech & Trading AI";
}

function normalizeUsagePotential(value: unknown): UsagePotential {
  return usagePotentials.includes(value as UsagePotential)
    ? (value as UsagePotential)
    : "Promising";
}

function normalizeCompanyStatus(value: unknown): CompanyStatus {
  return companyStatuses.includes(value as CompanyStatus)
    ? (value as CompanyStatus)
    : "published";
}

function normalizeSubmissionStatus(value: unknown): SubmissionStatus {
  return submissionStatuses.includes(value as SubmissionStatus)
    ? (value as SubmissionStatus)
    : "new";
}

function safeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function normalizeSocialHandle(value: unknown) {
  if (typeof value !== "string") return "";

  return value.replace(/^@/, "").trim();
}
