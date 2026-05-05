import { ProfileClient } from "@/components/profile/profile-client";
import { PublicShell } from "@/components/site/public-shell";
import { getPublishedCompanies } from "@/lib/supabase/market-data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const companies = await getPublishedCompanies();

  return (
    <PublicShell>
      <ProfileClient companies={companies} />
    </PublicShell>
  );
}
