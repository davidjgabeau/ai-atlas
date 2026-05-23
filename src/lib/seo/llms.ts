import { categoryMeta } from "@/data/market";
import { patterns } from "@/data/patterns";
import { getCompanyStats } from "@/lib/companies/getCompanyStats";
import { absoluteUrl, siteName } from "@/lib/seo/shareMetadata";
import type { Company } from "@/types/market";

const audience =
  "VCs, founders, operators, recruiters, and analysts researching early-stage AI companies in New York City.";

const publicSurfaces = [
  {
    label: "Home",
    path: "/",
    description:
      "editorial front page with latest signals, featured companies, patterns, news, and category momentum.",
  },
  {
    label: "Startup directory",
    path: "/companies",
    description:
      "browse published companies by category, stage, workflow, product surface, signal, and saved state.",
  },
  {
    label: "Categories",
    path: "/categories",
    description:
      "understand where early-stage NYC AI companies are clustering across the AI Atlas taxonomy.",
  },
  {
    label: "Patterns",
    path: "/patterns",
    description:
      "editorial market patterns and structural observations drawn from the company corpus.",
  },
  {
    label: "Newsfeed",
    path: "/newsfeed",
    description:
      "curated external news links and official posts from mapped companies.",
  },
  {
    label: "Jobs",
    path: "/jobs",
    description:
      "public open roles from companies in the AI Atlas map, with gated apply access for profile creation.",
  },
  {
    label: "Current Read",
    path: "/insights",
    description:
      "short editorial signal views across featured, recently active, and high-clarity companies.",
  },
  {
    label: "Ask Atlas",
    path: "/ask",
    description:
      "natural-language questions over public company, category, pattern, and signal data.",
  },
  {
    label: "Submit Startup",
    path: "/submit",
    description:
      "authenticated submission flow for suggesting early-stage NYC AI companies.",
  },
  {
    label: "Viewer profile",
    path: "/profile",
    description:
      "authenticated workspace for saved companies, profile details, avatar selection, and public-profile publishing.",
  },
  {
    label: "Public profiles",
    href: () => `${absoluteUrl("/profiles/")}<handle>`,
    description:
      "published viewer profiles and saved-company lists when a user chooses to make one public.",
  },
  {
    label: "MCP setup guide",
    path: "/mcp",
    description:
      "instructions for running the local read-only MCP server with public AI Atlas data.",
  },
] as const;

const structuredAccess = [
  {
    label: "LLM summary",
    path: "/llms.txt",
    description: "concise AI-facing guide to the public AI Atlas project.",
  },
  {
    label: "Full LLM inventory",
    path: "/llms-full.txt",
    description:
      "expanded public inventory of companies, categories, patterns, and structured-access notes.",
  },
  {
    label: "Embed API",
    path: "/api/embed/atlas",
    description:
      "public JSON for companies, categories, patterns, latest signals, and Ask Atlas embed metadata.",
  },
  {
    label: "Map embed API",
    path: "/api/embed/map",
    description:
      "public JSON with normalized category and company map coordinates for external SVG or canvas rendering.",
  },
  {
    label: "Ask Atlas stream",
    path: "/api/ask",
    description:
      "guarded POST endpoint that streams Ask Atlas answers as NDJSON for approved browser origins.",
  },
  {
    label: "Local MCP setup",
    path: "/mcp",
    description:
      "setup guide for `npm run mcp:server`, a read-only stdio MCP server for compatible AI assistants.",
  },
] as const;

const mcpTools = [
  "search_companies",
  "get_company",
  "list_categories",
  "get_category",
  "list_patterns",
  "get_pattern",
  "search_jobs",
] as const;

const dataBoundaries = [
  "AI Atlas NYC is narrow by design: early-stage, AI-focused, New York City startup ecosystem.",
  "Company pages should not be treated as funding, customer, user, or traction claims unless the profile explicitly states those details.",
  "Missing optional fields are intentionally omitted instead of filled with guesses.",
  "Public pages are designed for citation and discovery; admin, auth, private profile, raw source, automation, and secret data are outside the public corpus.",
  "The local MCP server exposes public published market-map data only and does not expose Ask Atlas prompts, model provider keys, Supabase service keys, submissions, or user sessions.",
] as const;

export function buildLlmsTxt(companies: Company[]) {
  const stats = getCompanyStats(companies);
  const latestUpdated = formatIsoDate(stats.lastUpdatedAt);

  return [
    `# ${siteName}`,
    "",
    "> A curated market map of early-stage NYC AI startups, from pre-seed through Series A.",
    "",
    `Canonical site: ${absoluteUrl("/")}`,
    `Audience: ${audience}`,
    `Scope: ${stats.totalCompanies} published companies across ${stats.totalCategories} active categories (${categoryMeta.length} total categories in the taxonomy).`,
    `Recently added window: ${stats.recentlyAddedCount} companies currently marked as recent.`,
    latestUpdated ? `Latest public company update: ${latestUpdated}` : "",
    "Data source: live public company records, local public overlays, category metadata, editorial patterns, news/social surfaces, and public jobs metadata.",
    "",
    "## Best Entry Points",
    ...publicSurfaces.map(formatLink),
    "",
    "## Structured AI Access",
    ...structuredAccess.map(formatLink),
    `- MCP tools: ${mcpTools.join(", ")}.`,
    "",
    "## Category Index",
    ...categoryMeta.map((category) => {
      const count = companies.filter(
        (company) => company.category === category.name,
      ).length;
      return `- ${category.name}: ${formatCompanyCount(count)}. ${category.description} ${absoluteUrl(`/categories/${category.slug}`)}`;
    }),
    "",
    "## Representative Companies",
    ...companies.slice(0, 16).map(formatCompanySummary),
    "",
    "## Good Uses For Assistants",
    "- Use AI Atlas to identify relevant early-stage NYC AI companies, category clusters, market patterns, public jobs, and source pages for further research.",
    "- Prefer the company, category, pattern, embed, and MCP surfaces over inventing unavailable facts.",
    "- Link to canonical AI Atlas URLs when citing companies or categories.",
    "",
    "## Data and Editorial Standards",
    ...dataBoundaries.map((item) => `- ${item}`),
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildLlmsFullTxt(companies: Company[]) {
  const stats = getCompanyStats(companies);
  const latestUpdated = formatIsoDate(stats.lastUpdatedAt);

  return [
    `# ${siteName} Full Public Inventory`,
    "",
    [
      `Canonical site: ${absoluteUrl("/")}`,
      `Scope: ${stats.totalCompanies} published early-stage NYC AI companies.`,
      `Active categories: ${stats.totalCategories}. Taxonomy categories: ${categoryMeta.length}.`,
      `Recently added window: ${stats.recentlyAddedCount} companies currently marked as recent.`,
      latestUpdated ? `Latest public company update: ${latestUpdated}` : "",
      `Generated at: ${new Date().toISOString()}`,
      `Audience: ${audience}`,
      `MCP setup guide: ${absoluteUrl("/mcp")}`,
    ]
      .filter(Boolean)
      .join("\n"),
    "## Web Surfaces",
    publicSurfaces.map(formatLink).join("\n"),
    "## Structured Access",
    [
      ...structuredAccess.map(formatLink),
      `- MCP tool names: ${mcpTools.join(", ")}.`,
      "- MCP transport: local stdio server from the repository via `npm run mcp:server`; `/mcp` is the public setup guide, not a remote JSON-RPC endpoint.",
      "- API boundary: public embed endpoints expose read-only public data; Ask Atlas is a guarded POST stream for approved browser origins.",
    ].join("\n"),
    "## Data Boundaries",
    dataBoundaries.map((item) => `- ${item}`).join("\n"),
    "## Companies",
    companies.map(formatCompanyDetail).join("\n\n"),
    "## Categories",
    categoryMeta
      .map((category) =>
        [
          `### ${category.name}`,
          `URL: ${absoluteUrl(`/categories/${category.slug}`)}`,
          `Company count: ${
            companies.filter((company) => company.category === category.name)
              .length
          }`,
          `Description: ${category.description}`,
          `Thesis: ${category.thesis}`,
        ].join("\n"),
      )
      .join("\n\n"),
    "## Patterns",
    patterns
      .map((pattern) =>
        [
          `### ${pattern.title}`,
          `URL: ${absoluteUrl(`/patterns/${pattern.slug}`)}`,
          `Updated: ${pattern.updated_at}`,
          `Framing: ${singleLine(pattern.framing)}`,
          `Companies: ${pattern.companies.map((item) => item.company_slug).join(", ")}`,
        ].join("\n"),
      )
      .join("\n\n"),
    "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function formatCompanyCount(count: number) {
  return `${count} ${count === 1 ? "company" : "companies"}`;
}

function formatLink(link: {
  label: string;
  path?: string;
  href?: () => string;
  description: string;
}) {
  const href = link.href ? link.href() : absoluteUrl(link.path ?? "/");
  return `- ${link.label}: ${href} - ${link.description}`;
}

function formatCompanySummary(company: Company) {
  const stage = company.stage ? `, ${company.stage}` : "";
  return `- ${company.name}: ${singleLine(company.one_line_thesis || company.short_description)} (${company.category}${stage}) ${absoluteUrl(`/companies/${company.slug}`)}`;
}

function formatCompanyDetail(company: Company) {
  return [
    `### ${company.name}`,
    `URL: ${absoluteUrl(`/companies/${company.slug}`)}`,
    `Category: ${company.category}`,
    company.stage ? `Stage: ${company.stage}` : "",
    company.website_url ? `Website: ${company.website_url}` : "",
    company.x_handle ? `X: https://x.com/${company.x_handle}` : "",
    `Summary: ${singleLine(company.one_line_thesis || company.short_description)}`,
    company.why_it_matters
      ? `Why it matters: ${singleLine(company.why_it_matters)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function singleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function formatIsoDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString();
}
