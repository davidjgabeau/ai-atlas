import reviews from "@/data/reporting/companies.json";
import reviewedSignals from "@/data/reporting/signals.json";
import reportingResources from "@/data/reporting/resources.json";
import { officeEvidence } from "@/lib/research/evidence";
import { categoryMeta } from "@/data/market";
import { patterns } from "@/data/patterns";
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
    reporting: { methodology: string; signals: unknown[]; resources: unknown[]; experts: unknown[] };
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
      founders: string[];
      sourceUrls: string[];
      sourceCheckedAt: string | null;
      officeEvidence: unknown[];
    }>;
  };
  companies: Company[];
};

export async function buildAskAtlasContext(): Promise<AskAtlasContext> {
  const companies = await getPublishedCompanies();
  const companiesBySlug = new Map(
    companies.map((company) => [company.slug, company]),
  );


  return {
    companies,
    promptContext: {
      product: "AI Atlas NYC",
      scope:
        "A curated map of New York City AI companies at every stage.",
      reporting: { methodology: "Curated sample, not a citywide census. Office source checks do not independently confirm current occupancy. Mailing addresses and unverified locations do not establish offices. Distinguish event dates, source dates, and review dates. Use source links in reporting answers.", signals: reviewedSignals, resources: reportingResources.resources, experts: reportingResources.experts },
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
      latestSignals: [...reviewedSignals].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at)).slice(0, 8).map((item) => ({
        title: item.title, body: `${item.summary} Event date: ${item.occurred_at}. Source: ${item.source_url}`,
        label: item.type, company: companiesBySlug.get(item.company_slug)?.name,
      })),
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
        founders: company.founders.map((f) => f.name),
        sourceUrls: reviews.find((r) => r.slug === company.slug)?.source_urls ?? company.discoveryReason?.sourceUrls ?? [],
        sourceCheckedAt: reviews.find((r) => r.slug === company.slug)?.verified_at ?? null,
        officeEvidence: officeEvidence.filter((o) => o.company_slug === company.slug),
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
