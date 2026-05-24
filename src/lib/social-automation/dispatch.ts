import {
  getSocialAutomationConfig,
  getSocialConfigSnapshot,
} from "@/lib/social-automation/config";
import {
  cancelSocialPostForDispatch,
  claimSocialPostForPublishing,
  claimSocialPostNowForPublishing,
  getDueScheduledPosts,
  getRecentSocialPostsForPacing,
  getSocialPostById,
  markSocialPostFailed,
  markSocialPostPublished,
  recoverMissedSocialPostsForDispatch,
  saveDispatchLog,
  saveSocialRun,
} from "@/lib/social-automation/store";
import { getSocialTextRepetitionIssue } from "@/lib/social-automation/safety";
import { prepareSocialTextForPublish } from "@/lib/social-automation/preview-url";
import { absoluteUrl, getShareImageUrl } from "@/lib/seo/shareMetadata";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import {
  createPost,
  getXAuthHealth,
  uploadImageFromUrl,
} from "@/lib/social-automation/x-client";
import type { Company } from "@/types/market";
import type { AtlasSocialPost } from "@/types/social";

export type DispatchSocialPostsResult = {
  ok: boolean;
  status: "success" | "partial" | "failed" | "skipped";
  published: number;
  skippedReason?: string;
  errors: string[];
};

type PreparedSocialPost = {
  text: string;
  mediaIds: string[];
  mediaNotes: string[];
};

export async function dispatchScheduledSocialPosts(): Promise<DispatchSocialPostsResult> {
  const startedAt = new Date().toISOString();
  const config = getSocialAutomationConfig();
  const errors: string[] = [];

  if (config.killSwitch) {
    return saveSkippedDispatch(startedAt, "SOCIAL_KILL_SWITCH is enabled.");
  }

  if (!config.autoPost) {
    return saveSkippedDispatch(startedAt, "SOCIAL_AUTO_POST is false.");
  }

  const health = await getXAuthHealth(config);
  if (!health.canWrite) {
    return saveSkippedDispatch(startedAt, health.reason);
  }

  const recentPublishedPosts = await getRecentSocialPostsForPacing();
  const pacing = getPacingDecision(config, recentPublishedPosts);
  if (!pacing.allowed) {
    return saveSkippedDispatch(startedAt, pacing.reason);
  }

  const recovery = await recoverMissedSocialPostsForDispatch({
    sinceHours: 24,
    limit: 24,
    minMinutesBetweenPosts: config.minMinutesBetweenPosts,
  });

  const duePosts = await getDueScheduledPosts(new Date(), 8);
  if (duePosts.length === 0) {
    return saveSkippedDispatch(startedAt, "No scheduled posts are due.", undefined, {
      recoveredMissedPosts: recovery.recovered,
    });
  }

  const recentTexts = recentPublishedPosts.map((post) => post.post_text);
  let duePost: AtlasSocialPost | null = null;
  for (const post of duePosts) {
    const repetitionIssue = getSocialTextRepetitionIssue(post.post_text, recentTexts);
    if (repetitionIssue) {
      await cancelSocialPostForDispatch({
        post,
        reason: `Canceled before publishing: ${repetitionIssue}`,
      });
      continue;
    }

    duePost = post;
    break;
  }

  if (!duePost) {
    return saveSkippedDispatch(
      startedAt,
      "Due scheduled posts were too similar to recent posts.",
      undefined,
      {
        recoveredMissedPosts: recovery.recovered,
      },
    );
  }

  const claimedPost = await claimSocialPostForPublishing(duePost);
  if (!claimedPost) {
    return saveSkippedDispatch(
      startedAt,
      "No post could be claimed for publishing.",
      undefined,
      {
        recoveredMissedPosts: recovery.recovered,
      },
    );
  }

  try {
    const preparedPost = await preparePostForDispatch(claimedPost, config);
    const published = await createPost({
      text: preparedPost.text,
      mediaIds: preparedPost.mediaIds,
      config,
    });
    const username = health.user?.username || "aiatlas";

    await markSocialPostPublished({
      post: claimedPost,
      externalPostId: published.id,
      externalPostUrl: `https://x.com/${username}/status/${published.id}`,
      raw: published,
    });
    await saveDispatchLog({
      runType: "dispatch",
      selectedEventId: claimedPost.source_event_ids[0],
      selectedPostId: claimedPost.id,
      decision: "published",
      notes: [published.id, ...preparedPost.mediaNotes],
    });

    await saveSocialRun({
      task: "dispatch",
      startedAt,
      status: "success",
      stats: {
        ...getSocialConfigSnapshot(config),
        published: 1,
        postId: claimedPost.id,
        externalPostId: published.id,
        shareImageAttached: preparedPost.mediaIds.length > 0,
        recoveredMissedPosts: recovery.recovered,
      },
      errors,
    });

    return {
      ok: true,
      status: "success",
      published: 1,
      errors,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    errors.push(message);
    await markSocialPostFailed({ post: claimedPost, error: message });
    await saveDispatchLog({
      runType: "dispatch",
      selectedEventId: claimedPost.source_event_ids[0],
      selectedPostId: claimedPost.id,
      decision: "publish_failed",
      notes: [message],
    });
    await saveSocialRun({
      task: "dispatch",
      startedAt,
      status: "failed",
      stats: {
        ...getSocialConfigSnapshot(config),
        published: 0,
        postId: claimedPost.id,
        recoveredMissedPosts: recovery.recovered,
      },
      errors,
    });

    return {
      ok: false,
      status: "failed",
      published: 0,
      errors,
    };
  }
}

export async function publishSocialPostNow(
  postId: string,
): Promise<DispatchSocialPostsResult> {
  const startedAt = new Date().toISOString();
  const config = getSocialAutomationConfig();
  const errors: string[] = [];

  if (config.killSwitch) {
    return saveSkippedDispatch(startedAt, "SOCIAL_KILL_SWITCH is enabled.", postId);
  }

  if (!config.autoPost) {
    return saveSkippedDispatch(startedAt, "SOCIAL_AUTO_POST is false.", postId);
  }

  const health = await getXAuthHealth(config);
  if (!health.canWrite) {
    return saveSkippedDispatch(startedAt, health.reason, postId);
  }

  const post = await getSocialPostById(postId);
  if (!post) {
    return saveSkippedDispatch(startedAt, "Social post was not found.", postId);
  }

  if (post.safety_notes.length > 0 || post.status === "skipped") {
    return saveSkippedDispatch(
      startedAt,
      "Post has unresolved safety notes or was skipped.",
      postId,
    );
  }

  const claimedPost = await claimSocialPostNowForPublishing(post);
  if (!claimedPost) {
    return saveSkippedDispatch(startedAt, "No post could be claimed for publishing.", postId);
  }

  try {
    const preparedPost = await preparePostForDispatch(claimedPost, config);
    const published = await createPost({
      text: preparedPost.text,
      mediaIds: preparedPost.mediaIds,
      config,
    });
    const username = health.user?.username || config.xAccountUsername;

    await markSocialPostPublished({
      post: claimedPost,
      externalPostId: published.id,
      externalPostUrl: `https://x.com/${username}/status/${published.id}`,
      raw: published,
    });
    await saveDispatchLog({
      runType: "admin",
      selectedEventId: claimedPost.source_event_ids[0],
      selectedPostId: claimedPost.id,
      decision: "published_now",
      notes: [published.id, ...preparedPost.mediaNotes],
    });

    await saveSocialRun({
      task: "dispatch",
      startedAt,
      status: "success",
      stats: {
        ...getSocialConfigSnapshot(config),
        published: 1,
        postId: claimedPost.id,
        externalPostId: published.id,
        manual: true,
        shareImageAttached: preparedPost.mediaIds.length > 0,
      },
      errors,
    });

    return {
      ok: true,
      status: "success",
      published: 1,
      errors,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    errors.push(message);
    await markSocialPostFailed({ post: claimedPost, error: message });
    await saveDispatchLog({
      runType: "admin",
      selectedEventId: claimedPost.source_event_ids[0],
      selectedPostId: claimedPost.id,
      decision: "publish_now_failed",
      notes: [message],
    });

    await saveSocialRun({
      task: "dispatch",
      startedAt,
      status: "failed",
      stats: {
        ...getSocialConfigSnapshot(config),
        published: 0,
        postId: claimedPost.id,
        manual: true,
      },
      errors,
    });

    return {
      ok: false,
      status: "failed",
      published: 0,
      errors,
    };
  }
}

async function preparePostForDispatch(
  post: AtlasSocialPost,
  config: ReturnType<typeof getSocialAutomationConfig>,
): Promise<PreparedSocialPost> {
  const companies = await getPublishedCompanies();
  const publicCompanySlugs = new Set(companies.map((company) => company.slug));
  const correctedText = rewriteJobAlertPreviewUrl(
    post,
    rewriteCurrentReadPreviewUrl(post, companies),
  );

  const text = prepareSocialTextForPublish(
    correctedText.replace(
      /https:\/\/(?:www\.)?aiatlas\.nyc\/companies\/([a-z0-9-]+)(?:\?[^ \n]*)?/gi,
      (url, slug: string) => {
        if (publicCompanySlugs.has(slug)) return url;

        return absoluteUrl("/companies");
      },
    ),
  );
  const imageUrl = getPostShareImageUrl(post, companies, text);
  const mediaNotes = [`shareImage:${imageUrl}`];

  try {
    const media = await uploadImageFromUrl({ imageUrl, config });
    mediaNotes.push(`mediaId:${media.id}`);

    return {
      text,
      mediaIds: [media.id],
      mediaNotes,
    };
  } catch (error) {
    mediaNotes.push(`mediaUploadSkipped:${getErrorMessage(error)}`);

    return {
      text,
      mediaIds: [],
      mediaNotes,
    };
  }
}

function rewriteCurrentReadPreviewUrl(post: AtlasSocialPost, companies: Company[]) {
  if (post.source_kind !== "current_read") return post.post_text;
  if (!/https:\/\/(?:www\.)?aiatlas\.nyc\/insights(?:\?[^ \n]*)?/i.test(post.post_text)) {
    return post.post_text;
  }

  const primaryCompany = findCurrentReadPrimaryCompany(post, companies);
  if (!primaryCompany) return post.post_text;

  const profileUrl = absoluteUrl(`/companies/${primaryCompany.slug}`);
  return post.post_text.replace(
    /https:\/\/(?:www\.)?aiatlas\.nyc\/insights(?:\?[^ \n]*)?/gi,
    profileUrl,
  );
}

function rewriteJobAlertPreviewUrl(post: AtlasSocialPost, text: string) {
  if (post.source_kind !== "job_alert") return text;

  const jobUrl = findFirstExternalJobUrl(post.source_urls);
  if (!jobUrl) return text;

  const atlasCompanyUrl =
    /https:\/\/(?:www\.)?aiatlas\.nyc\/companies\/[a-z0-9-]+(?:\?[^ \n]*)?/gi;

  if (atlasCompanyUrl.test(text)) {
    atlasCompanyUrl.lastIndex = 0;
    return text.replace(atlasCompanyUrl, jobUrl);
  }

  if (/https?:\/\/\S+/i.test(text)) return text;

  return `${text.trim()}\n\n${jobUrl}`;
}

function findFirstExternalJobUrl(urls: string[]) {
  return urls.find((url) => {
    try {
      const parsed = new URL(url);
      return !/(^|\.)aiatlas\.nyc$/i.test(parsed.hostname);
    } catch {
      return false;
    }
  });
}

function findCurrentReadPrimaryCompany(
  post: AtlasSocialPost,
  companies: Company[],
) {
  const sourceCompanyIds = new Set(post.source_company_ids);
  const sourceCompanies = companies.filter((company) =>
    sourceCompanyIds.has(company.id),
  );
  const candidates = sourceCompanies.length > 0 ? sourceCompanies : companies;
  const text = post.post_text.toLowerCase();
  const directMatches = candidates
    .map((company) => ({
      company,
      index: getCompanyMentionIndex(company, text),
    }))
    .filter((item) => item.index >= 0)
    .sort((left, right) => left.index - right.index);

  return directMatches[0]?.company ?? sourceCompanies[0];
}

function getPostShareImageUrl(
  post: AtlasSocialPost,
  companies: Company[],
  preparedText: string,
) {
  const company = findPostPrimaryCompany(post, companies, preparedText);
  if (company) return getShareImageUrl({ company: company.slug });

  const atlasUrl = findFirstAtlasUrl([preparedText, ...post.source_urls]);
  if (!atlasUrl) return getShareImageUrl({ page: "home" });

  const companySlug = atlasUrl.pathname.match(/^\/companies\/([^/?#]+)/)?.[1];
  if (companySlug) return getShareImageUrl({ company: companySlug });

  const categorySlug = atlasUrl.pathname.match(/^\/categories\/([^/?#]+)/)?.[1];
  if (categorySlug) return getShareImageUrl({ category: categorySlug });

  return getShareImageUrl({ page: getSharePageForPath(atlasUrl.pathname) });
}

function findPostPrimaryCompany(
  post: AtlasSocialPost,
  companies: Company[],
  preparedText: string,
) {
  const sourceCompanyIds = new Set(
    [post.company_id, ...post.source_company_ids].filter(Boolean),
  );
  const sourceCompanies = companies.filter((company) =>
    sourceCompanyIds.has(company.id),
  );
  const candidates = sourceCompanies.length > 0 ? sourceCompanies : companies;
  const text = preparedText.toLowerCase();
  const directMatches = candidates
    .map((company) => ({
      company,
      index: getCompanyMentionIndex(company, text),
    }))
    .filter((item) => item.index >= 0)
    .sort((left, right) => left.index - right.index);

  return directMatches[0]?.company ?? sourceCompanies[0];
}

function findFirstAtlasUrl(values: string[]) {
  for (const value of values) {
    const matches = value.match(/https:\/\/(?:www\.)?aiatlas\.nyc\/?[^\s<>"')\]]*/gi);
    for (const match of matches ?? []) {
      try {
        return new URL(match);
      } catch {
        continue;
      }
    }
  }

  return null;
}

function getSharePageForPath(pathname: string) {
  if (pathname.startsWith("/jobs")) return "jobs";
  if (pathname.startsWith("/feed") || pathname.startsWith("/newsfeed")) return "feed";
  if (pathname.startsWith("/insights")) return "insights";
  if (pathname.startsWith("/patterns")) return "insights";
  if (pathname.startsWith("/submit")) return "submit";
  if (pathname.startsWith("/mcp")) return "mcp";
  if (pathname.startsWith("/ask")) return "ask";
  if (pathname.startsWith("/companies")) return "companies";
  if (pathname === "/" || pathname === "") return "home";

  return "home";
}

function getCompanyMentionIndex(company: Company, normalizedText: string) {
  const indexes = [
    normalizedText.indexOf(company.name.toLowerCase()),
    company.x_handle
      ? normalizedText.indexOf(`@${normalizeHandle(company.x_handle).toLowerCase()}`)
      : -1,
  ].filter((index) => index >= 0);

  return indexes.length > 0 ? Math.min(...indexes) : -1;
}

function normalizeHandle(value: string) {
  return value.replace(/^@/, "").trim();
}

function getPacingDecision(
  config: ReturnType<typeof getSocialAutomationConfig>,
  recentPosts: AtlasSocialPost[],
) {
  const now = Date.now();
  const postsToday = recentPosts.filter((post) =>
    isSameZonedDay(post.published_at, config.timezone),
  );
  const postsPastHour = recentPosts.filter((post) => {
    return post.published_at
      ? now - new Date(post.published_at).getTime() < 60 * 60_000
      : false;
  });
  const latestPublished = recentPosts.find((post) => post.published_at);

  if (postsToday.length >= config.dailyPostLimit) {
    return { allowed: false, reason: "SOCIAL_DAILY_POST_LIMIT has been reached." };
  }

  if (postsPastHour.length >= config.maxPostsPerHour) {
    return { allowed: false, reason: "SOCIAL_MAX_POSTS_PER_HOUR has been reached." };
  }

  if (latestPublished?.published_at) {
    const minutesSinceLast =
      (now - new Date(latestPublished.published_at).getTime()) / 60_000;
    if (minutesSinceLast < config.minMinutesBetweenPosts) {
      return {
        allowed: false,
        reason: "SOCIAL_MIN_MINUTES_BETWEEN_POSTS has not elapsed.",
      };
    }
  }

  return { allowed: true, reason: "" };
}

async function saveSkippedDispatch(
  startedAt: string,
  reason: string,
  selectedPostId?: string,
  extraStats: Record<string, unknown> = {},
) {
  const config = getSocialAutomationConfig();
  await saveDispatchLog({
    runType: "dispatch",
    selectedPostId,
    decision: "skipped",
    notes: [reason],
  });
  await saveSocialRun({
    task: "dispatch",
    startedAt,
    status: "skipped",
    stats: {
      ...getSocialConfigSnapshot(config),
      ...extraStats,
    },
    errors: [reason],
  });

  return {
    ok: true,
    status: "skipped" as const,
    published: 0,
    skippedReason: reason,
    errors: [reason],
  };
}

function isSameZonedDay(value: AtlasSocialPost["published_at"], timezone: string) {
  if (!value) return false;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date(value)) === formatter.format(new Date());
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
