import { categoryMeta } from "@/data/market";
import { patterns } from "@/data/patterns";
import { getCompanyStats } from "@/lib/companies/getCompanyStats";
import { absoluteUrl, siteName } from "@/lib/seo/shareMetadata";
import type { Company } from "@/types/market";

const audience =
  "VCs, founders, operators, recruiters, and analysts researching early-stage AI companies in New York City.";

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
    `Scope: ${stats.totalCompanies} published companies across ${categoryMeta.length} categories.`,
    latestUpdated ? `Latest public company update: ${latestUpdated}` : "",
    "",
    "## Best Entry Points",
    `- Startup directory: ${absoluteUrl("/companies")} - browse companies by category, stage, workflow, and product surface.`,
    `- Categories: ${absoluteUrl("/categories")} - understand where NYC AI companies are clustering.`,
    `- Patterns: ${absoluteUrl("/patterns")} - editorial market patterns and structural observations.`,
    `- Newsfeed: ${absoluteUrl("/newsfeed")} - curated news links and official posts from mapped companies.`,
    `- Jobs: ${absoluteUrl("/jobs")} - roles at early-stage NYC AI companies.`,
    `- Ask Atlas: ${absoluteUrl("/ask")} - natural-language questions over the AI Atlas market map.`,
    `- MCP server: ${absoluteUrl("/mcp")} - read-only structured access for MCP-compatible AI assistants.`,
    `- Full LLM inventory: ${absoluteUrl("/llms-full.txt")}`,
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
    ...companies.slice(0, 16).map((company) => {
      return `- ${company.name}: ${company.one_line_thesis || company.short_description} (${company.category}, ${company.stage}) ${absoluteUrl(`/companies/${company.slug}`)}`;
    }),
    "",
    "## Data and Editorial Standards",
    "- AI Atlas NYC is narrow by design: early-stage, AI-focused, New York City startup ecosystem.",
    "- Company pages should not be treated as funding, customer, or traction claims unless the profile explicitly states and sources those details.",
    "- Public pages are designed for citation and search discovery; admin, auth, and API routes are intentionally not crawlable.",
    "- The MCP server exposes public published market-map data only. It does not expose admin, auth, submission, raw source, automation, or secret data.",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildLlmsFullTxt(companies: Company[]) {
  const stats = getCompanyStats(companies);

  return [
    `# ${siteName} Full Public Inventory`,
    "",
    `Canonical site: ${absoluteUrl("/")}`,
    `Scope: ${stats.totalCompanies} published early-stage NYC AI companies.`,
    `Audience: ${audience}`,
    `MCP server: ${absoluteUrl("/mcp")}`,
    "",
    "## Structured Access",
    [
      `URL: ${absoluteUrl("/mcp")}`,
      "Purpose: read-only structured access for MCP-compatible AI assistants.",
      "Tools: search_companies, get_company, list_categories, get_category, list_patterns, get_pattern, search_jobs.",
      "Boundary: public/published AI Atlas data only. No admin, auth, submissions, raw sources, automation data, or secrets.",
    ].join("\n"),
    "",
    "## Companies",
    ...companies.map((company) =>
      [
        `### ${company.name}`,
        `URL: ${absoluteUrl(`/companies/${company.slug}`)}`,
        `Category: ${company.category}`,
        `Stage: ${company.stage}`,
        company.website_url ? `Website: ${company.website_url}` : "",
        company.x_handle ? `X: https://x.com/${company.x_handle}` : "",
        `Summary: ${company.one_line_thesis || company.short_description}`,
        company.why_it_matters ? `Why it matters: ${company.why_it_matters}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    "",
    "## Categories",
    ...categoryMeta.map((category) =>
      [
        `### ${category.name}`,
        `URL: ${absoluteUrl(`/categories/${category.slug}`)}`,
        `Description: ${category.description}`,
        `Thesis: ${category.thesis}`,
      ].join("\n"),
    ),
    "",
    "## Patterns",
    ...patterns.map((pattern) =>
      [
        `### ${pattern.title}`,
        `URL: ${absoluteUrl(`/patterns/${pattern.slug}`)}`,
        `Framing: ${pattern.framing}`,
        `Companies: ${pattern.companies.map((item) => item.company_slug).join(", ")}`,
      ].join("\n"),
    ),
    "",
  ].join("\n\n");
}

function formatCompanyCount(count: number) {
  return `${count} ${count === 1 ? "company" : "companies"}`;
}

function formatIsoDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString();
}
