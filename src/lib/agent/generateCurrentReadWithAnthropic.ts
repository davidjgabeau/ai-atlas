import type {
  AgentCompany,
  CompanyEvent,
  EditorialItem,
  GeneratedInsightHistory,
  MarketSnapshot,
} from "../../types/agent";
import { currentReadGeneratorPrompt } from "./generateCurrentReadFallback";
import { createId } from "./hash";

type GenerateCurrentReadWithAnthropicInput = {
  companies: AgentCompany[];
  recentCompanies: AgentCompany[];
  events: CompanyEvent[];
  currentSnapshot: MarketSnapshot;
  insightHistory: GeneratedInsightHistory[];
};

type AnthropicCurrentReadItem = {
  title: string;
  body: string;
  supportingCompanyIds: string[];
  supportingEventIds: string[];
};

type AnthropicCurrentReadResponse = {
  items: AnthropicCurrentReadItem[];
};

const anthropicMessagesUrl = "https://api.anthropic.com/v1/messages";
const anthropicVersion = "2023-06-01";
const defaultEditorialModel = "claude-sonnet-4-6";

export function isAnthropicEditorialEnabled() {
  return Boolean(
    process.env.ANTHROPIC_API_KEY &&
      process.env.ENABLE_ANTHROPIC_EDITORIAL !== "false" &&
      process.env.ENABLE_LLM_EDITORIAL !== "false",
  );
}

export function getAnthropicEditorialModel() {
  return process.env.ANTHROPIC_EDITORIAL_MODEL ?? defaultEditorialModel;
}

export async function generateCurrentReadWithAnthropic({
  companies,
  recentCompanies,
  events,
  currentSnapshot,
  insightHistory,
}: GenerateCurrentReadWithAnthropicInput): Promise<{
  items: EditorialItem[];
  model?: string;
  error?: string;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !isAnthropicEditorialEnabled()) {
    return { items: [] };
  }

  const model = getAnthropicEditorialModel();

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
        max_tokens: 1200,
        system: currentReadGeneratorPrompt,
        messages: [
          {
            role: "user",
            content: buildCurrentReadPrompt({
              companies,
              recentCompanies,
              events,
              currentSnapshot,
              insightHistory,
            }),
          },
        ],
        output_config: {
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["items"],
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "title",
                      "body",
                      "supportingCompanyIds",
                      "supportingEventIds",
                    ],
                    properties: {
                      title: {
                        type: "string",
                        maxLength: 86,
                      },
                      body: {
                        type: "string",
                        maxLength: 280,
                      },
                      supportingCompanyIds: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      supportingEventIds: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        items: [],
        model,
        error: `Anthropic current_read generation failed: ${response.status} ${summarize(errorText, 220)}`,
      };
    }

    const payload = await response.json() as Record<string, unknown>;
    const parsed = parseStructuredOutput(payload);
    if (!parsed) {
      return {
        items: [],
        model,
        error: "Anthropic current_read generation returned no parseable structured output.",
      };
    }

    const companyIds = new Set(companies.map((company) => company.id));
    const eventIds = new Set(events.map((event) => event.id));
    const items = parsed.items.map((item) => normalizeAnthropicItem(item, {
      companyIds,
      eventIds,
      model,
    }));

    return { items, model };
  } catch (error) {
    return {
      items: [],
      model,
      error: `Anthropic current_read generation failed: ${getErrorMessage(error)}`,
    };
  }
}

function buildCurrentReadPrompt({
  companies,
  recentCompanies,
  events,
  currentSnapshot,
  insightHistory,
}: GenerateCurrentReadWithAnthropicInput) {
  const recentCompanyIds = new Set(recentCompanies.map((company) => company.id));
  const companiesForPrompt = [
    ...recentCompanies,
    ...companies.filter((company) => !recentCompanyIds.has(company.id)),
  ].slice(0, 36);

  return JSON.stringify({
    task: "Generate exactly 3 Current Read memo items for AI Atlas NYC.",
    scope: "AI Atlas covers early-stage NYC AI startups from pre-seed through Series A. Write inside that scope, not as a global AI market memo.",
    requiredInsightTypes: [
      "Market shift: what changed in the map recently",
      "Buyer pattern: who the clearest buyers are",
      "Product pattern: what product shape is emerging",
    ],
    hardRules: [
      "Mention 2 to 3 company names in each body when possible.",
      "Titles must be complete, readable claims; aim for 4 to 8 words.",
      "Do not mention a company unless its id appears in supportingCompanyIds.",
      "Do not mention funding, customers, or investors unless present in company or event facts.",
      "Avoid generic category summaries and banned internal language.",
      "Write for a curious reader and a VC analyst scanning for signal.",
      "Understand the scope as NYC companies at Series A and earlier; do not make global claims.",
      "Bodies may be up to 280 characters, but shorter is better when specific.",
    ],
    bannedPhrases: [
      "gains density",
      "remains clearer",
      "workflow depth",
      "operational automation",
      "recent signals from",
      "category is growing",
      "AI is expanding",
      "companies are clustering",
      "map is showing",
      "live signal",
      "refresh",
      "agent",
      "fallback",
      "pipeline",
    ],
    currentSnapshot: {
      generatedAt: currentSnapshot.generatedAt,
      companyCount: currentSnapshot.companyCount,
      categoryCounts: currentSnapshot.categoryCounts,
      recentCompanyIds: currentSnapshot.recentCompanyIds,
      recentEventIds: currentSnapshot.recentEventIds,
      topCategories: currentSnapshot.topCategories,
      topSignals: currentSnapshot.topSignals,
    },
    companies: companiesForPrompt.map((company) => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
      category: company.category,
      subcategory: company.subcategory,
      stage: company.stage,
      hook: company.generated?.hook,
      inclusionReason: company.inclusionReason?.body,
      description: company.oneSentenceDescription || company.description,
      tags: company.tags.slice(0, 8),
    })),
    recentEvents: events.slice(0, 30).map((event) => ({
      id: event.id,
      companyId: event.companyId,
      type: event.type,
      title: event.title,
      summary: event.summary,
      occurredAt: event.occurredAt,
      confidence: event.confidence,
      finalScore: event.finalScore,
      extractedFacts: event.extractedFacts,
    })),
    recentInsightHistory: insightHistory.slice(0, 12).map((item) => ({
      title: item.title,
      body: item.body,
      sourceCompanyIds: item.sourceCompanyIds,
      sourceEventIds: item.sourceEventIds,
    })),
  });
}

function parseStructuredOutput(payload: Record<string, unknown>): AnthropicCurrentReadResponse | null {
  const text = extractOutputText(payload);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as AnthropicCurrentReadResponse;
    return Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
}

function extractOutputText(payload: Record<string, unknown>) {
  const content = Array.isArray(payload.content) ? payload.content : [];

  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const text = (item as { text?: unknown }).text;
    if (typeof text === "string") return text;
  }

  return "";
}

function normalizeAnthropicItem(
  item: AnthropicCurrentReadItem,
  {
    companyIds,
    eventIds,
    model,
  }: {
    companyIds: Set<string>;
    eventIds: Set<string>;
    model: string;
  },
): EditorialItem {
  const supportingCompanyIds = item.supportingCompanyIds.filter((id) =>
    companyIds.has(id),
  );
  const supportingEventIds = item.supportingEventIds.filter((id) =>
    eventIds.has(id),
  );

  return {
    id: createId("current_read_anthropic", {
      model,
      title: item.title,
      body: item.body,
      supportingCompanyIds,
      supportingEventIds,
    }),
    title: trimTitle(item.title),
    body: trimBody(item.body),
    label: "Workflow signal",
    supportingCompanyIds,
    supportingEventIds,
    score: 9,
  };
}

function trimTitle(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function trimBody(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= 280) return clean;
  return `${clean.slice(0, 279).trim().replace(/[,.]$/, "")}.`;
}

function summarize(value: string, maxLength: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}...`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
