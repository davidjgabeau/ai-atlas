import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LinkedCompanyText } from "@/components/company/linked-company-text";
import { CompanyLogo } from "@/components/market-map/company-logo";
import type { Company, MarketInsight } from "@/types/market";

export function CurrentRead({
  insights,
  companiesById,
}: {
  insights: MarketInsight[];
  companiesById: Map<string, Company>;
}) {
  const currentInsights = insights.slice(0, 3);
  if (currentInsights.length === 0) return null;

  return (
    <section id="current-read" className="border-b border-[#E7E1D8] bg-section">
      <div className="editorial-container grid gap-8 py-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="editorial-label">Market memo</p>
          <h2 className="mt-3 editorial-section-title">Market Read</h2>
          <p className="text-body mt-2 text-sm">
            Editorial notes on the buyers and workflows represented in the map.
          </p>
          <Link
            href="/patterns"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B] transition hover:text-[#181818]"
          >
            View pattern library
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <div className="divide-y divide-[#E7E1D8] border-y border-[#E7E1D8]">
            {currentInsights.length > 0 ? (
              currentInsights.map((insight, index) => {
                const displayTitle = getCurrentReadDisplayTitle(insight);
                const mentionedCompanies = getCurrentReadCompanies(
                  insight,
                  companiesById,
                  displayTitle,
                );

                return (
                  <div
                    key={insight.id}
                    className="grid gap-3 py-4 md:grid-cols-[48px_minmax(0,1fr)]"
                  >
                    <span className="text-label text-[11px] text-[#9A3D2B]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-company-name text-[17px] leading-[1.25]">
                          <LinkedCompanyText
                            text={displayTitle}
                            companies={companiesById}
                          />
                        </h3>
                        <CurrentReadLogoStack companies={mentionedCompanies} />
                      </div>
                      <p className="text-body mt-2 text-sm">
                        <LinkedCompanyText
                          text={insight.body}
                          companies={companiesById}
                        />
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-5">
                <p className="text-company-hook text-sm">
                  No market memo yet.
                </p>
                <p className="text-body mt-2 text-sm">
                  Add recent company notes to build the next read.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const currentReadHeadlineOverrides = [
  {
    match: "vertical ai targets operators who skipped saas",
    title: "Operators outside classic SaaS are in play",
  },
  {
    match: "finance teams are the map's most contested buyer",
    title: "Finance workflows keep pulling new wedges",
  },
  {
    match: "llm tooling splits at the build-vs-deploy seam",
    title: "Production AI is splitting into sharper jobs",
  },
  {
    match: "real-time voice",
    title: "Voice-heavy workflows are moving first",
  },
  {
    match: "agentic loops",
    title: "Review work is moving into repeat loops",
  },
  {
    match: "consumer companion apps",
    title: "Personal data graphs are the consumer wedge",
  },
] as const;

const ambiguousCurrentReadLogoNames = new Set([
  "aspect",
  "granted",
  "icon",
  "series",
  "tabs",
]);

function getCurrentReadDisplayTitle(insight: MarketInsight) {
  const normalizedTitle = insight.title.toLowerCase().replace(/\u2019/g, "'");
  const override = currentReadHeadlineOverrides.find(({ match }) =>
    normalizedTitle.includes(match),
  );

  return override?.title ?? insight.title;
}

function CurrentReadLogoStack({ companies }: { companies: Company[] }) {
  const visibleCompanies = companies.slice(0, 4);
  if (visibleCompanies.length === 0) return null;

  return (
    <div className="shrink-0">
      <span className="sr-only">
        Companies mentioned: {visibleCompanies.map((company) => company.name).join(", ")}
      </span>
      <div aria-hidden="true" className="flex items-center -space-x-2">
        {visibleCompanies.map((company) => (
          <CompanyLogo
            key={company.id}
            company={company}
            name={company.name}
            category={company.category}
            className="size-7 rounded-[7px] border-[#DDD4C8] bg-[#FBFAF7] opacity-85 ring-2 ring-[#F8F6F1] transition hover:opacity-100 hover:ring-[#EFE7DC] sm:size-8"
          />
        ))}
      </div>
    </div>
  );
}

function getCurrentReadCompanies(
  insight: MarketInsight,
  companiesById: Map<string, Company>,
  displayTitle: string,
) {
  const selectedCompanies: Company[] = [];
  const selectedIds = new Set<string>();

  for (const companyId of insight.supportingCompanyIds) {
    const company = companiesById.get(companyId);
    if (!company || selectedIds.has(company.id)) continue;
    selectedCompanies.push(company);
    selectedIds.add(company.id);
  }

  const searchableText = `${displayTitle} ${insight.title} ${insight.body}`.toLowerCase();
  const mentionedCompanies = Array.from(companiesById.values())
    .filter((company) => !selectedIds.has(company.id))
    .filter((company) => isCompanyMentioned(searchableText, company.name))
    .sort((a, b) => b.name.length - a.name.length);

  for (const company of mentionedCompanies) {
    selectedCompanies.push(company);
    selectedIds.add(company.id);
  }

  return selectedCompanies.slice(0, 4);
}

function isCompanyMentioned(text: string, name: string) {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) return false;
  if (ambiguousCurrentReadLogoNames.has(normalizedName)) return false;

  const index = text.indexOf(normalizedName);
  if (index === -1) return false;

  const before = index > 0 ? text[index - 1] : "";
  const after = text[index + normalizedName.length] ?? "";

  return isTextBoundary(before) && isTextBoundary(after);
}

function isTextBoundary(value: string) {
  return !value || !/[a-z0-9]/i.test(value);
}
