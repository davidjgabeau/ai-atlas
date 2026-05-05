import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CompanyViewCount } from "@/components/company/CompanyViewCount";
import { CompanyLogo } from "@/components/market-map/company-logo";
import { getCompanyHook, getHomeSignalLabel } from "@/components/home/home-utils";
import type { Company } from "@/types/market";

export function CompaniesToKnow({ companies }: { companies: Company[] }) {
  const visibleCompanies = companies.slice(0, 5);
  const labels = visibleCompanies.map(getHomeSignalLabel);
  const hasVariedLabels = new Set(labels).size > 1;

  return (
    <section aria-labelledby="companies-to-know">
      <div className="flex items-end justify-between gap-4 border-b border-[#E7E1D8] pb-4">
        <div>
          <h2
            id="companies-to-know"
            className="font-heading text-[30px] font-medium leading-[1.02] tracking-[-0.03em] text-[#181818]"
          >
            Start Here
          </h2>
          <p className="mt-2 text-sm leading-[1.5] text-[#5F5A52]">
            A few early-stage NYC AI companies that explain where the map is moving.
          </p>
        </div>
        <Link
          href="/companies"
          className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-[#9A3D2B] md:inline-flex"
        >
          View all
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-[#E7E1D8]">
        {visibleCompanies.map((company, index) => {
          const label = labels[index];
          const showLabel = index === 0 || hasVariedLabels;

          return (
            <Link
              key={company.id}
              href={`/companies/${company.slug}`}
              className="companyRow group grid grid-cols-[44px_minmax(0,1fr)] gap-3 py-4 transition hover:bg-[rgb(17_17_17_/_0.025)]"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <CompanyLogo
                company={company}
                name={company.name}
                category={company.category}
                className="rowSprite size-11 text-xs"
              />
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="truncate font-heading text-[22px] font-medium leading-[1.05] tracking-[-0.025em] text-[#181818] md:text-[19px]">
                    {company.name}
                  </h3>
                  {showLabel ? (
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
                      {label}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-[15px] font-semibold leading-[1.35] text-[#181818] md:line-clamp-1">
                  {getCompanyHook(company)}
                </p>
                <p className="mt-2 flex min-w-0 items-center gap-2 text-[13px] font-medium leading-none text-[#66625C]">
                  <span className="truncate">{company.category}</span>
                  <span aria-hidden="true">·</span>
                  <CompanyViewCount views={company.metrics?.views ?? 0} />
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        href="/companies"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B] md:hidden"
      >
        View all companies
        <ArrowRight className="size-3.5" />
      </Link>
    </section>
  );
}
