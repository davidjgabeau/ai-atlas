import "./load-env";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import sitemap from "../src/app/sitemap";
import { categoryMeta } from "../src/data/market";
import { patterns } from "../src/data/patterns";
import { getPublishedCompanies } from "../src/lib/supabase/market-data";

type Check = {
  name: string;
  ok: boolean;
  detail?: string;
};

const repoRoot = process.cwd();
const checks: Check[] = [];

async function main() {
  const [companies, sitemapEntries] = await Promise.all([
    getPublishedCompanies(),
    sitemap(),
  ]);

  const sitemapUrls = sitemapEntries.map((entry) => entry.url);
  const siteUrl = "https://aiatlas.nyc";

  addCheck("sitemap route exists", fileExists("src/app/sitemap.ts"));
  addCheck("robots route exists", fileExists("src/app/robots.ts"));
  addCheck(
    "sitemap generated entries",
    sitemapUrls.length > 0,
    `${sitemapUrls.length} entries`,
  );

  const requiredRoutes = [
    "/",
    "/companies",
    "/categories",
    "/patterns",
    "/newsfeed",
    "/jobs",
  ];

  for (const route of requiredRoutes) {
    addCheck(
      `sitemap includes ${route}`,
      sitemapUrls.includes(`${siteUrl}${route === "/" ? "/" : route}`),
    );
  }

  const disallowedRoutes = [
    "/admin",
    "/api",
    "/auth",
    "/debug",
    "/drafts",
    "/preview",
    "/private",
    "/highlights",
  ];

  for (const route of disallowedRoutes) {
    addCheck(
      `sitemap excludes ${route}`,
      sitemapUrls.every((url) => !url.includes(route)),
    );
  }

  addCheck(
    "company slugs are unique",
    new Set(companies.map((company) => company.slug)).size === companies.length,
    `${companies.length} companies`,
  );

  const companiesMissingDescriptions = companies.filter(
    (company) =>
      !company.name ||
      !company.slug ||
      !(
        company.one_line_thesis ||
        company.short_description ||
        company.why_it_matters
      ),
  );
  addCheck(
    "company pages have title/description data",
    companiesMissingDescriptions.length === 0,
    companiesMissingDescriptions.map((company) => company.slug).join(", "),
  );

  const categoriesMissingDescriptions = categoryMeta.filter(
    (category) => !category.name || !category.slug || !category.description,
  );
  addCheck(
    "category pages have title/description data",
    categoriesMissingDescriptions.length === 0,
    categoriesMissingDescriptions.map((category) => category.slug).join(", "),
  );

  for (const category of categoryMeta) {
    addCheck(
      `sitemap includes category ${category.slug}`,
      sitemapUrls.includes(`${siteUrl}/categories/${category.slug}`),
    );
  }

  for (const pattern of patterns) {
    addCheck(
      `sitemap includes pattern ${pattern.slug}`,
      sitemapUrls.includes(`${siteUrl}/patterns/${pattern.slug}`),
    );
  }

  const metadataRoutes: Array<[string, string]> = [
    ["homepage metadata", "src/app/page.tsx"],
    ["companies metadata", "src/app/companies/page.tsx"],
    ["categories metadata", "src/app/categories/page.tsx"],
    ["patterns metadata", "src/app/patterns/page.tsx"],
    ["newsfeed metadata", "src/app/newsfeed/page.tsx"],
    ["feed canonical metadata", "src/app/feed/page.tsx"],
    ["jobs metadata", "src/app/jobs/page.tsx"],
    ["company metadata", "src/app/companies/[slug]/page.tsx"],
    ["category metadata", "src/app/categories/[slug]/page.tsx"],
    ["profile metadata", "src/app/profiles/[handle]/page.tsx"],
  ];

  for (const [name, filePath] of metadataRoutes) {
    const source = readSource(filePath);
    addCheck(
      name,
      source.includes("metadata") || source.includes("generateMetadata"),
    );
    addCheck(
      `${name} has canonical path`,
      source.includes("path:") || source.includes("alternates"),
    );
  }

  const appSource = [
    "src/app/layout.tsx",
    "src/app/page.tsx",
    "src/app/companies/page.tsx",
    "src/app/categories/page.tsx",
    "src/app/categories/[slug]/page.tsx",
    "src/app/patterns/page.tsx",
    "src/app/feed/page.tsx",
    "src/app/newsfeed/page.tsx",
    "src/app/jobs/page.tsx",
    "src/app/companies/[slug]/page.tsx",
  ]
    .map(readSource)
    .join("\n");

  addCheck(
    "metadata avoids hardcoded stale company counts",
    !/\b\d+\+?\s+(companies|startups)\b/i.test(appSource),
  );

  const failed = checks.filter((check) => !check.ok);
  for (const check of checks) {
    const suffix = check.detail ? ` (${check.detail})` : "";
    console.log(`${check.ok ? "✓" : "✗"} ${check.name}${suffix}`);
  }

  if (failed.length > 0) {
    console.error(`\nSEO audit failed: ${failed.length} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("\nSEO audit passed.");
}

function fileExists(filePath: string) {
  return existsSync(path.join(repoRoot, filePath));
}

function readSource(filePath: string) {
  return readFileSync(path.join(repoRoot, filePath), "utf8");
}

function addCheck(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail: detail || undefined });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
