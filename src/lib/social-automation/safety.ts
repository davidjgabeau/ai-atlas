import type { SocialCompany } from "@/types/social";

export type SocialSafetyResult = {
  passed: boolean;
  notes: string[];
  taggedHandles: string[];
};

const bannedPhrases = [
  "unlock",
  "leverage",
  "revolutionize",
  "cutting-edge",
  "disrupting",
  "heat index",
  "heating up",
  "joined the map",
  "added to ai atlas",
  "workflow depth",
  "gains density",
  "remains clearer",
  "database dump",
  "cron",
  "agent",
  "pipeline",
  "fallback",
  "refresh",
];

export function checkSocialPostSafety({
  text,
  companies,
  sourceUrls = [],
  recentTexts = [],
}: {
  text: string;
  companies: SocialCompany[];
  sourceUrls?: string[];
  recentTexts?: string[];
}): SocialSafetyResult {
  const notes: string[] = [];
  const clean = text.replace(/\s+/g, " ").trim();
  const lower = clean.toLowerCase();

  if (!clean) notes.push("Post text is empty.");
  if (clean.length > 280) notes.push(`Post is ${clean.length} characters.`);
  if (/^ai-powered\b/i.test(clean)) {
    notes.push("Post starts with banned phrase AI-powered.");
  }

  for (const phrase of bannedPhrases) {
    if (lower.includes(phrase)) {
      notes.push(`Contains banned phrase: ${phrase}.`);
    }
  }

  const hashtags = clean.match(/#[a-z0-9_]+/gi) ?? [];
  if (hashtags.length > 1) notes.push("Uses more than one hashtag.");

  const taggedHandles = getTaggedHandles(clean);
  const allowedHandles = new Set(
    companies
      .map((company) => normalizeHandle(company.x_handle))
      .filter(Boolean),
  );
  const unverifiedHandles = taggedHandles.filter(
    (handle) => !allowedHandles.has(normalizeHandle(handle)),
  );

  if (unverifiedHandles.length > 0) {
    notes.push(`Uses unverified handle(s): ${unverifiedHandles.join(", ")}.`);
  }
  if (taggedHandles.length > 3) notes.push("Tags more than three accounts.");

  if (hasTooManyEmoji(clean)) {
    notes.push("Uses too many emoji-like characters.");
  }

  for (const url of sourceUrls) {
    if (url && !/^https?:\/\/\S+\.\S+/i.test(url)) {
      notes.push(`Source link is not a valid URL: ${url}.`);
    }
  }

  if (isTooSimilarToRecentPost(clean, recentTexts)) {
    notes.push("Too similar to a recent social post.");
  }

  if (/\b(politics|war|lawsuit|scandal|layoff|layoffs)\b/i.test(clean)) {
    notes.push("Touches a sensitive or controversial topic.");
  }

  return {
    passed: notes.length === 0,
    notes,
    taggedHandles,
  };
}

function isTooSimilarToRecentPost(text: string, recentTexts: string[]) {
  const normalized = normalizeForSimilarity(text);
  if (!normalized) return false;

  return recentTexts.some((recentText) => {
    const recent = normalizeForSimilarity(recentText);
    if (!recent) return false;
    if (recent === normalized) return true;
    if (recent.includes(normalized) || normalized.includes(recent)) return true;

    const tokens = new Set(normalized.split(" ").filter((token) => token.length > 3));
    const recentTokens = new Set(recent.split(" ").filter((token) => token.length > 3));
    if (tokens.size === 0 || recentTokens.size === 0) return false;
    const overlap = [...tokens].filter((token) => recentTokens.has(token)).length;

    return overlap / Math.max(tokens.size, recentTokens.size) > 0.78;
  });
}

function normalizeForSimilarity(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[@#][a-z0-9_]+/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getTaggedHandles(text: string) {
  const handles = Array.from(text.matchAll(/@([a-zA-Z0-9_]{1,15})/g)).map(
    (match) => match[1],
  );

  return Array.from(new Set(handles.map(normalizeHandle).filter(Boolean)));
}

function normalizeHandle(value: string) {
  return value.replace(/^@/, "").trim().toLowerCase();
}

function hasTooManyEmoji(text: string) {
  const matches = text.match(/[\u{1F300}-\u{1FAFF}]/gu) ?? [];
  return matches.length > 1;
}
