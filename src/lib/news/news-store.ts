import { cache } from "react";

import fallbackNewsItems from "../../../data/news-items.json";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { NewsItem, NewsScope } from "@/types/market";

type NewsItemRow = Partial<NewsItem> & {
  raw?: unknown;
  relevance_score?: unknown;
};

export const getNewsItems = cache(
  async ({
    limit = 40,
    scope,
  }: {
    limit?: number;
    scope?: NewsScope;
  } = {}): Promise<NewsItem[]> => {
    const supabase = createSupabaseServerClient();

    if (supabase) {
      let query = supabase
        .from("news_items")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("discovered_at", { ascending: false })
        .limit(limit);

      if (scope) {
        query = query.eq("scope", scope);
      }

      const { data, error } = await query;

      if (!error && data) {
        return (data as NewsItemRow[])
          .map(normalizeNewsItem)
          .filter((item): item is NewsItem => Boolean(item))
          .slice(0, limit);
      }

      console.warn("Supabase news items fallback:", error?.message);
    }

    return getFallbackNewsItems({ limit, scope });
  },
);

function getFallbackNewsItems({
  limit,
  scope,
}: {
  limit: number;
  scope?: NewsScope;
}) {
  return (fallbackNewsItems as NewsItem[])
    .filter((item) => item.status === "published")
    .filter((item) => (scope ? item.scope === scope : true))
    .sort(compareNewsItemsByDate)
    .slice(0, limit);
}

function normalizeNewsItem(row: NewsItemRow): NewsItem | null {
  const id = safeString(row.id);
  const title = safeString(row.title);
  const sourceUrl = safeString(row.source_url);

  if (!id || !title || !sourceUrl) return null;

  return {
    id,
    title,
    summary: safeString(row.summary),
    source_url: sourceUrl,
    source_name: safeString(row.source_name, getDomain(sourceUrl)),
    source_domain: safeString(row.source_domain, getDomain(sourceUrl)),
    published_at: optionalString(row.published_at),
    discovered_at: safeString(row.discovered_at, new Date().toISOString()),
    scope: row.scope === "nyc" ? "nyc" : "broad",
    topic: safeString(row.topic, "Early-stage AI"),
    relevance_score:
      typeof row.relevance_score === "number" ? row.relevance_score : 0,
    image_url: optionalString(row.image_url),
    status: row.status === "hidden" ? "hidden" : "published",
    raw: normalizeRaw(row.raw),
    created_at: safeString(row.created_at),
    updated_at: safeString(row.updated_at),
  };
}

function normalizeRaw(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function compareNewsItemsByDate(left: NewsItem, right: NewsItem) {
  if (left.scope !== right.scope) return left.scope === "nyc" ? -1 : 1;

  return (
    getTime(right.published_at ?? right.discovered_at) -
    getTime(left.published_at ?? left.discovered_at)
  );
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getTime(value?: string) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
