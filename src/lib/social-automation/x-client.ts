import {
  getSocialAutomationConfig,
  type SocialAutomationConfig,
} from "@/lib/social-automation/config";
import {
  loadStoredXTokens,
  saveStoredXTokens,
} from "@/lib/social-automation/x-token-store";

const xApiBaseUrl = "https://api.x.com/2";

export type XAuthHealth = {
  ok: boolean;
  canRead: boolean;
  canWrite: boolean;
  reason: string;
  writeReason?: string;
  refreshed?: boolean;
  user?: {
    id: string;
    username: string;
    name: string;
  };
};

type XUserResponse = {
  data?: {
    id: string;
    username: string;
    name: string;
  };
};

type XTweetResponse = {
  data?: {
    id: string;
    text: string;
  };
};

type XMediaUploadResponse = {
  data?: {
    id?: string;
    media_key?: string;
  };
};

type XTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

type XTokenRefreshResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      scope?: string;
    }
  | {
      ok: false;
      reason: string;
    };

type XTimelineResponse = {
  data?: Array<{
    id: string;
    text: string;
    created_at?: string;
    public_metrics?: Record<string, number>;
  }>;
};

let refreshedTokenCache: Extract<XTokenRefreshResult, { ok: true }> | null = null;

export async function getXAuthHealth(
  config: SocialAutomationConfig = getSocialAutomationConfig(),
): Promise<XAuthHealth> {
  if (config.killSwitch) {
    return {
      ok: false,
      canRead: false,
      canWrite: false,
      reason: "SOCIAL_KILL_SWITCH is enabled.",
    };
  }

  if (!config.xAccessToken && !config.xBearerToken && !canRefreshXAccessToken(config)) {
    return {
      ok: false,
      canRead: false,
      canWrite: false,
      reason:
        "X_ACCESS_TOKEN, X_BEARER_TOKEN, or X_REFRESH_TOKEN is not configured.",
    };
  }

  const userContextHealth = await ensureUserContextAccess(config);
  if (userContextHealth.ok) {
    return {
      ...userContextHealth,
      canWrite: true,
      reason: userContextHealth.refreshed
        ? "X OAuth user-context access token was refreshed and is valid for account actions."
        : "X OAuth user-context access token is valid for account actions.",
    };
  }

  if (!config.xBearerToken) return userContextHealth;

  const readHealth = await checkReadAccess(config);
  return {
    ...readHealth,
    writeReason: userContextHealth.reason,
  };
}

export async function createPost({
  text,
  quoteTweetId,
  replyToTweetId,
  mediaIds,
  config = getSocialAutomationConfig(),
}: {
  text: string;
  quoteTweetId?: string;
  replyToTweetId?: string;
  mediaIds?: string[];
  config?: SocialAutomationConfig;
}) {
  if (config.killSwitch) {
    throw new Error("SOCIAL_KILL_SWITCH is enabled.");
  }

  if (!config.autoPost) {
    throw new Error("SOCIAL_AUTO_POST is false.");
  }

  await applyStoredXTokens(config);
  applyCachedXAccessToken(config);

  if (!config.xAccessToken) {
    const health = await ensureUserContextAccess(config);
    if (!health.canWrite) {
      throw new Error(health.reason);
    }
  }

  let response = await createPostRequest({
    text,
    quoteTweetId,
    replyToTweetId,
    mediaIds,
    config,
  });

  if (!response.ok && isRefreshableAuthFailure(response.status)) {
    const refresh = await refreshXAccessToken(config);
    if (refresh.ok) {
      response = await createPostRequest({
        text,
        quoteTweetId,
        replyToTweetId,
        mediaIds,
        config,
      });
    }
  }

  if (!response.ok) {
    throw new Error(
      `X publish failed: ${response.status} ${await summarizeResponse(response)}`,
    );
  }

  const payload = (await response.json()) as XTweetResponse;
  if (!payload.data?.id) {
    throw new Error("X publish returned no tweet id.");
  }

  return payload.data;
}

export async function uploadImageFromUrl({
  imageUrl,
  config = getSocialAutomationConfig(),
}: {
  imageUrl: string;
  config?: SocialAutomationConfig;
}): Promise<{ id: string; mediaKey?: string }> {
  if (config.killSwitch) {
    throw new Error("SOCIAL_KILL_SWITCH is enabled.");
  }

  if (!config.autoPost) {
    throw new Error("SOCIAL_AUTO_POST is false.");
  }

  await applyStoredXTokens(config);
  applyCachedXAccessToken(config);

  if (!config.xAccessToken) {
    const health = await ensureUserContextAccess(config);
    if (!health.canWrite) {
      throw new Error(health.reason);
    }
  }

  const image = await fetchImageForUpload(imageUrl);
  let response = await uploadImageRequest({ ...image, config });

  if (!response.ok && isRefreshableAuthFailure(response.status)) {
    const refresh = await refreshXAccessToken(config);
    if (refresh.ok) {
      response = await uploadImageRequest({ ...image, config });
    }
  }

  if (!response.ok) {
    throw new Error(
      `X media upload failed: ${response.status} ${await summarizeResponse(response)}`,
    );
  }

  const payload = (await response.json()) as XMediaUploadResponse;
  const id = payload.data?.id;
  if (!id) {
    throw new Error("X media upload returned no media id.");
  }

  return {
    id,
    mediaKey: payload.data?.media_key,
  };
}

function createPostRequest({
  text,
  quoteTweetId,
  replyToTweetId,
  mediaIds,
  config,
}: {
  text: string;
  quoteTweetId?: string;
  replyToTweetId?: string;
  mediaIds?: string[];
  config: SocialAutomationConfig;
}) {
  const safeMediaIds = uniqueStrings(mediaIds ?? []).slice(0, 4);

  return fetch(`${xApiBaseUrl}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.xAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      ...(quoteTweetId ? { quote_tweet_id: quoteTweetId } : {}),
      ...(replyToTweetId
        ? { reply: { in_reply_to_tweet_id: replyToTweetId } }
        : {}),
      ...(safeMediaIds.length > 0
        ? { media: { media_ids: safeMediaIds } }
        : {}),
    }),
    cache: "no-store",
  });
}

export const publishTweet = createPost;

async function fetchImageForUpload(imageUrl: string) {
  const response = await fetch(imageUrl, {
    headers: {
      accept: "image/png,image/jpeg,image/webp,image/*",
      "user-agent": "AI Atlas NYC social automation (+https://aiatlas.nyc)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(
      `Share image fetch failed: ${response.status} ${await summarizeResponse(response)}`,
    );
  }

  const contentType = normalizeImageContentType(
    response.headers.get("content-type"),
  );
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error("Share image fetch returned an empty image.");
  }

  if (bytes.length > 5 * 1024 * 1024) {
    throw new Error("Share image is larger than X's 5 MB image upload limit.");
  }

  return {
    media: bytes.toString("base64"),
    mediaType: contentType,
  };
}

function uploadImageRequest({
  media,
  mediaType,
  config,
}: {
  media: string;
  mediaType: string;
  config: SocialAutomationConfig;
}) {
  return fetch(`${xApiBaseUrl}/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.xAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      media,
      media_category: "tweet_image",
      media_type: mediaType,
      shared: false,
    }),
    cache: "no-store",
  });
}

function normalizeImageContentType(value: string | null) {
  const contentType = value?.split(";")[0]?.trim().toLowerCase() || "image/png";
  if (
    contentType === "image/png" ||
    contentType === "image/jpeg" ||
    contentType === "image/webp" ||
    contentType === "image/gif"
  ) {
    return contentType;
  }

  throw new Error(`Share image returned unsupported content type: ${contentType}`);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export async function likePost({
  userId,
  tweetId,
  config = getSocialAutomationConfig(),
}: {
  userId: string;
  tweetId: string;
  config?: SocialAutomationConfig;
}) {
  if (config.killSwitch) throw new Error("SOCIAL_KILL_SWITCH is enabled.");
  if (!config.engagementEnabled) {
    throw new Error("SOCIAL_ENGAGEMENT_ENABLED is false.");
  }
  if (!config.xAccessToken) throw new Error("X_ACCESS_TOKEN is required.");

  const response = await fetch(`${xApiBaseUrl}/users/${userId}/likes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.xAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tweet_id: tweetId }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `X like failed: ${response.status} ${await summarizeResponse(response)}`,
    );
  }

  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

export const likeTweet = likePost;

export async function repost({
  userId,
  tweetId,
  config = getSocialAutomationConfig(),
}: {
  userId: string;
  tweetId: string;
  config?: SocialAutomationConfig;
}) {
  if (config.killSwitch) throw new Error("SOCIAL_KILL_SWITCH is enabled.");
  if (!config.engagementEnabled) {
    throw new Error("SOCIAL_ENGAGEMENT_ENABLED is false.");
  }
  if (!config.xAccessToken) throw new Error("X_ACCESS_TOKEN is required.");

  const response = await fetch(`${xApiBaseUrl}/users/${userId}/retweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.xAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tweet_id: tweetId }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `X repost failed: ${response.status} ${await summarizeResponse(response)}`,
    );
  }

  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

export const repostTweet = repost;

export async function verifyHandle({
  handle,
  config = getSocialAutomationConfig(),
}: {
  handle: string;
  config?: SocialAutomationConfig;
}) {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) {
    return {
      ok: false,
      reason: "Handle is empty.",
    };
  }

  const readToken = config.xBearerToken || config.xAccessToken;
  if (!readToken) {
    return {
      ok: false,
      handle: normalizedHandle,
      reason: "X_BEARER_TOKEN or X_ACCESS_TOKEN is required for handle verification.",
    };
  }

  const response = await fetch(
    `${xApiBaseUrl}/users/by/username/${encodeURIComponent(normalizedHandle)}?user.fields=verified,verified_type`,
    {
      headers: {
        Authorization: `Bearer ${readToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      handle: normalizedHandle,
      reason: `X handle lookup failed: ${response.status} ${await summarizeResponse(response)}`,
    };
  }

  const payload = (await response.json()) as XUserResponse;
  if (!payload.data?.id) {
    return {
      ok: false,
      handle: normalizedHandle,
      reason: `X returned no user for @${normalizedHandle}.`,
    };
  }

  return {
    ok: true,
    handle: payload.data.username,
    user: payload.data,
    reason: `@${payload.data.username} exists on X.`,
  };
}

export async function searchRecentPostsByHandle({
  handle,
  maxResults = 10,
  config = getSocialAutomationConfig(),
}: {
  handle: string;
  maxResults?: number;
  config?: SocialAutomationConfig;
}) {
  const verification = await verifyHandle({ handle, config });
  if (!verification.ok || !verification.user?.id) {
    return {
      ok: false,
      posts: [],
      reason: verification.reason,
    };
  }

  const readToken = config.xBearerToken || config.xAccessToken;
  if (!readToken) {
    return {
      ok: false,
      posts: [],
      reason: "X_BEARER_TOKEN or X_ACCESS_TOKEN is required for public reads.",
    };
  }

  const url = new URL(`${xApiBaseUrl}/users/${verification.user.id}/tweets`);
  url.searchParams.set("max_results", String(Math.min(100, Math.max(5, maxResults))));
  url.searchParams.set("exclude", "retweets,replies");
  url.searchParams.set("tweet.fields", "created_at,public_metrics");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${readToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false,
      posts: [],
      reason: `X recent posts lookup failed: ${response.status} ${await summarizeResponse(response)}`,
    };
  }

  const payload = (await response.json()) as XTimelineResponse;

  return {
    ok: true,
    posts: payload.data ?? [],
    reason: `Loaded recent posts for @${verification.handle}.`,
  };
}

async function checkUserContextAccess(token: string): Promise<XAuthHealth> {
  try {
    const response = await fetch(`${xApiBaseUrl}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        canRead: false,
        canWrite: false,
        reason: `X user-context auth check failed: ${response.status} ${await summarizeResponse(response)}`,
      };
    }

    const payload = (await response.json()) as XUserResponse;
    if (!payload.data?.id) {
      return {
        ok: false,
        canRead: false,
        canWrite: false,
        reason: "X user-context auth check returned no user.",
      };
    }

    return {
      ok: true,
      canRead: true,
      canWrite: true,
      reason: "X user-context access token is valid.",
      user: payload.data,
    };
  } catch (error) {
    return {
      ok: false,
      canRead: false,
      canWrite: false,
      reason: `X user-context auth check failed: ${getErrorMessage(error)}`,
    };
  }
}

async function ensureUserContextAccess(
  config: SocialAutomationConfig,
): Promise<XAuthHealth> {
  await applyStoredXTokens(config);
  applyCachedXAccessToken(config);

  const tokenHealth = config.xAccessToken
    ? await checkUserContextAccess(config.xAccessToken)
    : null;

  if (tokenHealth?.ok) return tokenHealth;

  if (!canRefreshXAccessToken(config)) {
    return (
      tokenHealth ?? {
        ok: false,
        canRead: false,
        canWrite: false,
        reason: "X_ACCESS_TOKEN or X_REFRESH_TOKEN is required for account actions.",
      }
    );
  }

  const refresh = await refreshXAccessToken(config);
  if (!refresh.ok) {
    return {
      ok: false,
      canRead: false,
      canWrite: false,
      reason: tokenHealth
        ? `${tokenHealth.reason} Refresh attempt failed: ${refresh.reason}`
        : refresh.reason,
    };
  }

  const refreshedHealth = await checkUserContextAccess(refresh.accessToken);
  return refreshedHealth.ok
    ? {
        ...refreshedHealth,
        refreshed: true,
        reason:
          "X OAuth user-context access token was refreshed and is valid for account actions.",
      }
    : {
        ...refreshedHealth,
        reason: `X refreshed access token failed validation: ${refreshedHealth.reason}`,
      };
}

function applyCachedXAccessToken(config: SocialAutomationConfig) {
  if (!refreshedTokenCache) return;
  if (Date.now() > refreshedTokenCache.expiresAt - 60_000) {
    refreshedTokenCache = null;
    return;
  }

  config.xAccessToken = refreshedTokenCache.accessToken;
  config.xRefreshToken = refreshedTokenCache.refreshToken;
}

function canRefreshXAccessToken(config: SocialAutomationConfig) {
  return Boolean(config.xRefreshToken && config.xClientId);
}

async function refreshXAccessToken(
  config: SocialAutomationConfig,
): Promise<XTokenRefreshResult> {
  if (!config.xRefreshToken) {
    return { ok: false, reason: "X_REFRESH_TOKEN is not configured." };
  }

  if (!config.xClientId) {
    return { ok: false, reason: "X_CLIENT_ID is not configured." };
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: config.xRefreshToken,
    client_id: config.xClientId,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (config.xClientSecret) {
    headers.Authorization = `Basic ${Buffer.from(
      `${config.xClientId}:${config.xClientSecret}`,
    ).toString("base64")}`;
  }

  const response = await fetch(`${xApiBaseUrl}/oauth2/token`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false,
      reason: `X token refresh failed: ${response.status} ${await summarizeResponse(response)}`,
    };
  }

  const payload = (await response.json()) as XTokenResponse;
  if (!payload.access_token) {
    return {
      ok: false,
      reason: "X token refresh returned no access token.",
    };
  }

  const expiresInSeconds =
    typeof payload.expires_in === "number" && Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 2 * 60 * 60;
  const result = {
    ok: true as const,
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || config.xRefreshToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    scope: payload.scope,
  };

  refreshedTokenCache = result;
  config.xAccessToken = result.accessToken;
  config.xRefreshToken = result.refreshToken;
  await saveStoredXTokens({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });

  return result;
}

async function checkReadAccess(config: SocialAutomationConfig): Promise<XAuthHealth> {
  try {
    const response = await fetch(
      `${xApiBaseUrl}/users/by/username/${encodeURIComponent(config.xAccountUsername)}`,
      {
        headers: {
          Authorization: `Bearer ${config.xBearerToken}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        ok: false,
        canRead: false,
        canWrite: false,
        reason: `X bearer auth check failed: ${response.status} ${await summarizeResponse(response)}`,
      };
    }

    const payload = (await response.json()) as XUserResponse;
    if (!payload.data?.id) {
      return {
        ok: false,
        canRead: false,
        canWrite: false,
        reason: `X bearer auth check returned no user for @${config.xAccountUsername}.`,
      };
    }

    return {
      ok: true,
      canRead: true,
      canWrite: false,
      reason: "X bearer token is valid for public reads; X_ACCESS_TOKEN is required for account actions.",
      user: payload.data,
    };
  } catch (error) {
    return {
      ok: false,
      canRead: false,
      canWrite: false,
      reason: `X bearer auth check failed: ${getErrorMessage(error)}`,
    };
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isRefreshableAuthFailure(status: number) {
  return status === 401 || status === 403;
}

async function applyStoredXTokens(config: SocialAutomationConfig) {
  const storedTokens = await loadStoredXTokens();
  if (storedTokens.accessToken) config.xAccessToken = storedTokens.accessToken;
  if (storedTokens.refreshToken) config.xRefreshToken = storedTokens.refreshToken;
}

function normalizeHandle(value: string) {
  return value.replace(/^@/, "").trim();
}

async function summarizeResponse(response: Response) {
  const text = await response.text().catch(() => "");
  return text.replace(/\s+/g, " ").trim().slice(0, 220);
}
