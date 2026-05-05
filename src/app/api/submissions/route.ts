import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubmissionPayload = {
  company_name?: string;
  website_url?: string;
  founder_name?: string;
  email?: string;
  description?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as SubmissionPayload | null;

  if (!payload?.company_name || !payload.website_url || !payload.email) {
    return NextResponse.json(
      { ok: false, error: "Missing required submission fields." },
      { status: 400 },
    );
  }

  const submission = {
    company_name: payload.company_name.trim(),
    website_url: payload.website_url.trim(),
    founder_name: payload.founder_name?.trim() ?? "",
    email: payload.email.trim(),
    description: payload.description?.trim() ?? "",
    status: "new",
  };

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ ok: true, mode: "local" });
  }

  const { error } = await supabase.from("submissions").insert(submission);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, mode: "supabase" });
}
