import type { MetadataRoute } from "next";

import { categoryMeta } from "@/data/market";
import { patterns } from "@/data/patterns";
import { SITE_URL } from "@/lib/seo/config";
import { getNewsItems } from "@/lib/news/news-store";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import { getCompanySocialPosts } from "@/lib/supabase/social-feed";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [companies, newsItems, socialPosts] = await Promise.all([
    getPublishedCompanies(),
    getNewsItems({ limit: 60 }),
    getCompanySocialPosts({ limit: 60 }),
  ]);

  const latestCompanyDate = latestDate(
    companies.flatMap((company) => [company.updated_at, company.created_at]),
  );
  const latestNewsfeedDate = latestDate([
    ...newsItems.flatMap((item) => [
      item.updated_at,
      item.published_at,
      item.discovered_at,
    ]),
    ...socialPosts.map((post) => post.posted_at),
  ]);
  const latestPatternDate = latestDate(patterns.map((pattern) => pattern.updated_at));
  const homeLastModified =
    latestDate([latestCompanyDate, latestNewsfeedDate, latestPatternDate]) ??
    new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    route("/", homeLastModified, "daily", 1),
    route("/ask", homeLastModified, "daily", 0.9),
    route("/companies", latestCompanyDate, "daily", 0.95),
    route("/categories", latestCompanyDate, "weekly", 0.85),
    route("/patterns", latestPatternDate, "weekly", 0.75),
    route("/newsfeed", latestNewsfeedDate, "daily", 0.8),
    route("/jobs", latestCompanyDate, "daily", 0.75),
    route("/insights", latestCompanyDate, "weekly", 0.65),
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categoryMeta.map((category) => {
    const categoryCompanies = companies.filter(
      (company) => company.category === category.name,
    );
    const lastModified =
      latestDate(
        categoryCompanies.flatMap((company) => [
          company.updated_at,
          company.created_at,
        ]),
      ) ?? latestCompanyDate;

    return route(
      `/categories/${category.slug}`,
      lastModified,
      "weekly",
      0.75,
    );
  });

  const companyRoutes: MetadataRoute.Sitemap = companies.map((company) =>
    route(
      `/companies/${company.slug}`,
      parseDate(company.updated_at) ?? parseDate(company.created_at),
      "weekly",
      0.7,
    ),
  );

  const patternRoutes: MetadataRoute.Sitemap = patterns.map((pattern) =>
    route(
      `/patterns/${pattern.slug}`,
      parseDate(pattern.updated_at) ?? latestPatternDate,
      "monthly",
      0.6,
    ),
  );

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...companyRoutes,
    ...patternRoutes,
  ];
}

function route(
  path: string,
  lastModified: Date | string | null | undefined,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap[number] {
  return {
    url: new URL(path, SITE_URL).toString(),
    lastModified: lastModified ?? new Date(),
    changeFrequency,
    priority,
  };
}

function latestDate(values: Array<Date | string | null | undefined>): Date | null {
  let latest: Date | null = null;

  for (const value of values) {
    const date = parseDate(value);
    if (!date) continue;

    if (!latest || date.getTime() > latest.getTime()) {
      latest = date;
    }
  }

  return latest;
}

function parseDate(value: Date | string | null | undefined) {
  if (value instanceof Date) return value;
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
