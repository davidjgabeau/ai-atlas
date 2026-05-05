"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CompanyLogo } from "@/components/market-map/company-logo";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Company } from "@/types/market";

const momentumTabs = [
  {
    id: "breakout-watch",
    label: "Featured",
    description: "Sharp traction, visible founder attention, or category momentum.",
  },
  {
    id: "recently-active",
    label: "Recently Active",
    description: "Fresh launches, funding, pilots, and product updates.",
  },
  {
    id: "high-usage-potential",
    label: "Workflow Depth",
    description: "Companies where AI is central to repeat work.",
  },
] as const;

type MomentumTabId = (typeof momentumTabs)[number]["id"];

type MomentumGroups = Record<MomentumTabId, Company[]>;

export function HomeMomentumTabs({ groups }: { groups: MomentumGroups }) {
  const [activeTab, setActiveTab] = useState<MomentumTabId>("breakout-watch");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = momentumTabs.findIndex((tab) => tab.id === activeTab);
  const activeCompanies = groups[activeTab];
  const activeDescription = momentumTabs[activeIndex]?.description;

  const tabCounts = useMemo(
    () =>
      momentumTabs.reduce(
        (counts, tab) => ({ ...counts, [tab.id]: groups[tab.id].length }),
        {} as Record<MomentumTabId, number>,
      ),
    [groups],
  );

  function focusTab(index: number) {
    const nextIndex = (index + momentumTabs.length) % momentumTabs.length;
    const nextTab = momentumTabs[nextIndex];

    setActiveTab(nextTab.id);
    window.requestAnimationFrame(() => tabRefs.current[nextIndex]?.focus());
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(index + 1);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(index - 1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      focusTab(momentumTabs.length - 1);
    }
  }

  return (
    <div className="rounded-md bg-[var(--app-surface)] shadow-sm app-card-border">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#181818]">
            Companies with Signal
          </h2>
          <p className="mt-1 text-sm text-[#5F5A52]">{activeDescription}</p>
        </div>
        <Button asChild variant="outline" className="bg-[var(--app-surface)]">
          <Link href="/insights">
            View highlights
            <ArrowRight className="app-arrow size-4" />
          </Link>
        </Button>
      </div>
      <div
        role="tablist"
        aria-label="Startup heat views"
        className="flex gap-6 overflow-x-auto border-b border-[#E7E1D8] px-5 text-sm font-medium text-[#7A746C]"
      >
        {momentumTabs.map((tab, index) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={`${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={cn(
                "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent pb-3 transition hover:text-[#9A3D2B]",
                isActive && "border-[#E7E1D8] text-[#9A3D2B]",
              )}
            >
              {tab.label}
              <span className="live-count-pill px-2 py-0.5 text-[11px]">
                {tabCounts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>
      <div
        id={`${activeTab}-panel`}
        role="tabpanel"
        aria-labelledby={`${activeTab}-tab`}
        className="divide-y divide-[#E7E1D8]"
      >
        {activeCompanies.map((company, index) => (
          <Link
            key={company.id}
            href={`/companies/${company.slug}`}
            className="grid grid-cols-[minmax(0,1fr)_minmax(150px,220px)] gap-4 px-5 py-4 transition hover:bg-[rgb(154_61_43_/_0.06)]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <CompanyLogo
                company={company}
                name={company.name}
                category={company.category}
                className="size-11 text-xs"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-[#181818]">
                    {company.name}
                  </p>
                  {index === 0 || company.is_breakout ? (
                    <span className="text-sm text-[#9A3D2B]">↗</span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm text-[#5F5A52]">
                  {company.short_description}
                </p>
              </div>
            </div>
            <div className="min-w-0 text-right text-sm">
              <p className="line-clamp-2 font-medium leading-5 text-[#181818]">
                {company.recent_activity_text}
              </p>
              <p className="mt-1 text-[#7A746C]">
                {formatRelativeDate(company.recent_activity_date)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
