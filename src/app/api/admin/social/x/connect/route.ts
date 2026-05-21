import { createHash, randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { requireAdminRequest } from "@/lib/admin-server";
import { getSocialAutomationConfig } from "@/lib/social-automation/config";

export const dynamic = "force-dynamic";

const xAuthorizeUrl = "https://x.com/i/oauth2/authorize";
const oauthStateCookie = "ai_atlas_x_oauth_state";
const oauthVerifierCookie = "ai_atlas_x_oauth_verifier";
const scopes = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "media.write",
  "offline.access",
];

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const config = getSocialAutomationConfig();
  if (!config.xClientId) {
    return htmlResponse(
      "X OAuth is not configured",
      "X_CLIENT_ID is missing in production. Add it in Vercel, then try again.",
      500,
    );
  }

  const state = createToken();
  const verifier = createToken(64);
  const challenge = base64UrlEncode(
    createHash("sha256").update(verifier).digest(),
  );
  const callbackUrl = new URL("/api/admin/social/x/callback", request.url);
  const authorizeUrl = new URL(xAuthorizeUrl);

  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", config.xClientId);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl.toString());
  authorizeUrl.searchParams.set("scope", scopes.join(" "));
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
    maxAge: 10 * 60,
    path: "/api/admin/social/x",
  };

  response.cookies.set(oauthStateCookie, state, cookieOptions);
  response.cookies.set(oauthVerifierCookie, verifier, cookieOptions);

  return response;
}

function createToken(bytes = 32) {
  return base64UrlEncode(randomBytes(bytes));
}

function base64UrlEncode(value: Buffer) {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function htmlResponse(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
      title,
    )}</title></head><body style="font-family: ui-sans-serif, system-ui; max-width: 680px; margin: 80px auto; line-height: 1.5;"><h1>${escapeHtml(
      title,
    )}</h1><p>${escapeHtml(body)}</p></body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
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
