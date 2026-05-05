import type { CompanyEvent } from "@/types/agent";
import type { DiscoveryReason, InclusionReason } from "@/types/market";

import { hasBannedUserFacingPhrase, qualityGate } from "./qualityGate";

type CompanyLike = {
  id?: string;
  slug?: string;
  name?: string;
  category?: string;
  stage?: string;
  funding?: {
    latestRound?: string;
    latestRoundAmount?: string;
  };
  generated?: {
    hook?: string;
    signalLabel?: string;
    signalReason?: string;
    keywords?: string[];
    trendDimensions?: string[];
    generatedAt?: string;
    sourceHash?: string;
  };
  discoveryReason?: DiscoveryReason;
  inclusionReason?: InclusionReason;
  short_description?: string;
  one_line_thesis?: string;
  why_it_matters?: string;
  website?: string;
  website_url?: string;
  location?: string;
  locationConfidence?: "high" | "medium" | "low";
  description?: string;
  oneSentenceDescription?: string;
  subcategory?: string;
  sourceUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type GenerateInclusionReasonInput = {
  company: CompanyLike;
  triggeringEvents?: CompanyEvent[];
  categoryCounts?: Record<string, number>;
};

const categoryLabels: Record<string, string> = {
  "Fintech & Trading AI": "finance AI",
  "Legal & Compliance AI": "legal workflow AI",
  "Cybersecurity AI": "security operations AI",
  "Health & Clinical AI": "health AI",
  "Life Sciences AI": "life sciences AI",
  "Media, Ads & Creative AI": "creative AI",
  "AI-Native Consumer & Social": "consumer AI",
  "Agent Infrastructure": "agent infrastructure",
  "Data & Memory Layer": "data and memory infrastructure",
  "Model Tools & Dev Platform": "AI developer tools",
  "Enterprise GTM & Automation": "enterprise automation",
  "Enterprise GTM & RevOps AI": "enterprise automation",
};

export function generateInclusionReason({
  company,
  triggeringEvents = [],
}: GenerateInclusionReasonInput): InclusionReason {
  const existing = normalizeExistingInclusionReason(company.inclusionReason);
  if (existing && isSafeInclusionReason(existing, company)) return existing;

  const generatedAt = new Date().toISOString();
  const sourceEventIds = triggeringEvents.map((event) => event.id);
  const body = getSafeBody(company, triggeringEvents);

  return {
    title: "Why it was added",
    body,
    generatedAt,
    sourceEventIds,
    sourceCompanyIds: [safeString(company.id) || safeString(company.slug)].filter(Boolean),
  };
}

export function getInclusionReasonBody(company: CompanyLike) {
  return generateInclusionReason({ company }).body;
}

function getSafeBody(company: CompanyLike, triggeringEvents: CompanyEvent[]) {
  const candidates = [
    categorySpecificReason(company),
    eventSpecificReason(company, triggeringEvents),
    deterministicFallback(company),
    "Added: fits the map's focus on practical early-stage AI products in New York.",
  ].filter((item): item is string => Boolean(item));

  for (const candidate of candidates) {
    const body = normalizeBody(candidate);
    const item = {
      id: `inclusion-${safeString(company.id) || safeString(company.slug) || "company"}`,
      title: "Why it was added",
      body,
      companyId: safeString(company.id) || undefined,
      supportingCompanyIds: [safeString(company.id)].filter(Boolean),
      supportingEventIds: triggeringEvents.map((event) => event.id),
    };
    const gate = qualityGate(item, { allowNoEvent: true, allowNoCompany: true });

    if (gate.passed && !hasBannedUserFacingPhrase(body) && body.length <= 140) {
      return body;
    }
  }

  return "Added: fits the map's focus on practical early-stage AI products in New York.";
}

function eventSpecificReason(
  company: CompanyLike,
  triggeringEvents: CompanyEvent[],
) {
  const fundingEvent = triggeringEvents.find((event) => event.type === "funding");
  if (fundingEvent) {
    const stage = stageLabel(
      fundingEvent.extractedFacts.round || safeString(company.stage),
    );
    const category = categoryLabel(company.category);
    if (stage && category) {
      return `Added: ${stage} ${category} company with a clear early-market signal.`;
    }
  }

  const productEvent = triggeringEvents.find((event) => event.type === "product_launch");
  if (productEvent) {
    const category = categoryLabel(company.category);
    return category
      ? `Added: adds a concrete product signal in ${category}.`
      : undefined;
  }

  return undefined;
}

function categorySpecificReason(company: CompanyLike) {
  const text = [
    company.name,
    company.category,
    company.subcategory,
    company.stage,
    company.generated?.hook,
    company.description,
    company.oneSentenceDescription,
    company.short_description,
    company.one_line_thesis,
  ]
    .join(" ")
    .toLowerCase();

  if (/industrial|manufacturing|utilities|facility|facilities/.test(text)) {
    return "Added: brings industrial operations into focus.";
  }

  if (/household|family|families|calendar|coordination|daily logistics/.test(text)) {
    return "Added: brings consumer AI into repeated household coordination workflows.";
  }

  if (/social graph|social protocol|agentic products/.test(text)) {
    return "Added: expands the map's social graph infrastructure layer.";
  }

  if (/\baccounting\b|\baudit\b|\berp\b|\bspreadsheet\b|financial modeling/.test(text)) {
    return "Added: deepens AI-native finance and accounting coverage.";
  }

  if (/legal|law firm|compliance|contract|regulated/.test(text)) {
    return "Added: deepens legal workflow AI coverage.";
  }

  if (/health|clinical|care|psychiatry|clinician|patient/.test(text)) {
    return "Added: connects health AI to care delivery workflows.";
  }

  if (/developer|llm|eval|production|model/.test(text)) {
    return "Added: brings AI developer tooling closer to production teams.";
  }

  if (/memory|data|retrieval|graph|simulation|synthetic/.test(text)) {
    return "Added: deepens the data, memory, and research infrastructure layer.";
  }

  if (/creative|brand|search|answer engine|media|design/.test(text)) {
    return "Added: expands creative AI and brand intelligence coverage.";
  }

  if (/government|govtech|food distributor|operations|implementation|enterprise/.test(text)) {
    return "Added: brings operational back offices into focus.";
  }

  return undefined;
}

function deterministicFallback(company: CompanyLike) {
  const category = categoryLabel(company.category);
  const stage = stageLabel(safeString(company.stage));

  if (category && stage) {
    return `Added: ${stage} ${category} company with a clear early-market signal.`;
  }

  if (category) {
    return `Added: expands the map's ${category} coverage.`;
  }

  if (stage) {
    return "Added: fits the map's Series A-and-earlier scope.";
  }

  return "Added: fits the map's focus on practical early-stage AI products in New York.";
}

function categoryLabel(category?: string) {
  if (!category) return "";
  return categoryLabels[category] ?? category.replace(/\s*AI$/i, " AI").toLowerCase();
}

function stageLabel(stage?: string) {
  const normalized = safeString(stage).toLowerCase();
  if (!normalized || normalized === "unknown" || normalized === "n/a") return "";
  if (normalized.includes("series a") && normalized.includes("seed")) return "early-stage";
  if (normalized.includes("series a")) return "Series A";
  if (normalized.includes("pre-seed") || normalized.includes("preseed")) return "pre-seed";
  if (normalized.includes("seed")) return "seed-stage";
  if (normalized.includes("early")) return "early-stage";
  return "";
}

function normalizeBody(value: string) {
  const sentence = value.trim().replace(/\s+/g, " ");
  if (sentence.length <= 140) return sentence;

  const shorter = sentence.slice(0, 137).replace(/\s+\S*$/, "").trim();
  return `${shorter}.`;
}

function normalizeExistingInclusionReason(value: unknown): InclusionReason | null {
  if (!value || typeof value !== "object") return null;
  const reason = value as Partial<InclusionReason>;
  if (!reason.body) return null;

  return {
    title: safeString(reason.title) || "Why it was added",
    body: normalizeBody(reason.body),
    generatedAt: safeString(reason.generatedAt) || new Date().toISOString(),
    sourceEventIds: Array.isArray(reason.sourceEventIds) ? reason.sourceEventIds : [],
    sourceCompanyIds: Array.isArray(reason.sourceCompanyIds) ? reason.sourceCompanyIds : [],
  };
}

function isSafeInclusionReason(reason: InclusionReason, company: CompanyLike) {
  if (hasBannedUserFacingPhrase(`${reason.title} ${reason.body}`)) return false;
  if (reason.body.length > 160) return false;

  const gate = qualityGate(
    {
      id: `inclusion-existing-${safeString(company.id) || safeString(company.slug)}`,
      title: reason.title,
      body: reason.body,
      companyId: safeString(company.id) || undefined,
      supportingCompanyIds: reason.sourceCompanyIds,
      supportingEventIds: reason.sourceEventIds,
    },
    { allowNoEvent: true, allowNoCompany: true },
  );

  return gate.passed;
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
