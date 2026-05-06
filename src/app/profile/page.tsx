import type { Metadata } from "next";

import { ProfileClient } from "@/components/profile/profile-client";
import { PublicShell } from "@/components/site/public-shell";
import { getPublishedCompanies } from "@/lib/supabase/market-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProfilePage() {
  const companies = await getPublishedCompanies();

  return (
    <PublicShell>
      <ProfileClient companies={companies} />
    </PublicShell>
  );
}
