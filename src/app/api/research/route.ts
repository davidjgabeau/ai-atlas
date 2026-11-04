import { getResearchDataset } from "@/lib/research/dataset";
import { citywideComparisonToCsv, companiesToCsv, filterResearchCompanies, summarizeCitywideCoverage } from "@/lib/research/evidence";
import { buildResearchMapGroups, researchMapToGeoJson } from "@/lib/research/map";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const data = await getResearchDataset();
  const coverage = summarizeCitywideCoverage(data.companies);
  if (url.searchParams.get("format") === "comparison") return new Response(`\uFEFF${citywideComparisonToCsv(coverage)}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="ai-atlas-citywide-comparison.csv"', "Cache-Control": "no-store" },
  });
  const filters = {
    query: url.searchParams.get("q") ?? "", borough: url.searchParams.get("borough") ?? "",
    neighborhood: url.searchParams.get("neighborhood") ?? "", stage: url.searchParams.get("stage") ?? "",
    category: url.searchParams.get("category") ?? "", evidence: url.searchParams.get("evidence") ?? "",
    outside: url.searchParams.get("outside") === "1",
  };
  const companies = filterResearchCompanies(data.companies, filters);
  if (url.searchParams.get("format") === "geojson") return Response.json(researchMapToGeoJson(buildResearchMapGroups(companies, filters)), {
    headers: { "Content-Type": "application/geo+json", "Content-Disposition": 'attachment; filename="ai-atlas-nyc-offices.geojson"', "Cache-Control": "no-store" },
  });
  if (url.searchParams.get("format") === "csv") return new Response(`\uFEFF${companiesToCsv(companies)}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="ai-atlas-nyc-research.csv"', "Cache-Control": "no-store" },
  });
  const slugs = new Set(companies.map((company) => company.slug));
  return Response.json({ ...data, coverage, result_count: companies.length, companies, signals: data.signals.filter((s) => slugs.has(s.company_slug)),
    methodology: "A curated research starting point, not a census. Mailing addresses and unverified locations do not establish occupied offices. Company coverage is incomplete. Check original sources before publication." }, { headers: { "Cache-Control": "no-store" } });
}
