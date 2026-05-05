import { NextResponse } from "next/server";

import { runRefreshKnownCompanies } from "@/lib/agent/pipeline";
import { revalidateMarketPages } from "@/lib/admin-revalidate";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const run = await runRefreshKnownCompanies();
  revalidateMarketPages();
  return NextResponse.json({ ok: run.status !== "failed", run });
}

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret) return authorization === `Bearer ${cronSecret}`;

  return process.env.NODE_ENV !== "production";
}
