import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BrowseByCategory } from "@/components/home/BrowseByCategory";
import { CurrentRead } from "@/components/home/CurrentRead";
import { FeaturedCompanies } from "@/components/home/FeaturedCompanies";
import { HomeFrontPage } from "@/components/home/HomeFrontPage";
import { HomePatterns } from "@/components/home/HomePatterns";
import { LatestSignals } from "@/components/home/LatestSignals";
import { NewsBriefModal } from "@/components/home/NewsBriefModal";
import { RecentlyAdded } from "@/components/home/RecentlyAdded";
import { AtlasAvatarMark } from "@/components/site/atlas-avatar-mark";
import { GlobalSearch } from "@/components/site/global-search";
import { MobileNavMenu } from "@/components/site/mobile-nav-menu";
import { PixelSiteIcon } from "@/components/site/pixel-site-icon";
import { ProfileHeaderLink } from "@/components/site/profile-header-link";
import { SpriteHeaderLink } from "@/components/site/sprite-header-link";
import { Button } from "@/components/ui/button";
import {
  davidAdminFavorites,
  getAdminFavoriteCompanies,
} from "@/data/admin-favorites";
import {
  categoryMeta,
  getCategoryCounts,
} from "@/data/market";
import { getCompanyStats } from "@/lib/companies/getCompanyStats";
import { formatAiStartupCount } from "@/lib/companies/formatCompanyCount";
import {
  getLatestSnapshot,
  getLatestSurface,
  getStoredAgentHomepageData,
} from "@/lib/agent/homepageData";
import {
  createShareMetadata,
  getShareImageUrl,
  shareCta,
  truncateMeta,
} from "@/lib/seo/shareMetadata";
import { getNewsItems } from "@/lib/news/news-store";
import {
  getCompanySignalLabel,
  getSignalPriority as getPublicSignalPriority,
  normalizeSignalLabel,
} from "@/lib/signals/companySignal";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import type { EditorialItem } from "@/types/agent";
import type { Category, Company, MarketInsight } from "@/types/market";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const publishedCompanies = await getPublishedCompanies();
  const stats = getCompanyStats(publishedCompanies);

  return createShareMetadata({
    title: "AI Atlas NYC | Early-Stage NYC AI Companies to Know",
    description: truncateMeta(
      `${formatAiStartupCount(stats.totalCompanies)} across consumer, healthcare, infrastructure, and more. ${shareCta}.`,
    ),
    image: getShareImageUrl({ page: "home" }),
  });
}

const categoryPulsePhrases: Record<Category, string> = {
  "Fintech & Trading AI": "research, risk, diligence",
  "Legal & Compliance AI": "regulated review workflows",
  "Cybersecurity AI": "security operations and exposure",
  "Media, Ads & Creative AI": "creative workflow signal",
  "Health & Clinical AI": "care operations",
  "Life Sciences AI": "drug discovery and biology",
  "AI-Native Consumer & Social": "daily behavior",
  "Agent Infrastructure": "runtime and reliability",
  "Model Tools & Dev Platform": "evals and app tooling",
  "Enterprise GTM & RevOps AI": "back-office workflows",
  "Data & Memory Layer": "context and retrieval layers",
};

export default async function Home() {
  const [marketCompanies, newsItems] = await Promise.all([
    getPublishedCompanies(),
    getNewsItems({ limit: 8 }),
  ]);
  const publishedCompanies = marketCompanies;
  const storedAgentData = await getStoredAgentHomepageData();
  const storedSurfaces = storedAgentData.editorialSurfaces;
  const storedSnapshot = getLatestSnapshot(storedAgentData.marketSnapshots);
  const companiesById = new Map(
    publishedCompanies.map((company) => [company.id, company]),
  );
  const linkableCompanies = publishedCompanies.map(({ id, name, slug }) => ({
    id,
    name,
    slug,
  }));
  const stats = getCompanyStats(publishedCompanies);
  const categoryCounts = getCategoryCounts(publishedCompanies);
  const recentCompanies = [...publishedCompanies]
    .sort((a, b) => getCompanySortDate(b) - getCompanySortDate(a))
    .slice(0, 6);
  const clearSignalCompanies = publishedCompanies.filter(
    (company) =>
      ["Clear buyer pull", "Workflow signal", "Funding signal"].includes(
        getCompanySignalLabel(company),
      ),
  );
  const featuredPublishedCompanies = publishedCompanies.filter(
    (company) => company.is_featured,
  );
  const breakoutCompanies = publishedCompanies.filter(
    (company) => company.is_breakout,
  );
  const davidFavoriteCompanies = getAdminFavoriteCompanies(
    davidAdminFavorites,
    publishedCompanies,
  );
  const sortedHighlightedCompanies = [...publishedCompanies].sort(
    compareCompaniesForHomepage,
  );
  const companiesToKnow = uniqueCompanies([
    ...featuredPublishedCompanies.slice(0, 1),
    ...davidFavoriteCompanies,
    ...breakoutCompanies,
    ...clearSignalCompanies,
    ...sortedHighlightedCompanies,
  ]).slice(0, 5);
  const companiesToKnowSurface = getLatestSurface(
    storedSurfaces,
    "companies_to_know",
  );
  const latestSignalsSurface = getLatestSurface(storedSurfaces, "latest_signals");
  const currentReadSurface = getLatestSurface(storedSurfaces, "current_read");
  const marketSnapshotSurface = getLatestSurface(
    storedSurfaces,
    "market_snapshot",
  );
  const categoryPulseSurface = getLatestSurface(storedSurfaces, "category_pulse");
  const recentlyAddedSurface = getLatestSurface(storedSurfaces, "recently_added");
  const surfaceCompaniesToKnow =
    getCompaniesFromSurface(companiesToKnowSurface?.items, companiesById) ??
    companiesToKnow;
  const featuredHomepageCompanies = uniqueCompanies([
    ...davidFavoriteCompanies,
    ...featuredPublishedCompanies,
    ...breakoutCompanies,
    ...clearSignalCompanies,
    ...recentCompanies,
  ]).slice(0, 6);
  const categoryPulseItems = categoryMeta
    .map((category) => ({
      category: category.name,
      count: categoryCounts[category.name],
      href: `/categories/${category.slug}`,
      phrase: categoryPulsePhrases[category.name],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const surfaceCategoryPulseItems =
    getCategoryPulseFromSurface(categoryPulseSurface?.items) ?? categoryPulseItems;
  const surfaceCurrentRead =
    getCurrentReadFromSurface(currentReadSurface?.items) ?? [];
  const surfaceRecentlyAdded =
    getRecentlyAddedCompaniesFromSurface(recentlyAddedSurface?.items, companiesById) ??
    recentCompanies;
  const latestSignalItems = getSafeLatestSignalItems(latestSignalsSurface?.items);
  const displayedLatestSignals =
    latestSignalItems.length > 0
      ? latestSignalItems
      : createLatestSignalFallbackItems(surfaceRecentlyAdded);
  const latestUpdatedAt = getLatestHomepageUpdatedAt([
    stats.lastUpdatedAt,
    storedSnapshot?.generatedAt,
    ...storedSurfaces.map((surface) => surface.generatedAt),
  ]);
  const marketSnapshotCounts = getMarketSnapshotCounts(
    marketSnapshotSurface?.items,
    storedSnapshot,
  );
  const analystRead =
    marketSnapshotSurface?.items.find((item) => item.title === "Analyst read")
      ?.body ??
    surfaceCurrentRead[0]?.body ??
    "Recent early-stage additions skew toward practical AI: healthcare, finance, infrastructure, and operational workflows.";

  return (
    <div className="min-h-screen bg-transparent text-[#181818]">
      <SiteNav />

      <main>
        <HomeFrontPage
          companiesToKnow={surfaceCompaniesToKnow}
          categoryPulse={surfaceCategoryPulseItems}
          stats={stats}
          currentThemeCount={marketSnapshotCounts.currentThemeCount}
          analystRead={analystRead}
          companiesById={companiesById}
          snapshotOverrides={marketSnapshotCounts}
          latestUpdatedAt={latestUpdatedAt}
        />
        <HomePatterns />
        <CurrentRead insights={surfaceCurrentRead} companiesById={companiesById} />
        <RecentlyAdded companies={surfaceRecentlyAdded} />
        <NewsBriefModal items={newsItems} companies={linkableCompanies} />
        <LatestSignals
          items={displayedLatestSignals}
          companiesById={companiesById}
        />
        <FeaturedCompanies companies={featuredHomepageCompanies} />
        <BrowseByCategory categories={categoryMeta} counts={categoryCounts} />
        <SubmitCompanyCTA />
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-transparent bg-[rgb(248_246_241_/_0.96)] backdrop-blur-md md:border-[#E7E1D8]">
      <div className="editorial-container flex items-center gap-3 pt-5 sm:gap-5 md:h-[76px] md:pt-0">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 md:gap-3" aria-label="AI Atlas NYC home">
          <AtlasAvatarMark size="sm" className="size-10 md:size-7" />
          <span className="font-heading text-[24px] font-medium tracking-[-0.025em] text-[#181818] md:text-[24px]">
            AI Atlas NYC
          </span>
        </Link>

        <GlobalSearch
          id="home-search"
          className="ml-7 hidden w-[300px] shrink-0 md:block xl:w-[410px]"
          inputClassName="h-11 w-full rounded-lg border border-[#D8CFC1] bg-[#FBFAF7] pl-10 pr-3 text-[15px] text-[#181818] outline-none transition placeholder:text-[#7A746C] focus:border-[#BDAF9E] focus:ring-0"
        />

        <nav
          aria-label="Primary"
          className="ml-auto hidden items-center gap-3 lg:flex"
        >
          <SpriteHeaderLink
            href="/companies"
            icon="globe"
            label="Map"
          />
          <SpriteHeaderLink href="/categories" icon="grid" label="Categories" />
          <SpriteHeaderLink href="/patterns" icon="compass" label="Patterns" />
          <SpriteHeaderLink href="/feed" icon="pin" label="Newsfeed" />
          <SpriteHeaderLink href="/jobs" icon="skyline" label="Jobs" />
          <ProfileHeaderLink compact className="px-1.5 py-1" />
          <Button asChild className="h-11 rounded-lg px-5 app-primary-button">
            <Link href="/submit">Submit Startup</Link>
          </Button>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3 lg:hidden">
          <ProfileHeaderLink
            className="inline-flex size-11 justify-center rounded-[13px] border border-[#D8CFC1] bg-[#FBFAF7] p-0 hover:bg-[rgb(17_17_17_/_0.025)]"
            compact
          />
          <MobileNavMenu className="size-11 rounded-[13px] border-[#D8CFC1] bg-[#FBFAF7]" />
        </div>
      </div>
      <GlobalSearch
        id="home-search-mobile"
        className="mx-5 mb-0 mt-5 md:hidden"
        inputClassName="h-14 w-full rounded-[14px] border border-[#D8CFC1] bg-[#FBFAF7] pl-10 pr-4 text-[15px] text-[#181818] outline-none transition placeholder:text-[#8C857C] focus:border-[#BDAF9E] focus:ring-0"
        iconClassName="left-4 size-[18px] text-[#6F675E]"
      />
    </header>
  );
}

function SubmitCompanyCTA() {
  return (
    <section className="bg-section">
      <div className="editorial-container py-10">
        <div className="flex flex-col gap-5 border-y border-[#E7E1D8] py-7 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="editorial-label">Contribute</p>
            <h2 className="mt-3 editorial-section-title">Know a company we missed?</h2>
            <p className="mt-3 max-w-[680px] text-base leading-[1.6] text-[#5F5A52]">
              AI Atlas is curated by hand and updated agentically. Submit a
              meaningful early-stage NYC AI company for review.
            </p>
          </div>
          <Button asChild size="lg" className="app-primary-button">
            <Link href="/submit">
              Submit Startup
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#E7E1D8] bg-section">
      <div className="editorial-container flex flex-col gap-5 py-8 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <AtlasAvatarMark size="sm" />
            <p className="font-heading text-[18px] font-medium tracking-[-0.025em] text-[#181818]">
              AI Atlas NYC
            </p>
          </div>
          <p className="mt-2 text-sm text-[#5F5A52]">
            A curated map of early-stage NYC AI startups from pre-seed through
            Series A.
          </p>
        </div>

        <nav className="flex flex-wrap gap-4 text-sm font-medium text-[#5F5A52]">
          <Link href="/companies" className="inline-flex items-center gap-1.5 hover:text-[#181818]">
            <PixelSiteIcon name="globe" size="xs" />
            Map
          </Link>
          <Link href="/categories" className="hover:text-[#181818]">
            Categories
          </Link>
          <Link href="/patterns" className="hover:text-[#181818]">
            Patterns
          </Link>
          <Link href="/feed" className="hover:text-[#181818]">
            Newsfeed
          </Link>
          <Link href="/submit" className="hover:text-[#181818]">
            Submit
          </Link>
        </nav>
      </div>
    </footer>
  );
}

function compareCompaniesForHomepage(a: Company, b: Company) {
  const priorityDifference = getSignalPriority(a) - getSignalPriority(b);
  if (priorityDifference !== 0) return priorityDifference;

  const dateDifference = getCompanySortDate(b) - getCompanySortDate(a);
  if (dateDifference !== 0) return dateDifference;

  return getCompanyRichness(b) - getCompanyRichness(a);
}

function getSignalPriority(company: Company) {
  return getPublicSignalPriority(getCompanySignalLabel(company));
}

function getCompanySortDate(company: Company) {
  return (
    Math.max(
      getDateTime(company.updated_at),
      getDateTime(company.created_at),
    ) || getDateTime(company.recent_activity_date)
  );
}

function getDateTime(value?: string) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getCompanyRichness(company: Company) {
  return [
    company.short_description,
    company.one_line_thesis,
    company.why_it_matters,
    company.ai_usage_profile,
  ].join(" ").length;
}

function uniqueCompanies(companies: Company[]) {
  const seen = new Set<string>();

  return companies.filter((company) => {
    if (company.status !== "published" || seen.has(company.id)) return false;

    seen.add(company.id);
    return true;
  });
}

function getCompaniesFromSurface(
  items: EditorialItem[] | undefined,
  companiesById: Map<string, Company>,
) {
  if (!items?.length) return null;

  const companies = items
    .map((item) => {
      const company = item.companyId ? companiesById.get(item.companyId) : undefined;
      if (!company) return null;

      return {
        ...company,
        generated: {
          ...company.generated,
          hook: item.body || company.generated.hook,
          signalLabel: toGeneratedSignalLabel(item.label, company),
        },
      } satisfies Company;
    })
    .filter((company): company is Company => Boolean(company));

  return companies.length > 0 ? companies : null;
}

function getRecentlyAddedCompaniesFromSurface(
  items: EditorialItem[] | undefined,
  companiesById: Map<string, Company>,
) {
  if (!items?.length) return null;

  const companies = items
    .map((item): Company | null => {
      const company = item.companyId ? companiesById.get(item.companyId) : undefined;
      if (!company) return null;
      const inclusionReason = item.body
        ? {
            title: "Why it was added",
            body: item.body,
            generatedAt: new Date().toISOString(),
            sourceEventIds: item.supportingEventIds ?? [],
            sourceCompanyIds:
              item.supportingCompanyIds && item.supportingCompanyIds.length > 0
                ? item.supportingCompanyIds
                : [company.id],
          }
        : company.inclusionReason;

      return inclusionReason
        ? {
            ...company,
            inclusionReason,
          }
        : company;
    })
    .filter((company): company is Company => Boolean(company));

  return companies.length > 0 ? companies : null;
}

function getCurrentReadFromSurface(
  items: EditorialItem[] | undefined,
): MarketInsight[] | null {
  if (!items?.length) return null;

  return items.slice(0, 3).map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body ?? "",
    supportingCompanyIds: item.supportingCompanyIds ?? [],
    generatedAt: new Date().toISOString(),
    sourceCompanyIds: item.supportingCompanyIds ?? [],
    sourceHash: item.id,
  }));
}

function getCategoryPulseFromSurface(items: EditorialItem[] | undefined) {
  if (!items?.length) return null;

  const categoryItems = items
    .map((item) => {
      const category = categoryMeta.find((meta) => meta.name === item.category);
      if (!category) return null;

      const count = Number(item.body?.match(/^(\d+)/)?.[1] ?? 0);
      const phrase =
        item.body?.replace(/^\d+ companies? · /, "") ??
        categoryPulsePhrases[category.name];

      return {
        category: category.name,
        count,
        href: `/categories/${category.slug}`,
        phrase,
      };
    })
    .filter(
      (
        item,
      ): item is {
        category: Category;
        count: number;
        href: string;
        phrase: string;
      } => Boolean(item),
    );

  return categoryItems.length > 0 ? categoryItems : null;
}

function getMarketSnapshotCounts(
  items: EditorialItem[] | undefined,
  snapshot: ReturnType<typeof getLatestSnapshot>,
) {
  const byTitle = new Map(items?.map((item) => [item.title, item.body]) ?? []);
  const categoryCount = snapshot
    ? Object.keys(snapshot.categoryCounts).length
    : undefined;

  return {
    totalCompanies:
      numberFromText(getByTitle(byTitle, "Companies tracked", "companies tracked")) ??
      snapshot?.companyCount,
    totalCategories:
      numberFromText(getByTitle(byTitle, "Categories", "categories")) ??
      categoryCount,
    recentlyAddedCount:
      numberFromText(getByTitle(byTitle, "Recently added", "recent additions")) ??
      snapshot?.recentCompanyIds.length,
    currentThemeCount:
      numberFromText(getByTitle(byTitle, "Current themes", "current themes")) ??
      snapshot?.topSignals.length ??
      3,
  };
}

function getByTitle(items: Map<string, string | undefined>, ...titles: string[]) {
  for (const title of titles) {
    const value = items.get(title);
    if (value !== undefined) return value;
  }

  return undefined;
}

function numberFromText(value: string | undefined) {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function createLatestSignalFallbackItems(companies: Company[]): EditorialItem[] {
  return companies.slice(0, 5).map((company) => {
    const reason =
      company.inclusionReason?.body?.trim() ||
      company.generated?.hook?.trim() ||
      company.short_description.trim();
    const body = `Fresh addition: ${normalizeLatestSignalReason(reason)}`;

    return {
      id: `latest_signal_fallback_${company.id}`,
      title: company.name,
      body,
      companyId: company.id,
      category: company.category,
      label: isWithinDays(company.created_at, 14) ? "New" : "Recently added",
      supportingCompanyIds: [company.id],
      occurredAt: company.created_at || company.updated_at,
      sourceName: company.category,
    } satisfies EditorialItem;
  });
}

const bannedUserFacingSignalTerms = [
  "agent",
  "cron",
  "pipeline",
  "refresh",
  "fallback",
  "placeholder",
  "todo",
  "live signal",
  "gathers more events",
  "insufficient data",
  "not enough data",
  "discovered by the system",
  "picked up",
  "added to ai atlas",
  "joined the map",
  "category depth",
  "deep category",
  "strong category fit",
  "high potential",
  "promising",
  "model-usage potential",
];

function normalizeLatestSignalReason(value: string) {
  const cleaned = value
    .replace(/^added\s*:\s*/i, "")
    .replace(/^added\s+(because|for)\s+(it|its)\s+/i, "")
    .replace(/^added\s+(because|for)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "new early-stage NYC AI company with a clear market fit.";

  return cleaned;
}

function getSafeLatestSignalItems(items: EditorialItem[] | undefined) {
  if (!items?.length) return [];

  return items.filter((item) => {
    const text = [
      item.title,
      item.body,
      item.label,
      item.sourceName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return !bannedUserFacingSignalTerms.some((term) => text.includes(term));
  });
}

function getLatestHomepageUpdatedAt(values: Array<string | undefined>) {
  const latest = values.reduce((max, value) => Math.max(max, getDateTime(value)), 0);

  return latest > 0 ? new Date(latest).toISOString() : undefined;
}

function isWithinDays(value: string | undefined, days: number) {
  const time = getDateTime(value);
  if (!time) return false;

  const diff = Date.now() - time;
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function toGeneratedSignalLabel(label: string | undefined, company: Company) {
  return normalizeSignalLabel(label ?? company.generated.signalLabel, company);
}
