import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { CategoryPulse, type CategoryPulseItem } from "@/components/home/CategoryPulse";
import { CompaniesToKnow } from "@/components/home/CompaniesToKnow";
import { HeroSubheadline } from "@/components/home/HeroSubheadline";
import { MarketSnapshot } from "@/components/home/MarketSnapshot";
import { PixelSiteIcon } from "@/components/site/pixel-site-icon";
import { Button } from "@/components/ui/button";
import type { CompanyStats } from "@/lib/companies/getCompanyStats";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import type { Company } from "@/types/market";

type HomeFrontPageProps = {
  companiesToKnow: Company[];
  categoryPulse: CategoryPulseItem[];
  stats: CompanyStats;
  currentThemeCount: number;
  latestUpdatedAt?: string;
};

export function HomeFrontPage({
  companiesToKnow,
  categoryPulse,
  stats,
  currentThemeCount,
  latestUpdatedAt,
}: HomeFrontPageProps) {
  const updateTime = latestUpdatedAt ?? stats.lastUpdatedAt;
  const updatedLabel = updateTime ? formatRelativeUpdate(updateTime) : undefined;

  return (
    <section className="frontPage">
      <div className="editorial-container">
        <div className="frontPageGrid">
          <div className="homeHeroCopy min-w-0">
            <div className="hidden items-center gap-3 lg:flex">
              <Sparkles className="size-4 text-[#A64032]" aria-hidden="true" />
              <p className="editorial-label">Market Map</p>
            </div>

            <h1 className="homeHeroHeadline mt-8 hidden lg:block">
              <span className="block">New York’s</span>
              <span className="block">AI Economy.</span>
              <span className="block">Every Stage.</span>
            </h1>
            <h1 className="homeHeroHeadline homeHeroHeadlineMobile lg:hidden">
              <span className="block">New York’s</span>
              <span className="block">AI Economy.</span>
              <span className="block">Every Stage.</span>
            </h1>
            <HeroSubheadline count={stats.totalCompanies} />
            <HeroStatsRow stats={stats} updatedLabel={updatedLabel} />
            <Link
              href="/research"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B] transition hover:text-[#181818]"
            >
              Explore the evidence
              <ArrowRight className="size-3.5" />
            </Link>

            <div className="mt-6 flex flex-col items-stretch gap-5 lg:mt-8 lg:max-w-[300px] lg:gap-3">
              <Button asChild className="h-[58px] w-full gap-3 rounded-[12px] px-[18px] text-[16px] app-primary-button lg:h-[50px] lg:rounded-lg lg:text-[15px]">
                <Link href="/companies">
                  Explore companies
                  <ArrowRight className="size-5 lg:size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-[50px] w-full rounded-lg"><Link href="/research">Open the research desk <ArrowRight className="size-4" /></Link></Button>
            </div>
          </div>

          <CompaniesToKnow companies={companiesToKnow} />

          <div className="home-right-rail grid gap-7">
            <MarketSnapshot
              stats={stats}
              currentThemeCount={currentThemeCount}
            />
            <CategoryPulse items={categoryPulse} />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStatsRow({
  stats,
  updatedLabel,
}: {
  stats: CompanyStats;
  updatedLabel?: string;
}) {
  const items = [
    {
      icon: "map",
      label: "Companies tracked",
      value: stats.totalCompanies,
      href: "/companies",
    },
    {
      icon: "grid",
      label: "Categories",
      value: stats.totalCategories,
      href: "/categories",
    },
    {
      icon: "pin",
      label: "Profiles synced",
      value: updatedLabel ?? "Undated",
      href: "/companies",
    },
  ] as const;

  return (
    <dl className="mt-5 grid grid-cols-3 divide-x divide-[#E7E1D8] border-y border-[#E7E1D8] lg:max-w-[360px]">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="group min-w-0 px-3 py-3 transition hover:bg-[rgb(17_17_17_/_0.025)]"
        >
          <dt className="text-label flex min-h-[22px] items-center gap-1.5 text-[9.5px] leading-[1.15] text-[#746D64] group-hover:text-[#9A3D2B]">
            <PixelSiteIcon name={item.icon} size="xs" />
            <span>{item.label}</span>
          </dt>
          <dd
            className={
              item.label === "Profiles synced"
                ? "mt-2 truncate text-[13px] font-semibold leading-none tracking-[0] text-[#111111]"
                : "mt-2 font-heading text-[23px] font-medium leading-none tracking-[0] text-[#111111]"
            }
          >
            {item.value}
          </dd>
        </Link>
      ))}
    </dl>
  );
}
