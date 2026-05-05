import type { CompanyEvent } from "../../types/agent";

export function dedupeEvents(
  existingEvents: CompanyEvent[],
  newEvents: CompanyEvent[],
): CompanyEvent[] {
  const accepted = [...existingEvents];

  for (const event of newEvents) {
    if (!isDuplicateEvent(accepted, event)) {
      accepted.push(event);
    }
  }

  return accepted.sort(
    (a, b) =>
      new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime(),
  );
}

export function isDuplicateEvent(
  existingEvents: CompanyEvent[],
  event: CompanyEvent,
) {
  const normalizedTitle = normalizeTitle(event.title);

  return existingEvents.some((existing) => {
    if (existing.sourceUrl && existing.sourceUrl === event.sourceUrl) return true;
    if (existing.contentHash && existing.contentHash === event.contentHash) {
      return true;
    }
    if (
      existing.companyId === event.companyId &&
      existing.type === event.type &&
      daysBetween(existing.occurredAt, event.occurredAt) <= 14
    ) {
      return true;
    }

    return stringSimilarity(normalizedTitle, normalizeTitle(existing.title)) > 0.82;
  });
}

export function stringSimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  const intersection = Array.from(aTokens).filter((token) => bTokens.has(token));
  const union = new Set([...aTokens, ...bTokens]);

  return union.size === 0 ? 0 : intersection.length / union.size;
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeTitle(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

function daysBetween(a: string, b: string) {
  const first = new Date(a).getTime();
  const second = new Date(b).getTime();
  if (Number.isNaN(first) || Number.isNaN(second)) return Number.POSITIVE_INFINITY;
  return Math.abs(first - second) / 86_400_000;
}
