import { generateInclusionReason } from "@/lib/agent/generateInclusionReason";
import { createContentHash, createId } from "@/lib/agent/hash";
import { refreshCompanyLogos } from "@/lib/logos/refreshCompanyLogos";
import {
  enrichCompanyPayloadWithDiscoveredXHandle,
  saveDiscoveredXHandleTarget,
} from "@/lib/social-automation/handle-discovery";
import {
  createSupabasePrivilegedClient,
  hasSupabasePrivilegedCredentials,
} from "@/lib/supabase/privileged";
import { generateCompanyHook } from "@/lib/editorial/generateCompanyHook";
import { inferConsumptionProfile } from "@/lib/model-usage/consumptionProfile";
import type { AgentCompany, CandidateUpdate } from "@/types/agent";
import type { Company } from "@/types/market";

import {
  looksLikeInvestorOrFund,
  validateDiscoveredCompanyCandidate,
} from "./companyCandidateValidation";
import type { DiscoveredCandidateProfile } from "./discoveryProfiles";

export async function publishDiscoveredCompanies({
  profiles,
  existingCompanies,
  autoApprove,
}: {
  profiles: DiscoveredCandidateProfile[];
  existingCompanies: AgentCompany[];
  autoApprove: boolean;
}) {
  const eligibleProfiles = profiles.filter(
    (profile) => autoApprove && profile.autoPublishEligible,
  );
  if (eligibleProfiles.length === 0) {
    return { published: 0, errors: [] as string[] };
  }

  const supabase = createSupabasePrivilegedClient();
  if (!supabase || !hasSupabasePrivilegedCredentials()) {
    return {
      published: 0,
      errors: [
        "Auto-discovery found eligible companies, but Supabase privileged credentials are not configured.",
      ],
    };
  }

  const existingSlugs = new Set(existingCompanies.map((company) => company.slug));
  const nextSlugs = new Set(existingSlugs);
  const baseRows = eligibleProfiles
    .filter((profile) => {
      return validateDiscoveredCompanyCandidate({
        name: profile.proposedUpdate.name ?? profile.candidateCompanyName,
        website: profile.proposedUpdate.website,
        sourceTitle: profile.rawRecord.title,
        sourceText: profile.rawRecord.text,
        reason: profile.reason,
        requireWebsite: true,
      }).ok;
    })
    .map(profileToCompanyRow)
    .filter((row) => {
      if (nextSlugs.has(row.slug)) return false;
      nextSlugs.add(row.slug);
      return true;
    });

  const enrichedRows = await Promise.all(
    baseRows.map((row) => enrichCompanyPayloadWithDiscoveredXHandle(row)),
  );
  const rows = enrichedRows.map(({ payload }) => payload);

  if (rows.length === 0) return { published: 0, errors: [] as string[] };

  const { error } = await supabase.from("companies").insert(rows);
  if (error) {
    if (isMissingDiscoveryColumnError(error.message)) {
      const compatibleRows = rows.map(stripDiscoveryColumns);
      const { error: compatibleError } = await supabase
        .from("companies")
        .insert(compatibleRows);

      if (compatibleError) {
        return { published: 0, errors: [compatibleError.message] };
      }
    } else {
      return { published: 0, errors: [error.message] };
    }
  }

  await Promise.all(
    enrichedRows.map(({ payload, discovery }) =>
      saveDiscoveredXHandleTarget({
        companyId: payload.id,
        discovery,
      }),
    ),
  );
  await refreshCompanyLogos({ limit: rows.length, force: false }).catch(() => null);

  return { published: rows.length, errors: [] as string[] };
}

export async function publishApprovedCandidateUpdates({
  candidateUpdates,
  existingCompanies,
  autoApprove,
}: {
  candidateUpdates: CandidateUpdate[];
  existingCompanies: AgentCompany[];
  autoApprove: boolean;
}) {
  const profiles = candidateUpdates
    .filter((update) => update.status === "approved")
    .filter(isSafeApprovedCandidateUpdate)
    .map(candidateUpdateToProfile)
    .filter((profile): profile is DiscoveredCandidateProfile => Boolean(profile));

  return publishDiscoveredCompanies({
    profiles,
    existingCompanies,
    autoApprove,
  });
}

function isMissingDiscoveryColumnError(message: string) {
  return /'discovery_reason' column|'inclusion_reason' column/i.test(message);
}

function stripDiscoveryColumns(row: ReturnType<typeof profileToCompanyRow>) {
  const {
    discovery_reason,
    inclusion_reason,
    ...compatibleRow
  } = row;

  void discovery_reason;
  void inclusion_reason;

  return compatibleRow;
}

function candidateUpdateToProfile(
  update: CandidateUpdate,
): DiscoveredCandidateProfile | null {
  const candidateCompanyName =
    update.proposedUpdate.name ?? update.candidateCompanyName;

  if (!candidateCompanyName) return null;

  return {
    rawRecord: {
      id: update.id,
      sourceType: "search",
      url: update.sourceUrls[0] ?? `candidate:${candidateCompanyName}`,
      title: candidateCompanyName,
      text: update.reason,
      discoveredAt: update.createdAt,
      contentHash: createContentHash({
        candidateCompanyName,
        sourceUrls: update.sourceUrls,
        reason: update.reason,
      }),
    },
    proposedUpdate: update.proposedUpdate,
    candidateCompanyName,
    sourceUrls: update.sourceUrls,
    confidence: update.confidence,
    reason: update.reason,
    autoPublishEligible: true,
  };
}

function isSafeApprovedCandidateUpdate(update: CandidateUpdate) {
  const name = update.proposedUpdate.name ?? update.candidateCompanyName ?? "";

  return (
    update.confidence === "high" &&
    Boolean(update.proposedUpdate.website) &&
    isCleanApprovedName(name) &&
    validateDiscoveredCompanyCandidate({
      name,
      website: update.proposedUpdate.website,
      sourceText: update.reason,
      requireWebsite: true,
    }).ok &&
    !looksLikeInvestorOrFund(name, update.reason)
  );
}

function isCleanApprovedName(name: string) {
  const clean = name.trim();
  const words = clean.split(/\s+/);

  return (
    clean.length >= 2 &&
    clean.length <= 48 &&
    words.length <= 5 &&
    !/[.!?]$/.test(clean) &&
    validateDiscoveredCompanyCandidate({ name: clean }).ok
  );
}

function profileToCompanyRow(profile: DiscoveredCandidateProfile) {
  const update = profile.proposedUpdate;
  const now = new Date().toISOString();
  const name = update.name || profile.candidateCompanyName;
  const slug = update.slug || slugify(name);
  const id = createId("cmp", slug);
  const category = normalizeCategory(update.category);
  const stage = update.stage || "Unknown";
  const funding = update.funding ?? {};
  const founders = update.founders?.map((founder) => founder.name).join("; ") ?? "";
  const investors = uniqueStrings([
    ...(update.investors ?? []),
    ...(funding.leadInvestors ?? []),
  ]).join("; ");
  const oneSentenceDescription =
    update.oneSentenceDescription || update.description || `${name} is an AI company based in New York.`;
  const description = update.description || oneSentenceDescription;
  const discoveryReason = update.discoveryReason;
  const agentCompany: AgentCompany = {
    id,
    slug,
    name,
    website: update.website,
    location: update.location || "New York, NY",
    locationConfidence: update.locationConfidence || "medium",
    stage,
    category,
    subcategory: update.subcategory,
    description,
    oneSentenceDescription,
    founders: update.founders,
    investors: update.investors,
    funding,
    tags: update.tags ?? [category],
    sourceUrls: update.sourceUrls ?? profile.sourceUrls,
    createdAt: now,
    updatedAt: now,
    discoveryReason,
  };
  const inclusionReason = generateInclusionReason({ company: agentCompany });
  const baseCompany: Company = {
    id,
    name,
    slug,
    logo_url: "",
    website_url: update.website ?? "",
    x_handle: "",
    x_user_id: "",
    founder_name: founders,
    office_address: update.location || "New York, NY",
    funding_round: funding.latestRound ?? stage,
    funding_amount: funding.latestRoundAmount ?? "",
    funding_date: funding.latestRoundDate ?? "",
    total_raised: funding.totalRaised ?? "",
    lead_investor: investors,
    funding_note: profile.reason,
    category,
    stage,
    short_description: oneSentenceDescription,
    one_line_thesis: oneSentenceDescription,
    why_it_matters: description,
    ai_usage_profile: `${update.subcategory ? `${update.subcategory}. ` : ""}${description}`,
    openai_fit: getOpenAiFit(category),
    founders: update.founders?.map((founder) => ({
      name: founder.name,
      title: founder.role ?? "Co-founder",
    })) ?? [],
    ...inferConsumptionProfile({
      name,
      category,
      stage,
      short_description: oneSentenceDescription,
      one_line_thesis: oneSentenceDescription,
      why_it_matters: description,
      ai_usage_profile: `${update.subcategory ? `${update.subcategory}. ` : ""}${description}`,
    }),
    recent_activity_text: inclusionReason.body,
    recent_activity_date: now,
    is_featured: false,
    is_breakout: false,
    status: "published",
    created_at: now,
    updated_at: now,
    generated: {
      hook: "",
      signalLabel: "Worth watching",
      signalReason: "",
      keywords: [],
      trendDimensions: [],
      generatedAt: now,
      sourceHash: createContentHash({ name, category, description }),
    },
    discoveryReason,
    inclusionReason,
  };

  const generated = generateCompanyHook(baseCompany);

  return {
    id,
    name,
    slug,
    logo_url: "",
    website_url: baseCompany.website_url,
    x_handle: "",
    x_user_id: "",
    founder_name: founders || null,
    office_address: baseCompany.office_address,
    funding_round: baseCompany.funding_round,
    funding_amount: baseCompany.funding_amount,
    funding_date: baseCompany.funding_date,
    total_raised: baseCompany.total_raised,
    lead_investor: baseCompany.lead_investor,
    funding_note: baseCompany.funding_note,
    category,
    stage,
    short_description: baseCompany.short_description,
    one_line_thesis: baseCompany.one_line_thesis,
    why_it_matters: baseCompany.why_it_matters,
    ai_usage_profile: baseCompany.ai_usage_profile,
    openai_fit: baseCompany.openai_fit,
    founders: baseCompany.founders,
    consumption_profile: baseCompany.consumption_profile,
    consumption_intensity: baseCompany.consumption_intensity,
    consumption_note: baseCompany.consumption_note,
    recent_activity_text: baseCompany.recent_activity_text,
    recent_activity_date: baseCompany.recent_activity_date,
    is_featured: false,
    is_breakout: false,
    status: "published",
    created_at: now,
    updated_at: now,
    generated,
    discovery_reason: discoveryReason,
    inclusion_reason: inclusionReason,
  };
}

function normalizeCategory(value?: string) {
  return value && categorySet.has(value as Company["category"])
    ? value as Company["category"]
    : "Enterprise GTM & RevOps AI";
}

function getOpenAiFit(category: Company["category"]) {
  if (category === "Model Tools & Dev Platform") {
    return "Strong fit for evals, structured outputs, prompt/version management, observability, and production LLM app workflows.";
  }
  if (category === "Data & Memory Layer") {
    return "Strong fit for embeddings, retrieval, extraction, document intelligence, and persistent context layers.";
  }
  if (category === "Cybersecurity AI") {
    return "Strong fit for triage, structured detection, exposure analysis, and security workflow automation.";
  }
  if (category === "Health & Clinical AI") {
    return "Good fit for careful summarization, structured extraction, patient communication, and safety-aware reasoning.";
  }
  if (category === "Life Sciences AI") {
    return "Strong fit for multimodal biological data, literature synthesis, experiment planning, and structured scientific reasoning.";
  }
  if (category === "Fintech & Trading AI") {
    return "Strong fit for reasoning models, structured outputs, retrieval, document understanding, and financial workflows.";
  }
  return "Good fit for structured outputs, workflow automation, retrieval, and repeat AI-assisted work.";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

const categorySet = new Set<Company["category"]>([
  "Fintech & Trading AI",
  "Legal & Compliance AI",
  "Cybersecurity AI",
  "Media, Ads & Creative AI",
  "Health & Clinical AI",
  "Life Sciences AI",
  "AI-Native Consumer & Social",
  "Agent Infrastructure",
  "Model Tools & Dev Platform",
  "Enterprise GTM & RevOps AI",
  "Data & Memory Layer",
]);
