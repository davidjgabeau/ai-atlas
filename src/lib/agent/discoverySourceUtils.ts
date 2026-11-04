import type { RawSourceRecord } from "@/types/agent";
import { isUsableCompanyWebsite } from "@/lib/agent/companyCandidateValidation";

const publisherHostPattern =
  /\b(techcrunch|venturebeat|crunchbase|alleywatch|a16z|ycombinator|linkedin|twitter|x|facebook|instagram|youtube|medium|substack|builtinnyc|wordpress|wp)\.com$/i;

export function isCuratedPageDiscoveryRecord(record: RawSourceRecord) {
  return (
    /curated source page for nyc ai company discovery/i.test(record.text) ||
    /\bbuiltinnyc\.com\/articles\//i.test(record.url)
  );
}

export function inferCompanyNameFromRecord(record: RawSourceRecord) {
  if (record.candidateCompanyName) {
    return cleanInferredCompanyName(record.candidateCompanyName);
  }

  const fromUrl = inferCompanyNameFromUrl(record.url);
  if (fromUrl) return fromUrl;

  const title = record.title ?? "";
  const titleMatch = title.match(/^([A-Z][A-Za-z0-9 .&-]{1,48})\s+(?:raises|raised|secures|secured|launches|announces)/);
  if (titleMatch?.[1]) {
    return cleanInferredCompanyName(titleMatch[1]);
  }

  return null;
}

export function inferCompanyNameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    const techCrunchMatch = parsed.pathname.match(
      /\/\d{4}\/\d{2}\/\d{2}\/([^/?#]+)/,
    );
    if (techCrunchMatch && host.includes("techcrunch.com")) {
      return cleanInferredCompanyName(
        slugSegmentToName(techCrunchMatch[1].split(/-(?:raises|raised|secures|launches|announces)-/)[0]),
      );
    }

    const alleyWatchMatch = parsed.pathname.match(/\/\d{4}\/\d{2}\/([^/?#]+)/);
    if (alleyWatchMatch && host.includes("alleywatch.com")) {
      return cleanInferredCompanyName(slugSegmentToName(alleyWatchMatch[1].split("-")[0]));
    }

    const slug = parsed.pathname.split("/").filter(Boolean).at(-1) ?? "";
    if (host.includes("a16z.com") && slug.startsWith("investing-in-")) {
      return cleanInferredCompanyName(
        slug.replace(/^investing-in-/, "").replace(/-/g, " "),
      );
    }
  } catch {
    return null;
  }

  return null;
}

export async function resolveCandidateWebsite({
  record,
  companyName,
}: {
  record: RawSourceRecord;
  companyName: string;
}) {
  const fromText = extractCompanyWebsiteFromText(record.text, companyName);
  if (fromText) return fromText;

  const html = await fetchDiscoveryHtml(record.url);
  if (!html) return undefined;

  return (
    extractCompanyWebsiteFromHtml(html, companyName)
  );
}

export function extractCompanyWebsiteFromText(text: string, companyName: string) {
  const urls = Array.from(text.matchAll(/https?:\/\/[^\s"'<>]+/gi)).map(
    (match) => match[0]?.replace(/[),.;]+$/, "") ?? "",
  );

  return pickBestCompanyWebsite(urls, companyName);
}

export function extractCompanyWebsiteFromHtml(html: string, companyName: string) {
  const urls = Array.from(
    html.matchAll(/(?:href|content)=["'](https?:\/\/[^"']+)["']/gi),
  ).map((match) => decodeHtml(match[1] ?? ""));

  return pickBestCompanyWebsite(urls, companyName);
}

export async function fetchDiscoveryHtml(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "AI Atlas NYC discovery refresh (+https://aiatlas.nyc)",
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

export function mentionsNewYork(text: string) {
  return /\b(new york|nyc|brooklyn|manhattan|soho|flatiron|nomad|chelsea|new york-based|nyc-based|ny-based|based in new york|headquartered in new york)\b/i.test(
    text,
  );
}

const blockedWebsiteHosts = new Set([
  "gmpg.org",
  "w3.org",
  "schema.org",
  "ogp.me",
  "xmlns.com",
  "purl.org",
  "rdfs.org",
  "xml.org",
]);

function pickBestCompanyWebsite(urls: string[], companyName: string) {
  const slug = slugify(companyName);
  const scored = urls
    .map((url) => {
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
        if (!isUsableCompanyWebsite(url)) return null;
        if (blockedWebsiteHosts.has(host)) return null;
        if (publisherHostPattern.test(host)) return null;

        let score = 0;
        if (host === `${slug}.com` || host === `${slug}.ai`) score += 60;
        if (host.includes(slug)) score += 40;
        if (/\b(app|try|get|use)\./i.test(host)) score += 5;
        if (parsed.pathname !== "/" && parsed.pathname.length > 1) score -= 5;
        return { url: normalizeWebsiteUrl(parsed), score };
      } catch {
        return null;
      }
    })
    .filter((entry): entry is { url: string; score: number } => Boolean(entry))
    .sort((left, right) => right.score - left.score);

  if (!scored[0] || scored[0].score <= 0) {
    return undefined;
  }

  return scored[0].url;
}

function normalizeWebsiteUrl(url: URL) {
  url.hash = "";
  return url.toString();
}

function slugSegmentToName(value: string | undefined) {
  if (!value) return "";
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanInferredCompanyName(value: string) {
  return value
    .replace(/^the\s+/i, "")
    .replace(/\s+(?:has|raised|raises|secured|secures|announced|launches).*$/i, "")
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
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
    .trim();
}
