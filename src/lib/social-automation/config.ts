export type SocialAutomationConfig = {
  autoPost: boolean;
  engagementEnabled: boolean;
  killSwitch: boolean;
  dailyPostLimit: number;
  minMinutesBetweenPosts: number;
  maxPostsPerHour: number;
  timezone: string;
  generationBatchSize: number;
  anthropicApiKey: string;
  anthropicModel: string;
  xClientId: string;
  xClientSecret: string;
  xAccessToken: string;
  xRefreshToken: string;
  xBearerToken: string;
  xAccountUsername: string;
};

const defaultSocialModel = "claude-sonnet-4-6";
const defaultXAccountUsername = "AiAtlasNYC";

export function getSocialAutomationConfig(): SocialAutomationConfig {
  return {
    autoPost: process.env.SOCIAL_AUTO_POST === "true",
    engagementEnabled: process.env.SOCIAL_ENGAGEMENT_ENABLED === "true",
    killSwitch: process.env.SOCIAL_KILL_SWITCH === "true",
    dailyPostLimit: getIntegerEnv("SOCIAL_DAILY_POST_LIMIT", 12, 1, 50),
    minMinutesBetweenPosts: getIntegerEnv(
      "SOCIAL_MIN_MINUTES_BETWEEN_POSTS",
      25,
      1,
      24 * 60,
    ),
    maxPostsPerHour: getIntegerEnv("SOCIAL_MAX_POSTS_PER_HOUR", 3, 1, 12),
    timezone: process.env.SOCIAL_TIMEZONE || "America/New_York",
    generationBatchSize: getIntegerEnv("SOCIAL_GENERATION_BATCH_SIZE", 6, 1, 12),
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    anthropicModel:
      process.env.ANTHROPIC_SOCIAL_MODEL ??
      process.env.ANTHROPIC_EDITORIAL_MODEL ??
      defaultSocialModel,
    xClientId: process.env.X_CLIENT_ID ?? "",
    xClientSecret: process.env.X_CLIENT_SECRET ?? "",
    xAccessToken: process.env.X_ACCESS_TOKEN ?? "",
    xRefreshToken: process.env.X_REFRESH_TOKEN ?? "",
    xBearerToken: process.env.X_BEARER_TOKEN ?? process.env.TWITTER_BEARER_TOKEN ?? "",
    xAccountUsername: normalizeXUsername(
      process.env.X_ACCOUNT_USERNAME ?? defaultXAccountUsername,
    ),
  };
}

export function getSocialConfigSnapshot(config = getSocialAutomationConfig()) {
  return {
    autoPost: config.autoPost,
    engagementEnabled: config.engagementEnabled,
    killSwitch: config.killSwitch,
    dailyPostLimit: config.dailyPostLimit,
    minMinutesBetweenPosts: config.minMinutesBetweenPosts,
    maxPostsPerHour: config.maxPostsPerHour,
    timezone: config.timezone,
    generationBatchSize: config.generationBatchSize,
    anthropicConfigured: Boolean(config.anthropicApiKey),
    xClientConfigured: Boolean(config.xClientId && config.xClientSecret),
    xReadConfigured: Boolean(config.xBearerToken || config.xAccessToken),
    xWriteConfigured: Boolean(config.xAccessToken),
    xRefreshConfigured: Boolean(config.xRefreshToken),
    xAccountUsername: config.xAccountUsername,
  };
}

function getIntegerEnv(
  name: string,
  fallback: number,
  min: number,
  max: number,
) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;

  return Math.min(max, Math.max(min, Math.floor(value)));
}

function normalizeXUsername(value: string) {
  const normalized = value.replace(/^@/, "").trim();

  return normalized || defaultXAccountUsername;
}
