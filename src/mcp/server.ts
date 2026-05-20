import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";

import {
  categoryMeta,
  getCategoryBySlug,
  getCategorySlug,
} from "@/data/market";
import {
  getPatternBySlug,
  getPatternsForCompanySlug,
  patterns,
  type Pattern,
} from "@/data/patterns";
import { SITE_URL } from "@/lib/seo/config";
import { getFundingRows } from "@/lib/funding";
import { getPublicCompanyJobs } from "@/lib/supabase/jobs";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import type { CategoryMeta, Company, CompanyJobWithCompany } from "@/types/market";

const MAX_LIMIT = 25;
const DEFAULT_LIMIT = 10;

const optionalText = z.string().trim().min(1).max(120).optional();
const optionalLimit = z
  .number()
  .int()
  .positive()
  .optional()
  .describe(`Maximum number of results. Values above ${MAX_LIMIT} are capped.`);

const readOnlyAnnotations = (title: string): ToolAnnotations => ({
  title,
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

export function createAiAtlasMcpServer() {
  const server = new McpServer({
    name: "ai-atlas-nyc",
    version: "0.1.0",
    websiteUrl: SITE_URL,
  });

  server.registerTool(
    "search_companies",
    {
      title: "Search Companies",
      description:
        "Search public, published AI Atlas NYC company profiles by name, slug, category, stage, hook, description, or founder.",
      inputSchema: {
        query: optionalText.describe("Optional search query."),
        category: optionalText.describe("Optional category name or slug filter."),
        stage: optionalText.describe("Optional stage filter."),
        limit: optionalLimit,
      },
      annotations: readOnlyAnnotations("Search Companies"),
    },
    async ({ query, category, stage, limit }) => {
      const companies = await getPublishedCompanies();
      const results = companies
        .map((company) => rankCompany(company, { query, category, stage }))
        .filter((result): result is RankedCompany => Boolean(result))
        .sort((a, b) => a.rank - b.rank || a.company.name.localeCompare(b.company.name))
        .slice(0, normalizeLimit(limit))
        .map(({ company }) => toCompanySummary(company));

      return jsonResult({
        companies: results,
        count: results.length,
      });
    },
  );

  server.registerTool(
    "get_company",
    {
      title: "Get Company",
      description: "Get public AI Atlas profile details for one published company.",
      inputSchema: {
        slug: z.string().trim().min(1).max(120).describe("Company slug."),
      },
      annotations: readOnlyAnnotations("Get Company"),
    },
    async ({ slug }) => {
      const companies = await getPublishedCompanies();
      const company = companies.find((item) => item.slug === slug);

      if (!company) {
        return jsonResult({
          company: null,
          error: `No published AI Atlas company found for slug "${slug}".`,
        });
      }

      return jsonResult({
        company: toCompanyDetail(company),
      });
    },
  );

  server.registerTool(
    "list_categories",
    {
      title: "List Categories",
      description:
        "List AI Atlas category metadata and public company counts.",
      inputSchema: {
        includeCompanies: z
          .boolean()
          .optional()
          .describe("Include representative public company names and AI Atlas URLs."),
      },
      annotations: readOnlyAnnotations("List Categories"),
    },
    async ({ includeCompanies }) => {
      const companies = await getPublishedCompanies();

      return jsonResult({
        categories: categoryMeta.map((category) =>
          toCategorySummary(category, companies, Boolean(includeCompanies)),
        ),
      });
    },
  );

  server.registerTool(
    "get_category",
    {
      title: "Get Category",
      description:
        "Get one AI Atlas category with its public, published companies.",
      inputSchema: {
        slug: z.string().trim().min(1).max(120).describe("Category slug."),
      },
      annotations: readOnlyAnnotations("Get Category"),
    },
    async ({ slug }) => {
      const category = getCategoryBySlug(slug);
      if (!category) {
        return jsonResult({
          category: null,
          error: `No AI Atlas category found for slug "${slug}".`,
        });
      }

      const companies = await getPublishedCompanies();

      return jsonResult({
        category: toCategoryDetail(category, companies),
      });
    },
  );

  server.registerTool(
    "list_patterns",
    {
      title: "List Patterns",
      description:
        "List public AI Atlas editorial market patterns and related companies.",
      inputSchema: {
        limit: optionalLimit,
      },
      annotations: readOnlyAnnotations("List Patterns"),
    },
    async ({ limit }) => {
      const companies = await getPublishedCompanies();
      const companiesBySlug = new Map(companies.map((company) => [company.slug, company]));

      return jsonResult({
        patterns: patterns
          .slice(0, normalizeLimit(limit, MAX_LIMIT))
          .map((pattern) => toPatternSummary(pattern, companiesBySlug)),
      });
    },
  );

  server.registerTool(
    "get_pattern",
    {
      title: "Get Pattern",
      description:
        "Get one public AI Atlas editorial pattern with related companies and one-liners.",
      inputSchema: {
        slug: z.string().trim().min(1).max(120).describe("Pattern slug."),
      },
      annotations: readOnlyAnnotations("Get Pattern"),
    },
    async ({ slug }) => {
      const pattern = getPatternBySlug(slug);
      if (!pattern) {
        return jsonResult({
          pattern: null,
          error: `No AI Atlas pattern found for slug "${slug}".`,
        });
      }

      const companies = await getPublishedCompanies();
      const companiesBySlug = new Map(companies.map((company) => [company.slug, company]));

      return jsonResult({
        pattern: toPatternDetail(pattern, companiesBySlug),
      });
    },
  );

  server.registerTool(
    "search_jobs",
    {
      title: "Search Jobs",
      description:
        "Search public open jobs surfaced by AI Atlas. Returns only role metadata and source URLs, never raw job payloads.",
      inputSchema: {
        query: optionalText.describe("Optional job title, company, location, or department query."),
        companySlug: optionalText.describe("Optional company slug filter."),
        category: optionalText.describe("Optional company category name or slug filter."),
        limit: optionalLimit,
      },
      annotations: readOnlyAnnotations("Search Jobs"),
    },
    async ({ query, companySlug, category, limit }) => {
      const [companies, jobs] = await Promise.all([
        getPublishedCompanies(),
        getPublicCompanyJobs(),
      ]);
      const publicCompanySlugs = new Set(companies.map((company) => company.slug));
      const results = jobs
        .filter((job) => job.company && publicCompanySlugs.has(job.company.slug))
        .map((job) => rankJob(job, { query, companySlug, category }))
        .filter((result): result is RankedJob => Boolean(result))
        .sort((a, b) => a.rank - b.rank || a.job.title.localeCompare(b.job.title))
        .slice(0, normalizeLimit(limit))
        .map(({ job }) => toJobSummary(job));

      return jsonResult({
        jobs: results,
        count: results.length,
      });
    },
  );

  return server;
}

type RankedCompany = {
  company: Company;
  rank: number;
};

type RankedJob = {
  job: CompanyJobWithCompany;
  rank: number;
};

function rankCompany(
  company: Company,
  filters: {
    query?: string;
    category?: string;
    stage?: string;
  },
): RankedCompany | null {
  if (!matchesCategory(company, filters.category)) return null;
  if (!matchesText(company.stage, filters.stage)) return null;

  const query = normalizeSearchText(filters.query ?? "");
  if (!query) return { company, rank: 100 };

  const founderNames = getFounderNames(company);
  const searchFields = {
    name: normalizeSearchText(company.name),
    slug: normalizeSearchText(company.slug),
    category: normalizeSearchText(company.category),
    categorySlug: normalizeSearchText(getCategorySlug(company.category)),
    stage: normalizeSearchText(company.stage),
    hook: normalizeSearchText(getCompanyHook(company) ?? ""),
    description: normalizeSearchText(company.short_description),
    founders: normalizeSearchText(founderNames.join(" ")),
  };

  const rank =
    rankStartsWith(searchFields.name, query, 10) ??
    rankStartsWith(searchFields.slug, query, 20) ??
    rankFounderStartsWith(founderNames, query, 30) ??
    rankIncludes(searchFields.name, query, 40) ??
    rankIncludes(searchFields.slug, query, 45) ??
    rankIncludes(searchFields.founders, query, 50) ??
    rankStartsWith(searchFields.category, query, 60) ??
    rankStartsWith(searchFields.categorySlug, query, 65) ??
    rankStartsWith(searchFields.stage, query, 70) ??
    rankIncludes(searchFields.category, query, 80) ??
    rankIncludes(searchFields.categorySlug, query, 85) ??
    rankIncludes(searchFields.stage, query, 90) ??
    rankIncludes(searchFields.hook, query, 100) ??
    rankIncludes(searchFields.description, query, 110);

  return typeof rank === "number" ? { company, rank } : null;
}

function rankJob(
  job: CompanyJobWithCompany,
  filters: {
    query?: string;
    companySlug?: string;
    category?: string;
  },
): RankedJob | null {
  if (!job.company) return null;
  if (filters.companySlug && job.company.slug !== filters.companySlug) return null;
  if (!matchesCategory(job.company, filters.category)) return null;

  const query = normalizeSearchText(filters.query ?? "");
  if (!query) return { job, rank: 100 };

  const rank =
    rankStartsWith(normalizeSearchText(job.title), query, 10) ??
    rankStartsWith(normalizeSearchText(job.company.name), query, 20) ??
    rankIncludes(normalizeSearchText(job.title), query, 30) ??
    rankIncludes(normalizeSearchText(job.company.name), query, 40) ??
    rankIncludes(normalizeSearchText(job.department), query, 50) ??
    rankIncludes(normalizeSearchText(job.location), query, 60) ??
    rankIncludes(normalizeSearchText(job.company.category), query, 70);

  return typeof rank === "number" ? { job, rank } : null;
}

function toCompanySummary(company: Company) {
  return {
    name: company.name,
    slug: company.slug,
    url: atlasUrl(`/companies/${company.slug}`),
    category: company.category,
    stage: optionalStage(company.stage),
    hook: getCompanyHook(company),
    shortDescription: optionalString(company.short_description),
    websiteUrl: optionalUrl(company.website_url),
  };
}

function toCompanyDetail(company: Company) {
  const patternsForCompany = getPatternsForCompanySlug(company.slug);
  const funding = toFunding(company);

  return {
    name: company.name,
    slug: company.slug,
    url: atlasUrl(`/companies/${company.slug}`),
    websiteUrl: optionalUrl(company.website_url),
    category: company.category,
    stage: optionalStage(company.stage),
    location: optionalString(company.office_address),
    founders:
      company.founders.length > 0
        ? company.founders.map((founder) => ({
            name: founder.name,
            title: optionalString(founder.title),
          }))
        : undefined,
    hook: getCompanyHook(company),
    shortDescription: optionalString(company.short_description),
    description: optionalString(company.why_it_matters || company.short_description),
    funding: Object.keys(funding).length > 0 ? funding : undefined,
    patterns: patternsForCompany.map((pattern) => ({
      title: pattern.title,
      slug: pattern.slug,
      url: atlasUrl(`/patterns/${pattern.slug}`),
      oneLiner: pattern.companies.find((item) => item.company_slug === company.slug)
        ?.one_liner,
    })),
  };
}

function toCategorySummary(
  category: CategoryMeta,
  companies: Company[],
  includeCompanies: boolean,
) {
  const categoryCompanies = companies.filter(
    (company) => company.category === category.name,
  );

  return {
    name: category.name,
    slug: category.slug,
    url: atlasUrl(`/categories/${category.slug}`),
    description: category.description,
    thesis: category.thesis,
    companyCount: categoryCompanies.length,
    representativeCompanies: includeCompanies
      ? categoryCompanies.slice(0, 5).map((company) => ({
          name: company.name,
          slug: company.slug,
          url: atlasUrl(`/companies/${company.slug}`),
        }))
      : undefined,
  };
}

function toCategoryDetail(category: CategoryMeta, companies: Company[]) {
  const categoryCompanies = companies.filter(
    (company) => company.category === category.name,
  );

  return {
    name: category.name,
    slug: category.slug,
    url: atlasUrl(`/categories/${category.slug}`),
    description: category.description,
    thesis: category.thesis,
    companyCount: categoryCompanies.length,
    companies: categoryCompanies.map(toCompanySummary),
  };
}

function toPatternSummary(
  pattern: Pattern,
  companiesBySlug: Map<string, Company>,
) {
  return {
    title: pattern.title,
    slug: pattern.slug,
    url: atlasUrl(`/patterns/${pattern.slug}`),
    framing: pattern.framing,
    relatedCompanies: pattern.companies
      .map((item) => toPatternCompany(item, companiesBySlug))
      .filter(Boolean),
  };
}

function toPatternDetail(
  pattern: Pattern,
  companiesBySlug: Map<string, Company>,
) {
  return {
    ...toPatternSummary(pattern, companiesBySlug),
    updatedAt: pattern.updated_at,
  };
}

function toPatternCompany(
  relation: Pattern["companies"][number],
  companiesBySlug: Map<string, Company>,
) {
  const company = companiesBySlug.get(relation.company_slug);
  if (!company) return null;

  return {
    name: company.name,
    slug: company.slug,
    url: atlasUrl(`/companies/${company.slug}`),
    category: company.category,
    oneLiner: relation.one_liner,
  };
}

function toJobSummary(job: CompanyJobWithCompany) {
  const company = job.company;

  return {
    title: job.title,
    company: company
      ? {
          name: company.name,
          slug: company.slug,
          url: atlasUrl(`/companies/${company.slug}`),
          category: company.category,
        }
      : undefined,
    location: optionalString(job.location),
    sourceUrl: optionalUrl(job.source_url),
    discoveredAt: optionalString(job.discovered_at),
    lastSeenAt: optionalString(job.last_seen_at),
  };
}

function toFunding(company: Company) {
  const rows = getFundingRows(company);
  const valueFor = (label: string) =>
    rows.find(([rowLabel]) => rowLabel === label)?.[1];

  return compactRecord({
    round: valueFor("Latest round"),
    amount: valueFor("Round amount"),
    date: valueFor("Round date"),
    totalRaised: valueFor("Total raised"),
    leadInvestor: valueFor("Lead investor"),
  });
}

function getCompanyHook(company: Company) {
  return optionalString(company.one_line_thesis) ?? optionalString(company.short_description);
}

function getFounderNames(company: Company) {
  return Array.from(
    new Set([
      ...company.founders.map((founder) => founder.name),
      ...(company.founder_name ?? "")
        .split(/;|,|\band\b/i)
        .map((name) => name.trim()),
    ].filter(Boolean)),
  );
}

function matchesCategory(company: Company, category?: string) {
  if (!category) return true;

  const categoryInput = category.trim().toLowerCase();
  const normalizedInput = normalizeSearchText(category);
  const categorySlug = getCategorySlug(company.category);

  return (
    categorySlug === categoryInput ||
    normalizeSearchText(categorySlug).includes(normalizedInput) ||
    normalizeSearchText(company.category).includes(normalizedInput)
  );
}

function matchesText(value: string, query?: string) {
  if (!query) return true;

  return normalizeSearchText(value).includes(normalizeSearchText(query));
}

function rankStartsWith(value: string, query: string, rank: number) {
  return value.startsWith(query) ? rank : null;
}

function rankIncludes(value: string, query: string, rank: number) {
  return value.includes(query) ? rank : null;
}

function rankFounderStartsWith(founderNames: string[], query: string, rank: number) {
  return founderNames.some((name) =>
    normalizeSearchText(name)
      .split(/\s+/)
      .some((part) => part.startsWith(query)),
  )
    ? rank
    : null;
}

function normalizeLimit(value?: number, fallback = DEFAULT_LIMIT) {
  if (!value || !Number.isFinite(value)) return fallback;

  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(value)));
}

function optionalString(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === "undisclosed") return undefined;

  return trimmed;
}

function optionalStage(value?: string) {
  const stage = optionalString(value);
  return stage && stage.toLowerCase() !== "unknown" ? stage : undefined;
}

function optionalUrl(value?: string) {
  const url = optionalString(value);
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

function compactRecord(record: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => Boolean(value)),
  );
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function atlasUrl(path: `/${string}`) {
  return new URL(path, SITE_URL).toString();
}

function jsonResult(data: Record<string, unknown>): CallToolResult {
  const structuredContent = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(structuredContent, null, 2),
      },
    ],
    structuredContent,
  };
}
