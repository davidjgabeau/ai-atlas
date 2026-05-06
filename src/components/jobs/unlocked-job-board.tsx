"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  ExternalLink,
  MapPin,
} from "lucide-react";

import { CompanyLogo } from "@/components/market-map/company-logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import {
  getJobDepartmentLabel,
  getJobListedAt,
} from "@/lib/jobs/jobDisplay";
import {
  getCompanyJobSummary,
  getJobRoleSummary,
} from "@/lib/jobs/jobSummary";
import type { CompanyJobWithCompany } from "@/types/market";

type UnlockedJobBoardProps = {
  jobs: CompanyJobWithCompany[];
  error?: string;
};

const allValue = "all";
const recencyOptions = [
  { value: allValue, label: "Any time" },
  { value: "day", label: "Last 24h" },
  { value: "week", label: "Last 7d" },
  { value: "month", label: "Last 30d" },
] as const;

const sortOptions = [
  { value: "newest", label: "Newest listed" },
  { value: "company", label: "Company" },
  { value: "role", label: "Role" },
] as const;

export function UnlockedJobBoard({ jobs, error }: UnlockedJobBoardProps) {
  const [companyFilter, setCompanyFilter] = useState(allValue);
  const [departmentFilter, setDepartmentFilter] = useState(allValue);
  const [recencyFilter, setRecencyFilter] = useState(allValue);
  const [sortMode, setSortMode] = useState("newest");
  const companiesHiring = new Set(jobs.map((job) => job.company_id)).size;
  const lastSeenAt = getLatestDate(jobs.map((job) => job.last_seen_at));
  const companyOptions = useMemo(() => getCompanyOptions(jobs), [jobs]);
  const departmentOptions = useMemo(() => getDepartmentOptions(jobs), [jobs]);
  const filteredJobs = useMemo(
    () =>
      jobs
        .filter((job) =>
          companyFilter === allValue ? true : job.company_id === companyFilter,
        )
        .filter((job) => {
          const department = getJobDepartmentLabel(job);
          return departmentFilter === allValue
            ? true
            : department === departmentFilter;
        })
        .filter((job) => isWithinRecency(job, recencyFilter))
        .sort((left, right) => compareJobs(left, right, sortMode)),
    [companyFilter, departmentFilter, jobs, recencyFilter, sortMode],
  );
  const filtersActive =
    companyFilter !== allValue ||
    departmentFilter !== allValue ||
    recencyFilter !== allValue ||
    sortMode !== "newest";

  function resetFilters() {
    setCompanyFilter(allValue);
    setDepartmentFilter(allValue);
    setRecencyFilter(allValue);
    setSortMode("newest");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <div className="border-b border-[#E7E1D8] pb-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="editorial-label">Open roles</p>
              <h2 className="mt-3 editorial-section-title">
                {jobs.length > 0 ? `${jobs.length} open roles` : "Job board ready"}
              </h2>
              <p className="mt-2 text-sm leading-[1.6] text-[#5F5A52]">
                Listings are refreshed daily from company careers pages.
              </p>
            </div>
            {lastSeenAt ? (
              <p className="text-sm font-medium text-[#66625C]">
                Updated {formatRelativeUpdate(lastSeenAt)}
              </p>
            ) : null}
          </div>

          {jobs.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <JobFilterSelect
                label="Company"
                value={companyFilter}
                onValueChange={setCompanyFilter}
                options={[{ value: allValue, label: "All companies" }, ...companyOptions]}
              />
              <JobFilterSelect
                label="Org"
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
                options={[{ value: allValue, label: "All orgs" }, ...departmentOptions]}
              />
              <JobFilterSelect
                label="Listed"
                value={recencyFilter}
                onValueChange={setRecencyFilter}
                options={recencyOptions}
              />
              <JobFilterSelect
                label="Sort"
                value={sortMode}
                onValueChange={setSortMode}
                options={sortOptions}
              />
            </div>
          ) : null}

          {jobs.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#66625C]">
              <span>
                Showing{" "}
                <span className="font-semibold text-[#181818]">
                  {filteredJobs.length}
                </span>{" "}
                of {jobs.length}
              </span>
              {filtersActive ? (
                <button
                  type="button"
                  className="font-semibold text-[#9A3D2B] hover:underline"
                  onClick={resetFilters}
                >
                  Reset filters
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mt-6 rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-5 text-sm leading-6 text-[#5F5A52]">
            The jobs feed is available, but this request could not load the
            latest rows. Try again in a moment.
          </div>
        ) : null}

        {jobs.length > 0 ? (
          filteredJobs.length > 0 ? (
            <div className="mt-6 divide-y divide-[#E7E1D8] border-y border-[#E7E1D8]">
              {filteredJobs.map((job, index) => (
                <JobRow key={job.id} job={job} index={index} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-6">
              <p className="font-heading text-[30px] font-medium tracking-[0] text-[#181818]">
                No roles match those filters.
              </p>
              <p className="mt-3 max-w-[620px] text-sm leading-[1.7] text-[#5F5A52]">
                Try a broader company, org, or listed-date filter.
              </p>
              <Button
                type="button"
                className="mt-5 app-primary-button"
                onClick={resetFilters}
              >
                Reset filters
              </Button>
            </div>
          )
        ) : (
          <div className="mt-6 rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-6">
            <p className="font-heading text-[30px] font-medium tracking-[0] text-[#181818]">
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

function JobFilterSelect({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#7A746C]">
      {label}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 w-full rounded-md border-[#E7E1D8] bg-[#FBFAF7] px-3 text-sm normal-case tracking-normal text-[#181818]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-md border border-[#E7E1D8] bg-[#FBFAF7] text-[#181818]">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function JobRow({ job, index }: { job: CompanyJobWithCompany; index: number }) {
  const company = job.company;
  const department = getJobDepartmentLabel(job);
  const listedAt = getJobListedAt(job);
  const companySummary = getCompanyJobSummary(company);
  const roleSummary = getJobRoleSummary(job);

  return (
    <a
      href={job.source_url}
      target="_blank"
      rel="noreferrer"
      className="companyRow group grid gap-3 py-4 transition hover:bg-[rgb(17_17_17_/_0.025)] md:grid-cols-[44px_minmax(0,1fr)_120px] md:items-start"
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
          <h3 className="font-sans text-[18px] font-semibold leading-[1.2] tracking-[0] text-[#181818]">
            {job.title}
          </h3>
          <ExternalLink className="size-3.5 text-[#9A3D2B] opacity-0 transition group-hover:opacity-100" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#66625C]">
          {company ? <span className="font-medium">{company.name}</span> : null}
          <span aria-hidden="true">·</span>
          <span>{department}</span>
          {job.location ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {job.location}
              </span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" />
            Listed {formatRelativeUpdate(listedAt)}
          </span>
        </div>
        {companySummary || roleSummary ? (
          <div className="mt-3 grid max-w-[760px] gap-1.5 text-sm leading-[1.55] text-[#5F5A52]">
            {companySummary ? (
              <p>
                <span className="font-semibold text-[#181818]">Company:</span>{" "}
                {companySummary}
              </p>
            ) : null}
            {roleSummary ? (
              <p>
                <span className="font-semibold text-[#181818]">Role:</span>{" "}
                {roleSummary}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <span className="hidden justify-self-end text-sm font-semibold text-[#9A3D2B] md:inline-flex md:items-center md:gap-1">
        Apply
        <ArrowRight className="size-3.5" />
      </span>
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

function getCompanyOptions(jobs: CompanyJobWithCompany[]) {
  return Array.from(
    new Map(
      jobs
        .filter((job) => job.company)
        .map((job) => [
          job.company_id,
          { value: job.company_id, label: job.company?.name ?? "Company" },
        ]),
    ).values(),
  ).sort((left, right) => left.label.localeCompare(right.label));
}

function getDepartmentOptions(jobs: CompanyJobWithCompany[]) {
  return Array.from(new Set(jobs.map(getJobDepartmentLabel)))
    .sort((left, right) => left.localeCompare(right))
    .map((department) => ({ value: department, label: department }));
}

function isWithinRecency(job: CompanyJobWithCompany, recency: string) {
  if (recency === allValue) return true;

  const listedAt = new Date(getJobListedAt(job)).getTime();
  if (Number.isNaN(listedAt)) return true;

  const ageMs = Date.now() - listedAt;
  if (recency === "day") return ageMs <= 24 * 60 * 60 * 1000;
  if (recency === "week") return ageMs <= 7 * 24 * 60 * 60 * 1000;
  if (recency === "month") return ageMs <= 30 * 24 * 60 * 60 * 1000;

  return true;
}

function compareJobs(
  left: CompanyJobWithCompany,
  right: CompanyJobWithCompany,
  sortMode: string,
) {
  if (sortMode === "company") {
    return (
      (left.company?.name ?? "").localeCompare(right.company?.name ?? "") ||
      left.title.localeCompare(right.title)
    );
  }

  if (sortMode === "role") {
    return (
      left.title.localeCompare(right.title) ||
      (left.company?.name ?? "").localeCompare(right.company?.name ?? "")
    );
  }

  return (
    new Date(getJobListedAt(right)).getTime() -
    new Date(getJobListedAt(left)).getTime()
  );
}

function getLatestDate(values: string[]) {
  const latestTime = values.reduce((latest, value) => {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? latest : Math.max(latest, time);
  }, 0);

  return latestTime > 0 ? new Date(latestTime) : null;
}
