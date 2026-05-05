import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  ExternalLink,
  Heart,
  MessageCircle,
  Repeat2,
} from "lucide-react";

import { CategoryBadge } from "@/components/market-map/category-badge";
import { LinkedCompanyText } from "@/components/company/linked-company-text";
import { CompanyLogo } from "@/components/market-map/company-logo";
import type { CompanySocialPostWithCompany } from "@/lib/supabase/social-feed";
import type { Company } from "@/types/market";

export function CompanySocialPostCard({
  post,
  companies,
  compact = false,
}: {
  post: CompanySocialPostWithCompany;
  companies?: Iterable<Pick<Company, "id" | "name" | "slug">> | Map<string, Pick<Company, "id" | "name" | "slug">>;
  compact?: boolean;
}) {
  const company = post.company;

  return (
    <article className="rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-4 transition hover:bg-[rgb(154_61_43_/_0.045)]">
      <div className="flex items-start gap-3">
        {company ? (
          <CompanyLogo
            company={company}
            name={company.name}
            category={company.category}
            className={compact ? "size-9 text-xs" : "size-11 text-xs"}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {company ? (
              <Link
                href={`/companies/${company.slug}`}
                className="font-semibold text-[#181818] hover:text-[#9A3D2B]"
              >
                {company.name}
              </Link>
            ) : (
              <p className="font-semibold text-[#181818]">
                @{post.author_handle}
              </p>
            )}
            <span className="text-sm text-[#7A746C]">
              @{post.author_handle}
            </span>
            <span className="text-sm text-[#9B948A]">·</span>
            <time className="text-sm text-[#7A746C]" dateTime={post.posted_at}>
              {formatPostTimestamp(post.posted_at)}
            </time>
          </div>

          {company && !compact ? (
            <div className="mt-2">
              <CategoryBadge category={company.category} />
            </div>
          ) : null}

          <p className="mt-3 whitespace-pre-wrap text-sm leading-[1.65] text-[#35312C]">
            {companies ? (
              <LinkedCompanyText
                text={post.post_text}
                companies={companies}
                excludeCompanyId={company?.id}
              />
            ) : (
              post.post_text
            )}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs text-[#7A746C]">
              <Metric icon={<MessageCircle className="size-3.5" />} value={post.metrics.reply_count} />
              <Metric icon={<Repeat2 className="size-3.5" />} value={post.metrics.retweet_count} />
              <Metric icon={<Heart className="size-3.5" />} value={post.metrics.like_count} />
            </div>
            <a
              href={post.post_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B]"
            >
              Open on X
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
        {company && compact ? (
          <Link
            href={`/companies/${company.slug}`}
            aria-label={`Open ${company.name}`}
            className="shrink-0 text-[#9A3D2B]"
          >
            <ArrowUpRight className="size-4" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function Metric({
  icon,
  value,
}: {
  icon: ReactNode;
  value?: number;
}) {
  if (!value) return null;

  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      {Intl.NumberFormat("en", { notation: "compact" }).format(value)}
    </span>
  );
}

function formatPostTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
