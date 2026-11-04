import type { Metadata } from "next";

import FeedPage from "@/app/feed/page";
import { createShareMetadata, getShareImageUrl } from "@/lib/seo/shareMetadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createShareMetadata({
  title: "NYC AI News and Company Posts",
  description:
    "NYC AI news links, broader context, and official posts from mapped companies.",
  path: "/newsfeed",
  image: getShareImageUrl({ page: "feed" }),
});

export default FeedPage;
