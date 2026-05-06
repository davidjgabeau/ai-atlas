import type { Metadata } from "next";

import InsightsPage from "@/app/insights/page";
import {
  createShareMetadata,
  getShareImageUrl,
  shareCta,
} from "@/lib/seo/shareMetadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...createShareMetadata({
    title: "Current Read",
    description: `Short editorial notes from the full early-stage NYC AI map and latest additions. ${shareCta}.`,
    path: "/highlights",
    image: getShareImageUrl({ page: "insights" }),
  }),
  robots: {
    index: false,
    follow: true,
  },
};

export default InsightsPage;
