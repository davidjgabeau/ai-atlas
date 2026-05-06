import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/private",
        "/drafts",
        "/preview",
        "/auth",
        "/debug",
        "/agent",
      ],
    },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
