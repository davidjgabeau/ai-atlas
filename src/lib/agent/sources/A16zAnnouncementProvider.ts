import type { AgentCompany, RawSourceRecord } from "../../../types/agent";
import { createContentHash, createId } from "../hash";
import type { SourceProvider } from "./SourceProvider";

type SitemapEntry = {
  url: string;
  lastmod?: string;
};

const announcementSitemapUrl = "https://a16z.com/announcement-sitemap.xml";

export class A16zAnnouncementProvider implements SourceProvider {
  name = "a16z-announcements";

  async fetchForCompany(company: AgentCompany): Promise<RawSourceRecord[]> {
    void company;
    return [];
  }

  async discoverCandidates(): Promise<RawSourceRecord[]> {
    const sitemap = await fetchText(announcementSitemapUrl);
    if (!sitemap) return [];

    const entries = parseSitemapEntries(sitemap)
      .filter((entry) => /\/announcement\/investing-in-/i.test(entry.url))
      .sort((left, right) => getTime(right.lastmod) - getTime(left.lastmod))
      .slice(0, getAnnouncementLimit());
    const records: RawSourceRecord[] = [];

    for (const entry of entries) {
      const html = await fetchText(entry.url);
      if (!html) continue;

      const pageTitle = decodeHtml(
        html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "",
      );
      const candidateCompanyName = getCandidateName(entry.url, pageTitle);
      if (!candidateCompanyName) continue;

      const articleText = extractArticleText(html);
      const text = normalizeWhitespace(
        [
          pageTitle,
          candidateCompanyName,
          "a16z company announcement.",
          articleText,
        ].join("\n\n"),
      ).slice(0, 18_000);
      if (!hasPotentialAiFundingSignal(text)) continue;

      const contentHash = createContentHash({
        source: this.name,
        url: entry.url,
        title: pageTitle,
        text,
      });

      records.push({
        id: createId("raw", contentHash),
        sourceType: "press",
        candidateCompanyName,
        url: entry.url,
        title: pageTitle || `Investing in ${candidateCompanyName}`,
        text,
        publishedAt: normalizeDate(entry.lastmod),
        discoveredAt: new Date().toISOString(),
        contentHash,
      });
    }

    return records;
  }
}

function parseSitemapEntries(xml: string): SitemapEntry[] {
  return Array.from(xml.matchAll(/<url>([\s\S]*?)<\/url>/gi))
    .map((match) => {
      const chunk = match[1] ?? "";
      return {
        url: decodeXml(readTag(chunk, "loc")),
        lastmod: decodeXml(readTag(chunk, "lastmod")),
      };
    })
    .filter((entry) => entry.url);
}

function getCandidateName(url: string, title: string) {
  const titleMatch = title.match(/^Investing in ([^|]+)/i)?.[1]?.trim();
  if (titleMatch) return cleanCompanyName(titleMatch);

  try {
    const slug = new URL(url).pathname
      .split("/")
      .filter(Boolean)
      .at(-1)
      ?.replace(/^investing-in-/i, "");
    if (!slug) return "";

    return cleanCompanyName(
      slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    );
  } catch {
    return "";
  }
}

function cleanCompanyName(value: string) {
  return value
    .replace(/\s*\|.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPotentialAiFundingSignal(text: string) {
  return (
    /\b(ai|artificial intelligence|generative ai|genai|llm|agentic|machine learning|foundation model|model)\b/i.test(text) &&
    /\b(seed|pre-seed|preseed|series a|series b|funding|investment|investing|led their round|leading their seed round)\b/i.test(text)
  );
}

async function fetchText(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "AI Atlas NYC discovery refresh (+https://aiatlas.nyc)",
        accept: "text/html,application/xml,text/xml",
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

function extractArticleText(html: string) {
  const markerIndex = html.search(/\bjs-article-content\b/i);
  if (markerIndex < 0) return stripHtml(html);

  const start = Math.max(0, html.lastIndexOf("<div", markerIndex));
  const content = html.slice(start);
  const end = content.search(/About the Contributor|component-recommended--footer|<footer\b/i);

  return stripHtml(end >= 0 ? content.slice(0, end) : content);
}

function readTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function decodeHtml(value: string) {
  return stripHtml(decodeXml(value));
}

function decodeXml(value: string) {
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
    .replace(/&#8221;/g, "\"");
}

function normalizeDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getTime(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getAnnouncementLimit() {
  const raw = process.env.DISCOVERY_A16Z_ANNOUNCEMENT_LIMIT?.trim();
  if (!raw) return 12;

  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(1, Math.min(30, value)) : 12;
}
