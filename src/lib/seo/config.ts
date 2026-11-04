export const SITE_URL = "https://aiatlas.nyc";

export const SEO_DEFAULTS = {
  siteName: "AI Atlas NYC",
  defaultTitle: "AI Atlas NYC | New York AI Companies & Offices",
  titleTemplate: "%s | AI Atlas NYC",
  description:
    "Research NYC AI companies across stages, with sourced office locations, company profiles, hiring, and dated signals for exploring New York's AI economy.",
  keywords: [
    "NYC AI companies",
    "New York AI companies",
    "Williamsburg AI companies",
    "Brooklyn AI companies",
    "AI office map",
    "NYC AI company directory",
    "AI company research",
    "AI funding stages",
    "NYC AI hiring",
    "AI companies in New York",
  ],
} as const;

export function getConfiguredSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL;
}
