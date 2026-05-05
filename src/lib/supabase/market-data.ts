import { unstable_cache } from "next/cache";
import { cache } from "react";

import {
  companies as localCompanies,
  submissions as localSubmissions,
} from "@/data/market";
import { validateDiscoveredCompanyCandidate } from "@/lib/agent/companyCandidateValidation";
import {
  MARKET_COMPANIES_CACHE_TAG,
  MARKET_SUBMISSIONS_CACHE_TAG,
} from "@/lib/cache-tags";
import { runWithNextCacheFallback } from "@/lib/cache/runtime-cache";
import { generateCompanyHook } from "@/lib/editorial/generateCompanyHook";
import { formatFundingAmount, formatFundingText } from "@/lib/funding";
import {
  getCompanyViewMetrics,
  normalizeCompanyMetric,
} from "@/lib/metrics/companyViews";
import { normalizeSignalLabel } from "@/lib/signals/companySignal";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  categories,
  companyStatuses,
  submissionStatuses,
  type Category,
  type Company,
  type CompanyMetrics,
  type CompanyProfileBriefs,
  type CompanyStatus,
  type Founder,
  type DiscoveryReason,
  type GeneratedCompanyFields,
  type InclusionReason,
  type Submission,
  type SubmissionStatus,
} from "@/types/market";
import {
  inferConsumptionProfile,
  normalizeConsumptionIntensity,
  normalizeConsumptionProfiles,
} from "@/lib/model-usage/consumptionProfile";

type CompanyRow = Partial<Company> & {
  generated?: GeneratedCompanyFields | null;
  discovery_reason?: DiscoveryReason | null;
  inclusion_reason?: InclusionReason | null;
  metrics?: CompanyMetrics | null;
};

type SubmissionRow = Partial<Submission>;

const MARKET_DATA_CACHE_SECONDS = 300;

const getCachedMarketCompanyRows = unstable_cache(
  getMarketCompanyRows,
  ["market-company-rows"],
  {
    revalidate: MARKET_DATA_CACHE_SECONDS,
    tags: [MARKET_COMPANIES_CACHE_TAG],
  },
);

const getCachedMarketSubmissions = unstable_cache(
  getMarketSubmissionsDirect,
  ["market-submissions"],
  {
    revalidate: MARKET_DATA_CACHE_SECONDS,
    tags: [MARKET_SUBMISSIONS_CACHE_TAG],
  },
);

export const getMarketCompanies = cache(async (): Promise<Company[]> => {
  const rows = await runWithNextCacheFallback(
    getCachedMarketCompanyRows,
    getMarketCompanyRows,
  );

  return normalizeCompanyRowsWithMetrics(rows);
});

async function getMarketCompanyRows(): Promise<CompanyRow[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return localCompanies;

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.warn("Supabase companies fallback:", error?.message);
    return localCompanies;
  }

  return data as CompanyRow[];
}

export async function getAdminMarketCompanies(): Promise<Company[]> {
  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) return localCompanies.map(normalizeCompany);

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.warn("Supabase admin companies fallback:", error?.message);
    return localCompanies.map(normalizeCompany);
  }

  return normalizeCompanyRowsWithMetrics(data as CompanyRow[]);
}

export const getPublishedCompanies = cache(async () => {
  const companies = await getMarketCompanies();
  return companies.filter(isPublicCompany);
});

export const getMarketSubmissions = cache(async (): Promise<Submission[]> =>
  runWithNextCacheFallback(
    getCachedMarketSubmissions,
    getMarketSubmissionsDirect,
  ),
);

async function getMarketSubmissionsDirect(): Promise<Submission[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return localSubmissions;

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("Supabase submissions fallback:", error?.message);
    return localSubmissions;
  }

  return (data as SubmissionRow[]).map(normalizeSubmission);
}

export async function getAdminMarketSubmissions(): Promise<Submission[]> {
  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) return localSubmissions;

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("Supabase admin submissions fallback:", error?.message);
    return localSubmissions;
  }

  return (data as SubmissionRow[]).map(normalizeSubmission);
}

export async function getCompanyBySlugFromData(slug: string) {
  const companies = await getMarketCompanies();
  return companies.find(
    (company) => company.slug === slug && isPublicCompany(company),
  );
}

export async function getCompaniesByCategoryFromData(category: Category) {
  const companies = await getMarketCompanies();
  return companies.filter(
    (company) => company.category === category && isPublicCompany(company),
  );
}

export function isPublicCompany(company: Company) {
  return (
    company.status === "published" &&
    validateDiscoveredCompanyCandidate({
      name: company.name,
      website: company.website_url,
      sourceText: [
        company.short_description,
        company.one_line_thesis,
        company.why_it_matters,
        company.funding_note,
      ].join("\n"),
    }).ok
  );
}

export function normalizeCompany(row: CompanyRow): Company {
  const id = safeString(row.id, `cmp_${safeString(row.slug, "unknown")}`);
  const now = new Date().toISOString();
  const name = safeString(row.name, "Untitled Startup");
  const rawOneLineThesis = normalizeCopyArtifacts(
    safeString(row.one_line_thesis, ""),
    name,
  );
  const whyItMatters = normalizeCopyArtifacts(
    safeString(row.why_it_matters, ""),
    name,
  );
  const shortDescription = normalizeShortDescription({
    name,
    value: safeString(row.short_description, ""),
    fallbacks: [rawOneLineThesis, whyItMatters],
  });
  const oneLineThesis = isBrokenDescription(rawOneLineThesis)
    ? shortDescription
    : rawOneLineThesis;
  const fundingAmount = formatFundingAmount(safeString(row.funding_amount, ""));
  const totalRaised = formatFundingAmount(safeString(row.total_raised, ""));

  const company: Company = {
    id,
    name,
    slug: safeString(row.slug, id),
    logo_url: safeString(row.logo_url, ""),
    website_url: safeString(row.website_url, ""),
    x_handle: normalizeSocialHandle(row.x_handle),
    x_user_id: safeString(row.x_user_id, ""),
    x_last_synced_at: row.x_last_synced_at
      ? safeString(row.x_last_synced_at, "")
      : undefined,
    founder_name: row.founder_name ? String(row.founder_name) : undefined,
    office_address: safeString(row.office_address, ""),
    funding_round: safeString(row.funding_round, ""),
    funding_amount: fundingAmount,
    funding_date: safeString(row.funding_date, ""),
    total_raised: totalRaised,
    lead_investor: safeString(row.lead_investor, ""),
    funding_note: formatFundingText(
      normalizeCopyArtifacts(safeString(row.funding_note, ""), name),
    ),
    category: normalizeCategory(row.category),
    stage: safeString(row.stage, "Unknown"),
    short_description: shortDescription,
    one_line_thesis: oneLineThesis,
    why_it_matters: whyItMatters,
    ai_usage_profile: normalizeCopyArtifacts(
      safeString(row.ai_usage_profile, ""),
      name,
    ),
    openai_fit: normalizeCopyArtifacts(safeString(row.openai_fit, ""), name),
    founders: normalizeFounders(row.founders, row.founder_name),
    ...normalizeConsumptionFields(row, {
      name,
      category: normalizeCategory(row.category),
      stage: safeString(row.stage, "Unknown"),
      short_description: shortDescription,
      one_line_thesis: oneLineThesis,
      why_it_matters: whyItMatters,
      ai_usage_profile: normalizeCopyArtifacts(
        safeString(row.ai_usage_profile, ""),
        name,
      ),
    }),
    recent_activity_text: normalizeRecentActivityText(
      safeString(row.recent_activity_text, ""),
      fundingAmount,
    ),
    recent_activity_date: safeString(row.recent_activity_date, now),
    is_featured: Boolean(row.is_featured),
    is_breakout: Boolean(row.is_breakout),
    status: normalizeCompanyStatus(row.status),
    created_at: safeString(row.created_at, now),
    updated_at: safeString(row.updated_at, now),
    generated: createFallbackGenerated(row),
    discoveryReason: normalizeDiscoveryReason(
      row.discoveryReason ?? row.discovery_reason,
    ),
    inclusionReason: normalizeInclusionReason(
      row.inclusionReason ?? row.inclusion_reason,
    ),
    metrics: normalizeCompanyMetric(row.metrics),
  };

  const generated = sanitizeGeneratedFields(
    normalizeGenerated(row.generated, company) ?? generateCompanyHook(company),
    company,
  );

  return {
    ...company,
    generated: {
      ...generated,
      signalLabel: normalizeSignalLabel(generated.signalLabel, company),
    },
  };
}

async function normalizeCompanyRowsWithMetrics(rows: CompanyRow[]) {
  const metricsByCompanyId = await getCompanyViewMetrics(
    rows.map((row) => safeString(row.id, "")).filter(Boolean),
  );

  return rows.map((row) =>
    normalizeCompany({
      ...row,
      metrics: metricsByCompanyId.get(safeString(row.id, "")) ?? row.metrics,
    }),
  );
}

function normalizeFounders(value: unknown, founderName?: unknown): Founder[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const founder = item as Partial<Founder>;
        const name = safeString(founder.name, "");
        if (!name) return null;

        return {
          name,
          title: safeString(founder.title, "Co-founder"),
        };
      })
      .filter((item): item is Founder => Boolean(item))
      .slice(0, 4);
  }

  return safeString(founderName, "")
    .split(/;|\band\b/)
    .map((name) => name.trim())
    .filter((name) => {
      const lowered = name.toLowerCase();
      return (
        name.length > 0 &&
        !lowered.includes("team") &&
        !lowered.includes("founders")
      );
    })
    .slice(0, 4)
    .map((name) => ({ name, title: "Co-founder" }));
}

function normalizeConsumptionFields(
  row: CompanyRow,
  company: Pick<
    Company,
    | "name"
    | "category"
    | "stage"
    | "short_description"
    | "one_line_thesis"
    | "why_it_matters"
    | "ai_usage_profile"
  >,
): Pick<
  Company,
  "consumption_profile" | "consumption_intensity" | "consumption_note"
> {
  const inferred = inferConsumptionProfile(company);
  const profile = normalizeConsumptionProfiles(row.consumption_profile);

  return {
    consumption_profile: profile.length > 0 ? profile : inferred.consumption_profile,
    consumption_intensity: normalizeConsumptionIntensity(
      row.consumption_intensity || inferred.consumption_intensity,
    ),
    consumption_note:
      safeString(row.consumption_note, "") || inferred.consumption_note,
  };
}

function normalizeDiscoveryReason(value: unknown): DiscoveryReason | undefined {
  if (!value || typeof value !== "object") return undefined;
  const reason = value as Partial<DiscoveryReason>;

  return {
    trigger: normalizeDiscoveryTrigger(reason.trigger),
    sourceEventIds: normalizeStringArray(reason.sourceEventIds),
    sourceUrls: normalizeStringArray(reason.sourceUrls),
    confidence: normalizeConfidence(reason.confidence),
    notes: safeString(reason.notes, ""),
  };
}

function normalizeInclusionReason(value: unknown): InclusionReason | undefined {
  if (!value || typeof value !== "object") return undefined;
  const reason = value as Partial<InclusionReason>;
  const body = safeString(reason.body, "");
  if (!body) return undefined;

  return {
    title: safeString(reason.title, "Why it was added"),
    body,
    generatedAt: safeString(reason.generatedAt, ""),
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
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function normalizeSubmission(row: SubmissionRow): Submission {
  return {
    id: safeString(row.id, `sub_${Date.now()}`),
    company_name: safeString(row.company_name, ""),
    website_url: safeString(row.website_url, ""),
    founder_name: safeString(row.founder_name, ""),
    email: safeString(row.email, ""),
    description: safeString(row.description, ""),
    status: normalizeSubmissionStatus(row.status),
    created_at: safeString(row.created_at, new Date().toISOString()),
  };
}

function createFallbackGenerated(row: CompanyRow): GeneratedCompanyFields {
  const description = normalizeCopyArtifacts(safeString(row.short_description, ""));

  return {
    hook: description.replace(/\s+/g, " ").replace(/\.$/, "").slice(0, 72),
    signalLabel: "Recently added",
    signalReason: "Generated editorial fields are missing in Supabase.",
    keywords: [],
    trendDimensions: [],
    generatedAt: "",
    sourceHash: "",
    profileBriefs: undefined,
  };
}

function normalizeGenerated(
  value: unknown,
  company?: Company,
): GeneratedCompanyFields | null {
  if (!value || typeof value !== "object") return null;

  const generated = value as Partial<GeneratedCompanyFields>;
  if (!generated.hook || !generated.signalLabel || !generated.signalReason) {
    return null;
  }

  return {
    hook: normalizeHookCopy(safeString(generated.hook, "")),
    signalLabel: normalizeSignalLabel(generated.signalLabel, company),
    signalReason: normalizeCopyArtifacts(safeString(generated.signalReason, "")),
    keywords: Array.isArray(generated.keywords) ? generated.keywords : [],
    trendDimensions: Array.isArray(generated.trendDimensions)
      ? generated.trendDimensions
      : [],
    generatedAt: safeString(generated.generatedAt, ""),
    sourceHash: safeString(generated.sourceHash, ""),
    profileBriefs: normalizeProfileBriefs(generated.profileBriefs),
  };
}

function normalizeProfileBriefs(value: unknown): CompanyProfileBriefs | undefined {
  if (!value || typeof value !== "object") return undefined;
  const briefs = value as Partial<CompanyProfileBriefs>;
  const whySaving = dedupeSentences(
    normalizeCopyArtifacts(safeString(briefs.whySaving, "")),
  );
  const whatBuilding = dedupeSentences(
    normalizeCopyArtifacts(safeString(briefs.whatBuilding, "")),
  );
  const aiModelUse = dedupeSentences(
    normalizeCopyArtifacts(safeString(briefs.aiModelUse, "")),
  );
  if (!whySaving || !whatBuilding || !aiModelUse) return undefined;

  return {
    whySaving,
    whatBuilding,
    aiModelUse,
    generatedAt: safeString(briefs.generatedAt, ""),
    sourceHash: safeString(briefs.sourceHash, ""),
    model: briefs.model ? safeString(briefs.model, "") : undefined,
  };
}

function normalizeRecentActivityText(value: string, fundingAmount: string) {
  const activity = formatFundingText(normalizeCopyArtifacts(value));
  if (!activity) return "";

  if (
    /^raised\s+\$[0-9]+(?:\.[0-9]+)?$/i.test(activity) &&
    /\b(?:k|m|b|thousand|million|billion)\b/i.test(fundingAmount)
  ) {
    return `Raised ${fundingAmount}`;
  }

  return capitalizeSentence(activity);
}

function normalizeShortDescription({
  name,
  value,
  fallbacks,
}: {
  name: string;
  value: string;
  fallbacks: string[];
}) {
  const candidates = [value, ...fallbacks]
    .map((candidate) => normalizeCopyArtifacts(candidate, name))
    .filter(Boolean);

  const cleanCandidate =
    candidates.find((candidate) => !isBrokenDescription(candidate)) ||
    `${name} is an early-stage NYC AI company in the AI Atlas map.`;

  return ensureSentence(capitalizeSentence(cleanCandidate));
}

function isBrokenDescription(value: string) {
  const cleanValue = value.trim();
  const lowerValue = cleanValue.toLowerCase();

  return (
    cleanValue.length < 40 ||
    /^[a-z]/.test(cleanValue) ||
    cleanValue.includes("...") ||
    /(?:\(|\)|\[|\])$/.test(cleanValue) ||
    /\be\.$/.test(cleanValue) ||
    /\b(?:ai-powered ai|ai-driven ai|interface-users)\b/i.test(cleanValue) ||
    lowerValue.startsWith("ai-powered the latest") ||
    lowerValue.startsWith("ai-powered social-graph ai") ||
    lowerValue.startsWith("healthtech startup") ||
    lowerValue.startsWith("long-horizon ai agents") ||
    lowerValue === "better decisions." ||
    lowerValue.startsWith("recommendations,")
  );
}

function normalizeCopyArtifacts(value: string, companyName = "") {
  let copy = value
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/\bAI-powered AI\b/gi, "AI")
    .replace(/\bAI-driven AI\b/gi, "AI")
    .replace(/\binterface-users\b/gi, "interface; users")
    .replace(/\bbusinesses-handling\b/gi, "businesses, handling")
    .replace(/\bclinics-scheduling\b/gi, "clinics, scheduling")
    .replace(/\bworkflows-navigating\b/gi, "workflows for navigating")
    .replace(/\s+/g, " ")
    .trim();

  if (companyName && /^AI to\b/i.test(copy)) {
    copy = copy.replace(/^AI to\b/i, `${companyName} uses AI to`);
  }

  return ensureSentence(capitalizeSentence(copy));
}

function normalizeHookCopy(value: string) {
  return normalizeCopyArtifacts(value).replace(/\.$/, "");
}

function sanitizeGeneratedFields(
  generated: GeneratedCompanyFields,
  company: Company,
): GeneratedCompanyFields {
  const slugHook = specificHooksBySlug[company.slug];
  const hook = slugHook
    ? slugHook
    : isGenericDuplicatedHook(generated.hook)
      ? inferSpecificHook(company)
      : normalizeHookCopy(generated.hook);

  return {
    ...generated,
    hook,
    signalLabel: normalizeSignalLabel(generated.signalLabel, company),
    signalReason: normalizeCopyArtifacts(generated.signalReason),
    profileBriefs: generated.profileBriefs
      ? {
          ...generated.profileBriefs,
          whySaving: dedupeSentences(
            normalizeCopyArtifacts(generated.profileBriefs.whySaving),
          ),
          whatBuilding: dedupeSentences(
            normalizeCopyArtifacts(generated.profileBriefs.whatBuilding),
          ),
          aiModelUse: dedupeSentences(
            normalizeCopyArtifacts(generated.profileBriefs.aiModelUse),
          ),
        }
      : undefined,
  };
}

function isGenericDuplicatedHook(value: string) {
  const normalized = normalizeHookCopy(value).toLowerCase();
  return genericDuplicatedHooks.has(normalized);
}

function inferSpecificHook(company: Company) {
  const text = [
    company.short_description,
    company.one_line_thesis,
    company.why_it_matters,
    company.ai_usage_profile,
  ]
    .join(" ")
    .toLowerCase();

  const slugHook = specificHooksBySlug[company.slug];
  if (slugHook) return slugHook;

  if (text.includes("supply chain")) {
    return "Supply chain agents for operational planning";
  }
  if (text.includes("product catalog") || text.includes("shopping")) {
    return "Product catalog infrastructure for agentic commerce";
  }
  if (text.includes("voice") && text.includes("phone")) {
    return "Voice agents for restaurant and retail calls";
  }
  if (text.includes("hedge fund") || text.includes("trades")) {
    return "AI-native trading research and execution";
  }
  if (text.includes("data marketplace")) {
    return "Licensed data marketplace for AI builders";
  }
  if (text.includes("social-graph") || text.includes("dating")) {
    return "Social graph matching for Gen Z dating";
  }
  if (text.includes("audience") && text.includes("conversations")) {
    return "Real-time audience research with AI";
  }

  return normalizeHookCopy(company.one_line_thesis || company.short_description);
}

function dedupeSentences(value: string) {
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const seen = new Set<string>();

  const uniqueSentences = sentences.filter((sentence) => {
    const key = sentence.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueSentences.length > 0 ? uniqueSentences.join(" ") : value;
}

function capitalizeSentence(value: string) {
  const copy = value.trim();
  if (!copy) return copy;
  return `${copy[0].toUpperCase()}${copy.slice(1)}`;
}

function ensureSentence(value: string) {
  const copy = value.trim();
  if (!copy || /[.!?]$/.test(copy)) return copy;
  return `${copy}.`;
}

const genericDuplicatedHooks = new Set(
  [
    "Turning messy documents into structured context",
    "Research workflows for financial teams",
    "Sales workflows for revenue teams",
    "Testing infrastructure for autonomous agents",
    "Personal memory workflows for everyday users",
    "Automating clinical admin work for health plans",
    "Consumer video creation with real distribution",
    "Turning policies into operational AI agents",
  ].map((hook) => hook.toLowerCase()),
);

const specificHooksBySlug: Record<string, string> = {
  aspect: "Spreadsheets for investment workflows",
  datagrid: "Document extraction for regulated teams",
  "canoe-intelligence": "Alternative-investment data automation",
  wallaroo: "Enterprise model deployment and monitoring",
  "carbon-arc": "Licensed data marketplace for AI builders",
  "standard-signal": "AI-native trading research and execution",
  "manifest-os": "Infrastructure for AI-native legal services",
  zerodrift: "Real-time policy enforcement for regulated teams",
  trata: "Hedge fund research from analyst agents",
  brightwave: "Investment research from filings and transcripts",
  hebbia: "AI research workflows for financial documents",
  rowflow: "Sales data workflows for GTM teams",
  concourse: "AI agents for corporate finance teams",
  "slang-ai": "Voice agents for restaurant and retail calls",
  kalepa: "AI underwriting for commercial insurance",
  "vortexify-ai": "Supply chain agents for operational planning",
  empromptu: "Chat-driven enterprise app creation",
  "kay-ai": "Document context layer for enterprise agents",
  amika: "Cloud sandboxes for AI coding agents",
  channel3: "Product catalog infrastructure for agentic commerce",
  "emergence-ai": "Agents that orchestrate enterprise workflows",
  nori: "Personal memory for everyday notes",
  loyalist: "AI companion for friendship and support",
  remesh: "Real-time audience research with AI",
  cerca: "Social graph matching for Gen Z dating",
  "222": "AI matching for in-person social plans",
  series: "Warm introductions inside iMessage",
  granted: "AI support for navigating government benefits",
  camber: "Healthcare payments operations for clinics",
  "sohar-health": "Eligibility automation for behavioral health",
  clarion: "Voice agents for healthcare communications",
  "valerie-health": "Front-office AI for independent doctors",
  absurd: "AI brand ads for performance teams",
  stewdio: "Creative workspace for generative media",
  tildei: "Agentic brand conversations across channels",
  icon: "AI video ads with real actors",
  agentio: "Creator-led advertising automation",
  mirage: "AI video generation for creative teams",
  "mirage-formerly-captions": "AI video generation for creative teams",
  alkymi: "Document workflows for financial services",
  "bretton-ai": "KYC and AML agents for financial teams",
  soxton: "Policy agents for compliance teams",
  "norm-ai": "Regulatory AI agents for enterprises",
  tabs: "Contract-to-cash automation for finance teams",
  maybern: "Private fund operations for investment firms",
  bayesline: "Custom risk analytics for hedge funds",
};

function normalizeCategory(value: unknown): Category {
  return categories.includes(value as Category)
    ? (value as Category)
    : "Fintech & Trading AI";
}

function normalizeCompanyStatus(value: unknown): CompanyStatus {
  return companyStatuses.includes(value as CompanyStatus)
    ? (value as CompanyStatus)
    : "published";
}

function normalizeSubmissionStatus(value: unknown): SubmissionStatus {
  return submissionStatuses.includes(value as SubmissionStatus)
    ? (value as SubmissionStatus)
    : "new";
}

function safeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function normalizeSocialHandle(value: unknown) {
  if (typeof value !== "string") return "";

  return value.replace(/^@/, "").trim();
}
