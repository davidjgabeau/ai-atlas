import { categoryMeta } from "@/data/market";
import { patterns } from "@/data/patterns";
import {
  getLatestSurface,
  getStoredAgentHomepageData,
} from "@/lib/agent/homepageData";
import { formatViewCount } from "@/lib/metrics/formatViewCount";
import { isRecentCompanyAddition } from "@/lib/companies/recentAdditions";
import { getCompanySignalLabel } from "@/lib/signals/companySignal";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import type { AskAtlasCompanyCard } from "@/types/ask-atlas";
import type { Company } from "@/types/market";

export type AskAtlasContext = {
  promptContext: {
    product: string;
    scope: string;
    counts: {
      companies: number;
      categories: number;
      patterns: number;
    };
    categories: Array<{
      name: string;
      description: string;
      thesis: string;
    }>;
    patterns: Array<{
      title: string;
      framing: string;
      companies: string[];
    }>;
    latestSignals: Array<{
      title: string;
      body: string;
      label: string;
      category?: string;
      company?: string;
    }>;
    companies: Array<{
      id: string;
      name: string;
      slug: string;
      category: string;
      stage: string;
      hook: string;
      description: string;
      thesis: string;
      whyItMatters: string;
      signal: string;
      signalReason: string;
      viewCount: number;
      viewCountLabel: string;
      recentlyAdded: boolean;
      recentActivity: string;
      recentActivityDate: string;
      fundingRound: string;
      fundingAmount: string;
      fundingDate: string;
      fundingNote: string;
    }>;
  };
  companies: Company[];
};

export async function buildAskAtlasContext(): Promise<AskAtlasContext> {
  const [companies, homepageData] = await Promise.all([
    getPublishedCompanies(),
    getStoredAgentHomepageData(),
  ]);
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const companiesBySlug = new Map(
    companies.map((company) => [company.slug, company]),
  );
  const latestSignals = getLatestSurface(
    homepageData.editorialSurfaces,
    "latest_signals",
  );

  return {
    companies,
    promptContext: {
      product: "AI Atlas NYC",
      scope:
        "A curated map of early-stage New York City AI startups from pre-seed through Series A.",
      counts: {
        companies: companies.length,
        categories: categoryMeta.length,
        patterns: patterns.length,
      },
      categories: categoryMeta.map((category) => ({
        name: category.name,
        description: category.description,
        thesis: category.thesis,
      })),
      patterns: patterns.map((pattern) => ({
        title: pattern.title,
        framing: pattern.framing,
        companies: pattern.companies
          .map((item) => companiesBySlug.get(item.company_slug)?.name)
          .filter((name): name is string => Boolean(name)),
      })),
      latestSignals:
        latestSignals?.items.slice(0, 6).map((item) => ({
          title: item.title,
          body: item.body ?? "",
          label: item.label ?? "Signal",
          category: item.category,
          company: item.companyId
            ? companiesById.get(item.companyId)?.name
            : undefined,
        })) ?? [],
      companies: companies.map((company) => ({
        id: company.id,
        name: company.name,
        slug: company.slug,
        category: company.category,
        stage: company.stage,
        hook: company.generated.hook,
        description: company.short_description,
        thesis: company.one_line_thesis,
        whyItMatters: company.why_it_matters,
        signal: getCompanySignalLabel(company),
        signalReason: company.generated.signalReason,
        viewCount: company.metrics?.views ?? 0,
        viewCountLabel: formatViewCount(company.metrics?.views ?? 0),
        recentlyAdded: isRecentCompanyAddition(company),
        recentActivity: company.recent_activity_text,
        recentActivityDate: company.recent_activity_date,
        fundingRound: company.funding_round,
        fundingAmount: company.funding_amount,
        fundingDate: company.funding_date,
        fundingNote: company.funding_note,
      })),
    },
  };
}

export function toAskCompanyCard(company: Company): AskAtlasCompanyCard {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    category: company.category,
    stage: company.stage,
    hook: company.generated.hook,
    description: company.short_description,
    logoUrl: company.logo_url,
    websiteUrl: company.website_url,
    signalLabel: getCompanySignalLabel(company),
    views: company.metrics?.views ?? 0,
  };
}
