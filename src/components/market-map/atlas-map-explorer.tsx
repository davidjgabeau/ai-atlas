"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { GoogleStartupMap } from "@/components/market-map/google-startup-map";
import { Button } from "@/components/ui/button";
import { categoryMeta } from "@/data/market";
import { getCompanySignalLabel } from "@/lib/signals/companySignal";
import { cn } from "@/lib/utils";
import type { Category, Company } from "@/types/market";

export function AtlasMapExplorer({ companies }: { companies: Company[] }) {
  const [category, setCategory] = useState<Category | "all">("all");
  const [stage, setStage] = useState("all");
  const [highlightsOnly, setHighlightsOnly] = useState(false);

  const stages = useMemo(
    () => Array.from(new Set(companies.map((company) => company.stage))).sort(),
    [companies],
  );

  const filteredCompanies = useMemo(
    () =>
      companies.filter(
        (company) =>
          (category === "all" || company.category === category) &&
          (stage === "all" || company.stage === stage) &&
          (!highlightsOnly ||
            company.is_breakout ||
            getCompanySignalLabel(company) !== "Worth watching"),
      ),
    [category, companies, highlightsOnly, stage],
  );

  return (
    <div className="overflow-hidden rounded-md bg-[var(--app-surface)] shadow-sm app-card-border">
      <div className="flex flex-col gap-4 border-b border-[#E7E1D8] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-[rgb(154_61_43_/_0.10)] text-[#9A3D2B] ring-1 ring-[#E7E1D8]">
            <SlidersHorizontal className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#181818]">
              {filteredCompanies.length} mapped companies
            </p>
            <p className="text-sm text-[#5F5A52]">
              Filter the map by category, stage, or curated highlights.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter map by category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as Category | "all")
            }
            className="h-9 rounded-md border border-[#E7E1D8] bg-[var(--app-surface)] px-3 text-sm font-medium text-[#5F5A52] outline-none transition focus:border-[#E7E1D8] focus:ring-2 focus:ring-[#E7E1D8]"
          >
            <option value="all">All categories</option>
            {categoryMeta.map((item) => (
              <option key={item.slug} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter map by stage"
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            className="h-9 rounded-md border border-[#E7E1D8] bg-[var(--app-surface)] px-3 text-sm font-medium text-[#5F5A52] outline-none transition focus:border-[#E7E1D8] focus:ring-2 focus:ring-[#E7E1D8]"
          >
            <option value="all">All stages</option>
            {stages.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant={highlightsOnly ? "default" : "outline"}
            className={cn(
              "h-9 bg-[var(--app-surface)]",
              highlightsOnly && "app-primary-button",
            )}
            onClick={() => setHighlightsOnly((value) => !value)}
          >
            Show only highlights
          </Button>
        </div>
      </div>

      <GoogleStartupMap companies={filteredCompanies} />
    </div>
  );
}
