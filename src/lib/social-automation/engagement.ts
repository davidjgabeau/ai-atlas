import { createId } from "@/lib/agent/hash";
import {
  getSocialAutomationConfig,
  getSocialConfigSnapshot,
} from "@/lib/social-automation/config";
import { saveDispatchLog, saveSocialRun } from "@/lib/social-automation/store";
import {
  createPost,
  getXAuthHealth,
  likePost,
  repost,
} from "@/lib/social-automation/x-client";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";
import type { AtlasSocialEngagementAction } from "@/types/social";

type CompanySocialPostRow = {
  id: string;
  company_id: string;
  external_post_id: string;
  author_handle: string;
  post_text: string;
  post_url: string;
  posted_at: string;
};

export type RunSocialEngagementResult = {
  ok: boolean;
  status: "success" | "partial" | "failed" | "skipped";
  actionsCompleted: number;
  skippedReason?: string;
  errors: string[];
};

export async function runConservativeSocialEngagement(): Promise<RunSocialEngagementResult> {
  const startedAt = new Date().toISOString();
  const config = getSocialAutomationConfig();

  if (config.killSwitch) {
    return saveSkippedEngagement(startedAt, "SOCIAL_KILL_SWITCH is enabled.");
  }

  if (!config.engagementEnabled) {
    return saveSkippedEngagement(
      startedAt,
      "SOCIAL_ENGAGEMENT_ENABLED is false.",
    );
  }

  const health = await getXAuthHealth(config);
  if (!health.canWrite || !health.user?.id) {
    return saveSkippedEngagement(startedAt, health.reason);
  }

  const supabase = createSupabasePrivilegedClient();
  if (!supabase) {
    return saveSkippedEngagement(
      startedAt,
      "Supabase privileged credentials are not configured.",
    );
  }

  const { data, error } = await supabase
    .from("company_social_posts")
    .select("id,company_id,external_post_id,author_handle,post_text,post_url,posted_at")
    .order("posted_at", { ascending: false })
    .limit(30);

  if (error || !data) {
    return saveFailedEngagement(startedAt, [
      error?.message ?? "Unable to load company social posts.",
    ]);
  }

  const ownHandle = normalizeHandle(health.user.username);
  const limits = await getEngagementLimitDecision(supabase);
  if (!limits.allowed) return saveSkippedEngagement(startedAt, limits.reason);

  for (const post of data as CompanySocialPostRow[]) {
    if (!post.external_post_id) continue;
    if (normalizeHandle(post.author_handle) === ownHandle) continue;
    if (!isEligibleEngagementPost(post)) continue;

    const { data: existingAction } = await supabase
      .from("atlas_social_engagement_actions")
      .select("id")
      .in("action", ["like", "repost", "reply", "quote"])
      .eq("target_external_post_id", post.external_post_id)
      .maybeSingle();

    if (existingAction) continue;

    const action = chooseEngagementAction(post);
    const actionId = createId("social_engagement", {
      action,
      externalPostId: post.external_post_id,
    });

    await supabase.from("atlas_social_engagement_actions").upsert(
      {
        id: actionId,
        target_external_post_id: post.external_post_id,
        action,
        status: "queued",
        reason: getEngagementReason(action),
        company_id: post.company_id,
        source_social_post_id: post.id,
        source_post_url: post.post_url,
      },
      { onConflict: "action,target_external_post_id" },
    );

    try {
      const response = await performEngagementAction({
        action,
        userId: health.user.id,
        post,
        config,
      });

      await supabase
        .from("atlas_social_engagement_actions")
        .update({
          status: "completed",
          posted_at: new Date().toISOString(),
          external_response: response,
        })
        .eq("id", actionId);
      await saveDispatchLog({
        runType: "engagement",
        selectedEngagementId: actionId,
        decision: "completed",
        notes: [action, post.external_post_id],
      });

      await saveSocialRun({
        task: "engagement",
        startedAt,
        status: "success",
        stats: {
          ...getSocialConfigSnapshot(config),
          actionsCompleted: 1,
          action,
          targetExternalPostId: post.external_post_id,
        },
        errors: [],
      });

      return {
        ok: true,
        status: "success",
        actionsCompleted: 1,
        errors: [],
      };
    } catch (engagementError) {
      const message = getErrorMessage(engagementError);
      await supabase
        .from("atlas_social_engagement_actions")
        .update({
          status: "failed",
          reason: message,
        })
        .eq("id", actionId);
      await saveDispatchLog({
        runType: "engagement",
        selectedEngagementId: actionId,
        decision: "failed",
        notes: [message],
      });

      return saveFailedEngagement(startedAt, [message]);
    }
  }

  return saveSkippedEngagement(startedAt, "No eligible company post to engage with.");
}

async function getEngagementLimitDecision(
  supabase: NonNullable<ReturnType<typeof createSupabasePrivilegedClient>>,
) {
  const since = startOfLocalDayIso();
  const { data, error } = await supabase
    .from("atlas_social_engagement_actions")
    .select("id,action")
    .eq("status", "completed")
    .gte("posted_at", since)
    .limit(20);

  if (error) return { allowed: false, reason: error.message };

  const actions = (data ?? []) as Array<{ action?: string }>;
  if (actions.length >= 8) {
    return { allowed: false, reason: "Daily engagement action limit reached." };
  }

  const quoteCount = actions.filter((action) => action.action === "quote").length;
  if (quoteCount >= 3) {
    return { allowed: false, reason: "Daily quote post limit reached." };
  }

  return { allowed: true, reason: "" };
}

function chooseEngagementAction(
  post: CompanySocialPostRow,
): AtlasSocialEngagementAction {
  const lower = post.post_text.toLowerCase();
  if (/\b(funding|raised|launch|launched|hiring|new role|product)\b/.test(lower)) {
    return "repost";
  }

  return "like";
}

async function performEngagementAction({
  action,
  userId,
  post,
  config,
}: {
  action: AtlasSocialEngagementAction;
  userId: string;
  post: CompanySocialPostRow;
  config: ReturnType<typeof getSocialAutomationConfig>;
}) {
  if (action === "repost") {
    return repost({ userId, tweetId: post.external_post_id, config });
  }

  if (action === "quote") {
    return createPost({
      text: `Worth a look from the NYC AI map: ${post.post_url}`,
      quoteTweetId: post.external_post_id,
      config,
    });
  }

  if (action === "reply") {
    return createPost({
      text: "Love seeing this from the NYC AI map.",
      replyToTweetId: post.external_post_id,
      config,
    });
  }

  return likePost({ userId, tweetId: post.external_post_id, config });
}

function getEngagementReason(action: AtlasSocialEngagementAction) {
  if (action === "repost") {
    return "Conservative repost of a strong, recent official company post.";
  }
  if (action === "quote") {
    return "Conservative quote post for a clearly relevant company update.";
  }
  if (action === "reply") {
    return "Conservative reply for a clear company milestone.";
  }

  return "Conservative like of a recent official company post.";
}

async function saveSkippedEngagement(startedAt: string, reason: string) {
  const config = getSocialAutomationConfig();
  await saveSocialRun({
    task: "engagement",
    startedAt,
    status: "skipped",
    stats: getSocialConfigSnapshot(config),
    errors: [reason],
  });

  return {
    ok: true,
    status: "skipped" as const,
    actionsCompleted: 0,
    skippedReason: reason,
    errors: [reason],
  };
}

async function saveFailedEngagement(startedAt: string, errors: string[]) {
  const config = getSocialAutomationConfig();
  await saveSocialRun({
    task: "engagement",
    startedAt,
    status: "failed",
    stats: getSocialConfigSnapshot(config),
    errors,
  });

  return {
    ok: false,
    status: "failed" as const,
    actionsCompleted: 0,
    errors,
  };
}

function normalizeHandle(value: string) {
  return value.replace(/^@/, "").trim().toLowerCase();
}

function isEligibleEngagementPost(post: CompanySocialPostRow) {
  const postedAt = new Date(post.posted_at).getTime();
  if (!Number.isFinite(postedAt)) return false;
  if (Date.now() - postedAt > 7 * 24 * 60 * 60_000) return false;

  const lower = post.post_text.toLowerCase();
  if (/\b(politics|war|violence|layoff|lawsuit|scandal)\b/.test(lower)) {
    return false;
  }

  return true;
}

function startOfLocalDayIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
