import { Buffer } from "node:buffer";

import { NextResponse, type NextRequest } from "next/server";

import { requireAdminRequest } from "@/lib/admin-server";
import { getSocialAutomationConfig } from "@/lib/social-automation/config";
import { saveStoredXTokens } from "@/lib/social-automation/x-token-store";

export const dynamic = "force-dynamic";

const xTokenUrl = "https://api.x.com/2/oauth2/token";
const oauthStateCookie = "ai_atlas_x_oauth_state";
const oauthVerifierCookie = "ai_atlas_x_oauth_verifier";

type XTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const requestUrl = new URL(request.url);
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (error) {
    return finishResponse({
      title: "X authorization was not completed",
      body: errorDescription || error,
      status: 400,
      ok: false,
    });
  }

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const expectedState = request.cookies.get(oauthStateCookie)?.value;
  const verifier = request.cookies.get(oauthVerifierCookie)?.value;

  if (!code || !state || !expectedState || !verifier || state !== expectedState) {
    return finishResponse({
      title: "X authorization expired",
      body: "Start the X connection again from AI Atlas.",
      status: 400,
      ok: false,
    });
  }

  const config = getSocialAutomationConfig();
  if (!config.xClientId) {
    return finishResponse({
      title: "X OAuth is not configured",
      body: "X_CLIENT_ID is missing in production.",
      status: 500,
      ok: false,
    });
  }

  const callbackUrl = new URL("/api/admin/social/x/callback", request.url);
  const tokenResult = await exchangeCodeForTokens({
    code,
    verifier,
    redirectUri: callbackUrl.toString(),
    clientId: config.xClientId,
    clientSecret: config.xClientSecret,
  });

  if (!tokenResult.ok) {
    return finishResponse({
      title: "X authorization failed",
      body: tokenResult.reason,
      status: 400,
      ok: false,
    });
  }

  const saved = await saveStoredXTokens({
    accessToken: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken,
  });

  if (!saved) {
    return finishResponse({
      title: "X tokens could not be saved",
      body: "AI Atlas received X write tokens, but could not store them. Check Supabase privileged credentials.",
      status: 500,
      ok: false,
    });
  }

  return finishResponse({
    title: "X is connected",
    body: "AI Atlas can now publish as the authorized X account. Ask Codex to run one social dispatch when you are ready.",
    ok: true,
  });
}

async function exchangeCodeForTokens({
  code,
  verifier,
  redirectUri,
  clientId,
  clientSecret,
}: {
  code: string;
  verifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
    client_id: clientId,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(
      `${clientId}:${clientSecret}`,
    ).toString("base64")}`;
  }

  const response = await fetch(xTokenUrl, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false as const,
      reason: `X token exchange failed: ${response.status} ${await summarizeResponse(
        response,
      )}`,
    };
  }

  const payload = (await response.json()) as XTokenResponse;
  if (!payload.access_token || !payload.refresh_token) {
    return {
      ok: false as const,
      reason:
        "X did not return both access and refresh tokens. Make sure offline.access is allowed.",
    };
  }

  return {
    ok: true as const,
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
  };
}

async function summarizeResponse(response: Response) {
  const text = await response.text().catch(() => "");
  return text.replace(/\s+/g, " ").trim().slice(0, 220);
}

function finishResponse({
  title,
  body,
  status = 200,
  ok,
}: {
  title: string;
  body: string;
  status?: number;
  ok: boolean;
}) {
  const response = new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
      title,
    )}</title></head><body style="font-family: ui-sans-serif, system-ui; max-width: 680px; margin: 80px auto; line-height: 1.5; background: #f8f6f1; color: #111;"><p style="color: ${
      ok ? "#2f6b4f" : "#a64032"
    }; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;">AI Atlas NYC</p><h1 style="font-family: Georgia, serif; font-size: 42px; line-height: 1;">${escapeHtml(
      title,
    )}</h1><p style="font-size: 18px; color: #66625c;">${escapeHtml(
      body,
    )}</p><p><a href="/api/admin/social/health" style="color: #a64032;">Check X health →</a></p></body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );

  response.cookies.delete(oauthStateCookie);
  response.cookies.delete(oauthVerifierCookie);

  return response;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return replacements[character] ?? character;
  });
}
