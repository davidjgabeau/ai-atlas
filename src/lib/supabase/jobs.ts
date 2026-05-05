import { cache } from "react";

import { normalizeCompany } from "@/lib/supabase/market-data";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";
import type { CompanyJob, CompanyJobWithCompany } from "@/types/market";

type CompanyJobRow = Partial<CompanyJob> & {
  raw?: unknown;
  companies?: Parameters<typeof normalizeCompany>[0] | null;
};

export const getCompanyJobsForViewer = cache(async (): Promise<{
  isSignedIn: boolean;
  jobs: CompanyJobWithCompany[];
  error?: string;
}> => {
  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) return { isSignedIn: false, jobs: [] };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isSignedIn: false, jobs: [] };

  const { data, error } = await supabase
    .from("company_jobs")
    .select("*, companies(*)")
    .eq("status", "open")
    .order("last_seen_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    return {
      isSignedIn: true,
      jobs: [],
      error: error?.message ?? "Unable to load jobs.",
    };
  }

  return {
    isSignedIn: true,
    jobs: (data as CompanyJobRow[])
      .map((row) => ({
        ...normalizeCompanyJob(row),
        company: row.companies ? normalizeCompany(row.companies) : undefined,
      }))
      .filter((job) => Boolean(job.company)),
  };
});

export type CompanyJobStats = {
  openRoles: number;
  companiesHiring: number;
  latestSyncAt: string | null;
};

const emptyJobStats: CompanyJobStats = {
  openRoles: 0,
  companiesHiring: 0,
  latestSyncAt: null,
};

export const getPublicCompanyJobStats = cache(async (): Promise<CompanyJobStats> => {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return emptyJobStats;

  const { data, error } = await supabase
    .from("company_jobs")
    .select("company_id, last_seen_at")
    .eq("status", "open")
    .order("last_seen_at", { ascending: false })
    .limit(2000);

  if (error || !data) return emptyJobStats;

  const companiesHiring = new Set(
    data
      .map((row) => safeString(row.company_id, ""))
      .filter(Boolean),
  ).size;

  const latestSyncAt =
    data
      .map((row) => safeString(row.last_seen_at, ""))
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  return {
    openRoles: data.length,
    companiesHiring,
    latestSyncAt,
  };
});

export const getPublicCompanyJobs = cache(async (): Promise<CompanyJobWithCompany[]> => {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("company_jobs")
    .select("*, companies(*)")
    .eq("status", "open")
    .order("last_seen_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  return (data as CompanyJobRow[])
    .map((row) => ({
      ...normalizeCompanyJob(row),
      company: row.companies ? normalizeCompany(row.companies) : undefined,
    }))
    .filter((job) => Boolean(job.company));
});

function normalizeCompanyJob(row: CompanyJobRow): CompanyJob {
  const now = new Date().toISOString();

  return {
    id: safeString(row.id, `job_${safeString(row.source_url, Date.now().toString())}`),
    company_id: safeString(row.company_id, ""),
    title: safeString(row.title, "Open role"),
    department: safeString(row.department, ""),
    location: safeString(row.location, ""),
    employment_type: safeString(row.employment_type, ""),
    remote_policy: safeString(row.remote_policy, ""),
    source_url: safeString(row.source_url, ""),
    source_name: safeString(row.source_name, "Company careers"),
    external_id: safeString(row.external_id, ""),
    posted_at: optionalString(row.posted_at),
    discovered_at: safeString(row.discovered_at, now),
    last_seen_at: safeString(row.last_seen_at, now),
    status: row.status === "closed" ? "closed" : "open",
    raw: normalizeRaw(row.raw),
    created_at: safeString(row.created_at, now),
    updated_at: safeString(row.updated_at, now),
  };
}

function normalizeRaw(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function safeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
