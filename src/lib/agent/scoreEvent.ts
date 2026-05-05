import type { AgentCompany, CompanyEvent } from "../../types/agent";

const strongCategories = [
  "consumer",
  "finance",
  "trading",
  "legal",
  "health",
  "clinical",
  "creative",
  "media",
  "agent",
  "infrastructure",
  "model",
  "dev",
  "data",
  "memory",
  "enterprise",
  "automation",
];

export function scoreEvent({
  event,
  company,
  existingEvents,
}: {
  event: CompanyEvent;
  company?: AgentCompany;
  existingEvents: CompanyEvent[];
}): CompanyEvent {
  const importanceScore = getImportanceScore(event);
  const noveltyScore = getNoveltyScore(event, existingEvents);
  const relevanceScore = getRelevanceScore(event, company);
  const finalScore = roundScore(
    0.4 * importanceScore + 0.35 * noveltyScore + 0.25 * relevanceScore,
  );

  return {
    ...event,
    importanceScore,
    noveltyScore,
    relevanceScore,
    finalScore,
  };
}

function getImportanceScore(event: CompanyEvent) {
  if (event.type === "funding") {
    const round = event.extractedFacts.round?.toLowerCase() ?? "";
    if (round.includes("series a")) return 0.95;
    if (round.includes("seed")) return 0.85;
    if (round.includes("pre-seed") || round.includes("preseed")) return 0.7;
    return 0.75;
  }

  if (event.type === "product_launch") return 0.8;
  if (event.type === "customer_signal") {
    return event.extractedFacts.customerNames?.length ? 0.85 : 0.4;
  }
  if (event.type === "traction_signal") {
    return event.extractedFacts.customerNames?.length ? 0.78 : 0.55;
  }
  if (event.type === "hiring_signal") {
    return (event.extractedFacts.roleCount ?? 0) >= 3 ? 0.6 : 0.25;
  }
  if (event.type === "partnership") return 0.65;
  if (event.type === "new_company_added") return 0.72;
  if (event.type === "press") return 0.4;

  return 0.45;
}

function getNoveltyScore(event: CompanyEvent, existingEvents: CompanyEvent[]) {
  const companyEvents = existingEvents.filter(
    (item) => item.companyId === event.companyId,
  );

  if (companyEvents.length === 0) return 1;
  if (!companyEvents.some((item) => item.type === event.type)) return 0.7;
  if (
    companyEvents.some(
      (item) =>
        item.type === event.type &&
        daysBetween(item.discoveredAt, event.discoveredAt) <= 14,
    )
  ) {
    return 0.1;
  }

  return 0.4;
}

function getRelevanceScore(event: CompanyEvent, company?: AgentCompany) {
  if (!company) return 0.45;

  let score = 0.45;
  const location = company.location.toLowerCase();
  const stage = company.stage.toLowerCase();
  const category = company.category.toLowerCase();
  const description = `${company.description} ${company.oneSentenceDescription}`.toLowerCase();

  if (location.includes("new york") || location.includes("nyc")) score += 0.2;
  if (stage.includes("pre-seed") || stage === "seed" || stage.includes("series a")) {
    score += 0.15;
  }
  if (description.includes(" ai") || description.startsWith("ai ")) score += 0.1;
  if (strongCategories.some((word) => category.includes(word))) score += 0.15;
  if (stage.includes("series b") || stage.includes("series c")) score -= 0.2;

  if (event.confidence === "low") score -= 0.2;
  if (event.confidence === "high") score += 0.05;

  return roundScore(clamp(score, 0.1, 1));
}

function daysBetween(a: string, b: string) {
  const first = new Date(a).getTime();
  const second = new Date(b).getTime();
  if (Number.isNaN(first) || Number.isNaN(second)) return Number.POSITIVE_INFINITY;
  return Math.abs(first - second) / 86_400_000;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number) {
  return Number(value.toFixed(3));
}
