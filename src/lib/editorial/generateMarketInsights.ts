import { getMarketInsightsSourceHash } from "@/lib/editorial/hash";
import type { Company, MarketInsight } from "@/types/market";

type InsightDraft = {
  id: string;
  title: string;
  body: string;
  supportingCompanyIds: string[];
};

const categoryNames: Record<Company["category"], string> = {
  "Fintech & Trading AI": "Finance AI",
  "Legal & Compliance AI": "Legal AI",
  "Cybersecurity AI": "Cybersecurity AI",
  "Media, Ads & Creative AI": "Creative AI",
  "Health & Clinical AI": "Health AI",
  "Life Sciences AI": "Life sciences AI",
  "AI-Native Consumer & Social": "Consumer AI",
  "Agent Infrastructure": "Agent infrastructure",
  "Model Tools & Dev Platform": "Model tooling",
  "Enterprise GTM & RevOps AI": "GTM AI",
  "Data & Memory Layer": "Data layers",
};

const categoryPhrases: Record<Company["category"], string> = {
  "Fintech & Trading AI": "finance AI",
  "Legal & Compliance AI": "legal and compliance workflows",
  "Cybersecurity AI": "security operations",
  "Media, Ads & Creative AI": "creative AI workflows",
  "Health & Clinical AI": "clinical operations",
  "Life Sciences AI": "drug discovery and biological modeling",
  "AI-Native Consumer & Social": "consumer AI behavior",
  "Agent Infrastructure": "agent infrastructure",
  "Model Tools & Dev Platform": "production AI tooling",
  "Enterprise GTM & RevOps AI": "revenue operations",
  "Data & Memory Layer": "data and memory layers",
};

export function generateMarketInsights(companies: Company[]): MarketInsight[] {
  const sourceCompanies = getInsightSourceCompanies(companies);
  if (sourceCompanies.length === 0) return [];

  const sourceHash = getMarketInsightsSourceHash(sourceCompanies);
  const generatedAt = new Date().toISOString();
  const drafts = [
    buildCategoryMomentum(sourceCompanies),
    buildBuyerMomentum(sourceCompanies),
    buildInterfacePattern(sourceCompanies),
  ];

  return drafts.map((draft) => ({
    id: draft.id,
    title: clampWords(draft.title, 8),
    body: clampText(draft.body, 130),
    supportingCompanyIds: withSupportFallback(
      draft.supportingCompanyIds,
      sourceCompanies,
    ),
    generatedAt,
    sourceCompanyIds: sourceCompanies.map((company) => company.id),
    sourceHash,
  }));
}

export function getInsightSourceCompanies(companies: Company[]) {
  const sortedCompanies = [...companies]
    .sort(
      (a, b) =>
        Math.max(
          new Date(b.recent_activity_date).getTime(),
          new Date(b.updated_at).getTime(),
          new Date(b.created_at).getTime(),
        ) -
        Math.max(
          new Date(a.recent_activity_date).getTime(),
          new Date(a.updated_at).getTime(),
          new Date(a.created_at).getTime(),
        ),
    )
    .filter((company) => company.status === "published");
  const editorialReadyCompanies = sortedCompanies.filter((company) =>
    [
      company.recent_activity_text,
      company.why_it_matters,
      company.short_description,
      company.one_line_thesis,
    ].some((value) => value.trim().length > 24),
  );

  return (editorialReadyCompanies.length > 0
    ? editorialReadyCompanies
    : sortedCompanies
  ).slice(0, 15);
}

function buildCategoryMomentum(companies: Company[]): InsightDraft {
  const categories = countBy(companies, (company) => company.category);
  const [category] = [...categories.entries()].sort((a, b) => b[1] - a[1])[0];
  const support = companies
    .filter((company) => company.category === category)
    .slice(0, 5);

  return {
    id: "category-momentum",
    title: `${categoryNames[category]} is clustering`,
    body: `${formatCompanyList(support)} make ${categoryPhrases[category]} the clearest cluster in the latest company notes.${latestSignalSentence(support)}`,
    supportingCompanyIds: support.map((company) => company.id),
  };
}

function buildBuyerMomentum(companies: Company[]): InsightDraft {
  const regulated = companies.filter((company) =>
    [
      "Fintech & Trading AI",
      "Legal & Compliance AI",
      "Health & Clinical AI",
    ].includes(company.category),
  );
  const enterprise = companies.filter((company) =>
    [
      "Enterprise GTM & RevOps AI",
      "Data & Memory Layer",
      "Agent Infrastructure",
      "Model Tools & Dev Platform",
    ].includes(company.category),
  );
  const support =
    regulated.length >= 2
      ? regulated.slice(0, 5)
      : (enterprise.length > 0 ? enterprise : companies).slice(0, 5);

  return {
    id: "buyer-momentum",
    title:
      regulated.length >= 2
        ? "Regulated buyers show depth"
        : "Enterprise workflows have depth",
    body:
      regulated.length >= 2
        ? `${formatCompanyList(support)} point to finance, legal, and health teams pulling AI into review-heavy workflows.${latestSignalSentence(support)}`
        : `${formatCompanyList(support)} point to repeat AI work inside revenue, data, and operations teams.${latestSignalSentence(support)}`,
    supportingCompanyIds: support.map((company) => company.id),
  };
}

function buildInterfacePattern(companies: Company[]): InsightDraft {
  const workflowCompanies = companies.filter((company) =>
    includesAny(company, ["workflow", "agent", "automation", "operations"]),
  );
  const contextCompanies = companies.filter((company) =>
    includesAny(company, ["document", "memory", "knowledge", "retrieval"]),
  );
  const support =
    workflowCompanies.length >= 2
      ? workflowCompanies.slice(0, 5)
      : (contextCompanies.length > 0 ? contextCompanies : companies).slice(0, 5);

  return {
    id: "interface-pattern",
    title:
      workflowCompanies.length >= 2
        ? "Workflows are the interface"
        : "Context layers keep showing up",
    body:
      workflowCompanies.length >= 2
        ? `${formatCompanyList(support)} show products organizing around repeat workflows rather than one-off generation.${latestSignalSentence(support)}`
        : `${formatCompanyList(support)} show retrieval, memory, and structured context becoming recurring AI infrastructure.${latestSignalSentence(support)}`,
    supportingCompanyIds: support.map((company) => company.id),
  };
}

function latestSignalSentence(companies: Company[]) {
  const company = companies.find((item) => item.recent_activity_text.trim());
  if (!company) return "";

  return ` Latest signal: ${company.name} - ${cleanSentence(
    company.recent_activity_text,
  )}.`;
}

function cleanSentence(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "")
    .trim();
}

function formatCompanyList(companies: Company[]) {
  const names = companies
    .slice(0, 3)
    .map((company) => company.name)
    .filter(Boolean);

  if (names.length === 0) return "Recent uploads";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;

  return `${names[0]}, ${names[1]}, and ${names[2]}`;
}

function withSupportFallback(ids: string[], companies: Company[]) {
  const uniqueIds = Array.from(new Set(ids));

  if (uniqueIds.length >= 2) {
    return uniqueIds.slice(0, 5);
  }

  return Array.from(
    new Set([...uniqueIds, ...companies.slice(0, 5).map((company) => company.id)]),
  ).slice(0, 5);
}

function includesAny(company: Company, terms: string[]) {
  const text = [
    company.short_description,
    company.one_line_thesis,
    company.why_it_matters,
    company.recent_activity_text,
    company.generated?.hook ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return terms.some((term) => text.includes(term));
}

function countBy<T, K>(items: T[], getKey: (item: T) => K) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<K, number>());
}

function clampWords(value: string, maxWords: number) {
  const words = value.split(/\s+/);
  return words.length <= maxWords ? value : words.slice(0, maxWords).join(" ");
}

function clampText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).replace(/\s+\S*$/, "").trim()}...`;
}
