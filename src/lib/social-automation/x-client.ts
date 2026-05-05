import {
  getSocialAutomationConfig,
  type SocialAutomationConfig,
} from "@/lib/social-automation/config";

const xApiBaseUrl = "https://api.x.com/2";

export type XAuthHealth = {
  ok: boolean;
  canRead: boolean;
  canWrite: boolean;
  reason: string;
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

type XTimelineResponse = {
  data?: Array<{
    id: string;
    text: string;
    created_at?: string;
    public_metrics?: Record<string, number>;
  }>;
};

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

  if (!config.xAccessToken && !config.xBearerToken) {
    return {
      ok: false,
      canRead: false,
      canWrite: false,
      reason: "X_ACCESS_TOKEN or X_BEARER_TOKEN is not configured.",
    };
  }

  if (config.xAccessToken) {
    const userContextHealth = await checkUserContextAccess(config.xAccessToken);
    if (userContextHealth.ok) {
      return {
        ...userContextHealth,
        canWrite: true,
        reason: "X OAuth user-context access token is valid for account actions.",
      };
    }

    if (!config.xBearerToken) return userContextHealth;
  }

  return checkReadAccess(config);
}

export async function createPost({
  text,
  quoteTweetId,
  replyToTweetId,
  config = getSocialAutomationConfig(),
}: {
  text: string;
  quoteTweetId?: string;
  replyToTweetId?: string;
  config?: SocialAutomationConfig;
}) {
  if (config.killSwitch) {
    throw new Error("SOCIAL_KILL_SWITCH is enabled.");
  }

  if (!config.autoPost) {
    throw new Error("SOCIAL_AUTO_POST is false.");
  }

  if (!config.xAccessToken) {
    throw new Error("X_ACCESS_TOKEN is required to publish.");
  }

  const response = await fetch(`${xApiBaseUrl}/tweets`, {
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
    }),
    cache: "no-store",
  });

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

export const publishTweet = createPost;

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

function normalizeHandle(value: string) {
  return value.replace(/^@/, "").trim();
}

async function summarizeResponse(response: Response) {
  const text = await response.text().catch(() => "");
  return text.replace(/\s+/g, " ").trim().slice(0, 220);
}
