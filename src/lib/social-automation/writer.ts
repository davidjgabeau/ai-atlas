import {
  getSocialAutomationConfig,
  type SocialAutomationConfig,
} from "@/lib/social-automation/config";
import type { SocialPostCandidate, SocialWriterResult } from "@/types/social";

const anthropicMessagesUrl = "https://api.anthropic.com/v1/messages";
const anthropicVersion = "2023-06-01";
export const socialPromptVersion = "social-v1";

type AnthropicMessagePayload = {
  content?: Array<{
    text?: string;
    type?: string;
  }>;
};

type SocialDraftResponse = {
  text: string;
  risk?: "low" | "medium" | "high";
  reason?: string;
};

export async function writeSocialDraftWithClaude({
  candidate,
  config = getSocialAutomationConfig(),
}: {
  candidate: SocialPostCandidate;
  config?: SocialAutomationConfig;
}): Promise<SocialWriterResult> {
  if (!config.anthropicApiKey) {
    return {
      text: "",
      risk: "high",
      reason: "",
      error: "ANTHROPIC_API_KEY is not configured.",
    };
  }

  try {
    const response = await fetch(anthropicMessagesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": anthropicVersion,
        "x-api-key": config.anthropicApiKey,
      },
      body: JSON.stringify({
        model: config.anthropicModel,
        max_tokens: 600,
        temperature: 0.65,
        system: getSystemPrompt(),
        messages: [
          {
            role: "user",
            content: buildWriterPrompt(candidate),
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        text: "",
        risk: "high",
        reason: "",
        model: config.anthropicModel,
        error: `Anthropic social writer failed: ${response.status} ${summarize(errorText, 220)}`,
      };
    }

    const payload = (await response.json()) as AnthropicMessagePayload;
    const parsed = parseDraftResponse(payload);

    if (!parsed?.text) {
      return {
        text: "",
        risk: "high",
        reason: "",
        model: config.anthropicModel,
        error: "Anthropic social writer returned no parseable draft.",
      };
    }

    return {
      text: parsed.text.trim(),
      risk: normalizeRisk(parsed.risk),
      reason: parsed.reason?.trim() ?? "",
      model: config.anthropicModel,
    };
  } catch (error) {
    return {
      text: "",
      risk: "high",
      reason: "",
      model: config.anthropicModel,
      error: `Anthropic social writer failed: ${getErrorMessage(error)}`,
    };
  }
}

function getSystemPrompt() {
  return [
    "You write posts for AI Atlas NYC, a premium editorial market map for early-stage NYC AI startups.",
    "Voice: fun, outgoing, celebratory of NYC tech, concise, specific, editorial, lightly opinionated, founder-friendly.",
    "Write like a sharp NYC tech editor, not a database bot.",
    "Return JSON only: {\"text\":\"...\",\"risk\":\"low|medium|high\",\"reason\":\"...\"}.",
  ].join("\n");
}

function buildWriterPrompt(candidate: SocialPostCandidate) {
  const allowedHandles = candidate.companies
    .map((company) => ({
      company: company.name,
      handle: company.x_handle ? `@${company.x_handle.replace(/^@/, "")}` : "",
    }))
    .filter((item) => item.handle);

  return JSON.stringify({
    task: "Draft one X post for the AI Atlas NYC account.",
    sourceKind: candidate.sourceKind,
    title: candidate.title,
    facts: candidate.facts,
    companies: candidate.companies.map((company) => ({
      id: company.id,
      name: company.name,
      category: company.category,
      stage: company.stage,
      description: company.one_line_thesis || company.short_description,
      verifiedXHandle: company.x_handle
        ? `@${company.x_handle.replace(/^@/, "")}`
        : "",
    })),
    category: candidate.category,
    sourceUrls: candidate.sourceUrls,
    primaryUrl: candidate.primaryUrl,
    allowedHandles,
    hardRules: [
      "Use only supplied facts.",
      "Stay under 260 characters when possible, never over 280.",
      "End with primaryUrl exactly as supplied when primaryUrl is present.",
      "Do not include any other URL when primaryUrl is present.",
      "Tag a company only if its verifiedXHandle is supplied in allowedHandles.",
      "Never invent handles.",
      "Do not claim funding, customers, hiring, location, or traction unless supplied.",
      "Avoid hashtags unless one is genuinely useful; never use more than one.",
      "Avoid emoji unless it is truly natural; never use more than one.",
      "Do not ask a question unless the source genuinely supports it.",
      "Do not mention cron, agent, pipeline, fallback, refresh, queue, or automation.",
    ],
    bannedPhrases: [
      "unlock",
      "leverage",
      "revolutionize",
      "cutting-edge",
      "disrupting",
      "heat index",
      "heating up",
      "joined the map",
      "added to AI Atlas",
      "AI-powered as the first words",
      "workflow depth",
      "gains density",
      "remains clearer",
      "database dump",
    ],
    examplesOfDirection: [
      "Specific company or category observation first.",
      "A little NYC energy is welcome, but keep it crisp.",
      "Prefer concrete nouns over hype.",
    ],
    output: {
      text: "Draft copy for X.",
      risk: "low, medium, or high.",
      reason: "One short reason for the draft and risk rating.",
    },
  });
}

function parseDraftResponse(payload: AnthropicMessagePayload): SocialDraftResponse | null {
  const text = (payload.content ?? [])
    .map((item) => (typeof item.text === "string" ? item.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) return null;

  const jsonText =
    text.match(/```json\s*([\s\S]*?)```/i)?.[1] ??
    text.match(/\{[\s\S]*\}/)?.[0] ??
    text;

  try {
    const parsed = JSON.parse(jsonText) as Partial<SocialDraftResponse>;
    if (typeof parsed.text !== "string") return null;

    return {
      text: parsed.text,
      risk: normalizeRisk(parsed.risk),
      reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
    };
  } catch {
    return null;
  }
}

function normalizeRisk(value: unknown): NonNullable<SocialDraftResponse["risk"]> {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : "medium";
}

function summarize(value: string, maxLength: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3).trim()}...`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
