import type { Metadata } from "next";

import { SEO_DEFAULTS, getConfiguredSiteUrl } from "@/lib/seo/config";

export const siteName = SEO_DEFAULTS.siteName;
export const shareCta = "NYC AI, mapped by hand";
export const xAccountHandle = "@AiAtlasNYC";

export function getSiteUrl() {
  return getConfiguredSiteUrl();
}

export function absoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

export function getShareImageUrl(params?: Record<string, string | number | undefined>) {
  const url = new URL("/api/og", getSiteUrl());

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export function truncateMeta(value: string, maxLength = 155) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;

  return `${clean.slice(0, maxLength - 1).replace(/\s+\S*$/, "").trim()}…`;
}

export function createShareMetadata({
  title,
  description,
  path = "/",
  image,
  type = "website",
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  absoluteTitle?: boolean;
}): Metadata {
  const imageUrl = image ?? getShareImageUrl();
  const canonicalUrl = absoluteUrl(path);
  const socialTitle = getSocialTitle(title);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: socialTitle,
      description,
      url: canonicalUrl,
      siteName,
      type,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${title} preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: xAccountHandle,
      creator: xAccountHandle,
      title: socialTitle,
      description,
      images: [imageUrl],
    },
  };
}

export function getSocialTitle(title: string) {
  return title.includes(siteName) ? title : `${title} | ${siteName}`;
}
