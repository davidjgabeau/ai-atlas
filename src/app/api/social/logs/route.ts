import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin-server";
import {
  getAdminSocialDispatchLogs,
  getAdminSocialRuns,
} from "@/lib/social-automation/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const { errorResponse } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const [runs, logs] = await Promise.all([
    getAdminSocialRuns(50),
    getAdminSocialDispatchLogs(),
  ]);

  return NextResponse.json({
    ok: true,
    runs,
    logs,
  });
}
