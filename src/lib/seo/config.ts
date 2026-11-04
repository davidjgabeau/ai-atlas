export const SITE_URL = "https://aiatlas.nyc";

export const SEO_DEFAULTS = {
  siteName: "AI Atlas NYC",
  defaultTitle: "AI Atlas NYC | NYC AI Startup Market Map",
  titleTemplate: "%s | AI Atlas NYC",
  description:
    "AI Atlas NYC is a curated market map of AI companies in New York for founders, seed investors, operators, and analysts, from seed to public companies.",
  keywords: [
    "NYC AI startups",
    "New York AI startups",
    "AI companies",
    "AI companies",
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
