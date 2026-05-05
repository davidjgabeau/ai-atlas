import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";

import { CursorCompanion } from "@/components/ui/CursorCompanion";
import {
  createShareMetadata,
  getShareImageUrl,
  getSiteUrl,
  shareCta,
} from "@/lib/seo/shareMetadata";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
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
  ...createShareMetadata({
    title: "AI Atlas NYC",
    description:
      "A curated map of early-stage NYC AI startups from pre-seed through Series A. Explore companies, categories, signals, jobs, and market notes.",
    image: getShareImageUrl({ page: "home" }),
  }),
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--app-bg)] text-[#181818]">
        {children}
        <CursorCompanion />
      </body>
    </html>
  );
}
