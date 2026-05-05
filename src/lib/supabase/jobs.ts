import { cache } from "react";

import {
  cleanJobTitleForDisplay,
  getJobDepartmentLabel,
  isNavigableCompanyJob,
} from "@/lib/jobs/jobDisplay";
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
    .limit(500);

  if (error || !data) {
    return {
      isSignedIn: true,
      jobs: [],
      error: error?.message ?? "Unable to load jobs.",
    };
  }

  return {
    isSignedIn: true,
    jobs: normalizeCompanyJobRows(data as CompanyJobRow[]),
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
  const jobs = await getPublicCompanyJobs();
  if (jobs.length === 0) return emptyJobStats;

  const companiesHiring = new Set(
    jobs
      .map((job) => safeString(job.company_id, ""))
      .filter(Boolean),
  ).size;

  const latestSyncAt =
    jobs
      .map((job) => safeString(job.last_seen_at, ""))
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  return {
    openRoles: jobs.length,
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
    .limit(500);

  if (error || !data) return [];

  return normalizeCompanyJobRows(data as CompanyJobRow[]);
});

function normalizeCompanyJob(row: CompanyJobRow): CompanyJob {
  const now = new Date().toISOString();
  const title = cleanJobTitleForDisplay(safeString(row.title, "Open role"));
  const sourceUrl = safeString(row.source_url, "");
  const department = getJobDepartmentLabel({
    title,
    source_url: sourceUrl,
    department: safeString(row.department, ""),
  });

  return {
    id: safeString(row.id, `job_${safeString(row.source_url, Date.now().toString())}`),
    company_id: safeString(row.company_id, ""),
    title,
    department,
    location: safeString(row.location, ""),
    employment_type: safeString(row.employment_type, ""),
    remote_policy: safeString(row.remote_policy, ""),
    source_url: sourceUrl,
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

function normalizeCompanyJobRows(rows: CompanyJobRow[]) {
  return rows
    .map((row): CompanyJobWithCompany => ({
      ...normalizeCompanyJob(row),
      company: row.companies ? normalizeCompany(row.companies) : undefined,
    }))
    .filter((job) => Boolean(job.company) && isNavigableCompanyJob(job));
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
