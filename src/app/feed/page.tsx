import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Newspaper, Rss } from "lucide-react";

import { NewsItemCard } from "@/components/news/news-item-card";
import { CompanySocialPostCard } from "@/components/social/company-social-post-card";
import { PublicShell } from "@/components/site/public-shell";
import { Button } from "@/components/ui/button";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import { getNewsItems } from "@/lib/news/news-store";
import {
  createShareMetadata,
  getShareImageUrl,
  shareCta,
} from "@/lib/seo/shareMetadata";
import { getCompanySocialFeed } from "@/lib/supabase/social-feed";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import type { CompanySocialPostWithCompany } from "@/lib/supabase/social-feed";
import type { NewsItem } from "@/types/market";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createShareMetadata({
  title: "Newsfeed | AI Atlas NYC",
  description: `Early-stage NYC AI news links and official posts from companies in the AI Atlas map. ${shareCta}.`,
  path: "/feed",
  image: getShareImageUrl({ page: "feed" }),
});

export default async function FeedPage() {
  const [newsItems, posts, companies] = await Promise.all([
    getNewsItems({ limit: 60 }),
    getCompanySocialFeed({ limit: 60 }),
    getPublishedCompanies(),
  ]);
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const latestUpdatedAt = getLatestFeedUpdatedAt(newsItems, posts);

  return (
    <PublicShell>
      <section className="hero">
        <div className="editorial-container py-12">
          <div className="flex max-w-[760px] flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-md border border-[#E7E1D8] bg-[#FBFAF7] text-[#9A3D2B]">
                <Newspaper className="size-4" />
              </span>
              <p className="editorial-label">Newsfeed</p>
            </div>
            <h1 className="font-heading text-[clamp(40px,5vw,64px)] font-medium leading-[0.95] tracking-[-0.04em] text-[#181818]">
              Early-Stage NYC AI News and Company Posts
            </h1>
            <p className="max-w-[640px] text-[18px] leading-[1.55] text-[#5F5A52]">
              Early-stage NYC AI links, broader context, and official posts
              from mapped companies.
            </p>
            <FeedProofLine
              newsCount={newsItems.length}
              postCount={posts.length}
              updatedAt={latestUpdatedAt}
            />
          </div>
        </div>
      </section>

      <section className="bg-section">
        <div className="editorial-container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-10">
            <section>
              <SectionHeading
                eyebrow="News links"
                title="Early-stage NYC AI links to scan"
                meta={`${newsItems.length} links`}
              />
              <div className="mt-4 grid gap-3">
                {newsItems.length > 0 ? (
                  newsItems.map((item, index) => (
                    <div
                      key={item.id}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <NewsItemCard item={item} companies={companiesById} />
                    </div>
                  ))
                ) : (
                  <EmptyNewsState />
                )}
              </div>
            </section>

            <section>
              <SectionHeading
                eyebrow="Company posts"
                title="Posts from the map"
                meta={`${posts.length} posts`}
              />
              <div className="mt-4 grid gap-3">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <CompanySocialPostCard
                      key={post.id}
                      post={post}
                      companies={companiesById}
                    />
                  ))
                ) : (
                  <EmptyCompanyPostState />
                )}
              </div>
            </section>
          </div>

          <aside className="h-fit border-y border-[#E7E1D8] py-5">
            <p className="editorial-label">How it updates</p>
            <p className="mt-3 text-sm leading-[1.7] text-[#5F5A52]">
              News links are refreshed by a daily job from startup and business
              sources. Company posts come from official profiles attached to
              mapped companies.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 border-y border-[#E7E1D8] py-4 text-sm">
              <div>
                <p className="font-heading text-[30px] leading-none text-[#181818]">
                  {newsItems.length}
                </p>
                <p className="mt-1 text-[#7A746C]">news links</p>
              </div>
              <div>
                <p className="font-heading text-[30px] leading-none text-[#181818]">
                  {posts.length}
                </p>
                <p className="mt-1 text-[#7A746C]">company posts</p>
              </div>
            </div>
            <Link
              href="/companies"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B]"
            >
              Browse companies
              <ArrowRight className="size-3.5" />
            </Link>
          </aside>
        </div>
      </section>
    </PublicShell>
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
    <p className="max-w-[640px] border-t border-[#E7E1D8] pt-4 text-sm font-medium leading-[1.6] text-[#66625C]">
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

function SectionHeading({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta: string;
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="editorial-label">{eyebrow}</p>
        <h2 className="mt-2 font-heading text-[34px] font-medium leading-[1] tracking-[-0.035em] text-[#181818]">
          {title}
        </h2>
      </div>
      <p className="text-sm text-[#7A746C]">{meta}</p>
    </div>
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

function getDateTime(dateValue?: string) {
  if (!dateValue) return 0;

  const time = new Date(dateValue).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function EmptyNewsState() {
  return (
    <div className="rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-6">
      <p className="font-heading text-[28px] font-medium tracking-[-0.025em] text-[#181818]">
        The Newsfeed is ready.
      </p>
      <p className="mt-3 max-w-[620px] text-sm leading-[1.7] text-[#5F5A52]">
        The next scheduled news update will add early-stage AI links here.
      </p>
      <Button asChild className="mt-5 app-primary-button">
        <Link href="/companies">
          Explore companies
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

function EmptyCompanyPostState() {
  return (
    <div className="rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-6">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-md border border-[#E7E1D8] bg-[#F8F6F1] text-[#9A3D2B]">
          <Rss className="size-4" />
        </span>
        <p className="editorial-label">Company posts</p>
      </div>
      <p className="mt-3 font-heading text-[28px] font-medium tracking-[-0.025em] text-[#181818]">
        Company posts are coming next.
      </p>
      <p className="mt-3 max-w-[620px] text-sm leading-[1.7] text-[#5F5A52]">
        The stream will stay focused on official updates from mapped companies
        once those profiles are connected.
      </p>
    </div>
  );
}
