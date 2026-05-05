import type {
  AgentCompany,
  AgentCompanyStage,
  CandidateUpdate,
  Confidence,
  RawSourceRecord,
} from "@/types/agent";
import { categories } from "@/types/market";

import {
  looksLikeInvestorOrFund,
  validateDiscoveredCompanyCandidate,
} from "./companyCandidateValidation";
import { createId } from "./hash";

type CandidateExtraction = {
  companyName: string;
  website?: string;
  location?: string;
  locationConfidence?: Confidence;
  stage?: AgentCompanyStage;
  category?: string;
  subcategory?: string;
  description?: string;
  oneSentenceDescription?: string;
  founders?: string[];
  investors?: string[];
  funding?: {
    totalRaised?: string;
    latestRound?: string;
    latestRoundAmount?: string;
    latestRoundDate?: string;
    leadInvestors?: string[];
  };
  tags?: string[];
  aiCore?: boolean;
  nycBased?: boolean;
  earlyStage?: boolean;
  confidence?: Confidence;
  reason?: string;
};

export type DiscoveredCandidateProfile = {
  rawRecord: RawSourceRecord;
  proposedUpdate: Partial<AgentCompany>;
  candidateCompanyName: string;
  sourceUrls: string[];
  confidence: Confidence;
  reason: string;
  autoPublishEligible: boolean;
};

const anthropicMessagesUrl = "https://api.anthropic.com/v1/messages";
const anthropicVersion = "2023-06-01";
const defaultDiscoveryModel = "claude-sonnet-4-6";

const allowedCategories = new Set<string>(categories);

export async function extractCandidateProfiles({
  records,
  existingCompanies,
}: {
  records: RawSourceRecord[];
  existingCompanies: AgentCompany[];
}) {
  const profiles: DiscoveredCandidateProfile[] = [];
  const limitedRecords = records.slice(0, getCandidateExtractionLimit());
  const concurrency = getCandidateExtractionConcurrency();

  for (let index = 0; index < limitedRecords.length; index += concurrency) {
    const batch = limitedRecords.slice(index, index + concurrency);
    const extracted = await Promise.all(
      batch.map((record) => extractCandidateProfile(record, existingCompanies)),
    );

    profiles.push(...extracted.filter((profile): profile is DiscoveredCandidateProfile => Boolean(profile)));
  }

  return profiles;
}

export function profileToCandidateUpdate(
  profile: DiscoveredCandidateProfile,
): CandidateUpdate {
  return {
    id: createId("candidate_update", {
      name: profile.candidateCompanyName,
      sourceUrls: profile.sourceUrls,
      proposedUpdate: profile.proposedUpdate,
    }),
    candidateCompanyName: profile.candidateCompanyName,
    proposedUpdate: profile.proposedUpdate,
    reason: profile.reason,
    sourceUrls: profile.sourceUrls,
    confidence: profile.confidence,
    status: profile.autoPublishEligible ? "approved" : "pending",
    createdAt: new Date().toISOString(),
  };
}

async function extractCandidateProfile(
  record: RawSourceRecord,
  existingCompanies: AgentCompany[],
): Promise<DiscoveredCandidateProfile | null> {
  const anthropic = await extractWithAnthropic(record);
  const extraction = anthropic ?? extractDeterministically(record);
  if (!extraction?.companyName) return null;

  const candidateCompanyName = cleanCompanyName(extraction.companyName);
  if (!candidateCompanyName || isExistingCompany(candidateCompanyName, existingCompanies)) {
    return null;
  }

  const category = normalizeCategory(extraction.category, record.text);
  const stage = normalizeStage(extraction.stage, record.text);
  const sourceUrls = [record.url].filter(Boolean);
  const candidateValidation = validateDiscoveredCompanyCandidate({
    name: candidateCompanyName,
    website: extraction.website,
    sourceTitle: record.title,
    sourceText: record.text,
    reason: extraction.reason,
  });
  if (!candidateValidation.ok) return null;

  const proposedUpdate: Partial<AgentCompany> = {
    name: candidateCompanyName,
    slug: slugify(candidateCompanyName),
    website: normalizeWebsite(extraction.website),
    location: extraction.location || "New York, NY",
    locationConfidence: normalizeConfidence(extraction.locationConfidence),
    stage,
    category,
    subcategory: extraction.subcategory,
    description: summarize(
      extraction.description || record.text,
      420,
    ),
    oneSentenceDescription: summarize(
      extraction.oneSentenceDescription ||
        extraction.description ||
        record.text,
      180,
    ),
    founders: (extraction.founders ?? [])
      .filter(Boolean)
      .slice(0, 5)
      .map((name) => ({ name })),
    investors: uniqueStrings(extraction.investors ?? extraction.funding?.leadInvestors ?? []),
    funding: normalizeFunding(extraction.funding, stage, record),
    tags: uniqueStrings([
      category,
      ...(extraction.tags ?? []),
    ]).slice(0, 10),
    sourceUrls,
    verifiedAt: new Date().toISOString(),
    discoveryReason: {
      trigger: hasFundingSignal(record.text) ? "funding_signal" : "press_signal",
      sourceEventIds: [],
      sourceUrls,
      confidence: normalizeConfidence(extraction.confidence),
      notes: extraction.reason || `Candidate surfaced from ${record.title ?? record.url}.`,
    },
  };

  const eligibility = getEligibility(extraction, proposedUpdate, record.text);
  if (!eligibility.shouldKeepForReview) return null;

  const confidence = eligibility.autoPublishEligible
    ? "high"
    : normalizeConfidence(extraction.confidence);

  return {
    rawRecord: record,
    candidateCompanyName,
    proposedUpdate,
    sourceUrls,
    confidence,
    reason: eligibility.reason,
    autoPublishEligible: eligibility.autoPublishEligible,
  };
}

async function extractWithAnthropic(
  record: RawSourceRecord,
): Promise<CandidateExtraction | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || process.env.ENABLE_LLM_DISCOVERY === "false") return null;

  try {
    const response = await fetch(anthropicMessagesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": anthropicVersion,
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_DISCOVERY_MODEL ?? defaultDiscoveryModel,
        max_tokens: 1400,
        system:
          "You extract strict startup candidate profiles for AI Atlas NYC. Return only supported facts. Do not infer funding, stage, location, founders, or investors unless explicitly supported by the source text. If a field is unknown, omit it.",
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              task:
                "Extract one NYC-based early-stage AI startup candidate from this article if present.",
              eligibleCategories: categories,
              eligibleStages: ["Pre-seed", "Seed", "Series A", "Seed / Series A", "Unknown"],
              rules: [
                "nycBased is true only if the source explicitly supports New York City, NYC, Brooklyn, Manhattan, or a NYC neighborhood.",
                "aiCore is true only when AI, LLMs, agents, ML, generative AI, or model tooling is central to the product.",
                "earlyStage is true only for pre-seed, seed, or Series A. If stage is unclear, set Unknown and earlyStage false.",
                "Use one of the eligible categories exactly.",
                "companyName must be the company only, never an article title, byline, author name, timestamp, publisher, fund, or investor.",
                "If the source is mainly about a VC fund, investor, newsletter item, or broad market article, return no candidate.",
                "Do not include late-stage companies.",
                "Do not include companies already described as public, acquired, or beyond Series A.",
              ],
              source: {
                url: record.url,
                title: record.title,
                publishedAt: record.publishedAt,
                text: record.text.slice(0, 16_000),
              },
            }),
          },
        ],
        output_config: {
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              additionalProperties: false,
              required: [
                "companyName",
                "aiCore",
                "nycBased",
                "earlyStage",
                "confidence",
                "reason",
              ],
              properties: {
                companyName: { type: "string" },
                website: { type: "string" },
                location: { type: "string" },
                locationConfidence: { type: "string", enum: ["high", "medium", "low"] },
                stage: { type: "string" },
                category: { type: "string" },
                subcategory: { type: "string" },
                description: { type: "string" },
                oneSentenceDescription: { type: "string" },
                founders: { type: "array", items: { type: "string" } },
                investors: { type: "array", items: { type: "string" } },
                funding: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    totalRaised: { type: "string" },
                    latestRound: { type: "string" },
                    latestRoundAmount: { type: "string" },
                    latestRoundDate: { type: "string" },
                    leadInvestors: { type: "array", items: { type: "string" } },
                  },
                },
                tags: { type: "array", items: { type: "string" } },
                aiCore: { type: "boolean" },
                nycBased: { type: "boolean" },
                earlyStage: { type: "boolean" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
                reason: { type: "string" },
              },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(getAnthropicTimeoutMs()),
    });

    if (!response.ok) return null;
    const payload = await response.json() as Record<string, unknown>;
    const text = extractOutputText(payload);
    if (!text) return null;

    const parsed = JSON.parse(text) as CandidateExtraction;
    return parsed.companyName ? parsed : null;
  } catch {
    return null;
  }
}

function extractDeterministically(record: RawSourceRecord): CandidateExtraction | null {
  const text = `${record.title ?? ""} ${record.text}`;
  const companyName = cleanCompanyName(
    record.candidateCompanyName ??
      text.match(/^([A-Z][A-Za-z0-9 .&-]{1,48})\s+(?:raises|raised|secures|lands|launches|announces)/)?.[1] ??
      text.match(/\b([A-Z][A-Za-z0-9 .&-]{1,48})\s+(?:raised|raises|secured|launches|announced)\b/)?.[1] ??
      "",
  );

  if (!companyName) return null;

  return {
    companyName,
    website: text.match(/https?:\/\/[^\s)"']+/)?.[0],
    location: /\b(new york|nyc|brooklyn|manhattan)\b/i.test(text)
      ? "New York, NY"
      : undefined,
    locationConfidence: /\b(headquartered|based in|new york-based|nyc-based)\b/i.test(text)
      ? "high"
      : "medium",
    stage: normalizeStage(undefined, text),
    category: normalizeCategory(undefined, text),
    description: summarize(record.text, 360),
    oneSentenceDescription: summarize(record.text, 160),
    founders: extractNamesAfter(text, /founded by|co-founded by|founders? include/i),
    investors: extractNamesAfter(text, /led by|backed by|from investors including/i),
    funding: {
      latestRound: normalizeStage(undefined, text),
      latestRoundAmount: text.match(/\$[\d,.]+(?:\s?(?:m|million|b|billion))?/i)?.[0],
      latestRoundDate: record.publishedAt,
      leadInvestors: extractNamesAfter(text, /led by|backed by/i),
    },
    tags: [],
    aiCore: /\b(ai|artificial intelligence|generative ai|llm|agentic|machine learning)\b/i.test(text),
    nycBased: /\b(new york|nyc|brooklyn|manhattan)\b/i.test(text),
    earlyStage: /\b(pre-seed|preseed|seed|series a)\b/i.test(text),
    confidence: "medium",
    reason: "Deterministic extraction from press coverage.",
  };
}

function getEligibility(
  extraction: CandidateExtraction,
  proposedUpdate: Partial<AgentCompany>,
  text: string,
) {
  const aiCore =
    extraction.aiCore ??
    /\b(ai|artificial intelligence|generative ai|llm|agentic|machine learning)\b/i.test(text);
  const nycBased =
    extraction.nycBased ?? /\b(new york|nyc|brooklyn|manhattan)\b/i.test(text);
  const earlyStage =
    extraction.earlyStage ??
    ["Pre-seed", "Seed", "Series A", "Seed / Series A"].includes(
      proposedUpdate.stage ?? "Unknown",
    );
  const categoryFit = Boolean(
    proposedUpdate.category && allowedCategories.has(proposedUpdate.category),
  );
  const enoughDescription = Boolean(
    proposedUpdate.oneSentenceDescription || proposedUpdate.description,
  );
  const confidence = normalizeConfidence(extraction.confidence);
  const lateStage = /\b(series b|series c|series d|growth round|ipo|public company|acquired)\b/i.test(text);
  const cleanName = isCleanCandidateName(proposedUpdate.name);
  const hasWebsite = Boolean(proposedUpdate.website);
  const candidateValidation = validateDiscoveredCompanyCandidate({
    name: proposedUpdate.name,
    website: proposedUpdate.website,
    sourceText: text,
    requireWebsite: false,
  });
  const strictCandidateValidation = validateDiscoveredCompanyCandidate({
    name: proposedUpdate.name,
    website: proposedUpdate.website,
    sourceText: text,
    requireWebsite: true,
  });
  const investorOrFund = looksLikeInvestorOrFund(proposedUpdate.name, text);
  const autoPublishEligible =
    aiCore &&
    nycBased &&
    earlyStage &&
    categoryFit &&
    enoughDescription &&
    cleanName &&
    hasWebsite &&
    strictCandidateValidation.ok &&
    !investorOrFund &&
    !lateStage &&
    confidence === "high";
  const shouldKeepForReview =
    (
      autoPublishEligible ||
      (
        aiCore &&
        nycBased &&
        categoryFit &&
        cleanName &&
        candidateValidation.ok &&
        !investorOrFund &&
        !lateStage
      )
    ) &&
    confidence !== "low";

  return {
    autoPublishEligible,
    shouldKeepForReview,
    reason: autoPublishEligible
      ? `Auto-approved: source supports NYC, AI-core product, ${proposedUpdate.stage} stage, and ${proposedUpdate.category} fit.`
      : `Needs review: ${[
          !nycBased ? "NYC basis unclear" : "",
          !aiCore ? "AI-core product unclear" : "",
          !earlyStage ? "stage is not clearly early" : "",
          !categoryFit ? "category fit unclear" : "",
          !cleanName ? "candidate name needs cleanup" : "",
          !hasWebsite ? "website not found" : "",
          !candidateValidation.ok ? candidateValidation.reason : "",
          !strictCandidateValidation.ok && confidence === "high"
            ? strictCandidateValidation.reason
            : "",
          investorOrFund ? "source appears to describe an investor or fund" : "",
          lateStage ? "late-stage language found" : "",
        ].filter(Boolean).join("; ") || "confidence below auto-publish threshold"}.`,
  };
}

function isCleanCandidateName(name: unknown) {
  if (typeof name !== "string") return false;

  const clean = name.trim();
  const words = clean.split(/\s+/);

  return (
    clean.length >= 2 &&
    clean.length <= 48 &&
    words.length <= 5 &&
    !/[.!?]$/.test(clean) &&
    validateDiscoveredCompanyCandidate({ name: clean }).ok
  );
}

function normalizeCategory(category: unknown, text: string) {
  if (typeof category === "string" && allowedCategories.has(category)) {
    return category;
  }

  const lower = text.toLowerCase();
  if (/finance|fintech|accounting|investment|trading|private market/.test(lower)) {
    return "Fintech & Trading AI";
  }
  if (/legal|law|compliance|regulation|contract/.test(lower)) {
    return "Legal & Compliance AI";
  }
  if (/health|clinical|patient|care|provider|therapy|medical/.test(lower)) {
    return "Health & Clinical AI";
  }
  if (/creative|media|video|advertis|brand|marketing|design/.test(lower)) {
    return "Media, Ads & Creative AI";
  }
  if (/consumer|social|family|personal assistant|companion|memory/.test(lower)) {
    return "AI-Native Consumer & Social";
  }
  if (/agent infrastructure|agentic|orchestration|runtime|workflow infrastructure/.test(lower)) {
    return "Agent Infrastructure";
  }
  if (/developer|devtool|llm app|eval|model tooling|platform/.test(lower)) {
    return "Model Tools & Dev Platform";
  }
  if (/data|memory|retrieval|knowledge graph|synthetic|research/.test(lower)) {
    return "Data & Memory Layer";
  }
  return "Enterprise GTM & RevOps AI";
}

function normalizeStage(stage: unknown, text: string): AgentCompanyStage {
  const value = `${typeof stage === "string" ? stage : ""} ${text}`.toLowerCase();
  if (value.includes("series a") && value.includes("seed")) return "Seed / Series A";
  if (value.includes("series a")) return "Series A";
  if (value.includes("pre-seed") || value.includes("preseed")) return "Pre-seed";
  if (value.includes("seed")) return "Seed";
  return "Unknown";
}

function normalizeFunding(
  funding: CandidateExtraction["funding"],
  stage: AgentCompanyStage,
  record: RawSourceRecord,
) {
  const amount =
    funding?.latestRoundAmount ??
    record.text.match(/\$[\d,.]+(?:\s?(?:m|million|b|billion))?/i)?.[0];

  return {
    totalRaised: funding?.totalRaised,
    latestRound: funding?.latestRound ?? (stage !== "Unknown" ? stage : undefined),
    latestRoundAmount: amount,
    latestRoundDate: funding?.latestRoundDate ?? record.publishedAt,
    leadInvestors: funding?.leadInvestors,
  };
}

function extractOutputText(payload: Record<string, unknown>) {
  const content = Array.isArray(payload.content) ? payload.content : [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const text = (item as { text?: unknown }).text;
    if (typeof text === "string") return text;
  }
  return "";
}

function extractNamesAfter(text: string, pattern: RegExp) {
  const match = text.match(new RegExp(`${pattern.source}\\s+([^.]+)`, "i"));
  if (!match?.[1]) return [];

  return match[1]
    .split(/,| and |;|\n/)
    .map((item) => cleanCompanyName(item))
    .filter(Boolean)
    .slice(0, 6);
}

function cleanCompanyName(value: string) {
  return value
    .replace(/^the\s+/i, "")
    .replace(/\s+(?:has|raised|raises|secured|secures|announced|launches).*$/i, "")
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function isExistingCompany(name: string, companies: AgentCompany[]) {
  const slug = slugify(name);
  const normalizedName = name.toLowerCase();
  return companies.some(
    (company) =>
      company.slug === slug || company.name.toLowerCase() === normalizedName,
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function normalizeWebsite(value?: string) {
  if (!value) return undefined;
  try {
    return /^https?:\/\//i.test(value)
      ? new URL(value).toString()
      : new URL(`https://${value}`).toString();
  } catch {
    return undefined;
  }
}

function normalizeConfidence(value: unknown): Confidence {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

function hasFundingSignal(text: string) {
  return /\b(raised|funding|financing|seed|series a|pre-seed|preseed|led by)\b/i.test(text);
}

function summarize(text: string, maxLength: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).replace(/\s+\S*$/, "").trim()}…`;
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean))) as string[];
}

function getCandidateExtractionLimit() {
  const value = Number(process.env.DISCOVERY_CANDIDATE_LIMIT ?? 8);
  return Number.isFinite(value) ? Math.max(1, Math.min(24, value)) : 8;
}

function getCandidateExtractionConcurrency() {
  const value = Number(process.env.DISCOVERY_EXTRACTION_CONCURRENCY ?? 3);
  return Number.isFinite(value) ? Math.max(1, Math.min(5, value)) : 3;
}

function getAnthropicTimeoutMs() {
  const value = Number(process.env.DISCOVERY_LLM_TIMEOUT_MS ?? 18_000);
  return Number.isFinite(value) ? Math.max(5_000, Math.min(45_000, value)) : 18_000;
}
