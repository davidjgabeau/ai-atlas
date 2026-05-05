import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";
import type { CompanyMetrics } from "@/types/market";

type CompanyViewMetricRow = {
  company_id: string;
  views: number | null;
  last_viewed_at: string | null;
};

const memoryMetrics = new Map<string, CompanyMetrics>();

export async function getCompanyViewMetrics(companyIds?: string[]) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return new Map<string, CompanyMetrics>();

  let query = supabase
    .from("company_view_metrics")
    .select("company_id, views, last_viewed_at");

  if (companyIds && companyIds.length > 0) {
    query = query.in("company_id", companyIds);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.warn("Company view metrics fallback:", error?.message);
    return new Map<string, CompanyMetrics>();
  }

  return new Map(
    (data as CompanyViewMetricRow[]).map((row) => [
      row.company_id,
      normalizeCompanyMetric(row),
    ]),
  );
}

export async function incrementCompanyViews(
  companyId: string,
  baselineViews = 0,
): Promise<CompanyMetrics> {
  const viewedAt = new Date().toISOString();
  const supabase = createSupabasePrivilegedClient();

  if (!supabase) {
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

  const metric = normalizeCompanyMetric(data as CompanyViewMetricRow);
  memoryMetrics.set(companyId, metric);
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

function normalizeViewCount(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : Math.max(0, Math.floor(fallback));
}

function safeString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
