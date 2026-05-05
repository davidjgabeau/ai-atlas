import type { AgentCompany, CompanyEvent, EditorialItem } from "../../types/agent";
import { createId } from "./hash";
import { qualityGateCurrentRead } from "./qualityGate";

type CurrentReadFallbackInput = {
  companies: AgentCompany[];
  recentCompanies: AgentCompany[];
  categoryCounts: Record<string, number>;
  events?: CompanyEvent[];
};

type MemoPattern = "market_shift" | "buyer_pattern" | "product_pattern";

const workflowBySlug: Record<string, string> = {
  anchr: "food distribution",
  aaru: "synthetic research",
  auctor: "enterprise software implementation",
  "bevel": "wearable health",
  "blossom-health": "telepsychiatry operations",
  artemis: "security operations",
  astelia: "exposure management",
  cvector: "industrial facilities",
  dualentry: "accounting and ERP",
  flora: "creative production",
  foresight: "private-market investing",
  ghosteye: "human-layer security testing",
  "jimini-health": "care delivery",
  "manifest-os": "legal services",
  meridian: "spreadsheets and financial modeling",
  modus: "accounting and audit",
  "ohai-ai": "household coordination",
  "output-biosciences": "large biological models",
  polimorphic: "government services",
  profound: "AI search visibility",
  "proxima-bio": "proximity-based drug discovery",
  "serinus-biosciences": "cancer combination therapy",
  tapestry: "social graphs",
  "thread-ai": "enterprise AI workflows",
  vellum: "LLM production tooling",
};

export const currentReadGeneratorPrompt = `You are writing a concise market memo for AI Atlas NYC, a map of early-stage NYC AI startups from pre-seed through Series A. The reader is either a curious person trying to understand early-stage NYC AI or a VC analyst scanning for signal. Do not write generic trend summaries. Make specific claims based on the companies provided. Each insight should teach the reader something they would not get from a category count. Mention concrete companies as evidence. Prefer contrasts, implications, and buyer/workflow specificity.

Return JSON only as an object with an items array:
{
  "items": [
    {
      "title": "...",
      "body": "...",
      "supportingCompanyIds": ["..."],
      "supportingEventIds": ["..."]
    }
  ]
}`;

export function generateCurrentReadFallback({
  companies,
  recentCompanies,
  categoryCounts,
  events = [],
}: CurrentReadFallbackInput): EditorialItem[] {
  const sortedCompanies = uniqueById([
    ...recentCompanies,
    ...sortRecentCompanies(companies),
  ]);
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const eventsByCompany = groupEventsByCompany(events);

  const candidates = [
    createMarketShiftInsight(sortedCompanies, categoryCounts, eventsByCompany),
    createBuyerPatternInsight(sortedCompanies, companies, eventsByCompany),
    createProductPatternInsight(sortedCompanies, companies, eventsByCompany),
  ].filter((item): item is EditorialItem => item !== null);

  return completeWithSpecificDefaults(candidates, sortedCompanies, companyById);
}

export function getStaticCurrentReadDefaults(
  companies: AgentCompany[] = [],
): EditorialItem[] {
  return completeWithSpecificDefaults([], sortRecentCompanies(companies), new Map());
}

function createMarketShiftInsight(
  companies: AgentCompany[],
  categoryCounts: Record<string, number>,
  eventsByCompany: Map<string, CompanyEvent[]>,
): EditorialItem | null {
  const selected = selectCompanies(companies, [
    { slugs: ["cvector", "anchr", "polimorphic"] },
    { keywords: ["industrial", "food distribution", "government", "resident services"] },
    { categories: ["Enterprise GTM & RevOps AI"] },
  ]);

  if (selected.length < 2) return null;

  const workflows = selected.slice(0, 3).map(getWorkflow);
  const categoryCount = Object.keys(categoryCounts).length;
  const body =
    selected.length >= 3
      ? `${formatNames(selected)} show AI moving into ${formatList(workflows)}, where workflows are specific and budgeted.`
      : `${formatNames(selected)} suggest the map is expanding beyond software teams into ${formatList(workflows)}.`;

  return createMemoItem({
    type: "market_shift",
    title: categoryCount > 0 ? "Back-office AI is moving offline" : "AI is entering operational back offices",
    body,
    companies: selected,
    eventsByCompany,
    label: "Workflow signal",
  });
}

function createBuyerPatternInsight(
  recentCompanies: AgentCompany[],
  allCompanies: AgentCompany[],
  eventsByCompany: Map<string, CompanyEvent[]>,
): EditorialItem | null {
  const selected = selectCompanies([...recentCompanies, ...allCompanies], [
    { slugs: ["polimorphic", "dualentry", "auctor"] },
    { keywords: ["accounting", "erp", "implementation", "government", "compliance", "legal", "finance"] },
    {
      categories: [
        "Fintech & Trading AI",
        "Legal & Compliance AI",
        "Cybersecurity AI",
        "Health & Clinical AI",
        "Life Sciences AI",
        "Enterprise GTM & RevOps AI",
      ],
    },
  ]);

  if (selected.length < 2) return null;

  const body =
    selected.length >= 3
      ? `${formatNames(selected)} target buyers with defined budgets and painful implementation work, not broad AI tooling.`
      : `${formatNames(selected)} point to buyers who already pay for ${formatList(selected.map(getWorkflow))}.`;

  return createMemoItem({
    type: "buyer_pattern",
    title: "Specific buyers still beat broad tools",
    body,
    companies: selected,
    eventsByCompany,
    label: "Clear buyer pull",
  });
}

function createProductPatternInsight(
  recentCompanies: AgentCompany[],
  allCompanies: AgentCompany[],
  eventsByCompany: Map<string, CompanyEvent[]>,
): EditorialItem | null {
  const selected = selectCompanies([...recentCompanies, ...allCompanies], [
    { slugs: ["tapestry", "jimini-health", "flora"] },
    { slugs: ["ohai-ai", "bevel", "profound"] },
    { keywords: ["social graph", "care delivery", "creative production", "household", "wearable", "brand"] },
    {
      categories: [
        "AI-Native Consumer & Social",
        "Health & Clinical AI",
        "Life Sciences AI",
        "Media, Ads & Creative AI",
      ],
    },
  ]);

  if (selected.length < 2) return null;

  const body =
    selected.length >= 3
      ? `${formatNames(selected)} wrap AI around repeated behavior: ${formatList(selected.map(getWorkflow))}.`
      : `${formatNames(selected)} suggest repeated use matters more than one-off prompting.`;

  return createMemoItem({
    type: "product_pattern",
    title: "Workflow-first beats chat-first",
    body,
    companies: selected,
    eventsByCompany,
    label: "Consumer signal",
  });
}

function createMemoItem({
  type,
  title,
  body,
  companies,
  eventsByCompany,
  label,
}: {
  type: MemoPattern;
  title: string;
  body: string;
  companies: AgentCompany[];
  eventsByCompany: Map<string, CompanyEvent[]>;
  label: string;
}): EditorialItem {
  const selected = uniqueById(companies).slice(0, 3);
  const supportingEventIds = selected.flatMap((company) =>
    (eventsByCompany.get(company.id) ?? []).slice(0, 2).map((event) => event.id),
  );

  return {
    id: createId("current_read_specific", {
      type,
      companyIds: selected.map((company) => company.id),
      body,
    }),
    title: trimTitle(title),
    body: trimBody(body),
    label,
    supportingCompanyIds: selected.map((company) => company.id),
    supportingEventIds,
    score: selected.length,
  } satisfies EditorialItem;
}

function completeWithSpecificDefaults(
  items: EditorialItem[],
  companies: AgentCompany[],
  companyById: Map<string, AgentCompany>,
) {
  const completed: EditorialItem[] = [];
  const fallbackItems = [
    createFinanceFallback(companies),
    createInfrastructureFallback(companies),
    createHealthcareFallback(companies),
  ].filter((item): item is EditorialItem => item !== null);

  for (const item of [...items, ...fallbackItems]) {
    if (completed.length === 3) break;
    if (completed.some((existing) => existing.title === item.title)) continue;

    const supportedCompanies = (item.supportingCompanyIds ?? [])
      .map((id) => companyById.get(id) ?? companies.find((company) => company.id === id))
      .filter((company): company is AgentCompany => Boolean(company));
    const gate = qualityGateCurrentRead(item, {
      allowNoEvent: true,
      companyNames: supportedCompanies.map((company) => company.name),
    });

    if (gate.passed) completed.push(item);
  }

  return completed.slice(0, 3);
}

function createFinanceFallback(companies: AgentCompany[]): EditorialItem | null {
  const selected = selectCompanies(companies, [
    { slugs: ["meridian", "dualentry", "foresight", "modus"] },
    { keywords: ["spreadsheets", "accounting", "private markets", "analyst", "audit"] },
    { categories: ["Fintech & Trading AI"] },
  ]);

  if (selected.length < 2) return null;

  return createMemoItem({
    type: "buyer_pattern",
    title: "Finance AI is becoming analyst infrastructure",
    body: `${formatNames(selected)} target ${formatList(selected.map(getWorkflow))} rather than generic copilots.`,
    companies: selected,
    eventsByCompany: new Map(),
    label: "Clear buyer pull",
  });
}

function createInfrastructureFallback(companies: AgentCompany[]): EditorialItem | null {
  const selected = selectCompanies(companies, [
    { slugs: ["tapestry", "vellum", "thread-ai"] },
    { keywords: ["social graphs", "llm production", "enterprise ai workflows", "developer"] },
    { categories: ["Agent Infrastructure", "Data & Memory Layer", "Model Tools & Dev Platform"] },
  ]);

  if (selected.length < 2) return null;

  return createMemoItem({
    type: "product_pattern",
    title: "Infrastructure is moving closer to applications",
    body: `${formatNames(selected)} show infrastructure getting shaped around product builders, production apps, and workflow orchestration.`,
    companies: selected,
    eventsByCompany: new Map(),
    label: "Infra signal",
  });
}

function createHealthcareFallback(companies: AgentCompany[]): EditorialItem | null {
  const selected = selectCompanies(companies, [
    { slugs: ["jimini-health", "bevel", "blossom-health"] },
    { keywords: ["care delivery", "wearable health", "telepsychiatry", "clinical", "biological", "drug discovery"] },
    { categories: ["Health & Clinical AI", "Life Sciences AI"] },
  ]);

  if (selected.length < 2) return null;

  return createMemoItem({
    type: "market_shift",
    title: "Healthcare AI is getting operational",
    body: `${formatNames(selected)} move AI toward ${formatList(selected.map(getWorkflow))}, where repeat use matters more than novelty.`,
    companies: selected,
    eventsByCompany: new Map(),
    label: "Workflow signal",
  });
}

function selectCompanies(
  companies: AgentCompany[],
  passes: Array<{
    slugs?: string[];
    keywords?: string[];
    categories?: string[];
  }>,
) {
  const selected: AgentCompany[] = [];

  for (const pass of passes) {
    for (const company of companies) {
      if (selected.some((item) => item.id === company.id)) continue;

      if (pass.slugs?.includes(company.slug)) {
        selected.push(company);
      } else if (pass.categories?.includes(company.category)) {
        selected.push(company);
      } else if (pass.keywords?.some((keyword) => companyText(company).includes(keyword))) {
        selected.push(company);
      }

      if (selected.length === 3) return selected;
    }
  }

  return selected.slice(0, 3);
}

function getWorkflow(company: AgentCompany) {
  if (workflowBySlug[company.slug]) return workflowBySlug[company.slug];

  const text = companyText(company);
  if (text.includes("industrial")) return "industrial operations";
  if (text.includes("food")) return "food distribution";
  if (text.includes("government") || text.includes("resident")) return "government services";
  if (text.includes("accounting") || text.includes("erp")) return "accounting workflows";
  if (text.includes("audit")) return "audit work";
  if (text.includes("spreadsheet")) return "spreadsheets";
  if (text.includes("private market")) return "private markets";
  if (text.includes("legal") || text.includes("compliance")) return "legal review";
  if (text.includes("security") || text.includes("soc") || text.includes("vulnerab")) return "security operations";
  if (text.includes("clinical") || text.includes("care")) return "care delivery";
  if (text.includes("drug") || text.includes("biology") || text.includes("biological")) return "biological modeling";
  if (text.includes("creative")) return "creative production";
  if (text.includes("social graph")) return "social graphs";
  if (text.includes("household") || text.includes("family")) return "household coordination";
  if (text.includes("developer") || text.includes("llm")) return "developer tooling";
  if (text.includes("memory") || text.includes("data")) return "data and memory infrastructure";

  return formatCategoryForWorkflow(company.category);
}

function companyText(company: AgentCompany) {
  return [
    company.name,
    company.category,
    company.subcategory,
    company.description,
    company.oneSentenceDescription,
    company.generated?.hook,
    company.inclusionReason?.body,
    ...company.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function formatCategoryForWorkflow(category: string) {
  return category
    .replace("Fintech & Trading AI", "finance workflows")
    .replace("Legal & Compliance AI", "legal review")
    .replace("Cybersecurity AI", "security operations")
    .replace("Media, Ads & Creative AI", "creative production")
    .replace("Health & Clinical AI", "care delivery")
    .replace("Life Sciences AI", "drug discovery and biology")
    .replace("AI-Native Consumer & Social", "consumer behavior")
    .replace("Agent Infrastructure", "agent infrastructure")
    .replace("Model Tools & Dev Platform", "developer tooling")
    .replace("Enterprise GTM & RevOps AI", "enterprise workflows")
    .replace("Data & Memory Layer", "data and memory infrastructure");
}

function formatNames(companies: AgentCompany[]) {
  return formatList(companies.slice(0, 3).map((company) => company.name));
}

function formatList(values: string[]) {
  const uniqueValues = unique(values).slice(0, 3);
  if (uniqueValues.length === 0) return "specific workflows";
  if (uniqueValues.length === 1) return uniqueValues[0];
  if (uniqueValues.length === 2) return `${uniqueValues[0]} and ${uniqueValues[1]}`;
  return `${uniqueValues[0]}, ${uniqueValues[1]}, and ${uniqueValues[2]}`;
}

function sortRecentCompanies(companies: AgentCompany[]) {
  return [...companies].sort(
    (a, b) => getTime(b.createdAt || b.updatedAt) - getTime(a.createdAt || a.updatedAt),
  );
}

function groupEventsByCompany(events: CompanyEvent[]) {
  const grouped = new Map<string, CompanyEvent[]>();
  for (const event of events) {
    grouped.set(event.companyId, [...(grouped.get(event.companyId) ?? []), event]);
  }
  return grouped;
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueById(companies: AgentCompany[]) {
  const seen = new Set<string>();
  return companies.filter((company) => {
    if (seen.has(company.id)) return false;
    seen.add(company.id);
    return true;
  });
}

function trimTitle(value: string) {
  const words = value.trim().split(/\s+/);
  return words.slice(0, 8).join(" ");
}

function trimBody(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= 280) return clean;
  return `${clean.slice(0, 279).trim().replace(/[,.]$/, "")}.`;
}

function getTime(value: string | undefined) {
  const time = new Date(value ?? "").getTime();
  return Number.isNaN(time) ? 0 : time;
}
