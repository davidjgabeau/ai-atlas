export const SITE_URL = "https://aiatlas.nyc";

export const SEO_DEFAULTS = {
  siteName: "AI Atlas NYC",
  defaultTitle: "AI Atlas NYC | Early-Stage NYC AI Startup Market Map",
  titleTemplate: "%s | AI Atlas NYC",
  description:
    "AI Atlas NYC is a curated market map of early-stage AI startups in New York, from pre-seed through Series A. Curated by hand. Updated agentically.",
  keywords: [
    "NYC AI startups",
    "New York AI startups",
    "early-stage AI startups",
    "AI startup market map",
    "NYC startup map",
    "AI companies in New York",
    "Series A AI startups",
    "seed stage AI startups",
  ],
} as const;

export function getConfiguredSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL;
}
