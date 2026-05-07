"use client";

import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { normalizeSignalLabel } from "@/lib/signals/companySignal";
import { cn } from "@/lib/utils";
import type { GeneratedSignalLabel } from "@/types/market";

const signalClasses: Record<GeneratedSignalLabel, string> = {
  Featured: "bg-[rgb(154_61_43_/_0.12)] text-[#9A3D2B] ring-[#E7E1D8]",
  "Worth watching": "bg-transparent text-[#5F5A52] ring-[#E7E1D8]",
  "Recently added": "bg-[rgb(49_71_94_/_0.07)] text-[var(--app-secondary-accent)] ring-[#DCE1DF]",
  "Clear buyer pull": "bg-[rgb(49_71_94_/_0.08)] text-[var(--app-secondary-accent)] ring-[#DCE1DF]",
  "Workflow signal": "bg-[rgb(17_17_17_/_0.035)] text-[#5F5A52] ring-[#E7E1D8]",
  "Infra signal": "bg-[rgb(154_61_43_/_0.10)] text-[#9A3D2B] ring-[#E7E1D8]",
  "Consumer signal": "bg-[rgb(49_71_94_/_0.07)] text-[var(--app-secondary-accent)] ring-[#DCE1DF]",
  "Enterprise signal": "bg-[rgb(17_17_17_/_0.035)] text-[#5F5A52] ring-[#E7E1D8]",
  "Funding signal": "bg-[rgb(49_71_94_/_0.08)] text-[var(--app-secondary-accent)] ring-[#DCE1DF]",
};

const signalDefinitions: Partial<Record<GeneratedSignalLabel, string>> = {
  "Workflow signal": "Recently shipped new product or feature.",
  "Infra signal": "Core platform or tooling for other AI builders.",
};

export function UsageBadge({
  value,
  label,
  className,
}: {
  value?: string;
  label?: string;
  className?: string;
}) {
  const signalLabel = normalizeSignalLabel(label ?? value);
  const definition = signalDefinitions[signalLabel];
  const [open, setOpen] = useState(false);
  const definitionId = useId();

  return (
    <span className="relative inline-flex max-w-full shrink">
      <Badge
        variant="outline"
        className={cn(
          "text-label max-w-full shrink rounded-md border-0 px-2 py-1 text-[10.5px] ring-1",
          signalClasses[signalLabel],
          className,
        )}
      >
        <span className="min-w-0 truncate">{signalLabel}</span>
        {definition ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={`What ${signalLabel} means`}
            aria-expanded={open}
            aria-controls={definitionId}
            className="ml-1 inline-flex size-4 items-center justify-center rounded-full text-[11px] leading-none transition hover:bg-[rgb(17_17_17_/_0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#9A3D2B]"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen((current) => !current);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              setOpen((current) => !current);
            }}
          >
            ℹ
          </span>
        ) : null}
      </Badge>
      {definition && open ? (
        <span
          id={definitionId}
          role="status"
          className="absolute left-0 top-[calc(100%+6px)] z-30 w-[220px] rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-3 text-xs font-medium leading-[1.45] text-[#4F4A43] shadow-sm"
        >
          {definition}
        </span>
      ) : null}
    </span>
  );
}
