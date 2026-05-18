import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CompanyViewCount } from "@/components/company/CompanyViewCount";
import { CategoryPixelIcon } from "@/components/market-map/category-pixel-icon";
import { CompanyLogo } from "@/components/market-map/company-logo";
import {
  getCompanyInclusionReason,
  formatMonthYear,
  getCompanyHook,
} from "@/components/home/home-utils";
import { isRecentCompanyAddition } from "@/lib/companies/recentAdditions";
import type { Company } from "@/types/market";

export function RecentlyAdded({ companies }: { companies: Company[] }) {
  return (
    <section id="recently-added" className="border-b border-[#E7E1D8] bg-section">
      <div className="editorial-container py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="editorial-label">New entries</p>
            <h2 className="mt-3 editorial-section-title">Recently Added</h2>
            <p className="text-body mt-2 text-sm">
              New entries from the early-stage NYC AI map.
            </p>
          </div>
          <Link
            href="/companies?sort=recent"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B]"
          >
            View recent additions
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-6 divide-y divide-[#E7E1D8] border-y border-[#E7E1D8]">
          {companies.length === 0 ? (
            <div className="py-5">
              <p className="text-company-hook text-sm">
                No recent additions yet.
              </p>
              <p className="text-body mt-2 text-sm">
                New company notes will appear here once the map has enough recent data.
              </p>
            </div>
          ) : (
            companies.slice(0, 6).map((company, index) => {
              const annotation = getRecentAnnotation(company);

              return (
                <Link
                  key={company.id}
                  href={`/companies/${company.slug}`}
                  className="companyRow group grid gap-3 py-4 transition hover:bg-[rgb(17_17_17_/_0.025)] md:grid-cols-[44px_minmax(0,1fr)_220px] md:items-start"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <CompanyLogo
                    company={company}
                    name={company.name}
                    category={company.category}
                    className="rowSprite size-10 text-xs"
                  />
                  <div className="min-w-0">
                    <h3 className="text-company-name truncate text-[18px] leading-[1.2]">
                      {company.name}
                    </h3>
                    <p className="text-company-hook mt-1 line-clamp-1 text-[15px]">
                      {getCompanyHook(company)}
                    </p>
                    <p className="text-body mt-1 line-clamp-2 text-[13.5px] leading-[1.45]">
                      {getCompanyInclusionReason(company)}
                    </p>
                  </div>
                  <div className="text-meta flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs md:justify-end md:text-right">
                    {annotation ? (
                      <>
                        <span className="text-label text-[11px] text-[#9A3D2B]">
                          {annotation}
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    ) : null}
                    <CompanyViewCount
                      companyId={company.id}
                      views={company.metrics?.views ?? 0}
                      className="md:justify-end"
                    />
                    <span aria-hidden="true">·</span>
                    <CategoryPixelIcon category={company.category} size="xs" />
                    <span className="truncate">{company.category}</span>
                    {company.stage ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="whitespace-nowrap">{company.stage}</span>
                      </>
                    ) : null}
                    <span aria-hidden="true">·</span>
                    <span>
                      {formatMonthYear(company.created_at || company.updated_at)}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function getRecentAnnotation(company: Company) {
  if (isRecentCompanyAddition(company)) return "New";

  return null;
}
