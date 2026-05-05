import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type CompanySyncRow = {
  id: string;
  name: string;
  slug: string;
  x_handle: string;
  x_user_id?: string;
};

type XUser = {
  id: string;
  name: string;
  username: string;
};

type XPost = {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: Record<string, number>;
  attachments?: {
    media_keys?: string[];
  };
};

type XMedia = {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
};

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const xBearerToken =
    process.env.X_BEARER_TOKEN ?? process.env.TWITTER_BEARER_TOKEN ?? "";

  if (!xBearerToken) {
    return NextResponse.json({
      ok: true,
      synced: false,
      reason: "X_BEARER_TOKEN is not configured.",
      postsUpserted: 0,
    });
  }

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id,name,slug,x_handle,x_user_id")
    .eq("status", "published")
    .neq("x_handle", "")
    .order("x_last_synced_at", { ascending: true, nullsFirst: true })
    .limit(getSyncCompanyLimit());

  if (error || !companies) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unable to load companies." },
      { status: 500 },
    );
  }

  let postsUpserted = 0;
  const errors: Array<{ company: string; error: string }> = [];
  const syncedCompanySlugs = new Set<string>();

  for (const company of companies as CompanySyncRow[]) {
    const handle = normalizeHandle(company.x_handle);
    if (!handle) continue;

    try {
      const user = await getXUser(handle, xBearerToken);
      const timeline = await getXUserPosts(user.id, xBearerToken);
      const rows = timeline.posts.map((post) => ({
        company_id: company.id,
        platform: "x",
        external_post_id: post.id,
        author_handle: user.username,
        author_name: user.name,
        post_text: post.text,
        post_url: `https://x.com/${user.username}/status/${post.id}`,
        posted_at: post.created_at,
        metrics: post.public_metrics ?? {},
        media: getPostMedia(post, timeline.media),
        raw: post,
        synced_at: new Date().toISOString(),
      }));

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from("company_social_posts")
          .upsert(rows, { onConflict: "platform,external_post_id" });

        if (upsertError) {
          throw new Error(upsertError.message);
        }
      }

      await supabase
        .from("companies")
        .update({
          x_handle: user.username,
          x_user_id: user.id,
          x_last_synced_at: new Date().toISOString(),
        })
        .eq("id", company.id);

      postsUpserted += rows.length;
      syncedCompanySlugs.add(company.slug);
    } catch (syncError) {
      errors.push({
        company: company.name,
        error:
          syncError instanceof Error
            ? syncError.message
            : "Unknown sync error.",
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/feed");
  revalidatePath("/companies");

  for (const slug of syncedCompanySlugs) {
    revalidatePath(`/companies/${slug}`);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    synced: true,
    companiesChecked: companies.length,
    companiesSynced: syncedCompanySlugs.size,
    postsUpserted,
    errors,
  });
}

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret) return authorization === `Bearer ${cronSecret}`;

  return process.env.NODE_ENV !== "production";
}

async function getXUser(username: string, bearerToken: string): Promise<XUser> {
  const response = await fetch(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=verified,verified_type`,
    {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`X user lookup failed for @${username}: ${response.status}`);
  }

  const payload = (await response.json()) as { data?: XUser };
  if (!payload.data?.id) {
    throw new Error(`X user lookup returned no user for @${username}.`);
  }

  return payload.data;
}

async function getXUserPosts(userId: string, bearerToken: string) {
  const url = new URL(`https://api.x.com/2/users/${userId}/tweets`);
  url.searchParams.set("max_results", "10");
  url.searchParams.set("exclude", "retweets,replies");
  url.searchParams.set(
    "tweet.fields",
    "created_at,public_metrics,attachments",
  );
  url.searchParams.set("expansions", "attachments.media_keys");
  url.searchParams.set("media.fields", "media_key,type,url,preview_image_url");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`X timeline lookup failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: XPost[];
    includes?: {
      media?: XMedia[];
    };
  };

  return {
    posts: payload.data ?? [],
    media: payload.includes?.media ?? [],
  };
}

function getPostMedia(post: XPost, media: XMedia[]) {
  const mediaByKey = new Map(media.map((item) => [item.media_key, item]));

  return (post.attachments?.media_keys ?? [])
    .map((mediaKey) => mediaByKey.get(mediaKey))
    .filter((item): item is XMedia => Boolean(item))
    .map((item) => ({
      type: item.type,
      url: item.url,
      preview_image_url: item.preview_image_url,
    }));
}

function getSyncCompanyLimit() {
  const value = Number(process.env.X_SYNC_COMPANY_LIMIT ?? "60");

  return Number.isFinite(value) && value > 0 ? value : 60;
}

function normalizeHandle(value: string) {
  return value.replace(/^@/, "").trim();
}
