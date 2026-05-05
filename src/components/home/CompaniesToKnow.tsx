import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { CompanyViewCount } from "@/components/company/CompanyViewCount";
import { CompanyLogo } from "@/components/market-map/company-logo";
import { getCompanyHook, getHomeSignalLabel } from "@/components/home/home-utils";
import type { Company } from "@/types/market";

export function CompaniesToKnow({ companies }: { companies: Company[] }) {
  const visibleCompanies = companies.slice(0, 5);
  const labels = visibleCompanies.map(getHomeSignalLabel);
  const hasVariedLabels = new Set(labels).size > 1;

  return (
    <section
      aria-labelledby="companies-to-know"
      className="home-map-moving-section"
    >
      <div className="flex items-center justify-between gap-4 border-b border-[#DCD2C3] pb-4 lg:items-end lg:pb-7">
        <div className="flex items-center gap-3 lg:block">
          <Sparkles className="size-4 shrink-0 text-[#9A3D2B] lg:hidden" aria-hidden="true" />
          <h2
            id="companies-to-know"
            className="home-section-label text-[12px] font-semibold uppercase leading-none tracking-[0.32em] lg:font-heading lg:text-[38px] lg:font-medium lg:normal-case lg:leading-[0.95] lg:tracking-[-0.035em] lg:text-[#111111]"
          >
            <span className="lg:hidden">Where the map is moving</span>
            <span className="hidden lg:inline">Start Here</span>
          </h2>
          <p className="mt-2 hidden text-sm leading-[1.5] text-[#5F5A52] md:block">
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

      <div className="divide-y divide-[#DCD2C3]">
        {visibleCompanies.map((company, index) => {
          const label = labels[index];
          const showLabel = index === 0 || hasVariedLabels;
          const description = getCompanyDescriptionSnippet(company);

          return (
            <Link
              key={company.id}
              href={`/companies/${company.slug}`}
              className="companyRow group grid grid-cols-[72px_minmax(0,1fr)] gap-4 py-6 transition hover:bg-[rgb(17_17_17_/_0.02)] lg:grid-cols-[64px_minmax(0,1fr)] lg:gap-6 lg:py-5"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <CompanyLogo
                company={company}
                name={company.name}
                category={company.category}
                className="rowSprite companyLogoTile size-[72px] rounded-[14px] border-[#D8CFC1] bg-[#FBFAF7] p-2 text-xs ring-0 lg:size-16 lg:rounded-[10px] lg:p-1.5"
              />
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="truncate font-heading text-[28px] font-medium leading-[0.98] tracking-[-0.035em] text-[#121212] lg:text-[27px]">
                    {company.name}
                  </h3>
                  {showLabel ? (
                    <CompanyStatusPill label={label} />
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-[18px] font-semibold leading-[1.22] text-[#181818] lg:mt-1 lg:line-clamp-1 lg:text-[16px] lg:leading-[1.35]">
                  {getCompanyHook(company)}
                </p>
                {description ? (
                  <p className="mt-2 line-clamp-2 text-[15px] leading-[1.45] text-[#6D665E] lg:hidden">
                    {description}
                  </p>
                ) : null}
                <p className="mt-3 flex min-w-0 items-center gap-2 text-[14px] font-medium leading-none text-[#4F4A43] lg:mt-2 lg:text-[13.5px] lg:text-[#66625C]">
                  <span className="truncate">{company.category}</span>
                  <span aria-hidden="true">·</span>
                  <CompanyViewCount
                    companyId={company.id}
                    views={company.metrics?.views ?? 0}
                    className="text-[14px] text-[#4F4A43] lg:text-[13px] lg:text-[#66625C]"
                  />
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

function isHighSignalLabel(label: string) {
  return ["featured", "breakout watch", "infra signal"].includes(
    label.toLowerCase(),
  );
}

function CompanyStatusPill({ label }: { label: string }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-1.5 text-[10px] font-semibold uppercase leading-none tracking-[0.09em] lg:rounded-md lg:px-2 lg:py-1 lg:text-[10.5px] lg:tracking-[0.08em] ${
        isHighSignalLabel(label)
          ? "border-[#D9B7AA] text-[#9A2F20]"
          : "border-[rgb(49_71_94_/_0.25)] text-[var(--app-secondary-accent)]"
      }`}
    >
      {label}
    </span>
  );
}

function getCompanyDescriptionSnippet(company: Company) {
  return company.short_description?.trim() || company.one_line_thesis?.trim() || "";
}
