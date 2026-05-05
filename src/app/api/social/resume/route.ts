import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin-server";
import { saveDispatchLog } from "@/lib/social-automation/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const { errorResponse } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  await saveDispatchLog({
    runType: "admin",
    decision: "resume_requested",
    notes: [
      "Set SOCIAL_KILL_SWITCH=false to resume safe draft generation and any enabled posting or engagement.",
    ],
  });

  return NextResponse.json({
    ok: true,
    message:
      "Resume request logged. Set SOCIAL_KILL_SWITCH=false in the environment to resume social automation.",
  });
}
