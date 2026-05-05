import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LinkedCompanyText } from "@/components/company/linked-company-text";
import { PixelSiteIcon } from "@/components/site/pixel-site-icon";
import type { CompanyStats } from "@/lib/companies/getCompanyStats";
import type { Company } from "@/types/market";

type MarketSnapshotProps = {
  stats: CompanyStats;
  currentThemeCount: number;
  analystRead: string;
  companiesById: Map<string, Company>;
  overrides?: MarketSnapshotOverrides;
};

export type MarketSnapshotOverrides = {
  totalCompanies?: number;
  totalCategories?: number;
  recentlyAddedCount?: number;
  currentThemeCount?: number;
};

export function MarketSnapshot({
  stats,
  currentThemeCount,
  analystRead,
  companiesById,
  overrides,
}: MarketSnapshotProps) {
  const statItems = [
    {
      icon: "map",
      label: "companies tracked",
      value: overrides?.totalCompanies ?? stats.totalCompanies,
    },
    {
      icon: "grid",
      label: "categories",
      value: overrides?.totalCategories ?? stats.totalCategories,
    },
    {
      icon: "pin",
      label: "recent additions",
      value: overrides?.recentlyAddedCount ?? stats.recentlyAddedCount,
    },
    {
      icon: "compass",
      label: "current themes",
      value: overrides?.currentThemeCount ?? currentThemeCount,
    },
  ] as const;

  return (
    <section aria-labelledby="market-snapshot" className="border-y border-[#E7E1D8] py-4">
      <h2
        id="market-snapshot"
        className="font-heading text-[25px] font-medium leading-[1.05] tracking-[-0.025em] text-[#181818]"
      >
        Market Snapshot
      </h2>
      <p className="mt-2 text-sm leading-[1.45] text-[#5F5A52]">
        Series A and earlier, focused on New York.
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {statItems.map((stat) => (
          <div key={stat.label} className="border-t border-[#E7E1D8] pt-3">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-[#7A746C]">
              <PixelSiteIcon name={stat.icon} size="xs" />
              {stat.label}
            </dt>
            <dd className="mt-2 font-heading text-[28px] font-medium leading-none tracking-[-0.035em] text-[#181818]">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 border-t border-[#E7E1D8] pt-4">
        <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-[#9A3D2B]">
          Analyst read
        </p>
        <p className="mt-2 text-sm leading-[1.5] text-[#5F5A52]">
          <LinkedCompanyText text={analystRead} companies={companiesById} />
        </p>
        <Link
          href="/companies?sort=recent"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B]"
        >
          View recent additions
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}
