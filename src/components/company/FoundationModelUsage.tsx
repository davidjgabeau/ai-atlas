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
  const rows = getFoundationModelRows(company);
  if (rows.length === 0) return null;

  return (
    <div>
    <p className="mb-4 text-xs leading-5 text-[#7A746C]">Editorial estimates from product descriptions. Model providers and actual usage are not confirmed.</p>
    <dl className={cn("grid gap-3", compact ? "text-sm" : "text-base")}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="border-t border-[#E7E1D8] pt-3 first:border-t-0 first:pt-0"
        >
          <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
            {row.label === "Architecture pattern" ? (
              <Sparkles className="size-3.5" aria-hidden="true" />
            ) : null}
            {row.label}
          </dt>
          <dd
            className={cn(
              "mt-1 text-[#5F5A52]",
              compact ? "leading-6" : "leading-8",
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
    </div>
  );
}

export function hasFoundationModelUsage(company: Company) {
  return getFoundationModelRows(company).length > 0;
}

function getFoundationModelRows(company: Company) {
  const providers = getModelProviders(company);
  const profiles = (company.consumption_profile ?? []).map(
    getConsumptionProfileLabel,
  );
  const defensibility = getDefensibilitySignals(company);
  const rows: Array<{ label: string; value: string }> = [];

  if (providers.length > 0) {
    rows.push({ label: "Model mentions in profile", value: providers.join(", ") });
  }

  if (profiles.length > 0) {
    rows.push({
      label: "Inferred architecture",
      value: profiles.join(", "),
    });
  }

  if (defensibility.length > 0) {
    rows.push({ label: "Potential advantages", value: defensibility.join(", ") });
  }

  if (company.consumption_intensity) {
    rows.push({
      label: "Estimated model demand",
      value: formatConsumptionIntensity(company.consumption_intensity),
    });
  }

  return rows;
}

function getModelProviders(company: Company) {
  const text = [
    company.short_description,
    company.one_line_thesis,
    company.why_it_matters,
    company.ai_usage_profile,
    company.openai_fit,
    company.consumption_note,
  ].join(" ");
  const providers = [
    "OpenAI",
    "Anthropic",
    "Claude",
    "Minimax",
    "Gemini",
    "Google",
    "Mistral",
    "Llama",
    "DeepSeek",
  ];

  return providers.filter((provider) =>
    new RegExp(`\\b${escapeRegExp(provider)}\\b`, "i").test(text),
  );
}

function getDefensibilitySignals(company: Company) {
  const text = [
    company.short_description,
    company.one_line_thesis,
    company.why_it_matters,
    company.ai_usage_profile,
    company.consumption_note,
  ].join(" ").toLowerCase();
  const signals = new Set<string>();

  if (/\b(proprietary|licensed|first-party|dataset|data marketplace)\b/.test(text)) {
    signals.add("Proprietary data");
  }
  if (/\b(network|social graph|community|marketplace)\b/.test(text)) {
    signals.add("Network effects");
  }
  if (/\b(workflow|operations|system of record|repeat|embedded)\b/.test(text)) {
    signals.add("Workflow lock-in");
  }

  return [...signals];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
