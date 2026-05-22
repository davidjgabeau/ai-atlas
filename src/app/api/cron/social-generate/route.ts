import { NextResponse } from "next/server";

import { generateSocialDrafts } from "@/lib/social-automation/generator";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startedAt = Date.now();
  if (!isAuthorizedCronRequest(request)) {
    console.warn(
      JSON.stringify({
        level: "warn",
        route: "/api/cron/social-generate",
        msg: "unauthorized",
      }),
    );
    return NextResponse.json(
      { ok: false, error: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  try {
    const result = await generateSocialDrafts();
    console.log(
      JSON.stringify({
        level: "info",
        route: "/api/cron/social-generate",
        msg: "done",
        status: result.status,
        candidatesFound: result.candidatesFound,
        draftsCreated: result.draftsCreated,
        skipped: result.skipped,
        errors: result.errors,
        ms: Date.now() - startedAt,
      }),
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        route: "/api/cron/social-generate",
        msg: "failed",
        error: error instanceof Error ? error.message : String(error),
        ms: Date.now() - startedAt,
      }),
    );
    return NextResponse.json(
      { ok: false, error: "Social generation failed." },
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
