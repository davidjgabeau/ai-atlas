import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin-server";
import { getSocialAutomationConfig } from "@/lib/social-automation/config";
import { collectSocialPostCandidates } from "@/lib/social-automation/sources";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST() {
  const { errorResponse } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const config = getSocialAutomationConfig();
  if (config.killSwitch) {
    return NextResponse.json({
      ok: true,
      status: "skipped",
      candidates: [],
      errors: ["SOCIAL_KILL_SWITCH is enabled."],
    });
  }

  const result = await collectSocialPostCandidates(config.generationBatchSize);

  return NextResponse.json({
    ok: result.errors.length === 0,
    candidates: result.candidates,
    errors: result.errors,
  });
}
