import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeCompanyStage, stageGroup } from "../src/lib/company-stages";
import { auditCompanyEligibility } from "../src/lib/agent/auditCompanyEligibility";
import { hasPublishableDescription, validateDiscoveredCompanyCandidate } from "../src/lib/agent/companyCandidateValidation";
import { resolveCandidateWebsite } from "../src/lib/agent/discoverySourceUtils";
import { extractCandidateProfiles } from "../src/lib/agent/discoveryProfiles";
import { extractSignals } from "../src/lib/agent/extractSignals";
import { companiesToCsv, csvCell, filterResearchCompanies, isDocumentedOffice, officeEvidence, summarizeOfficeGeography } from "../src/lib/research/evidence";
import { isNavigableCompanyJob } from "../src/lib/jobs/jobDisplay";
import type { AgentCompany, RawSourceRecord } from "../src/types/agent";
import type { OfficeEvidence, ResearchCompany } from "../src/lib/research/types";
import { hasCompanyNewsSubject } from "../src/lib/research/newsSubject";

test("news attribution requires a company subject, not a generic word or former employee", () => {
  assert.equal(hasCompanyNewsSubject("Jumbo Series A Rounds Hiding The Real Squeeze On Seed Startups", "Series"), false);
  assert.equal(hasCompanyNewsSubject("Early Anthropic hire, former METR COO found a new company", "Anthropic"), false);
  assert.equal(hasCompanyNewsSubject("OpenAI’s Alexander Embiricos is coming to a conference", "OpenAI"), false);
  assert.equal(hasCompanyNewsSubject("Chamelio Raises $26M to Help Legal Teams", "Chamelio"), true);
  assert.equal(hasCompanyNewsSubject("Series launches a new social app", "Series"), true);
});

test("all-stage normalization preserves mature rounds and lifecycle status", () => {
  for (const stage of ["Series B", "Series C", "Series D", "Series E", "Series H", "Public", "Acquired", "Growth"]) assert.equal(normalizeCompanyStage(stage), stage);
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
  const summary = summarizeOfficeGeography(officeEvidence).find((g) => g.neighborhood === "Williamsburg");
  assert.equal(summary?.company_count, 6);
  assert.deepEqual(summary?.companies_without_public_street_address, ["sentience"]);
  assert.equal(summary?.addresses.find((a) => a.address.startsWith("300 Kent"))?.company_slugs.length, 4);
});

test("company portals and founder directories are not job vacancies", () => {
  for (const title of ["Immigration Manager Portal", "Founder Directory", "Find a Co-Founder", "Firm Partnerships", "Partnerships"]) assert.equal(isNavigableCompanyJob({ title, source_url: "https://example.com/portal" }), false);
  assert.equal(isNavigableCompanyJob({ title: "Founding Software Engineer", source_url: "https://jobs.ashbyhq.com/example/role" }), true);
});
