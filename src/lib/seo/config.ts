export const SITE_URL = "https://aiatlas.nyc";

export const SEO_DEFAULTS = {
  siteName: "AI Atlas NYC",
  defaultTitle: "AI Atlas NYC | Early-Stage NYC AI Startup Market Map",
  titleTemplate: "%s | AI Atlas NYC",
  description:
    "AI Atlas NYC is a curated market map of early-stage AI startups in New York for founders, seed investors, operators, and analysts, from pre-seed through Series A.",
  keywords: [
    "NYC AI startups",
    "New York AI startups",
    "early-stage AI startups",
    "early-stage AI companies",
    "AI startup market map",
    "AI companies for VCs",
    "NYC AI companies for founders",
    "seed stage AI companies",
    "NYC startup map",
    "AI companies in New York",
    "Series A AI startups",
    "seed stage AI startups",
  ],
} as const;

export function getConfiguredSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL;
}
