import {
  consumptionIntensities,
  consumptionProfileLabels,
  consumptionProfiles,
  type Category,
  type Company,
  type ConsumptionIntensity,
  type ConsumptionProfile,
} from "@/types/market";

type ConsumptionInput = Pick<
  Company,
  | "name"
  | "category"
  | "stage"
  | "short_description"
  | "one_line_thesis"
  | "why_it_matters"
  | "ai_usage_profile"
> & {
  generated?: Pick<Company["generated"], "hook">;
};

export function getConsumptionProfileLabel(profile: ConsumptionProfile) {
  return consumptionProfileLabels[profile];
}

export function formatConsumptionIntensity(
  intensity: ConsumptionIntensity,
) {
  const labels: Record<ConsumptionIntensity, string> = {
    low: "Low intensity",
    moderate: "Moderate intensity",
    high: "High intensity",
    very_high: "Very high intensity",
  };

  return labels[intensity];
}

export function normalizeConsumptionProfiles(value: unknown) {
  const values = Array.isArray(value) ? value : [];
  const allowed = new Set<ConsumptionProfile>(consumptionProfiles);

  return Array.from(
    new Set(
      values.filter((item): item is ConsumptionProfile =>
        allowed.has(item as ConsumptionProfile),
      ),
    ),
  ).slice(0, 3);
}

export function normalizeConsumptionIntensity(
  value: unknown,
): ConsumptionIntensity {
  return consumptionIntensities.includes(value as ConsumptionIntensity)
    ? (value as ConsumptionIntensity)
    : "low";
}

export function inferConsumptionProfile(company: ConsumptionInput) {
  const text = [
    company.name,
    company.category,
    company.stage,
    company.generated?.hook,
    company.short_description,
    company.one_line_thesis,
    company.why_it_matters,
    company.ai_usage_profile,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const profiles = new Set<ConsumptionProfile>();

  if (/voice|phone|call|transcription|speech|restaurant/i.test(text)) {
    profiles.add("realtime_voice");
  }
  if (/consumer|social|dating|family|household|companion|health coach|imessage|friends|personal/i.test(text)) {
    profiles.add("consumer_inference");
  }
  if (/agent|workflow|orchestrat|automation|autonomous|long-horizon|soc|pentest/i.test(text)) {
    profiles.add("agentic_loops");
  }
  if (/document|pdf|filing|contract|kyc|aml|compliance|claims|invoice|spreadsheet|research|knowledge graph|retrieval|rag/i.test(text)) {
    profiles.add("batch_document_processing");
  }
  if (/code|developer|software factory|coding|pull request|llm application|eval|deploy|production tooling/i.test(text)) {
    profiles.add("code_generation");
  }
  if (/image|video|creative|multimodal|wearable|sensor|biology|biological|protein|tumor|molecule|clinical data/i.test(text)) {
    profiles.add("multimodal_processing");
  }
  if (/embedding|semantic|search|memory|graph|data layer|context|catalog|knowledge/i.test(text)) {
    profiles.add("embeddings_semantic_search");
  }

  if (profiles.size === 0) {
    addCategoryDefaultProfile(company.category, profiles);
  }

  const profileList = Array.from(profiles).slice(0, 3);
  const intensity = inferIntensity(company, profileList, text);

  return {
    consumption_profile: profileList,
    consumption_intensity: intensity,
    consumption_note: buildConsumptionNote(company, profileList, text),
  };
}

function addCategoryDefaultProfile(
  category: Category,
  profiles: Set<ConsumptionProfile>,
) {
  if (category === "Fintech & Trading AI") {
    profiles.add("batch_document_processing");
    profiles.add("embeddings_semantic_search");
  } else if (category === "Legal & Compliance AI") {
    profiles.add("batch_document_processing");
    profiles.add("agentic_loops");
  } else if (category === "Cybersecurity AI") {
    profiles.add("agentic_loops");
    profiles.add("batch_document_processing");
  } else if (category === "Media, Ads & Creative AI") {
    profiles.add("multimodal_processing");
    profiles.add("consumer_inference");
  } else if (category === "Health & Clinical AI") {
    profiles.add("batch_document_processing");
  } else if (category === "Life Sciences AI") {
    profiles.add("multimodal_processing");
    profiles.add("embeddings_semantic_search");
  } else if (category === "AI-Native Consumer & Social") {
    profiles.add("consumer_inference");
  } else if (category === "Agent Infrastructure") {
    profiles.add("agentic_loops");
  } else if (category === "Model Tools & Dev Platform") {
    profiles.add("code_generation");
  } else if (category === "Data & Memory Layer") {
    profiles.add("embeddings_semantic_search");
  }
}

function inferIntensity(
  company: ConsumptionInput,
  profiles: ConsumptionProfile[],
  text: string,
): ConsumptionIntensity {
  if (
    profiles.includes("consumer_inference") &&
    /consumer|social|imessage|dating|family|household|750\+|60k|1,000\+/i.test(text)
  ) {
    return "very_high";
  }
  if (
    profiles.includes("agentic_loops") &&
    /enterprise|soc|autonomous|long-horizon|orchestrat|agent/i.test(text)
  ) {
    return "high";
  }
  if (
    company.category === "Life Sciences AI" ||
    profiles.includes("realtime_voice") ||
    profiles.includes("multimodal_processing")
  ) {
    return "high";
  }
  if (profiles.length >= 2) return "moderate";

  return "low";
}

function buildConsumptionNote(
  company: ConsumptionInput,
  profiles: ConsumptionProfile[],
  text: string,
) {
  if (profiles.length === 0) return "";

  const name = company.name;

  if (profiles.includes("realtime_voice")) {
    return trimNote(`${name} likely drives model calls through low-latency voice conversations tied to repeat service workflows.`);
  }
  if (profiles.includes("code_generation")) {
    return trimNote(`${name} supports engineering or LLM app work where generation, evaluation, and deployment loops can compound.`);
  }
  if (company.category === "Life Sciences AI") {
    return trimNote(`${name} applies models to biological data where retrieval, structure, and multimodal reasoning matter.`);
  }
  if (company.category === "Cybersecurity AI") {
    return trimNote(`${name} uses agentic analysis across security telemetry, exposure, or human-layer risk.`);
  }
  if (profiles.includes("consumer_inference")) {
    return trimNote(`${name} puts inference inside repeated consumer behavior rather than a one-off prompt surface.`);
  }
  if (profiles.includes("agentic_loops")) {
    return trimNote(`${name} uses long-running model loops to complete repeat work across tools, data, or decisions.`);
  }
  if (profiles.includes("batch_document_processing")) {
    return trimNote(`${name} relies on structured extraction and reasoning over documents or dense business records.`);
  }
  if (profiles.includes("embeddings_semantic_search")) {
    return trimNote(`${name} depends on semantic retrieval or memory to turn messy context into usable model input.`);
  }
  if (/image|video|multimodal/i.test(text)) {
    return trimNote(`${name} uses multimodal processing across visual or media inputs tied to production workflows.`);
  }

  return trimNote(`${name} has a model-usage profile tied to its core product workflow.`);
}

function trimNote(value: string) {
  if (value.length <= 140) return value;

  const trimmed = value.slice(0, 139).replace(/\s+\S*$/, "");
  return `${trimmed}.`;
}
