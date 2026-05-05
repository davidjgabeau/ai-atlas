import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin-server";
import { generateSocialDrafts } from "@/lib/social-automation/generator";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST() {
  const { errorResponse } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const result = await generateSocialDrafts();
  return NextResponse.json(result);
}
