import "./load-env";

import { getSeededCompanyViews } from "../src/lib/metrics/companyViews";
import {
  createSupabasePrivilegedClient,
  hasSupabasePrivilegedCredentials,
} from "../src/lib/supabase/privileged";
import { getPublishedCompanies } from "../src/lib/supabase/market-data";

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
      views: Math.max(
        existingViews.get(company.id) ?? 0,
        getSeededCompanyViews(company.id),
      ),
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

seedCompanyViewCounts()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
