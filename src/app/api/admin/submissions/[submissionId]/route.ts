import { NextResponse } from "next/server";

import { revalidateMarketPages } from "@/lib/admin-revalidate";
import { requireAdminRequest } from "@/lib/admin-server";
import { normalizeSubmission } from "@/lib/supabase/market-data";
import {
  submissionStatuses,
  type SubmissionStatus,
} from "@/types/market";

type RouteContext = {
  params: Promise<{
    submissionId: string;
  }>;
};

type SubmissionPatch = {
  status?: SubmissionStatus;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { submissionId } = await context.params;
  const { errorResponse, supabase } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const payload = (await request.json().catch(() => null)) as SubmissionPatch | null;
  const status = payload?.status;

  if (!submissionStatuses.includes(status as SubmissionStatus)) {
    return NextResponse.json(
      { ok: false, error: "Invalid submission status." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("submissions")
    .update({ status })
    .eq("id", submissionId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  revalidateMarketPages();

  return NextResponse.json({
    ok: true,
    submission: normalizeSubmission(data),
  });
}
