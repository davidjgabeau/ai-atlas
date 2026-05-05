import {
  createSupabasePrivilegedClient,
  hasSupabasePrivilegedCredentials,
} from "@/lib/supabase/privileged";
import type {
  AgentCompany,
  CandidateUpdate,
  Confidence,
  RawSourceRecord,
} from "@/types/agent";

import { createId } from "./hash";

type CompanyEligibilityAudit = {
  company: AgentCompany;
  shouldArchive: boolean;
  confidence: Confidence;
  reason: string;
  sourceUrls: string[];
};

const lateStagePattern =
  /\b(series\s+[b-z]|growth\s+round|growth-stage|late-stage|ipo|public company|listed company|went public)\b/i;
const lateStageFieldPattern =
  /\b(series\s+[b-z]|growth|growth\s+round|growth-stage|late-stage|ipo|public company|listed company|went public)\b/i;
const acquiredPattern =
  /\b(acquired by|acquisition of|has joined|joined forces with|is now part of|became part of|now owned by|owned by)\b/i;
const nonNycHeadquartersPattern =
  /\b(headquartered in|based in|hq in|main office in)\s+(san francisco|bay area|menlo park|palo alto|mountain view|san mateo|boston|cambridge|austin|seattle|los angeles|london|toronto|miami|chicago)\b/i;
const nycPattern =
  /\b(new york|nyc|brooklyn|manhattan|queens|bronx|staten island|flatiron|soho|nomad|chelsea|tribeca|dumbo|williamsburg)\b/i;

export async function auditAndArchiveIneligibleCompanies({
  companies,
  rawSourceRecords,
  autoArchive,
}: {
  companies: AgentCompany[];
  rawSourceRecords: RawSourceRecord[];
  autoArchive: boolean;
}) {
  const audits = companies
    .map((company) => auditCompanyEligibility(company, rawSourceRecords))
    .filter(Boolean) as CompanyEligibilityAudit[];
  const candidateUpdates = audits.map(auditToCandidateUpdate);
  const archiveCandidates = audits.filter(
    (audit) => audit.shouldArchive && audit.confidence === "high",
  );

  if (!autoArchive || archiveCandidates.length === 0) {
    return {
      archivedIds: [] as string[],
      archivedCount: 0,
      candidateUpdates,
      errors: [] as string[],
    };
  }

  const archiveResult = await archiveCompanies(archiveCandidates);

  return {
    archivedIds: archiveResult.archivedIds,
    archivedCount: archiveResult.archivedIds.length,
    candidateUpdates,
    errors: archiveResult.errors,
  };
}

function auditCompanyEligibility(
  company: AgentCompany,
  rawSourceRecords: RawSourceRecord[],
): CompanyEligibilityAudit | null {
  const companyRecords = rawSourceRecords.filter(
    (record) =>
      record.companyId === company.id ||
      record.candidateCompanyName?.toLowerCase() === company.name.toLowerCase(),
  );
  const profileText = normalizeWhitespace(
    [
      company.name,
      company.website,
      company.location,
      company.stage,
      company.category,
      company.description,
      company.oneSentenceDescription,
      company.funding?.latestRound,
      company.funding?.latestRoundAmount,
      company.funding?.totalRaised,
      company.funding?.leadInvestors?.join(", "),
      company.generated?.hook,
      company.generated?.signalReason,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const evidenceText = normalizeWhitespace(
    [profileText, ...companyRecords.map((record) => `${record.title ?? ""}\n${record.text}`)]
      .join("\n\n"),
  );

  const sourceUrls = uniqueStrings([
    company.website,
    ...company.sourceUrls,
    ...companyRecords.map((record) => record.url),
  ]);

  if (hasAcquisitionEvidence(company, companyRecords, evidenceText)) {
    return {
      company,
      shouldArchive: true,
      confidence: "high",
      reason: `${company.name} appears to have been acquired or folded into another company, which no longer fits the active early-stage startup map.`,
      sourceUrls,
    };
  }

  if (hasLateStageEvidence(company, evidenceText)) {
    return {
      company,
      shouldArchive: true,
      confidence: "high",
      reason: `${company.name} appears to be beyond the map's pre-seed, seed, or Series A criteria.`,
      sourceUrls,
    };
  }

  if (hasExplicitNonNycEvidence(company, companyRecords, evidenceText)) {
    return {
      company,
      shouldArchive: true,
      confidence: "high",
      reason: `${company.name} appears to be primarily based outside New York City, so it no longer fits the NYC-based criterion.`,
      sourceUrls,
    };
  }

  return null;
}

function hasAcquisitionEvidence(
  company: AgentCompany,
  records: RawSourceRecord[],
  evidenceText: string,
) {
  const namePattern = new RegExp(`\\b${escapeRegExp(company.name)}\\b`, "i");
  const sourceOwnedByCompany =
    records.some((record) => record.companyId === company.id && acquiredPattern.test(record.text)) ||
    records.some((record) => record.companyId === company.id && acquiredPattern.test(record.title ?? ""));

  return (
    sourceOwnedByCompany ||
    (namePattern.test(evidenceText) && acquiredPattern.test(evidenceText))
  );
}

function hasLateStageEvidence(company: AgentCompany, evidenceText: string) {
  const stageText = normalizeWhitespace([
    company.stage,
    company.funding?.latestRound,
    company.funding?.latestRoundAmount,
    company.funding?.totalRaised,
  ].filter(Boolean).join(" "));

  return lateStageFieldPattern.test(stageText) || lateStagePattern.test(evidenceText);
}

function hasExplicitNonNycEvidence(
  company: AgentCompany,
  records: RawSourceRecord[],
  evidenceText: string,
) {
  if (nycPattern.test(company.location) || nycPattern.test(evidenceText)) {
    return false;
  }

  return (
    company.locationConfidence === "high" &&
    (
      nonNycHeadquartersPattern.test(company.location) ||
      records.some((record) => record.companyId === company.id && nonNycHeadquartersPattern.test(record.text))
    )
  );
}

function auditToCandidateUpdate(audit: CompanyEligibilityAudit): CandidateUpdate {
  return {
    id: createId("candidate_update", {
      companyId: audit.company.id,
      reason: audit.reason,
      sourceUrls: audit.sourceUrls,
    }),
    companyId: audit.company.id,
    candidateCompanyName: audit.company.name,
    proposedUpdate: {
      verifiedAt: new Date().toISOString(),
      sourceUrls: audit.sourceUrls,
      discoveryReason: {
        trigger: "source_update",
        sourceEventIds: [],
        sourceUrls: audit.sourceUrls,
        confidence: audit.confidence,
        notes: audit.reason,
      },
    },
    reason: audit.shouldArchive
      ? `Eligibility audit recommends archiving: ${audit.reason}`
      : `Eligibility audit needs review: ${audit.reason}`,
    sourceUrls: audit.sourceUrls,
    confidence: audit.confidence,
    status: audit.shouldArchive && audit.confidence === "high" ? "approved" : "pending",
    createdAt: new Date().toISOString(),
  };
}

async function archiveCompanies(audits: CompanyEligibilityAudit[]) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase || !hasSupabasePrivilegedCredentials()) {
    return {
      archivedIds: [] as string[],
      errors: [
        "Eligibility audit found ineligible companies, but Supabase privileged credentials are not configured.",
      ],
    };
  }

  const archivedIds: string[] = [];
  const errors: string[] = [];

  for (const audit of audits) {
    const now = new Date().toISOString();
    const note = `Archived by AI Atlas eligibility audit: ${audit.reason}`;
    const { error } = await supabase
      .from("companies")
      .update({
        status: "archived",
        funding_note: note,
        recent_activity_text: audit.reason,
        recent_activity_date: now,
        updated_at: now,
      })
      .eq("id", audit.company.id);

    if (error) {
      errors.push(`${audit.company.name}: ${error.message}`);
    } else {
      archivedIds.push(audit.company.id);
    }
  }

  return { archivedIds, errors };
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean))) as string[];
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
