import { Sparkles } from "lucide-react";

import {
  formatConsumptionIntensity,
  getConsumptionProfileLabel,
} from "@/lib/model-usage/consumptionProfile";
import { cn } from "@/lib/utils";
import type { Company } from "@/types/market";

export function FoundationModelUsage({
  company,
  compact = false,
}: {
  company: Company;
  compact?: boolean;
}) {
  const profiles = company.consumption_profile ?? [];

  if (profiles.length === 0) {
    return (
      <p
        className={cn(
          "text-[#5F5A52]",
          compact ? "text-sm leading-6" : "text-base leading-8",
        )}
      >
        Usage profile not yet evaluated.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E1D8] bg-[#FBFAF7] px-2 py-1 text-xs font-semibold text-[#5F5A52]">
          <Sparkles className="size-3.5 text-[#9A3D2B]" aria-hidden="true" />
          {formatConsumptionIntensity(company.consumption_intensity)}
        </span>
        {profiles.map((profile) => (
          <span
            key={profile}
            className="rounded-md border border-[#E7E1D8] bg-[#FBFAF7] px-2 py-1 text-xs font-medium text-[#5F5A52]"
          >
            {getConsumptionProfileLabel(profile)}
          </span>
        ))}
      </div>
      {company.consumption_note ? (
        <p
          className={cn(
            "mt-3 text-[#5F5A52]",
            compact ? "text-sm leading-6" : "text-base leading-8",
          )}
        >
          {company.consumption_note}
        </p>
      ) : null}
    </div>
  );
}
