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
          <p className="mt-2 text-sm leading-[1.5] text-[#5F5A52]">
            Three notes from the full early-stage NYC AI map and latest additions.
          </p>
          <Link
            href="/patterns"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B] transition hover:text-[#181818]"
          >
            View all patterns
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
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-sans text-[17px] font-semibold tracking-[-0.01em] text-[#181818]">
                      <LinkedCompanyText
                        text={insight.title}
                        companies={companiesById}
                      />
                    </h3>
                    <p className="mt-2 text-sm leading-[1.6] text-[#66625C]">
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
                <p className="text-sm font-semibold text-[#181818]">
                  Fresh reads will appear after companies are added.
                </p>
                <p className="mt-2 text-sm leading-[1.6] text-[#66625C]">
                  Publish company notes to build the next market memo.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
