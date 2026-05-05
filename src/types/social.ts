import type { Category, Company, NewsItem } from "@/types/market";
import type { CompanyEvent, MarketSnapshot } from "@/types/agent";

export const atlasSocialSourceKinds = [
  "company_update",
  "job_alert",
  "company_news",
  "category_movement",
  "current_read",
  "evergreen_spotlight",
] as const;

export const atlasSocialPostStatuses = [
  "draft",
  "queued",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "canceled",
  "skipped",
] as const;

export const atlasSocialRunTasks = [
  "generate",
  "dispatch",
  "engagement",
  "health_check",
] as const;

export type AtlasSocialSourceKind = (typeof atlasSocialSourceKinds)[number];
export type AtlasSocialPostStatus = (typeof atlasSocialPostStatuses)[number];
export type AtlasSocialRunTask = (typeof atlasSocialRunTasks)[number];
export type AtlasSocialRunStatus = "success" | "partial" | "failed" | "skipped";

export type AtlasSocialPost = {
  id: string;
  source_kind: AtlasSocialSourceKind;
  status: AtlasSocialPostStatus;
  post_text: string;
  scheduled_for?: string;
  published_at?: string;
  external_post_id?: string;
  external_post_url: string;
  company_id?: string;
  source_company_ids: string[];
  source_event_ids: string[];
  source_job_ids: string[];
  source_news_ids: string[];
  source_snapshot_ids: string[];
  source_urls: string[];
  tagged_handles: string[];
  model?: string;
  prompt_version: string;
  source_hash: string;
  safety_notes: string[];
  decision_log: Array<Record<string, unknown>>;
  metrics: Record<string, number>;
  raw: Record<string, unknown>;
  score: number;
  attempt_count: number;
  last_error: string;
  created_at: string;
  updated_at: string;
};

export type AtlasSocialRun = {
  id: string;
  task: AtlasSocialRunTask;
  started_at: string;
  finished_at: string;
  status: AtlasSocialRunStatus;
  stats: Record<string, unknown>;
  errors: string[];
  created_at: string;
};

export type AtlasSocialTarget = {
  id: string;
  entity_type: "company";
  entity_id: string;
  platform: "x";
  handle: string;
  confidence: "unverified" | "manual" | "verified" | "failed";
  source_url: string;
  last_verified_at?: string;
  created_at: string;
};

export type AtlasSocialEngagementAction =
  | "like"
  | "repost"
  | "reply"
  | "quote";

export type AtlasSocialEngagement = {
  id: string;
  company_id?: string;
  platform: "x";
  source_post_id: string;
  source_post_url: string;
  action: AtlasSocialEngagementAction;
  generated_text: string;
  status: "pending" | "queued" | "skipped" | "completed" | "failed";
  posted_at?: string;
  created_at: string;
};

export type AtlasSocialDispatchLog = {
  id: string;
  run_type: AtlasSocialRunTask | "admin";
  selected_event_id?: string;
  selected_post_id?: string;
  selected_engagement_id?: string;
  decision: string;
  notes: string[];
  created_at: string;
};

export type SocialCompany = Pick<
  Company,
  | "id"
  | "name"
  | "slug"
  | "category"
  | "stage"
  | "short_description"
  | "one_line_thesis"
  | "recent_activity_text"
  | "recent_activity_date"
  | "x_handle"
  | "is_featured"
  | "is_breakout"
  | "updated_at"
>;

export type SocialJob = {
  id: string;
  company_id: string;
  title: string;
  location: string;
  source_url: string;
  source_name: string;
  discovered_at: string;
  last_seen_at: string;
};

export type SocialPostCandidate = {
  sourceKind: AtlasSocialSourceKind;
  title: string;
  facts: string[];
  companies: SocialCompany[];
  category?: Category | string;
  event?: CompanyEvent;
  job?: SocialJob;
  newsItem?: NewsItem;
  snapshot?: MarketSnapshot;
  sourceCompanyIds: string[];
  sourceEventIds: string[];
  sourceJobIds: string[];
  sourceNewsIds: string[];
  sourceSnapshotIds: string[];
  sourceUrls: string[];
  primaryUrl?: string;
  sourceHash: string;
  score: number;
};

export type SocialWriterResult = {
  text: string;
  risk: "low" | "medium" | "high";
  reason: string;
  model?: string;
  error?: string;
};
