import type { GeneratedInsightHistory } from "../../types/agent";
import { stringSimilarity } from "./dedupeEvents";

export function checkInsightFreshness({
  title,
  body,
  sourceEventIds,
  history,
  requireNewEvent = true,
}: {
  title: string;
  body: string;
  sourceEventIds: string[];
  history: GeneratedInsightHistory[];
  requireNewEvent?: boolean;
}) {
  const recentHistory = history.slice(0, 20);
  const normalizedTitle = normalize(title);
  const normalizedBody = normalize(body);

  if (requireNewEvent && sourceEventIds.length === 0) {
    return {
      fresh: false,
      reasons: ["Insight has no new supporting event."],
    };
  }

  for (const prior of recentHistory) {
    if (normalize(prior.title) === normalizedTitle) {
      return {
        fresh: false,
        reasons: ["Insight title repeats a prior title."],
      };
    }

    if (stringSimilarity(normalizedBody, normalize(prior.body)) > 0.86) {
      return {
        fresh: false,
        reasons: ["Insight is too similar to recent history."],
      };
    }
  }

  const recentSameConclusion = recentHistory
    .slice(0, 3)
    .filter((prior) => stringSimilarity(normalizedBody, normalize(prior.body)) > 0.68);

  if (recentSameConclusion.length >= 2) {
    return {
      fresh: false,
      reasons: ["Same conclusion appeared repeatedly in recent generations."],
    };
  }

  return {
    fresh: true,
    reasons: [],
  };
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
