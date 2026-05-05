import { writeFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

import { createContentHash, createId } from "@/lib/agent/hash";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";
import type { NewsItem, NewsScope } from "@/types/market";

type RefreshNewsOptions = {
  persistJson?: boolean;
  requireSupabasePersistence?: boolean;
};

type RefreshNewsResult = {
  ok: boolean;
  persisted: boolean;
  sourcesChecked: number;
  itemsFound: number;
  itemsPublished: number;
  itemsUpserted: number;
  errors: string[];
};

type FeedSource = {
  name: string;
  url: string;
  defaultScope: NewsScope;
};

type RawNewsCandidate = {
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt?: string;
  imageUrl?: string;
  defaultScope: NewsScope;
  raw: Record<string, unknown>;
};

type GdeltArticle = {
  url?: string;
  title?: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  sourcecountry?: string;
};

const directFeeds: FeedSource[] = [
  {
    name: "AlleyWatch",
    url: "https://www.alleywatch.com/feed/",
    defaultScope: "nyc",
  },
  {
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    defaultScope: "broad",
  },
  {
    name: "TechCrunch Startups",
    url: "https://techcrunch.com/category/startups/feed/",
    defaultScope: "broad",
  },
  {
    name: "Crunchbase News",
    url: "https://news.crunchbase.com/feed/",
    defaultScope: "broad",
  },
  {
    name: "VentureBeat AI",
    url: "https://venturebeat.com/category/ai/feed/",
    defaultScope: "broad",
  },
];

const gdeltQueries = [
  {
    scope: "nyc" as const,
    query:
      '("New York" OR NYC OR Manhattan OR Brooklyn) (AI OR "artificial intelligence" OR "generative AI" OR LLM OR agentic) (startup OR seed OR "Series A" OR funding OR launch)',
  },
  {
    scope: "broad" as const,
    query:
      '(AI OR "artificial intelligence" OR "generative AI" OR LLM OR agentic) (startup OR seed OR "Series A" OR "pre-seed" OR funding)',
  },
];

const parser = new XMLParser({
  attributeNamePrefix: "@_",
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
});

export async function refreshNewsItems({
  persistJson = false,
  requireSupabasePersistence = false,
}: RefreshNewsOptions = {}): Promise<RefreshNewsResult> {
  const errors: string[] = [];
  const candidates: RawNewsCandidate[] = [];
  const sources = [...getConfiguredFeeds()];

  for (const source of sources) {
    try {
      const xml = await fetchText(source.url);
      if (!xml) continue;

      candidates.push(...parseFeed(xml, source));
    } catch (error) {
      errors.push(formatError(`${source.name} feed`, error));
    }
  }

  if (shouldUseGdelt()) {
    for (const [index, query] of gdeltQueries.entries()) {
      try {
        if (index > 0) await sleep(12000);
        candidates.push(...(await fetchGdeltNews(query.query, query.scope)));
      } catch (error) {
        errors.push(formatError(`GDELT ${query.scope} news`, error));
      }
    }
  }

  const items = dedupeNewsItems(candidates)
    .map(toNewsItem)
    .filter((item): item is NewsItem => Boolean(item))
    .sort(compareNewsItems)
    .slice(0, getMaxStoredItems());

  const supabase = createSupabasePrivilegedClient();
  let itemsUpserted = 0;

  if (supabase && items.length > 0) {
    const { error } = await supabase
      .from("news_items")
      .upsert(items.map(toNewsItemRow), { onConflict: "source_url" });

    if (error) {
      errors.push(error.message);
    } else {
      itemsUpserted = items.length;
    }
  }

  if (persistJson) {
    await writeFile(
      path.join(process.cwd(), "data/news-items.json"),
      `${JSON.stringify(items, null, 2)}\n`,
    );
  }

  const persisted = itemsUpserted > 0 || (persistJson && items.length > 0);

  return {
    ok:
      items.length > 0 &&
      (!requireSupabasePersistence || itemsUpserted > 0),
    persisted,
    sourcesChecked: sources.length + (shouldUseGdelt() ? gdeltQueries.length : 0),
    itemsFound: candidates.length,
    itemsPublished: items.length,
    itemsUpserted,
    errors,
  };
}

function getConfiguredFeeds() {
  const configured = (process.env.NEWS_FEED_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({
      name: getDomain(url),
      url,
      defaultScope: "broad" as const,
    }));

  return [...directFeeds, ...configured];
}

function shouldUseGdelt() {
  return process.env.ENABLE_GDELT_NEWS !== "false";
}

function getItemsPerSourceLimit() {
  const value = Number(process.env.NEWS_ITEMS_PER_SOURCE ?? 12);
  return Number.isFinite(value) ? Math.max(1, Math.min(30, value)) : 12;
}

function getMaxStoredItems() {
  const value = Number(process.env.NEWS_MAX_STORED_ITEMS ?? 80);
  return Number.isFinite(value) ? Math.max(20, Math.min(200, value)) : 80;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "AI Atlas NYC news refresh (+https://aiatlas.nyc)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseFeed(xml: string, source: FeedSource): RawNewsCandidate[] {
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const channel = getObject(getObject(parsed.rss).channel);
  const rssItems = toArray(channel.item);
  const atomItems = toArray(getObject(parsed.feed).entry);
  const items = rssItems.length > 0 ? rssItems : atomItems;

  return items
    .slice(0, getItemsPerSourceLimit())
    .map((item) => normalizeFeedItem(getObject(item), source))
    .filter((item): item is RawNewsCandidate => Boolean(item?.title && item.sourceUrl));
}

function normalizeFeedItem(
  item: Record<string, unknown>,
  source: FeedSource,
): RawNewsCandidate | null {
  const link = getLinkValue(item.link);
  const title = cleanText(getText(item.title));
  const summary = cleanText(
    stripHtml(
      getText(item.description) ||
        getText(item.summary) ||
        getText(item["content:encoded"]),
    ),
  );
  const publishedAt = normalizeDate(
    getText(item.pubDate) || getText(item.published) || getText(item.updated),
  );
  const mediaContent = getObject(item["media:content"]);
  const enclosure = getObject(item.enclosure);
  const sourceNode = item.source;
  const sourceName =
    cleanText(
      typeof sourceNode === "object" && sourceNode
        ? getText((sourceNode as Record<string, unknown>)["#text"])
        : getText(sourceNode),
    ) || source.name;

  if (!title || !link) return null;

  return {
    title,
    summary,
    sourceUrl: cleanSourceUrl(link),
    sourceName,
    publishedAt,
    imageUrl:
      getText(mediaContent["@_url"]) ||
      getText(enclosure["@_url"]) ||
      undefined,
    defaultScope: source.defaultScope,
    raw: {
      feed: source.url,
      title,
      link,
      sourceName,
      publishedAt,
      categories: toArray(item.category)
        .map((category) => cleanText(getText(category)))
        .filter(Boolean),
    },
  };
}

async function fetchGdeltNews(
  query: string,
  scope: NewsScope,
): Promise<RawNewsCandidate[]> {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(getItemsPerSourceLimit()));
  url.searchParams.set("sort", "hybridrel");

  const response = await fetch(url, {
    headers: {
      "user-agent": "AI Atlas NYC news refresh (+https://aiatlas.nyc)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as { articles?: GdeltArticle[] };

  const candidates: RawNewsCandidate[] = [];

  for (const article of payload.articles ?? []) {
    const sourceUrl = article.url ? cleanSourceUrl(article.url) : "";
    const title = cleanText(article.title ?? "");
    if (!sourceUrl || !title) continue;

    candidates.push({
      title,
      summary: "",
      sourceUrl,
      sourceName: getSourceName(article.domain || getDomain(sourceUrl)),
      publishedAt: normalizeGdeltDate(article.seendate),
      imageUrl: article.socialimage || undefined,
      defaultScope: scope,
      raw: article as Record<string, unknown>,
    });
  }

  return candidates;
}

function toNewsItem(candidate: RawNewsCandidate): NewsItem | null {
  const text = `${candidate.title} ${candidate.summary}`;
  const score = scoreNewsCandidate(text, candidate.sourceName, candidate.defaultScope);

  if (!score.accepted) return null;

  const sourceDomain = getDomain(candidate.sourceUrl);
  const contentHash = createContentHash({
    url: candidate.sourceUrl,
    title: candidate.title,
    publishedAt: candidate.publishedAt,
  });
  const now = new Date().toISOString();

  return {
    id: createId("news", contentHash),
    title: candidate.title,
    summary: createSummary(candidate),
    source_url: candidate.sourceUrl,
    source_name: candidate.sourceName || getSourceName(sourceDomain),
    source_domain: sourceDomain,
    published_at: candidate.publishedAt,
    discovered_at: now,
    scope: score.scope,
    topic: score.topic,
    relevance_score: score.relevanceScore,
    image_url: candidate.imageUrl,
    status: "published",
    raw: candidate.raw,
    created_at: now,
    updated_at: now,
  };
}

function scoreNewsCandidate(
  text: string,
  sourceName: string,
  defaultScope: NewsScope,
): {
  accepted: boolean;
  relevanceScore: number;
  scope: NewsScope;
  topic: string;
} {
  const hasAi = /\b(ai|artificial intelligence|generative ai|genai|llm|agentic|machine learning|foundation model|model)\b/i.test(text);
  const hasEarlyStage = /\b(startup|seed|pre-seed|preseed|series a|early-stage|early stage|launch|launched)\b/i.test(text);
  const hasFundingSignal = /\b(funding|raised|raises|venture)\b/i.test(text);
  const hasLateStageSignal = /(series [bcdefgh]|growth-stage|growth stage|ipo|acquires|acquired|buys|unicorn|valuation|billion|\$[2-9]\d{2,}m|\$1[5-9]\d{1}m|\$[1-9](?:\.\d+)?b)/i.test(text);
  const isInvestorStory = /\b(investor|investors|venture fund|fund manager|fundraising for its fund)\b/i.test(text);
  const hasNyc = /\b(new york|nyc|manhattan|brooklyn|soho|flatiron|nomad|chelsea)\b/i.test(text);
  const prioritySource = /\b(techcrunch|venturebeat|crunchbase|bloomberg|wall street journal|wsj|alleywatch|axios|the information)\b/i.test(sourceName);
  const hasStage = hasEarlyStage || hasFundingSignal;
  const relevanceScore =
    (hasAi ? 0.4 : 0) +
    (hasStage ? 0.28 : 0) +
    (hasNyc ? 0.24 : 0) +
    (prioritySource ? 0.08 : 0);
  const scope: NewsScope = hasNyc
    ? "nyc"
    : defaultScope === "nyc"
      ? "broad"
      : defaultScope;

  return {
    accepted:
      hasAi &&
      hasStage &&
      !isInvestorStory &&
      !(hasLateStageSignal && !/\b(seed|pre-seed|preseed|series a)\b/i.test(text)) &&
      relevanceScore >= 0.62,
    relevanceScore: Number(relevanceScore.toFixed(2)),
    scope,
    topic: hasNyc ? "NYC early-stage AI" : "Broad early-stage AI",
  };
}

function createSummary(candidate: RawNewsCandidate) {
  const cleaned = cleanText(candidate.summary);
  if (cleaned) return truncate(cleaned, 180);

  return candidate.defaultScope === "nyc"
    ? "Early-stage NYC AI news with New York market relevance."
    : "Broader early-stage AI context for the NYC map.";
}

function dedupeNewsItems(candidates: RawNewsCandidate[]) {
  const seen = new Set<string>();
  const items: RawNewsCandidate[] = [];

  for (const candidate of candidates) {
    const key = cleanSourceUrl(candidate.sourceUrl).toLowerCase();
    if (!key || seen.has(key)) continue;

    seen.add(key);
    items.push(candidate);
  }

  return items;
}

function compareNewsItems(left: NewsItem, right: NewsItem) {
  if (left.scope !== right.scope) return left.scope === "nyc" ? -1 : 1;
  if (right.relevance_score !== left.relevance_score) {
    return right.relevance_score - left.relevance_score;
  }

  return (
    getTime(right.published_at ?? right.discovered_at) -
    getTime(left.published_at ?? left.discovered_at)
  );
}

function toNewsItemRow(item: NewsItem) {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    source_url: item.source_url,
    source_name: item.source_name,
    source_domain: item.source_domain,
    published_at: item.published_at,
    discovered_at: item.discovered_at,
    scope: item.scope,
    topic: item.topic,
    relevance_score: item.relevance_score,
    image_url: item.image_url,
    status: item.status,
    raw: item.raw,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

function getLinkValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return getLinkValue(value[0]);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return getText(record["@_href"]) || getText(record["#text"]);
  }

  return "";
}

function getObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value) return [value];
  return [];
}

function getText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (value && typeof value === "object") {
    return getText((value as Record<string, unknown>)["#text"]);
  }

  return "";
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function cleanText(value: string) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSourceUrl(value: string) {
  try {
    const url = new URL(value);
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^(utm_|fbclid|gclid|mc_cid|mc_eid)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^www\./, "");
  }
}

function getSourceName(value: string) {
  return value
    .replace(/^www\./, "")
    .split(".")[0]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeDate(value: string) {
  if (!value) return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}

function normalizeGdeltDate(value?: string) {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
  if (!match) return normalizeDate(value);

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  return normalizeDate(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
}

function truncate(value: string, length: number) {
  return value.length <= length ? value : `${value.slice(0, length - 1).trim()}…`;
}

function getTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatError(source: string, error: unknown) {
  return `${source}: ${error instanceof Error ? error.message : "Unknown error"}`;
}
