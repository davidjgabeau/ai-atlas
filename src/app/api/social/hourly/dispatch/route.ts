import { NextResponse } from "next/server";

import { dispatchScheduledSocialPosts } from "@/lib/social-automation/dispatch";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startedAt = Date.now();
  if (!isAuthorizedHourlyScheduler(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized scheduler request." },
      { status: 401 },
    );
  }

  try {
    const result = await dispatchScheduledSocialPosts();
    console.log(
      JSON.stringify({
        level: "info",
        route: "/api/social/hourly/dispatch",
        msg: "done",
        status: result.status,
        published: result.published,
        skippedReason: result.skippedReason,
        errors: result.errors,
        ms: Date.now() - startedAt,
      }),
    );

    return NextResponse.json({
      ...result,
      scheduler: "github-actions",
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        route: "/api/social/hourly/dispatch",
        msg: "failed",
        error: error instanceof Error ? error.message : String(error),
        ms: Date.now() - startedAt,
      }),
    );

    return NextResponse.json(
      { ok: false, error: "Hourly social dispatch failed." },
      { status: 500 },
    );
  }
}

function isAuthorizedHourlyScheduler(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;

  return request.headers.get("x-ai-atlas-scheduler") === "github-actions";
}
