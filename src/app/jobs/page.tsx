import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  ExternalLink,
  MapPin,
} from "lucide-react";

import {
  JobsGateAuthReturn,
  JobsGateBoard,
} from "@/components/jobs/jobs-gate-board";
import { CompanyLogo } from "@/components/market-map/company-logo";
import { PublicShell } from "@/components/site/public-shell";
import { Button } from "@/components/ui/button";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import {
  createShareMetadata,
  getShareImageUrl,
  shareCta,
} from "@/lib/seo/shareMetadata";
import {
  type CompanyJobStats,
  getCompanyJobsForViewer,
  getPublicCompanyJobs,
  getPublicCompanyJobStats,
} from "@/lib/supabase/jobs";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import type { CompanyJobWithCompany } from "@/types/market";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createShareMetadata({
  title: "Jobs | AI Atlas NYC",
  description: `Open roles at early-stage NYC AI companies in the AI Atlas map. ${shareCta}.`,
  path: "/jobs",
  image: getShareImageUrl({ page: "jobs" }),
});

export default async function JobsPage() {
  const requestHeaders = await headers();
  const crawlerBypassed = isJobsGateCrawler(
    requestHeaders.get("user-agent") ?? "",
  );
  const [{ isSignedIn, jobs, error }, companies, publicJobStats, publicJobs] =
    await Promise.all([
      getCompanyJobsForViewer(),
      getPublishedCompanies(),
      getPublicCompanyJobStats(),
      getPublicCompanyJobs(),
    ]);

  const previewCompanies = companies.slice(0, 6);
  const unlockedJobs = isSignedIn ? jobs : crawlerBypassed ? publicJobs : [];
  const jobStats = isSignedIn ? getStatsFromJobs(jobs) : publicJobStats;
  const shouldShowUnlockedBoard = isSignedIn || crawlerBypassed;

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
            <h1 className="font-heading text-[clamp(36px,10.5vw,46px)] font-medium leading-[0.97] tracking-[-0.035em] text-[#181818] sm:text-[clamp(40px,5vw,64px)]">
              Roles at Early-Stage NYC AI Companies
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
          {shouldShowUnlockedBoard ? (
            <>
              <JobsGateAuthReturn isSignedIn={isSignedIn} />
              <UnlockedJobBoard jobs={unlockedJobs} error={error} />
            </>
          ) : (
            <JobsGateBoard
              jobs={publicJobs}
              previewCompanies={previewCompanies}
              jobStats={jobStats}
            />
          )}
        </div>
      </section>
    </PublicShell>
  );
}

function isJobsGateCrawler(userAgent: string) {
  return /Googlebot|Bingbot|Twitterbot|facebookexternalhit|LinkedInBot|Slackbot|Discordbot/i.test(
    userAgent,
  );
}

function UnlockedJobBoard({
  jobs,
  error,
}: {
  jobs: CompanyJobWithCompany[];
  error?: string;
}) {
  const companiesHiring = new Set(jobs.map((job) => job.company_id)).size;
  const lastSeenAt = getLatestDate(jobs.map((job) => job.last_seen_at));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <div className="flex flex-col gap-3 border-b border-[#E7E1D8] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="editorial-label">Open roles</p>
            <h2 className="mt-3 editorial-section-title">
              {jobs.length > 0 ? `${jobs.length} open roles` : "Job board ready"}
            </h2>
            <p className="mt-2 text-sm leading-[1.6] text-[#5F5A52]">
              Listings are pulled from company careers pages and refreshed daily.
            </p>
          </div>
          {lastSeenAt ? (
            <p className="text-sm font-medium text-[#66625C]">
              Updated {formatRelativeUpdate(lastSeenAt)}
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="mt-6 rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-5 text-sm leading-6 text-[#5F5A52]">
            The jobs feed is available, but this request could not load the
            latest rows. Try again in a moment.
          </div>
        ) : null}

        {jobs.length > 0 ? (
          <div className="mt-6 divide-y divide-[#E7E1D8] border-y border-[#E7E1D8]">
            {jobs.map((job, index) => (
              <JobRow key={job.id} job={job} index={index} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-6">
            <p className="font-heading text-[30px] font-medium tracking-[-0.025em] text-[#181818]">
              No open roles found yet.
            </p>
            <p className="mt-3 max-w-[620px] text-sm leading-[1.7] text-[#5F5A52]">
              The daily job sync is active. Roles will appear here as company
              careers pages publish machine-readable listings or clear job links.
            </p>
            <Button asChild className="mt-5 app-primary-button">
              <Link href="/companies">
                Browse companies
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      <aside className="h-fit border-y border-[#E7E1D8] py-5">
        <p className="editorial-label">Hiring snapshot</p>
        <dl className="mt-4 grid gap-4 text-sm">
          <SnapshotRow label="Open roles" value={String(jobs.length)} />
          <SnapshotRow label="Companies hiring" value={String(companiesHiring)} />
          <SnapshotRow
            label="Latest sync"
            value={lastSeenAt ? formatRelativeUpdate(lastSeenAt) : "Pending"}
          />
        </dl>
      </aside>
    </div>
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

function JobRow({ job, index }: { job: CompanyJobWithCompany; index: number }) {
  const company = job.company;

  return (
    <a
      href={job.source_url}
      target="_blank"
      rel="noreferrer"
      className="companyRow group grid gap-3 py-4 transition hover:bg-[rgb(17_17_17_/_0.025)] md:grid-cols-[44px_minmax(0,1fr)_190px] md:items-start"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {company ? (
        <CompanyLogo
          company={company}
          name={company.name}
          category={company.category}
          className="rowSprite size-10 text-xs"
        />
      ) : (
        <span className="rowSprite grid size-10 place-items-center rounded-md border border-[#E7E1D8] bg-[#F8F6F1] text-[#9A3D2B]">
          <BriefcaseBusiness className="size-4" />
        </span>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-sans text-[18px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#181818]">
            {job.title}
          </h3>
          <ExternalLink className="size-3.5 text-[#9A3D2B] opacity-0 transition group-hover:opacity-100" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#66625C]">
          {company ? <span className="font-medium">{company.name}</span> : null}
          {job.department ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{job.department}</span>
            </>
          ) : null}
          {job.location ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {job.location}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#66625C] md:justify-end md:text-right">
        <span>{job.source_name}</span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="size-3.5" />
          {formatRelativeUpdate(job.last_seen_at)}
        </span>
      </div>
    </a>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#E7E1D8] pb-3 last:border-b-0">
      <dt className="text-[#7A746C]">{label}</dt>
      <dd className="font-semibold text-[#181818]">{value}</dd>
    </div>
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
