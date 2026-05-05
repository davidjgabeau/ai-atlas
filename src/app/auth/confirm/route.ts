import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

const fallbackPath = "/profile";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const redirectTo = createRedirectUrl(requestUrl);
  const authError =
    requestUrl.searchParams.get("error_description") ??
    requestUrl.searchParams.get("error");

  if (authError) {
    return redirectWithAuthError(redirectTo, authError);
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return redirectWithAuthError(
      redirectTo,
      "Profile accounts are not configured yet.",
    );
  }

  const code = requestUrl.searchParams.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      redirectTo.searchParams.set("confirmed", "1");
      return NextResponse.redirect(redirectTo);
    }

    return redirectWithAuthError(redirectTo, error.message);
  }

  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      redirectTo.searchParams.set("confirmed", "1");
      return NextResponse.redirect(redirectTo);
    }

    return redirectWithAuthError(redirectTo, error.message);
  }

  return redirectWithAuthError(
    redirectTo,
    "That sign-in link is missing the verification code.",
  );
}

function createRedirectUrl(requestUrl: URL) {
  const redirectTo = new URL(fallbackPath, requestUrl.origin);
  const next = requestUrl.searchParams.get("next");

  if (next?.startsWith("/") && !next.startsWith("//")) {
    redirectTo.pathname = next;
  }

  return redirectTo;
}

function redirectWithAuthError(redirectTo: URL, message: string) {
  redirectTo.searchParams.set("auth_error", message);
  return NextResponse.redirect(redirectTo);
}
