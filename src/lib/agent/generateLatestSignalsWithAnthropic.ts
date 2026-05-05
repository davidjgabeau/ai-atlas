import type {
  AgentCompany,
  CompanyEvent,
  EditorialItem,
  MarketSnapshot,
} from "../../types/agent";
import { normalizeSignalLabel } from "../signals/companySignal";
import { createId } from "./hash";
import {
  getAnthropicEditorialModel,
  isAnthropicEditorialEnabled,
} from "./generateCurrentReadWithAnthropic";

type GenerateLatestSignalsInput = {
  companies: AgentCompany[];
  events: CompanyEvent[];
  currentSnapshot: MarketSnapshot;
  priorItems: EditorialItem[];
  generatedAt: string;
};

type AnthropicLatestSignalItem = {
  companyId: string;
  body: string;
  label: string;
  supportingEventIds: string[];
};

type AnthropicLatestSignalsResponse = {
  items: AnthropicLatestSignalItem[];
};

const anthropicMessagesUrl = "https://api.anthropic.com/v1/messages";
const anthropicVersion = "2023-06-01";

const latestSignalSystemPrompt = [
  "You write the Latest Signals section for AI Atlas NYC.",
  "Each item should feel like a concise analyst note, not a database event.",
  "Write with concrete buyer, workflow, product, or category logic.",
  "Do not use hype, VC filler, or internal product language.",
].join(" ");

const bannedLatestSignalPhrases = [
  "fresh addition",
  "added to ai atlas",
  "joined the map",
  "joined ai atlas",
  "category depth",
  "strong category fit",
  "promising",
  "high potential",
  "live signal",
  "pipeline",
  "fallback",
  "refresh",
];

export async function generateLatestSignalsWithAnthropic({
  companies,
  events,
  currentSnapshot,
  priorItems,
  generatedAt,
}: GenerateLatestSignalsInput): Promise<{
  items: EditorialItem[];
  model?: string;
  error?: string;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !isAnthropicEditorialEnabled()) {
    return { items: [] };
  }

  const model = getAnthropicEditorialModel();
  const candidates = getLatestSignalCandidates({
    companies,
    events,
    generatedAt,
  });
  if (candidates.length === 0) return { items: [], model };

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
        system: latestSignalSystemPrompt,
        messages: [
          {
            role: "user",
            content: buildLatestSignalsPrompt({
              candidates,
              currentSnapshot,
              priorItems,
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
                  minItems: 5,
                  maxItems: 5,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "companyId",
                      "body",
                      "label",
                      "supportingEventIds",
                    ],
                    properties: {
                      companyId: { type: "string" },
                      body: {
                        type: "string",
                        minLength: 80,
                        maxLength: 220,
                      },
                      label: {
                        type: "string",
                        enum: [
                          "Featured",
                          "Worth watching",
                          "Recently added",
                          "Clear buyer pull",
                          "Workflow signal",
                          "Infra signal",
                          "Consumer signal",
                          "Enterprise signal",
                          "Funding signal",
                        ],
                      },
                      supportingEventIds: {
                        type: "array",
                        minItems: 1,
                        items: { type: "string" },
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
        error: `Anthropic latest_signals generation failed: ${response.status} ${summarize(errorText, 220)}`,
      };
    }

    const payload = await response.json() as Record<string, unknown>;
    const parsed = parseStructuredOutput(payload);
    if (!parsed) {
      return {
        items: [],
        model,
        error: "Anthropic latest_signals generation returned no parseable structured output.",
      };
    }

    const companiesById = new Map(companies.map((company) => [company.id, company]));
    const eventsById = new Map(events.map((event) => [event.id, event]));
    const candidateCompanyIds = new Set(candidates.map(({ company }) => company.id));
    const seenCompanies = new Set<string>();
    const seenBodies = new Set<string>();
    const items: EditorialItem[] = [];

    for (const item of parsed.items) {
      if (items.length === 5) break;
      if (seenCompanies.has(item.companyId)) continue;
      if (!candidateCompanyIds.has(item.companyId)) continue;
      const company = companiesById.get(item.companyId);
      if (!company) continue;

      const supportingEvents = item.supportingEventIds
        .map((id) => eventsById.get(id))
        .filter((event): event is CompanyEvent => Boolean(event))
        .filter((event) => event.companyId === company.id);
      if (supportingEvents.length === 0) continue;

      const body = normalizeBody(item.body);
      const bodyKey = body.toLowerCase().slice(0, 52);
      if (!isGoodLatestSignalBody(body, company.name)) continue;
      if (seenBodies.has(bodyKey)) continue;

      seenCompanies.add(company.id);
      seenBodies.add(bodyKey);
      items.push({
        id: createId("latest_signal_anthropic", {
          model,
          companyId: company.id,
          body,
          supportingEventIds: supportingEvents.map((event) => event.id),
        }),
        title: company.name,
        body,
        companyId: company.id,
        category: company.category,
        label: normalizeSignalLabel(item.label, toSignalCompany(company)),
        supportingEventIds: supportingEvents.map((event) => event.id),
        supportingCompanyIds: [company.id],
        score: Math.max(...supportingEvents.map((event) => event.finalScore)),
        sourceName: supportingEvents[0]?.sourceName,
        sourceUrl: supportingEvents[0]?.sourceUrl,
        occurredAt: getLatestDate(supportingEvents.map((event) => event.occurredAt)),
      });
    }

    return { items, model };
  } catch (error) {
    return {
      items: [],
      model,
      error: `Anthropic latest_signals generation failed: ${getErrorMessage(error)}`,
    };
  }
}

function buildLatestSignalsPrompt({
  candidates,
  currentSnapshot,
  priorItems,
}: {
  candidates: ReturnType<typeof getLatestSignalCandidates>;
  currentSnapshot: MarketSnapshot;
  priorItems: EditorialItem[];
}) {
  return JSON.stringify({
    task: "Generate exactly 5 Latest Signals cards for AI Atlas NYC.",
    scope:
      "AI Atlas covers early-stage NYC AI startups from pre-seed through Series A. Write for a homepage reader scanning for why each company matters now.",
    hardRules: [
      "Pick one company per item from candidates only.",
      "Use the exact companyId and at least one event id from that candidate.",
      "The body must explain why this signal matters, not merely restate that the company was added.",
      "Each body must use a different sentence shape and must not share the same opening phrase.",
      "Prefer buyer/workflow/product implications over generic category summaries.",
      "Do not say Fresh addition, added to AI Atlas, joined the map, ecosystem, promising, high potential, or strong category fit.",
      "Do not mention funding, customers, investors, or hiring unless it appears in the candidate facts.",
      "Do not make global market claims; keep it tied to the NYC early-stage map.",
      "Bodies should be 1 sentence, 80 to 190 characters.",
    ],
    usefulAngles: [
      "who the buyer likely is",
      "which workflow is becoming productized",
      "why the company expands a category in a non-obvious way",
      "what makes the role in the stack specific",
      "what the signal suggests for founders, buyers, or investors",
    ],
    currentSnapshot: {
      generatedAt: currentSnapshot.generatedAt,
      companyCount: currentSnapshot.companyCount,
      topCategories: currentSnapshot.topCategories,
      topSignals: currentSnapshot.topSignals,
    },
    avoidRepeatingRecentCopy: priorItems.slice(0, 8).map((item) => ({
      title: item.title,
      body: item.body,
      label: item.label,
    })),
    candidates: candidates.map(({ company, events }) => ({
      company: {
        id: company.id,
        name: company.name,
        category: company.category,
        stage: company.stage,
        description: company.oneSentenceDescription || company.description,
        hook: company.generated?.hook,
        signalLabel: company.generated?.signalLabel,
        tags: company.tags.slice(0, 6),
      },
      events: events.slice(0, 3).map((event) => ({
        id: event.id,
        type: event.type,
        title: event.title,
        summary: event.summary,
        occurredAt: event.occurredAt,
        finalScore: event.finalScore,
        sourceName: event.sourceName,
        extractedFacts: event.extractedFacts,
      })),
    })),
  });
}

function getLatestSignalCandidates({
  companies,
  events,
  generatedAt,
}: Pick<GenerateLatestSignalsInput, "companies" | "events" | "generatedAt">) {
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const eventsByCompany = new Map<string, CompanyEvent[]>();

  for (const event of events) {
    if (event.finalScore < 0.55) continue;
    if (!isWithinDays(event.discoveredAt || event.occurredAt, generatedAt, 45)) {
      continue;
    }

    const group = eventsByCompany.get(event.companyId) ?? [];
    group.push(event);
    eventsByCompany.set(event.companyId, group);
  }

  return Array.from(eventsByCompany.entries())
    .map(([companyId, companyEvents]) => {
      const company = companiesById.get(companyId);
      if (!company) return null;

      const sortedEvents = companyEvents.sort(
        (left, right) =>
          right.finalScore - left.finalScore ||
          getTime(right.occurredAt) - getTime(left.occurredAt),
      );

      return {
        company,
        events: sortedEvents,
        score: Math.max(...sortedEvents.map((event) => event.finalScore)),
        latestAt: getLatestDate(sortedEvents.map((event) => event.occurredAt)),
      };
    })
    .filter((candidate): candidate is {
      company: AgentCompany;
      events: CompanyEvent[];
      score: number;
      latestAt: string;
    } => Boolean(candidate))
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) return scoreDelta;
      return getTime(right.latestAt) - getTime(left.latestAt);
    })
    .slice(0, 18);
}

function parseStructuredOutput(payload: Record<string, unknown>): AnthropicLatestSignalsResponse | null {
  const text = extractOutputText(payload);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as AnthropicLatestSignalsResponse;
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

function isGoodLatestSignalBody(body: string, companyName: string) {
  const normalized = body.toLowerCase();
  if (body.length < 55 || body.length > 220) return false;
  if (bannedLatestSignalPhrases.some((phrase) => normalized.includes(phrase))) {
    return false;
  }
  if (!/[.!?]$/.test(body)) return false;

  return (
    normalized.includes(companyName.toLowerCase()) ||
    /\b(buyer|customer|team|workflow|operator|founder|platform|product|stack|market|category|infrastructure|data|clinical|finance|legal|consumer|social|security|research)\b/.test(
      normalized,
    )
  );
}

function normalizeBody(value: string) {
  const body = value.replace(/\s+/g, " ").trim();
  if (body.length <= 220) return ensureSentencePunctuation(body);
  return ensureSentencePunctuation(
    body.slice(0, 219).trim().replace(/[,;:]$/, ""),
  );
}

function ensureSentencePunctuation(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function toSignalCompany(company: AgentCompany) {
  return {
    category: company.category,
    funding_amount: company.funding?.latestRoundAmount,
    funding_round: company.funding?.latestRound,
    generated: company.generated,
    is_featured: false,
    recent_activity_text: "",
    short_description: company.description,
    stage: company.stage,
    one_line_thesis: company.oneSentenceDescription,
    why_it_matters: company.description,
  };
}

function isWithinDays(value: string, nowValue: string, days: number) {
  const date = getTime(value);
  const now = getTime(nowValue);
  return date > 0 && now - date <= days * 86_400_000;
}

function getLatestDate(values: string[]) {
  const latest = values.reduce((max, value) => Math.max(max, getTime(value)), 0);
  return latest > 0 ? new Date(latest).toISOString() : new Date().toISOString();
}

function getTime(value: string | undefined) {
  const time = new Date(value ?? "").getTime();
  return Number.isNaN(time) ? 0 : time;
}

function summarize(value: string, maxLength: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}...`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
