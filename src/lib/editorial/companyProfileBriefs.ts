import fallbackBriefsFile from "@/data/company-profile-briefs.json";
import type { Company, CompanyProfileBriefs } from "@/types/market";

import { stableHash } from "./hash";

type CompanyProfileBriefsFile = {
  generatedAt: string;
  companies: Record<string, CompanyProfileBriefs>;
};

const fallbackBriefs = fallbackBriefsFile as CompanyProfileBriefsFile;

export function getCompanyProfileBriefs(company: Company): CompanyProfileBriefs {
  const sourceHash = getCompanyProfileBriefSourceHash(company);
  const generatedBriefs = company.generated.profileBriefs;

  if (generatedBriefs && isUsableBrief(generatedBriefs, sourceHash)) {
    return generatedBriefs;
  }

  const packagedBriefs = fallbackBriefs.companies?.[company.id];
  if (packagedBriefs && isUsableBrief(packagedBriefs, sourceHash)) {
    return packagedBriefs;
  }

  return generateFallbackCompanyProfileBriefs(company, sourceHash);
}

export function getCompanyProfileBriefSourceHash(company: Company) {
  return stableHash({
    id: company.id,
    name: company.name,
    category: company.category,
    stage: company.stage,
    short_description: company.short_description,
    one_line_thesis: company.one_line_thesis,
    why_it_matters: company.why_it_matters,
    ai_usage_profile: company.ai_usage_profile,
    funding_round: company.funding_round,
    funding_amount: company.funding_amount,
    funding_date: company.funding_date,
    total_raised: company.total_raised,
    lead_investor: company.lead_investor,
    funding_note: company.funding_note,
    recent_activity_text: company.recent_activity_text,
    generatedHook: company.generated.hook,
    signalLabel: company.generated.signalLabel,
    inclusionReason: company.inclusionReason?.body ?? "",
  });
}

export function generateFallbackCompanyProfileBriefs(
  company: Company,
  sourceHash = getCompanyProfileBriefSourceHash(company),
): CompanyProfileBriefs {
  const generatedAt = new Date().toISOString();
  const useCase = getUseCase(company);
  const buyer = getBuyerPhrase(company);

  return {
    whySaving: trimBrief(
      company.inclusionReason?.body ||
        `${company.name} is worth saving because it turns ${useCase} into a clearer ${buyer} workflow.`,
      220,
    ),
    whatBuilding: trimBrief(
      dedupeSentences(
        [
          company.one_line_thesis || company.short_description,
          company.short_description !== company.one_line_thesis
            ? company.short_description
            : "",
        ].join(" "),
      ) || `${company.name} is building around ${useCase}.`,
      240,
    ),
    aiModelUse: trimBrief(
      getModelUseBrief(company, useCase),
      240,
    ),
    generatedAt,
    sourceHash,
  };
}

export function isUsableBrief(
  briefs: CompanyProfileBriefs,
  sourceHash?: string,
) {
  if (sourceHash && briefs.sourceHash !== sourceHash) return false;

  const values = [briefs.whySaving, briefs.whatBuilding, briefs.aiModelUse];
  return values.every((value) => isUserFacingBrief(value));
}

export function isUserFacingBrief(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length < 24 || clean.length > 280) return false;
  if (hasRepeatedSentence(clean)) return false;

  return !/(agent|cron|pipeline|fallback|placeholder|TODO|insufficient data|not enough data|live signal|refresh)/i.test(clean);
}

export function normalizeCompanyProfileBriefs(
  company: Company,
  input: Partial<Pick<CompanyProfileBriefs, "whySaving" | "whatBuilding" | "aiModelUse">>,
  {
    generatedAt = new Date().toISOString(),
    model,
    sourceHash = getCompanyProfileBriefSourceHash(company),
  }: {
    generatedAt?: string;
    model?: string;
    sourceHash?: string;
  } = {},
): CompanyProfileBriefs {
  const fallback = generateFallbackCompanyProfileBriefs(company, sourceHash);
  const briefs: CompanyProfileBriefs = {
    whySaving: normalizeBrief(input.whySaving, fallback.whySaving),
    whatBuilding: normalizeBrief(input.whatBuilding, fallback.whatBuilding),
    aiModelUse: normalizeBrief(input.aiModelUse, fallback.aiModelUse),
    generatedAt,
    sourceHash,
    model,
  };

  return isUsableBrief(briefs, sourceHash) ? briefs : fallback;
}

function normalizeBrief(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;

  const clean = dedupeSentences(value);
  return isUserFacingBrief(clean) ? trimBrief(clean, 260) : fallback;
}

function getUseCase(company: Company) {
  const phrase = (
    company.generated.hook ||
    company.short_description ||
    company.one_line_thesis ||
    company.category
  )
    .replace(/\.$/, "")
    .replace(/^AI[-\s]?powered\s+/i, "")
    .trim();

  return lowerFirstWord(phrase);
}

function getBuyerPhrase(company: Company) {
  if (/finance|trading|accounting|private market/i.test(company.category)) {
    return "finance-team";
  }
  if (/legal|compliance/i.test(company.category)) return "regulated-review";
  if (/health|clinical/i.test(company.category)) return "care-delivery";
  if (/consumer|social/i.test(company.category)) return "consumer";
  if (/infrastructure|model|dev|data|memory/i.test(company.category)) {
    return "builder";
  }
  return "operational";
}

function getModelUseBrief(company: Company, useCase: string) {
  const usage = company.ai_usage_profile;

  if (/model|dev|llm|infrastructure/i.test(company.category)) {
    return `${company.name} sits in the AI development layer, helping teams build, evaluate, deploy, or operate model-backed products.`;
  }

  if (/data|memory/i.test(company.category)) {
    return `${company.name} uses AI around context, retrieval, or memory so teams can reason over messy information.`;
  }

  if (/consumer|social/i.test(company.category)) {
    return `${company.name} uses models inside repeated consumer behavior rather than as a one-off prompt surface.`;
  }

  if (/health|clinical/i.test(company.category)) {
    return `${company.name} applies models to care or operations workflows where context and handoff quality matter.`;
  }

  if (usage && !isCategoryTemplate(usage, company)) {
    return dedupeSentences(usage);
  }

  return `${company.name} applies AI to ${useCase}, with the model acting inside a repeat workflow rather than as a generic chat layer.`;
}

function isCategoryTemplate(value: string, company: Company) {
  return (
    /reasoning models|structured outputs|retrieval|document understanding|workflow automation|LLM application development/i.test(value) ||
    value.includes(company.one_line_thesis) ||
    value.includes(company.short_description)
  );
}

function lowerFirstWord(value: string) {
  return value.replace(/^[A-Z][a-z]+/, (match) => match.toLowerCase());
}

function dedupeSentences(value: string) {
  const sentences = value
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const sentence of sentences) {
    const key = sentence.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(sentence);
  }

  return unique.join(" ").trim();
}

function hasRepeatedSentence(value: string) {
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
    .filter(Boolean);

  return new Set(sentences).size !== sentences.length;
}

function trimBrief(value: string, maxLength: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;

  const sliced = clean.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${sliced.slice(0, lastSpace > 80 ? lastSpace : sliced.length).trim().replace(/[,:;]$/, "")}.`;
}
