import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LinkedCompanyText } from "@/components/company/linked-company-text";
import type { Company, MarketInsight } from "@/types/market";

export function CurrentRead({
  insights,
  companiesById,
}: {
  insights: MarketInsight[];
  companiesById: Map<string, Company>;
}) {
  const currentInsights = insights.slice(0, 3);

  return (
    <section id="current-read" className="border-b border-[#E7E1D8] bg-section">
      <div className="editorial-container grid gap-8 py-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="editorial-label">Market memo</p>
          <h2 className="mt-3 editorial-section-title">Current Read</h2>
          <p className="text-body mt-2 text-sm">
            Three notes from the full early-stage NYC AI map and latest additions.
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
              currentInsights.map((insight, index) => (
                <div
                  key={insight.id}
                  className="grid gap-3 py-4 md:grid-cols-[48px_minmax(0,1fr)]"
                >
                  <span className="text-label text-[11px] text-[#9A3D2B]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-company-name text-[17px] leading-[1.25]">
                      <LinkedCompanyText
                        text={getCurrentReadDisplayTitle(insight)}
                        companies={companiesById}
                      />
                    </h3>
                    <p className="text-body mt-2 text-sm">
                      <LinkedCompanyText
                        text={insight.body}
                        companies={companiesById}
                      />
                    </p>
                  </div>
                </div>
              ))
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

function getCurrentReadDisplayTitle(insight: MarketInsight) {
  const normalizedTitle = insight.title.toLowerCase().replace(/\u2019/g, "'");
  const override = currentReadHeadlineOverrides.find(({ match }) =>
    normalizedTitle.includes(match),
  );

  return override?.title ?? insight.title;
}
