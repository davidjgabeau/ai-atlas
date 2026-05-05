import type {
  AgentCompany,
  CompanyEvent,
  MarketSnapshot,
} from "../../types/agent";
import { createContentHash, createId } from "./hash";

export function createMarketSnapshot(
  companies: AgentCompany[],
  events: CompanyEvent[],
  previousSnapshot?: MarketSnapshot,
): MarketSnapshot {
  const generatedAt = new Date().toISOString();
  const categoryCounts = countBy(companies, (company) => company.category || "Unknown");
  const stageCounts = countBy(companies, (company) => company.stage || "Unknown");
  const recentCompanyIds = companies
    .filter((company) => isWithinDays(company.createdAt, generatedAt, 30))
    .map((company) => company.id);
  const recentEventIds = events
    .filter((event) => isWithinDays(event.discoveredAt, generatedAt, 7))
    .map((event) => event.id);
  const signalCounts = countBy(
    events.filter((event) => isWithinDays(event.discoveredAt, generatedAt, 30)),
    (event) => event.type,
  );

  const sourceHash = createContentHash({
    companyIds: companies.map((company) => company.id).sort(),
    categoryCounts,
    stageCounts,
    recentCompanyIds: recentCompanyIds.sort(),
    recentEventIds: recentEventIds.sort(),
  });

  return {
    id: createId("snapshot", `${generatedAt}:${sourceHash}`),
    generatedAt,
    companyCount: companies.length,
    categoryCounts,
    stageCounts,
    recentCompanyIds,
    recentEventIds,
    topCategories: Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        delta: count - (previousSnapshot?.categoryCounts[category] ?? 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    topSignals: Object.entries(signalCounts)
      .map(([type, count]) => ({
        type,
        count,
        delta: count - getPreviousSignalCount(previousSnapshot, type),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    sourceHash,
  };
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function getPreviousSignalCount(snapshot: MarketSnapshot | undefined, type: string) {
  return snapshot?.topSignals.find((signal) => signal.type === type)?.count ?? 0;
}

function isWithinDays(value: string, nowValue: string, days: number) {
  const date = new Date(value).getTime();
  const now = new Date(nowValue).getTime();
  if (Number.isNaN(date) || Number.isNaN(now)) return false;
  return now - date <= days * 86_400_000;
}
