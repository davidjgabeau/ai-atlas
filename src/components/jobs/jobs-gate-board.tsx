"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  LockKeyhole,
  MapPin,
} from "lucide-react";

import { CompanyLogo } from "@/components/market-map/company-logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocalProfile } from "@/hooks/use-local-profile";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import {
  getJobDepartmentLabel,
  getJobListedAt,
} from "@/lib/jobs/jobDisplay";
import { cn } from "@/lib/utils";
import type { Company, CompanyJobWithCompany } from "@/types/market";
import type { CompanyJobStats } from "@/lib/supabase/jobs";

export type GateState = {
  scrollAccumulated: number;
  guardedClicks: number;
  triggered: boolean;
  triggeredAt: string | null;
};

type JobsGateBoardProps = {
  jobs: CompanyJobWithCompany[];
  jobStats: CompanyJobStats;
  previewCompanies: Company[];
};

type PendingApplyIntent = {
  url: string;
  storedAt: string;
};

const gateStorageKey = "ai-atlas.jobs-gate-state.v1";
const pendingApplyStorageKey = "ai-atlas.jobs-pending-apply.v1";
const disableGateStorageKey = "aiatlas_disable_gate";
const scrollTriggerViewports = 3;

const initialGateState: GateState = {
  scrollAccumulated: 0,
  guardedClicks: 0,
  triggered: false,
  triggeredAt: null,
};

const sampleTitles = [
  "Founding Engineer",
  "Product Engineer",
  "GTM Lead",
  "Applied AI Engineer",
  "Product Designer",
  "Operations Lead",
];

export function JobsGateBoard({
  jobs,
  jobStats,
  previewCompanies,
}: JobsGateBoardProps) {
  const {
    authBusy,
    authError,
    authMessage,
    isSignedIn,
    signInWithGoogle,
  } = useLocalProfile({ handleAuthRedirect: true });
  const [gateState, setGateState] = useState<GateState>(() => readGateState());
  const gateStateRef = useRef(gateState);
  const [gateOpen, setGateOpen] = useState(false);
  const [debugBypassed, setDebugBypassed] = useState(false);
  const lastScrollYRef = useRef(0);
  const lastScrollIntentAtRef = useRef(0);
  const lastTouchYRef = useRef<number | null>(null);
  const shouldBypassGate = isSignedIn || debugBypassed;
  const shouldBlurListings = !shouldBypassGate;
  const displayJobs = useMemo(
    () => (jobs.length > 0 ? jobs : buildSampleJobs(previewCompanies)),
    [jobs, previewCompanies],
  );
  const hasJobStats = jobStats.openRoles > 0 && jobStats.companiesHiring > 0;
  const openRolesText = hasJobStats
    ? formatRoleCount(jobStats.openRoles)
    : `${displayJobs.length} preview roles`;
  const companiesText = hasJobStats
    ? formatHiringCompanyCount(jobStats.companiesHiring)
    : `${previewCompanies.length} companies checked`;
  const latestSyncText = jobStats.latestSyncAt
    ? `Updated ${formatRelativeUpdate(jobStats.latestSyncAt)}`
    : "Updated daily";

  useEffect(() => {
    gateStateRef.current = gateState;
  }, [gateState]);

  useEffect(() => {
    const debugBypassHydrationId = window.setTimeout(() => {
      setDebugBypassed(isDebugGateDisabled());
    }, 0);
    lastScrollYRef.current = window.scrollY;

    function handleStorage(event: StorageEvent) {
      if (event.key === disableGateStorageKey) {
        setDebugBypassed(isDebugGateDisabled());
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearTimeout(debugBypassHydrationId);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;

    clearJobsGateLocalStorage();
  }, [isSignedIn]);

  const commitGateState = useCallback((nextState: GateState) => {
    gateStateRef.current = nextState;
    setGateState(nextState);
    writeGateState(nextState);
  }, []);

  const openGate = useCallback(
    (reason: "scroll" | "click", applyUrl?: string) => {
      if (shouldBypassGate) {
        if (applyUrl) window.location.assign(applyUrl);
        return;
      }

      if (applyUrl) storePendingApply(applyUrl);

      const current = gateStateRef.current;
      const nextState: GateState = {
        ...current,
        guardedClicks:
          reason === "click" ? current.guardedClicks + 1 : current.guardedClicks,
        triggered: true,
        triggeredAt: current.triggeredAt ?? new Date().toISOString(),
      };

      commitGateState(nextState);
      setGateOpen(true);
    },
    [commitGateState, shouldBypassGate],
  );

  const recordScrollIntent = useCallback(
    (delta: number) => {
      if (delta <= 0) return;

      const current = gateStateRef.current;

      if (current.triggered) {
        setGateOpen(true);
        return;
      }

      const nextState: GateState = {
        ...current,
        scrollAccumulated: current.scrollAccumulated + delta,
      };

      commitGateState(nextState);

      if (
        nextState.scrollAccumulated >=
        window.innerHeight * scrollTriggerViewports
      ) {
        openGate("scroll");
      }
    },
    [commitGateState, openGate],
  );

  useEffect(() => {
    if (shouldBypassGate) return;

    function handleWheel(event: WheelEvent) {
      lastScrollIntentAtRef.current = Date.now();
      recordScrollIntent(Math.abs(event.deltaY));
    }

    function handleTouchStart(event: TouchEvent) {
      lastTouchYRef.current = event.touches[0]?.clientY ?? null;
    }

    function handleTouchMove(event: TouchEvent) {
      const nextTouchY = event.touches[0]?.clientY ?? null;
      const previousTouchY = lastTouchYRef.current;
      lastTouchYRef.current = nextTouchY;

      if (nextTouchY === null || previousTouchY === null) return;

      lastScrollIntentAtRef.current = Date.now();
      recordScrollIntent(Math.abs(previousTouchY - nextTouchY));
    }

    function handleScroll() {
      const currentY = window.scrollY;
      const delta = Math.abs(currentY - lastScrollYRef.current);
      lastScrollYRef.current = currentY;

      if (delta <= 0) return;
      if (Date.now() - lastScrollIntentAtRef.current < 150) return;

      recordScrollIntent(delta);
    }

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [recordScrollIntent, shouldBypassGate]);

  function handleApply(url: string) {
    if (shouldBypassGate) {
      window.location.assign(url);
      return;
    }

    openGate("click", url);
  }

  async function continueWithGoogle() {
    await signInWithGoogle({ next: "/jobs" });
  }

  return (
    <>
      <div className="relative min-h-[620px] overflow-hidden rounded-md border border-[#E7E1D8] bg-[#FBFAF7] sm:min-h-[680px]">
        <div
          className={cn(
            "transition duration-200",
            shouldBlurListings && "select-none opacity-45 blur-[2px]",
          )}
        >
          <div className="border-b border-[#E7E1D8] px-5 py-5">
            <p className="editorial-label">Member view</p>
            <h2 className="mt-3 editorial-section-title">Open roles</h2>
            <p className="mt-2 max-w-[600px] text-sm leading-[1.6] text-[#5F5A52]">
              Listings are pulled from company careers pages and refreshed daily.
            </p>
          </div>
          <div className="divide-y divide-[#E7E1D8] border-b border-[#E7E1D8]">
            {displayJobs.slice(0, 12).map((job, index) => (
              <LockedJobPreviewRow
                key={job.id}
                job={job}
                index={index}
                onApply={handleApply}
              />
            ))}
          </div>
        </div>

        {shouldBlurListings ? (
          <div className="pointer-events-none absolute inset-x-4 top-3 flex flex-col items-center gap-2 sm:top-6 sm:gap-3">
            <div className="w-full max-w-[720px] overflow-hidden rounded-md border border-[#E7E1D8] bg-[rgb(251_250_247_/_0.94)] shadow-sm">
              <dl className="grid grid-cols-3 divide-x divide-[#E7E1D8]">
                <LockedProofStat label="Open roles" value={openRolesText} />
                <LockedProofStat label="Companies hiring" value={companiesText} />
                <LockedProofStat label="Latest sync" value={latestSyncText} />
              </dl>
            </div>
            <div className="pointer-events-auto w-full max-w-[720px] rounded-md border border-[#E7E1D8] bg-[rgb(251_250_247_/_0.96)] p-3 shadow-sm sm:p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border border-[#E7E1D8] bg-[#F8F6F1] text-[#9A3D2B]">
                    <LockKeyhole className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-[24px] font-medium leading-[1.05] tracking-[-0.02em] text-[#181818]">
                      Sign in to unlock job links
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#5F5A52]">
                      Create a free AI Atlas profile to open Apply links and
                      keep this job board tied to your saved company view.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="h-11 w-full justify-between border border-[#111111] bg-[#111111] px-4 text-[#F8F6F1] hover:bg-[#2A2926] md:w-[240px]"
                  disabled={authBusy}
                  onClick={() => void continueWithGoogle()}
                >
                  <span>{authBusy ? "Opening Google..." : "Sign in with Google"}</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
              <StatusMessage error={authError} message={authMessage} />
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-0 text-[#111111] sm:max-w-lg">
          <DialogHeader className="border-b border-[#E7E1D8] px-5 py-4">
            <div className="flex items-start gap-3 pr-8">
              <span className="grid size-10 shrink-0 place-items-center rounded-md border border-[#E7E1D8] bg-[#F8F6F1] text-[#9A3D2B]">
                <LockKeyhole className="size-4" />
              </span>
              <div>
                <DialogTitle className="font-heading text-[1.55rem] leading-tight text-[#111111]">
                  Create a profile to view jobs
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6 text-[#66625C]">
                  Sign in to see open roles from companies in AI Atlas and keep
                  the job board tied to your saved company view.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-5">
            <Button
              type="button"
              className="h-12 w-full justify-between border border-[#111111] bg-[#111111] px-4 text-[#F8F6F1] hover:bg-[#2A2926]"
              disabled={authBusy}
              onClick={() => void continueWithGoogle()}
            >
              <span>
                {authBusy ? "Opening Google..." : "Sign in or sign up with Google"}
              </span>
              <ArrowRight className="size-4" />
            </Button>
            <StatusMessage error={authError} message={authMessage} />

            <DialogFooter className="-mx-5 -mb-5 mt-6 rounded-b-md border-t border-[#E7E1D8] bg-[#F8F6F1] px-5 py-4">
              <Button
                type="button"
                variant="ghost"
                className="w-full text-[#5F5A52]"
                disabled={authBusy}
                onClick={() => setGateOpen(false)}
              >
                Just browsing?
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function JobsGateAuthReturn({ isSignedIn }: { isSignedIn: boolean }) {
  useEffect(() => {
    if (!isSignedIn) return;

    const pendingApplyUrl = readPendingApplyUrl();
    clearJobsGateLocalStorage();

    if (!pendingApplyUrl) return;

    const timeoutId = window.setTimeout(() => {
      window.location.assign(pendingApplyUrl);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [isSignedIn]);

  return null;
}

function LockedJobPreviewRow({
  job,
  index,
  onApply,
}: {
  job: CompanyJobWithCompany;
  index: number;
  onApply: (url: string) => void;
}) {
  const company = job.company;
  const applyUrl = job.source_url || company?.website_url || "/";
  const department = getJobDepartmentLabel(job);
  const listedAt = getJobListedAt(job);

  return (
    <article
      className="companyRow grid gap-3 px-5 py-4 md:grid-cols-[44px_minmax(0,1fr)_120px] md:items-start"
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
        <h3 className="font-sans text-[18px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#181818]">
          {job.title}
        </h3>
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
      </div>
      <div className="flex md:justify-end">
        <Button
          type="button"
          className="h-9 gap-1.5 border border-[#111111] bg-[#111111] px-3 text-[#F8F6F1] hover:bg-[#2A2926]"
          onClick={() => onApply(applyUrl)}
        >
          Apply
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </article>
  );
}

function LockedProofStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-2 text-center sm:px-4 sm:py-3">
      <dt className="editorial-label text-[10px]">{label}</dt>
      <dd className="mt-1 font-heading text-[clamp(18px,5vw,24px)] font-medium leading-none tracking-[-0.025em] text-[#181818]">
        {value}
      </dd>
    </div>
  );
}

function StatusMessage({
  error,
  message,
}: {
  error: string;
  message: string;
}) {
  if (!error && !message) return null;

  return (
    <p
      className={
        error
          ? "mt-4 text-sm font-medium text-[#9A3D2B]"
          : "mt-4 text-sm font-medium text-emerald-700"
      }
    >
      {error || message}
    </p>
  );
}

function buildSampleJobs(companies: Company[]): CompanyJobWithCompany[] {
  const now = new Date().toISOString();

  return companies.slice(0, 8).map((company, index) => ({
    id: `preview-${company.id}`,
    company_id: company.id,
    title: sampleTitles[index % sampleTitles.length],
    department: company.category,
    location: "New York, NY",
    employment_type: "",
    remote_policy: "",
    source_url: company.website_url || `/companies/${company.slug}`,
    source_name: "Company careers",
    external_id: "",
    discovered_at: now,
    last_seen_at: company.updated_at || now,
    status: "open",
    raw: {},
    created_at: now,
    updated_at: now,
    company,
  }));
}

function readGateState(): GateState {
  if (typeof window === "undefined") return initialGateState;

  try {
    const rawState = window.localStorage.getItem(gateStorageKey);
    if (!rawState) return initialGateState;

    const parsed = JSON.parse(rawState) as Partial<GateState>;

    return {
      scrollAccumulated: Number(parsed.scrollAccumulated) || 0,
      guardedClicks: Number(parsed.guardedClicks) || 0,
      triggered: parsed.triggered === true,
      triggeredAt:
        typeof parsed.triggeredAt === "string" ? parsed.triggeredAt : null,
    };
  } catch {
    return initialGateState;
  }
}

function writeGateState(state: GateState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(gateStorageKey, JSON.stringify(state));
}

function isDebugGateDisabled() {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem(disableGateStorageKey) === "true";
}

function storePendingApply(url: string) {
  if (typeof window === "undefined") return;

  const intent: PendingApplyIntent = {
    url,
    storedAt: new Date().toISOString(),
  };

  window.sessionStorage.setItem(pendingApplyStorageKey, JSON.stringify(intent));
}

function readPendingApplyUrl() {
  if (typeof window === "undefined") return "";

  try {
    const rawIntent = window.sessionStorage.getItem(pendingApplyStorageKey);
    if (!rawIntent) return "";

    const intent = JSON.parse(rawIntent) as Partial<PendingApplyIntent>;
    if (typeof intent.url !== "string" || intent.url.length === 0) return "";

    const url = new URL(intent.url, window.location.origin);

    if (!["http:", "https:"].includes(url.protocol)) return "";

    return url.toString();
  } catch {
    return "";
  }
}

function clearJobsGateLocalStorage() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(gateStorageKey);
  window.sessionStorage.removeItem(pendingApplyStorageKey);
}

function formatRoleCount(count: number) {
  return count === 1 ? "1 role" : `${count} roles`;
}

function formatHiringCompanyCount(count: number) {
  return count === 1 ? "1 company" : `${count} companies`;
}
