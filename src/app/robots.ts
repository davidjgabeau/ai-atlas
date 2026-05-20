import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/config";

const disallowedPaths = [
  "/admin",
  "/api",
  "/private",
  "/drafts",
  "/preview",
  "/auth",
  "/debug",
  "/agent",
];

const publicDiscoveryPaths = ["/", "/og", "/llms.txt", "/llms-full.txt"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: publicDiscoveryPaths,
        disallow: disallowedPaths,
      },
      {
        userAgent: ["OAI-SearchBot", "ChatGPT-User", "GPTBot"],
        allow: publicDiscoveryPaths,
        disallow: disallowedPaths,
      },
      {
        userAgent: ["ClaudeBot", "Claude-SearchBot", "Claude-User"],
        allow: publicDiscoveryPaths,
        disallow: disallowedPaths,
      },
      {
        userAgent: ["PerplexityBot", "Perplexity-User", "Applebot", "Google-Extended"],
        allow: publicDiscoveryPaths,
        disallow: disallowedPaths,
      },
    ],
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
