import { categoryMeta } from "@/data/market";
import { toAskCompanyCard } from "@/lib/ask-atlas/context";
import type { AskAtlasCompanyCard } from "@/types/ask-atlas";
import type { Company } from "@/types/market";

const maxCards = 3;
const minCards = 2;

export function selectAskCompanyCards({
  answer,
  query,
  companies,
}: {
  answer: string;
  query: string;
  companies: Company[];
}): AskAtlasCompanyCard[] {
  const selected = new Map<string, Company>();
  const answerText = normalizeText(answer);

  for (const company of companies) {
    if (answerText.includes(normalizeText(company.name))) {
      selected.set(company.id, company);
    }
  }

  if (selected.size < minCards) {
    for (const company of rankCompaniesForQuery(query, companies)) {
      selected.set(company.id, company);
      if (selected.size >= maxCards) break;
    }
  }

  return Array.from(selected.values())
    .slice(0, maxCards)
    .map(toAskCompanyCard);
}

function rankCompaniesForQuery(query: string, companies: Company[]) {
  const normalizedQuery = normalizeText(query);
  const queryTerms = tokenize(normalizedQuery);
  const matchedCategories = categoryMeta.filter((category) => {
    const categoryText = normalizeText(
      [category.name, category.description, category.thesis].join(" "),
    );

    return (
      categoryText.includes(normalizedQuery) ||
      queryTerms.some((term) => categoryText.includes(term))
    );
  });
  const matchedCategoryNames = new Set(
    matchedCategories.map((category) => category.name),
  );

  return [...companies]
    .map((company) => ({
      company,
      score: scoreCompany(company, {
        normalizedQuery,
        queryTerms,
        matchedCategoryNames,
      }),
    }))
    .sort((a, b) => b.score - a.score || a.company.name.localeCompare(b.company.name))
    .map((item) => item.company);
}

function scoreCompany(
  company: Company,
  {
    normalizedQuery,
    queryTerms,
    matchedCategoryNames,
  }: {
    normalizedQuery: string;
    queryTerms: string[];
    matchedCategoryNames: Set<string>;
  },
) {
  const companyText = normalizeText(
    [
      company.name,
      company.category,
      company.stage,
      company.generated.hook,
      company.generated.signalReason,
      company.short_description,
      company.one_line_thesis,
      company.why_it_matters,
      company.recent_activity_text,
      company.funding_note,
    ].join(" "),
  );
  let score = 0;

  if (normalizeText(company.name).includes(normalizedQuery)) score += 80;
  if (matchedCategoryNames.has(company.category)) score += 35;
  if (company.is_featured) score += 12;
  if (company.is_breakout) score += 10;
  if (company.inclusionReason) score += 6;
  if (company.metrics?.views) score += Math.min(8, company.metrics.views / 25);

  for (const term of queryTerms) {
    if (companyText.includes(term)) score += term.length > 4 ? 6 : 2;
  }

  return score;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(/\s+/)
        .filter((term) => term.length > 2),
    ),
  );
}
