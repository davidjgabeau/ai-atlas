import type { Company, CompanyJob } from "@/types/market";

const maxCompanySummaryLength = 190;
const maxRoleSummaryLength = 230;

const weakSummaryPatterns = [
  /\b(apply now|apply for this job|view all jobs|back to jobs)\b/i,
  /\b(equal opportunity|reasonable accommodation|privacy policy)\b/i,
  /\b(sign in|create job alert|save job|share this job)\b/i,
  /\b(enable javascript|you need javascript|javascript to run this app)\b/i,
];

export function getCompanyJobSummary(company?: Pick<
  Company,
  "one_line_thesis" | "short_description"
>) {
  return truncateSummary(
    cleanSummaryText(company?.one_line_thesis || company?.short_description || ""),
    maxCompanySummaryLength,
  );
}

export function getJobRoleSummary(
  job: Pick<CompanyJob, "raw" | "role_summary" | "title">,
) {
  const rawSummary = getRawSummary(job.raw);
  return cleanJobSummaryForDisplay(
    job.role_summary || rawSummary,
    job.title,
    maxRoleSummaryLength,
  );
}

export function cleanJobSummaryForDisplay(
  value: string,
  title = "",
  maxLength = maxRoleSummaryLength,
) {
  const text = cleanSummaryText(value);
  if (!text) return "";

  const withoutTitle = title
    ? text.replace(new RegExp(`^${escapeRegExp(title)}\\s*[-:|]?\\s*`, "i"), "")
    : text;
  const summaryText = withoutTitle.replace(
    /^(about (the|this) role|role overview|what you'll do|what you will do|responsibilities)\s+/i,
    "",
  );
  const roleFocusedText = getRoleFocusedText(summaryText);
  const sentences = splitSentences(roleFocusedText)
    .map(stripRoleHeading)
    .filter(isUsefulSummarySentence);

  const preferredSentence =
    sentences.find((sentence) =>
      /\b(this role|the role|you will|you'll|responsible|build|looking for|seeking|work on)\b/i.test(
        sentence,
      ),
    ) ?? sentences[0];

  if (preferredSentence) return truncateSummary(preferredSentence, maxLength);
  if (!isViableFallbackSummary(roleFocusedText)) return "";

  return truncateSummary(roleFocusedText, maxLength);
}

export function extractJobSummaryFromHtml(html: string, title = "") {
  const structuredSummary = extractStructuredJobSummary(html, title);
  if (structuredSummary) return structuredSummary;

  const visibleSummary = cleanJobSummaryForDisplay(
    getVisibleTextNearTitle(html, title),
    title,
  );
  if (visibleSummary) return visibleSummary;

  const metaSummary = extractMetaSummary(html, title);
  if (metaSummary) return metaSummary;

  return "";
}

function extractStructuredJobSummary(html: string, title: string) {
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const parsed = safeJsonParse(decodeHtml(match[1].trim()));

    for (const item of flattenJsonLd(parsed)) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const type = Array.isArray(record["@type"])
        ? record["@type"].join(" ")
        : String(record["@type"] ?? "");
      if (!type.toLowerCase().includes("jobposting")) continue;

      const listingTitle = cleanSummaryText(String(record.title ?? ""));
      if (
        title &&
        listingTitle &&
        !titlesRoughlyMatch(listingTitle, title)
      ) {
        continue;
      }

      const summary = [
        record.description,
        record.responsibilities,
        record.qualifications,
        record.skills,
      ]
        .flatMap(toStringList)
        .join(" ");
      const cleanedSummary = cleanJobSummaryForDisplay(summary, title);
      if (cleanedSummary) return cleanedSummary;
    }
  }

  return "";
}

function extractMetaSummary(html: string, title: string) {
  for (const name of ["description", "og:description", "twitter:description"]) {
    const match = html.match(
      new RegExp(
        `<meta[^>]+(?:name|property)=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']+)["'][^>]*>`,
        "i",
      ),
    );
    const summary = match
      ? cleanJobSummaryForDisplay(decodeHtml(match[1]), title)
      : "";
    if (summary) return summary;
  }

  return "";
}

function getVisibleTextNearTitle(html: string, title: string) {
  const text = cleanSummaryText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|section|article)>/gi, ". ")
      .replace(/<br\s*\/?>/gi, ". ")
      .replace(/<[^>]*>/g, " "),
  );

  const roleHeading = text.match(
    /(about (the|this) role|role overview|what you'll do|what you will do|responsibilities)\s*:?/i,
  );
  if (roleHeading?.index !== undefined) {
    return text.slice(roleHeading.index, roleHeading.index + 3200);
  }

  if (!title) return text.slice(0, 2400);

  const titleIndex = text.toLowerCase().indexOf(title.toLowerCase());
  if (titleIndex < 0) return text.slice(0, 2400);

  return text.slice(titleIndex, titleIndex + 3200);
}

function getRawSummary(raw: Record<string, unknown>) {
  const candidates = [
    raw.roleSummary,
    raw.role_summary,
    raw.description,
    raw.summary,
    raw.jobDescription,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }

  return "";
}

function isUsefulSummarySentence(sentence: string) {
  if (sentence.length < 45 || sentence.length > 360) return false;
  return !weakSummaryPatterns.some((pattern) => pattern.test(sentence));
}

function stripRoleHeading(value: string) {
  return value
    .replace(
      /^(about (the|this) role|role overview|what you'll do|what you will do|responsibilities)\s+/i,
      "",
    )
    .trim();
}

function getRoleFocusedText(value: string) {
  const match = value.match(
    /(about (the|this) role|role overview|what you'll do|what you will do|responsibilities)\s*:?/i,
  );
  if (!match || match.index === undefined) return value;

  return value
    .slice(match.index + match[0].length, match.index + match[0].length + 2400)
    .replace(
      /^(salary range|salary|location|employment type|team)\s*:[\s\S]{0,180}?(?=\b[A-Z][a-z]+ (is|will)|\bYou will|\bWe are looking|\bWe're looking)/i,
      "",
    )
    .trim();
}

function isViableFallbackSummary(value: string) {
  const summary = value.trim();
  if (summary.length < 30) return false;
  return !weakSummaryPatterns.some((pattern) => pattern.test(summary));
}

function splitSentences(value: string) {
  return value
    .replace(/\s+([.!?])/g, "$1")
    .split(/(?<=[.!?])\s+/)
    .flatMap((chunk) => chunk.split(/\s+[•·]\s+/))
    .filter(Boolean);
}

function cleanSummaryText(value: string) {
  return decodeHtml(stripTags(value))
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function truncateSummary(value: string, maxLength: number) {
  const text = value.trim();
  if (text.length <= maxLength) return text;

  const sliced = text.slice(0, maxLength - 1);
  const boundary = Math.max(
    sliced.lastIndexOf("."),
    sliced.lastIndexOf(","),
    sliced.lastIndexOf(" "),
  );

  return `${sliced.slice(0, boundary > 80 ? boundary : sliced.length).trim()}...`;
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function flattenJsonLd(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  return [record, ...flattenJsonLd(record["@graph"])];
}

function toStringList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(toStringList);
  if (typeof value === "string") return [value];
  return [];
}

function titlesRoughlyMatch(left: string, right: string) {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);

  return (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
