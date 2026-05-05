import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import { CategoryPulse, type CategoryPulseItem } from "@/components/home/CategoryPulse";
import { CompaniesToKnow } from "@/components/home/CompaniesToKnow";
import { MarketSnapshot } from "@/components/home/MarketSnapshot";
import type { MarketSnapshotOverrides } from "@/components/home/MarketSnapshot";
import { AtlasAvatarMark } from "@/components/site/atlas-avatar-mark";
import { Button } from "@/components/ui/button";
import {
  formatMobileSubheadline,
  formatTrackedLine,
} from "@/lib/companies/formatCompanyCount";
import type { CompanyStats } from "@/lib/companies/getCompanyStats";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import type { Company } from "@/types/market";

type HomeFrontPageProps = {
  companiesToKnow: Company[];
  categoryPulse: CategoryPulseItem[];
  stats: CompanyStats;
  currentThemeCount: number;
  analystRead: string;
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
  companiesById,
  snapshotOverrides,
  latestUpdatedAt,
}: HomeFrontPageProps) {
  const updateTime = latestUpdatedAt ?? stats.lastUpdatedAt;

  return (
    <section className="frontPage">
      <div className="editorial-container">
        <div className="frontPageGrid">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AtlasAvatarMark size="sm" />
              <p className="editorial-label">Market Map</p>
            </div>

            <h1 className="mt-4 hidden max-w-[520px] font-heading text-[clamp(38px,4.7vw,58px)] font-medium leading-[0.96] tracking-[-0.04em] text-[#181818] md:block">
              Early-Stage NYC AI Companies to Know
            </h1>
            <h1 className="mt-4 w-[calc(100vw-40px)] max-w-[460px] text-balance font-heading text-[clamp(42px,11vw,54px)] font-medium leading-[0.98] tracking-[-0.04em] text-[#181818] max-[420px]:text-[42px] md:hidden">
              Early-Stage NYC AI Companies to Know
            </h1>
            <p className="mt-5 hidden text-[17px] leading-[1.5] text-[#5F5A52] md:block">
              {formatMobileSubheadline(stats)}
            </p>
            <p className="mt-5 text-[16px] leading-[1.5] text-[#5F5A52] md:hidden">
              {formatMobileSubheadline(stats)}
            </p>
            <p className="mt-5 text-[15px] font-medium leading-[1.4] text-[#7A746C] md:text-sm md:leading-[1.5]">
              {formatTrackedLine()}
            </p>
            <p className="mt-1 text-[15px] font-medium leading-[1.4] text-[#7A746C] md:text-sm md:leading-[1.5]">
              Pre-seed through Series A.
            </p>
            {updateTime ? (
              <p className="mt-1 text-[15px] font-medium leading-[1.4] text-[#7A746C] md:text-sm md:leading-[1.5]">
                Latest update: {formatRelativeUpdate(updateTime)}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="h-12 px-[18px] app-primary-button md:h-9 md:px-3">
                <Link href="/companies">
                  Explore companies
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 border-[#E7E1D8] bg-transparent px-[18px] md:h-9 md:px-3"
              >
                <Link href="#current-read">Read the memo</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 border-[#E7E1D8] bg-transparent px-[18px] text-[#5F5A52] md:h-9 md:px-3"
              >
                <a
                  href="https://x.com/AiAtlasNYC"
                  target="_blank"
                  rel="noreferrer"
                >
                  Follow on X
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
          </div>

          <CompaniesToKnow companies={companiesToKnow} />

          <div className="grid gap-7">
            <MarketSnapshot
              stats={stats}
              currentThemeCount={currentThemeCount}
              analystRead={analystRead}
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
