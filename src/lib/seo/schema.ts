import { categoryMeta } from "@/data/market";
import { SEO_DEFAULTS } from "@/lib/seo/config";
import { absoluteUrl, getShareImageUrl } from "@/lib/seo/shareMetadata";
import type { Pattern } from "@/data/patterns";
import type { Company, CompanySocialPost, NewsItem } from "@/types/market";

type JsonLdNode = Record<string, unknown>;

export function websiteSchema(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_DEFAULTS.siteName,
    url: absoluteUrl("/"),
    description: SEO_DEFAULTS.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/api/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationSchema(): JsonLdNode {
  return compactSchema({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO_DEFAULTS.siteName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icons/globe.png"),
    description: SEO_DEFAULTS.description,
    sameAs: ["https://x.com/AiAtlasNYC"],
  });
}

export function companyOrganizationSchema(company: Company): JsonLdNode {
  const description = getCompanyDescription(company);
  const sameAs = [
    company.website_url,
    company.x_handle ? `https://x.com/${company.x_handle}` : "",
  ].filter(Boolean);

  return compactSchema({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    url: company.website_url || absoluteUrl(`/companies/${company.slug}`),
    description,
    sameAs,
    location: company.office_address
      ? {
          "@type": "Place",
          address: company.office_address,
        }
      : undefined,
    mainEntityOfPage: absoluteUrl(`/companies/${company.slug}`),
  });
}

export function collectionPageSchema({
  name,
  description,
  url,
  items,
}: {
  name: string;
  description: string;
  url: string;
  items: Array<{
    name: string;
    url: string;
    description?: string;
  }>;
}): JsonLdNode {
  return compactSchema({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, index) =>
        compactSchema({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          url: item.url,
          description: item.description,
        }),
      ),
    },
  });
}

export function companyCollectionItems(companies: Company[], limit = 40) {
  return companies.slice(0, limit).map((company) => ({
    name: company.name,
    url: absoluteUrl(`/companies/${company.slug}`),
    description: getCompanyDescription(company),
  }));
}

export function categoryCollectionItems(categories = categoryMeta) {
  return categories.map((category) => ({
    name: category.name,
    url: absoluteUrl(`/categories/${category.slug}`),
    description: category.description,
  }));
}

export function patternCollectionItems(patterns: Pattern[]) {
  return patterns.map((pattern) => ({
    name: pattern.title,
    url: absoluteUrl(`/patterns/${pattern.slug}`),
    description: pattern.framing,
  }));
}

export function feedCollectionItems({
  newsItems,
  socialPosts,
}: {
  newsItems: NewsItem[];
  socialPosts: CompanySocialPost[];
}) {
  return [
    ...newsItems.map((item) => ({
      name: item.title,
      url: item.source_url,
      description: item.summary,
    })),
    ...socialPosts.map((post) => ({
      name: `Post from @${post.author_handle}`,
      url: post.post_url,
      description: post.post_text,
    })),
  ].slice(0, 60);
}

export function articleSchema({
  title,
  description,
  url,
  dateModified,
}: {
  title: string;
  description: string;
  url: string;
  dateModified?: string;
}): JsonLdNode {
  return compactSchema({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    image: getShareImageUrl({ page: "insights" }),
    dateModified,
    author: {
      "@type": "Organization",
      name: SEO_DEFAULTS.siteName,
      url: absoluteUrl("/"),
    },
    publisher: {
      "@type": "Organization",
      name: SEO_DEFAULTS.siteName,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/icons/globe.png"),
      },
    },
  });
}

export function breadcrumbSchema(
  items: Array<{
    name: string;
    url: string;
  }>,
): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function getCompanyDescription(company: Company) {
  return (
    company.one_line_thesis ||
    company.short_description ||
    company.why_it_matters ||
    `${company.name} is listed in AI Atlas NYC.`
  ).replace(/\s+/g, " ").trim();
}

function compactSchema<T extends JsonLdNode>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === undefined || entry === null || entry === "") return false;
      if (Array.isArray(entry)) return entry.length > 0;
      return true;
    }),
  ) as T;
}
