import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin-server";
import {
  getSocialAutomationConfig,
  getSocialConfigSnapshot,
} from "@/lib/social-automation/config";
import { saveSocialRun } from "@/lib/social-automation/store";
import { getXAuthHealth } from "@/lib/social-automation/x-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const { errorResponse } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const startedAt = new Date().toISOString();
  const config = getSocialAutomationConfig();
  const health = await getXAuthHealth(config);

  await saveSocialRun({
    task: "health_check",
    startedAt,
    status: health.ok ? "success" : "failed",
    stats: {
      ...getSocialConfigSnapshot(config),
      canRead: health.canRead,
      canWrite: health.canWrite,
      username: health.user?.username,
    },
    errors: health.ok ? [] : [health.reason],
  });

  return NextResponse.json({
    ok: health.ok,
    health,
    config: getSocialConfigSnapshot(config),
  });
}
