import type { Company } from "@/types/market";

const INTRO_REQUEST_EMAIL = "hello@aiatlas.nyc";
const PUBLIC_SITE_URL = "https://aiatlas.nyc";

export function getExternalUrl(url: string) {
  const trimmedUrl = url.trim();

  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

export function getDisplayUrl(url: string) {
  return getExternalUrl(url)
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

export function getIntroRequestMailto(company: Company) {
  const subject = `Intro request: ${company.name}`;
  const body = [
    "Hi David,",
    "",
    `I'd like to request an intro to ${company.name}.`,
    "",
    `Company: ${company.name}`,
    `Website: ${getExternalUrl(company.website_url)}`,
    `AI Atlas profile: ${PUBLIC_SITE_URL}/companies/${company.slug}`,
    "",
    "My name:",
    "My email:",
    "Context for the intro:",
    "",
    "Thanks.",
  ].join("\n");

  return `mailto:${INTRO_REQUEST_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}
