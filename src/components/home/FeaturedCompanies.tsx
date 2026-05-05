import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CompanyViewCount } from "@/components/company/CompanyViewCount";
import { CategoryPixelIcon } from "@/components/market-map/category-pixel-icon";
import { CompanyLogo } from "@/components/market-map/company-logo";
import { getCompanyHook, getHomeSignalLabel } from "@/components/home/home-utils";
import type { Company } from "@/types/market";

export function FeaturedCompanies({ companies }: { companies: Company[] }) {
  const visibleCompanies = companies.slice(0, 6);
  const labels = visibleCompanies.map(getHomeSignalLabel);
  const hasVariedLabels = new Set(labels).size > 1;

  return (
    <section id="highlights" className="border-b border-[#E7E1D8] bg-section">
      <div className="editorial-container py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="editorial-label">Editorial picks</p>
            <h2 className="mt-3 editorial-section-title">Featured Companies</h2>
            <p className="mt-2 max-w-[680px] text-sm leading-[1.5] text-[#5F5A52]">
              A curated set of early-stage NYC AI companies with strong products,
              clear buyers, or category momentum.
            </p>
          </div>
          <Link
            href="/insights"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B]"
          >
            View highlights
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-6 grid border-t border-[#E7E1D8] md:grid-cols-2">
          {visibleCompanies.map((company, index) => {
            const label = labels[index];
            const showLabel = index === 0 || hasVariedLabels;

            return (
            <Link
              key={company.id}
              href={`/companies/${company.slug}`}
              className="group border-b border-[#E7E1D8] p-4 transition hover:bg-[rgb(17_17_17_/_0.025)] md:odd:border-r"
            >
              <div className="flex items-start gap-3">
                <CompanyLogo
                  company={company}
                  name={company.name}
                  category={company.category}
                  className="size-11 text-xs"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="truncate font-sans text-[18px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#181818]">
                      {company.name}
                    </h3>
                    {showLabel ? (
                      <span className="shrink-0 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-[#9A3D2B]">
                        {label}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-1 text-[15px] font-semibold leading-[1.35] text-[#181818]">
                    {getCompanyHook(company)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-[1.55] text-[#66625C]">
                    {company.short_description}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-[#66625C]">
                      <CategoryPixelIcon category={company.category} size="xs" />
                      <span className="truncate">{company.category}</span>
                      <span aria-hidden="true">·</span>
                      <CompanyViewCount
                        companyId={company.id}
                        views={company.metrics?.views ?? 0}
                      />
                    </p>
                    <ArrowRight className="size-3.5 shrink-0 text-[#9A3D2B] transition group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
