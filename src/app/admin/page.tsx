import { AdminAccessPanel } from "@/components/market-map/admin-access-panel";
import { AdminConsole } from "@/components/market-map/admin-console";
import { PublicShell } from "@/components/site/public-shell";
import { getAdminEmails, isAdminEnabled } from "@/lib/admin";
import { getCurrentAdminUser, getCurrentUserEmail } from "@/lib/admin-server";
import {
  getAdminSocialEngagements,
  getAdminSocialPosts,
  getAdminSocialRuns,
} from "@/lib/social-automation/store";
import {
  getAdminMarketCompanies,
  getAdminMarketSubmissions,
} from "@/lib/supabase/market-data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const adminEmail = getAdminEmails()[0] ?? "davidgabeau92@gmail.com";
  const [adminUser, currentUserEmail] = await Promise.all([
    getCurrentAdminUser(),
    getCurrentUserEmail(),
  ]);

  const isAllowed = isAdminEnabled() && adminUser;
  const [companies, submissions, socialPosts, socialRuns, socialEngagements] =
    isAllowed
    ? await Promise.all([
        getAdminMarketCompanies(),
        getAdminMarketSubmissions(),
        getAdminSocialPosts(),
        getAdminSocialRuns(),
        getAdminSocialEngagements(),
      ])
    : [[], [], [], [], []];

  return (
    <PublicShell>
      <section className="hero">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.01em] text-[#7A746C]">
            Internal curation
          </p>
          <h1 className="mt-3 max-w-[680px] font-heading text-[clamp(40px,5vw,64px)] font-medium leading-[0.95] tracking-[-0.04em] text-[#181818]">
            Curation Studio
          </h1>
          <p className="mt-4 max-w-[680px] text-base leading-[1.6] text-[#5F5A52]">
            Review hot NYC AI startups, tune momentum labels, manage the
            directory, feature editorial picks, and triage founder submissions.
          </p>
        </div>
      </section>
      <section>
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {isAllowed ? (
            <AdminConsole
              adminEmail={adminUser.email}
              initialCompanies={companies}
              initialSubmissions={submissions}
              initialSocialPosts={socialPosts}
              initialSocialRuns={socialRuns}
              initialSocialEngagements={socialEngagements}
            />
          ) : (
            <AdminAccessPanel
              adminEmail={adminEmail}
              currentUserEmail={currentUserEmail}
            />
          )}
        </div>
      </section>
    </PublicShell>
  );
}
