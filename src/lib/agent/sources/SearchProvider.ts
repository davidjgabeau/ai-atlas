import type { AgentCompany, RawSourceRecord } from "../../../types/agent";
import { createContentHash, createId } from "../hash";
import type { SourceProvider } from "./SourceProvider";

const candidateQueries = [
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

    for (const source of getSearchSources()) {
      for (const query of getSearchQueries()) {
        const results = await fetchWordPressSearch(source, query);

        for (const result of results.slice(0, getResultsPerQueryLimit())) {
          if (!result.url || seenUrls.has(result.url)) continue;
          seenUrls.add(result.url);

          const article = await fetchArticleText(result.url);
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
            discoveredAt: new Date().toISOString(),
            contentHash,
          });
        }
      }
    }

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

  return (configured.length > 0 ? configured : candidateQueries).slice(0, getSearchQueryLimit());
}

function getSearchQueryLimit() {
  const value = Number(process.env.DISCOVERY_QUERY_LIMIT ?? 12);
  return Number.isFinite(value) ? Math.max(1, Math.min(24, value)) : 12;
}

function getResultsPerQueryLimit() {
  const value = Number(process.env.DISCOVERY_RESULTS_PER_QUERY ?? 4);
  return Number.isFinite(value) ? Math.max(1, Math.min(8, value)) : 4;
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
      text: stripHtml(html),
    };
  } catch {
    return null;
  }
}

function hasCandidateSearchSignal(text: string) {
  return (
    /\b(ai|artificial intelligence|generative ai|genai|llm|agentic|machine learning|foundation model)\b/i.test(text) &&
    /\b(startup|company|raised|funding|seed|pre-seed|preseed|series a|launches|launched|emerges|founded)\b/i.test(text)
  );
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
