import Link from "next/link";
import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";

import { CategoryPulse, type CategoryPulseItem } from "@/components/home/CategoryPulse";
import { CompaniesToKnow } from "@/components/home/CompaniesToKnow";
import { HeroMetadataLine } from "@/components/home/HeroMetadataLine";
import { HeroSubheadline } from "@/components/home/HeroSubheadline";
import { MarketSnapshot } from "@/components/home/MarketSnapshot";
import type { MarketSnapshotOverrides } from "@/components/home/MarketSnapshot";
import { Button } from "@/components/ui/button";
import type { CompanyStats } from "@/lib/companies/getCompanyStats";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import type { Company } from "@/types/market";

type HomeFrontPageProps = {
  companiesToKnow: Company[];
  categoryPulse: CategoryPulseItem[];
  stats: CompanyStats;
  currentThemeCount: number;
  analystRead: string;
  analystReadUpdatedAt?: string;
  companiesById: Map<string, Company>;
  snapshotOverrides?: MarketSnapshotOverrides;
  latestUpdatedAt?: string;
};

export function HomeFrontPage({
  companiesToKnow,
  categoryPulse,
  stats,
  currentThemeCount,
  analystRead,
  analystReadUpdatedAt,
  companiesById,
  snapshotOverrides,
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

            <h1 className="mt-8 hidden max-w-[390px] font-heading text-[clamp(60px,5.2vw,76px)] font-medium leading-[0.93] tracking-[-0.045em] text-[#111111] lg:block">
              <span className="block">Early-Stage</span>
              <span className="block">NYC AI</span>
              <span className="block">Companies</span>
              <span className="block">to Know</span>
            </h1>
            <h1 className="w-[calc(100vw-40px)] max-w-[460px] font-heading text-[clamp(38px,10.9vw,54px)] font-medium leading-[0.96] tracking-[-0.045em] text-[#121212] lg:hidden">
              <span className="block whitespace-nowrap">Early-Stage NYC AI</span>
              <span className="block whitespace-nowrap">Companies to Know</span>
            </h1>
            <HeroSubheadline count={stats.totalCompanies} />
            <HeroMetadataLine updatedLabel={updatedLabel} />

            <div className="mt-6 flex flex-col items-stretch gap-5 lg:mt-8 lg:max-w-[300px] lg:gap-3">
              <Button asChild className="h-[58px] w-full gap-3 rounded-[12px] px-[18px] text-[16px] app-primary-button lg:h-[50px] lg:rounded-lg lg:text-[15px]">
                <Link href="/companies">
                  Explore companies
                  <ArrowRight className="size-5 lg:size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="hidden h-[46px] w-full rounded-lg border-[#D8CFC1] bg-transparent px-[18px] text-[15px] font-semibold text-[#181818] shadow-none hover:bg-[rgb(17_17_17_/_0.025)] lg:inline-flex"
              >
                <Link href="#current-read">Read the memo</Link>
              </Button>
              <Link
                href="https://x.com/AiAtlasNYC"
                target="_blank"
                rel="noreferrer"
                className="mt-5 hidden items-center gap-1.5 text-sm font-medium text-[#5F5A52] transition hover:text-[#181818] lg:inline-flex"
              >
                Follow on X
                <ExternalLink className="size-3.5 text-[#5F5A52]" />
              </Link>
              <div className="hero-secondary-actions lg:hidden">
                <Link
                  href="#current-read"
                  className="group inline-flex items-center gap-1.5 transition hover:text-[#181818]"
                >
                  Read the memo
                  <ArrowRight className="size-3.5 text-[var(--app-secondary-accent)] transition group-hover:translate-x-0.5" />
                </Link>
                <span aria-hidden="true" className="text-[#CFC7BC]">
                  /
                </span>
                <Link
                  href="https://x.com/AiAtlasNYC"
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1.5 transition hover:text-[#181818]"
                >
                  Follow on X
                  <ExternalLink className="size-3.5 text-[var(--app-secondary-accent)] transition group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>

          <CompaniesToKnow companies={companiesToKnow} />

          <div className="home-right-rail grid gap-7">
            <MarketSnapshot
              stats={stats}
              currentThemeCount={currentThemeCount}
              analystRead={analystRead}
              analystReadUpdatedAt={analystReadUpdatedAt}
              companiesById={companiesById}
              overrides={snapshotOverrides}
            />
            <CategoryPulse items={categoryPulse} />
          </div>
        </div>
      </div>
    </section>
  );
}
