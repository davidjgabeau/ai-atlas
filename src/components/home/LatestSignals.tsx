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
  if (items.length === 0) {
    return null;
  }

  return (
    <section id="latest-signals" className="border-b border-[#E7E1D8] bg-section">
      <div className="editorial-container pb-10 pt-0 lg:pb-12">
        <div className="border-t border-[#DCD2C3] pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="size-4 text-[#9A3D2B]" aria-hidden="true" />
              <h2 className="font-heading text-[25px] font-medium leading-none tracking-[-0.025em] text-[#181818]">
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

        <div className="latestSignalsGrid mt-4 grid divide-y divide-[#E7E1D8] lg:grid-cols-3 lg:divide-x lg:divide-y-0 lg:border-0">
          {items.slice(0, 3).map((item, index) => {
            const company = item.companyId
              ? companiesById.get(item.companyId)
              : undefined;

            return (
              <article
                key={item.id}
                className="companyRow group py-4 transition hover:bg-[rgb(17_17_17_/_0.025)] lg:px-10 lg:py-0 first:lg:pl-0 last:lg:pr-0"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.label ? (
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
                        {normalizeSignalLabel(item.label, company)}
                      </span>
                    ) : null}
                    <span className="text-xs font-medium text-[#7A746C]">
                      {formatSignalDate(item.occurredAt)}
                    </span>
                  </div>
                  <h3 className="mt-2 font-heading text-[18px] font-medium leading-[1.18] tracking-[-0.02em] text-[#181818]">
                    <Link
                      href={company ? `/companies/${company.slug}` : "/companies"}
                      className="hover:text-[#9A3D2B]"
                    >
                      {item.title}
                    </Link>
                  </h3>
                  {item.body ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-[1.5] text-[#66625C]">
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
