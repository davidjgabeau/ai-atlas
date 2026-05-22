import { createId } from "@/lib/agent/hash";
import {
  getSocialAutomationConfig,
  getSocialConfigSnapshot,
} from "@/lib/social-automation/config";
import { checkSocialPostSafety } from "@/lib/social-automation/safety";
import { collectSocialPostCandidates } from "@/lib/social-automation/sources";
import {
  getPreviewSafeAtlasUrl,
  prepareSocialTextForPublish,
} from "@/lib/social-automation/preview-url";
import {
  getExistingSocialSourceHashes,
  getRecentSocialPostsForGeneration,
  saveDispatchLog,
  saveSocialRun,
  upsertSocialPosts,
} from "@/lib/social-automation/store";
import {
  socialPromptVersion,
  writeSocialDraftWithClaude,
} from "@/lib/social-automation/writer";
import type { SocialCompany, SocialPostCandidate } from "@/types/social";

export type GenerateSocialDraftsResult = {
  ok: boolean;
  status: "success" | "partial" | "failed" | "skipped";
  candidatesFound: number;
  draftsCreated: number;
  skipped: number;
  errors: string[];
};

export async function generateSocialDrafts(): Promise<GenerateSocialDraftsResult> {
  const startedAt = new Date().toISOString();
  const config = getSocialAutomationConfig();
  const errors: string[] = [];

  if (config.killSwitch) {
    await saveSocialRun({
      task: "generate",
      startedAt,
      status: "skipped",
      stats: getSocialConfigSnapshot(config),
      errors: ["SOCIAL_KILL_SWITCH is enabled."],
    });
    return {
      ok: true,
      status: "skipped",
      candidatesFound: 0,
      draftsCreated: 0,
      skipped: 0,
      errors: ["SOCIAL_KILL_SWITCH is enabled."],
    };
  }

  if (!config.anthropicApiKey) {
    await saveSocialRun({
      task: "generate",
      startedAt,
      status: "skipped",
      stats: getSocialConfigSnapshot(config),
      errors: ["ANTHROPIC_API_KEY is not configured."],
    });
    return {
      ok: true,
      status: "skipped",
      candidatesFound: 0,
      draftsCreated: 0,
      skipped: 0,
      errors: ["ANTHROPIC_API_KEY is not configured."],
    };
  }

  const { candidates, errors: sourceErrors } = await collectSocialPostCandidates(
    Math.max(config.generationBatchSize * 10, 120),
  );
  errors.push(...sourceErrors);

  const existingHashes = await getExistingSocialSourceHashes(
    candidates.map((candidate) => candidate.sourceHash),
  );
  const recentPosts = await getRecentSocialPostsForGeneration();
  const freshCandidates = candidates
    .filter((candidate) => !existingHashes.has(candidate.sourceHash))
    .sort((left, right) => right.score - left.score);
  const selectedCandidates = selectDiverseCandidates(
    freshCandidates,
    Math.min(freshCandidates.length, config.generationBatchSize * 5),
  );
  const rows: Array<Record<string, unknown>> = [];
  let reviewedCandidates = 0;
  let scheduledDraftIndex = 0;
  let skipped = candidates.length - selectedCandidates.length;

  for (const candidate of selectedCandidates) {
    if (rows.filter((row) => row.status !== "skipped").length >= config.generationBatchSize) {
      skipped += selectedCandidates.length - reviewedCandidates;
      break;
    }

    reviewedCandidates += 1;
    const candidateSkipReason = getCandidateSkipReason(candidate, recentPosts);
    if (candidateSkipReason) {
      skipped += 1;
      rows.push(createSkippedRow(candidate, candidateSkipReason));
      await saveDispatchLog({
        runType: "generate",
        selectedEventId: candidate.sourceEventIds[0],
        decision: "candidate_skipped",
        notes: [candidateSkipReason, candidate.title],
      });
      continue;
    }

    const draft = await writeSocialDraftWithClaude({ candidate, config });

    if (draft.error || !draft.text) {
      skipped += 1;
      rows.push(createSkippedRow(candidate, draft.error ?? "Writer returned no text."));
      await saveDispatchLog({
        runType: "generate",
        selectedEventId: candidate.sourceEventIds[0],
        decision: "writer_failed",
        notes: [draft.error ?? "Writer returned no text.", candidate.title],
      });
      continue;
    }

    const postText = withPrimaryUrl(
      ensureVerifiedHandleTag(draft.text, candidate.companies),
      candidate.primaryUrl,
    );
    const safety = checkSocialPostSafety({
      text: postText,
      companies: candidate.companies,
      sourceUrls: candidate.sourceUrls,
      recentTexts: recentPosts.map((post) => post.post_text),
    });

    if (!safety.passed) {
      skipped += 1;
      rows.push(
        createSkippedRow(candidate, "Safety check failed.", {
          postText,
          safetyNotes: safety.notes,
          model: draft.model,
          reason: draft.reason,
          taggedHandles: safety.taggedHandles,
        }),
      );
      await saveDispatchLog({
        runType: "generate",
        selectedEventId: candidate.sourceEventIds[0],
        decision: "safety_failed",
        notes: safety.notes,
      });
      continue;
    }

    const shouldSchedule = config.autoPost && draft.risk === "low";
    rows.push({
      id: createId("social_post", candidate.sourceHash),
      source_kind: candidate.sourceKind,
      status: shouldSchedule ? "scheduled" : "draft",
      post_text: postText,
      scheduled_for: shouldSchedule
        ? getScheduledFor(scheduledDraftIndex, config.minMinutesBetweenPosts)
        : null,
      company_id: candidate.sourceCompanyIds[0] ?? null,
      source_company_ids: candidate.sourceCompanyIds,
      source_event_ids: candidate.sourceEventIds,
      source_job_ids: candidate.sourceJobIds,
      source_news_ids: candidate.sourceNewsIds,
      source_snapshot_ids: candidate.sourceSnapshotIds,
      source_urls: candidate.sourceUrls,
      tagged_handles: safety.taggedHandles,
      model: draft.model,
      prompt_version: socialPromptVersion,
      source_hash: candidate.sourceHash,
      safety_notes: [],
      score: candidate.score,
      decision_log: [
        {
          at: new Date().toISOString(),
          action: shouldSchedule ? "scheduled_draft" : "draft_created",
          autoPost: config.autoPost,
          risk: draft.risk,
          reason: draft.reason,
          primaryUrl: candidate.primaryUrl,
        },
      ],
      raw: candidateToRaw(candidate),
    });
    scheduledDraftIndex += 1;
  }

  const persisted = await upsertSocialPosts(rows);
  if (!persisted.ok) errors.push(persisted.error);

  const draftsCreated = rows.filter((row) => row.status !== "skipped").length;
  const status =
    errors.length > 0
      ? draftsCreated > 0
        ? "partial"
        : "failed"
      : draftsCreated > 0
        ? "success"
        : "skipped";

  await saveSocialRun({
    task: "generate",
    startedAt,
    status,
    stats: {
      ...getSocialConfigSnapshot(config),
      candidatesFound: candidates.length,
      freshCandidates: freshCandidates.length,
      selectedCandidates: selectedCandidates.length,
      reviewedCandidates,
      draftsCreated,
      skipped,
      rowsPersisted: persisted.count,
    },
    errors,
  });

  return {
    ok: status !== "failed",
    status,
    candidatesFound: candidates.length,
    draftsCreated,
    skipped,
    errors,
  };
}

function selectDiverseCandidates(candidates: SocialPostCandidate[], limit: number) {
  const buckets = new Map<SocialPostCandidate["sourceKind"], SocialPostCandidate[]>();
  for (const candidate of candidates) {
    const bucket = buckets.get(candidate.sourceKind) ?? [];
    bucket.push(candidate);
    buckets.set(candidate.sourceKind, bucket);
  }

  const kindOrder: SocialPostCandidate["sourceKind"][] = [
    "company_update",
    "job_alert",
    "company_news",
    "current_read",
    "category_movement",
    "evergreen_spotlight",
  ];
  const selected: SocialPostCandidate[] = [];

  while (selected.length < limit) {
    const before = selected.length;
    for (const kind of kindOrder) {
      const next = buckets.get(kind)?.shift();
      if (!next) continue;
      selected.push(next);
      if (selected.length >= limit) break;
    }

    if (selected.length === before) break;
  }

  return selected;
}

function createSkippedRow(
  candidate: SocialPostCandidate,
  error: string,
  details: {
    postText?: string;
    safetyNotes?: string[];
    model?: string;
    reason?: string;
    taggedHandles?: string[];
  } = {},
) {
  return {
    id: createId("social_post", candidate.sourceHash),
    source_kind: candidate.sourceKind,
    status: "skipped",
    post_text: details.postText ?? "",
    company_id: candidate.sourceCompanyIds[0] ?? null,
    source_company_ids: candidate.sourceCompanyIds,
    source_event_ids: candidate.sourceEventIds,
    source_job_ids: candidate.sourceJobIds,
    source_news_ids: candidate.sourceNewsIds,
    source_snapshot_ids: candidate.sourceSnapshotIds,
    source_urls: candidate.sourceUrls,
    tagged_handles: details.taggedHandles ?? [],
    model: details.model,
    prompt_version: socialPromptVersion,
    source_hash: candidate.sourceHash,
    safety_notes: details.safetyNotes ?? [],
    decision_log: [
      {
        at: new Date().toISOString(),
        action: "skipped",
        error,
        reason: details.reason,
      },
    ],
    raw: candidateToRaw(candidate),
    last_error: error,
    score: candidate.score,
  };
}

function getCandidateSkipReason(
  candidate: SocialPostCandidate,
  recentPosts: Awaited<ReturnType<typeof getRecentSocialPostsForGeneration>>,
) {
  if (candidate.sourceKind === "job_alert") {
    const recentNonCanceled = recentPosts.filter((post) =>
      ["draft", "scheduled", "publishing", "published"].includes(post.status),
    );
    if (
      recentNonCanceled.slice(0, 2).length === 2 &&
      recentNonCanceled.slice(0, 2).every((post) => post.source_kind === "job_alert")
    ) {
      return "Skipped to avoid more than two job alerts back-to-back.";
    }
  }

  const companyIds = new Set(candidate.sourceCompanyIds);
  if (companyIds.size > 0 && candidate.sourceKind !== "company_news") {
    const twelveHoursAgo = Date.now() - 12 * 60 * 60_000;
    const recentCompanyPost = recentPosts.find((post) => {
      const createdAt = new Date(post.created_at).getTime();
      if (!Number.isFinite(createdAt) || createdAt < twelveHoursAgo) return false;

      return post.source_company_ids.some((companyId) => companyIds.has(companyId));
    });

    if (recentCompanyPost) {
      return "Skipped to avoid mentioning the same company twice within 12 hours.";
    }
  }

  if (candidate.sourceKind === "evergreen_spotlight") {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60_000;
    const spotlightedRecently = recentPosts.some((post) => {
      if (post.source_kind !== "evergreen_spotlight") return false;
      const createdAt = new Date(post.created_at).getTime();
      if (!Number.isFinite(createdAt) || createdAt < thirtyDaysAgo) return false;

      return post.source_company_ids.some((companyId) =>
        companyIds.has(companyId),
      );
    });

    if (spotlightedRecently) {
      return "Skipped because this company was spotlighted within 30 days.";
    }
  }

  return "";
}

function getScheduledFor(index: number, minMinutesBetweenPosts: number) {
  return new Date(
    Date.now() + index * minMinutesBetweenPosts * 60_000,
  ).toISOString();
}

function ensureVerifiedHandleTag(text: string, companies: SocialCompany[]) {
  const clean = text.replace(/\s+/g, " ").trim();
  const lower = clean.toLowerCase();
  const taggableCompanies = companies.filter((item) => {
    const handle = normalizeHandle(item.x_handle);
    return handle && !lower.includes(`@${handle}`);
  });
  const company = taggableCompanies.find((item) =>
    lower.includes(item.name.toLowerCase()),
  );

  if (!company) {
    const firstHandle = normalizeHandle(taggableCompanies[0]?.x_handle ?? "");
    if (!firstHandle || clean.length + firstHandle.length + 2 > 260) return clean;
    return `${clean} @${firstHandle}`;
  }

  const handle = normalizeHandle(company.x_handle);
  const escapedName = company.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const namePattern = new RegExp(`\\b${escapedName}\\b`, "i");
  const withNameAndHandle = clean.replace(namePattern, `${company.name} (@${handle})`);
  if (withNameAndHandle.length <= 260) return withNameAndHandle;

  return clean.replace(namePattern, `@${handle}`);
}

function normalizeHandle(value: string) {
  return value.replace(/^@/, "").trim().toLowerCase();
}

function withPrimaryUrl(text: string, primaryUrl: string | undefined) {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  if (!primaryUrl) return normalizedText;

  const previewUrl = getPreviewSafeAtlasUrl(primaryUrl) || primaryUrl;
  const withoutUrls = normalizedText
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\b(?:www\.)?aiatlas\.nyc\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const maxBodyLength = Math.max(40, 280 - previewUrl.length - 2);
  const body =
    withoutUrls.length <= maxBodyLength
      ? withoutUrls
      : `${withoutUrls
          .slice(0, Math.max(0, maxBodyLength - 3))
          .replace(/\s+\S*$/, "")
          .trim()}...`;

  return prepareSocialTextForPublish(`${body}\n\n${previewUrl}`);
}

function candidateToRaw(candidate: SocialPostCandidate) {
  return {
    sourceKind: candidate.sourceKind,
    title: candidate.title,
    facts: candidate.facts,
    companies: candidate.companies.map((company) => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
      xHandle: company.x_handle,
    })),
    score: candidate.score,
    primaryUrl: candidate.primaryUrl,
    sourceIds: {
      companies: candidate.sourceCompanyIds,
      events: candidate.sourceEventIds,
      jobs: candidate.sourceJobIds,
      news: candidate.sourceNewsIds,
      snapshots: candidate.sourceSnapshotIds,
    },
  };
}
