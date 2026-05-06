import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LinkedCompanyText } from "@/components/company/linked-company-text";
import { PixelSiteIcon } from "@/components/site/pixel-site-icon";
import type { CompanyStats } from "@/lib/companies/getCompanyStats";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import type { Company } from "@/types/market";

type MarketSnapshotProps = {
  stats: CompanyStats;
  currentThemeCount: number;
  analystRead: string;
  analystReadUpdatedAt?: string;
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
  analystReadUpdatedAt,
  companiesById,
}: MarketSnapshotProps) {
  const statItems = [
    {
      href: "/companies",
      icon: "map",
      label: "companies tracked",
      value: stats.totalCompanies,
    },
    {
      href: "/categories",
      icon: "grid",
      label: "categories",
      value: stats.totalCategories,
    },
    {
      href: "/companies?sort=recent",
      icon: "pin",
      label: "recent additions",
      value: stats.recentlyAddedCount,
    },
    {
      href: "/patterns",
      icon: "compass",
      label: "current themes",
      value: currentThemeCount,
    },
  ] as const;

  return (
    <section aria-labelledby="market-snapshot" className="marketSnapshotModule border-y border-[#E7E1D8] py-4 lg:border-t-0 lg:pt-2">
      <div className="flex items-center gap-2">
        <PixelSiteIcon name="skyline" size="sm" />
        <h2
          id="market-snapshot"
          className="text-section-title text-[26px] lg:text-[32px]"
        >
          Market Snapshot
        </h2>
      </div>
      <p className="text-body mt-2 text-sm">
        Series A and earlier, focused on New York.
      </p>

      <dl className="mt-4 grid grid-cols-2 border-y border-[#E7E1D8] lg:mt-6">
        {statItems.map((stat, index) => (
          <div
            key={stat.label}
            className={`group/snapshot-stat relative min-h-[96px] p-3 transition hover:bg-[rgb(154_61_43_/_0.035)] ${
              index % 2 === 0 ? "border-r border-[#E7E1D8]" : ""
            } ${index < 2 ? "border-b border-[#E7E1D8]" : ""}`}
          >
            <Link
              href={stat.href}
              className="absolute inset-x-[-0.35rem] inset-y-0 z-10 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3D2B]"
              aria-label={`View ${stat.label}`}
            >
              <span className="sr-only">View {stat.label}</span>
            </Link>
            <dt className="text-label relative flex items-center gap-2 pr-5 leading-[1.15] text-[#4F4A43] transition group-hover/snapshot-stat:text-[#9A3D2B]">
              <PixelSiteIcon name={stat.icon} size="xs" />
              <span>{stat.label}</span>
              <ArrowRight className="absolute right-0 size-3 text-[#9A3D2B] opacity-0 transition group-hover/snapshot-stat:translate-x-0.5 group-hover/snapshot-stat:opacity-100" />
            </dt>
            <dd className="text-stat-number relative mt-4 text-[36px]">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 border-b border-[#E7E1D8] pb-5">
        <p className="text-label text-[#9A3D2B]">
          Editor&apos;s Note
        </p>
        <p className="mt-3 line-clamp-5 text-[15px] leading-[1.5] text-[#181818]">
          <LinkedCompanyText
            text={analystRead}
            companies={companiesById}
            linkClassName="font-semibold text-[#181818] transition hover:text-[#9A3D2B]"
          />
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <Link
            href="/companies?sort=recent"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B]"
          >
            View recent additions
            <ArrowRight className="size-3.5" />
          </Link>
          {analystReadUpdatedAt ? (
            <p className="text-label ml-auto text-right text-[10.5px] text-[#8A8177]">
              Updated {formatRelativeUpdate(analystReadUpdatedAt)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
