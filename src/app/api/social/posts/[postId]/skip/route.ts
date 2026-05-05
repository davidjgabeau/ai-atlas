import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin-server";
import { markSocialPostSkipped } from "@/lib/social-automation/store";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: RouteContext) {
  const { postId } = await context.params;
  const { errorResponse } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const payload = (await request.json().catch(() => null)) as
    | { reason?: string }
    | null;
  const post = await markSocialPostSkipped({
    postId,
    reason: payload?.reason ?? "Skipped from admin queue.",
  });

  if (!post) {
    return NextResponse.json(
      { ok: false, error: "Unable to skip social post." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, post });
}
