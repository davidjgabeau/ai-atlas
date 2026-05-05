import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin-server";
import { runConservativeSocialEngagement } from "@/lib/social-automation/engagement";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST() {
  const { errorResponse } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const result = await runConservativeSocialEngagement();
  return NextResponse.json(result);
}
