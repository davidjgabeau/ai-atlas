import { cache } from "react";

import { getPublishedCompanies } from "@/lib/supabase/market-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Company, CompanySocialPost } from "@/types/market";

type SocialPostRow = Partial<CompanySocialPost> & {
  metrics?: unknown;
  media?: unknown;
};

export type CompanySocialPostWithCompany = CompanySocialPost & {
  company?: Company;
};

export const getCompanySocialPosts = cache(
  async ({
    companyId,
    limit = 50,
  }: {
    companyId?: string;
    limit?: number;
  } = {}): Promise<CompanySocialPost[]> => {
    const supabase = createSupabaseServerClient();
    if (!supabase) return [];

    let query = supabase
      .from("company_social_posts")
      .select("*")
      .order("posted_at", { ascending: false })
      .limit(limit);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.warn("Supabase company social posts fallback:", error?.message);
      return [];
    }

    return (data as SocialPostRow[]).map(normalizeSocialPost);
  },
);

export const getCompanySocialFeed = cache(
  async ({
    companyId,
    limit = 50,
  }: {
    companyId?: string;
    limit?: number;
  } = {}): Promise<CompanySocialPostWithCompany[]> => {
    const [posts, companies] = await Promise.all([
      getCompanySocialPosts({ companyId, limit }),
      getPublishedCompanies(),
    ]);
    const publishedCompanyById = new Map(
      companies.map((company) => [company.id, company]),
    );

    return posts
      .map((post) => ({
        ...post,
        company: publishedCompanyById.get(post.company_id),
      }))
      .filter((post) => Boolean(post.company));
  },
);

function normalizeSocialPost(row: SocialPostRow): CompanySocialPost {
  return {
    id: safeString(row.id, `post_${safeString(row.external_post_id, Date.now().toString())}`),
    company_id: safeString(row.company_id, ""),
    platform: "x",
    external_post_id: safeString(row.external_post_id, ""),
    author_handle: normalizeHandle(row.author_handle),
    author_name: safeString(row.author_name, ""),
    post_text: safeString(row.post_text, ""),
    post_url: safeString(row.post_url, ""),
    posted_at: safeString(row.posted_at, new Date().toISOString()),
    metrics: normalizeMetrics(row.metrics),
    media: normalizeMedia(row.media),
    synced_at: safeString(row.synced_at, ""),
    created_at: safeString(row.created_at, ""),
  };
}

function normalizeMetrics(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => {
      return typeof entry[1] === "number";
    }),
  );
}

function normalizeMedia(value: unknown): CompanySocialPost["media"] {
  if (!Array.isArray(value)) return [];

  const mediaItems: CompanySocialPost["media"] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const media = item as Record<string, unknown>;
    const type = safeString(media.type, "");

    if (type) {
      mediaItems.push({
        type: safeString(media.type, ""),
        url: optionalString(media.url),
        preview_image_url: optionalString(media.preview_image_url),
      });
    }
  }

  return mediaItems;
}

function normalizeHandle(value: unknown) {
  return safeString(value, "").replace(/^@/, "");
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function safeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
