import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { CompanyLogo } from "@/components/market-map/company-logo";
import { patterns } from "@/data/patterns";
import type { Category, Company } from "@/types/market";
import staticCompanyData from "../../../data/companies.json";

type PatternLogoCompany = {
  slug: string;
  name: string;
  category: Category;
  logo_url?: string;
  website_url?: string;
};

const staticCompaniesBySlug = new Map(
  (staticCompanyData as PatternLogoCompany[]).map((company) => [
    company.slug,
    company,
  ]),
);

export function HomePatterns({ companies }: { companies: Company[] }) {
  const featuredPatterns = patterns.slice(0, 3);
  const companiesBySlug = new Map(
    companies.map((company) => [company.slug, toPatternLogoCompany(company)]),
  );

  return (
    <section id="home-patterns" className="border-b border-[#E7E1D8] bg-section">
      <div className="editorial-container pb-10 pt-0 lg:pb-12">
        <div className="border-t border-[#DCD2C3] pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="size-4 text-[#9A3D2B]" aria-hidden="true" />
              <h2 className="text-section-title text-[26px] leading-none">
                Patterns
              </h2>
            </div>
            <Link
              href="/patterns"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B]"
            >
              View all patterns
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        <div className="mt-4 grid divide-y divide-[#E7E1D8] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {featuredPatterns.map((pattern) => {
            const mentionedCompanies = pattern.companies
              .map(
                (patternCompany) =>
                  companiesBySlug.get(patternCompany.company_slug) ??
                  staticCompaniesBySlug.get(patternCompany.company_slug),
              )
              .filter((company): company is PatternLogoCompany =>
                Boolean(company),
              );

            return (
              <Link
                key={pattern.slug}
                href={`/patterns/${pattern.slug}`}
                className="group py-4 transition hover:bg-[rgb(17_17_17_/_0.025)] lg:px-10 lg:py-0 first:lg:pl-0 last:lg:pr-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-label text-[11px] text-[#9A3D2B]">
                      Pattern
                    </span>
                    <span className="text-meta text-xs">
                      {pattern.companies.length} companies
                    </span>
                  </div>
                  <PatternLogoStack companies={mentionedCompanies} />
                </div>
                <h3 className="text-company-name mt-2 text-[20px] leading-[1.18] transition group-hover:text-[#9A3D2B]">
                  {pattern.title}
                </h3>
                <p className="text-body mt-2 line-clamp-3 text-sm lg:line-clamp-2">
                  {pattern.framing}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PatternLogoStack({ companies }: { companies: PatternLogoCompany[] }) {
  if (companies.length === 0) return null;

  const visibleCompanies = companies.slice(0, 4);
  const companyNames = visibleCompanies.map((company) => company.name).join(", ");

  return (
    <div className="shrink-0">
      <span className="sr-only">Companies mentioned: {companyNames}</span>
      <div aria-hidden="true" className="flex items-center -space-x-2">
        {visibleCompanies.map((company) => (
          <CompanyLogo
            key={company.slug}
            name={company.name}
            category={company.category}
            logoUrl={company.logo_url}
            websiteUrl={company.website_url}
            className="size-7 rounded-[7px] border-[#DDD4C8] bg-[#FBFAF7] ring-2 ring-[#F8F6F1] transition group-hover:ring-[#EFE7DC]"
          />
        ))}
      </div>
    </div>
  );
}

function toPatternLogoCompany(company: Company): PatternLogoCompany {
  return {
    slug: company.slug,
    name: company.name,
    category: company.category,
    logo_url: company.logo_url,
    website_url: company.website_url,
  };
}
