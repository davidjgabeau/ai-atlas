import type { Metadata } from "next";

export const siteName = "AI Atlas NYC";
export const shareCta = "NYC AI, mapped by hand";
export const xAccountHandle = "@AiAtlasNYC";

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiatlas.nyc";
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
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
}): Metadata {
  const imageUrl = image ?? getShareImageUrl();
  const canonicalUrl = absoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
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
      title,
      description,
      images: [imageUrl],
    },
  };
}
