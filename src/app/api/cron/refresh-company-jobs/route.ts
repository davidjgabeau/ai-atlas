import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { refreshCompanyJobs } from "@/lib/jobs/refreshCompanyJobs";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  const result = await refreshCompanyJobs();

  revalidatePath("/jobs");
  revalidatePath("/");

  return NextResponse.json(result);
}

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret) return authorization === `Bearer ${cronSecret}`;

  return process.env.NODE_ENV !== "production";
}
