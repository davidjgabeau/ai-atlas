"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Eye,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { CompanyLogo } from "@/components/market-map/company-logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatViewCount } from "@/lib/metrics/formatViewCount";
import type {
  AskAtlasCompanyCard,
  AskAtlasMessage,
  AskAtlasStreamEvent,
} from "@/types/ask-atlas";

const maxHistoryMessages = 4;

type AskAtlasClientProps = {
  initialQuery?: string;
  examples: string[];
};

export function AskAtlasClient({
  initialQuery = "",
  examples,
}: AskAtlasClientProps) {
  const [input, setInput] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [companies, setCompanies] = useState<AskAtlasCompanyCard[]>([]);
  const [history, setHistory] = useState<AskAtlasMessage[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoRanRef = useRef(false);
  const cleanInput = input.trim();
  const canSubmit = Boolean(cleanInput) && !loading;
  const answerBlocks = useMemo(() => splitAnswer(answer), [answer]);

  const runAsk = useCallback(async (query: string) => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    let streamedAnswer = "";

    setInput(query);
    setSubmittedQuery(query);
    setAnswer("");
    setCompanies([]);
    setError("");
    setLoading(true);
    setHasAsked(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          history: history.slice(-maxHistoryMessages),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error ?? "Ask Atlas could not start the response.",
        );
      }

      await readAskStream(response, (event) => {
        if (event.type === "delta") {
          streamedAnswer += event.text;
          setAnswer((current) => current + event.text);
          return;
        }

        if (event.type === "companies") {
          setCompanies(event.companies);
          return;
        }

        if (event.type === "error") {
          setError(event.message);
          return;
        }

        if (event.type === "done") {
          setLoading(false);
        }
      });

      if (streamedAnswer.trim()) {
        setHistory((current) => {
          const nextMessages: AskAtlasMessage[] = [
            ...current,
            { role: "user", content: query },
            { role: "assistant", content: streamedAnswer.trim() },
          ];

          return nextMessages.slice(-maxHistoryMessages);
        });
      }
    } catch (caughtError) {
      if (caughtError instanceof Error && caughtError.name === "AbortError") {
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Ask Atlas could not answer that question.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [history]);

  useEffect(() => {
    if (autoRanRef.current || !initialQuery.trim()) return;

    autoRanRef.current = true;
    void runAsk(initialQuery.trim());
  }, [initialQuery, runAsk]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    await runAsk(cleanInput);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:gap-8">
      <section className="rounded-[14px] border border-[#E3D9CE] bg-[rgb(251_250_247_/_0.68)] p-4 md:p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ask-atlas-input" className="editorial-label">
              Ask a market question
            </label>
            <Textarea
              id="ask-atlas-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                hasAsked
                  ? "Ask a follow-up..."
                  : "I'm a seed investor focused on infrastructure — what should I be watching?"
              }
              className="mt-3 min-h-[132px] resize-none rounded-[12px] border-[#D8CFC1] bg-[#FBFAF7] px-4 py-4 text-[16px] leading-7 text-[#181818] shadow-none placeholder:text-[#8C857C] focus-visible:border-[#9A3D2B] focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-[#6F675E]">
              Answers use only AI Atlas company, category, pattern, and signal
              data.
            </p>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-11 rounded-lg app-primary-button"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Asking
                </>
              ) : (
                <>
                  Ask Atlas
                  <Send className="size-4" />
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => void runAsk(example)}
              className="rounded-full border border-[#E3D9CE] bg-[#F8F6F1] px-3 py-1.5 text-left text-xs font-semibold leading-5 text-[#5F5A52] transition hover:border-[#C8B8A8] hover:text-[#181818] disabled:opacity-60"
              disabled={loading}
            >
              {example}
            </button>
          ))}
        </div>
      </section>

      <section
        className="min-h-[360px] rounded-[14px] border border-[#E3D9CE] bg-[rgb(251_250_247_/_0.55)] p-4 md:p-5"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#E7E1D8] pb-4">
          <div>
            <p className="editorial-label">Response</p>
            <h2 className="mt-2 font-heading text-[30px] font-medium leading-none text-[#181818]">
              Ask Atlas
            </h2>
          </div>
          <span className="grid size-10 place-items-center rounded-[12px] border border-[#E3D9CE] bg-[#FBFAF7] text-[#9A3D2B]">
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Sparkles className="size-5" />
            )}
          </span>
        </div>

        {submittedQuery ? (
          <p className="mt-4 rounded-[10px] border border-[#E7E1D8] bg-[#F8F6F1] px-3 py-2 text-sm font-medium leading-6 text-[#4F4A43]">
            {submittedQuery}
          </p>
        ) : null}

        <div className="mt-5">
          {answerBlocks.length > 0 ? (
            <div className="space-y-4 text-[16px] leading-7 text-[#33302C]">
              {answerBlocks.map((block, index) => (
                <p key={`${block}-${index}`}>{block}</p>
              ))}
            </div>
          ) : (
            <EmptyAskState loading={loading} />
          )}

          {error ? (
            <p className="mt-5 rounded-[10px] border border-[#E7C8C1] bg-[#FFF8F5] px-3 py-2 text-sm leading-6 text-[#9A3D2B]">
              {error}
            </p>
          ) : null}
        </div>

        {companies.length > 0 ? (
          <div className="mt-7">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-[#9A3D2B]" />
              <p className="editorial-label">Companies to inspect</p>
            </div>
            <div className="mt-3 grid gap-3">
              {companies.map((company) => (
                <AskCompanyCard key={company.id} company={company} />
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function EmptyAskState({ loading }: { loading: boolean }) {
  return (
    <div className="grid min-h-[180px] place-items-center rounded-[12px] border border-dashed border-[#D8CFC1] bg-[#F8F6F1]/70 px-5 py-8 text-center">
      <div>
        <MessageSquareText className="mx-auto size-7 text-[#9A3D2B]" />
        <p className="mt-3 font-heading text-[24px] leading-none text-[#181818]">
          {loading ? "Reading the map..." : "Ask in plain English."}
        </p>
        <p className="mx-auto mt-2 max-w-[320px] text-sm leading-6 text-[#6F675E]">
          Ask about competitors, categories, white space, infrastructure,
          healthcare, model customers, or where the map is moving.
        </p>
      </div>
    </div>
  );
}

function AskCompanyCard({ company }: { company: AskAtlasCompanyCard }) {
  return (
    <Link
      href={`/companies/${company.slug}`}
      className="group grid grid-cols-[56px_minmax(0,1fr)_auto] gap-3 rounded-[12px] border border-[#E3D9CE] bg-[#FBFAF7] p-3 transition hover:border-[#C8B8A8] hover:bg-[rgb(154_61_43_/_0.04)]"
    >
      <CompanyLogo
        name={company.name}
        category={company.category}
        logoUrl={company.logoUrl}
        websiteUrl={company.websiteUrl}
        className="size-14 rounded-[10px] ring-0"
      />
      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-heading text-[22px] font-medium leading-none text-[#181818]">
            {company.name}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
            {company.signalLabel}
          </span>
        </span>
        <span className="mt-1 line-clamp-2 block text-sm font-semibold leading-6 text-[#181818]">
          {company.hook}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-[#746D64]">
          <span>{company.category}</span>
          <span aria-hidden="true">·</span>
          <span>{company.stage}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3.5" />
            {formatViewCount(company.views)}
          </span>
        </span>
      </span>
      <ArrowRight className="mt-1 size-4 text-[#9A3D2B] transition group-hover:translate-x-0.5" />
    </Link>
  );
}

async function readAskStream(
  response: Response,
  onEvent: (event: AskAtlasStreamEvent) => void,
) {
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
      const event = parseStreamEvent(line);
      if (event) onEvent(event);
    }
  }

  const finalEvent = parseStreamEvent(buffer);
  if (finalEvent) onEvent(finalEvent);
}

function parseStreamEvent(value: string): AskAtlasStreamEvent | null {
  if (!value.trim()) return null;

  try {
    return JSON.parse(value) as AskAtlasStreamEvent;
  } catch {
    return null;
  }
}

function splitAnswer(value: string) {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}
