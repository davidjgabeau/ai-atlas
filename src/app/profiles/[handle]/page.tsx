import type { Metadata } from "next";

import { PublicProfileClient } from "@/components/profile/public-profile-client";
import { PublicShell } from "@/components/site/public-shell";
import { normalizeProfileHandle } from "@/lib/profile-store";
import { createShareMetadata } from "@/lib/seo/shareMetadata";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublishedCompanies } from "@/lib/supabase/market-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const normalizedHandle = normalizeProfileHandle(handle);
  const profile = await getPublicProfileMetadata(normalizedHandle);
  const name = profile?.name ?? `@${normalizedHandle}`;

  return createShareMetadata({
    title: `${name} on AI Atlas NYC`,
    description: `View ${name}'s saved early-stage NYC AI companies and public profile on AI Atlas NYC.`,
    path: `/profiles/${normalizedHandle}`,
    absoluteTitle: true,
  });
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const companies = await getPublishedCompanies();

  return (
    <PublicShell>
      <PublicProfileClient
        handle={normalizeProfileHandle(handle)}
        companies={companies}
      />
    </PublicShell>
  );
}

async function getPublicProfileMetadata(handle: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("name")
    .eq("handle", handle)
    .maybeSingle<{ name: string }>();

  if (error || !data?.name) return null;

  return data;
}
