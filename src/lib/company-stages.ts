import type { AgentCompanyStage } from "../types/agent";

/** Prefer the explicit latest stage; old funding rounds in prose do not override it. */
export function normalizeCompanyStage(value: string): AgentCompanyStage {
  if (/\b(public|ipo|nasdaq|nyse)\b/i.test(value)) return "Public";
  if (/\b(acquired|acquisition)\b/i.test(value)) return "Acquired";
  const rounds = [...value.matchAll(/\bseries\s+([a-z])(?:\d+)?\b/gi)]
    .map((match) => match[1].toUpperCase()).sort();
  if (rounds.length) return `Series ${rounds.at(-1)}` as AgentCompanyStage;
  if (/\b(growth|late.stage)\b/i.test(value)) return "Growth";
  if (/pre[- ]?seed/i.test(value)) return "Pre-seed";
  if (/\bseed\b/i.test(value)) return "Seed";
  if (/bootstrapped|self.funded/i.test(value)) return "Bootstrapped";
  return "Unknown";
}

export function stageGroup(value: string) {
  if (/^early.stage$/i.test(value.trim())) return "Early";
  const stage = normalizeCompanyStage(value);
  if (["Pre-seed", "Seed", "Series A"].includes(stage)) return "Early";
  if (stage.startsWith("Series ") || stage === "Growth") return "Growth";
  return stage;
}
