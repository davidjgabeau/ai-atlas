import type { AgentCompany, RawSourceRecord } from "../../../types/agent";
import { createContentHash, createId } from "../hash";
import type { SourceProvider } from "./SourceProvider";

type CuratedPage = {
  name: string;
  url: string;
  sourceType: RawSourceRecord["sourceType"];
};

const defaultCuratedPages: CuratedPage[] = [
  {
    name: "Built In NYC AI Companies",
    url: "https://builtinnyc.com/articles/nyc-machine-learning-startups-artificial-intelligence",
    sourceType: "search",
  },
];

export class CuratedPageProvider implements SourceProvider {
  name = "curated-pages";

  async fetchForCompany(company: AgentCompany): Promise<RawSourceRecord[]> {
    void company;
    return [];
  }

  async discoverCandidates(): Promise<RawSourceRecord[]> {
    const records: RawSourceRecord[] = [];

    for (const page of getCuratedPages()) {
      const html = await fetchText(page.url);
      if (!html) continue;

      const pageTitle = decodeHtml(
        html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? page.name,
      );
      const fullText = stripHtml(html).slice(0, 18_000);
      const candidateNames = extractCandidateNames(html).slice(0, getCandidatesPerPageLimit());

      for (const candidateName of candidateNames) {
        const text = normalizeWhitespace(
          [
            candidateName,
            pageTitle,
            "Curated source page for NYC AI company discovery.",
            fullText,
          ].join("\n\n"),
        );
        const contentHash = createContentHash({
          page: page.url,
          candidateName,
          text,
        });

        records.push({
          id: createId("raw", contentHash),
          sourceType: page.sourceType,
          candidateCompanyName: candidateName,
          url: page.url,
          title: `${candidateName} - ${pageTitle}`,
          text,
          discoveredAt: new Date().toISOString(),
          contentHash,
        });
      }
    }

    return records;
  }
}

function getCuratedPages(): CuratedPage[] {
  const configuredPages = (process.env.DISCOVERY_CURATED_PAGE_URLS ?? "")
    .split(",")
    .map((source) => source.trim())
    .filter(Boolean)
    .map<CuratedPage | null>((source) => {
      const [name, url] = source.split("|").map((item) => item?.trim());
      return name && url
        ? { name, url, sourceType: "search" as const }
        : null;
    })
    .filter((source): source is CuratedPage => source !== null);

  return [...defaultCuratedPages, ...configuredPages];
}

function extractCandidateNames(html: string) {
  const headings = Array.from(html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi))
    .map((match) => decodeHtml(match[1] ?? ""))
    .map(cleanHeading)
    .filter(isLikelyCompanyHeading);

  return Array.from(new Set(headings));
}

function cleanHeading(value: string) {
  return value
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyCompanyHeading(value: string) {
  const lower = value.toLowerCase();

  if (value.length < 2 || value.length > 56) return false;
  if (!/[a-z0-9]/i.test(value)) return false;
  if (/^(top|recent|more|related|author|newsletter|photos|videos)\b/i.test(value)) return false;
  if (/\b(companies?|startups?|articles?|jobs?|news|resources|guides?|events?)\b/i.test(lower)) {
    return false;
  }

  return true;
}

function getCandidatesPerPageLimit() {
  const value = Number(process.env.DISCOVERY_CURATED_PAGE_CANDIDATE_LIMIT ?? 60);
  return Number.isFinite(value) ? Math.max(1, Math.min(100, value)) : 60;
}

async function fetchText(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "AI Atlas NYC discovery refresh (+https://aiatlas.nyc)",
        accept: "text/html",
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
  return stripHtml(value)
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
