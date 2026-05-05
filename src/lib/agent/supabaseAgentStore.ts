import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  AgentDataFiles,
  AgentRun,
  CandidateUpdate,
  CompanyEvent,
  CompanyExposure,
  EditorialSurface,
  GeneratedInsightHistory,
  MarketSnapshot,
  RawSourceRecord,
} from "../../types/agent";
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_AGENT_WRITE_SECRET,
  SUPABASE_SERVER_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "../supabase/env";

export async function loadAgentDataFromSupabase(): Promise<Partial<AgentDataFiles>> {
  if (!isSupabaseConfigured()) return {};

  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
    },
  });

  try {
    const [surfaces, snapshots, events] = await Promise.all([
      supabase
        .from("editorial_surfaces")
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(24),
      supabase
        .from("market_snapshots")
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(8),
      supabase
        .from("company_events")
        .select("*")
        .order("discovered_at", { ascending: false })
        .limit(50),
    ]);

    if (surfaces.error || snapshots.error || events.error) return {};

    return {
      editorialSurfaces: (surfaces.data ?? []).map(fromEditorialSurfaceRow),
      marketSnapshots: (snapshots.data ?? []).map(fromMarketSnapshotRow),
      companyEvents: (events.data ?? []).map(fromCompanyEventRow),
    };
  } catch {
    return {};
  }
}

export async function loadAgentDataForPipelineFromSupabase(): Promise<Partial<AgentDataFiles>> {
  const supabase = createAgentWriteClient();
  if (!supabase) return {};

  try {
    const [
      rawSourceRecords,
      companyEvents,
      marketSnapshots,
      editorialSurfaces,
      candidateUpdates,
      companyExposures,
      generatedInsightHistory,
      agentRuns,
    ] = await Promise.all([
      supabase
        .from("raw_source_records")
        .select("*")
        .order("discovered_at", { ascending: false })
        .limit(1000),
      supabase
        .from("company_events")
        .select("*")
        .order("discovered_at", { ascending: false })
        .limit(1000),
      supabase
        .from("market_snapshots")
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(30),
      supabase
        .from("editorial_surfaces")
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(120),
      supabase
        .from("candidate_updates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("company_exposures")
        .select("*")
        .order("shown_at", { ascending: false })
        .limit(1000),
      supabase
        .from("generated_insight_history")
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(200),
      supabase
        .from("agent_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100),
    ]);

    const results = [
      rawSourceRecords,
      companyEvents,
      marketSnapshots,
      editorialSurfaces,
      candidateUpdates,
      companyExposures,
      generatedInsightHistory,
      agentRuns,
    ];

    if (results.some((result) => result.error)) return {};

    return {
      rawSourceRecords: (rawSourceRecords.data ?? []).map(fromRawSourceRecordRow),
      companyEvents: (companyEvents.data ?? []).map(fromCompanyEventRow),
      marketSnapshots: (marketSnapshots.data ?? []).map(fromMarketSnapshotRow),
      editorialSurfaces: (editorialSurfaces.data ?? []).map(fromEditorialSurfaceRow),
      candidateUpdates: (candidateUpdates.data ?? []).map(fromCandidateUpdateRow),
      companyExposures: (companyExposures.data ?? []).map(fromCompanyExposureRow),
      generatedInsightHistory: (generatedInsightHistory.data ?? []).map(
        fromGeneratedInsightHistoryRow,
      ),
      agentRuns: (agentRuns.data ?? []).map(fromAgentRunRow),
    };
  } catch {
    return {};
  }
}

export async function saveAgentDataToSupabase(data: Partial<AgentDataFiles>) {
  const supabase = createAgentWriteClient();

  if (!supabase) {
    return {
      ok: false,
      reason:
        "SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY, or SUPABASE_AGENT_WRITE_SECRET is not configured.",
    };
  }

  const errors: string[] = [];

  await upsertRows(
    supabase,
    "raw_source_records",
    data.rawSourceRecords?.map(toRawSourceRecordRow),
    errors,
  );
  await upsertRows(
    supabase,
    "company_events",
    data.companyEvents?.map(toCompanyEventRow),
    errors,
  );
  await upsertRows(
    supabase,
    "market_snapshots",
    data.marketSnapshots?.map(toMarketSnapshotRow),
    errors,
  );
  await upsertRows(
    supabase,
    "editorial_surfaces",
    data.editorialSurfaces?.map(toEditorialSurfaceRow),
    errors,
  );
  await upsertRows(
    supabase,
    "candidate_updates",
    data.candidateUpdates?.map(toCandidateUpdateRow),
    errors,
  );
  await upsertRows(
    supabase,
    "company_exposures",
    data.companyExposures?.map(toCompanyExposureRow),
    errors,
  );
  await upsertRows(
    supabase,
    "generated_insight_history",
    data.generatedInsightHistory?.map(toGeneratedInsightHistoryRow),
    errors,
  );
  await upsertRows(
    supabase,
    "agent_runs",
    data.agentRuns?.map(toAgentRunRow),
    errors,
  );

  return {
    ok: errors.length === 0,
    errors,
  };
}

function createAgentWriteClient() {
  if (!SUPABASE_URL) return null;

  if (SUPABASE_SERVER_KEY) {
    return createClient(SUPABASE_URL, SUPABASE_SERVER_KEY, {
      auth: {
        persistSession: false,
      },
    });
  }

  if (!SUPABASE_PUBLISHABLE_KEY || !SUPABASE_AGENT_WRITE_SECRET) return null;

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        "x-ai-atlas-agent-secret": SUPABASE_AGENT_WRITE_SECRET,
      },
    },
  });
}

function fromRawSourceRecordRow(row: Record<string, unknown>): RawSourceRecord {
  return {
    id: stringValue(row.id),
    sourceType: row.source_type as RawSourceRecord["sourceType"],
    companyId: optionalString(row.company_id),
    candidateCompanyName: optionalString(row.candidate_company_name),
    url: stringValue(row.url),
    title: optionalString(row.title),
    text: stringValue(row.text_content),
    author: optionalString(row.author),
    publishedAt: optionalString(row.published_at),
    discoveredAt: stringValue(row.discovered_at),
    contentHash: stringValue(row.content_hash),
  };
}

async function upsertRows(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[] | undefined,
  errors: string[],
) {
  if (!rows || rows.length === 0) return;

  const { error } = await supabase.from(table).upsert(rows, {
    onConflict: "id",
  });

  if (error) {
    errors.push(`${table}: ${error.message}`);
  }
}

function toRawSourceRecordRow(record: RawSourceRecord) {
  return {
    id: record.id,
    source_type: record.sourceType,
    company_id: record.companyId,
    candidate_company_name: record.candidateCompanyName,
    url: record.url,
    title: record.title,
    text_content: record.text,
    author: record.author,
    published_at: record.publishedAt,
    discovered_at: record.discoveredAt,
    content_hash: record.contentHash,
  };
}

function toCompanyEventRow(event: CompanyEvent) {
  return {
    id: event.id,
    company_id: event.companyId,
    type: event.type,
    title: event.title,
    summary: event.summary,
    source_url: event.sourceUrl,
    source_name: event.sourceName,
    occurred_at: event.occurredAt,
    discovered_at: event.discoveredAt,
    confidence: event.confidence,
    importance_score: event.importanceScore,
    novelty_score: event.noveltyScore,
    relevance_score: event.relevanceScore,
    final_score: event.finalScore,
    extracted_facts: event.extractedFacts,
    content_hash: event.contentHash,
  };
}

function toMarketSnapshotRow(snapshot: MarketSnapshot) {
  return {
    id: snapshot.id,
    generated_at: snapshot.generatedAt,
    company_count: snapshot.companyCount,
    category_counts: snapshot.categoryCounts,
    stage_counts: snapshot.stageCounts,
    recent_company_ids: snapshot.recentCompanyIds,
    recent_event_ids: snapshot.recentEventIds,
    top_categories: snapshot.topCategories,
    top_signals: snapshot.topSignals,
    source_hash: snapshot.sourceHash,
  };
}

function toEditorialSurfaceRow(surface: EditorialSurface) {
  return {
    id: surface.id,
    surface: surface.surface,
    generated_at: surface.generatedAt,
    expires_at: surface.expiresAt,
    items: surface.items,
    source_event_ids: surface.sourceEventIds,
    source_company_ids: surface.sourceCompanyIds,
    source_snapshot_ids: surface.sourceSnapshotIds,
    model: surface.model,
    prompt_version: surface.promptVersion,
    source_hash: surface.sourceHash,
  };
}

function toCandidateUpdateRow(update: CandidateUpdate) {
  return {
    id: update.id,
    company_id: update.companyId,
    candidate_company_name: update.candidateCompanyName,
    proposed_update: update.proposedUpdate,
    reason: update.reason,
    source_urls: update.sourceUrls,
    confidence: update.confidence,
    status: update.status,
    created_at: update.createdAt,
  };
}

function toCompanyExposureRow(exposure: CompanyExposure) {
  return {
    id: exposure.id,
    company_id: exposure.companyId,
    surface: exposure.surface,
    shown_at: exposure.shownAt,
    position: exposure.position,
  };
}

function toGeneratedInsightHistoryRow(history: GeneratedInsightHistory) {
  return {
    id: history.id,
    title: history.title,
    body: history.body,
    generated_at: history.generatedAt,
    source_company_ids: history.sourceCompanyIds,
    source_event_ids: history.sourceEventIds,
    embedding: history.embedding,
  };
}

function toAgentRunRow(run: AgentRun) {
  return {
    id: run.id,
    job: run.job,
    started_at: run.startedAt,
    finished_at: run.finishedAt,
    status: run.status,
    stats: run.stats,
    errors: run.errors,
  };
}

function fromEditorialSurfaceRow(row: Record<string, unknown>): EditorialSurface {
  return {
    id: stringValue(row.id),
    surface: row.surface as EditorialSurface["surface"],
    generatedAt: stringValue(row.generated_at),
    expiresAt: stringValue(row.expires_at),
    items: Array.isArray(row.items) ? row.items as EditorialSurface["items"] : [],
    sourceEventIds: arrayValue(row.source_event_ids),
    sourceCompanyIds: arrayValue(row.source_company_ids),
    sourceSnapshotIds: arrayValue(row.source_snapshot_ids),
    model: optionalString(row.model),
    promptVersion: stringValue(row.prompt_version),
    sourceHash: stringValue(row.source_hash),
  };
}

function fromMarketSnapshotRow(row: Record<string, unknown>): MarketSnapshot {
  return {
    id: stringValue(row.id),
    generatedAt: stringValue(row.generated_at),
    companyCount: numberValue(row.company_count),
    categoryCounts: objectValue(row.category_counts),
    stageCounts: objectValue(row.stage_counts),
    recentCompanyIds: arrayValue(row.recent_company_ids),
    recentEventIds: arrayValue(row.recent_event_ids),
    topCategories: Array.isArray(row.top_categories)
      ? row.top_categories as MarketSnapshot["topCategories"]
      : [],
    topSignals: Array.isArray(row.top_signals)
      ? row.top_signals as MarketSnapshot["topSignals"]
      : [],
    sourceHash: stringValue(row.source_hash),
  };
}

function fromCompanyEventRow(row: Record<string, unknown>): CompanyEvent {
  return {
    id: stringValue(row.id),
    companyId: stringValue(row.company_id),
    type: row.type as CompanyEvent["type"],
    title: stringValue(row.title),
    summary: stringValue(row.summary),
    sourceUrl: stringValue(row.source_url),
    sourceName: stringValue(row.source_name),
    occurredAt: stringValue(row.occurred_at),
    discoveredAt: stringValue(row.discovered_at),
    confidence: row.confidence as CompanyEvent["confidence"],
    importanceScore: numberValue(row.importance_score),
    noveltyScore: numberValue(row.novelty_score),
    relevanceScore: numberValue(row.relevance_score),
    finalScore: numberValue(row.final_score),
    extractedFacts: row.extracted_facts && typeof row.extracted_facts === "object"
      ? row.extracted_facts as CompanyEvent["extractedFacts"]
      : {},
    contentHash: stringValue(row.content_hash),
  };
}

function fromCandidateUpdateRow(row: Record<string, unknown>): CandidateUpdate {
  return {
    id: stringValue(row.id),
    companyId: optionalString(row.company_id),
    candidateCompanyName: optionalString(row.candidate_company_name),
    proposedUpdate:
      row.proposed_update && typeof row.proposed_update === "object"
        ? row.proposed_update as CandidateUpdate["proposedUpdate"]
        : {},
    reason: stringValue(row.reason),
    sourceUrls: arrayValue(row.source_urls),
    confidence: row.confidence as CandidateUpdate["confidence"],
    status: row.status as CandidateUpdate["status"],
    createdAt: stringValue(row.created_at),
  };
}

function fromCompanyExposureRow(row: Record<string, unknown>): CompanyExposure {
  return {
    id: stringValue(row.id),
    companyId: stringValue(row.company_id),
    surface: row.surface as CompanyExposure["surface"],
    shownAt: stringValue(row.shown_at),
    position: numberValue(row.position),
  };
}

function fromGeneratedInsightHistoryRow(
  row: Record<string, unknown>,
): GeneratedInsightHistory {
  return {
    id: stringValue(row.id),
    title: stringValue(row.title),
    body: stringValue(row.body),
    generatedAt: stringValue(row.generated_at),
    sourceCompanyIds: arrayValue(row.source_company_ids),
    sourceEventIds: arrayValue(row.source_event_ids),
    embedding: Array.isArray(row.embedding)
      ? row.embedding.filter((item): item is number => typeof item === "number")
      : undefined,
  };
}

function fromAgentRunRow(row: Record<string, unknown>): AgentRun {
  return {
    id: stringValue(row.id),
    job: row.job as AgentRun["job"],
    startedAt: stringValue(row.started_at),
    finishedAt: stringValue(row.finished_at),
    status: row.status as AgentRun["status"],
    stats:
      row.stats && typeof row.stats === "object"
        ? row.stats as AgentRun["stats"]
        : {
            rawRecordsCreated: 0,
            eventsCreated: 0,
            eventsDeduped: 0,
            candidateUpdatesCreated: 0,
            companiesPublished: 0,
            companiesArchived: 0,
            editorialSurfacesGenerated: 0,
            qualityGateFailures: 0,
          },
    errors: arrayValue(row.errors),
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionalString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value) || 0;
}

function arrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function objectValue(value: unknown) {
  return value && typeof value === "object"
    ? value as Record<string, number>
    : {};
}
