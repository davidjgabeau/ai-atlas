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
import type { Company } from "@/types/market";

export function RecentlyAdded({ companies }: { companies: Company[] }) {
  return (
    <section className="border-b border-[#E7E1D8] bg-section">
      <div className="editorial-container py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="editorial-label">New entries</p>
            <h2 className="mt-3 editorial-section-title">Recently Added</h2>
            <p className="mt-2 text-sm leading-[1.5] text-[#5F5A52]">
              New entries and meaningful updates from the early-stage NYC AI map.
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
          {companies.slice(0, 6).map((company, index) => {
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
                  <h3 className="truncate font-sans text-[18px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#181818]">
                    {company.name}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-[15px] font-semibold leading-[1.35] text-[#181818]">
                    {getCompanyHook(company)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[13.5px] leading-[1.45] text-[#66625C]">
                    {getCompanyInclusionReason(company)}
                  </p>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#66625C] md:justify-end md:text-right">
                  {annotation ? (
                    <>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
                        {annotation}
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  ) : null}
                  <CompanyViewCount
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
          })}
        </div>
      </div>
    </section>
  );
}

const recentAnnotationWindowMs = 14 * 24 * 60 * 60 * 1000;

function getRecentAnnotation(company: Company) {
  const createdAt = getDateTime(company.created_at);
  const updatedAt = getDateTime(company.updated_at);

  if (isRecent(createdAt)) return "New";
  if (isRecent(updatedAt) && (!createdAt || !isRecent(createdAt))) return "Updated";

  return null;
}

function isRecent(time: number) {
  const diff = Date.now() - time;

  return time > 0 && diff >= 0 && diff <= recentAnnotationWindowMs;
}

function getDateTime(value?: string) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
