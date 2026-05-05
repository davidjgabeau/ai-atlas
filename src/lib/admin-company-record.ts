import {
  categories,
  companyStatuses,
  usagePotentials,
  type Category,
  type Company,
  type CompanyStatus,
  type DiscoveryReason,
  type GeneratedCompanyFields,
  type InclusionReason,
  type UsagePotential,
} from "@/types/market";
import { generateCompanyHook } from "@/lib/editorial/generateCompanyHook";
import { generateInclusionReason } from "@/lib/agent/generateInclusionReason";
import { normalizeSignalLabel } from "@/lib/signals/companySignal";

const defaultGenerated: GeneratedCompanyFields = {
  hook: "Generated when saved",
  signalLabel: "Recently added",
  signalReason: "AI Atlas will generate this from the saved company details.",
  keywords: [],
  trendDimensions: [],
  generatedAt: "",
  sourceHash: "",
};

const patchableCompanyFields = [
  "name",
  "slug",
  "logo_url",
  "website_url",
  "x_handle",
  "founder_name",
  "office_address",
  "funding_round",
  "funding_amount",
  "funding_date",
  "total_raised",
  "lead_investor",
  "funding_note",
  "category",
  "stage",
  "short_description",
  "one_line_thesis",
  "why_it_matters",
  "ai_usage_profile",
  "openai_fit",
  "usage_potential",
  "recent_activity_text",
  "recent_activity_date",
  "is_featured",
  "is_breakout",
  "status",
  "generated",
  "discoveryReason",
  "inclusionReason",
] as const;

type CompanyPatchField = (typeof patchableCompanyFields)[number];

export function companyToDatabasePayload(input: Partial<Company>) {
  const name = cleanString(input.name) || "Untitled Startup";
  const id = cleanString(input.id) || `cmp_${Date.now()}`;
  const founderName = cleanString(input.founder_name);
  const now = new Date().toISOString();

  const company = {
    id,
    name,
    slug: slugify(cleanString(input.slug) || name),
    logo_url: cleanString(input.logo_url),
    website_url: cleanString(input.website_url),
    x_handle: cleanSocialHandle(input.x_handle),
    x_user_id: cleanString(input.x_user_id),
    x_last_synced_at: input.x_last_synced_at
      ? cleanString(input.x_last_synced_at)
      : undefined,
    founder_name: founderName || undefined,
    office_address: cleanString(input.office_address),
    funding_round: cleanString(input.funding_round),
    funding_amount: cleanString(input.funding_amount),
    funding_date: cleanString(input.funding_date),
    total_raised: cleanString(input.total_raised),
    lead_investor: cleanString(input.lead_investor),
    funding_note: cleanString(input.funding_note),
    category: normalizeCategory(input.category),
    stage: cleanString(input.stage),
    short_description: cleanString(input.short_description),
    one_line_thesis: cleanString(input.one_line_thesis),
    why_it_matters: cleanString(input.why_it_matters),
    ai_usage_profile: cleanString(input.ai_usage_profile),
    openai_fit: cleanString(input.openai_fit),
    usage_potential: normalizeUsagePotential(input.usage_potential),
    recent_activity_text: cleanString(input.recent_activity_text),
    recent_activity_date:
      cleanString(input.recent_activity_date) || now,
    is_featured: Boolean(input.is_featured),
    is_breakout: Boolean(input.is_breakout),
    status: normalizeCompanyStatus(input.status),
    created_at: cleanString(input.created_at) || now,
    updated_at: now,
  } satisfies Omit<Company, "generated">;
  const generated = generateCompanyHook(company);
  const companyWithGenerated = {
    ...company,
    generated,
  } satisfies Company;
  const discoveryReason = normalizeDiscoveryReason(input.discoveryReason, {
    sourceUrls: [company.website_url].filter(Boolean),
    now,
  });
  const inclusionReason =
    normalizeInclusionReason(input.inclusionReason) ??
    generateInclusionReason({
      company: {
        ...companyWithGenerated,
        discoveryReason,
      },
    });

  return {
    ...company,
    founder_name: founderName || null,
    generated,
    discovery_reason: discoveryReason,
    inclusion_reason: inclusionReason,
  };
}

export function companyPatchToDatabasePayload(input: Partial<Company>) {
  return patchableCompanyFields.reduce<Record<string, unknown>>(
    (payload, field) => {
      if (!(field in input)) return payload;

      const value = input[field as CompanyPatchField];

      if (field === "category") {
        payload.category = normalizeCategory(value);
      } else if (field === "usage_potential") {
        payload.usage_potential = normalizeUsagePotential(value);
      } else if (field === "status") {
        payload.status = normalizeCompanyStatus(value);
      } else if (field === "is_featured" || field === "is_breakout") {
        payload[field] = Boolean(value);
      } else if (field === "generated") {
        payload.generated = normalizeGenerated(value);
      } else if (field === "discoveryReason") {
        payload.discovery_reason = normalizeDiscoveryReason(value);
      } else if (field === "inclusionReason") {
        payload.inclusion_reason = normalizeInclusionReason(value);
      } else if (field === "founder_name") {
        payload.founder_name = cleanOptionalString(value);
      } else if (field === "x_handle") {
        payload.x_handle = cleanSocialHandle(value);
      } else {
        payload[field] = cleanString(value);
      }

      return payload;
    },
    {},
  );
}

function normalizeDiscoveryReason(
  value: unknown,
  fallback: {
    sourceUrls?: string[];
    now?: string;
  } = {},
): DiscoveryReason {
  const now = fallback.now ?? new Date().toISOString();

  if (value && typeof value === "object") {
    const reason = value as Partial<DiscoveryReason>;
    return {
      trigger: normalizeDiscoveryTrigger(reason.trigger),
      sourceEventIds: normalizeStringArray(reason.sourceEventIds),
      sourceUrls: normalizeStringArray(reason.sourceUrls),
      confidence: normalizeConfidence(reason.confidence),
      notes: cleanString(reason.notes) || "Internal curation note.",
    };
  }

  return {
    trigger: "manual",
    sourceEventIds: [],
    sourceUrls: fallback.sourceUrls ?? [],
    confidence: "medium",
    notes: `Manually added through the AI Atlas admin on ${now.slice(0, 10)}.`,
  };
}

function normalizeInclusionReason(value: unknown): InclusionReason | null {
  if (!value || typeof value !== "object") return null;
  const reason = value as Partial<InclusionReason>;
  const body = cleanString(reason.body);
  if (!body) return null;

  return {
    title: cleanString(reason.title) || "Why it was added",
    body,
    generatedAt: cleanString(reason.generatedAt) || new Date().toISOString(),
    sourceEventIds: normalizeStringArray(reason.sourceEventIds),
    sourceCompanyIds: normalizeStringArray(reason.sourceCompanyIds),
  };
}

function normalizeDiscoveryTrigger(value: unknown): DiscoveryReason["trigger"] {
  return value === "manual" ||
    value === "cron_discovery" ||
    value === "source_update" ||
    value === "funding_signal" ||
    value === "press_signal" ||
    value === "profile_import"
    ? value
    : "manual";
}

function normalizeConfidence(value: unknown): DiscoveryReason["confidence"] {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanOptionalString(value: unknown) {
  const text = cleanString(value);
  return text || null;
}

function cleanSocialHandle(value: unknown) {
  return cleanString(value).replace(/^@/, "");
}

function normalizeCategory(value: unknown): Category {
  if (value === "Enterprise GTM & Automation") {
    return "Enterprise GTM & RevOps AI";
  }

  return categories.includes(value as Category)
    ? (value as Category)
    : "Fintech & Trading AI";
}

function normalizeUsagePotential(value: unknown): UsagePotential {
  return usagePotentials.includes(value as UsagePotential)
    ? (value as UsagePotential)
    : "Emerging";
}

function normalizeCompanyStatus(value: unknown): CompanyStatus {
  return companyStatuses.includes(value as CompanyStatus)
    ? (value as CompanyStatus)
    : "draft";
}

function normalizeGenerated(value: unknown): GeneratedCompanyFields {
  if (!value || typeof value !== "object") return defaultGenerated;

  const generated = {
    ...defaultGenerated,
    ...(value as Partial<GeneratedCompanyFields>),
  };

  return {
    ...generated,
    signalLabel: normalizeSignalLabel(generated.signalLabel),
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
