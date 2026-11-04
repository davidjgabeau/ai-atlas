import { normalizeCompanyStage } from "../company-stages";
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
  hasPublishableDescription,
  validateDiscoveredCompanyCandidate,
} from "./companyCandidateValidation";
import {
  extractCompanyWebsiteFromHtml,
  inferCompanyNameFromRecord,
  mentionsNewYork,
  resolveCandidateWebsite,
} from "./discoverySourceUtils";
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
  sourceUrls?: string[];
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
  const limitedRecords = prioritizeDiscoveryRecords(records).slice(
    0,
    getCandidateExtractionLimit(),
  );
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
  const rawExtraction = anthropic ?? extractDeterministically(record);
  const extraction = rawExtraction
    ? await enrichCandidateExtraction(rawExtraction, record)
    : null;
  if (!extraction?.companyName) return null;

  const candidateCompanyName = cleanCompanyName(extraction.companyName);
  if (!candidateCompanyName || isExistingCompany(candidateCompanyName, existingCompanies)) {
    return null;
  }

  const category = normalizeCategory(extraction.category, record.text);
  const stage = normalizeStage(extraction.stage, record.text);
  const sourceUrls = uniqueStrings([
    record.url,
    ...(extraction.sourceUrls ?? []),
  ]);
  const candidateValidation = validateDiscoveredCompanyCandidate({
    name: candidateCompanyName,
    website: extraction.website,
    sourceTitle: record.title,
    sourceText: record.text,
    reason: extraction.reason,
  });
  if (!candidateValidation.ok) return null;

  const website =
    normalizeWebsite(extraction.website) ??
    normalizeWebsite(await resolveCandidateWebsite({ record, companyName: candidateCompanyName }));

  const proposedUpdate: Partial<AgentCompany> = {
    name: candidateCompanyName,
    slug: slugify(candidateCompanyName),
    website,
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

  const eligibility = getEligibility(extraction, proposedUpdate, record);
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
    reason: anthropic ? eligibility.reason : "Needs review: deterministic article extraction requires identity and profile verification.",
    autoPublishEligible: Boolean(anthropic) && eligibility.autoPublishEligible,
  };
}

function prioritizeDiscoveryRecords(records: RawSourceRecord[]) {
  return [...records].sort((a, b) => scoreDiscoveryRecord(b) - scoreDiscoveryRecord(a));
}

function scoreDiscoveryRecord(record: RawSourceRecord) {
  const title = record.title ?? "";
  const text = `${title}\n${record.text}`;
  let score = 0;

  if (record.sourceType === "press") score += 20;
  if (/\b(raised|raises|funding|financing|seed|series a|series b|pre-seed|preseed)\b/i.test(title)) {
    score += 45;
  } else if (/\b(raised|raises|funding|financing|seed|series a|series b|pre-seed|preseed)\b/i.test(text)) {
    score += 30;
  }
  if (/\b(ai|artificial intelligence|generative ai|genai|llm|agentic|machine learning)\b/i.test(text)) {
    score += 20;
  }
  if (/\b(new york|nyc|brooklyn|manhattan|soho|flatiron|nomad|chelsea)\b/i.test(text)) {
    score += 10;
  }
  if (/curated source page/i.test(text)) score -= 35;

  const publishedAt = record.publishedAt ? new Date(record.publishedAt) : null;
  if (publishedAt && !Number.isNaN(publishedAt.getTime())) {
    const ageDays = (Date.now() - publishedAt.getTime()) / 86_400_000;
    if (ageDays <= 14) score += 20;
    else if (ageDays <= 60) score += 10;
  }

  return score;
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
                "Extract one NYC AI company candidate at any stage from this article if present.",
              eligibleCategories: categories,
              eligibleStages: ["Pre-seed", "Seed", "Series A", "Series B", "Series C", "Series D", "Series E", "Series F", "Series G", "Series H", "Series I", "Series J", "Growth", "Public", "Acquired", "Unknown"],
              rules: [
                "nycBased is true only if the source explicitly supports New York City, NYC, Brooklyn, Manhattan, or a NYC neighborhood.",
                "aiCore is true only when AI, LLMs, agents, ML, generative AI, or model tooling is central to the product.",
                "Accept every stage: pre-seed, seed, Series A through J, growth, public, and acquired. If stage is unclear, set Unknown. Only mark NYC basis when the company itself has a documented NYC office or headquarters; an article mentioning NYC is not location evidence.",
                "Use one of the eligible categories exactly.",
                "companyName must be the company only, never an article title, byline, author name, timestamp, publisher, fund, or investor.",
                "If the source is mainly about a VC fund, investor, newsletter item, or broad market article, return no candidate.",
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
  const stage = normalizeStage(undefined, text);
  const companyName = cleanCompanyName(
    inferCompanyNameFromRecord(record) ??
      text.match(/^([A-Z][A-Za-z0-9 .&-]{1,48})\s+(?:raises|raised|secures|lands|launches|announces)/)?.[1] ??
      text.match(/\b([A-Z][A-Za-z0-9 .&-]{1,48})\s+(?:raised|raises|secured|launches|announced)\b/)?.[1] ??
      "",
  );

  if (!companyName || !validateDiscoveredCompanyCandidate({ name: companyName }).ok) {
    return null;
  }

  return {
    companyName,
    website: text.match(/https?:\/\/[^\s)"']+/)?.[0],
    location: /\b(new york|nyc|brooklyn|manhattan)\b/i.test(text)
      ? "New York, NY"
      : undefined,
    locationConfidence: /\b(headquartered|based in|new york-based|nyc-based)\b/i.test(text)
      ? "high"
      : "medium",
    stage,
    category: normalizeCategory(undefined, text),
    description: summarize(record.text, 360),
    oneSentenceDescription: summarize(record.text, 160),
    founders: extractNamesAfter(text, /founded by|co-founded by|founders? include/i),
    investors: extractNamesAfter(text, /led by|backed by|from investors including/i),
    funding: {
      latestRound: inferLatestFundingRound(text, stage),
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

async function enrichCandidateExtraction(
  extraction: CandidateExtraction,
  record: RawSourceRecord,
): Promise<CandidateExtraction> {
  const ycProfile = await fetchYCombinatorProfile(extraction, record);
  const announcementProfile = await fetchAnnouncementProfile(extraction, record);
  const merged = {
    ...extraction,
    companyName:
      ycProfile?.companyName ??
      announcementProfile?.companyName ??
      extraction.companyName,
    website:
      extraction.website ??
      ycProfile?.website ??
      announcementProfile?.website,
    location:
      extraction.location ??
      ycProfile?.location ??
      announcementProfile?.location,
    locationConfidence:
      ycProfile?.locationConfidence === "high" ||
      announcementProfile?.locationConfidence === "high"
        ? "high"
        : extraction.locationConfidence ??
          ycProfile?.locationConfidence ??
          announcementProfile?.locationConfidence,
    description:
      extraction.description ??
      ycProfile?.description ??
      announcementProfile?.description,
    oneSentenceDescription:
      extraction.oneSentenceDescription ??
      ycProfile?.oneSentenceDescription ??
      announcementProfile?.oneSentenceDescription,
    nycBased:
      extraction.nycBased ||
      ycProfile?.nycBased ||
      announcementProfile?.nycBased
        ? true
        : extraction.nycBased ??
          ycProfile?.nycBased ??
          announcementProfile?.nycBased,
    sourceUrls: uniqueStrings([
      ...(extraction.sourceUrls ?? []),
      ...(ycProfile?.sourceUrls ?? []),
      ...(announcementProfile?.sourceUrls ?? []),
    ]),
    reason: uniqueStrings([
      extraction.reason,
      ycProfile?.reason,
      announcementProfile?.reason,
    ]).join(" "),
  };

  return {
    ...merged,
    confidence: resolveDiscoveryConfidence(merged, record),
  };
}

async function fetchAnnouncementProfile(
  extraction: CandidateExtraction,
  record: RawSourceRecord,
): Promise<CandidateExtraction | null> {
  if (!/a16z\.com\/announcement\//i.test(record.url)) return null;

  const html = await fetchProfileHtml(record.url);
  if (!html) return null;

  const companyName =
    cleanCompanyName(extraction.companyName) ||
    cleanCompanyName(inferCompanyNameFromRecord(record) ?? "");
  if (!companyName) return null;

  const text = stripHtml(html);
  const website = extractCompanyWebsiteFromHtml(html, companyName);
  const locationIsNewYork = mentionsNewYork(text);

  return {
    companyName,
    website,
    location: locationIsNewYork ? "New York, NY" : undefined,
    locationConfidence: locationIsNewYork ? "high" : undefined,
    nycBased: locationIsNewYork ? true : undefined,
    sourceUrls: [record.url],
    reason: locationIsNewYork
      ? "Announcement page supports New York location."
      : "Announcement page parsed for company website.",
  };
}

function resolveDiscoveryConfidence(
  extraction: CandidateExtraction,
  record: RawSourceRecord,
) {
  if (extraction.confidence === "high" || hasFundingSignal(record.text)) {
    return "high" as const;
  }

  if (
    extraction.aiCore &&
    extraction.nycBased &&
    extraction.website &&
    validateDiscoveredCompanyCandidate({
      name: extraction.companyName,
      website: extraction.website,
      requireWebsite: true,
    }).ok
  ) {
    return "high" as const;
  }

  return normalizeConfidence(extraction.confidence);
}

async function fetchYCombinatorProfile(
  extraction: CandidateExtraction,
  record: RawSourceRecord,
): Promise<CandidateExtraction | null> {
  const evidenceText = [
    record.url,
    record.title,
    record.text,
    extraction.reason,
    ...(extraction.investors ?? []),
    ...(extraction.funding?.leadInvestors ?? []),
  ].join(" ");

  if (!/\b(y combinator|yc-backed|yc\b|ycombinator\.com)\b/i.test(evidenceText)) {
    return null;
  }

  const profileSlugs = getYCombinatorProfileSlugs(extraction.companyName);
  for (const slug of profileSlugs) {
    const url = `https://www.ycombinator.com/companies/${slug}`;
    const html = await fetchProfileHtml(url);
    if (!html) continue;

    const profile = parseYCombinatorProfile(html, url, extraction.companyName);
    if (profile) return profile;
  }

  return null;
}

function getYCombinatorProfileSlugs(companyName: string) {
  const baseSlug = slugify(companyName);
  const withoutAi = baseSlug.replace(/(?:-ai|ai)$/i, "");

  return uniqueStrings([baseSlug, withoutAi]).filter(Boolean).slice(0, 3);
}

async function fetchProfileHtml(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "AI Atlas NYC discovery refresh (+https://aiatlas.nyc)",
        accept: "text/html",
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

function parseYCombinatorProfile(
  html: string,
  url: string,
  candidateName: string,
): CandidateExtraction | null {
  const title = decodeHtml(
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "",
  );
  const profileName = cleanCompanyName(
    title
      .replace(/\s*\|.*$/i, "")
      .replace(/\s*:.*$/i, ""),
  );

  if (!profileName || !sameCompanyName(candidateName, profileName)) return null;

  const text = stripHtml(html);
  const metaDescription = decodeHtml(
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      "",
  );
  const evidenceText = `${metaDescription} ${text}`;
  const locationIsNewYork =
    /\bLocation:\s*New York\b/i.test(evidenceText) ||
    /\bbased in New York\b/i.test(evidenceText) ||
    /\bNew York,\s*NY\b/i.test(evidenceText);
  const website = extractExternalWebsite(html);
  const description =
    metaDescription ||
    text.match(new RegExp(`${escapeRegExp(profileName)}\\s+([^\\n.]+\\.)`, "i"))?.[1]?.trim();

  return {
    companyName: profileName,
    website,
    location: locationIsNewYork ? "New York, NY" : undefined,
    locationConfidence: locationIsNewYork ? "high" : undefined,
    description,
    oneSentenceDescription: description,
    nycBased: locationIsNewYork ? true : undefined,
    confidence: locationIsNewYork ? "high" : undefined,
    reason: locationIsNewYork
      ? "YC profile supports New York location."
      : "YC profile found for candidate.",
    sourceUrls: [url],
  };
}

function extractExternalWebsite(html: string) {
  const links = Array.from(
    html.matchAll(/(?:href|content)=["'](https?:\/\/[^"']+)["']/gi),
  )
    .map((match) => decodeHtml(match[1] ?? ""))
    .filter((url) => {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        return (
          host !== "ycombinator.com" &&
          !host.endsWith(".ycombinator.com") &&
          host !== "startupschool.org" &&
          !host.endsWith(".startupschool.org") &&
          !host.includes("bookface") &&
          !host.includes("amazonaws.com") &&
          !host.includes("google") &&
          !host.includes("gstatic") &&
          !/\b(twitter|x|facebook|instagram|linkedin|youtube)\.com$/i.test(host)
        );
      } catch {
        return false;
      }
    });

  return links[0];
}

function getEligibility(
  extraction: CandidateExtraction,
  proposedUpdate: Partial<AgentCompany>,
  record: RawSourceRecord,
) {
  const text = record.text;
  const sourceText = `${record.url} ${record.title ?? ""} ${record.text}`;
  const aiCore =
    extraction.aiCore ??
    /\b(ai|artificial intelligence|generative ai|llm|agentic|machine learning)\b/i.test(text);
  const nycBased =
    extraction.nycBased === true ||
    mentionsNewYork(text) ||
    mentionsNewYork(proposedUpdate.website ?? "");
  const categoryFit = Boolean(
    proposedUpdate.category && allowedCategories.has(proposedUpdate.category),
  );
  const enoughDescription = Boolean(
    hasPublishableDescription(proposedUpdate.oneSentenceDescription) || hasPublishableDescription(proposedUpdate.description),
  );
  const confidence = resolveDiscoveryConfidence(extraction, record);
  const cleanName = isCleanCandidateName(proposedUpdate.name);
  const hasWebsite = Boolean(proposedUpdate.website);
  const priorityFundingReview =
    !nycBased &&
    hasFundingSignal(text) &&
    /\b(a16z|andreessen horowitz|union square ventures|usv|y combinator|yc)\b/i.test(sourceText);
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
    categoryFit &&
    enoughDescription &&
    cleanName &&
    hasWebsite &&
    strictCandidateValidation.ok &&
    !investorOrFund &&
    confidence === "high";
  const shouldKeepForReview =
    (
      autoPublishEligible ||
      (
        aiCore &&
        (nycBased || priorityFundingReview) &&
        categoryFit &&
        cleanName &&
        candidateValidation.ok &&
        !investorOrFund
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
          !categoryFit ? "category fit unclear" : "",
          !cleanName ? "candidate name needs cleanup" : "",
          !hasWebsite ? "website not found" : "",
          !candidateValidation.ok ? candidateValidation.reason : "",
          !strictCandidateValidation.ok && confidence === "high"
            ? strictCandidateValidation.reason
            : "",
          investorOrFund ? "source appears to describe an investor or fund" : "",
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
  if (/\b(cyber|security|soc|threat|vulnerab|phishing|pentest|exposure)\b/.test(lower)) {
    return "Cybersecurity AI";
  }
  if (/life science|biotech|biology|biological|drug discovery|protein|molecule|therap/.test(lower)) {
    return "Life Sciences AI";
  }
  if (/finance|fintech|accounting|investment|trading|private market/.test(lower)) {
    return "Fintech & Trading AI";
  }
  if (/legal|law|compliance|regulation|contract/.test(lower)) {
    return "Legal & Compliance AI";
  }
  if (/health|clinical|patient|care|provider|therapy|medical/.test(lower)) {
    return "Health & Clinical AI";
  }
  if (/consumer|social media app|social network|social networking|family|personal assistant|companion|memory/.test(lower)) {
    return "AI-Native Consumer & Social";
  }
  if (/creative|media|video|advertis|brand|marketing|design/.test(lower)) {
    return "Media, Ads & Creative AI";
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
  const explicit = normalizeCompanyStage(typeof stage === "string" ? stage : "");
  return explicit !== "Unknown" ? explicit : normalizeCompanyStage(text);
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
    latestRound:
      funding?.latestRound ?? inferLatestFundingRound(record.text, stage),
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

function inferLatestFundingRound(text: string, stage: AgentCompanyStage) {
  if (stage !== "Unknown") return stage;
  if (/\bseries b\b/i.test(text)) return "Series B";
  return undefined;
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
  return companies.some((company) =>
    company.slug === slug ||
    company.name.toLowerCase() === normalizedName ||
    sameCompanyName(name, company.name),
  );
}

function sameCompanyName(left: string, right: string) {
  const normalizedLeft = normalizeComparableCompanyName(left);
  const normalizedRight = normalizeComparableCompanyName(right);

  return (
    normalizedLeft === normalizedRight ||
    stripGenericAiSuffix(normalizedLeft) === normalizedRight ||
    stripGenericAiSuffix(normalizedRight) === normalizedLeft
  );
}

function normalizeComparableCompanyName(value: string) {
  return value
    .toLowerCase()
    .replace(/\binc\.?\b|\bcorp\.?\b|\bco\.?\b|\bcompany\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripGenericAiSuffix(value: string) {
  return value.replace(/\s+ai$/i, "").trim();
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCandidateExtractionLimit() {
  const value = readNumericEnv("DISCOVERY_CANDIDATE_LIMIT", 12);
  return Math.max(1, Math.min(32, value));
}

function getCandidateExtractionConcurrency() {
  const value = readNumericEnv("DISCOVERY_EXTRACTION_CONCURRENCY", 3);
  return Math.max(1, Math.min(5, value));
}

function getAnthropicTimeoutMs() {
  const value = readNumericEnv("DISCOVERY_LLM_TIMEOUT_MS", 18_000);
  return Math.max(5_000, Math.min(45_000, value));
}

function readNumericEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}
