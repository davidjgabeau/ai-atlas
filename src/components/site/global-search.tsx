"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { CompanyLogo } from "@/components/market-map/company-logo";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/market";

type GlobalSearchProps = {
  id?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
  autoFocus?: boolean;
};

type SearchResult = {
  id: string;
  title: string;
  href: string;
  label: string;
  detail: string;
  logoUrl: string;
  category: Category;
};

export function GlobalSearch({
  id,
  value,
  onValueChange,
  className,
  inputClassName,
  iconClassName,
  autoFocus = false,
}: GlobalSearchProps) {
  const router = useRouter();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [internalValue, setInternalValue] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = value ?? internalValue;
  const trimmedQuery = query.trim();
  const visibleResults = trimmedQuery ? results : [];
  const listboxId = `${inputId}-results`;
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeResult = activeIndex >= 0 ? visibleResults[activeIndex] : null;

  useEffect(() => {
    if (!autoFocus) return;

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [autoFocus]);

  useEffect(() => {
    if (!trimmedQuery) return;

    const controller = new AbortController();
    const debounceId = window.setTimeout(() => {
      setLoading(true);

      fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((data: { results?: SearchResult[] }) => {
          setResults(data.results ?? []);
          setActiveIndex(-1);
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === "AbortError") return;

          setResults([]);
          setActiveIndex(-1);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 90);

    return () => {
      window.clearTimeout(debounceId);
      controller.abort();
    };
  }, [trimmedQuery]);

  const activeDescendant = useMemo(() => {
    return activeResult ? `${listboxId}-${activeResult.id}` : undefined;
  }, [activeResult, listboxId]);

  function setQuery(nextValue: string) {
    const nextQuery = nextValue.trim();

    if (value === undefined) setInternalValue(nextValue);

    onValueChange?.(nextValue);
    setResults([]);
    setActiveIndex(-1);
    setLoading(Boolean(nextQuery));

    if (!nextQuery) {
      setOpen(false);
      return;
    }

    setOpen(true);
  }

  function navigateTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  function submitSearch() {
    if (activeResult) {
      navigateTo(activeResult.href);
      return;
    }

    if (!trimmedQuery) return;

    navigateTo(`/companies?q=${encodeURIComponent(trimmedQuery)}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && visibleResults.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((currentIndex) =>
        currentIndex >= visibleResults.length - 1 ? 0 : currentIndex + 1,
      );
      return;
    }

    if (event.key === "ArrowUp" && visibleResults.length > 0) {
      event.preventDefault();
      setActiveIndex((currentIndex) =>
        currentIndex <= 0 ? visibleResults.length - 1 : currentIndex - 1,
      );
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <form
      ref={formRef}
      action="/companies"
      className={cn("relative", className)}
      onSubmit={(event) => {
        event.preventDefault();
        submitSearch();
      }}
      onBlur={(event) => {
        if (formRef.current?.contains(event.relatedTarget)) return;

        setOpen(false);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Search companies, sectors, founders
      </label>
      <Search
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9B948A]",
          iconClassName,
        )}
      />
      <Input
        ref={inputRef}
        id={inputId}
        name="q"
        type="search"
        value={query}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && Boolean(trimmedQuery)}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        autoComplete="off"
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (trimmedQuery) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search companies, sectors, founders"
        className={inputClassName}
        autoFocus={autoFocus}
      />

      {open && trimmedQuery ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[70] overflow-hidden rounded-md border border-[#E7E1D8] bg-[#FBFAF7] text-[#181818] shadow-xl">
          <div
            id={listboxId}
            role="listbox"
            aria-label="Search results"
            className="max-h-[min(420px,70vh)] overflow-y-auto p-1"
          >
            {visibleResults.length > 0 ? (
              visibleResults.map((result, index) => (
                <Link
                  key={result.id}
                  id={`${listboxId}-${result.id}`}
                  href={result.href}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cn(
                    "grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-md px-2 py-2 text-left transition hover:bg-[rgb(17_17_17_/_0.04)]",
                    index === activeIndex && "bg-[rgb(154_61_43_/_0.08)]",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  <SearchResultIcon result={result} />
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-[#181818]">
                        {result.title}
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
                        {result.label}
                      </span>
                    </span>
                    {result.detail ? (
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-[#66625C]">
                        {result.detail}
                      </span>
                    ) : null}
                  </span>
                </Link>
              ))
            ) : (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-[#66625C]">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-[#9A3D2B]" />
                    Searching...
                  </>
                ) : (
                  <span>
                    <span className="block font-medium text-[#181818]">
                      No matching companies yet.
                    </span>
                    <span className="block">
                      Try a company, founder, category, or market.
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-between border-t border-[#E7E1D8] bg-[#F8F6F1] px-3 py-2 text-xs font-semibold text-[#5F5A52] transition hover:bg-[rgb(17_17_17_/_0.035)]"
          >
            <span>
              Search all companies for <span aria-hidden="true">&quot;</span>
              {trimmedQuery}
              <span aria-hidden="true">&quot;</span>
            </span>
            <span aria-hidden="true">Enter</span>
          </button>
        </div>
      ) : null}
    </form>
  );
}

function SearchResultIcon({ result }: { result: SearchResult }) {
  return (
    <CompanyLogo
      name={result.title}
      category={result.category}
      logoUrl={result.logoUrl}
      className="size-9 text-[10px]"
    />
  );
}
