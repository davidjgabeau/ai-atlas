import { NextResponse } from "next/server";

import { dispatchScheduledSocialPosts } from "@/lib/social-automation/dispatch";
import { generateSocialDrafts } from "@/lib/social-automation/generator";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startedAt = Date.now();
  if (!(await isAuthorizedHourlyScheduler(request))) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized scheduler request." },
      { status: 401 },
    );
  }

  try {
    const generation = await generateSocialDrafts();
    const dispatch = await dispatchScheduledSocialPosts();
    console.log(
      JSON.stringify({
        level: "info",
        route: "/api/social/hourly/dispatch",
        msg: "done",
        generationStatus: generation.status,
        generationDraftsCreated: generation.draftsCreated,
        dispatchStatus: dispatch.status,
        published: dispatch.published,
        skippedReason: dispatch.skippedReason,
        errors: [...generation.errors, ...dispatch.errors],
        ms: Date.now() - startedAt,
      }),
    );

    return NextResponse.json({
      ok: generation.status !== "failed" && dispatch.ok,
      generation,
      dispatch,
      scheduler: "github-actions",
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        route: "/api/social/hourly/dispatch",
        msg: "failed",
        error: error instanceof Error ? error.message : String(error),
        ms: Date.now() - startedAt,
      }),
    );

    return NextResponse.json(
      { ok: false, error: "Hourly social dispatch failed." },
      { status: 500 },
    );
  }
}

async function isAuthorizedHourlyScheduler(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return false;

  return verifyGitHubActionsToken(token);
}

async function verifyGitHubActionsToken(token: string) {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) return false;

    const header = JSON.parse(base64UrlDecodeToString(encodedHeader)) as {
      alg?: string;
      kid?: string;
    };
    const payload = JSON.parse(base64UrlDecodeToString(encodedPayload)) as {
      aud?: string | string[];
      exp?: number;
      iss?: string;
      nbf?: number;
      ref?: string;
      repository?: string;
    };

    if (header.alg !== "RS256" || !header.kid) return false;
    if (payload.iss !== "https://token.actions.githubusercontent.com") return false;
    if (!matchesAudience(payload.aud)) return false;
    if (payload.repository !== getAllowedSchedulerRepository()) return false;
    if (payload.ref !== "refs/heads/main") return false;

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return false;
    if (payload.nbf && payload.nbf > now + 30) return false;

    const response = await fetch("https://token.actions.githubusercontent.com/.well-known/jwks", {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return false;

    const jwks = (await response.json()) as {
      keys?: Array<JsonWebKey & { kid?: string }>;
    };
    const key = jwks.keys?.find((item) => item.kid === header.kid);
    if (!key) return false;

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      key,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );

    return crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      cryptoKey,
      base64UrlDecode(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
  } catch {
    return false;
  }
}

function matchesAudience(audience: string | string[] | undefined) {
  if (Array.isArray(audience)) return audience.includes("aiatlas-social-hourly");

  return audience === "aiatlas-social-hourly";
}

function getAllowedSchedulerRepository() {
  return process.env.SOCIAL_SCHEDULER_GITHUB_REPOSITORY || "davidjgabeau/ai-atlas";
}

function base64UrlDecodeToString(value: string) {
  return new TextDecoder().decode(base64UrlDecode(value));
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64");
}
