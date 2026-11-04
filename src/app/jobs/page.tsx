import type { Metadata } from "next";
import { BriefcaseBusiness } from "lucide-react";

import { JobsGateAuthReturn } from "@/components/jobs/jobs-gate-board";
import { UnlockedJobBoard } from "@/components/jobs/unlocked-job-board";
import { PublicShell } from "@/components/site/public-shell";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import {
  createShareMetadata,
  getShareImageUrl,
} from "@/lib/seo/shareMetadata";
import {
  type CompanyJobStats,
  getCompanyJobsForViewer,
  getPublicCompanyJobs,
  getPublicCompanyJobStats,
} from "@/lib/supabase/jobs";
import type { CompanyJobWithCompany } from "@/types/market";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createShareMetadata({
  title: "NYC AI Company Jobs",
  description:
    "Explore jobs and hiring activity from AI companies in New York.",
  path: "/jobs",
  image: getShareImageUrl({ page: "jobs" }),
});

export default async function JobsPage() {
  const [{ isSignedIn, jobs, error }, publicJobStats, publicJobs] =
    await Promise.all([
      getCompanyJobsForViewer(),
      getPublicCompanyJobStats(),
      getPublicCompanyJobs(),
    ]);

  const unlockedJobs = isSignedIn ? jobs : publicJobs;
  const jobStats = isSignedIn ? getStatsFromJobs(jobs) : publicJobStats;

  return (
    <PublicShell>
      <section className="hero">
        <div className="editorial-container py-7 sm:py-12">
          <div className="flex max-w-[780px] flex-col gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-md border border-[#E7E1D8] bg-[#FBFAF7] text-[#9A3D2B]">
                <BriefcaseBusiness className="size-4" />
              </span>
              <p className="editorial-label">Jobs</p>
            </div>
            <h1 className="font-heading text-[clamp(36px,10.5vw,46px)] font-medium leading-[0.97] tracking-[0] text-[#181818] sm:text-[clamp(40px,5vw,64px)]">
              Roles at NYC AI Companies
            </h1>
            <p className="max-w-[640px] text-[16px] leading-[1.45] text-[#5F5A52] sm:text-[18px] sm:leading-[1.55]">
              A simple hiring board for people exploring the teams building
              across the AI Atlas map.
            </p>
            <JobsProofLine stats={jobStats} />
          </div>
        </div>
      </section>

      <section className="bg-section">
        <div className="editorial-container py-4 sm:py-10">
          <JobsGateAuthReturn isSignedIn={isSignedIn} />
          <p className="mb-5 text-sm leading-6 text-[#777166]">Public employer listings seen in the past 14 days, capped at 1,000. Verify openings on the employer’s site before citing or applying. No sign-in required.</p>
          <UnlockedJobBoard jobs={unlockedJobs} error={error} />
        </div>
      </section>
    </PublicShell>
  );
}

function JobsProofLine({ stats }: { stats: CompanyJobStats }) {
  if (stats.openRoles <= 0 || stats.companiesHiring <= 0) return null;

  return (
    <p className="max-w-[640px] border-t border-[#E7E1D8] pt-4 text-sm font-medium leading-[1.6] text-[#66625C]">
      <span className="text-[#181818]">{formatRoleCount(stats.openRoles)}</span>{" "}
      across{" "}
      <span className="text-[#181818]">
        {formatHiringCompanyCount(stats.companiesHiring)}
      </span>
      {stats.latestSyncAt ? (
        <>
          <span aria-hidden="true"> · </span>
          Updated {formatRelativeUpdate(stats.latestSyncAt)}
        </>
      ) : null}
    </p>
  );
}

function getLatestDate(values: string[]) {
  const latestTime = values.reduce((latest, value) => {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? latest : Math.max(latest, time);
  }, 0);

  return latestTime > 0 ? new Date(latestTime) : null;
}

function getStatsFromJobs(jobs: CompanyJobWithCompany[]): CompanyJobStats {
  const latestSyncAt = getLatestDate(jobs.map((job) => job.last_seen_at));

  return {
    openRoles: jobs.length,
    companiesHiring: new Set(jobs.map((job) => job.company_id)).size,
    latestSyncAt: latestSyncAt ? latestSyncAt.toISOString() : null,
  };
}

function formatRoleCount(count: number) {
  return count === 1 ? "1 role" : `${count} roles`;
}

function formatHiringCompanyCount(count: number) {
  return count === 1 ? "1 company" : `${count} companies`;
}
