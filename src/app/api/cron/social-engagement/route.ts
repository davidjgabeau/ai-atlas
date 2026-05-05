import { NextResponse } from "next/server";

import { runConservativeSocialEngagement } from "@/lib/social-automation/engagement";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  const result = await runConservativeSocialEngagement();
  return NextResponse.json(result);
}

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret) return authorization === `Bearer ${cronSecret}`;

  return process.env.NODE_ENV !== "production";
}
