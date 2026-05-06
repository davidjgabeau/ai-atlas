import type { EditorialItem } from "../../types/agent";

const bannedPhrases = [
  "revolutionizing",
  "cutting-edge",
  "unlock",
  "leverage",
  "game-changing",
  "disrupting",
  "ai-powered innovation",
  "heat index",
  "heating up",
  "high model usage potential",
  "exploding",
];

export const bannedUserFacingPhrases = [
  "agent",
  "cron",
  "pipeline",
  "refresh",
  "gathers more events",
  "fallback",
  "placeholder",
  "todo",
  "live signal",
  "while the system",
  "while the agent",
  "insufficient data",
  "not enough data",
  "this refresh uses",
  "as a live signal",
  "discovered by the system",
  "picked up",
  "added to ai atlas",
  "joined the map",
  "category depth",
  "deep category",
  "strong category fit",
  "high potential",
  "promising",
  "model-usage potential",
  "high model usage potential",
  "heat index",
  "gains density",
  "remains clearer",
  "workflow depth",
  "points to applied workflow depth",
  "operational automation",
  "recent signals from",
  "category is growing",
  "ai is expanding",
  "companies are clustering",
  "map is showing",
];

const genericPhrases = [
  "ai companies are building",
  "innovative workflows",
  "innovative ai company",
  "changing the future",
  "transforming industries",
  "rapidly evolving",
];

const weakCurrentReadTitles = [
  "applied workflows are leading",
  "vertical buyers remain clearer",
  "enterprise gtm gains density",
  "ai is growing",
  "the category is expanding",
  "companies are clustering",
];

const concreteUseCaseTerms = [
  "accounting",
  "analyst",
  "audit",
  "back office",
  "brand",
  "budget",
  "care delivery",
  "clinical",
  "compliance",
  "consumer",
  "creative production",
  "data",
  "developer",
  "distribution",
  "erp",
  "family",
  "finance",
  "food",
  "government",
  "health",
  "household",
  "implementation",
  "industrial",
  "infrastructure",
  "legal",
  "memory",
  "private markets",
  "production",
  "resident services",
  "social graph",
  "spreadsheets",
  "workflow",
];

export function qualityGate(
  item: EditorialItem,
  options: {
    allowNoEvent?: boolean;
    allowNoCompany?: boolean;
    maxBodyLength?: number;
  } = {},
) {
  const reasons: string[] = [];
  const text = `${item.title} ${item.body ?? ""} ${item.label ?? ""}`.toLowerCase();

  for (const phrase of bannedPhrases) {
    if (text.includes(phrase)) {
      reasons.push(`Banned phrase: ${phrase}`);
    }
  }

  for (const phrase of bannedUserFacingPhrases) {
    if (text.includes(phrase)) {
      reasons.push(`Internal user-facing phrase: ${phrase}`);
    }
  }

  for (const phrase of genericPhrases) {
    if (text.includes(phrase)) {
      reasons.push(`Generic phrase: ${phrase}`);
    }
  }

  if ((item.title?.length ?? 0) > 86) {
    reasons.push("Title is too long.");
  }

  if ((item.body?.length ?? 0) > (options.maxBodyLength ?? 180)) {
    reasons.push("Body is too long.");
  }

  if (!options.allowNoEvent && (item.supportingEventIds?.length ?? 0) === 0) {
    reasons.push("No supporting event.");
  }

  if (!options.allowNoCompany && !item.companyId && (item.supportingCompanyIds?.length ?? 0) === 0) {
    reasons.push("No company example.");
  }

  if (mentionsUnsupportedFunding(text, item)) {
    reasons.push("Mentions funding without a supporting event or company.");
  }

  return {
    passed: reasons.length === 0,
    reasons,
    suggestedRevision: reasons.length > 0 ? suggestRevision(item) : undefined,
  };
}

export function qualityGateCurrentRead(
  item: EditorialItem,
  options: {
    companyNames: string[];
    allowNoEvent?: boolean;
  },
) {
  const baseGate = qualityGate(item, {
    allowNoEvent: options.allowNoEvent,
    maxBodyLength: 280,
  });
  const reasons = [...baseGate.reasons];
  const title = item.title.toLowerCase();
  const body = (item.body ?? "").toLowerCase();
  const bodyAndTitle = `${title} ${body}`;
  const supportingCompanyCount = item.supportingCompanyIds?.length ?? 0;
  const mentionedCompanies = options.companyNames.filter((name) =>
    body.includes(name.toLowerCase()),
  );
  const hasConcreteUseCase = concreteUseCaseTerms.some((term) =>
    bodyAndTitle.includes(term),
  );
  const hasImplicationOrContrast =
    /\bbecause\b|\bnot\b|\brather than\b|\binstead of\b|\bsuggest\b|\bshow\b|\btarget\b|\bwhere\b/.test(
      body,
    );

  if (weakCurrentReadTitles.includes(title.trim())) {
    reasons.push("Current Read title is too abstract.");
  }

  if (item.title.trim().split(/\s+/).length > 10) {
    reasons.push("Current Read title is too long.");
  }

  if (/\b(and|or|but|with|between|into|from|to|for)\s*$/i.test(item.title.trim())) {
    reasons.push("Current Read title appears truncated.");
  }

  if (supportingCompanyCount === 0) {
    reasons.push("Current Read has no supporting company.");
  }

  if (supportingCompanyCount >= 2 && mentionedCompanies.length < 2) {
    reasons.push("Current Read body needs at least two company examples.");
  }

  if (supportingCompanyCount === 1 && mentionedCompanies.length === 0) {
    reasons.push("Current Read single-company signal must name the company.");
  }

  if (!hasConcreteUseCase) {
    reasons.push("Current Read body lacks a concrete buyer or workflow.");
  }

  const specificityScore =
    (mentionedCompanies.length > 0 ? 1 : 0) +
    (hasConcreteUseCase ? 1 : 0) +
    (hasImplicationOrContrast ? 1 : 0) -
    (hasBannedUserFacingPhrase(bodyAndTitle) ? 1 : 0) -
    (couldApplyToAnyCity(bodyAndTitle) ? 1 : 0);

  if (specificityScore < 2) {
    reasons.push("Current Read is not specific enough.");
  }

  if ((item.body?.length ?? 0) > 280) {
    reasons.push("Current Read body is too long.");
  }

  return {
    passed: reasons.length === 0,
    reasons,
    suggestedRevision: reasons.length > 0 ? suggestRevision(item) : undefined,
  };
}

export function hasBannedUserFacingPhrase(value: string) {
  const normalized = value.toLowerCase();
  return bannedUserFacingPhrases.some((phrase) => normalized.includes(phrase));
}

function mentionsUnsupportedFunding(text: string, item: EditorialItem) {
  return (
    /\$[\d,.]+|funding|series a|seed round|investor/.test(text) &&
    (item.supportingEventIds?.length ?? 0) === 0 &&
    !item.companyId
  );
}

function suggestRevision(item: EditorialItem) {
  const body = item.body
    ?.replace(/revolutionizing|cutting-edge|game-changing|disrupting/gi, "building")
    .replace(/unlock|leverage/gi, "use");

  return {
    ...item,
    body,
  };
}

function couldApplyToAnyCity(text: string) {
  return [
    "ai companies are growing",
    "the market is growing",
    "the ecosystem is expanding",
    "startups are building workflows",
    "companies are building ai",
  ].some((phrase) => text.includes(phrase));
}
