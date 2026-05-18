import { NextResponse } from "next/server";

import { toAgentCompanies } from "@/lib/agent/companyAdapter";
import { loadPublishedCompaniesForAgent } from "@/lib/agent/loadCompanies";
import { publishDiscoveredCompanies } from "@/lib/agent/publishDiscoveredCompanies";

import { createVerifiedExpansionProfiles } from "../../../../../scripts/manual-verified-expansion-2026-05-17";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const existingCompanies = toAgentCompanies(await loadPublishedCompaniesForAgent());
  const profiles = createVerifiedExpansionProfiles(existingCompanies);
  const result = await publishDiscoveredCompanies({
    profiles,
    existingCompanies,
    autoApprove: true,
  });

  return NextResponse.json({
    ok: result.errors.length === 0,
    attempted: profiles.length,
    published: result.published,
    errors: result.errors,
    companies: profiles.map((profile) => profile.candidateCompanyName),
  });
}

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret) return authorization === `Bearer ${cronSecret}`;

  return process.env.NODE_ENV !== "production";
}
