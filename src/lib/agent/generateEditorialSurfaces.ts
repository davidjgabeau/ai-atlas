import type {
  AgentCompany,
  CompanyEvent,
  CompanyExposure,
  EditorialItem,
  EditorialSurface,
  GeneratedInsightHistory,
  MarketSnapshot,
} from "../../types/agent";
import { createContentHash, createId } from "./hash";
import { generateInclusionReason } from "./generateInclusionReason";
import { generateCurrentReadFallback } from "./generateCurrentReadFallback";
import { generateCurrentReadWithAnthropic } from "./generateCurrentReadWithAnthropic";
import { generateLatestSignalsWithAnthropic } from "./generateLatestSignalsWithAnthropic";
import { hasBannedUserFacingPhrase, qualityGateCurrentRead } from "./qualityGate";
import { normalizeSignalLabel } from "../signals/companySignal";

const promptVersion = "agentic-editorial-v3-llm-signals";
const surfaceTtlDays = 2;

const categoryPhrases: Record<string, string> = {
  "Fintech & Trading AI": "finance workflows and analyst tools",
  "Legal & Compliance AI": "regulated review work",
  "Cybersecurity AI": "security operations and exposure management",
  "Media, Ads & Creative AI": "creative production and brand intelligence",
  "Health & Clinical AI": "clinical operations and patient workflows",
  "Life Sciences AI": "drug discovery and biological modeling",
  "AI-Native Consumer & Social": "consumer behavior and social products",
  "Agent Infrastructure": "agent orchestration and reliability",
  "Model Tools & Dev Platform": "evals and production tooling",
  "Enterprise GTM & RevOps AI": "enterprise implementation and back-office workflows",
  "Data & Memory Layer": "context, data, and memory systems",
};

export async function generateEditorialSurfaces({
  companies,
  events,
  currentSnapshot,
  previousSnapshots,
  priorSurfaces,
  insightHistory,
  exposures,
}: {
  companies: AgentCompany[];
  events: CompanyEvent[];
  currentSnapshot: MarketSnapshot;
  previousSnapshots: MarketSnapshot[];
  priorSurfaces: EditorialSurface[];
  insightHistory: GeneratedInsightHistory[];
  exposures: CompanyExposure[];
}): Promise<{
  surfaces: EditorialSurface[];
  exposures: CompanyExposure[];
  insightHistory: GeneratedInsightHistory[];
  qualityGateFailures: number;
  errors: string[];
}> {
  const generatedAt = new Date().toISOString();
  const expiresAt = addDays(generatedAt, surfaceTtlDays);
  const recentEvents = events
    .filter((event) => event.finalScore >= 0.55)
    .sort((a, b) => b.finalScore - a.finalScore);

  let qualityGateFailures = 0;
  const nextSurfaces: EditorialSurface[] = [];
  const nextExposures = [...exposures];
  const errors: string[] = [];
  let nextHistory = insightHistory.filter(
    (item) => !hasBannedUserFacingPhrase(`${item.title} ${item.body}`),
  );

  const companiesToKnow = createCompaniesToKnow({
    companies,
    events,
    exposures,
    priorSurface: getPriorSurface(priorSurfaces, "companies_to_know"),
  });
  nextSurfaces.push(
    createSurface("companies_to_know", companiesToKnow, generatedAt, expiresAt, {
      companyIds: companiesToKnow.flatMap((item) => item.companyId ?? []),
      eventIds: companiesToKnow.flatMap((item) => item.supportingEventIds ?? []),
      snapshotIds: [currentSnapshot.id],
    }),
  );
  companiesToKnow.forEach((item, index) => {
    if (!item.companyId) return;
    nextExposures.push({
      id: createId("exposure", {
        companyId: item.companyId,
        surface: "companies_to_know",
        shownAt: generatedAt,
        position: index,
      }),
      companyId: item.companyId,
      surface: "companies_to_know",
      shownAt: generatedAt,
      position: index,
    });
  });

  const {
    items: latestSignals,
    model: latestSignalsModel,
    errors: latestSignalErrors,
  } = await createLatestSignals({
    companies,
    events: recentEvents,
    currentSnapshot,
    priorSurface: getPriorSurface(priorSurfaces, "latest_signals"),
    generatedAt,
  });
  errors.push(...latestSignalErrors);
  nextSurfaces.push(
    createSurface(
      "latest_signals",
      latestSignals,
      generatedAt,
      expiresAt,
      {
        companyIds: latestSignals.flatMap((item) => item.companyId ?? []),
        eventIds: latestSignals.flatMap((item) => item.supportingEventIds ?? []),
        snapshotIds: [currentSnapshot.id],
      },
      latestSignalsModel,
    ),
  );

  const { items: currentRead, rejected, model: currentReadModel, errors: currentReadErrors } = await createCurrentRead({
    companies,
    events: recentEvents,
    currentSnapshot,
    previousSnapshot: previousSnapshots[0],
    insightHistory: nextHistory,
  });
  qualityGateFailures += rejected;
  errors.push(...currentReadErrors);
  nextHistory = [
    ...currentRead.map((item) => ({
      id: createId("insight_history", {
        title: item.title,
        body: item.body,
        generatedAt,
      }),
      title: item.title,
      body: item.body ?? "",
      generatedAt,
      sourceCompanyIds: item.supportingCompanyIds ?? [],
      sourceEventIds: item.supportingEventIds ?? [],
    })),
    ...nextHistory,
  ].slice(0, 80);
  nextSurfaces.push(
    createSurface(
      "current_read",
      currentRead,
      generatedAt,
      expiresAt,
      {
        companyIds: currentRead.flatMap((item) => item.supportingCompanyIds ?? []),
        eventIds: currentRead.flatMap((item) => item.supportingEventIds ?? []),
        snapshotIds: [currentSnapshot.id, previousSnapshots[0]?.id].filter(Boolean),
      },
      currentReadModel,
    ),
  );

  const marketSnapshotItems = createMarketSnapshotItems(currentSnapshot, currentRead);
  nextSurfaces.push(
    createSurface("market_snapshot", marketSnapshotItems, generatedAt, expiresAt, {
      companyIds: currentSnapshot.recentCompanyIds,
      eventIds: currentSnapshot.recentEventIds,
      snapshotIds: [currentSnapshot.id],
    }),
  );

  const categoryPulseItems = currentSnapshot.topCategories.slice(0, 4).map((item) => ({
    id: createId("category_pulse_item", item),
    title: item.category,
    body: `${item.count} ${item.count === 1 ? "company" : "companies"} · ${categoryPhrases[item.category] ?? "category activity"}`,
    category: item.category,
    label: item.delta > 0 ? `+${item.delta}` : "steady",
    supportingCompanyIds: companies
      .filter((company) => company.category === item.category)
      .slice(0, 5)
      .map((company) => company.id),
  }));
  nextSurfaces.push(
    createSurface("category_pulse", categoryPulseItems, generatedAt, expiresAt, {
      companyIds: categoryPulseItems.flatMap((item) => item.supportingCompanyIds ?? []),
      eventIds: [],
      snapshotIds: [currentSnapshot.id],
    }),
  );

  const recentlyAddedItems = companies
    .sort((a, b) => getTime(b.createdAt || b.updatedAt) - getTime(a.createdAt || a.updatedAt))
    .slice(0, 6)
    .map((company) => {
      const supportingEvents = events
        .filter((event) => event.companyId === company.id)
        .slice(0, 2);
      const inclusionReason = generateInclusionReason({
        company,
        triggeringEvents: supportingEvents,
        categoryCounts: currentSnapshot.categoryCounts,
      });

      return {
        id: createId("recent_company_item", company.id),
        title: company.name,
        body: inclusionReason.body,
        companyId: company.id,
        category: company.category,
        label: "Recently added",
        supportingCompanyIds: [company.id],
        supportingEventIds: supportingEvents.map((event) => event.id),
      };
    });
  nextSurfaces.push(
    createSurface("recently_added", recentlyAddedItems, generatedAt, expiresAt, {
      companyIds: recentlyAddedItems.flatMap((item) => item.companyId ?? []),
      eventIds: recentlyAddedItems.flatMap((item) => item.supportingEventIds ?? []),
      snapshotIds: [currentSnapshot.id],
    }),
  );

  return {
    surfaces: mergeSurfaces(priorSurfaces, nextSurfaces),
    exposures: nextExposures.slice(-500),
    insightHistory: nextHistory,
    qualityGateFailures,
    errors,
  };
}

function createCompaniesToKnow({
  companies,
  events,
  exposures,
  priorSurface,
}: {
  companies: AgentCompany[];
  events: CompanyEvent[];
  exposures: CompanyExposure[];
  priorSurface?: EditorialSurface;
}) {
  const eventsByCompany = groupEventsByCompany(events);
  const recentExposuresByCompany = countRecentExposures(exposures);
  const priorPositionByCompany = new Map(
    priorSurface?.items.map((item, index) => [item.companyId, index]) ?? [],
  );

  const ranked = companies
    .map((company) => {
      const companyEvents = eventsByCompany.get(company.id) ?? [];
      const recentEventScore = Math.max(0, ...companyEvents.map((event) => event.finalScore));
      const profileCompleteness = getProfileCompleteness(company);
      const categoryPriority = getCategoryPriority(company);
      const noveltyToHomepage = Math.max(
        0,
        1 - (recentExposuresByCompany.get(company.id) ?? 0) * 0.28,
      );
      const stageFit = getStageFit(company);
      const score =
        0.3 * recentEventScore +
        0.25 * profileCompleteness +
        0.2 * categoryPriority +
        0.15 * noveltyToHomepage +
        0.1 * stageFit;

      return {
        company,
        companyEvents,
        score:
          priorPositionByCompany.has(company.id) &&
          priorPositionByCompany.get(company.id) === 0
            ? score - 0.08
            : score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const selected: typeof ranked = [];
  const categoryCounts = new Map<string, number>();

  for (const candidate of ranked) {
    const count = categoryCounts.get(candidate.company.category) ?? 0;
    if (count >= 2) continue;

    selected.push(candidate);
    categoryCounts.set(candidate.company.category, count + 1);
    if (selected.length === 5) break;
  }

  ensureCategoryPresence(selected, ranked, "AI-Native Consumer & Social");
  ensureCategoryPresence(selected, ranked, "Agent Infrastructure");
  ensureCategoryPresence(selected, ranked, "Model Tools & Dev Platform");

  return selected.slice(0, 5).map(({ company, companyEvents, score }) => ({
    id: createId("companies_to_know_item", {
      companyId: company.id,
      score,
    }),
    title: company.name,
    body: company.generated?.hook ?? company.oneSentenceDescription,
    companyId: company.id,
    category: company.category,
    label: normalizeSignalLabel(
      company.generated?.signalLabel ?? labelForCompany(company),
      toSignalCompany(company),
    ),
    supportingCompanyIds: [company.id],
    supportingEventIds: companyEvents.slice(0, 3).map((event) => event.id),
    score: Number(score.toFixed(3)),
  }));
}

async function createLatestSignals({
  companies,
  events,
  currentSnapshot,
  priorSurface,
  generatedAt,
}: {
  companies: AgentCompany[];
  events: CompanyEvent[];
  currentSnapshot: MarketSnapshot;
  priorSurface?: EditorialSurface;
  generatedAt: string;
}) {
  const errors: string[] = [];
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const generated = await generateLatestSignalsWithAnthropic({
    companies,
    events,
    currentSnapshot,
    priorItems: priorSurface?.items ?? [],
    generatedAt,
  });
  if (generated.error) errors.push(generated.error);

  const items = getAcceptedLatestSignals(generated.items, companyById);
  const fallbackItems = createLatestSignalFallbackItems({
    events,
    companyById,
    generatedAt,
  });

  for (const fallback of fallbackItems) {
    if (items.length === 5) break;
    if (items.some((item) => item.companyId === fallback.companyId)) continue;
    items.push(fallback);
  }

  return {
    items: items.slice(0, 5),
    model: items.some((item) => item.id.startsWith("latest_signal_anthropic"))
      ? generated.model
      : undefined,
    errors,
  };
}

function getAcceptedLatestSignals(
  items: EditorialItem[],
  companyById: Map<string, AgentCompany>,
) {
  const accepted: EditorialItem[] = [];
  const seenCompanies = new Set<string>();
  const seenOpeners = new Set<string>();

  for (const item of items) {
    if (accepted.length === 5) break;
    if (!item.companyId || seenCompanies.has(item.companyId)) continue;
    const company = companyById.get(item.companyId);
    if (!company) continue;
    if (!isThoughtfulLatestSignal(item, company)) continue;

    const opener = getOpeningKey(item.body ?? "");
    if (seenOpeners.has(opener)) continue;

    seenCompanies.add(item.companyId);
    seenOpeners.add(opener);
    accepted.push(item);
  }

  return accepted;
}

function createLatestSignalFallbackItems({
  events,
  companyById,
  generatedAt,
}: {
  events: CompanyEvent[];
  companyById: Map<string, AgentCompany>;
  generatedAt: string;
}) {
  const seenCompanies = new Set<string>();
  const items: EditorialItem[] = [];

  for (const event of events) {
    if (items.length === 5) break;
    if (event.finalScore < 0.7) continue;
    if (!isWithinDays(event.discoveredAt, generatedAt, 45)) continue;
    if (seenCompanies.has(event.companyId)) continue;
    const company = companyById.get(event.companyId);
    if (!company) continue;

    seenCompanies.add(company.id);
    items.push({
      id: createId("signal_item", {
        eventId: event.id,
        promptVersion,
      }),
      title: company.name,
      body: createDeterministicLatestSignalBody(company, event),
      companyId: company.id,
      category: company.category,
      label: labelForEvent(event),
      supportingEventIds: [event.id],
      supportingCompanyIds: [company.id],
      score: event.finalScore,
      sourceName: event.sourceName,
      sourceUrl: event.sourceUrl,
      occurredAt: event.occurredAt,
    });
  }

  return items;
}

function createDeterministicLatestSignalBody(
  company: AgentCompany,
  event: CompanyEvent,
) {
  const description = sentenceFragment(
    company.generated?.hook ||
      company.inclusionReason?.body ||
      company.oneSentenceDescription ||
      company.description,
  );
  const eventSummary = sentenceFragment(event.summary);

  if (event.type === "customer_signal" || event.type === "traction_signal") {
    return truncateSignalBody(
      `${company.name} is showing buyer pull around ${lowerFirst(description)}, with ${lowerFirst(eventSummary)}.`,
    );
  }
  if (event.type === "product_launch") {
    return truncateSignalBody(
      `${company.name} is turning ${lowerFirst(description)} into a sharper product wedge for ${categoryBuyerPhrase(company.category)}.`,
    );
  }
  if (event.type === "funding") {
    return truncateSignalBody(
      `${company.name}'s financing signal puts more attention on ${lowerFirst(description)}.`,
    );
  }
  if (event.type === "hiring_signal") {
    return truncateSignalBody(
      `${company.name}'s hiring points to execution around ${lowerFirst(description)}.`,
    );
  }

  return truncateSignalBody(
    `${company.name} adds a specific angle to ${categoryBuyerPhrase(company.category)}: ${lowerFirst(description)}.`,
  );
}

function isThoughtfulLatestSignal(item: EditorialItem, company: AgentCompany) {
  const body = (item.body ?? "").trim();
  const text = `${item.title} ${body} ${item.label ?? ""}`.toLowerCase();
  if (body.length < 55 || body.length > 220) return false;
  if (!item.supportingEventIds?.length) return false;
  if (!/[.!?]$/.test(body)) return false;
  if (hasBannedUserFacingPhrase(text)) return false;
  if (
    [
      "fresh addition",
      "added to ai atlas",
      "joined the map",
      "category depth",
      "strong category fit",
      "high potential",
      "promising",
    ].some((phrase) => text.includes(phrase))
  ) {
    return false;
  }

  const usefulTerms = [
    company.name.toLowerCase(),
    "buyer",
    "customer",
    "workflow",
    "operator",
    "team",
    "product",
    "platform",
    "category",
    "market",
    "stack",
    "data",
    "clinical",
    "finance",
    "legal",
    "consumer",
    "social",
    "security",
    "research",
  ];

  return usefulTerms.some((term) => text.includes(term));
}

function getOpeningKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ");
}

function sentenceFragment(value: string) {
  const clean = value
    .replace(/^fresh addition:\s*/i, "")
    .replace(/^added\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const [firstSentence] = clean.split(/(?<=[.!?])\s+/);
  return (firstSentence || clean || "a specific AI workflow").replace(/[.!?]$/, "");
}

function lowerFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function categoryBuyerPhrase(category: string) {
  if (/fintech|trading/i.test(category)) return "finance teams";
  if (/legal|compliance/i.test(category)) return "regulated review teams";
  if (/cybersecurity/i.test(category)) return "security operators";
  if (/media|ads|creative/i.test(category)) return "creative and growth teams";
  if (/health|clinical/i.test(category)) return "care teams";
  if (/life sciences/i.test(category)) return "research teams";
  if (/consumer|social/i.test(category)) return "consumer product builders";
  if (/infrastructure|model|dev|data|memory/i.test(category)) {
    return "technical teams";
  }
  if (/gtm|revops|enterprise/i.test(category)) return "revenue teams";
  return "operators";
}

function truncateSignalBody(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= 220) return clean;
  return `${clean.slice(0, 219).trim().replace(/[,;:]$/, "")}.`;
}

async function createCurrentRead({
  companies,
  events,
  currentSnapshot,
  insightHistory,
}: {
  companies: AgentCompany[];
  events: CompanyEvent[];
  currentSnapshot: MarketSnapshot;
  previousSnapshot?: MarketSnapshot;
  insightHistory: GeneratedInsightHistory[];
}) {
  const companyById = new Map(companies.map((company) => [company.id, company]));
  let rejected = 0;
  const accepted: EditorialItem[] = [];
  const errors: string[] = [];
  const recentCompanies = getRecentCompaniesForFallback(
    companies,
    currentSnapshot.recentCompanyIds,
  );
  const generated = await generateCurrentReadWithAnthropic({
    companies,
    recentCompanies,
    events,
    currentSnapshot,
    insightHistory,
  });
  if (generated.error) errors.push(generated.error);

  for (const item of generated.items) {
    if (accepted.length === 3) break;
    const supportingCompanies = (item.supportingCompanyIds ?? [])
      .map((id) => companyById.get(id))
      .filter((company): company is AgentCompany => Boolean(company));
    const gate = qualityGateCurrentRead(item, {
      allowNoEvent: true,
      companyNames: supportingCompanies.map((company) => company.name),
    });

    if (!gate.passed) {
      rejected += 1;
      continue;
    }

    accepted.push(item);
  }

  const fallbackItems = generateCurrentReadFallback({
    companies,
    recentCompanies,
    categoryCounts: currentSnapshot.categoryCounts,
    events,
  });

  for (const fallback of fallbackItems) {
    if (accepted.length === 3) break;
    if (accepted.some((item) => item.title === fallback.title)) continue;
    const supportingCompanies = (fallback.supportingCompanyIds ?? [])
      .map((id) => companyById.get(id))
      .filter((company): company is AgentCompany => Boolean(company));
    const gate = qualityGateCurrentRead(fallback, {
      allowNoEvent: true,
      companyNames: supportingCompanies.map((company) => company.name),
    });

    if (!gate.passed) {
      rejected += 1;
      continue;
    }

    accepted.push(fallback);
  }

  return {
    items: accepted.slice(0, 3),
    rejected,
    model: accepted.some((item) => item.id.startsWith("current_read_anthropic"))
      ? generated.model
      : undefined,
    errors,
  };
}

function getRecentCompaniesForFallback(
  companies: AgentCompany[],
  recentCompanyIds: string[],
) {
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const fromSnapshot = recentCompanyIds
    .map((id) => companyById.get(id))
    .filter((company): company is AgentCompany => Boolean(company));

  if (fromSnapshot.length > 0) return fromSnapshot;

  return [...companies]
    .sort((a, b) => getTime(b.createdAt || b.updatedAt) - getTime(a.createdAt || a.updatedAt))
    .slice(0, 8);
}

function createMarketSnapshotItems(
  snapshot: MarketSnapshot,
  currentRead: EditorialItem[],
) {
  const themes = Math.max(currentRead.length, snapshot.topSignals.length);
  return [
    {
      id: createId("market_snapshot_item", "companies"),
      title: "Companies tracked",
      body: String(snapshot.companyCount),
      label: "map",
    },
    {
      id: createId("market_snapshot_item", "categories"),
      title: "Categories",
      body: String(Object.keys(snapshot.categoryCounts).length),
      label: "grid",
    },
    {
      id: createId("market_snapshot_item", "recent"),
      title: "Recently added",
      body: String(snapshot.recentCompanyIds.length),
      label: "pin",
    },
    {
      id: createId("market_snapshot_item", "themes"),
      title: "Current themes",
      body: String(themes),
      label: "compass",
    },
    {
      id: createId("market_snapshot_item", "analyst-read"),
      title: "Analyst read",
      body:
        currentRead[0]?.body ??
        "Recent early-stage additions skew toward practical AI: healthcare, finance, infrastructure, and operational workflows.",
      label: "Market read",
      supportingCompanyIds: currentRead[0]?.supportingCompanyIds,
      supportingEventIds: currentRead[0]?.supportingEventIds,
    },
  ] satisfies EditorialItem[];
}

function createSurface(
  surface: EditorialSurface["surface"],
  items: EditorialItem[],
  generatedAt: string,
  expiresAt: string,
  sources: {
    companyIds: string[];
    eventIds: string[];
    snapshotIds: string[];
  },
  model?: string,
): EditorialSurface {
  const sourceHash = createContentHash({
    surface,
    itemIds: items.map((item) => item.id),
    sources,
  });

  return {
    id: createId("surface", {
      surface,
      generatedAt,
      sourceHash,
    }),
    surface,
    generatedAt,
    expiresAt,
    items,
    sourceEventIds: unique(sources.eventIds),
    sourceCompanyIds: unique(sources.companyIds),
    sourceSnapshotIds: unique(sources.snapshotIds),
    model,
    promptVersion,
    sourceHash,
  };
}

function mergeSurfaces(
  priorSurfaces: EditorialSurface[],
  nextSurfaces: EditorialSurface[],
) {
  const replaced = new Set(nextSurfaces.map((surface) => surface.surface));
  return [
    ...nextSurfaces,
    ...priorSurfaces.filter((surface) => !replaced.has(surface.surface)),
  ].sort((a, b) => getTime(b.generatedAt) - getTime(a.generatedAt));
}

function groupEventsByCompany(events: CompanyEvent[]) {
  const grouped = new Map<string, CompanyEvent[]>();

  for (const event of events) {
    grouped.set(event.companyId, [...(grouped.get(event.companyId) ?? []), event]);
  }

  return grouped;
}

function countRecentExposures(exposures: CompanyExposure[]) {
  const now = new Date().toISOString();
  const counts = new Map<string, number>();

  for (const exposure of exposures) {
    if (!isWithinDays(exposure.shownAt, now, 14)) continue;
    counts.set(exposure.companyId, (counts.get(exposure.companyId) ?? 0) + 1);
  }

  return counts;
}

function ensureCategoryPresence<T extends { company: AgentCompany; score: number }>(
  selected: T[],
  ranked: T[],
  category: string,
) {
  if (selected.some((item) => item.company.category === category)) return;

  const candidate = ranked.find(
    (item) =>
      item.company.category === category &&
      !selected.some((selectedItem) => selectedItem.company.id === item.company.id),
  );

  if (candidate && candidate.score >= 0.35) {
    selected.splice(Math.max(0, selected.length - 1), 1, candidate);
  }
}

function getProfileCompleteness(company: AgentCompany) {
  const fields = [
    company.website,
    company.description,
    company.oneSentenceDescription,
    company.founders?.length,
    company.funding?.latestRound,
    company.generated?.hook,
  ];
  return fields.filter(Boolean).length / fields.length;
}

function getCategoryPriority(company: AgentCompany) {
  if (/consumer|social|agent|infrastructure|model|dev|finance|legal|health/i.test(company.category)) {
    return 1;
  }
  return 0.72;
}

function getStageFit(company: AgentCompany) {
  if (company.stage === "Seed" || company.stage === "Series A") return 1;
  if (company.stage === "Pre-seed" || company.stage === "Seed / Series A") return 0.85;
  return 0.45;
}

function labelForCompany(company: AgentCompany) {
  if (/consumer|social/i.test(company.category)) return "Consumer signal";
  if (/infrastructure|model|dev|data/i.test(company.category)) {
    return "Infra signal";
  }
  if (/finance|legal|health|clinical/i.test(company.category)) {
    return "Clear buyer pull";
  }
  if (/enterprise|gtm|revops/i.test(company.category)) {
    return "Enterprise signal";
  }
  return "Worth watching";
}

function labelForEvent(event: CompanyEvent) {
  if (event.type === "funding") return "Funding signal";
  if (event.type === "new_company_added") return "Recently added";
  if (event.type === "product_launch") return "Workflow signal";
  if (event.type === "customer_signal" || event.type === "traction_signal") {
    return "Clear buyer pull";
  }
  return "Worth watching";
}

function toSignalCompany(company: AgentCompany) {
  return {
    category: company.category,
    funding_amount: company.funding?.latestRoundAmount,
    funding_round: company.funding?.latestRound,
    generated: company.generated,
    is_featured: false,
    recent_activity_text: "",
    short_description: company.description,
    stage: company.stage,
    one_line_thesis: company.oneSentenceDescription,
    why_it_matters: company.description,
  };
}

function getPriorSurface(
  surfaces: EditorialSurface[],
  surface: EditorialSurface["surface"],
) {
  return surfaces
    .filter((item) => item.surface === surface)
    .sort((a, b) => getTime(b.generatedAt) - getTime(a.generatedAt))[0];
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function addDays(value: string, days: number) {
  return new Date(new Date(value).getTime() + days * 86_400_000).toISOString();
}

function isWithinDays(value: string, nowValue: string, days: number) {
  const date = getTime(value);
  const now = getTime(nowValue);
  return date > 0 && now - date <= days * 86_400_000;
}

function getTime(value: string | undefined) {
  const time = new Date(value ?? "").getTime();
  return Number.isNaN(time) ? 0 : time;
}
