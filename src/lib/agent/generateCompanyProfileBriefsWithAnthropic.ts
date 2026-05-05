import type { Company, CompanyProfileBriefs } from "@/types/market";
import {
  getCompanyProfileBriefSourceHash,
  normalizeCompanyProfileBriefs,
} from "@/lib/editorial/companyProfileBriefs";

type AnthropicBriefResponse = {
  whySaving: string;
  whatBuilding: string;
  aiModelUse: string;
};

const anthropicMessagesUrl = "https://api.anthropic.com/v1/messages";
const anthropicVersion = "2023-06-01";
const defaultCompanyBriefModel = "claude-sonnet-4-6";

export function isAnthropicCompanyBriefsEnabled() {
  return Boolean(
    process.env.ANTHROPIC_API_KEY &&
      process.env.ENABLE_ANTHROPIC_COMPANY_BRIEFS !== "false" &&
      process.env.ENABLE_LLM_EDITORIAL !== "false",
  );
}

export function getAnthropicCompanyBriefModel() {
  return (
    process.env.ANTHROPIC_COMPANY_BRIEF_MODEL ??
    process.env.ANTHROPIC_EDITORIAL_MODEL ??
    defaultCompanyBriefModel
  );
}

export async function generateCompanyProfileBriefsWithAnthropic(
  company: Company,
): Promise<{
  briefs?: CompanyProfileBriefs;
  model?: string;
  error?: string;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !isAnthropicCompanyBriefsEnabled()) {
    return { error: "ANTHROPIC_API_KEY is not configured for company briefs." };
  }

  const model = getAnthropicCompanyBriefModel();
  const sourceHash = getCompanyProfileBriefSourceHash(company);

  try {
    const response = await fetch(anthropicMessagesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": anthropicVersion,
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        max_tokens: 900,
        temperature: 0.55,
        system:
          "You write factual, concise editorial company profile copy for AI Atlas NYC. Use only supplied facts. Do not invent customers, investors, funding, location, model details, or traction. Avoid hype, generic templates, and repeated sentence structure.",
        messages: [
          {
            role: "user",
            content: buildCompanyBriefPrompt(company),
          },
        ],
      }),
      signal: AbortSignal.timeout(getAnthropicTimeoutMs()),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        model,
        error: `Anthropic company brief generation failed for ${company.name}: ${response.status} ${summarize(errorText, 220)}`,
      };
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const parsed = parseBriefOutput(payload);
    if (!parsed) {
      return {
        model,
        error: `Anthropic company brief generation returned no parseable JSON for ${company.name}.`,
      };
    }

    return {
      briefs: normalizeCompanyProfileBriefs(company, parsed, {
        model,
        sourceHash,
      }),
      model,
    };
  } catch (error) {
    return {
      model,
      error: `Anthropic company brief generation failed for ${company.name}: ${getErrorMessage(error)}`,
    };
  }
}

function buildCompanyBriefPrompt(company: Company) {
  return JSON.stringify({
    task:
      "Generate three non-redundant company-page blurbs. Return JSON only with keys whySaving, whatBuilding, aiModelUse.",
    style: [
      "Premium editorial product copy, not sales copy.",
      "Specific enough to teach the reader why the company matters.",
      "Vary sentence structure across the three fields.",
      "Avoid starting every sentence with the company name.",
      "Avoid generic phrases like AI-powered, innovative, platform, solution unless essential.",
      "No repeated sentences or copy-pasted source text.",
    ],
    fieldRules: {
      whySaving:
        "Why a reader might save this company. Mention the buyer, workflow, product wedge, or category relevance. 1 sentence, 90-220 characters.",
      whatBuilding:
        "What the company is building in concrete terms. 1 sentence, 90-240 characters.",
      aiModelUse:
        "How AI/models appear to matter to the product based only on supplied facts. If model details are not explicit, frame it as product-level AI usage, not technical internals. 1 sentence, 90-240 characters.",
    },
    hardRules: [
      "Use only the provided facts.",
      "Do not mention funding unless funding fields support it.",
      "Do not mention customers unless supplied.",
      "Do not say 'appears', 'likely', 'maybe', 'agent', 'cron', 'pipeline', 'fallback', or 'placeholder'.",
      "Do not include headings, bullets, markdown, or citations.",
      "Do not output text outside the JSON object.",
    ],
    company: {
      id: company.id,
      name: company.name,
      category: company.category,
      stage: company.stage,
      website: company.website_url,
      founderName: company.founder_name ?? "",
      fundingRound: company.funding_round,
      fundingAmount: company.funding_amount,
      fundingDate: company.funding_date,
      totalRaised: company.total_raised,
      leadInvestor: company.lead_investor,
      fundingNote: company.funding_note,
      shortDescription: company.short_description,
      oneLineThesis: company.one_line_thesis,
      whyItMatters: company.why_it_matters,
      aiUsageProfile: company.ai_usage_profile,
      generatedHook: company.generated.hook,
      signalLabel: company.generated.signalLabel,
      signalReason: company.generated.signalReason,
      inclusionReason: company.inclusionReason?.body ?? "",
      recentActivity: company.recent_activity_text,
    },
  });
}

function parseBriefOutput(payload: Record<string, unknown>): AnthropicBriefResponse | null {
  const text = extractOutputText(payload);
  if (!text) return null;

  const jsonText =
    text.match(/```json\s*([\s\S]*?)```/i)?.[1] ??
    text.match(/\{[\s\S]*\}/)?.[0] ??
    text;

  try {
    const parsed = JSON.parse(jsonText) as Partial<AnthropicBriefResponse>;
    if (
      typeof parsed.whySaving !== "string" ||
      typeof parsed.whatBuilding !== "string" ||
      typeof parsed.aiModelUse !== "string"
    ) {
      return null;
    }

    return {
      whySaving: parsed.whySaving,
      whatBuilding: parsed.whatBuilding,
      aiModelUse: parsed.aiModelUse,
    };
  } catch {
    return null;
  }
}

function extractOutputText(payload: Record<string, unknown>) {
  const content = Array.isArray(payload.content) ? payload.content : [];

  return content
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const text = (item as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function getAnthropicTimeoutMs() {
  const value = Number(process.env.ANTHROPIC_COMPANY_BRIEF_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : 25_000;
}

function summarize(value: string, maxLength: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}...`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
