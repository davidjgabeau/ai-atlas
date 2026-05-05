import type { AgentCompany } from "@/types/agent";

type CandidateValidationInput = {
  name: unknown;
  website?: unknown;
  sourceTitle?: unknown;
  sourceText?: unknown;
  reason?: unknown;
  requireWebsite?: boolean;
};

const relativeTimePattern =
  /\b\d+\s*(?:minutes?|mins?|hours?|hrs?|days?|weeks?)\s+ago\b/i;
const publisherPattern =
  /\b(techcrunch|venturebeat|crunchbase|bloomberg|wall street journal|wsj|strictlyvc|axios|the information)\b/i;
const articleShapePattern =
  /\b(article|byline|newsletter|reported by|written by|author|reporter|writer|minutes ago|hours ago|read more|subscribe)\b/i;
const headlineVerbPattern =
  /\b(raises?|raised|secures?|secured|lands?|launches|launched|announces?|announced|rumored|reports?|reported|says|hits|returns?)\b/i;
const fundStoryPattern =
  /\b(vc mega-funds|mega-funds|venture fund|fundraising for its fund|raising billions|new fund|closed its fund|closes? fund|general catalyst|spark capital)\b/i;
const investorOrFundNamePattern =
  /\b(ventures|capital|partners|fund|funds|vc|accelerator|studio)\b/i;

export function validateDiscoveredCompanyCandidate({
  name,
  website,
  sourceTitle,
  sourceText,
  reason,
  requireWebsite = false,
}: CandidateValidationInput): { ok: boolean; reason?: string } {
  if (typeof name !== "string") {
    return { ok: false, reason: "candidate name is missing" };
  }

  const cleanName = name.trim();
  const titleText = typeof sourceTitle === "string" ? sourceTitle.trim() : "";
  const text = normalizeWhitespace(
    [cleanName, sourceTitle, sourceText, reason].filter(Boolean).join("\n"),
  );
  const words = cleanName.split(/\s+/).filter(Boolean);

  if (cleanName.length < 2 || cleanName.length > 48) {
    return { ok: false, reason: "candidate name length is outside company bounds" };
  }

  if (words.length > 5) {
    return { ok: false, reason: "candidate name looks like an article headline" };
  }

  if (/[.!?]$/.test(cleanName)) {
    return { ok: false, reason: "candidate name ends like a sentence" };
  }

  if (
    relativeTimePattern.test(cleanName) ||
    (titleText.includes(cleanName) && relativeTimePattern.test(titleText))
  ) {
    return { ok: false, reason: "candidate includes article timestamp text" };
  }

  if (publisherPattern.test(cleanName)) {
    return { ok: false, reason: "candidate name includes a publisher" };
  }

  if (articleShapePattern.test(cleanName)) {
    return { ok: false, reason: "candidate name includes article byline language" };
  }

  if (headlineVerbPattern.test(cleanName)) {
    return { ok: false, reason: "candidate name includes headline verbs" };
  }

  if (fundStoryPattern.test(text) || looksLikeInvestorOrFund(cleanName, text)) {
    return { ok: false, reason: "source appears to describe a fund or investor story" };
  }

  if (isLikelyPersonByline(cleanName, text)) {
    return { ok: false, reason: "candidate name looks like an article byline" };
  }

  if (requireWebsite && !isUsableCompanyWebsite(website)) {
    return { ok: false, reason: "candidate has no usable company website" };
  }

  return { ok: true };
}

export function isValidPublishedCompany(company: Pick<
  AgentCompany,
  "name" | "website" | "description" | "oneSentenceDescription" | "sourceUrls"
>) {
  return validateDiscoveredCompanyCandidate({
    name: company.name,
    website: company.website,
    sourceText: [
      company.description,
      company.oneSentenceDescription,
      ...(company.sourceUrls ?? []),
    ].join("\n"),
    requireWebsite: true,
  }).ok;
}

export function isUsableCompanyWebsite(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;

  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    return Boolean(
      host &&
        !publisherPattern.test(host) &&
        !/\b(linkedin|twitter|x|facebook|instagram|youtube|medium|substack|crunchbase|techcrunch|venturebeat)\.com$/i.test(host),
    );
  } catch {
    return false;
  }
}

export function looksLikeInvestorOrFund(name: unknown, text: string) {
  const cleanName = typeof name === "string" ? name : "";

  return (
    investorOrFundNamePattern.test(cleanName) ||
    /\b(raises|raised|closed|closes|announced).{0,140}\b(fund|funds)\b/i.test(text)
  );
}

function isLikelyPersonByline(name: string, text: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  if (!words.every((word) => /^[A-Z][a-z.'-]+$/.test(word))) return false;

  if (
    /\b(ai|bio|biosciences|health|labs?|systems?|technologies|therapeutics|robotics|data|security)\b/i.test(
      name,
    )
  ) {
    return false;
  }

  return (
    relativeTimePattern.test(text) ||
    /\b(author|reporter|writer|editor)\b/i.test(text) ||
    new RegExp(`\\bby\\s+${escapeRegExp(name)}\\b`, "i").test(text) ||
    publisherPattern.test(text)
  );
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
