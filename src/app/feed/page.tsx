import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, Newspaper } from "lucide-react";

import { LinkedCompanyText } from "@/components/company/linked-company-text";
import { CompanyLogo } from "@/components/market-map/company-logo";
import { JsonLd } from "@/components/seo/JsonLd";
import { PixelSiteIcon } from "@/components/site/pixel-site-icon";
import { PublicShell } from "@/components/site/public-shell";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import { getNewsItems } from "@/lib/news/news-store";
import {
  absoluteUrl,
  createShareMetadata,
  getShareImageUrl,
} from "@/lib/seo/shareMetadata";
import {
  collectionPageSchema,
  feedCollectionItems,
} from "@/lib/seo/schema";
import {
  getCompanySocialFeed,
  type CompanySocialPostWithCompany,
} from "@/lib/supabase/social-feed";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import type { Company, NewsItem } from "@/types/market";

export const dynamic = "force-dynamic";

const NEWS_PREVIEW_LIMIT = 5;
const POSTS_PREVIEW_LIMIT = 5;

export const metadata: Metadata = createShareMetadata({
  title: "Early-Stage NYC AI News and Company Posts",
  description:
    "Early-stage NYC AI news links, broader context, and official posts from mapped companies.",
  path: "/newsfeed",
  image: getShareImageUrl({ page: "feed" }),
});

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const [newsItems, posts, companies] = await Promise.all([
    getNewsItems({ limit: 60 }),
    getCompanySocialFeed({ limit: 60 }),
    getPublishedCompanies(),
  ]);
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const latestUpdatedAt = getLatestFeedUpdatedAt(newsItems, posts);
  const showAllNews = params?.view === "news" || params?.view === "all";
  const showAllPosts = params?.view === "posts" || params?.view === "all";
  const visibleNewsItems = showAllNews
    ? newsItems
    : newsItems.slice(0, NEWS_PREVIEW_LIMIT);
  const visiblePosts = showAllPosts
    ? posts
    : posts.slice(0, POSTS_PREVIEW_LIMIT);

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: "Early-Stage NYC AI News and Company Posts",
          description:
            "Early-stage NYC AI news links, broader context, and official posts from mapped companies.",
          url: absoluteUrl("/newsfeed"),
          items: feedCollectionItems({
            newsItems,
            socialPosts: posts,
          }),
        })}
      />
      <PublicShell>
      <section className="border-b border-[#E7E1D8] bg-section">
        <div className="editorial-container !max-w-[1360px] py-10 md:py-12 lg:py-16">
          <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.62fr)] lg:gap-14">
            <div className="max-w-[760px]">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-md border border-[#E7E1D8] bg-[#FBFAF7] text-[#9A3D2B]">
                  <Newspaper className="size-4" />
                </span>
                <p className="editorial-label">Newsfeed</p>
              </div>

              <h1 className="mt-5 max-w-[820px] font-heading text-[clamp(44px,5vw,64px)] font-medium leading-[0.95] tracking-[-0.045em] text-[#111111]">
                <span className="block">Early-Stage NYC AI News</span>
                <span className="block">and Company Posts</span>
              </h1>

              <p className="mt-5 max-w-[560px] text-[17px] leading-[1.55] text-[#5F5A52] md:text-[18px]">
                Early-stage NYC AI links, broader context, and official posts
                from mapped companies.
              </p>

              <FeedProofLine
                newsCount={newsItems.length}
                postCount={posts.length}
                updatedAt={latestUpdatedAt}
              />
            </div>

            <div className="relative flex min-h-[132px] items-end justify-center overflow-hidden lg:min-h-[240px] lg:justify-end">
              <NewsfeedGarnish />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-section">
        <div className="editorial-container !max-w-[1360px] py-8 md:py-10 lg:py-12">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.58fr)_minmax(380px,0.42fr)] lg:gap-10 xl:gap-12">
            <FeedSection
              id="news-links"
              eyebrow="News links"
              title="Early-Stage NYC AI Links to Scan"
              href="/feed?view=all#news-links"
              linkLabel="View all"
            >
              <div className="mt-5 grid gap-3">
                {visibleNewsItems.length > 0 ? (
                  visibleNewsItems.map((item) => (
                    <NewsLinkRow
                      key={item.id}
                      item={item}
                      companies={companiesById}
                    />
                  ))
                ) : (
                  <EmptyNewsState />
                )}
              </div>
            </FeedSection>

            <FeedSection
              id="company-posts"
              eyebrow="Company posts"
              title="Posts from the Map"
              href="/feed?view=all#company-posts"
              linkLabel="View all"
              className="lg:border-l lg:border-[#E7E1D8] lg:pl-10 xl:pl-12"
            >
              <div className="mt-5 grid gap-3">
                {visiblePosts.length > 0 ? (
                  visiblePosts.map((post) => (
                    <CompanyPostRow
                      key={post.id}
                      post={post}
                      companies={companiesById}
                    />
                  ))
                ) : (
                  <EmptyCompanyPostState />
                )}
              </div>
            </FeedSection>
          </div>
        </div>
      </section>

      <section className="bg-section">
        <div className="editorial-container !max-w-[1360px] border-t border-[#E7E1D8] py-5">
          <div className="flex flex-col gap-3 text-sm text-[#5F5A52] md:flex-row md:items-center md:justify-between">
            <p className="inline-flex items-center gap-2">
              <PixelSiteIcon name="globe" size="xs" />
              Curated by hand. Updated frequently.
            </p>
            <Link
              href="https://x.com/AiAtlasNYC"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-[#5F5A52] transition hover:text-[#181818]"
            >
              Follow on X
              <ExternalLink className="size-3.5 text-[#9A3D2B]" />
            </Link>
          </div>
        </div>
      </section>
      </PublicShell>
    </>
  );
}

function FeedSection({
  id,
  eyebrow,
  title,
  href,
  linkLabel,
  className = "",
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  href: string;
  linkLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={className} aria-labelledby={`${id}-title`}>
      <div className="flex items-end justify-between gap-4 border-b border-[#E7E1D8] pb-4">
        <div>
          <p className="editorial-label">{eyebrow}</p>
          <h2
            id={`${id}-title`}
            className="mt-2 font-heading text-[clamp(28px,3vw,38px)] font-medium leading-[1] tracking-[-0.035em] text-[#181818]"
          >
            {title}
          </h2>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#9A3D2B] transition hover:text-[#181818]"
        >
          {linkLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function NewsLinkRow({
  item,
  companies,
}: {
  item: NewsItem;
  companies: Map<string, Company>;
}) {
  return (
    <article className="rounded-[10px] border border-[#E3D9CE] bg-[rgb(251_250_247_/_0.58)] p-3 transition hover:bg-[rgb(154_61_43_/_0.04)] md:p-4">
      <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 md:grid-cols-[64px_minmax(0,1fr)_86px] md:items-start">
        <SourceTile item={item} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-[#A64032]">
              {item.scope === "nyc" ? "NYC signal" : "Broad AI"}
            </span>
            <span className="text-xs font-medium text-[#7A746C]">
              {item.source_name || item.source_domain}
            </span>
          </div>
          <h3 className="mt-2 font-heading text-[20px] font-medium leading-[1.1] tracking-[-0.025em] text-[#181818] md:text-[21px]">
            <a
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-[#9A3D2B]"
            >
              {item.title}
            </a>
          </h3>
          {item.summary ? (
            <p className="mt-2 line-clamp-3 text-sm leading-[1.55] text-[#5F5A52] md:line-clamp-2">
              <LinkedCompanyText text={item.summary} companies={companies} />
            </p>
          ) : null}
        </div>
        <a
          href={item.source_url}
          target="_blank"
          rel="noreferrer"
          className="col-start-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#9A3D2B] md:col-start-auto md:justify-end md:text-right"
        >
          <span className="text-[#7A746C]">{formatNewsDate(item)}</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      </div>
    </article>
  );
}

function CompanyPostRow({
  post,
  companies,
}: {
  post: CompanySocialPostWithCompany;
  companies: Map<string, Company>;
}) {
  const company = post.company;

  return (
    <article className="rounded-[10px] border border-[#E3D9CE] bg-[rgb(251_250_247_/_0.5)] p-3 transition hover:bg-[rgb(154_61_43_/_0.035)] md:p-4">
      <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-3">
        {company ? (
          <CompanyLogo
            company={company}
            name={company.name}
            category={company.category}
            className="rowSprite companyLogoTile size-14 rounded-[10px] border-[#D8CFC1] bg-[#FBFAF7] p-1.5 text-xs ring-0"
          />
        ) : (
          <span className="grid size-14 place-items-center rounded-[10px] border border-[#D8CFC1] bg-[#FBFAF7] text-sm font-semibold text-[#9A3D2B]">
            @{post.author_handle.slice(0, 1).toUpperCase()}
          </span>
        )}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {company ? (
              <Link
                href={`/companies/${company.slug}`}
                className="font-heading text-[18px] font-medium leading-none tracking-[-0.02em] text-[#181818] transition hover:text-[#9A3D2B]"
              >
                {company.name}
              </Link>
            ) : (
              <span className="font-heading text-[18px] font-medium leading-none tracking-[-0.02em] text-[#181818]">
                {post.author_name || `@${post.author_handle}`}
              </span>
            )}
            <span className="text-xs font-medium text-[#7A746C]">
              @{post.author_handle}
            </span>
            <span aria-hidden="true" className="text-[#CFC7BC]">
              ·
            </span>
            <time className="text-xs text-[#7A746C]" dateTime={post.posted_at}>
              {formatPostTimestamp(post.posted_at)}
            </time>
            {company ? (
              <>
                <span aria-hidden="true" className="text-[#CFC7BC]">
                  ·
                </span>
                <span className="text-xs font-medium text-[#7A746C]">
                  {company.category}
                </span>
              </>
            ) : null}
          </div>

          <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-[1.6] text-[#35312C]">
            <LinkedCompanyText
              text={post.post_text}
              companies={companies}
              excludeCompanyId={company?.id}
            />
          </p>

          <div className="mt-3 flex justify-end">
            <a
              href={post.post_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B] transition hover:text-[#181818]"
            >
              Open on X
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function SourceTile({ item }: { item: NewsItem }) {
  return (
    <span className="rowSprite grid size-14 place-items-center rounded-[10px] border border-[#D8CFC1] bg-[#FBFAF7] text-center font-heading text-[20px] font-semibold leading-none tracking-[-0.03em] text-[#A64032] md:size-16 md:text-[22px]">
      {getSourceInitials(item)}
    </span>
  );
}

function NewsfeedGarnish() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 760 260"
      className="h-auto w-full max-w-[620px] opacity-70 lg:max-w-[690px]"
      role="img"
    >
      <g shapeRendering="crispEdges">
        <rect x="95" y="222" width="570" height="4" fill="#DCD2C3" opacity="0.72" />
        <rect x="125" y="234" width="490" height="3" fill="#E7E1D8" opacity="0.72" />
        <rect x="172" y="202" width="108" height="12" fill="#D8CFC1" opacity="0.55" />
        <rect x="184" y="188" width="84" height="14" fill="#D8CFC1" opacity="0.48" />
        <rect x="206" y="166" width="42" height="22" fill="#D8CFC1" opacity="0.45" />
        <rect x="218" y="136" width="18" height="30" fill="#D8CFC1" opacity="0.46" />
        <rect x="224" y="96" width="8" height="40" fill="#4F8A82" opacity="0.82" />
        <rect x="212" y="112" width="10" height="52" fill="#4F8A82" opacity="0.82" />
        <rect x="234" y="118" width="10" height="48" fill="#4F8A82" opacity="0.78" />
        <rect x="206" y="146" width="42" height="12" fill="#3F776F" opacity="0.82" />
        <rect x="199" y="160" width="56" height="8" fill="#4F8A82" opacity="0.78" />
        <rect x="194" y="176" width="66" height="14" fill="#4F8A82" opacity="0.7" />
        <rect x="190" y="190" width="74" height="9" fill="#D6C7B7" opacity="0.82" />
        <rect x="220" y="82" width="7" height="14" fill="#3F776F" opacity="0.9" />
        <rect x="213" y="76" width="20" height="6" fill="#3F776F" opacity="0.88" />
        <rect x="205" y="70" width="6" height="18" fill="#3F776F" opacity="0.75" />
        <rect x="199" y="66" width="6" height="8" fill="#A64032" opacity="0.72" />
        <rect x="188" y="110" width="20" height="7" fill="#4F8A82" opacity="0.68" />
        <rect x="178" y="104" width="10" height="7" fill="#4F8A82" opacity="0.56" />
        <rect x="140" y="210" width="30" height="6" fill="#31475E" opacity="0.55" />
        <rect x="148" y="202" width="12" height="8" fill="#31475E" opacity="0.42" />
        <rect x="132" y="216" width="46" height="4" fill="#D8CFC1" opacity="0.62" />

        <rect x="330" y="160" width="42" height="54" fill="#D8CFC1" opacity="0.42" />
        <rect x="340" y="172" width="6" height="8" fill="#F8F6F1" opacity="0.8" />
        <rect x="356" y="172" width="6" height="8" fill="#F8F6F1" opacity="0.8" />
        <rect x="386" y="146" width="34" height="68" fill="#D8CFC1" opacity="0.38" />
        <rect x="396" y="122" width="14" height="24" fill="#D8CFC1" opacity="0.4" />
        <rect x="438" y="130" width="38" height="84" fill="#D8CFC1" opacity="0.4" />
        <rect x="450" y="112" width="14" height="18" fill="#D8CFC1" opacity="0.36" />
        <rect x="492" y="102" width="48" height="112" fill="#D8CFC1" opacity="0.43" />
        <rect x="506" y="82" width="20" height="20" fill="#D8CFC1" opacity="0.4" />
        <rect x="548" y="82" width="42" height="132" fill="#D8CFC1" opacity="0.37" />
        <rect x="560" y="54" width="18" height="28" fill="#D8CFC1" opacity="0.38" />
        <rect x="612" y="112" width="34" height="102" fill="#D8CFC1" opacity="0.42" />
        <rect x="622" y="88" width="14" height="24" fill="#D8CFC1" opacity="0.36" />

        {Array.from({ length: 18 }).map((_, index) => {
          const x = 344 + (index % 6) * 8;
          const y = 172 + Math.floor(index / 6) * 14;
          return <rect key={`win-a-${index}`} x={x} y={y} width="3" height="5" fill="#F8F6F1" opacity="0.76" />;
        })}
        {Array.from({ length: 20 }).map((_, index) => {
          const x = 504 + (index % 5) * 7;
          const y = 116 + Math.floor(index / 5) * 18;
          return <rect key={`win-b-${index}`} x={x} y={y} width="3" height="6" fill="#F8F6F1" opacity="0.74" />;
        })}
        {Array.from({ length: 16 }).map((_, index) => {
          const x = 558 + (index % 4) * 7;
          const y = 96 + Math.floor(index / 4) * 21;
          return <rect key={`win-c-${index}`} x={x} y={y} width="3" height="7" fill="#F8F6F1" opacity="0.74" />;
        })}

        <rect x="108" y="104" width="4" height="16" fill="#D8CFC1" opacity="0.5" />
        <rect x="102" y="110" width="16" height="4" fill="#D8CFC1" opacity="0.5" />
        <rect x="640" y="72" width="4" height="16" fill="#D8CFC1" opacity="0.5" />
        <rect x="634" y="78" width="16" height="4" fill="#D8CFC1" opacity="0.5" />
        <rect x="286" y="92" width="4" height="12" fill="#D8CFC1" opacity="0.42" />
        <rect x="282" y="96" width="12" height="4" fill="#D8CFC1" opacity="0.42" />
        <rect x="455" y="78" width="10" height="3" fill="#D8CFC1" opacity="0.45" />
        <rect x="680" y="156" width="10" height="3" fill="#D8CFC1" opacity="0.42" />
      </g>
    </svg>
  );
}

function FeedProofLine({
  newsCount,
  postCount,
  updatedAt,
}: {
  newsCount: number;
  postCount: number;
  updatedAt: string | null;
}) {
  if (newsCount <= 0 && postCount <= 0) return null;

  return (
    <p className="mt-5 max-w-[640px] border-t border-[#DCD2C3] pt-4 text-sm font-medium leading-[1.6] text-[#66625C]">
      {newsCount > 0 ? (
        <span className="text-[#181818]">{formatNewsCount(newsCount)}</span>
      ) : null}
      {newsCount > 0 && postCount > 0 ? " · " : null}
      {postCount > 0 ? (
        <span className="text-[#181818]">{formatPostCount(postCount)}</span>
      ) : null}
      {updatedAt ? (
        <>
          <span aria-hidden="true"> · </span>
          Updated {formatRelativeUpdate(updatedAt)}
        </>
      ) : null}
    </p>
  );
}

function getLatestFeedUpdatedAt(
  newsItems: NewsItem[],
  posts: CompanySocialPostWithCompany[],
) {
  const latest = [...newsItems, ...posts].reduce((max, item) => {
    if ("posted_at" in item) {
      return Math.max(
        max,
        getDateTime(item.synced_at),
        getDateTime(item.posted_at),
        getDateTime(item.created_at),
      );
    }

    return Math.max(
      max,
      getDateTime(item.updated_at),
      getDateTime(item.discovered_at),
      getDateTime(item.published_at),
      getDateTime(item.created_at),
    );
  }, 0);

  return latest > 0 ? new Date(latest).toISOString() : null;
}

function formatNewsCount(count: number) {
  return count === 1 ? "1 news link" : `${count} news links`;
}

function formatPostCount(count: number) {
  return count === 1 ? "1 company post" : `${count} company posts`;
}

function formatNewsDate(item: NewsItem) {
  const value = item.published_at ?? item.discovered_at;
  if (!value) return "Recent";

  return formatRelativeUpdate(value);
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

function getDateTime(dateValue?: string) {
  if (!dateValue) return 0;

  const time = new Date(dateValue).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getSourceInitials(item: NewsItem) {
  const source = item.source_name || item.source_domain || "News";
  const cleaned = source
    .replace(/\b(ai|news|the)\b/gi, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();

  return (words[0] ?? source).slice(0, 2).toUpperCase();
}

function EmptyNewsState() {
  return (
    <div className="rounded-[10px] border border-[#E7E1D8] bg-[#FBFAF7] p-6">
      <p className="font-heading text-[28px] font-medium tracking-[-0.025em] text-[#181818]">
        The Newsfeed is ready.
      </p>
      <p className="mt-3 max-w-[620px] text-sm leading-[1.7] text-[#5F5A52]">
        Fresh early-stage NYC AI links will appear here when they are ready.
      </p>
    </div>
  );
}

function EmptyCompanyPostState() {
  return (
    <div className="rounded-[10px] border border-[#E7E1D8] bg-[#FBFAF7] p-6">
      <p className="editorial-label">Company posts</p>
      <p className="mt-3 font-heading text-[28px] font-medium tracking-[-0.025em] text-[#181818]">
        Company posts are coming next.
      </p>
      <p className="mt-3 max-w-[620px] text-sm leading-[1.7] text-[#5F5A52]">
        This section stays focused on official updates from mapped companies.
      </p>
    </div>
  );
}
