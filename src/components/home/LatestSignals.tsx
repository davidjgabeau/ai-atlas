import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LinkedCompanyText } from "@/components/company/linked-company-text";
import { CompanyLogo } from "@/components/market-map/company-logo";
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
      <div className="editorial-container py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="editorial-label">Latest signals</p>
            <h2 className="mt-3 editorial-section-title">Latest Signals</h2>
            <p className="mt-2 max-w-[680px] text-sm leading-[1.5] text-[#5F5A52]">
              Fresh additions and updates from early-stage NYC AI.
            </p>
          </div>
          <Link
            href="/companies?sort=recent"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B]"
          >
            View all signals
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-6 divide-y divide-[#E7E1D8] border-y border-[#E7E1D8]">
          {items.slice(0, 5).map((item, index) => {
            const company = item.companyId
              ? companiesById.get(item.companyId)
              : undefined;

            return (
              <article
                key={item.id}
                className={`companyRow group gap-3 py-4 transition hover:bg-[rgb(17_17_17_/_0.025)] md:grid-cols-[44px_minmax(0,1fr)_150px] ${
                  index >= 3 ? "hidden md:grid" : "grid"
                }`}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {company ? (
                  <CompanyLogo
                    company={company}
                    name={company.name}
                    category={company.category}
                    className="rowSprite size-10 text-xs"
                  />
                ) : (
                  <div className="size-10 rounded-md border border-[#E7E1D8] bg-[#FBFAF7]" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.label ? (
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
                        {normalizeSignalLabel(item.label, company)}
                      </span>
                    ) : null}
                    {item.sourceName ? (
                      <span className="text-xs font-medium text-[#7A746C]">
                        {item.sourceName}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1 font-sans text-[18px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#181818]">
                    <Link
                      href={company ? `/companies/${company.slug}` : "/companies"}
                      className="hover:text-[#9A3D2B]"
                    >
                      {item.title}
                    </Link>
                  </h3>
                  {item.body ? (
                    <p className="mt-1 line-clamp-2 text-sm leading-[1.55] text-[#66625C]">
                      <LinkedCompanyText
                        text={item.body}
                        companies={companiesById}
                      />
                    </p>
                  ) : null}
                </div>
                <p className="text-sm text-[#5F5A52] md:text-right">
                  {formatSignalDate(item.occurredAt)}
                </p>
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

  return `Updated ${formatRelativeUpdate(date)}`;
}
