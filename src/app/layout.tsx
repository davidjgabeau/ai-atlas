import type { Metadata } from "next";
import { Inter, Libre_Franklin, Newsreader } from "next/font/google";
import { Suspense } from "react";

import { RouteTransitionFeedback } from "@/components/site/route-transition-feedback";
import { CursorCompanion } from "@/components/ui/CursorCompanion";
import { SEO_DEFAULTS } from "@/lib/seo/config";
import {
  absoluteUrl,
  getShareImageUrl,
  getSiteUrl,
  shareCta,
  xAccountHandle,
} from "@/lib/seo/shareMetadata";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const libreFranklin = Libre_Franklin({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SEO_DEFAULTS.defaultTitle,
    template: SEO_DEFAULTS.titleTemplate,
  },
  description: SEO_DEFAULTS.description,
  keywords: [...SEO_DEFAULTS.keywords],
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: SEO_DEFAULTS.defaultTitle,
    description: SEO_DEFAULTS.description,
    url: absoluteUrl("/"),
    siteName: SEO_DEFAULTS.siteName,
    type: "website",
    images: [
      {
        url: getShareImageUrl({ page: "home" }),
        width: 1200,
        height: 630,
        alt: "AI Atlas NYC preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: xAccountHandle,
    creator: xAccountHandle,
    title: SEO_DEFAULTS.defaultTitle,
    description: SEO_DEFAULTS.description,
    images: [getShareImageUrl({ page: "home" })],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: getSearchVerificationMetadata(),
  applicationName: "AI Atlas NYC",
  appleWebApp: {
    title: "AI Atlas NYC",
    capable: true,
  },
  other: {
    "theme-color": "#F8F6F1",
    "og:cta": shareCta,
  },
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "16x16 32x32 48x48 64x64",
      },
      {
        url: "/icons/globe.png",
        sizes: "64x64",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/globe.png",
        sizes: "64x64",
        type: "image/png",
      },
    ],
  },
};

function getSearchVerificationMetadata(): Metadata["verification"] {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const bing = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

  if (!google && !bing) return undefined;

  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${libreFranklin.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--app-bg)] text-[#181818]">
        <Suspense fallback={null}>
          <RouteTransitionFeedback />
        </Suspense>
        {children}
        <CursorCompanion />
      </body>
    </html>
  );
}
