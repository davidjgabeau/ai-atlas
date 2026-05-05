import { NextResponse } from "next/server";

import { SUPABASE_URL } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

type ValidateOAuthRequest = {
  url?: string;
};

export async function POST(request: Request) {
  let payload: ValidateOAuthRequest;

  try {
    payload = (await request.json()) as ValidateOAuthRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Google sign-in could not be started." },
      { status: 400 },
    );
  }

  const oauthUrl = getTrustedOAuthUrl(payload.url);

  if (!oauthUrl) {
    return NextResponse.json(
      { ok: false, error: "Google sign-in could not be started." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(oauthUrl, {
      cache: "no-store",
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json({ ok: true });
    }

    const message = await getResponseErrorMessage(response);

    return NextResponse.json(
      {
        ok: false,
        error: getFriendlyOAuthError(message),
      },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Google sign-in is not available right now. Try again in a minute.",
      },
      { status: 502 },
    );
  }
}

function getTrustedOAuthUrl(value: unknown) {
  if (typeof value !== "string" || !SUPABASE_URL) return null;

  try {
    const oauthUrl = new URL(value);
    const supabaseUrl = new URL(SUPABASE_URL);

    if (oauthUrl.origin !== supabaseUrl.origin) return null;
    if (oauthUrl.pathname !== "/auth/v1/authorize") return null;
    if (oauthUrl.searchParams.get("provider") !== "google") return null;

    return oauthUrl.toString();
  } catch {
    return null;
  }
}

async function getResponseErrorMessage(response: Response) {
  const text = await response.text();

  if (!text) return response.statusText;

  try {
    const parsed = JSON.parse(text) as { msg?: string; error?: string };
    return parsed.msg ?? parsed.error ?? text;
  } catch {
    return text;
  }
}

function getFriendlyOAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("unsupported provider") ||
    normalized.includes("provider is not enabled")
  ) {
    return "Google sign-in is not enabled in Supabase yet. Add the Google OAuth Client ID and Secret in Supabase Auth, then try again.";
  }

  return message || "Google sign-in could not be started.";
}
