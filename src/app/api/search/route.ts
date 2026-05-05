import { NextResponse, type NextRequest } from "next/server";

import { getPublishedCompanies } from "@/lib/supabase/market-data";
import type { Company } from "@/types/market";

export const dynamic = "force-dynamic";

type SearchResult = {
  id: string;
  title: string;
  href: string;
  label: string;
  detail: string;
  logoUrl: string;
  category: Company["category"];
};

type RankedSearchResult = SearchResult & {
  rank: number;
};

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "")
    .trim()
    .slice(0, 80);

  if (!query) {
    return NextResponse.json({ results: [] satisfies SearchResult[] });
  }

  if (!normalizeSearchText(query)) {
    return NextResponse.json({ results: [] satisfies SearchResult[] });
  }

  const companies = await getPublishedCompanies();
  const results = companies
    .map((company) => rankCompanyResult(company, query))
    .filter((result): result is RankedSearchResult =>
      Boolean(result),
    )
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))
    .slice(0, 8)
    .map(toSearchResult);

  return NextResponse.json({ results });
}

function rankCompanyResult(
  company: Company,
  query: string,
): RankedSearchResult | null {
  const normalizedQuery = normalizeSearchText(query);
  const founderNames = getFounderNames(company);
  const founderMatch = founderNames.find((founderName) =>
    namePartStartsWith(founderName, normalizedQuery),
  );
  const founderIncludesMatch =
    founderMatch ??
    founderNames.find((founderName) =>
      normalizeSearchText(founderName).includes(normalizedQuery),
    );
  const categoryText = normalizeSearchText(company.category);
  const stageText = normalizeSearchText(company.stage);
  const companyText = normalizeSearchText(company.name);
  const slugText = normalizeSearchText(company.slug);
  const bodyText = normalizeSearchText(
    [
      company.short_description,
      company.one_line_thesis,
      company.why_it_matters,
      company.recent_activity_text,
      company.ai_usage_profile,
      company.openai_fit,
    ].join(" "),
  );

  let rank = Number.POSITIVE_INFINITY;
  let label: string = company.category;
  let detail = company.short_description || company.one_line_thesis;

  if (companyText.startsWith(normalizedQuery)) {
    rank = 10;
    label = "Company";
  } else if (slugText.startsWith(normalizedQuery)) {
    rank = 20;
    label = "Company";
  } else if (founderMatch) {
    rank = 30;
    label = `Founder: ${founderMatch}`;
    detail = company.category;
  } else if (companyText.includes(normalizedQuery)) {
    rank = 40;
    label = "Company";
  } else if (founderIncludesMatch) {
    rank = 50;
    label = `Founder: ${founderIncludesMatch}`;
    detail = company.category;
  } else if (categoryText.startsWith(normalizedQuery)) {
    rank = 60;
    label = company.category;
  } else if (stageText.startsWith(normalizedQuery)) {
    rank = 70;
    label = company.stage;
  } else if (categoryText.includes(normalizedQuery)) {
    rank = 80;
    label = company.category;
  } else if (stageText.includes(normalizedQuery)) {
    rank = 90;
    label = company.stage;
  } else if (bodyText.includes(normalizedQuery)) {
    rank = 100;
  }

  if (!Number.isFinite(rank)) return null;

  return {
    id: company.id,
    title: company.name,
    href: `/companies/${company.slug}`,
    label,
    detail,
    logoUrl: company.logo_url,
    category: company.category,
    rank,
  };
}

function toSearchResult(result: RankedSearchResult): SearchResult {
  return {
    id: result.id,
    title: result.title,
    href: result.href,
    label: result.label,
    detail: result.detail,
    logoUrl: result.logoUrl,
    category: result.category,
  };
}

function getFounderNames(company: Company) {
  const names = (company.founder_name ?? "")
    .split(/;|,|\band\b/i)
    .map((name) => name.trim())
    .filter(Boolean);

  return Array.from(new Set(names));
}

function namePartStartsWith(name: string, query: string) {
  return normalizeSearchText(name)
    .split(/\s+/)
    .some((part) => part.startsWith(query));
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
