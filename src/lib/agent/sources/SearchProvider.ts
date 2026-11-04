import type { AgentCompany, RawSourceRecord } from "../../../types/agent";
import { createContentHash, createId } from "../hash";
import type { SourceProvider } from "./SourceProvider";
import { forEachConcurrent } from "../concurrency";

const candidateQueries = [
  '"NYC" "AI" "Series C"',
  '"New York" "AI" "Series D"',
  '"New York" "AI" "public company"',
  '"Williamsburg" "AI" "office"',
  '"Brooklyn" "AI" "lease"',
  '"Queens" "AI" "headquarters"',
  '"New York" "AI" "raises" "$"',
  '"NYC" "AI" "announces" "funding"',
  '"New York-based" "AI" "raises"',
  '"Brooklyn-based" "AI" "raises"',
  '"New York" "agentic AI" "raises"',
  '"New York" "AI" "raises" "Series A"',
  '"NYC" "AI" "raises" "seed"',
  '"New York" "AI" "seed funding"',
  '"New York" "AI" "Series A funding"',
  '"NYC" "AI startup" "funding round"',
  '"New York" "consumer AI" "Series A"',
  '"AI social" "New York" startup',
  '"AI" "interactive entertainment" startup funding',
  '"New York" "AI infrastructure" "Series B"',
  '"New York" "AI inference" startup funding',
  '"NYC" "AI infrastructure" "raises"',
  '"New York" "GPU" "AI" startup funding',
  '"New York" "AI" "seed" "AlleyWatch"',
  '"NYC" "AI" "Series A" startup',
  '"New York-based" "AI startup" "seed"',
  '"Brooklyn-based" "AI startup" "seed"',
  '"New York" "AI agents" "Series A"',
  '"New York" "agentic AI" "seed"',
  '"NYC" "generative AI" "pre-seed"',
  '"New York" "legal AI" "seed"',
  '"New York" "healthcare AI" "Series A"',
  '"New York" "fintech AI" "seed"',
  '"New York" "cybersecurity AI" "seed"',
  '"New York" "AI infrastructure" "Series A"',
  '"New York AI startup" funding seed',
  '"NYC AI startup" "Series A"',
  '"New York" "AI" "seed round"',
  '"AI startup" "New York" "launched"',
  '"NYC startup" "AI assistant"',
  '"New York" "generative AI" startup seed',
  '"NYC" "AI" "pre-seed"',
];

type SearchSource = {
  name: string;
  endpoint: string;
};

type WordPressSearchResult = {
  title?: string;
  url?: string;
};

const defaultSearchSources: SearchSource[] = [
  {
    name: "AlleyWatch",
    endpoint: "https://www.alleywatch.com/wp-json/wp/v2/search",
  },
  {
    name: "TechCrunch",
    endpoint: "https://techcrunch.com/wp-json/wp/v2/search",
  },
  {
    name: "Crunchbase News",
    endpoint: "https://news.crunchbase.com/wp-json/wp/v2/search",
  },
  {
    name: "FinSMEs",
    endpoint: "https://www.finsmes.com/wp-json/wp/v2/search",
  },
];

export class SearchProvider implements SourceProvider {
  name = "search";

  async fetchForCompany(company: AgentCompany): Promise<RawSourceRecord[]> {
    // Company-specific search is intentionally left to explicit source adapters.
    // Discovery search below is bounded and evidence-first so it can run daily.
    void company;
    return [];
  }

  async discoverCandidates(): Promise<RawSourceRecord[]> {
    const records: RawSourceRecord[] = [];
    const seenUrls = new Set<string>();

    const deadline = Date.now() + 45_000;
    // Rotate the query order daily so a slow source cannot starve later topics.
    const queries = getSearchQueries();
    const offset = (Math.floor(Date.now() / 86_400_000) * getSearchQueryLimit()) % queries.length;
    const rotated = [...queries.slice(offset), ...queries.slice(0, offset)].slice(0, getSearchQueryLimit());
    const searches = rotated.flatMap((query) => getSearchSources().map((source) => ({ source, query })));
    await forEachConcurrent(searches, 4, async ({ source, query }) => {
        const results = await fetchWordPressSearch(source, query);

        for (const result of results.slice(0, getResultsPerQueryLimit())) {
          if (Date.now() >= deadline) break;
          if (!result.url || seenUrls.has(result.url)) continue;
          if (!hasInvestmentAnnouncementTitle(result.title, result.url)) continue;
          seenUrls.add(result.url);

          const article = await fetchArticleText(result.url);
          const publishedAt = article?.publishedAt ?? inferDateFromUrl(result.url);
          if (publishedAt && !isWithinDays(publishedAt, 730)) continue;
          const text = normalizeWhitespace(
            [
              result.title,
              article?.title,
              article?.text,
            ]
              .filter(Boolean)
              .join("\n\n"),
          ).slice(0, 18_000);

          if (!hasCandidateSearchSignal(text)) continue;

          const contentHash = createContentHash({
            source: source.name,
            query,
            url: result.url,
            title: result.title,
            text,
          });

          records.push({
            id: createId("raw", contentHash),
            sourceType: "search",
            url: result.url,
            title: result.title || article?.title,
            text,
            publishedAt,
            discoveredAt: new Date().toISOString(),
            contentHash,
          });
        }
    }, deadline);

    return records;
  }
}

function getSearchSources() {
  const configured = (process.env.DISCOVERY_SEARCH_SOURCES ?? "")
    .split(",")
    .map((source) => source.trim())
    .filter(Boolean)
    .map((source) => {
      const [name, endpoint] = source.split("|").map((item) => item?.trim());
      return name && endpoint ? { name, endpoint } : null;
    })
    .filter((source): source is SearchSource => Boolean(source));

  return [...defaultSearchSources, ...configured];
}

function getSearchQueries() {
  const configured = (process.env.DISCOVERY_SEARCH_QUERIES ?? "")
    .split("|")
    .map((query) => query.trim())
    .filter(Boolean);

  return (configured.length > 0 ? configured : candidateQueries).slice(0, 128);
}

function getSearchQueryLimit() {
  const value = readNumericEnv("DISCOVERY_QUERY_LIMIT", 10);
  return Math.max(1, Math.min(24, value));
}

function getResultsPerQueryLimit() {
  const value = readNumericEnv("DISCOVERY_RESULTS_PER_QUERY", 5);
  return Math.max(1, Math.min(8, value));
}

async function fetchWordPressSearch(source: SearchSource, query: string) {
  try {
    const url = new URL(source.endpoint);
    url.searchParams.set("search", query);
    url.searchParams.set("per_page", String(getResultsPerQueryLimit()));

    const response = await fetch(url, {
      headers: {
        "user-agent": "AI Atlas NYC discovery refresh (+https://aiatlas.nyc)",
        accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload)
      ? payload
          .map((item) => ({
            title: decodeHtml(String((item as WordPressSearchResult).title ?? "")),
            url: String((item as WordPressSearchResult).url ?? ""),
          }))
          .filter((item) => item.title && item.url)
      : [];
  } catch {
    return [];
  }
}

async function fetchArticleText(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "AI Atlas NYC discovery refresh (+https://aiatlas.nyc)",
        accept: "text/html",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return null;
    const html = await response.text();

    return {
      title: decodeHtml(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? ""),
      text: stripHtml(extractArticleHtml(html)),
      publishedAt: extractPublishedDate(html, url),
    };
  } catch {
    return null;
  }
}

function hasCandidateSearchSignal(text: string) {
  const openingText = text.slice(0, 4_000);

  return (
    /\b(ai|artificial intelligence|generative ai|genai|llm|agentic|machine learning|foundation model)\b/i.test(text) &&
    /\b(new york|nyc|brooklyn|manhattan|soho|flatiron|nomad|chelsea|new york-based|ny-based)\b/i.test(openingText) &&
    /\b(startup|company|raised|raises|funding|financing|investment|invests|led by|seed|pre-seed|preseed|series a|series b|launches|launched|emerges|founded)\b/i.test(text)
  );
}

function hasInvestmentAnnouncementTitle(title: string, url: string) {
  const text = `${title} ${url}`;
  if (
    /\b(how to raise|raise a seed round|top investors|venture fund|new fund|fund closes|fund launched|launched a \$?\d+.*fund|fund to invest|vc fund|investor advice)\b/i.test(text)
    || /\b(ventures?|capital|partners)\b.*\bfund\b/i.test(text)
    || /\bfund\s+[ivx]+\b/i.test(text)
    || /\b(sector snapshot|daily funding report|largest .* funding rounds|globally raise|global startup)\b/i.test(text)
  ) {
    return false;
  }

  return /\b(raises?|raised|funding|financing|investment|seed|pre-seed|preseed|series a|series b|closes?|lands|backed by|\$\d)/i.test(title);
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

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, "\"")
    .replace(/&#8221;/g, "\"")
    .trim();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function readNumericEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function extractPublishedDate(html: string, url: string) {
  const candidates = [
    html.match(/property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i)?.[1],
    html.match(/name=["']date["'][^>]*content=["']([^"']+)["']/i)?.[1],
    html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1],
    inferDateFromUrl(url),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeDate(candidate);
    if (normalized) return normalized;
  }

  return undefined;
}

function inferDateFromUrl(url: string) {
  const match = url.match(/\/(20\d{2})\/([01]\d)\//);
  if (!match) return undefined;

  return normalizeDate(`${match[1]}-${match[2]}-01T00:00:00.000Z`);
}

function normalizeDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isWithinDays(value: string, days: number) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;

  return Date.now() - time <= days * 86_400_000;
}
