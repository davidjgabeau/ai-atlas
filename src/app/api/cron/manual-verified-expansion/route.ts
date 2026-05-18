import { NextResponse } from "next/server";

import { toAgentCompanies } from "@/lib/agent/companyAdapter";
import { loadPublishedCompaniesForAgent } from "@/lib/agent/loadCompanies";
import { publishDiscoveredCompanies } from "@/lib/agent/publishDiscoveredCompanies";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

import { createVerifiedExpansionProfiles } from "../../../../../scripts/manual-verified-expansion-2026-05-17";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request) && !isConfirmedManualRun(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const existingCompanies = toAgentCompanies(await loadPublishedCompaniesForAgent());
  const profiles = createVerifiedExpansionProfiles(existingCompanies);
  const existingTableSlugs = await loadExistingCompanySlugs(
    profiles
      .map((profile) => profile.proposedUpdate.slug)
      .filter((slug): slug is string => Boolean(slug)),
  );
  const publishableProfiles = profiles.filter((profile) => {
    const slug = profile.proposedUpdate.slug;
    return !slug || !existingTableSlugs.has(slug);
  });
  const result = await publishDiscoveredCompanies({
    profiles: publishableProfiles,
    existingCompanies,
    autoApprove: true,
  });
  const responsePayload = {
    ok: result.errors.length === 0,
    attempted: profiles.length,
    skippedExisting: profiles.length - publishableProfiles.length,
    published: result.published,
    errors: result.errors,
    companies: publishableProfiles.map((profile) => profile.candidateCompanyName),
    existingSlugs: Array.from(existingTableSlugs),
  };

  console.log("manual verified expansion", responsePayload);

  return NextResponse.json(responsePayload);
}

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret) return authorization === `Bearer ${cronSecret}`;

  return process.env.NODE_ENV !== "production";
}

function isConfirmedManualRun(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("confirm") === "2026-05-17-verified-expansion";
}

async function loadExistingCompanySlugs(slugs: string[]) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase || slugs.length === 0) return new Set<string>();

  const { data, error } = await supabase
    .from("companies")
    .select("slug")
    .in("slug", slugs);

  if (error || !data) return new Set<string>();

  return new Set(
    data
      .map((row) => (typeof row.slug === "string" ? row.slug : ""))
      .filter(Boolean),
  );
}
