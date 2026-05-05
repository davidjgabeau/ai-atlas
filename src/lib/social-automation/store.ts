import { createId } from "@/lib/agent/hash";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";
import type {
  AtlasSocialPost,
  AtlasSocialDispatchLog,
  AtlasSocialEngagement,
  AtlasSocialRun,
  AtlasSocialRunStatus,
  AtlasSocialRunTask,
  AtlasSocialTarget,
} from "@/types/social";

type SocialPostRow = Record<string, unknown>;
type SocialRunRow = Record<string, unknown>;
type SocialTargetRow = Record<string, unknown>;
type SocialEngagementRow = Record<string, unknown>;
type SocialDispatchLogRow = Record<string, unknown>;

export async function getExistingSocialSourceHashes(sourceHashes: string[]) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase || sourceHashes.length === 0) return new Set<string>();

  const { data, error } = await supabase
    .from("atlas_social_posts")
    .select("source_hash")
    .in("source_hash", sourceHashes);

  if (error || !data) return new Set<string>();

  return new Set(
    (data as Array<{ source_hash?: string }>)
      .map((row) => row.source_hash)
      .filter((value): value is string => Boolean(value)),
  );
}

export async function upsertSocialPosts(rows: Array<Record<string, unknown>>) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase || rows.length === 0) {
    return {
      ok: Boolean(supabase),
      error: supabase ? "" : "Supabase privileged credentials are not configured.",
      count: 0,
    };
  }

  const normalizedRows = rows.map(normalizeSocialPostUpsertRow);

  const { error } = await supabase
    .from("atlas_social_posts")
    .upsert(normalizedRows, { onConflict: "source_hash" });

  return {
    ok: !error,
    error: error?.message ?? "",
    count: error ? 0 : normalizedRows.length,
  };
}

function normalizeSocialPostUpsertRow(row: Record<string, unknown>) {
  return {
    ...row,
    external_post_url: row.external_post_url ?? "",
    safety_notes: row.safety_notes ?? [],
    decision_log: row.decision_log ?? [],
    metrics: row.metrics ?? {},
    raw: row.raw ?? {},
    attempt_count: row.attempt_count ?? 0,
    last_error: row.last_error ?? "",
  };
}

export async function getDueScheduledPost(now = new Date()) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("atlas_social_posts")
    .select("*")
    .eq("status", "scheduled")
    .lt("attempt_count", 3)
    .lte("scheduled_for", now.toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return normalizeSocialPost(data as SocialPostRow);
}

export async function getSocialPostById(postId: string) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("atlas_social_posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (error || !data) return null;

  return normalizeSocialPost(data as SocialPostRow);
}

export async function claimSocialPostForPublishing(post: AtlasSocialPost) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("atlas_social_posts")
    .update({
      status: "publishing",
      attempt_count: post.attempt_count + 1,
      decision_log: [
        ...post.decision_log,
        {
          at: new Date().toISOString(),
          action: "claim_for_publish",
        },
      ],
    })
    .eq("id", post.id)
    .eq("status", "scheduled")
    .select("*")
    .maybeSingle();

  if (error || !data) return null;

  return normalizeSocialPost(data as SocialPostRow);
}

export async function claimSocialPostNowForPublishing(post: AtlasSocialPost) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return null;

  if (post.attempt_count >= 3) return null;

  const { data, error } = await supabase
    .from("atlas_social_posts")
    .update({
      status: "publishing",
      attempt_count: post.attempt_count + 1,
      decision_log: [
        ...post.decision_log,
        {
          at: new Date().toISOString(),
          action: "admin_claim_for_publish",
        },
      ],
    })
    .eq("id", post.id)
    .in("status", ["draft", "queued", "scheduled", "failed"])
    .select("*")
    .maybeSingle();

  if (error || !data) return null;

  return normalizeSocialPost(data as SocialPostRow);
}

export async function markSocialPostPublished({
  post,
  externalPostId,
  externalPostUrl,
  raw,
}: {
  post: AtlasSocialPost;
  externalPostId: string;
  externalPostUrl: string;
  raw: Record<string, unknown>;
}) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return;

  await supabase
    .from("atlas_social_posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      external_post_id: externalPostId,
      external_post_url: externalPostUrl,
      raw,
      last_error: "",
      decision_log: [
        ...post.decision_log,
        {
          at: new Date().toISOString(),
          action: "published",
          externalPostId,
        },
      ],
    })
    .eq("id", post.id);
}

export async function markSocialPostFailed({
  post,
  error,
}: {
  post: AtlasSocialPost;
  error: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return;

  await supabase
    .from("atlas_social_posts")
    .update({
      status: "failed",
      last_error: error,
      decision_log: [
        ...post.decision_log,
        {
          at: new Date().toISOString(),
          action: "publish_failed",
          error,
        },
      ],
    })
    .eq("id", post.id);
}

export async function markSocialPostSkipped({
  postId,
  reason,
}: {
  postId: string;
  reason: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("atlas_social_posts")
    .update({
      status: "canceled",
      last_error: reason,
    })
    .eq("id", postId)
    .select("*")
    .maybeSingle();

  if (error || !data) return null;

  await saveDispatchLog({
    runType: "admin",
    selectedPostId: postId,
    decision: "skipped_post",
    notes: [reason],
  });

  return normalizeSocialPost(data as SocialPostRow);
}

export async function getRecentSocialPostsForPacing() {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return [];

  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("atlas_social_posts")
    .select("*")
    .eq("status", "published")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return (data as SocialPostRow[]).map(normalizeSocialPost);
}

export async function getRecentSocialPostsForGeneration() {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return [];

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("atlas_social_posts")
    .select("*")
    .in("status", ["draft", "scheduled", "publishing", "published"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return (data as SocialPostRow[]).map(normalizeSocialPost);
}

export async function saveSocialRun(input: {
  task: AtlasSocialRunTask;
  startedAt: string;
  status: AtlasSocialRunStatus;
  stats?: Record<string, unknown>;
  errors?: string[];
}) {
  const supabase = createSupabasePrivilegedClient();
  const finishedAt = new Date().toISOString();
  const run = {
    id: createId("social_run", {
      task: input.task,
      startedAt: input.startedAt,
      finishedAt,
    }),
    task: input.task,
    started_at: input.startedAt,
    finished_at: finishedAt,
    status: input.status,
    stats: input.stats ?? {},
    errors: input.errors ?? [],
  };

  if (supabase) {
    await supabase.from("atlas_social_runs").upsert(run, { onConflict: "id" });
  }

  return normalizeSocialRun(run);
}

export async function saveDispatchLog(input: {
  runType: AtlasSocialRunTask | "admin";
  selectedEventId?: string;
  selectedPostId?: string;
  selectedEngagementId?: string;
  decision: string;
  notes?: string[];
}) {
  const supabase = createSupabasePrivilegedClient();
  const log = {
    created_at: new Date().toISOString(),
    id: createId("social_log", {
      runType: input.runType,
      selectedEventId: input.selectedEventId,
      selectedPostId: input.selectedPostId,
      selectedEngagementId: input.selectedEngagementId,
      decision: input.decision,
      at: new Date().toISOString(),
    }),
    run_type: input.runType,
    selected_event_id: input.selectedEventId ?? null,
    selected_post_id: input.selectedPostId ?? null,
    selected_engagement_id: input.selectedEngagementId ?? null,
    decision: input.decision,
    notes: input.notes ?? [],
  };

  if (supabase) {
    await supabase
      .from("atlas_social_dispatch_logs")
      .upsert(log, { onConflict: "id" });
  }

  return normalizeSocialDispatchLog(log);
}

export async function getAdminSocialPosts(limit = 80) {
  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("atlas_social_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as SocialPostRow[]).map(normalizeSocialPost);
}

export async function getAdminSocialRuns(limit = 20) {
  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("atlas_social_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as SocialRunRow[]).map(normalizeSocialRun);
}

export async function getAdminSocialEngagements(limit = 50) {
  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("atlas_social_engagement_actions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as SocialEngagementRow[]).map(normalizeSocialEngagement);
}

export async function getAdminSocialDispatchLogs(limit = 80) {
  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("atlas_social_dispatch_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as SocialDispatchLogRow[]).map(normalizeSocialDispatchLog);
}

export async function upsertSocialTarget(input: {
  companyId: string;
  handle: string;
  confidence: AtlasSocialTarget["confidence"];
  sourceUrl?: string;
  lastVerifiedAt?: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return null;

  const handle = normalizeHandle(input.handle);
  if (!handle) return null;

  const row = {
    id: createId("social_target", {
      entityType: "company",
      entityId: input.companyId,
      platform: "x",
    }),
    entity_type: "company",
    entity_id: input.companyId,
    platform: "x",
    handle,
    confidence: input.confidence,
    source_url: input.sourceUrl ?? "",
    last_verified_at: input.lastVerifiedAt ?? null,
  };

  const { data, error } = await supabase
    .from("atlas_social_targets")
    .upsert(row, { onConflict: "entity_type,entity_id,platform" })
    .select("*")
    .maybeSingle();

  if (error || !data) return null;

  return normalizeSocialTarget(data as SocialTargetRow);
}

export async function getSocialTargetsForCompanies(companyIds: string[]) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase || companyIds.length === 0) return new Map<string, AtlasSocialTarget>();

  const { data, error } = await supabase
    .from("atlas_social_targets")
    .select("*")
    .eq("platform", "x")
    .in("entity_id", companyIds);

  if (error || !data) return new Map<string, AtlasSocialTarget>();

  return new Map(
    (data as SocialTargetRow[])
      .map(normalizeSocialTarget)
      .map((target) => [target.entity_id, target]),
  );
}

export function normalizeSocialPost(row: SocialPostRow): AtlasSocialPost {
  return {
    id: stringValue(row.id),
    source_kind: row.source_kind as AtlasSocialPost["source_kind"],
    status: row.status as AtlasSocialPost["status"],
    post_text: stringValue(row.post_text),
    scheduled_for: optionalString(row.scheduled_for),
    published_at: optionalString(row.published_at),
    external_post_id: optionalString(row.external_post_id),
    external_post_url: stringValue(row.external_post_url),
    company_id: optionalString(row.company_id),
    source_company_ids: arrayValue(row.source_company_ids),
    source_event_ids: arrayValue(row.source_event_ids),
    source_job_ids: arrayValue(row.source_job_ids),
    source_news_ids: arrayValue(row.source_news_ids),
    source_snapshot_ids: arrayValue(row.source_snapshot_ids),
    source_urls: arrayValue(row.source_urls),
    tagged_handles: arrayValue(row.tagged_handles),
    model: optionalString(row.model),
    prompt_version: stringValue(row.prompt_version),
    source_hash: stringValue(row.source_hash),
    safety_notes: arrayValue(row.safety_notes),
    decision_log: Array.isArray(row.decision_log)
      ? row.decision_log.filter(isObject)
      : [],
    metrics: numberRecord(row.metrics),
    raw: objectValue(row.raw),
    score: numberValue(row.score),
    attempt_count: numberValue(row.attempt_count),
    last_error: stringValue(row.last_error),
    created_at: stringValue(row.created_at),
    updated_at: stringValue(row.updated_at),
  };
}

function normalizeSocialTarget(row: SocialTargetRow): AtlasSocialTarget {
  return {
    id: stringValue(row.id),
    entity_type: "company",
    entity_id: stringValue(row.entity_id),
    platform: "x",
    handle: normalizeHandle(row.handle),
    confidence: normalizeTargetConfidence(row.confidence),
    source_url: stringValue(row.source_url),
    last_verified_at: optionalString(row.last_verified_at),
    created_at: stringValue(row.created_at),
  };
}

function normalizeSocialEngagement(row: SocialEngagementRow): AtlasSocialEngagement {
  return {
    id: stringValue(row.id),
    company_id: optionalString(row.company_id),
    platform: "x",
    source_post_id: stringValue(row.target_external_post_id),
    source_post_url: stringValue(row.source_post_url),
    action:
      row.action === "repost" ||
      row.action === "reply" ||
      row.action === "quote"
        ? row.action
        : "like",
    generated_text: stringValue(row.generated_text),
    status: normalizeEngagementStatus(row.status),
    posted_at: optionalString(row.posted_at),
    created_at: stringValue(row.created_at),
  };
}

function normalizeSocialDispatchLog(row: SocialDispatchLogRow): AtlasSocialDispatchLog {
  return {
    id: stringValue(row.id),
    run_type:
      row.run_type === "generate" ||
      row.run_type === "dispatch" ||
      row.run_type === "engagement" ||
      row.run_type === "health_check"
        ? row.run_type
        : "admin",
    selected_event_id: optionalString(row.selected_event_id),
    selected_post_id: optionalString(row.selected_post_id),
    selected_engagement_id: optionalString(row.selected_engagement_id),
    decision: stringValue(row.decision),
    notes: arrayValue(row.notes),
    created_at: stringValue(row.created_at),
  };
}

function normalizeSocialRun(row: SocialRunRow): AtlasSocialRun {
  return {
    id: stringValue(row.id),
    task: row.task as AtlasSocialRun["task"],
    started_at: stringValue(row.started_at),
    finished_at: stringValue(row.finished_at),
    status: row.status as AtlasSocialRun["status"],
    stats: objectValue(row.stats),
    errors: arrayValue(row.errors),
    created_at: stringValue(row.created_at),
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function arrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberRecord(value: unknown): Record<string, number> {
  const object = objectValue(value);
  return Object.fromEntries(
    Object.entries(object).filter((entry): entry is [string, number] => {
      return typeof entry[1] === "number";
    }),
  );
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeHandle(value: unknown) {
  return typeof value === "string"
    ? value.replace(/^@/, "").trim().toLowerCase()
    : "";
}

function normalizeTargetConfidence(value: unknown): AtlasSocialTarget["confidence"] {
  return value === "manual" || value === "verified" || value === "failed"
    ? value
    : "unverified";
}

function normalizeEngagementStatus(value: unknown): AtlasSocialEngagement["status"] {
  return value === "queued" ||
    value === "skipped" ||
    value === "completed" ||
    value === "failed"
    ? value
    : "pending";
}
