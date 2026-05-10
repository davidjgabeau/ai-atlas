import { NextResponse, type NextRequest } from "next/server";

import { selectAskCompanyCards } from "@/lib/ask-atlas/company-ranking";
import { buildAskAtlasContext } from "@/lib/ask-atlas/context";
import type {
  AskAtlasMessage,
  AskAtlasStreamEvent,
} from "@/types/ask-atlas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const anthropicMessagesUrl = "https://api.anthropic.com/v1/messages";
const anthropicVersion = "2023-06-01";
const defaultAskModel = "claude-sonnet-4-6";
const maxQueryLength = 700;
const maxHistoryMessages = 4;
const maxHistoryMessageLength = 900;

type AskAtlasRequestBody = {
  query?: unknown;
  history?: unknown;
};

type AnthropicStreamEvent = {
  type?: string;
  delta?: {
    type?: string;
    text?: string;
  };
  error?: {
    message?: string;
  };
};

export async function POST(request: NextRequest) {
  const body = await readRequestBody(request);
  if (!body) {
    return NextResponse.json(
      { error: "Ask Atlas needs a question." },
      { status: 400 },
    );
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json(
      { error: "Ask Atlas needs a question." },
      { status: 400 },
    );
  }

  if (query.length > maxQueryLength) {
    return NextResponse.json(
      { error: "Ask Atlas questions must be under 700 characters." },
      { status: 400 },
    );
  }

  const history = normalizeHistory(body.history);

  return createAskStream(async (send) => {
    const context = await buildAskAtlasContext();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model =
      process.env.ANTHROPIC_ASK_MODEL ??
      process.env.ANTHROPIC_EDITORIAL_MODEL ??
      defaultAskModel;

    if (!apiKey) {
      send({
        type: "error",
        message:
          "Ask Atlas needs Claude configured before it can answer. Showing relevant companies instead.",
      });
      send({
        type: "companies",
        companies: selectAskCompanyCards({
          answer: "",
          query,
          companies: context.companies,
        }),
      });
      send({ type: "done" });
      return;
    }

    let answer = "";

    try {
      const anthropicResponse = await fetch(anthropicMessagesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": anthropicVersion,
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1000,
          stream: true,
          system: buildSystemPrompt(context.promptContext),
          messages: [
            ...history,
            {
              role: "user",
              content: query,
            },
          ],
        }),
        signal: AbortSignal.timeout(45_000),
      });

      if (!anthropicResponse.ok || !anthropicResponse.body) {
        send({
          type: "error",
          message:
            "Ask Atlas could not reach Claude right now. Try again in a moment.",
        });
        send({
          type: "companies",
          companies: selectAskCompanyCards({
            answer,
            query,
            companies: context.companies,
          }),
        });
        send({ type: "done" });
        return;
      }

      await streamAnthropicText({
        response: anthropicResponse,
        onDelta: (text) => {
          answer += text;
          send({ type: "delta", text });
        },
        onError: (message) => {
          send({
            type: "error",
            message: message || "Ask Atlas could not finish the response.",
          });
        },
      });

      send({
        type: "companies",
        companies: selectAskCompanyCards({
          answer,
          query,
          companies: context.companies,
        }),
      });
      send({ type: "done" });
    } catch {
      send({
        type: "error",
        message:
          "Ask Atlas could not finish the response. Try again in a moment.",
      });
      send({
        type: "companies",
        companies: selectAskCompanyCards({
          answer,
          query,
          companies: context.companies,
        }),
      });
      send({ type: "done" });
    }
  });
}

async function readRequestBody(
  request: NextRequest,
): Promise<AskAtlasRequestBody | null> {
  try {
    return (await request.json()) as AskAtlasRequestBody;
  } catch {
    return null;
  }
}

function createAskStream(
  write: (send: (event: AskAtlasStreamEvent) => void) => Promise<void>,
) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: AskAtlasStreamEvent) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          await write(send);
        } catch {
          send({
            type: "error",
            message:
              "Ask Atlas could not load the market data. Try again in a moment.",
          });
          send({ type: "done" });
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
      },
    },
  );
}

function buildSystemPrompt(context: unknown) {
  return [
    "You are Ask Atlas, the intelligence layer for AI Atlas NYC.",
    "AI Atlas NYC is a curated map of early-stage NYC AI startups from pre-seed through Series A.",
    "Answer using only the provided company, category, pattern, and signal data.",
    "Be specific: name companies, reference categories, and surface patterns the user might not have noticed.",
    "Do not invent funding, customers, traction, founders, or external news.",
    "Keep the answer under 200 words.",
    "When useful, suggest one concise follow-up question.",
    "End by naming 2 to 3 exact companies the user should inspect.",
    "",
    "AI ATLAS DATA:",
    JSON.stringify(context),
  ].join("\n");
}

function normalizeHistory(value: unknown): AskAtlasMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): AskAtlasMessage | null => {
      if (!item || typeof item !== "object") return null;
      const message = item as Partial<AskAtlasMessage>;
      const role = message.role === "assistant" ? "assistant" : "user";
      const content =
        typeof message.content === "string"
          ? message.content.trim().slice(0, maxHistoryMessageLength)
          : "";

      if (!content) return null;
      return { role, content };
    })
    .filter((item): item is AskAtlasMessage => Boolean(item))
    .slice(-maxHistoryMessages);
}

async function streamAnthropicText({
  response,
  onDelta,
  onError,
}: {
  response: Response;
  onDelta: (text: string) => void;
  onError: (message?: string) => void;
}) {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const data = trimmed.replace(/^data:\s*/, "");
      if (!data || data === "[DONE]") continue;

      const event = parseAnthropicEvent(data);
      if (!event) continue;

      const text = extractTextDelta(event);
      if (text) onDelta(text);

      if (event.type === "error") onError(event.error?.message);
    }
  }

  buffer += decoder.decode();
  for (const line of buffer.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;

    const data = trimmed.replace(/^data:\s*/, "");
    if (!data || data === "[DONE]") continue;

    const event = parseAnthropicEvent(data);
    if (!event) continue;

    const text = extractTextDelta(event);
    if (text) onDelta(text);
    if (event.type === "error") onError(event.error?.message);
  }
}

function parseAnthropicEvent(value: string): AnthropicStreamEvent | null {
  try {
    return JSON.parse(value) as AnthropicStreamEvent;
  } catch {
    return null;
  }
}

function extractTextDelta(event: AnthropicStreamEvent) {
  if (
    event.type === "content_block_delta" &&
    event.delta?.type === "text_delta" &&
    typeof event.delta.text === "string"
  ) {
    return event.delta.text;
  }

  return "";
}
