import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin-server";
import { saveDispatchLog } from "@/lib/social-automation/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const { errorResponse } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  await saveDispatchLog({
    runType: "admin",
    decision: "pause_requested",
    notes: [
      "Set SOCIAL_KILL_SWITCH=true to pause drafting, scheduling, publishing, and engagement.",
    ],
  });

  return NextResponse.json({
    ok: true,
    message:
      "Pause request logged. Set SOCIAL_KILL_SWITCH=true in the environment to pause all social automation.",
  });
}
