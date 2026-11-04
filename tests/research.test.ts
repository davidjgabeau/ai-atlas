import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeCompanyStage, stageGroup } from "../src/lib/company-stages";
import { auditCompanyEligibility } from "../src/lib/agent/auditCompanyEligibility";
import { hasPublishableDescription, validateDiscoveredCompanyCandidate } from "../src/lib/agent/companyCandidateValidation";
import { resolveCandidateWebsite } from "../src/lib/agent/discoverySourceUtils";
import { extractCandidateProfiles } from "../src/lib/agent/discoveryProfiles";
import { extractSignals } from "../src/lib/agent/extractSignals";
import { citywideComparisonToCsv, companiesToCsv, csvCell, filterResearchCompanies, isDocumentedOffice, officeEvidence, summarizeCitywideCoverage, summarizeOfficeGeography } from "../src/lib/research/evidence";
import { isNavigableCompanyJob } from "../src/lib/jobs/jobDisplay";
import type { AgentCompany, RawSourceRecord } from "../src/types/agent";
import type { OfficeEvidence, ResearchCompany } from "../src/lib/research/types";
import { hasCompanyNewsSubject } from "../src/lib/research/newsSubject";
import { buildResearchMapGroups, researchMapToGeoJson } from "../src/lib/research/map";
import profiles from "../src/data/reporting/companies.json";
import exclusions from "../src/data/reporting/exclusions.json";
import { isExcludedFromPublicAtlas } from "../src/lib/research/scope";
import { isPublicCompany, normalizeCompany } from "../src/lib/supabase/market-data";

test("news attribution requires a company subject, not a generic word or former employee", () => {
  assert.equal(hasCompanyNewsSubject("Jumbo Series A Rounds Hiding The Real Squeeze On Seed Startups", "Series"), false);
  assert.equal(hasCompanyNewsSubject("Early Anthropic hire, former METR COO found a new company", "Anthropic"), false);
  assert.equal(hasCompanyNewsSubject("OpenAI’s Alexander Embiricos is coming to a conference", "OpenAI"), false);
  assert.equal(hasCompanyNewsSubject("Chamelio Raises $26M to Help Legal Teams", "Chamelio"), true);
  assert.equal(hasCompanyNewsSubject("Series launches a new social app", "Series"), true);
});

test("all-stage normalization preserves mature rounds and lifecycle status", () => {
  for (const stage of ["Series B", "Series C", "Series D", "Series E", "Series H", "Series L", "Public", "Acquired", "Growth"]) assert.equal(normalizeCompanyStage(stage), stage);
  assert.equal(normalizeCompanyStage("Series D, previously Series A and Seed"), "Series D");
  assert.equal(stageGroup("Series E"), "Growth");
  assert.equal(stageGroup("Series A"), "Early");
  assert.equal(stageGroup("Unknown"), "Unknown");
});

test("growth, public, and acquired NYC companies are not archived for their stage", () => {
  for (const stage of ["Series D", "Public", "Acquired"]) {
    const company = { id: "c", name: "Example AI", location: "New York, NY", stage, category: "Data & Memory Layer", description: "An AI data company.", oneSentenceDescription: "An AI data company.", sourceUrls: [], funding: { latestRound: stage } } as unknown as AgentCompany;
    assert.equal(auditCompanyEligibility(company, []), null);
  }
});

test("discovery holds observed malformed names and clipped article excerpts", () => {
  for (const name of ["New York City startups", "Tabs quickly", "New York- and Bangalore-based PineGap.ai"]) assert.equal(validateDiscoveredCompanyCandidate({ name }).ok, false);
  for (const description of ["PineGap.AI Raises $8M Series A to Expand AI Equity Research New York and Bangalore…", "From Humanities To AI: How a founder built a fintech company...", "Series A: A Series &#x2014; June 2026 cohort of startups"]) assert.equal(hasPublishableDescription(description), false);
  assert.equal(hasPublishableDescription("PineGap helps equity analysts compare company filings, earnings calls, and investment theses with source-linked AI research."), true);
});

test("a missing company link cannot be replaced by an invented domain", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html>No company link here</html>"));
  const record = { url: "https://publisher.example/story", text: "A company named Invented Domain raised funding." } as RawSourceRecord;
  assert.equal(await resolveCandidateWebsite({ record, companyName: "Invented Domain" }), undefined);
});

test("deterministic discovery stays in review even for plausible all-stage candidates", async (t) => {
  const previous = process.env.ENABLE_LLM_DISCOVERY;
  process.env.ENABLE_LLM_DISCOVERY = "false";
  t.mock.method(globalThis, "fetch", async () => new Response("<html></html>"));
  try {
    const records = [{ id: "r", sourceType: "press", candidateCompanyName: "ExampleAI", url: "https://publisher.example/story", title: "ExampleAI raises Series D", text: "New York-based ExampleAI raised Series D financing for its AI data infrastructure. https://exampleai.com/", discoveredAt: "2026-11-03", contentHash: "h" }] as RawSourceRecord[];
    const profiles = await extractCandidateProfiles({ records, existingCompanies: [] });
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0].autoPublishEligible, false);
    assert.equal(profiles[0].proposedUpdate.stage, "Series D");
  } finally { if (previous === undefined) delete process.env.ENABLE_LLM_DISCOVERY; else process.env.ENABLE_LLM_DISCOVERY = previous; }
});

test("undated homepage claims cannot become newly dated funding signals", () => {
  const record = { id: "r", sourceType: "website", companyId: "c", url: "https://example.com", text: "Example raised $20 million Series D funding.", discoveredAt: new Date().toISOString(), contentHash: "h" } as RawSourceRecord;
  assert.deepEqual(extractSignals(record, [{ id: "c", name: "Example" } as AgentCompany]), []);
});

test("mailing addresses and unknown locations stay out of borough evidence", () => {
  const mailing = { company_slug: "mail", borough: "Brooklyn", neighborhood: "Williamsburg", location_type: "mailing", evidence_status: "verified", source_url: "https://example.com" } as OfficeEvidence;
  const office = { ...mailing, company_slug: "office", location_type: "office" } as OfficeEvidence;
  assert.equal(isDocumentedOffice(mailing), false);
  assert.equal(isDocumentedOffice(office), true);
  const companies = [{ name: "Mail", description: "", founders: [], stage_group: "Growth", offices: [mailing] }, { name: "Office", description: "", founders: [], stage_group: "Early", offices: [office] }] as unknown as ResearchCompany[];
  assert.deepEqual(filterResearchCompanies(companies, { outside: true }).map((c) => c.name), ["Office"]);
  assert.deepEqual(filterResearchCompanies(companies, { borough: "Brooklyn", stage: "Growth" }), []);
});

test("CSV exports evidence and safely quotes formula-like and multiline text", () => {
  assert.equal(csvCell('A, "B"\nC'), '"A, ""B""\nC"');
  assert.equal(csvCell("=IMPORTXML(A1)"), '"\'=IMPORTXML(A1)"');
  assert.equal(csvCell(-73.968), '"-73.968"');
  assert.equal(csvCell("-2+3"), '"\'-2+3"');
  const csv = companiesToCsv([{ name: "Example", founders: [], offices: [], sources: ["https://example.com"] } as unknown as ResearchCompany]);
  assert.match(csv, /Office source/); assert.match(csv, /Not verified/); assert.match(csv, /https:\/\/example.com/);
});

test("Williamsburg counts include the neighborhood-only office and distinguish shared buildings", () => {
  const originalSlugs = ["flora", "outtake", "topline-pro", "minerva-bi", "sentience"];
  const summary = summarizeOfficeGeography(officeEvidence.filter((o) => originalSlugs.includes(o.company_slug))).find((g) => g.neighborhood === "Williamsburg");
  assert.equal(summary?.company_count, 5);
  assert.ok(summary?.companies_without_public_street_address.includes("sentience"));
  assert.equal(summary?.addresses.find((a) => a.address.startsWith("300 Kent"))?.company_slugs.length, 4);
});

test("citywide comparison preserves unknowns and counts overlapping boroughs once per company", () => {
  const office = { borough: "Brooklyn", neighborhood: "Williamsburg", location_type: "office", evidence_status: "verified", source_url: "https://example.com/offices" } as OfficeEvidence;
  const companies = [
    { slug: "two-boroughs", offices: [office, { ...office }, { ...office, borough: "Manhattan", neighborhood: "SoHo" }] },
    { slug: "other-brooklyn", offices: [{ ...office, neighborhood: "DUMBO" }] },
    { slug: "no-office", offices: [] },
    { slug: "mailing", offices: [{ ...office, location_type: "mailing" }] },
    { slug: "historical", offices: [{ ...office, occupancy_status: "historical" }] },
    { slug: "unverified", offices: [{ ...office, evidence_status: "unverified" }] },
    { slug: "not-nyc", offices: [{ ...office, borough: "Not a NYC borough" }] },
  ] as unknown as ResearchCompany[];
  const coverage = summarizeCitywideCoverage([...companies, companies[0]]);
  assert.equal(coverage.total_companies, 7);
  assert.equal(coverage.companies_with_borough, 2);
  assert.equal(coverage.companies_without_borough, 5);
  assert.equal(coverage.companies_with_borough + coverage.companies_without_borough, coverage.total_companies);
  assert.equal(coverage.companies_in_multiple_boroughs, 1);
  assert.equal(coverage.boroughs.find((row) => row.borough === "Brooklyn")?.company_count, 2);
  assert.equal(coverage.boroughs.find((row) => row.borough === "Manhattan")?.company_count, 1);
  assert.equal(coverage.williamsburg_companies, 1);
  assert.equal(coverage.brooklyn_elsewhere_companies, 1);
  assert.match(citywideComparisonToCsv(coverage), /"Borough not established","5"/);
});

test("published comparison reconciles every borough and Williamsburg row to the company filters", () => {
  const companies = profiles.map((profile) => ({ ...profile, founders: [], offices: officeEvidence.filter((office) => office.company_slug === profile.slug) })) as unknown as ResearchCompany[];
  const coverage = summarizeCitywideCoverage(companies);
  for (const row of coverage.boroughs) assert.equal(row.company_count, filterResearchCompanies(companies, { borough: row.borough }).length);
  assert.equal(coverage.companies_without_borough, filterResearchCompanies(companies, { evidence: "unknown" }).length);
  assert.equal(coverage.williamsburg_companies, filterResearchCompanies(companies, { borough: "Brooklyn", neighborhood: "Williamsburg" }).length);
  assert.equal(coverage.williamsburg_companies + coverage.brooklyn_elsewhere_companies, coverage.boroughs.find((row) => row.borough === "Brooklyn")?.company_count);
});

test("map groups preserve shared tenants and a company's multiple offices, excluding invalid and historical records", () => {
  const office = { company_slug: "a", address: "300 Kent Avenue, Brooklyn, NY", borough: "Brooklyn", neighborhood: "Williamsburg", location_type: "office", evidence_status: "verified", source_url: "https://example.com/offices", verified_at: "2026-11-03", latitude: 40.712, longitude: -73.968 } as OfficeEvidence;
  const companies = [
    { slug: "a", name: "A", offices: [office, { ...office }, { ...office, address: "25 Kent Avenue", latitude: 40.723 }] },
    { slug: "b", name: "B", offices: [{ ...office, company_slug: "b", evidence_status: "reported" }] },
    { slug: "historical", name: "Old", offices: [{ ...office, occupancy_status: "historical" }] },
    { slug: "mail", name: "Mail", offices: [{ ...office, location_type: "mailing" }] },
    { slug: "invalid", name: "Invalid", offices: [{ ...office, latitude: NaN }] },
    { slug: "area", name: "Area only", offices: [{ ...office, address: "" }] },
  ] as unknown as ResearchCompany[];
  const groups = buildResearchMapGroups(companies);
  assert.equal(groups.length, 2);
  assert.equal(groups.reduce((n, g) => n + g.entries.length, 0), 3);
  assert.deepEqual(groups.find((g) => g.latitude === 40.712)?.entries.map((e) => e.company.slug), ["a", "b"]);
  const geojson = researchMapToGeoJson(groups);
  assert.deepEqual(geojson.features[0].geometry.coordinates, [-73.968, 40.712]);
  assert.equal(geojson.features[0].properties.source, office.source_url);
});

test("borough and neighborhood must match the same office, including on map exports", () => {
  const offices = [
    { borough: "Manhattan", neighborhood: "SoHo", address: "123 Broadway", latitude: 40.72, longitude: -74, location_type: "office", evidence_status: "verified", source_url: "https://example.com" },
    { borough: "Brooklyn", neighborhood: "Williamsburg", address: "300 Kent Avenue", latitude: 40.712, longitude: -73.968, location_type: "office", evidence_status: "verified", source_url: "https://example.com" },
  ];
  const companies = [{ slug: "a", name: "A", founders: [], offices }] as unknown as ResearchCompany[];
  assert.equal(filterResearchCompanies(companies, { borough: "Manhattan", neighborhood: "Williamsburg" }).length, 0);
  const pins = buildResearchMapGroups(companies, { borough: "Brooklyn" });
  assert.equal(pins.length, 1);
  assert.equal(pins[0].entries[0].office.borough, "Brooklyn");
});

test("company portals and founder directories are not job vacancies", () => {
  for (const title of ["Talent", "ACCOUNT", "Immigration Manager Portal", "Founder Directory", "Find a Co-Founder", "Firm Partnerships", "Partnerships"]) assert.equal(isNavigableCompanyJob({ title, source_url: "https://example.com/portal" }), false);
  assert.equal(isNavigableCompanyJob({ title: "Talent Acquisition Lead", source_url: "https://example.com/careers/talent-acquisition-lead" }), true);
  assert.equal(isNavigableCompanyJob({ title: "Software Engineer", source_url: "https://example.com/talent" }), false);
  assert.equal(isNavigableCompanyJob({ title: "Founding Software Engineer", source_url: "https://jobs.ashbyhq.com/example/role" }), true);
});

test("published source registry has unique identities and no held companies", () => {
  for (const profile of profiles) assert.equal(isPublicCompany(normalizeCompany({ slug: profile.slug, status: "published" })), true, `Reviewed company suppressed by discovery heuristic: ${profile.slug}`);
  for (const field of ["slug", "name", "website_url"] as const) {
    const values = profiles.map((profile) => field === "website_url" ? new URL(profile[field]).hostname.replace(/^www\./, "") : profile[field].toLowerCase());
    assert.equal(new Set(values).size, values.length, `Duplicate ${field}`);
  }
  for (const entry of exclusions) {
    assert.equal(isExcludedFromPublicAtlas(entry.slug), true);
    assert.equal(profiles.some((profile) => profile.slug === entry.slug), false);
  }
  for (const office of officeEvidence.filter((o) => typeof o.latitude === "number")) {
    assert.ok(office.address && office.geocode_source, `Missing coordinate provenance: ${office.company_slug}`);
  }
});

test("finder handles reordered words, accents, and a company's former domain", () => {
  const companies = [{ slug: "longitude-labs", name: "Longitude Labs", category: "Data & Memory Layer", description: "AI research", founders: ["Clément"], sources: ["https://www.meridian.ai"], website: "https://longitudelabs.com", offices: [] }] as unknown as ResearchCompany[];
  assert.equal(filterResearchCompanies(companies, { query: "Clement Longitude" }).length, 1);
  assert.equal(filterResearchCompanies(companies, { query: "meridian" }).length, 1);
  assert.equal(filterResearchCompanies(companies, { query: "Longitude unrelated" }).length, 0);
});
