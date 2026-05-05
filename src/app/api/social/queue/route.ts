import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin-server";
import {
  getAdminSocialEngagements,
  getAdminSocialPosts,
  getAdminSocialRuns,
} from "@/lib/social-automation/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const { errorResponse } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const [posts, engagements, runs] = await Promise.all([
    getAdminSocialPosts(),
    getAdminSocialEngagements(),
    getAdminSocialRuns(),
  ]);

  return NextResponse.json({
    ok: true,
    posts,
    engagements,
    runs,
  });
}
