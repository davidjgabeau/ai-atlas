import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin-server";
import { publishSocialPostNow } from "@/lib/social-automation/dispatch";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: RouteContext) {
  const { postId } = await context.params;
  const { errorResponse } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const result = await publishSocialPostNow(postId);
  return NextResponse.json(result);
}
