import { unstable_cache } from "next/cache";

import { COMPANY_VIEW_METRICS_CACHE_TAG } from "@/lib/cache-tags";
import {
  runWithNextCacheFallback,
  safeRevalidateTag,
} from "@/lib/cache/runtime-cache";
import {
  createSupabasePrivilegedClient,
  hasSupabasePrivilegedCredentials,
} from "@/lib/supabase/privileged";
import type { CompanyMetrics } from "@/types/market";

type CompanyViewMetricRow = {
  company_id: string;
  views: number | null;
  last_viewed_at: string | null;
};

const memoryMetrics = new Map<string, CompanyMetrics>();

export function getSeededCompanyViews(companyId: string) {
  const hash = Array.from(companyId).reduce(
    (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
    17,
  );

  return 12 + (hash % 88);
}

export async function getCompanyViewMetrics(companyIds?: string[]) {
  const rows = await runWithNextCacheFallback(
    getCachedCompanyViewMetricRows,
    getCompanyViewMetricRows,
  );

  const filteredRows =
    companyIds && companyIds.length > 0
      ? rows.filter((row) => companyIds.includes(row.company_id))
      : rows;

  return new Map(
    filteredRows.map((row) => [row.company_id, normalizeCompanyMetric(row)]),
  );
}

const getCachedCompanyViewMetricRows = unstable_cache(
  getCompanyViewMetricRows,
  ["company-view-metric-rows"],
  {
    revalidate: 60,
    tags: [COMPANY_VIEW_METRICS_CACHE_TAG],
  },
);

async function getCompanyViewMetricRows() {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("company_view_metrics")
    .select("company_id, views, last_viewed_at");

  if (error || !data) {
    console.warn("Company view metrics fallback:", error?.message);
    return [];
  }

  return data as CompanyViewMetricRow[];
}

export async function incrementCompanyViews(
  companyId: string,
  baselineViews = getSeededCompanyViews(companyId),
): Promise<CompanyMetrics> {
  const viewedAt = new Date().toISOString();
  const supabase = createSupabasePrivilegedClient();

  if (!supabase || !hasSupabasePrivilegedCredentials()) {
    return incrementMemoryMetric(companyId, baselineViews, viewedAt);
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "increment_company_view_metric",
    {
      p_company_id: companyId,
      p_baseline_views: normalizeViewCount(baselineViews),
    },
  );

  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  if (!rpcError && row) {
    const metric = normalizeCompanyMetric(row as CompanyViewMetricRow);
    memoryMetrics.set(companyId, metric);
    safeRevalidateTag(COMPANY_VIEW_METRICS_CACHE_TAG);
    return metric;
  }

  if (rpcError) {
    console.warn("Company view metric RPC fallback:", rpcError.message);
  }

  const metric = await incrementCompanyViewsWithUpsert(companyId, baselineViews);
  memoryMetrics.set(companyId, metric);
  safeRevalidateTag(COMPANY_VIEW_METRICS_CACHE_TAG);
  return metric;
}

export function normalizeCompanyMetric(value: unknown): CompanyMetrics {
  if (!value || typeof value !== "object") return { views: 0 };

  const metric = value as Partial<
    CompanyMetrics & {
      views: number | null;
      lastViewedAt: string | null;
      last_viewed_at: string | null;
    }
  >;

  return {
    views: normalizeViewCount(metric.views),
    lastViewedAt:
      safeString(metric.lastViewedAt) ?? safeString(metric.last_viewed_at),
  };
}

function incrementMemoryMetric(
  companyId: string,
  baselineViews: number,
  viewedAt: string,
): CompanyMetrics {
  const current = memoryMetrics.get(companyId);
  const views = Math.max(current?.views ?? 0, normalizeViewCount(baselineViews)) + 1;
  const metric = { views, lastViewedAt: viewedAt };
  memoryMetrics.set(companyId, metric);
  return metric;
}

async function incrementCompanyViewsWithUpsert(
  companyId: string,
  baselineViews: number,
): Promise<CompanyMetrics> {
  const viewedAt = new Date().toISOString();
  const supabase = createSupabasePrivilegedClient();

  if (!supabase || !hasSupabasePrivilegedCredentials()) {
    return incrementMemoryMetric(companyId, baselineViews, viewedAt);
  }

  const { data: currentRow, error: selectError } = await supabase
    .from("company_view_metrics")
    .select("views")
    .eq("company_id", companyId)
    .maybeSingle();

  if (selectError) {
    console.warn("Company view metrics select fallback:", selectError.message);
    return incrementMemoryMetric(companyId, baselineViews, viewedAt);
  }

  const currentViews = normalizeViewCount(
    (currentRow as { views?: number | null } | null)?.views,
    baselineViews,
  );
  const nextMetric = {
    company_id: companyId,
    views: currentViews + 1,
    last_viewed_at: viewedAt,
  };

  const { data, error } = await supabase
    .from("company_view_metrics")
    .upsert(nextMetric, { onConflict: "company_id" })
    .select("company_id, views, last_viewed_at")
    .single();

  if (error || !data) {
    console.warn("Company view metrics write fallback:", error?.message);
    return incrementMemoryMetric(companyId, baselineViews, viewedAt);
  }

  return normalizeCompanyMetric(data as CompanyViewMetricRow);
}

function normalizeViewCount(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : Math.max(0, Math.floor(fallback));
}

function safeString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
