import type { Company } from "@/types/market";

type LogoSourceInput = Partial<Pick<Company, "logo_url" | "website_url">> & {
  logoUrl?: string;
  websiteUrl?: string;
};

export function getCompanyLogoSource(input: LogoSourceInput) {
  const logoUrl = normalizeLogoUrl(input.logoUrl ?? input.logo_url);
  if (logoUrl) return logoUrl;

  const domain = getDomainFromUrl(input.websiteUrl ?? input.website_url);
  if (!domain) return "";

  return getFaviconSourceForDomain(domain);
}

export function getFaviconSourceForDomain(domain: string, size = 128) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain,
  )}&sz=${size}`;
}

export function getDomainFromUrl(value?: string) {
  if (!value) return "";

  try {
    const withProtocol = /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`;
    const url = new URL(withProtocol);

    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizeLogoUrl(value?: string) {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (isStaleLocalLogo(trimmed)) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return "";
}

function isStaleLocalLogo(value: string) {
  return value.startsWith("/logos/");
}
