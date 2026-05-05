import type { AgentCompany, AgentCompanyStage, Founder } from "../../types/agent";
import type { Company } from "../../types/market";
import { getCompanySignalLabel } from "../signals/companySignal";

export function toAgentCompany(company: Company): AgentCompany {
  const sourceUrls = uniqueStrings([
    company.website_url,
    company.x_handle ? `https://x.com/${company.x_handle}` : "",
  ]);

  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    website: emptyToUndefined(company.website_url),
    x: company.x_handle ? `https://x.com/${company.x_handle}` : undefined,
    location: company.office_address || "New York, NY",
    locationConfidence: company.office_address ? "high" : "medium",
    stage: normalizeAgentStage(company.stage || company.funding_round),
    category: company.category,
    description: company.short_description,
    oneSentenceDescription: company.one_line_thesis || company.short_description,
    founders:
      company.founders.length > 0
        ? company.founders.map((founder) => ({
            name: founder.name,
            role: founder.title,
          }))
        : parseFounders(company.founder_name),
    investors: splitList(company.lead_investor),
    funding: {
      totalRaised: emptyToUndefined(company.total_raised),
      latestRound: emptyToUndefined(company.funding_round || company.stage),
      latestRoundAmount: emptyToUndefined(company.funding_amount),
      latestRoundDate: emptyToUndefined(company.funding_date),
      leadInvestors: splitList(company.lead_investor),
    },
    tags: uniqueStrings([
      company.category,
      getCompanySignalLabel(company),
      ...company.generated.keywords,
      ...company.generated.trendDimensions,
    ]),
    generated: company.generated,
    sourceUrls,
    verifiedAt: company.updated_at,
    createdAt: company.created_at,
    updatedAt: company.updated_at,
    discoveryReason: company.discoveryReason,
    inclusionReason: company.inclusionReason,
  };
}

export function toAgentCompanies(companies: Company[]) {
  return companies.map(toAgentCompany);
}

export function normalizeAgentStage(value: string): AgentCompanyStage {
  const normalized = value.toLowerCase();

  if (normalized.includes("series a") && normalized.includes("seed")) {
    return "Seed / Series A";
  }

  if (normalized.includes("series a")) return "Series A";
  if (normalized.includes("pre-seed") || normalized.includes("preseed")) {
    return "Pre-seed";
  }
  if (normalized.includes("seed")) return "Seed";

  return "Unknown";
}

function parseFounders(value?: string): Founder[] | undefined {
  const founders = splitList(value).map((name) => ({ name }));
  return founders.length > 0 ? founders : undefined;
}

export function splitList(value?: string) {
  if (!value || value === "N/A") return [];

  return value
    .split(/;|,|\band\b/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyToUndefined(value?: string) {
  if (!value || value === "N/A") return undefined;
  return value;
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}
