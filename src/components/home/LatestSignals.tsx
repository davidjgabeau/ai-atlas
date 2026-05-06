import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { LinkedCompanyText } from "@/components/company/linked-company-text";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import { normalizeSignalLabel } from "@/lib/signals/companySignal";
import type { EditorialItem } from "@/types/agent";
import type { Company } from "@/types/market";

export function LatestSignals({
  items,
  companiesById,
}: {
  items: EditorialItem[];
  companiesById: Map<string, Company>;
}) {
  return (
    <section id="latest-signals" className="border-b border-[#E7E1D8] bg-section">
      <div className="editorial-container pb-10 pt-0 lg:pb-12">
        <div className="border-t border-[#DCD2C3] pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="size-4 text-[#9A3D2B]" aria-hidden="true" />
              <h2 className="text-section-title text-[26px] leading-none">
                Latest Signals
              </h2>
            </div>
          <Link
            href="/companies?sort=recent"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B]"
          >
            View all signals
            <ArrowRight className="size-3.5" />
          </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-5 border-y border-[#E7E1D8] py-5">
            <p className="text-company-hook text-sm">No recent signals yet.</p>
            <p className="text-body mt-2 text-sm">
              Recent company and market notes will appear here when there is enough signal.
            </p>
          </div>
        ) : (
          <div className="latestSignalsGrid mt-5 grid divide-y divide-[#E7E1D8] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5 xl:border-y xl:border-[#E7E1D8]">
            {items.slice(0, 5).map((item, index) => {
              const company = item.companyId
                ? companiesById.get(item.companyId)
                : undefined;

              return (
                <article
                  key={item.id}
                  className="companyRow group min-h-[148px] px-0 py-4 transition hover:bg-[rgb(17_17_17_/_0.025)] md:px-5 xl:px-6"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.label ? (
                        <span className="text-label text-[11px] text-[#9A3D2B]">
                          {normalizeSignalLabel(item.label, company)}
                        </span>
                      ) : null}
                      <span className="text-meta text-xs">
                        {formatSignalDate(item.occurredAt)}
                      </span>
                    </div>
                    <h3 className="text-company-name mt-2 text-[18px] leading-[1.22]">
                      <Link
                        href={company ? `/companies/${company.slug}` : "/companies"}
                        className="hover:text-[#9A3D2B]"
                      >
                        {item.title}
                      </Link>
                    </h3>
                    {item.body ? (
                      <p className="text-body mt-3 line-clamp-3 text-sm">
                        <LinkedCompanyText
                          text={item.body}
                          companies={companiesById}
                        />
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function formatSignalDate(value?: string) {
  if (!value) return "Recent";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";

  return formatRelativeUpdate(date);
}
