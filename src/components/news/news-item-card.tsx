import { ExternalLink, Newspaper } from "lucide-react";

import { LinkedCompanyText } from "@/components/company/linked-company-text";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import type { Company, NewsItem } from "@/types/market";

export function NewsItemCard({
  item,
  companies,
  compact = false,
}: {
  item: NewsItem;
  companies?: Iterable<Pick<Company, "id" | "name" | "slug">> | Map<string, Pick<Company, "id" | "name" | "slug">>;
  compact?: boolean;
}) {
  return (
    <article className="companyRow group rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-4 transition hover:bg-[rgb(154_61_43_/_0.045)]">
      <div className="grid gap-3 md:grid-cols-[40px_minmax(0,1fr)_120px]">
        <span className="rowSprite grid size-10 place-items-center rounded-md border border-[#E7E1D8] bg-[#F8F6F1] text-[#9A3D2B]">
          <Newspaper className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
              {item.scope === "nyc" ? "NYC signal" : "Broad AI"}
            </span>
            <span className="text-xs font-medium text-[#7A746C]">
              {item.source_name || item.source_domain}
            </span>
          </span>
          <span
            className={
              compact
                ? "mt-1 line-clamp-2 block font-sans text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[#181818]"
                : "mt-1 line-clamp-2 block font-sans text-[18px] font-semibold leading-[1.25] tracking-[-0.01em] text-[#181818]"
            }
          >
            <a href={item.source_url} target="_blank" rel="noreferrer" className="hover:text-[#9A3D2B]">
              {item.title}
            </a>
          </span>
          {item.summary ? (
            <span className="mt-2 line-clamp-2 block text-sm leading-[1.55] text-[#66625C]">
              {companies ? (
                <LinkedCompanyText text={item.summary} companies={companies} />
              ) : (
                item.summary
              )}
            </span>
          ) : null}
        </span>
        <a
          href={item.source_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm font-medium text-[#9A3D2B] md:justify-end md:text-right"
        >
          <span className="text-[#7A746C]">{formatNewsDate(item)}</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      </div>
    </article>
  );
}

export function NewsItemRow({
  item,
  companies,
  index = 0,
}: {
  item: NewsItem;
  companies?: Iterable<Pick<Company, "id" | "name" | "slug">> | Map<string, Pick<Company, "id" | "name" | "slug">>;
  index?: number;
}) {
  return (
    <div
      className="companyRow group grid gap-3 py-4 transition hover:bg-[rgb(17_17_17_/_0.025)] md:grid-cols-[40px_minmax(0,1fr)_120px]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <span className="rowSprite grid size-10 place-items-center rounded-md border border-[#E7E1D8] bg-[#FBFAF7] text-[#9A3D2B]">
        <Newspaper className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
            {item.scope === "nyc" ? "NYC signal" : "Broad AI"}
          </span>
          <span className="text-xs font-medium text-[#7A746C]">
            {item.source_name || item.source_domain}
          </span>
        </span>
        <span className="mt-1 line-clamp-2 block font-sans text-[17px] font-semibold leading-[1.25] tracking-[-0.01em] text-[#181818]">
          <a href={item.source_url} target="_blank" rel="noreferrer" className="hover:text-[#9A3D2B]">
            {item.title}
          </a>
        </span>
        {item.summary ? (
          <span className="mt-1 line-clamp-2 block text-sm leading-[1.55] text-[#66625C]">
            {companies ? (
              <LinkedCompanyText text={item.summary} companies={companies} />
            ) : (
              item.summary
            )}
          </span>
        ) : null}
      </span>
      <a
        href={item.source_url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-sm font-medium text-[#9A3D2B] md:justify-end md:text-right"
      >
        <span className="text-[#7A746C]">{formatNewsDate(item)}</span>
        <ExternalLink className="size-3.5 shrink-0" />
      </a>
    </div>
  );
}

function formatNewsDate(item: NewsItem) {
  const value = item.published_at ?? item.discovered_at;
  if (!value) return "Recent";

  return formatRelativeUpdate(value);
}
