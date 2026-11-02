import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { submissionSchema } from "@/lib/submissions";

export async function POST(request: Request) {
  const parsed = submissionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Enter a company name, a valid http(s) website, and your email. Keep the description under 5,000 characters." },
      { status: 400 },
    );
  }

  const submission = {
    ...parsed.data,
    status: "new",
  };

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Submissions are temporarily unavailable. Please try again later." }, { status: 503 });
  }

  const { error } = await supabase.from("submissions").insert(submission);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "We could not save your submission. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, mode: "supabase" });
}
