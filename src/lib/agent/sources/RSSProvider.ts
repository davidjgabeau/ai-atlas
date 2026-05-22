import type { AgentCompany, RawSourceRecord } from "../../../types/agent";
import { createContentHash, createId } from "../hash";
import type { SourceProvider } from "./SourceProvider";

type DiscoveryFeed = {
  name: string;
  url: string;
  sourceType: RawSourceRecord["sourceType"];
};

const defaultDiscoveryFeeds: DiscoveryFeed[] = [
  {
    name: "AlleyWatch",
    url: "https://www.alleywatch.com/feed/",
    sourceType: "press",
  },
  {
    name: "AlleyWatch Startups",
    url: "https://www.alleywatch.com/category/startups/feed/",
    sourceType: "press",
  },
  {
    name: "Tech:NYC News",
    url: "https://www.blog.technyc.org/news?format=rss",
    sourceType: "press",
  },
  {
    name: "citybiz",
    url: "https://www.citybiz.co/feed/",
    sourceType: "press",
  },
  {
    name: "TechCrunch Startups",
    url: "https://techcrunch.com/startups/feed/",
    sourceType: "press",
  },
  {
    name: "TechCrunch Venture",
    url: "https://techcrunch.com/category/venture/feed/",
    sourceType: "press",
  },
  {
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    sourceType: "press",
  },
  {
    name: "Crunchbase News",
    url: "https://news.crunchbase.com/feed/",
    sourceType: "press",
  },
  {
    name: "VentureBeat",
    url: "https://feeds.venturebeat.com/VentureBeat",
    sourceType: "press",
  },
  {
    name: "VentureBeat Entrepreneur",
    url: "https://feeds.venturebeat.com/entrepreneur",
    sourceType: "press",
  },
  {
    name: "VentureBeat New York",
    url: "https://feeds.venturebeat.com/newyork",
    sourceType: "press",
  },
];

export class RSSProvider implements SourceProvider {
  name = "rss";

  async fetchForCompany(company: AgentCompany): Promise<RawSourceRecord[]> {
    // TODO: support company.blogUrl/rssUrl once those fields exist.
    void company;
    return [];
  }

  async discoverCandidates(): Promise<RawSourceRecord[]> {
    const feeds = getDiscoveryFeeds();
    const records: RawSourceRecord[] = [];
    const seenUrls = new Set<string>();

    for (const feed of feeds) {
      const xml = await fetchText(feed.url);
      if (!xml) continue;

      const items = parseFeedItems(xml, feed.url)
        .filter(isPotentialDiscoveryItem)
        .slice(0, getItemsPerFeedLimit());

      for (const item of items) {
        const itemUrl = item.link || feed.url;
        if (seenUrls.has(itemUrl)) continue;
        seenUrls.add(itemUrl);

        const article = item.link ? await fetchArticleText(item.link) : null;
        const text = normalizeWhitespace(
          [
            item.title,
            item.description,
            article?.text,
          ]
            .filter(Boolean)
            .join("\n\n"),
        ).slice(0, 18_000);

        if (!hasDiscoverySignal(text, { requireStrongLocation: !isLocalDiscoveryFeed(feed) })) {
          continue;
        }

        const contentHash = createContentHash({
          feed: feed.url,
          url: item.link,
          title: item.title,
          text,
        });

        records.push({
          id: createId("raw", contentHash),
          sourceType: feed.sourceType,
          url: itemUrl,
          title: item.title,
          text,
          author: item.author,
          publishedAt: item.publishedAt,
          discoveredAt: new Date().toISOString(),
          contentHash,
        });
      }
    }

    return records;
  }
}

function getDiscoveryFeeds() {
  const configuredFeeds = (process.env.DISCOVERY_FEED_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({
      name: new URL(url).hostname.replace(/^www\./, ""),
      url,
      sourceType: "press" as const,
    }));

  return [...defaultDiscoveryFeeds, ...configuredFeeds];
}

function getItemsPerFeedLimit() {
  const value = readNumericEnv("DISCOVERY_ITEMS_PER_FEED", 12);
  return Math.max(1, Math.min(30, value));
}

function parseFeedItems(xml: string, feedUrl: string) {
  const itemMatches = Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi));
  const entryMatches = Array.from(xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi));
  const chunks = itemMatches.length > 0
    ? itemMatches.map((match) => match[0])
    : entryMatches.map((match) => match[0]);

  return chunks.map((chunk) => {
    const atomLink = chunk.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];

    return {
      title: decodeXml(readTag(chunk, "title")),
      link: decodeXml(readTag(chunk, "link") || atomLink || feedUrl),
      description: decodeXml(
        readTag(chunk, "description") ||
          readTag(chunk, "summary") ||
          readTag(chunk, "content:encoded"),
      ),
      author: decodeXml(readTag(chunk, "dc:creator") || readTag(chunk, "author")),
      publishedAt: normalizeDate(
        decodeXml(
          readTag(chunk, "pubDate") ||
            readTag(chunk, "published") ||
            readTag(chunk, "updated"),
        ),
      ),
    };
  });
}

function isPotentialDiscoveryItem(item: ReturnType<typeof parseFeedItems>[number]) {
  const text = `${item.title} ${item.description}`;
  if (isInvestorOrAdviceArticle(text)) return false;

  const hasAiSignal =
    /\b(ai|artificial intelligence|generative ai|genai|llm|agentic|machine learning|foundation model)\b/i.test(text);
  const hasFundingOrStartupSignal =
    /\b(startup|company|raised|raises|funding|financing|seed|pre-seed|preseed|series a|series b|launches|launched|emerges|founded)\b/i.test(text);

  if (hasAiSignal && hasFundingOrStartupSignal) return true;

  return hasDiscoverySignal(text);
}

function isInvestorOrAdviceArticle(text: string) {
  return (
    /\b(how to raise|raise a seed round|top investors|venture fund|new fund|fund closes|fund launched|launched a \$?\d+.*fund|fund to invest|vc fund|investor advice)\b/i.test(text)
    || /\b(ventures?|capital|partners)\b.*\bfund\b/i.test(text)
    || /\bfund\s+[ivx]+\b/i.test(text)
  );
}

function hasDiscoverySignal(
  text: string,
  options: { requireStrongLocation?: boolean } = {},
) {
  const locationText = options.requireStrongLocation ? text.slice(0, 3_500) : text.slice(0, 5_000);
  const locationPattern = options.requireStrongLocation
    ? /\b(new york-based|nyc-based|ny-based|brooklyn-based|manhattan-based|based in new york|headquartered in new york|founded in new york|new york city-based)\b/i
    : /\b(new york|nyc|brooklyn|manhattan|soho|flatiron|nomad|chelsea)\b/i;

  return (
    /\b(ai|artificial intelligence|generative ai|genai|llm|agentic|machine learning|foundation model)\b/i.test(text) &&
    locationPattern.test(locationText) &&
    /\b(startup|company|raised|raises|funding|financing|seed|pre-seed|preseed|series a|series b|launches|launched|emerges|founded)\b/i.test(text)
  );
}

function isLocalDiscoveryFeed(feed: DiscoveryFeed) {
  return /\b(alleywatch|tech:nyc|citybiz|new york)\b/i.test(feed.name);
}

async function fetchArticleText(url: string) {
  const html = await fetchText(url);
  if (!html) return null;

  const title = decodeXml(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "");
  const text = stripHtml(extractArticleHtml(html));

  return { title, text };
}

async function fetchText(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "AI Atlas NYC discovery refresh (+https://aiatlas.nyc)",
        accept: "application/rss+xml,application/atom+xml,text/xml,text/html",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

function readTag(xml: string, tag: string) {
  const escapedTag = tag.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "i"));
  return stripCdata(match?.[1] ?? "").trim();
}

function stripHtml(html: string) {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function extractArticleHtml(html: string) {
  return (
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
    html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    html.match(/<div\b[^>]*(?:class|id)=["'][^"']*(?:article|post|entry-content|story)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ??
    html
  );
}

function stripCdata(value: string) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function decodeXml(value: string) {
  return stripHtml(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeDate(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function readNumericEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}
