import { NextResponse } from "next/server";

import { dispatchScheduledSocialPosts } from "@/lib/social-automation/dispatch";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startedAt = Date.now();
  if (!isAuthorizedCronRequest(request)) {
    console.warn(
      JSON.stringify({
        level: "warn",
        route: "/api/cron/social-dispatch",
        msg: "unauthorized",
      }),
    );
    return NextResponse.json(
      { ok: false, error: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  try {
    const result = await dispatchScheduledSocialPosts();
    console.log(
      JSON.stringify({
        level: "info",
        route: "/api/cron/social-dispatch",
        msg: "done",
        status: result.status,
        published: result.published,
        skippedReason: result.skippedReason,
        errors: result.errors,
        ms: Date.now() - startedAt,
      }),
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        route: "/api/cron/social-dispatch",
        msg: "failed",
        error: error instanceof Error ? error.message : String(error),
        ms: Date.now() - startedAt,
      }),
    );
    return NextResponse.json(
      { ok: false, error: "Social dispatch failed." },
      { status: 500 },
    );
  }
}

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret) return authorization === `Bearer ${cronSecret}`;

  return process.env.NODE_ENV !== "production";
}
