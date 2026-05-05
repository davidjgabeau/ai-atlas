import "./load-env";

import { getCompanySignalLabel } from "../src/lib/signals/companySignal";
import {
  createSupabasePrivilegedClient,
  hasSupabasePrivilegedCredentials,
} from "../src/lib/supabase/privileged";
import { getPublishedCompanies } from "../src/lib/supabase/market-data";
import type { Company } from "../src/types/market";

const force = process.argv.includes("--force");

// Seeded initial display counts for launch. Real increments are tracked from this baseline.
async function seedCompanyViewCounts() {
  const supabase = createSupabasePrivilegedClient();

  if (!supabase || !hasSupabasePrivilegedCredentials()) {
    console.log(
      "Skipped view count seeding: Supabase privileged credentials are not configured.",
    );
    return { ok: true, seeded: 0, skipped: 0 };
  }

  const companies = await getPublishedCompanies();
  const { data: existingRows, error: existingError } = await supabase
    .from("company_view_metrics")
    .select("company_id, views");

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingViews = new Map(
    ((existingRows ?? []) as Array<{ company_id: string; views: number | null }>).map(
      (row) => [row.company_id, row.views ?? 0],
    ),
  );
  const now = new Date().toISOString();
  const rows = companies
    .filter((company) => force || !existingViews.has(company.id))
    .map((company) => ({
      company_id: company.id,
      views: getSeededViews(company),
      last_viewed_at: now,
    }));

  if (rows.length === 0) {
    return { ok: true, seeded: 0, skipped: companies.length };
  }

  const { error } = await supabase
    .from("company_view_metrics")
    .upsert(rows, { onConflict: "company_id" });

  if (error) throw new Error(error.message);

  return {
    ok: true,
    seeded: rows.length,
    skipped: companies.length - rows.length,
  };
}

function getSeededViews(company: Company) {
  const signal = getCompanySignalLabel(company);

  if (company.is_breakout || signal === "Featured" || signal === "Funding signal") {
    return stableRange(company.id, 800, 2_500);
  }

  if (
    company.is_featured ||
    signal === "Clear buyer pull" ||
    signal === "Infra signal"
  ) {
    return stableRange(company.id, 300, 1_200);
  }

  return stableRange(company.id, 80, 450);
}

function stableRange(seed: string, min: number, max: number) {
  const hash = Array.from(seed).reduce(
    (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
    17,
  );

  return min + (hash % (max - min + 1));
}

seedCompanyViewCounts()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
