import { PublicProfileClient } from "@/components/profile/public-profile-client";
import { PublicShell } from "@/components/site/public-shell";
import { normalizeProfileHandle } from "@/lib/profile-store";
import { getPublishedCompanies } from "@/lib/supabase/market-data";

export const dynamic = "force-dynamic";

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
