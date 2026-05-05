import type {
  AgentCompany,
  AgentDataFiles,
  AgentRun,
  CandidateUpdate,
  CompanyEvent,
  ExtractedSignal,
  RawSourceRecord,
} from "../../types/agent";
import { auditAndArchiveIneligibleCompanies } from "./auditCompanyEligibility";
import { toAgentCompanies } from "./companyAdapter";
import { createMarketSnapshot } from "./createMarketSnapshot";
import { dedupeEvents } from "./dedupeEvents";
import {
  extractCandidateProfiles,
  profileToCandidateUpdate,
} from "./discoveryProfiles";
import { extractSignals } from "./extractSignals";
import { generateEditorialSurfaces } from "./generateEditorialSurfaces";
import { createContentHash, createId } from "./hash";
import { readAgentDataFiles, writeAgentDataFiles } from "./jsonStore";
import { loadPublishedCompaniesForAgent } from "./loadCompanies";
import { publishApprovedCandidateUpdates } from "./publishDiscoveredCompanies";
import { scoreEvent } from "./scoreEvent";
import { createSourceProviders } from "./sources";
import {
  loadAgentDataForPipelineFromSupabase,
  saveAgentDataToSupabase,
} from "./supabaseAgentStore";

type JobStats = AgentRun["stats"];
type JobName = AgentRun["job"];

const emptyStats: JobStats = {
  rawRecordsCreated: 0,
  eventsCreated: 0,
  eventsDeduped: 0,
  candidateUpdatesCreated: 0,
  companiesPublished: 0,
  companiesArchived: 0,
  editorialSurfacesGenerated: 0,
  qualityGateFailures: 0,
};

export async function runRefreshKnownCompanies() {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const stats = { ...emptyStats };

  try {
    const files = await readAgentDataForPipeline();
    const companies = toAgentCompanies(await loadPublishedCompaniesForAgent());
    const providers = createSourceProviders();
    const existingRawHashes = new Set(
      files.rawSourceRecords.map((record) => record.contentHash),
    );
    const nextRawRecords = [...files.rawSourceRecords];
    const extractedSignals: ExtractedSignal[] = [];

    for (const company of companies) {
      for (const provider of providers) {
        try {
          const records = await provider.fetchForCompany(company);
          for (const record of records) {
            if (existingRawHashes.has(record.contentHash)) continue;

            existingRawHashes.add(record.contentHash);
            nextRawRecords.push(record);
            stats.rawRecordsCreated += 1;
            extractedSignals.push(...extractSignals(record, companies));
          }
        } catch (error) {
          errors.push(`${provider.name}/${company.slug}: ${getErrorMessage(error)}`);
        }
      }
    }

    const signalEvents = extractedSignals
      .filter((signal) => signal.possibleCompanyId && signal.confidence !== "low")
      .map((signal) => eventFromSignal(signal));
    const factEvents = createCompanyFactEvents(companies, files.companyEvents);
    const scoredEvents = [...signalEvents, ...factEvents].map((event) => {
      return scoreEvent({
        event,
        company: companies.find((company) => company.id === event.companyId),
        existingEvents: files.companyEvents,
      });
    });
    const nextEvents = dedupeEvents(files.companyEvents, scoredEvents);
    const newEventCount = Math.max(0, nextEvents.length - files.companyEvents.length);
    stats.eventsCreated = newEventCount;
    stats.eventsDeduped = Math.max(0, scoredEvents.length - newEventCount);

    const eligibilityAuditResult = await auditAndArchiveIneligibleCompanies({
      companies,
      rawSourceRecords: nextRawRecords,
      autoArchive: process.env.AUTO_ARCHIVE_INELIGIBLE_COMPANIES === "true",
    });
    stats.companiesArchived = eligibilityAuditResult.archivedCount;
    errors.push(...eligibilityAuditResult.errors);
    const activeCompanies = companies.filter(
      (company) => !eligibilityAuditResult.archivedIds.includes(company.id),
    );

    const nextCandidateUpdates = dedupeCandidateUpdates([
      ...files.candidateUpdates,
      ...eligibilityAuditResult.candidateUpdates,
      ...createCandidateUpdatesFromSignals(extractedSignals),
    ]);
    stats.candidateUpdatesCreated = Math.max(
      0,
      nextCandidateUpdates.length - files.candidateUpdates.length,
    );

    await writeAndMirror({
      ...files,
      companies: activeCompanies,
      rawSourceRecords: nextRawRecords,
      companyEvents: nextEvents,
      candidateUpdates: nextCandidateUpdates,
    });

    let editorialStats = emptyStats;
    if (process.env.ENABLE_AUTO_PUBLISH !== "false") {
      const editorialResult = await runEditorialGenerationInternal(errors);
      editorialStats = editorialResult.stats;
    }

    const run = createRun("refresh", startedAt, {
      stats: mergeStats(stats, editorialStats),
      errors,
    });
    await appendAgentRun(run);
    return run;
  } catch (error) {
    const run = createRun("refresh", startedAt, {
      stats,
      errors: [...errors, getErrorMessage(error)],
      failed: true,
    });
    await appendAgentRun(run);
    return run;
  }
}

export async function runDiscoverNewCandidates() {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const stats = { ...emptyStats };

  try {
    const files = await readAgentDataForPipeline();
    const companies = toAgentCompanies(await loadPublishedCompaniesForAgent());
    const providers = createSourceProviders();
    const rawRecords: RawSourceRecord[] = [];

    for (const provider of providers) {
      if (!provider.discoverCandidates) continue;

      try {
        rawRecords.push(...(await provider.discoverCandidates()));
      } catch (error) {
        errors.push(`${provider.name}/discover: ${getErrorMessage(error)}`);
      }
    }

    const existingHashes = new Set(
      files.rawSourceRecords.map((record) => record.contentHash),
    );
    const newRawRecords = rawRecords.filter(
      (record) => !existingHashes.has(record.contentHash),
    );
    stats.rawRecordsCreated = newRawRecords.length;

    const discoveredProfiles = await extractCandidateProfiles({
      records: newRawRecords,
      existingCompanies: companies,
    });
    const profileUpdates = discoveredProfiles.map(profileToCandidateUpdate);
    const candidateUpdates = [
      ...profileUpdates,
      ...newRawRecords
        .filter(
          (record) =>
            !profileUpdates.some((update) =>
              update.sourceUrls.includes(record.url),
            ),
        )
        .map(createCandidateUpdateFromRaw)
        .filter((update): update is CandidateUpdate => Boolean(update)),
    ];
    const nextCandidateUpdates = dedupeCandidateUpdates([
      ...files.candidateUpdates,
      ...candidateUpdates,
    ]);
    stats.candidateUpdatesCreated = Math.max(
      0,
      nextCandidateUpdates.length - files.candidateUpdates.length,
    );

    const publishResult = await publishApprovedCandidateUpdates({
      candidateUpdates: nextCandidateUpdates,
      existingCompanies: companies,
      autoApprove: process.env.AUTO_APPROVE_NEW_COMPANIES === "true",
    });
    stats.companiesPublished = publishResult.published;
    errors.push(...publishResult.errors);

    await writeAndMirror({
      ...files,
      rawSourceRecords: [...files.rawSourceRecords, ...newRawRecords],
      candidateUpdates: nextCandidateUpdates,
    });

    if (
      publishResult.published > 0 &&
      process.env.ENABLE_AUTO_PUBLISH !== "false"
    ) {
      const editorialResult = await runEditorialGenerationInternal(errors);
      stats.editorialSurfacesGenerated +=
        editorialResult.stats.editorialSurfacesGenerated;
      stats.qualityGateFailures += editorialResult.stats.qualityGateFailures;
    }

    const run = createRun("discover", startedAt, {
      stats,
      errors,
    });
    await appendAgentRun(run);
    return run;
  } catch (error) {
    const run = createRun("discover", startedAt, {
      stats,
      errors: [...errors, getErrorMessage(error)],
      failed: true,
    });
    await appendAgentRun(run);
    return run;
  }
}

export async function runEditorialGeneration() {
  const errors: string[] = [];
  const result = await runEditorialGenerationInternal(errors);
  const run = createRun("editorial", result.startedAt, {
    stats: result.stats,
    errors,
  });
  await appendAgentRun(run);
  return run;
}

export async function runAgentAll() {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];

  const refresh = await runRefreshKnownCompanies();
  const discover = await runDiscoverNewCandidates();
  const editorial = await runEditorialGeneration();
  const stats = mergeStats(refresh.stats, discover.stats, editorial.stats);
  errors.push(...refresh.errors, ...discover.errors, ...editorial.errors);

  const run = createRun("all", startedAt, {
    stats,
    errors,
  });
  await appendAgentRun(run);
  return run;
}

async function runEditorialGenerationInternal(errors: string[]) {
  const startedAt = new Date().toISOString();
  const files = await readAgentDataForPipeline();
  const liveCompanies = toAgentCompanies(await loadPublishedCompaniesForAgent());
  const companies = liveCompanies.length > 0 ? liveCompanies : files.companies;
  const previousSnapshot = files.marketSnapshots[0];
  const currentSnapshot = createMarketSnapshot(
    companies,
    files.companyEvents,
    previousSnapshot,
  );
  const {
    surfaces,
    exposures,
    insightHistory,
    qualityGateFailures,
    errors: generationErrors,
  } = await generateEditorialSurfaces({
    companies,
    events: files.companyEvents,
    currentSnapshot,
    previousSnapshots: files.marketSnapshots,
    priorSurfaces: files.editorialSurfaces,
    insightHistory: files.generatedInsightHistory,
    exposures: files.companyExposures,
  });
  errors.push(...generationErrors);
  const nextSnapshots = [currentSnapshot, ...files.marketSnapshots]
    .filter((snapshot, index, snapshots) => {
      return snapshots.findIndex((item) => item.sourceHash === snapshot.sourceHash) === index;
    })
    .slice(0, 30);
  const stats = {
    ...emptyStats,
    editorialSurfacesGenerated: surfaces.filter(
      (surface) => surface.generatedAt === currentSnapshot.generatedAt,
    ).length,
    qualityGateFailures,
  };

  const mirrorResult = await writeAndMirror({
    ...files,
    companies,
    marketSnapshots: nextSnapshots,
    editorialSurfaces: surfaces,
    companyExposures: exposures,
    generatedInsightHistory: insightHistory,
  });

  if (!mirrorResult.ok && mirrorResult.reason) {
    errors.push(mirrorResult.reason);
  }
  if (!mirrorResult.ok && mirrorResult.errors) {
    errors.push(...mirrorResult.errors);
  }

  return {
    startedAt,
    stats,
  };
}

function eventFromSignal(signal: ExtractedSignal): CompanyEvent {
  const discoveredAt = new Date().toISOString();
  const occurredAt = signal.occurredAt ?? discoveredAt;
  const contentHash = createContentHash({
    companyId: signal.possibleCompanyId,
    type: signal.signalType,
    title: signal.title,
    occurredAt,
    facts: signal.facts,
  });

  return {
    id: createId("event", contentHash),
    companyId: signal.possibleCompanyId ?? "",
    type: signal.signalType,
    title: signal.title,
    summary: signal.summary,
    sourceUrl: "",
    sourceName: "Source record",
    occurredAt,
    discoveredAt,
    confidence: signal.confidence,
    importanceScore: 0,
    noveltyScore: 0,
    relevanceScore: 0,
    finalScore: 0,
    extractedFacts: {
      round: signal.facts.round,
      amount: signal.facts.fundingAmount,
      investorNames: signal.facts.investors,
      customerNames: signal.facts.customers,
      productNames: signal.facts.product ? [signal.facts.product] : undefined,
      roleCount: signal.facts.jobs?.length,
      location: signal.facts.location,
    },
    contentHash,
  };
}

function createCompanyFactEvents(
  companies: AgentCompany[],
  existingEvents: CompanyEvent[],
) {
  const existingHashes = new Set(existingEvents.map((event) => event.contentHash));
  const events: CompanyEvent[] = [];
  const discoveredAt = new Date().toISOString();

  for (const company of companies) {
    const addedHash = createContentHash({
      companyId: company.id,
      type: "new_company_added",
      createdAt: company.createdAt.slice(0, 10),
    });
    if (!existingHashes.has(addedHash)) {
      events.push({
        id: createId("event", addedHash),
        companyId: company.id,
        type: "new_company_added",
        title: `${company.name} expands ${company.category}`,
        summary: `${company.generated?.hook ?? company.oneSentenceDescription}`,
        sourceUrl: company.website ?? `https://aiatlas.nyc/companies/${company.slug}`,
        sourceName: "AI Atlas curation",
        occurredAt: company.createdAt,
        discoveredAt,
        confidence: "high",
        importanceScore: 0,
        noveltyScore: 0,
        relevanceScore: 0,
        finalScore: 0,
        extractedFacts: {
          location: company.location,
        },
        contentHash: addedHash,
      });
    }

    const latestRound = company.funding?.latestRound;
    const fundingAmount = company.funding?.latestRoundAmount || extractAmount(company);

    if (latestRound && fundingAmount && fundingAmount !== "N/A") {
      const fundingHash = createContentHash({
        companyId: company.id,
        type: "funding",
        latestRound,
        fundingAmount,
        latestRoundDate: company.funding?.latestRoundDate,
      });

      if (!existingHashes.has(fundingHash)) {
        events.push({
          id: createId("event", fundingHash),
          companyId: company.id,
          type: "funding",
          title: `${company.name} recorded ${latestRound} funding`,
          summary: `${company.name} has ${latestRound} funding${fundingAmount ? ` of ${fundingAmount}` : ""}${company.funding?.leadInvestors?.length ? ` led by ${company.funding.leadInvestors.slice(0, 2).join(" and ")}` : ""}.`,
          sourceUrl: company.website ?? `https://aiatlas.nyc/companies/${company.slug}`,
          sourceName: "Company profile",
          occurredAt: parseDate(company.funding?.latestRoundDate, company.updatedAt),
          discoveredAt,
          confidence: "high",
          importanceScore: 0,
          noveltyScore: 0,
          relevanceScore: 0,
          finalScore: 0,
          extractedFacts: {
            round: latestRound,
            amount: fundingAmount,
            investorNames: company.funding?.leadInvestors,
          },
          contentHash: fundingHash,
        });
      }
    }
  }

  return events;
}

function extractAmount(company: AgentCompany) {
  const totalRaised = company.funding?.totalRaised;
  if (totalRaised && totalRaised !== "N/A") return totalRaised;
  return undefined;
}

function createCandidateUpdatesFromSignals(signals: ExtractedSignal[]) {
  return signals
    .filter((signal) => signal.shouldUpdateCompanyProfile && signal.suggestedCompanyUpdates)
    .map((signal) => ({
      id: createId("candidate_update", {
        companyId: signal.possibleCompanyId,
        title: signal.title,
        facts: signal.facts,
      }),
      companyId: signal.possibleCompanyId,
      candidateCompanyName: signal.companyName,
      proposedUpdate: signal.suggestedCompanyUpdates ?? {},
      reason: signal.summary,
      sourceUrls: [],
      confidence: signal.confidence,
      status: "pending",
      createdAt: new Date().toISOString(),
    } satisfies CandidateUpdate));
}

function createCandidateUpdateFromRaw(record: RawSourceRecord): CandidateUpdate | null {
  if (!hasFallbackCandidateSignal(record)) return null;

  const candidateCompanyName = record.candidateCompanyName ?? extractCandidateName(record);
  if (!candidateCompanyName) return null;

  return {
    id: createId("candidate_update", {
      candidateCompanyName,
      contentHash: record.contentHash,
    }),
    candidateCompanyName,
    proposedUpdate: {
      name: candidateCompanyName,
      sourceUrls: [record.url],
      oneSentenceDescription: summarize(record.text, 150),
      description: summarize(record.text, 260),
      discoveryReason: {
        trigger: record.sourceType === "press" ? "press_signal" : "cron_discovery",
        sourceEventIds: [],
        sourceUrls: [record.url],
        confidence: "medium",
        notes: `Candidate surfaced from ${record.sourceType}: ${record.title ?? record.url}.`,
      },
    },
    reason: `Candidate found from ${record.title ?? record.url}. Needs manual NYC/stage/AI eligibility review.`,
    sourceUrls: [record.url],
    confidence: "medium",
    status: "pending",
    createdAt: new Date().toISOString(),
  } satisfies CandidateUpdate;
}

function hasFallbackCandidateSignal(record: RawSourceRecord) {
  const text = `${record.title ?? ""} ${record.text}`;

  return (
    /\b(ai|artificial intelligence|generative ai|genai|llm|agentic|machine learning|foundation model)\b/i.test(text) &&
    /\b(new york|nyc|brooklyn|manhattan|soho|flatiron|nomad|chelsea)\b/i.test(text) &&
    /\b(startup|company|raised|funding|seed|pre-seed|preseed|series a|launches|launched|emerges|founded)\b/i.test(text)
  );
}

function extractCandidateName(record: RawSourceRecord) {
  if (record.candidateCompanyName) return record.candidateCompanyName;
  const title = record.title ?? "";
  const match = title.match(/^([A-Z][A-Za-z0-9 .-]{1,42})\s+(raises|launches|announces|secures)/);
  return match?.[1]?.trim();
}

function dedupeCandidateUpdates(updates: CandidateUpdate[]) {
  const seen = new Set<string>();
  return updates.filter((update) => {
    const key = update.companyId
      ? `${update.companyId}:${createContentHash(update.proposedUpdate)}`
      : `${update.candidateCompanyName}:${update.sourceUrls.join("|")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function writeAndMirror(data: AgentDataFiles) {
  const mirrorResult = await saveAgentDataToSupabase(data);
  const jsonResult = await writeAgentDataFilesSafely(data);

  if (mirrorResult.ok) return mirrorResult;
  if (isVercelRuntime()) return mirrorResult;
  if (!jsonResult.ok) {
    return {
      ok: false,
      errors: [
        ...(mirrorResult.errors ?? []),
        ...(mirrorResult.reason ? [mirrorResult.reason] : []),
        ...jsonResult.errors,
      ],
    };
  }

  return mirrorResult;
}

async function appendAgentRun(run: AgentRun) {
  const files = await readAgentDataForPipeline();
  const nextRuns = [run, ...files.agentRuns].slice(0, 100);
  await saveAgentDataToSupabase({
    agentRuns: nextRuns,
  });
  await writeAgentDataFilesSafely({
    agentRuns: nextRuns,
  });
}

async function readAgentDataForPipeline(): Promise<AgentDataFiles> {
  const [jsonData, supabaseData] = await Promise.all([
    readAgentDataFiles(),
    loadAgentDataForPipelineFromSupabase(),
  ]);

  return {
    companies: jsonData.companies,
    companyEvents: preferRemote(supabaseData.companyEvents, jsonData.companyEvents),
    rawSourceRecords: preferRemote(
      supabaseData.rawSourceRecords,
      jsonData.rawSourceRecords,
    ),
    marketSnapshots: preferRemote(
      supabaseData.marketSnapshots,
      jsonData.marketSnapshots,
    ),
    editorialSurfaces: preferRemote(
      supabaseData.editorialSurfaces,
      jsonData.editorialSurfaces,
    ),
    candidateUpdates: preferRemote(
      supabaseData.candidateUpdates,
      jsonData.candidateUpdates,
    ),
    companyExposures: preferRemote(
      supabaseData.companyExposures,
      jsonData.companyExposures,
    ),
    generatedInsightHistory: preferRemote(
      supabaseData.generatedInsightHistory,
      jsonData.generatedInsightHistory,
    ),
    agentRuns: preferRemote(supabaseData.agentRuns, jsonData.agentRuns),
  };
}

async function writeAgentDataFilesSafely(data: Partial<AgentDataFiles>) {
  try {
    await writeAgentDataFiles(data);
    return { ok: true, errors: [] as string[] };
  } catch (error) {
    const message = `JSON fallback write failed: ${getErrorMessage(error)}`;
    if (isVercelRuntime()) return { ok: true, errors: [] as string[] };

    return {
      ok: false,
      errors: [message],
    };
  }
}

function preferRemote<T>(remoteValue: T[] | undefined, jsonValue: T[]) {
  return remoteValue && remoteValue.length > 0 ? remoteValue : jsonValue;
}

function isVercelRuntime() {
  return process.env.VERCEL === "1";
}

function createRun(
  job: JobName,
  startedAt: string,
  {
    stats,
    errors,
    failed = false,
  }: {
    stats: JobStats;
    errors: string[];
    failed?: boolean;
  },
): AgentRun {
  const finishedAt = new Date().toISOString();
  const status = failed ? "failed" : errors.length > 0 ? "partial" : "success";

  return {
    id: createId("agent_run", {
      job,
      startedAt,
      finishedAt,
    }),
    job,
    startedAt,
    finishedAt,
    status,
    stats,
    errors,
  };
}

function mergeStats(...statsItems: JobStats[]) {
  return statsItems.reduce<JobStats>((merged, stats) => ({
    rawRecordsCreated: merged.rawRecordsCreated + stats.rawRecordsCreated,
    eventsCreated: merged.eventsCreated + stats.eventsCreated,
    eventsDeduped: merged.eventsDeduped + stats.eventsDeduped,
    candidateUpdatesCreated:
      merged.candidateUpdatesCreated + stats.candidateUpdatesCreated,
    companiesPublished: merged.companiesPublished + stats.companiesPublished,
    companiesArchived: merged.companiesArchived + stats.companiesArchived,
    editorialSurfacesGenerated:
      merged.editorialSurfacesGenerated + stats.editorialSurfacesGenerated,
    qualityGateFailures:
      merged.qualityGateFailures + stats.qualityGateFailures,
  }), { ...emptyStats });
}

function summarize(text: string, maxLength: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}…`;
}

function parseDate(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  const withDay = new Date(`1 ${value}`);
  if (!Number.isNaN(withDay.getTime())) return withDay.toISOString();

  return fallback;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
