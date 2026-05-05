"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Archive,
  Check,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { CategoryBadge } from "@/components/market-map/category-badge";
import { CompanyLogo } from "@/components/market-map/company-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { formatFundingHeadline } from "@/lib/funding";
import {
  formatConsumptionIntensity,
  getConsumptionProfileLabel,
} from "@/lib/model-usage/consumptionProfile";
import {
  categories,
  companyStatuses,
  consumptionIntensities,
  consumptionProfiles,
  type Category,
  type Company,
  type CompanyStatus,
  type ConsumptionIntensity,
  type ConsumptionProfile,
  type Submission,
  type SubmissionStatus,
} from "@/types/market";
import type {
  AtlasSocialEngagement,
  AtlasSocialPost,
  AtlasSocialRun,
} from "@/types/social";

type SocialHealthResponse = {
  ok: boolean;
  health: {
    ok: boolean;
    canRead: boolean;
    canWrite: boolean;
    reason: string;
    user?: {
      username?: string;
    };
  };
  config: {
    autoPost: boolean;
    engagementEnabled: boolean;
    killSwitch: boolean;
    dailyPostLimit: number;
    minMinutesBetweenPosts: number;
    maxPostsPerHour: number;
    timezone: string;
    anthropicConfigured: boolean;
    xReadConfigured: boolean;
    xWriteConfigured: boolean;
    xRefreshConfigured: boolean;
    xAccountUsername: string;
  };
};

export function AdminConsole({
  adminEmail,
  initialCompanies,
  initialSubmissions,
  initialSocialPosts,
  initialSocialRuns,
  initialSocialEngagements,
}: {
  adminEmail: string;
  initialCompanies: Company[];
  initialSubmissions: Submission[];
  initialSocialPosts: AtlasSocialPost[];
  initialSocialRuns: AtlasSocialRun[];
  initialSocialEngagements: AtlasSocialEngagement[];
}) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [socialHealth, setSocialHealth] = useState<SocialHealthResponse | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("companies");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editorCompany, setEditorCompany] = useState<Company | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] =
    useState<Company | null>(null);
  const [busyAction, setBusyAction] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesSearch =
        query.length === 0 ||
        [
          company.name,
          company.slug,
          company.x_handle,
          company.office_address,
          company.funding_round,
          company.funding_amount,
          company.total_raised,
          company.lead_investor,
          company.short_description,
          company.category,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return (
        matchesSearch &&
        (statusFilter === "all" || company.status === statusFilter) &&
        (categoryFilter === "all" || company.category === categoryFilter)
      );
    });
  }, [categoryFilter, companies, search, statusFilter]);

  function openNewCompany() {
    const now = new Date().toISOString();
    setEditorCompany({
      id: `cmp_${Date.now()}`,
      name: "Untitled Startup",
      slug: "untitled-startup",
      logo_url: "/logos/untitled-startup.svg",
      website_url: "",
      x_handle: "",
      x_user_id: "",
      office_address: "",
      funding_round: "",
      funding_amount: "",
      funding_date: "",
      total_raised: "",
      lead_investor: "",
      funding_note: "",
      category: "Fintech & Trading AI",
      stage: "Pre-Seed",
      short_description: "",
      one_line_thesis: "",
      why_it_matters: "",
      ai_usage_profile: "",
      openai_fit: "",
      founders: [],
      consumption_profile: [],
      consumption_intensity: "low",
      consumption_note: "",
      recent_activity_text: "",
      recent_activity_date: now.slice(0, 10),
      is_featured: false,
      is_breakout: false,
      status: "draft",
      created_at: now,
      updated_at: now,
      generated: {
        hook: "Generated when saved",
        signalLabel: "Recently added",
        signalReason: "AI Atlas will generate this from the saved company details.",
        keywords: [],
        trendDimensions: [],
        generatedAt: "",
        sourceHash: "",
      },
    });
  }

  async function saveCompany(company: Company) {
    setBusyAction(`save-${company.id}`);
    setError("");
    setNotice("");

    const result = await sendAdminRequest<{ company: Company }>(
      "/api/admin/companies",
      {
        method: "POST",
        body: JSON.stringify(company),
      },
    );

    if (!result.ok) {
      setError(result.error);
      setBusyAction("");
      return;
    }

    const savedCompany = result.data.company;

    setCompanies((current) => {
      const exists = current.some((item) => item.id === company.id);

      if (exists) {
        return current.map((item) =>
          item.id === company.id ? savedCompany : item,
        );
      }

      return [savedCompany, ...current];
    });
    setEditorCompany(null);
    setNotice(`${savedCompany.name} saved.`);

    setBusyAction("");
  }

  async function patchCompany(
    companyId: string,
    updates: Partial<Company>,
    successMessage: string,
  ) {
    setBusyAction(`${Object.keys(updates).join("-")}-${companyId}`);
    setError("");
    setNotice("");

    const result = await sendAdminRequest<{ company: Company }>(
      `/api/admin/companies/${companyId}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      },
    );

    if (!result.ok) {
      setError(result.error);
      setBusyAction("");
      return;
    }

    const savedCompany = result.data.company;

    setCompanies((current) =>
      current.map((company) =>
        company.id === companyId ? savedCompany : company,
      ),
    );
    setNotice(successMessage);

    setBusyAction("");
  }

  async function archiveCompany(company: Company) {
    await patchCompany(
      company.id,
      { status: "archived" },
      `${company.name} archived.`,
    );
  }

  async function toggleFeatured(company: Company) {
    const nextFeatured = !company.is_featured;

    await patchCompany(
      company.id,
      { is_featured: nextFeatured },
      nextFeatured
        ? `${company.name} added to Featured Companies.`
        : `${company.name} removed from Featured Companies.`,
    );
  }

  async function deleteCompany(company: Company) {
    setBusyAction(`delete-${company.id}`);
    setError("");
    setNotice("");

    const result = await sendAdminRequest(`/api/admin/companies/${company.id}`, {
      method: "DELETE",
    });

    if (!result.ok) {
      setError(result.error);
      setBusyAction("");
      return;
    }

    setCompanies((current) =>
      current.filter((item) => item.id !== company.id),
    );
    setPermanentDeleteTarget(null);
    setNotice(`${company.name} deleted.`);

    setBusyAction("");
  }

  async function updateSubmissionStatus(
    submissionId: string,
    status: SubmissionStatus,
  ) {
    setBusyAction(`submission-${submissionId}-${status}`);
    setError("");
    setNotice("");

    const result = await sendAdminRequest<{ submission: Submission }>(
      `/api/admin/submissions/${submissionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );

    if (!result.ok) {
      setError(result.error);
      setBusyAction("");
      return;
    }

    const savedSubmission = result.data.submission;

    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === submissionId ? savedSubmission : submission,
      ),
    );
    setNotice(`Submission marked ${status}.`);

    setBusyAction("");
  }

  async function checkSocialHealth() {
    setBusyAction("social-health");
    setError("");
    setNotice("");

    const result = await sendAdminRequest<SocialHealthResponse>(
      "/api/social/x/health",
      {
        method: "GET",
      },
    );

    if (!result.ok) {
      setError(result.error);
      setBusyAction("");
      return;
    }

    setSocialHealth(result.data);
    setNotice(result.data.health.reason);
    setBusyAction("");
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <TabsList className="rounded-md">
            <TabsTrigger value="companies">Startups</TabsTrigger>
            <TabsTrigger value="submissions">Founder submissions</TabsTrigger>
            <TabsTrigger value="social">X queue</TabsTrigger>
          </TabsList>
          {activeTab === "companies" ? (
            <Button className="app-primary-button" onClick={openNewCompany}>
              <Plus className="size-4" />
              Add startup
            </Button>
          ) : null}
        </div>
        <div className="rounded-md border border-[#E7E1D8] bg-[#FBFAF7] px-4 py-3 text-sm text-[#5F5A52]">
          Signed in as{" "}
          <span className="font-semibold text-[#181818]">{adminEmail}</span>.
          Star a company to put it in the Featured Companies editorial section.
          <StatusMessage error={error} message={notice} />
        </div>

        <TabsContent value="companies" className="space-y-4">
          <div className="rounded-md bg-[var(--app-surface)] p-4 shadow-sm app-card-border">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <label className="relative block">
                <span className="sr-only">Search NYC startups</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9B948A]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search startups, categories, offices..."
                  className="h-10 rounded-md border-[#E7E1D8] bg-[var(--app-surface)] pl-9"
                />
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 rounded-md border-[#E7E1D8] bg-[var(--app-surface)]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {companyStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 rounded-md border-[#E7E1D8] bg-[var(--app-surface)]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-md bg-[var(--app-surface)] shadow-sm app-card-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-[rgb(154_61_43_/_0.06)]">
                  <TableHead>Startup</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Funding</TableHead>
                  <TableHead>Momentum</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex min-w-64 items-center gap-3">
                        <CompanyLogo
                          company={company}
                          name={company.name}
                          category={company.category}
                          className="size-9 text-xs"
                        />
                        <div>
                          <p className="font-semibold text-[#181818]">
                            {company.name}
                          </p>
                          <p className="text-xs text-[#7A746C]">
                            /companies/{company.slug}
                          </p>
                          {company.x_handle ? (
                            <p className="mt-0.5 text-xs text-[#7A746C]">
                              @{company.x_handle}
                            </p>
                          ) : null}
                          {company.office_address ? (
                            <p className="mt-0.5 max-w-72 truncate text-xs text-[#7A746C]">
                              {company.office_address}
                            </p>
                          ) : null}
                          {company.inclusionReason?.body ? (
                            <p className="mt-1 max-w-80 line-clamp-2 text-xs leading-5 text-[#5F5A52]">
                              Public: {company.inclusionReason.body}
                            </p>
                          ) : null}
                          {company.discoveryReason?.notes ? (
                            <p className="mt-1 max-w-80 line-clamp-2 text-xs leading-5 text-[#9B948A]">
                              Internal: {company.discoveryReason.notes}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={company.category} />
                    </TableCell>
                    <TableCell className="text-[#5F5A52]">
                      {company.stage}
                    </TableCell>
                    <TableCell className="max-w-64 text-sm text-[#5F5A52]">
                      <span className="line-clamp-2">
                        {formatFundingHeadline(company)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[#5F5A52]">
                        {company.consumption_profile[0]
                          ? getConsumptionProfileLabel(company.consumption_profile[0])
                          : "Not evaluated"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {company.is_featured ? (
                        <Badge
                          variant="outline"
                          className="rounded-md border-0 bg-[rgb(154_61_43_/_0.08)] px-2 py-1 text-xs font-medium text-[#9A3D2B] ring-1 ring-[#E7E1D8]"
                        >
                          Editorial
                        </Badge>
                      ) : (
                        <span className="text-sm text-[#9B948A]">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={company.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`${company.is_featured ? "Remove" : "Add"} ${company.name} from featured editorial section`}
                          disabled={Boolean(busyAction)}
                          onClick={() => void toggleFeatured(company)}
                        >
                          <Star
                            className={`size-3.5 ${company.is_featured ? "fill-[#9A3D2B] text-[#9A3D2B]" : ""}`}
                          />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Edit ${company.name}`}
                          disabled={Boolean(busyAction)}
                          onClick={() => setEditorCompany({ ...company })}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Archive ${company.name}`}
                          disabled={Boolean(busyAction)}
                          onClick={() => void archiveCompany(company)}
                        >
                          <Archive className="size-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          aria-label={`Delete ${company.name}`}
                          disabled={Boolean(busyAction)}
                          onClick={() => setPermanentDeleteTarget(company)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          <div className="overflow-hidden rounded-md bg-[var(--app-surface)] shadow-sm app-card-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-[rgb(154_61_43_/_0.06)]">
                  <TableHead>Company</TableHead>
                  <TableHead>Founder</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div className="min-w-48">
                        <p className="font-semibold text-[#181818]">
                          {submission.company_name}
                        </p>
                        <a
                          href={submission.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#7A746C] hover:text-[#9A3D2B]"
                        >
                          {submission.website_url}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-44">
                        <p className="text-[#5F5A52]">
                          {submission.founder_name}
                        </p>
                        <p className="text-xs text-[#7A746C]">
                          {submission.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-sm whitespace-normal leading-6 text-[#5F5A52]">
                      {submission.description}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={submission.status} />
                    </TableCell>
                    <TableCell className="text-[#5F5A52]">
                      {formatDate(submission.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={Boolean(busyAction)}
                          onClick={() =>
                            void updateSubmissionStatus(
                              submission.id,
                              "accepted",
                            )
                          }
                        >
                          <Check className="size-3.5" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={Boolean(busyAction)}
                          onClick={() =>
                            void updateSubmissionStatus(
                              submission.id,
                              "rejected",
                            )
                          }
                        >
                          <X className="size-3.5" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <SocialQueuePanel
            posts={initialSocialPosts}
            runs={initialSocialRuns}
            engagements={initialSocialEngagements}
            health={socialHealth}
            busy={busyAction === "social-health"}
            onCheckHealth={checkSocialHealth}
          />
        </TabsContent>
      </Tabs>

      <CompanyEditor
        company={editorCompany}
        onChange={setEditorCompany}
        onClose={() => setEditorCompany(null)}
        onSave={saveCompany}
      />

      <Dialog
        open={permanentDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPermanentDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="rounded-md">
          <DialogHeader>
            <DialogTitle>Permanent delete</DialogTitle>
            <DialogDescription>
              This permanently removes {permanentDeleteTarget?.name} from AI
              Atlas and any saved company lists that reference it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPermanentDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={Boolean(busyAction)}
              onClick={() => {
                if (permanentDeleteTarget) {
                  void deleteCompany(permanentDeleteTarget);
                }
              }}
            >
              Delete company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SocialQueuePanel({
  posts,
  runs,
  engagements,
  health,
  busy,
  onCheckHealth,
}: {
  posts: AtlasSocialPost[];
  runs: AtlasSocialRun[];
  engagements: AtlasSocialEngagement[];
  health: SocialHealthResponse | null;
  busy: boolean;
  onCheckHealth: () => void;
}) {
  const [queuePosts, setQueuePosts] = useState(posts);
  const [queueRuns, setQueueRuns] = useState(runs);
  const [queueEngagements, setQueueEngagements] = useState(engagements);
  const [socialBusyAction, setSocialBusyAction] = useState("");
  const [socialNotice, setSocialNotice] = useState("");
  const [socialError, setSocialError] = useState("");

  async function refreshQueue() {
    setSocialBusyAction("refresh-queue");
    setSocialError("");
    setSocialNotice("");

    const result = await sendAdminRequest<{
      posts: AtlasSocialPost[];
      engagements: AtlasSocialEngagement[];
      runs: AtlasSocialRun[];
    }>("/api/social/queue", { method: "GET" });

    if (!result.ok) {
      setSocialError(result.error);
      setSocialBusyAction("");
      return;
    }

    setQueuePosts(result.data.posts);
    setQueueRuns(result.data.runs);
    setQueueEngagements(result.data.engagements);
    setSocialNotice("Queue refreshed.");
    setSocialBusyAction("");
  }

  async function draftPosts() {
    setSocialBusyAction("draft-posts");
    setSocialError("");
    setSocialNotice("");

    const result = await sendAdminRequest<{
      ok: boolean;
      draftsCreated: number;
      skipped: number;
      errors: string[];
    }>("/api/social/posts/draft", { method: "POST" });

    if (!result.ok) {
      setSocialError(result.error);
      setSocialBusyAction("");
      return;
    }

    setSocialNotice(
      `${result.data.draftsCreated} draft(s), ${result.data.skipped} skipped.`,
    );
    await refreshQueue();
  }

  async function verifyHandles() {
    setSocialBusyAction("verify-handles");
    setSocialError("");
    setSocialNotice("");

    const result = await sendAdminRequest<{
      verified: number;
      failed: number;
      errors: string[];
    }>("/api/social/handles/verify", {
      method: "POST",
      body: JSON.stringify({ limit: 10 }),
    });

    if (!result.ok) {
      setSocialError(result.error);
      setSocialBusyAction("");
      return;
    }

    setSocialNotice(
      `${result.data.verified} handle(s) verified, ${result.data.failed} failed.`,
    );
    setSocialBusyAction("");
  }

  async function skipPost(post: AtlasSocialPost) {
    setSocialBusyAction(`skip-${post.id}`);
    setSocialError("");
    setSocialNotice("");

    const result = await sendAdminRequest<{ post: AtlasSocialPost }>(
      `/api/social/posts/${post.id}/skip`,
      {
        method: "POST",
        body: JSON.stringify({ reason: "Skipped from admin queue." }),
      },
    );

    if (!result.ok) {
      setSocialError(result.error);
      setSocialBusyAction("");
      return;
    }

    setQueuePosts((current) =>
      current.map((item) => (item.id === post.id ? result.data.post : item)),
    );
    setSocialNotice("Post skipped.");
    setSocialBusyAction("");
  }

  async function publishNow(post: AtlasSocialPost) {
    setSocialBusyAction(`publish-${post.id}`);
    setSocialError("");
    setSocialNotice("");

    const result = await sendAdminRequest<{
      ok: boolean;
      status: string;
      skippedReason?: string;
      errors: string[];
    }>(`/api/social/posts/${post.id}/publish-now`, {
      method: "POST",
    });

    if (!result.ok) {
      setSocialError(result.error);
      setSocialBusyAction("");
      return;
    }

    setSocialNotice(
      result.data.skippedReason ||
        (result.data.status === "success"
          ? "Post published."
          : "Publish action finished."),
    );
    await refreshQueue();
  }

  async function runEngagement() {
    setSocialBusyAction("run-engagement");
    setSocialError("");
    setSocialNotice("");

    const result = await sendAdminRequest<{
      actionsCompleted: number;
      skippedReason?: string;
    }>("/api/social/engagements/run", { method: "POST" });

    if (!result.ok) {
      setSocialError(result.error);
      setSocialBusyAction("");
      return;
    }

    setSocialNotice(
      result.data.skippedReason ||
        `${result.data.actionsCompleted} engagement action(s) completed.`,
    );
    await refreshQueue();
  }

  async function requestPause(path: "/api/social/pause" | "/api/social/resume") {
    setSocialBusyAction(path);
    setSocialError("");
    setSocialNotice("");

    const result = await sendAdminRequest<{ message: string }>(path, {
      method: "POST",
    });

    if (!result.ok) {
      setSocialError(result.error);
      setSocialBusyAction("");
      return;
    }

    setSocialNotice(result.data.message);
    setSocialBusyAction("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-[var(--app-surface)] p-4 shadow-sm app-card-border">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#181818]">
              <Activity className="size-4 text-[#9A3D2B]" />
              AI Atlas NYC X automation
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5F5A52]">
              Draft queue, dispatch history, credential health, and safe launch
              switches for the @AiAtlasNYC account.
            </p>
            {health ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={health.config.autoPost ? "auto-post on" : "drafts only"} />
                <StatusBadge
                  status={
                    health.config.engagementEnabled
                      ? "engagement on"
                      : "engagement off"
                  }
                />
                <StatusBadge
                  status={
                    health.config.killSwitch
                      ? "kill switch on"
                      : "kill switch off"
                  }
                />
                <StatusBadge
                  status={health.health.canWrite ? "X write ok" : "X write off"}
                />
              </div>
            ) : null}
            {health ? (
              <p className="mt-3 text-sm text-[#5F5A52]">
                {health.health.reason}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy || Boolean(socialBusyAction)}
              onClick={() => onCheckHealth()}
            >
              <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
              Check X auth
            </Button>
            <Button
              variant="outline"
              disabled={Boolean(socialBusyAction)}
              onClick={() => void draftPosts()}
            >
              Draft posts
            </Button>
            <Button
              variant="outline"
              disabled={Boolean(socialBusyAction)}
              onClick={() => void verifyHandles()}
            >
              Verify handles
            </Button>
            <Button
              variant="outline"
              disabled={Boolean(socialBusyAction)}
              onClick={() => void runEngagement()}
            >
              Run engagement
            </Button>
            <Button
              variant="outline"
              disabled={Boolean(socialBusyAction)}
              onClick={() => void refreshQueue()}
            >
              Refresh queue
            </Button>
            <Button
              variant="outline"
              disabled={Boolean(socialBusyAction)}
              onClick={() => void requestPause("/api/social/pause")}
            >
              Pause
            </Button>
            <Button
              variant="outline"
              disabled={Boolean(socialBusyAction)}
              onClick={() => void requestPause("/api/social/resume")}
            >
              Resume
            </Button>
          </div>
        </div>
        <StatusMessage error={socialError} message={socialNotice} />
      </div>

      <div className="overflow-hidden rounded-md bg-[var(--app-surface)] shadow-sm app-card-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-[rgb(154_61_43_/_0.06)]">
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Draft</TableHead>
              <TableHead>Handles</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Last note</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queuePosts.length > 0 ? (
              queuePosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <StatusBadge status={post.status} />
                  </TableCell>
                  <TableCell className="min-w-40 text-sm font-medium text-[#181818]">
                    {formatSourceKind(post.source_kind)}
                  </TableCell>
                  <TableCell className="max-w-xl whitespace-normal text-sm leading-6 text-[#5F5A52]">
                    {post.post_text || "No public copy stored."}
                  </TableCell>
                  <TableCell className="text-sm text-[#5F5A52]">
                    {post.tagged_handles.length > 0
                      ? post.tagged_handles.map((handle) => `@${handle}`).join(", ")
                      : "None"}
                  </TableCell>
                  <TableCell className="text-sm text-[#5F5A52]">
                    {post.score}
                  </TableCell>
                  <TableCell className="min-w-36 text-sm text-[#5F5A52]">
                    {formatSocialDate(post.published_at) ||
                      formatSocialDate(post.scheduled_for) ||
                      formatSocialDate(post.created_at)}
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal text-sm leading-6 text-[#7A746C]">
                    {post.last_error ||
                      post.safety_notes.join(", ") ||
                      formatDecision(post)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={Boolean(socialBusyAction)}
                        onClick={() => void publishNow(post)}
                      >
                        Post now
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={Boolean(socialBusyAction)}
                        onClick={() => void skipPost(post)}
                      >
                        Skip
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-sm text-[#7A746C]"
                >
                  No social drafts have been generated yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="overflow-hidden rounded-md bg-[var(--app-surface)] shadow-sm app-card-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-[rgb(154_61_43_/_0.06)]">
              <TableHead>Engagement</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source post</TableHead>
              <TableHead>Generated text</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queueEngagements.length > 0 ? (
              queueEngagements.map((engagement) => (
                <TableRow key={engagement.id}>
                  <TableCell className="font-medium text-[#181818]">
                    {engagement.action}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={engagement.status} />
                  </TableCell>
                  <TableCell className="max-w-sm truncate text-sm text-[#5F5A52]">
                    {engagement.source_post_url || engagement.source_post_id}
                  </TableCell>
                  <TableCell className="max-w-xl whitespace-normal text-sm leading-6 text-[#5F5A52]">
                    {engagement.generated_text || "None"}
                  </TableCell>
                  <TableCell className="text-sm text-[#5F5A52]">
                    {formatSocialDate(engagement.created_at)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-sm text-[#7A746C]"
                >
                  No engagement candidates have been logged yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="overflow-hidden rounded-md bg-[var(--app-surface)] shadow-sm app-card-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-[rgb(154_61_43_/_0.06)]">
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Finished</TableHead>
              <TableHead>Errors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queueRuns.length > 0 ? (
              queueRuns.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium text-[#181818]">
                    {run.task}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={run.status} />
                  </TableCell>
                  <TableCell className="text-sm text-[#5F5A52]">
                    {formatSocialDate(run.finished_at)}
                  </TableCell>
                  <TableCell className="max-w-xl whitespace-normal text-sm leading-6 text-[#7A746C]">
                    {run.errors.length > 0 ? run.errors.join(", ") : "None"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-sm text-[#7A746C]"
                >
                  No social automation runs have been logged yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CompanyEditor({
  company,
  onChange,
  onClose,
  onSave,
}: {
  company: Company | null;
  onChange: (company: Company | null) => void;
  onClose: () => void;
  onSave: (company: Company) => void;
}) {
  function update<K extends keyof Company>(key: K, value: Company[K]) {
    onChange(company ? { ...company, [key]: value } : null);
  }

  return (
    <Dialog
      open={company !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-md sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Startup editor</DialogTitle>
          <DialogDescription>
            Editorial fields mirror the planned Supabase company model.
          </DialogDescription>
        </DialogHeader>
        {company ? (
          <div className="grid gap-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <EditorField label="Name" id="name">
                <Input
                  id="name"
                  value={company.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              </EditorField>
              <EditorField label="Slug" id="slug">
                <Input
                  id="slug"
                  value={company.slug}
                  onChange={(event) => update("slug", event.target.value)}
                />
              </EditorField>
              <EditorField label="Website" id="website_url">
                <Input
                  id="website_url"
                  value={company.website_url}
                  onChange={(event) =>
                    update("website_url", event.target.value)
                  }
                />
              </EditorField>
              <EditorField label="X handle" id="x_handle">
                <Input
                  id="x_handle"
                  value={company.x_handle}
                  placeholder="@company"
                  onChange={(event) => update("x_handle", event.target.value)}
                />
              </EditorField>
              <EditorField label="Office address" id="office_address">
                <Input
                  id="office_address"
                  value={company.office_address}
                  onChange={(event) =>
                    update("office_address", event.target.value)
                  }
                />
              </EditorField>
              <EditorField label="Logo" id="logo_url">
                <Input
                  id="logo_url"
                  value={company.logo_url}
                  onChange={(event) => update("logo_url", event.target.value)}
                />
              </EditorField>
              <EditorField label="Category" id="category">
                <Select
                  value={company.category}
                  onValueChange={(value) =>
                    update("category", value as Category)
                  }
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EditorField>
              <EditorField label="Stage" id="stage">
                <Input
                  id="stage"
                  value={company.stage}
                  onChange={(event) => update("stage", event.target.value)}
                />
              </EditorField>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <EditorField label="Funding round" id="funding_round">
                <Input
                  id="funding_round"
                  value={company.funding_round}
                  onChange={(event) =>
                    update("funding_round", event.target.value)
                  }
                />
              </EditorField>
              <EditorField label="Round amount" id="funding_amount">
                <Input
                  id="funding_amount"
                  value={company.funding_amount}
                  onChange={(event) =>
                    update("funding_amount", event.target.value)
                  }
                />
              </EditorField>
              <EditorField label="Round date" id="funding_date">
                <Input
                  id="funding_date"
                  value={company.funding_date}
                  onChange={(event) =>
                    update("funding_date", event.target.value)
                  }
                />
              </EditorField>
              <EditorField label="Total raised" id="total_raised">
                <Input
                  id="total_raised"
                  value={company.total_raised}
                  onChange={(event) =>
                    update("total_raised", event.target.value)
                  }
                />
              </EditorField>
              <EditorField label="Lead investor" id="lead_investor">
                <Input
                  id="lead_investor"
                  value={company.lead_investor}
                  onChange={(event) =>
                    update("lead_investor", event.target.value)
                  }
                />
              </EditorField>
              <EditorField label="Funding note" id="funding_note">
                <Input
                  id="funding_note"
                  value={company.funding_note}
                  onChange={(event) =>
                    update("funding_note", event.target.value)
                  }
                />
              </EditorField>
            </div>

            <EditorField label="Short description" id="short_description">
              <Textarea
                id="short_description"
                rows={3}
                value={company.short_description}
                onChange={(event) =>
                  update("short_description", event.target.value)
                }
              />
            </EditorField>
            <EditorField label="One-line thesis" id="one_line_thesis">
              <Textarea
                id="one_line_thesis"
                rows={3}
                value={company.one_line_thesis}
                onChange={(event) =>
                  update("one_line_thesis", event.target.value)
                }
              />
            </EditorField>
            <EditorField label="Why it matters" id="why_it_matters">
              <Textarea
                id="why_it_matters"
                rows={4}
                value={company.why_it_matters}
                onChange={(event) =>
                  update("why_it_matters", event.target.value)
                }
              />
            </EditorField>
            <div className="grid gap-4 md:grid-cols-2">
              <EditorField label="Public inclusion reason" id="inclusion_reason">
                <Textarea
                  id="inclusion_reason"
                  rows={3}
                  value={company.inclusionReason?.body ?? ""}
                  placeholder="Generated on save if left blank"
                  onChange={(event) =>
                    update("inclusionReason", {
                      title: "Why it was added",
                      body: event.target.value,
                      generatedAt:
                        company.inclusionReason?.generatedAt ??
                        new Date().toISOString(),
                      sourceEventIds:
                        company.inclusionReason?.sourceEventIds ?? [],
                      sourceCompanyIds:
                        company.inclusionReason?.sourceCompanyIds ?? [
                          company.id,
                        ],
                    })
                  }
                />
              </EditorField>
              <EditorField label="Internal discovery note" id="discovery_reason">
                <Textarea
                  id="discovery_reason"
                  rows={3}
                  value={company.discoveryReason?.notes ?? ""}
                  placeholder="Internal source context. Not shown publicly."
                  onChange={(event) =>
                    update("discoveryReason", {
                      trigger: company.discoveryReason?.trigger ?? "manual",
                      sourceEventIds:
                        company.discoveryReason?.sourceEventIds ?? [],
                      sourceUrls: company.discoveryReason?.sourceUrls ?? [],
                      confidence: company.discoveryReason?.confidence ?? "medium",
                      notes: event.target.value,
                    })
                  }
                />
              </EditorField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <EditorField label="AI usage profile" id="ai_usage_profile">
                <Textarea
                  id="ai_usage_profile"
                  rows={4}
                  value={company.ai_usage_profile}
                  onChange={(event) =>
                    update("ai_usage_profile", event.target.value)
                  }
                />
              </EditorField>
              <EditorField label="OpenAI fit" id="openai_fit">
                <Textarea
                  id="openai_fit"
                  rows={4}
                  value={company.openai_fit}
                  onChange={(event) =>
                    update("openai_fit", event.target.value)
                  }
                />
              </EditorField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <EditorField label="Usage profile" id="consumption_profile">
                <Select
                  value={company.consumption_profile[0] ?? "none"}
                  onValueChange={(value) => {
                    update(
                      "consumption_profile",
                      value === "none" ? [] : [value as ConsumptionProfile],
                    );
                  }}
                >
                  <SelectTrigger id="consumption_profile" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not evaluated</SelectItem>
                    {consumptionProfiles.map((profile) => (
                      <SelectItem key={profile} value={profile}>
                        {getConsumptionProfileLabel(profile)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EditorField>
              <EditorField label="Usage intensity" id="consumption_intensity">
                <Select
                  value={company.consumption_intensity}
                  onValueChange={(value) =>
                    update("consumption_intensity", value as ConsumptionIntensity)
                  }
                >
                  <SelectTrigger id="consumption_intensity" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {consumptionIntensities.map((intensity) => (
                      <SelectItem key={intensity} value={intensity}>
                        {formatConsumptionIntensity(intensity)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EditorField>
              <EditorField label="Usage note" id="consumption_note">
                <Input
                  id="consumption_note"
                  value={company.consumption_note}
                  onChange={(event) =>
                    update("consumption_note", event.target.value)
                  }
                />
              </EditorField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <EditorField label="Recent activity text" id="recent_activity_text">
                <Input
                  id="recent_activity_text"
                  value={company.recent_activity_text}
                  onChange={(event) =>
                    update("recent_activity_text", event.target.value)
                  }
                />
              </EditorField>
              <EditorField label="Recent activity date" id="recent_activity_date">
                <Input
                  id="recent_activity_date"
                  type="date"
                  value={company.recent_activity_date.slice(0, 10)}
                  onChange={(event) =>
                    update("recent_activity_date", event.target.value)
                  }
                />
              </EditorField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <EditorField label="Status" id="status">
                <Select
                  value={company.status}
                  onValueChange={(value) =>
                    update("status", value as CompanyStatus)
                  }
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {companyStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EditorField>
              <div className="flex items-center justify-between rounded-md p-3 app-card-border">
                <Label htmlFor="is_featured">Featured on discovery</Label>
                <Switch
                  id="is_featured"
                  checked={company.is_featured}
                  onCheckedChange={(checked) =>
                    update("is_featured", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-md p-3 app-card-border">
                <Label htmlFor="is_breakout">Editorial watch</Label>
                <Switch
                  id="is_breakout"
                  checked={company.is_breakout}
                  onCheckedChange={(checked) =>
                    update("is_breakout", checked)
                  }
                />
              </div>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="app-primary-button"
            onClick={() => {
              if (company) {
                onSave(company);
              }
            }}
          >
            Save startup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditorField({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "published" ||
    status === "accepted" ||
    status === "success" ||
    status.endsWith(" ok") ||
    status.endsWith(" off")
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : status === "draft" ||
          status === "new" ||
          status === "queued" ||
          status === "scheduled" ||
          status.endsWith(" only")
        ? "bg-[rgb(154_61_43_/_0.08)] text-[#9A3D2B] ring-[#E7E1D8]"
        : status === "failed" || status.endsWith(" on")
          ? "bg-red-50 text-red-700 ring-red-100"
        : "bg-slate-50 text-[#5F5A52] ring-[#E7E1D8]";

  return (
    <Badge
      variant="outline"
      className={`${className} rounded-md border-0 px-2 py-1 text-xs font-medium ring-1`}
    >
      {status}
    </Badge>
  );
}

function formatSourceKind(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSocialDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDecision(post: AtlasSocialPost) {
  const latest = post.decision_log.at(-1);
  if (!latest) return "";

  return [latest.action, latest.error, latest.reason, latest.rationale]
    .filter((value): value is string => typeof value === "string" && Boolean(value))
    .join(": ");
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
    <span
      className={
        error
          ? "mt-2 block font-medium text-[#9A3D2B]"
          : "mt-2 block font-medium text-emerald-700"
      }
    >
      {error || message}
    </span>
  );
}

async function sendAdminRequest<T = Record<string, never>>(
  url: string,
  init: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const result = (await response.json().catch(() => null)) as
      | (T & { error?: string; ok?: boolean })
      | null;

    if (!response.ok || result?.ok === false) {
      return {
        ok: false,
        error: result?.error ?? "Admin action failed.",
      };
    }

    return { ok: true, data: result as T };
  } catch (requestError) {
    return {
      ok: false,
      error:
        requestError instanceof Error
          ? requestError.message
          : "Admin action failed.",
    };
  }
}
