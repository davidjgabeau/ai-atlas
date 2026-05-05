import type { Company } from "@/types/market";

type CompanyHashInput = Pick<
  Company,
  | "id"
  | "name"
  | "category"
  | "stage"
  | "funding_round"
  | "funding_amount"
  | "funding_date"
  | "total_raised"
  | "lead_investor"
  | "funding_note"
  | "short_description"
  | "one_line_thesis"
  | "why_it_matters"
  | "ai_usage_profile"
  | "openai_fit"
  | "usage_potential"
  | "recent_activity_text"
  | "recent_activity_date"
>;

export function getCompanySourceHash(company: CompanyHashInput) {
  return stableHash({
    id: company.id,
    name: company.name,
    category: company.category,
    stage: company.stage,
    funding_round: company.funding_round,
    funding_amount: company.funding_amount,
    funding_date: company.funding_date,
    total_raised: company.total_raised,
    lead_investor: company.lead_investor,
    funding_note: company.funding_note,
    short_description: company.short_description,
    one_line_thesis: company.one_line_thesis,
    why_it_matters: company.why_it_matters,
    ai_usage_profile: company.ai_usage_profile,
    openai_fit: company.openai_fit,
    usage_potential: company.usage_potential,
    recent_activity_text: company.recent_activity_text,
    recent_activity_date: company.recent_activity_date,
  });
}

export function getMarketInsightsSourceHash(companies: Company[]) {
  return stableHash(
    companies.map((company) => ({
      id: company.id,
      category: company.category,
      stage: company.stage,
      recent_activity_text: company.recent_activity_text,
      recent_activity_date: company.recent_activity_date,
      description: company.why_it_matters,
      hook: company.generated?.hook ?? "",
      updated_at: company.updated_at,
      created_at: company.created_at,
    })),
  );
}

export function stableHash(input: unknown) {
  const value = JSON.stringify(sortValue(input));
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortValue(nestedValue)]),
    );
  }

  return value;
}
