import { NextResponse, type NextRequest } from "next/server";

import { categoryMeta } from "@/data/market";
import { patterns } from "@/data/patterns";
import {
  getLatestSurface,
  getStoredAgentHomepageData,
} from "@/lib/agent/homepageData";
import { getCompanyStats } from "@/lib/companies/getCompanyStats";
import {
  getRecentCompanyAdditions,
  isRecentCompanyAddition,
} from "@/lib/companies/recentAdditions";
import {
  createEmbedCorsPreflightResponse,
  getEmbedCorsResult,
} from "@/lib/embed/cors";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import { SITE_URL } from "@/lib/seo/config";
import {
  getCompanySignalLabel,
  getSignalPriority,
} from "@/lib/signals/companySignal";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import type { Company } from "@/types/market";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const corsOptions = {
  methods: ["GET", "OPTIONS"],
  allowAnyOrigin: true,
};

const maxCompanies = 100;
const collectionLimit = 6;
const representativeCompanyLimit = 2;
const companySortOptions = ["newest", "featured"] as const;

type CompanySortOption = (typeof companySortOptions)[number];

export function OPTIONS(request: NextRequest) {
  return createEmbedCorsPreflightResponse(request, corsOptions);
}

export async function GET(request: NextRequest) {
  const cors = getEmbedCorsResult(request, corsOptions);
  if (!cors.allowed) {
    return NextResponse.json(
      { error: "This origin is not allowed to read AI Atlas embeds." },
      {
        status: 403,
        headers: cors.headers,
      },
    );
  }

  const [companies, homepageData] = await Promise.all([
    getPublishedCompanies(),
    getStoredAgentHomepageData(),
  ]);
  const stats = getCompanyStats(companies);
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const companiesBySlug = new Map(
    companies.map((company) => [company.slug, company]),
  );
  const companyLimit = getCompanyLimit(request);
  const companySort = getCompanySort(request);
  const latestSignals = getLatestSurface(
    homepageData.editorialSurfaces,
    "latest_signals",
  );
  const newestCompanies = sortCompaniesByMapFreshness(companies);
  const newCompanyCollection = newestCompanies
    .filter((company) => getMapFreshnessRank(company) > 0)
    .slice(0, collectionLimit);
  const featuredCompanies = sortCompaniesForEmbed(companies);
  const recentCompanies = getRecentCompanyAdditions(
    companies,
    collectionLimit,
  );

  const headers = new Headers(cors.headers);
  headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");

  return NextResponse.json(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      source: {
        name: "AI Atlas NYC",
        url: SITE_URL,
        mapUrl: absoluteUrl("/companies"),
        askUrl: absoluteUrl("/ask"),
      },
      map: {
        endpoint: absoluteUrl("/api/embed/map"),
        coordinateSystem: "normalized-0-1",
        description:
          "Stable category and company coordinates for rendering the AI Atlas map in an external site.",
      },
      stats: {
        totalCompanies: stats.totalCompanies,
        totalCategories: stats.totalCategories,
        newCompanyCount: newCompanyCollection.length,
        recentlyAddedCount: stats.recentlyAddedCount,
        lastUpdatedAt: stats.lastUpdatedAt,
        lastUpdatedLabel: stats.lastUpdatedAt
          ? formatRelativeUpdate(stats.lastUpdatedAt)
          : "recently",
      },
      ask: {
        endpoint: absoluteUrl("/api/ask"),
        method: "POST",
        streamFormat: "application/x-ndjson",
        maxQueryLength: 700,
        requestShape: {
          query: "string",
          history:
            'optional array of { role: "user" | "assistant", content: string }',
        },
        events: ["delta", "companies", "error", "done"],
        exampleQuestions: [
          "I'm a seed investor focused on infrastructure. What should I be watching?",
          "Which NYC AI companies are useful for healthcare operations?",
          "Where is consumer AI showing up in the map?",
        ],
      },
      collections: {
        defaultCompanySort: companySort,
        newCompanies: newCompanyCollection.map(toEmbedCompany),
        featuredCompanies: featuredCompanies
          .slice(0, collectionLimit)
          .map(toEmbedCompany),
        recentCompanies: recentCompanies.map(toEmbedCompany),
      },
      categories: categoryMeta.map((category) => {
        const categoryCompanies = sortCompaniesForEmbed(
          companies.filter((company) => company.category === category.name),
        );

        return {
          name: category.name,
          slug: category.slug,
          href: absoluteUrl(`/categories/${category.slug}`),
          description: category.description,
          thesis: category.thesis,
          companyCount: categoryCompanies.length,
          representativeCompanies: categoryCompanies
            .slice(0, representativeCompanyLimit)
            .map((company) => ({
              name: company.name,
              slug: company.slug,
              href: absoluteUrl(`/companies/${company.slug}`),
              hook: company.generated.hook,
              signalLabel: getCompanySignalLabel(company),
            })),
        };
      }),
      companies: sortCompaniesByRequest(companies, companySort)
        .slice(0, companyLimit)
        .map(toEmbedCompany),
      patterns: patterns.slice(0, 6).map((pattern) => ({
        slug: pattern.slug,
        title: pattern.title,
        framing: pattern.framing,
        href: absoluteUrl(`/patterns/${pattern.slug}`),
        updatedAt: pattern.updated_at,
        companies: pattern.companies
          .map((item) => {
            const company = companiesBySlug.get(item.company_slug);
            if (!company) return null;

            return {
              name: company.name,
              slug: company.slug,
              href: absoluteUrl(`/companies/${company.slug}`),
              note: item.one_liner,
            };
          })
          .filter((company): company is NonNullable<typeof company> =>
            Boolean(company),
          ),
      })),
      latestSignals:
        latestSignals?.items.slice(0, 6).map((item) => {
          const company = item.companyId
            ? companiesById.get(item.companyId)
            : undefined;

          return {
            title: item.title,
            body: item.body ?? "",
            label: item.label ?? "Signal",
            category: item.category,
            occurredAt: item.occurredAt,
            company: company
              ? {
                  name: company.name,
                  slug: company.slug,
                  href: absoluteUrl(`/companies/${company.slug}`),
                }
              : undefined,
          };
        }) ?? [],
    },
    {
      headers,
    },
  );
}

function toEmbedCompany(company: Company) {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    href: absoluteUrl(`/companies/${company.slug}`),
    logoUrl: company.logo_url,
    websiteUrl: company.website_url,
    xHandle: company.x_handle,
    officeAddress: company.office_address,
    category: company.category,
    stage: company.stage,
    hook: company.generated.hook,
    description: company.short_description,
    thesis: company.one_line_thesis,
    signalLabel: getCompanySignalLabel(company),
    views: company.metrics?.views ?? 0,
    isFeatured: company.is_featured,
    isBreakout: company.is_breakout,
    founders: company.founders.map((founder) => ({
      name: founder.name,
      title: founder.title,
    })),
    createdAt: company.created_at,
    updatedAt: company.updated_at,
  };
}

function sortCompaniesByRequest(
  companies: Company[],
  companySort: CompanySortOption,
) {
  if (companySort === "featured") return sortCompaniesForEmbed(companies);

  return sortCompaniesByMapFreshness(companies);
}

function sortCompaniesByMapFreshness(companies: Company[]) {
  return [...companies].sort((a, b) => {
    const freshnessDelta = getMapFreshnessRank(b) - getMapFreshnessRank(a);
    if (freshnessDelta !== 0) return freshnessDelta;

    const addedDelta = getDateTime(b.created_at) - getDateTime(a.created_at);
    if (addedDelta !== 0) return addedDelta;

    return sortCompaniesForEmbed([a, b])[0]?.id === a.id ? -1 : 1;
  });
}

function getMapFreshnessRank(company: Company) {
  if (isRecentCompanyAddition(company)) return 2;
  if (hasStableSemanticCompanyId(company)) return 1;

  return 0;
}

function hasStableSemanticCompanyId(company: Company) {
  return !/^cmp_\d+$/.test(company.id);
}

function sortCompaniesForEmbed(companies: Company[]) {
  return [...companies].sort((a, b) => {
    const signalDelta =
      getSignalPriority(getCompanySignalLabel(a)) -
      getSignalPriority(getCompanySignalLabel(b));
    if (signalDelta !== 0) return signalDelta;

    const featuredDelta = Number(b.is_featured) - Number(a.is_featured);
    if (featuredDelta !== 0) return featuredDelta;

    const breakoutDelta = Number(b.is_breakout) - Number(a.is_breakout);
    if (breakoutDelta !== 0) return breakoutDelta;

    const viewsDelta = (b.metrics?.views ?? 0) - (a.metrics?.views ?? 0);
    if (viewsDelta !== 0) return viewsDelta;

    return a.name.localeCompare(b.name);
  });
}

function getCompanyLimit(request: NextRequest) {
  const rawValue = request.nextUrl.searchParams.get("limit");
  if (rawValue === "all") return maxCompanies;

  const parsed = rawValue ? Number.parseInt(rawValue, 10) : maxCompanies;
  if (Number.isNaN(parsed)) return maxCompanies;

  return Math.max(1, Math.min(parsed, maxCompanies));
}

function getCompanySort(request: NextRequest): CompanySortOption {
  const rawValue = request.nextUrl.searchParams.get("companySort");
  if (companySortOptions.some((option) => option === rawValue)) {
    return rawValue as CompanySortOption;
  }

  return "newest";
}

function getDateTime(dateValue?: string) {
  if (!dateValue) return 0;

  const time = new Date(dateValue).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}
