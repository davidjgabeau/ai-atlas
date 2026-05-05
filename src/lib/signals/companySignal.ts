import {
  generatedSignalLabels,
  type GeneratedSignalLabel,
} from "@/types/market";

type SignalCompany = {
  category: string;
  funding_amount?: string;
  funding_round?: string;
  generated?: {
    hook?: string;
    signalLabel?: string;
  };
  is_featured?: boolean;
  recent_activity_text?: string;
  short_description?: string;
  stage?: string;
  one_line_thesis?: string;
  why_it_matters?: string;
};

const allowedLabels = new Set<string>(generatedSignalLabels);

const bannedSignalLabelTerms = [
  "category depth",
  "deep category",
  "strong category fit",
  "high potential",
  "promising",
  "model-usage potential",
];

export function normalizeSignalLabel(
  value: string | null | undefined,
  company?: SignalCompany,
): GeneratedSignalLabel {
  const label = cleanLabel(value);
  if (label && allowedLabels.has(label)) return label as GeneratedSignalLabel;

  const normalized = label.toLowerCase();

  if (normalized === "featured") return "Featured";
  if (normalized === "breakout") {
    return company?.is_featured ? "Featured" : "Worth watching";
  }
  if (normalized === "recently added") return "Recently added";
  if (normalized === "consumer signal") return "Consumer signal";
  if (normalized === "enterprise signal") return "Enterprise signal";
  if (normalized === "funding signal") return "Funding signal";
  if (
    normalized === "infra bet" ||
    normalized === "infrastructure signal" ||
    normalized === "infrastructure"
  ) {
    return "Infra signal";
  }
  if (
    normalized === "product-led" ||
    normalized === "product led" ||
    normalized === "workflow" ||
    normalized === "workflow signal" ||
    normalized === "market signal" ||
    normalized === "category delta"
  ) {
    return "Workflow signal";
  }
  if (bannedSignalLabelTerms.some((term) => normalized.includes(term))) {
    return company ? inferCompanySignalLabel(company) : "Worth watching";
  }

  return company ? inferCompanySignalLabel(company) : "Worth watching";
}

export function getCompanySignalLabel(company: SignalCompany): GeneratedSignalLabel {
  if (company.is_featured) return "Featured";

  const generatedLabel = company.generated?.signalLabel;
  if (generatedLabel === "Recently added") return "Recently added";

  const normalized = normalizeSignalLabel(generatedLabel, company);
  if (normalized !== "Worth watching") return normalized;

  return inferCompanySignalLabel(company);
}

export function inferCompanySignalLabel(
  company: SignalCompany,
): GeneratedSignalLabel {
  if (company.is_featured) return "Featured";

  const text = getCompanySignalText(company);
  const category = company.category;

  if (hasFundingSignal(company)) {
    return "Funding signal";
  }

  if (
    category === "Agent Infrastructure" ||
    category === "Model Tools & Dev Platform" ||
    category === "Data & Memory Layer"
  ) {
    return "Infra signal";
  }

  if (category === "AI-Native Consumer & Social") {
    return "Consumer signal";
  }

  if (
    category === "Fintech & Trading AI" ||
    category === "Legal & Compliance AI" ||
    category === "Health & Clinical AI" ||
    matches(text, [
      "buyer",
      "customer",
      "clinician",
      "clinic",
      "finance team",
      "legal team",
      "government",
      "operator",
    ])
  ) {
    return "Clear buyer pull";
  }

  if (
    matches(text, [
      "workflow",
      "workflows",
      "automation",
      "automating",
      "operations",
      "back office",
      "review",
      "coordination",
      "production",
    ])
  ) {
    return "Workflow signal";
  }

  if (category === "Enterprise GTM & RevOps AI") {
    return "Enterprise signal";
  }

  return "Worth watching";
}

export function hasBannedSignalLabel(value: string | null | undefined) {
  const normalized = cleanLabel(value).toLowerCase();
  return bannedSignalLabelTerms.some((term) => normalized.includes(term));
}

export function getSignalPriority(label: string | null | undefined) {
  switch (normalizeSignalLabel(label)) {
    case "Featured":
      return 0;
    case "Funding signal":
      return 1;
    case "Clear buyer pull":
      return 2;
    case "Workflow signal":
      return 3;
    case "Consumer signal":
      return 4;
    case "Infra signal":
      return 5;
    case "Enterprise signal":
      return 6;
    case "Recently added":
      return 7;
    case "Worth watching":
      return 8;
  }
}

function cleanLabel(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function getCompanySignalText(company: SignalCompany) {
  return [
    company.category,
    company.stage,
    company.funding_round,
    company.funding_amount,
    company.generated?.hook,
    company.recent_activity_text,
    company.short_description,
    company.one_line_thesis,
    company.why_it_matters,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasFundingSignal(company: SignalCompany) {
  const activity = company.recent_activity_text?.toLowerCase() ?? "";
  return matches(activity, ["raised", "funding", "financing", "round"]);
}

function matches(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}
