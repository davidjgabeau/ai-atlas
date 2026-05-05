import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin-server";
import { verifySocialHandles } from "@/lib/social-automation/handles";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { errorResponse } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const payload = (await request.json().catch(() => null)) as
    | { limit?: number }
    | null;
  const result = await verifySocialHandles(payload?.limit);

  return NextResponse.json(result);
}
