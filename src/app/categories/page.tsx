import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CategoryPixelIcon } from "@/components/market-map/category-pixel-icon";
import { JsonLd } from "@/components/seo/JsonLd";
import { PublicShell } from "@/components/site/public-shell";
import { Button } from "@/components/ui/button";
import {
  categoryMeta,
  getCategoryCounts,
} from "@/data/market";
import { formatCompanyCount } from "@/lib/companies/formatCompanyCount";
import {
  getCompanySignalLabel,
  getSignalPriority,
} from "@/lib/signals/companySignal";
import {
  createShareMetadata,
  getShareImageUrl,
} from "@/lib/seo/shareMetadata";
import {
  categoryCollectionItems,
  collectionPageSchema,
} from "@/lib/seo/schema";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import type { Category, CategoryMeta, Company } from "@/types/market";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createShareMetadata({
  title: "NYC AI Startup Categories",
  description:
    "Explore early-stage NYC AI startups across healthcare, infrastructure, finance, legal, consumer, creative, and enterprise automation.",
  path: "/categories",
  image: getShareImageUrl({ page: "categories" }),
});

const shortCategoryDescriptions = {
  "Fintech & Trading AI":
    "AI for markets, risk, capital, and financial operations.",
  "Legal & Compliance AI":
    "AI for legal research, compliance, and policy workflows.",
  "Cybersecurity AI":
    "AI for threat detection, response, and security operations.",
  "Media, Ads & Creative AI":
    "AI for content, creative workflows, and media production.",
  "Health & Clinical AI":
    "Clinical admin, care operations, and healthcare intelligence.",
  "Life Sciences AI":
    "AI accelerating discovery, research, and lab workflows.",
  "AI-Native Consumer & Social":
    "AI experiences for everyday users and communities.",
  "Agent Infrastructure":
    "Infrastructure for building, deploying, and operating agents.",
  "Model Tools & Dev Platform":
    "Developer platforms and tooling for model builders.",
  "Enterprise GTM & RevOps AI":
    "AI for sales, marketing, customer success, and revenue ops.",
  "Data & Memory Layer":
    "Data infrastructure, memory, and context for AI systems.",
} satisfies Record<Category, string>;

type CategoryDirectoryEntry = {
  category: CategoryMeta;
  count: number;
  description: string;
  representatives: Company[];
};

export default async function CategoriesPage() {
  const companies = await getPublishedCompanies();
  const counts = getCategoryCounts(companies);
  const categoryEntries = getCategoryStats(companies, counts);
  const categoryCount = categoryEntries.length;

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: "NYC AI Startup Categories",
          description:
            "Explore early-stage NYC AI startups across healthcare, infrastructure, finance, legal, consumer, creative, and enterprise automation.",
          url: "https://aiatlas.nyc/categories",
          items: categoryCollectionItems(),
        })}
      />
      <PublicShell>
        <main className="bg-section">
          <CategoriesHero categoryCount={categoryCount} />
          <CategoriesDirectory entries={categoryEntries} />
        </main>
      </PublicShell>
    </>
  );
}

function CategoriesHero({ categoryCount }: { categoryCount: number }) {
  return (
    <section className="border-b border-[#E7E1D8]">
      <div className="editorial-container !max-w-[1360px] py-10 sm:py-12 lg:py-16">
        <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end lg:gap-16">
          <div className="max-w-[760px]">
            <p className="editorial-label">NYC AI categories</p>
            <h1 className="mt-5 max-w-[720px] font-heading text-[clamp(48px,12.5vw,68px)] font-medium leading-[0.95] tracking-[0] text-[#111111] sm:text-[clamp(54px,7vw,76px)]">
              Explore The NYC AI Scene By Category.
            </h1>
            <div className="mt-5 h-[3px] w-11 bg-[#A64032]" aria-hidden />
            <p className="mt-5 max-w-[620px] text-[17px] leading-[1.55] text-[#5F5A52] sm:text-[18px]">
              Browse early-stage NYC AI startups across finance, legal,
              creative, healthcare, infrastructure, and more.
            </p>
            <p className="mt-5 max-w-none text-[13px] font-semibold leading-[1.7] text-[#5F5A52] sm:text-sm">
              <span>{formatCategoryCount(categoryCount)}</span>
              <span className="mx-2 text-[#A64032]">·</span>
              <span>curated by hand</span>
              <span className="mx-2 text-[#A64032]">·</span>
              <span>updated agentically.</span>
            </p>
          </div>

          <div className="lg:border-l lg:border-[#E7E1D8] lg:pl-10">
            <div className="max-w-[360px]">
              <Button
                asChild
                className="h-12 w-full rounded-[10px] px-5 text-[15px] app-primary-button sm:w-auto lg:h-[52px] lg:w-full"
              >
                <Link href="/companies">
                  Open startup directory
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <p className="mt-4 text-sm leading-[1.55] text-[#746D64]">
                Browse all startups and apply filters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoriesDirectory({
  entries,
}: {
  entries: CategoryDirectoryEntry[];
}) {
  return (
    <section>
      <div className="editorial-container !max-w-[1360px] py-6 sm:py-8 lg:py-12">
        <div className="hidden border-t border-[#E7E1D8] lg:grid lg:grid-cols-2">
          {entries.map((entry, index) => (
            <DesktopCategoryEntry
              key={entry.category.slug}
              entry={entry}
              isOdd={index % 2 === 0}
            />
          ))}
        </div>

        <div className="grid gap-3 lg:hidden">
          {entries.map((entry) => (
            <MobileCategoryEntry key={entry.category.slug} entry={entry} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DesktopCategoryEntry({
  entry,
  isOdd,
}: {
  entry: CategoryDirectoryEntry;
  isOdd: boolean;
}) {
  return (
    <Link
      href={`/categories/${entry.category.slug}`}
      aria-label={`Browse ${entry.category.name}`}
      className={[
        "group grid min-h-[208px] grid-cols-[64px_minmax(0,1fr)_minmax(180px,0.86fr)_24px] gap-6 border-b border-[#E7E1D8] p-7 transition hover:bg-[rgb(17_17_17_/_0.025)]",
        isOdd ? "border-r border-r-[#E7E1D8]" : "",
      ].join(" ")}
    >
      <CategoryIconTile category={entry.category.name} />

      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="font-heading text-[25px] font-medium leading-[1.05] tracking-[0] text-[#111111]">
            {entry.category.name}
          </h3>
          <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.07em] text-[#9A3D2B]">
            {formatCompanyCount(entry.count)}
          </span>
        </div>
        <p className="mt-3 text-[15px] leading-[1.5] text-[#5F5A52]">
          {entry.description}
        </p>
      </div>

      <RepresentativeCompanies companies={entry.representatives} />

      <ArrowRight
        className="mt-2 size-4 text-[#A64032] transition group-hover:translate-x-0.5 group-hover:text-[#111111]"
        aria-hidden
      />
    </Link>
  );
}

function MobileCategoryEntry({ entry }: { entry: CategoryDirectoryEntry }) {
  return (
    <Link
      href={`/categories/${entry.category.slug}`}
      aria-label={`Browse ${entry.category.name}`}
      className="group grid grid-cols-[72px_minmax(0,1fr)_24px] items-center gap-4 rounded-[14px] border border-[#E7E1D8] bg-[rgb(251_250_247_/_0.62)] p-4 transition hover:bg-[rgb(17_17_17_/_0.025)]"
    >
      <CategoryIconTile category={entry.category.name} mobile />

      <div className="min-w-0 border-l border-[#E7E1D8] pl-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-heading text-[25px] font-medium leading-[1.05] tracking-[0] text-[#111111]">
            {entry.category.name}
          </h2>
          <span className="text-[12px] font-semibold text-[#9A3D2B]">
            {formatCompanyCount(entry.count)}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-[15px] leading-[1.45] text-[#5F5A52]">
          {entry.description}
        </p>
        {entry.representatives.length > 0 ? (
          <p className="mt-2 truncate text-[13px] leading-[1.4] text-[#746D64]">
            {entry.representatives.map((company) => company.name).join(" · ")}
          </p>
        ) : null}
      </div>

      <ArrowRight
        className="size-5 justify-self-end text-[#A64032] transition group-hover:translate-x-0.5 group-hover:text-[#111111]"
        aria-hidden
      />
    </Link>
  );
}

function RepresentativeCompanies({ companies }: { companies: Company[] }) {
  if (companies.length === 0) return null;

  return (
    <div className="space-y-3 border-l border-[#E7E1D8] pl-6 text-[13px] leading-[1.45] text-[#5F5A52]">
      {companies.map((company) => (
        <p key={company.id} className="line-clamp-2">
          <span className="font-semibold text-[#111111]">{company.name}</span>
          <span className="text-[#9A3D2B]"> · </span>
          {getRepresentativeHook(company)}
        </p>
      ))}
    </div>
  );
}

function CategoryIconTile({
  category,
  mobile = false,
}: {
  category: Category;
  mobile?: boolean;
}) {
  return (
    <span
      className={[
        "grid shrink-0 place-items-center rounded-[12px] border border-[#E7E1D8] bg-[#FBFAF7]",
        mobile ? "size-[72px]" : "size-16",
      ].join(" ")}
      aria-hidden
    >
      <CategoryPixelIcon category={category} size="lg" />
    </span>
  );
}

function getCategoryStats(
  companies: Company[],
  counts: Record<Category, number>,
): CategoryDirectoryEntry[] {
  return categoryMeta.map((category) => {
    const categoryCompanies = companies.filter(
      (company) => company.category === category.name,
    );

    return {
      category,
      count: counts[category.name] ?? categoryCompanies.length,
      description:
        shortCategoryDescriptions[category.name] ?? category.description,
      representatives:
        getRepresentativeCompaniesForCategory(categoryCompanies),
    };
  });
}

function getRepresentativeCompaniesForCategory(companies: Company[]) {
  return [...companies].sort(compareRepresentativeCompanies).slice(0, 2);
}

function compareRepresentativeCompanies(a: Company, b: Company) {
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

  const dateDelta =
    Date.parse(b.updated_at || b.created_at) -
    Date.parse(a.updated_at || a.created_at);
  if (dateDelta !== 0) return dateDelta;

  return a.name.localeCompare(b.name);
}

function getRepresentativeHook(company: Company) {
  const hook = company.generated?.hook || company.short_description;
  return hook.replace(/[.]+$/u, "");
}

function formatCategoryCount(count: number) {
  return `${count} ${count === 1 ? "category" : "categories"}`;
}
