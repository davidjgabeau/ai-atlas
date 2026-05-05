"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Heart, UserRound } from "lucide-react";

import { Avatar } from "@/components/avatars/Avatar";
import { WatchingCompanyList } from "@/components/profile/watching-company-list";
import { Button } from "@/components/ui/button";
import { useLocalProfile } from "@/hooks/use-local-profile";
import { normalizeProfileHandle } from "@/lib/profile-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Company } from "@/types/market";
import type { UserProfile } from "@/types/profile";

type PublicProfileClientProps = {
  handle: string;
  companies: Company[];
};

type ProfileRow = {
  user_id: string;
  handle: string;
  name: string;
  one_line_bio: string;
  avatar_id: string;
  created_at: string;
  updated_at: string;
};

type SavedCompanyRow = {
  company_id: string;
};

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    userId: row.user_id,
    handle: row.handle,
    name: row.name,
    bio: row.one_line_bio,
    avatarId: row.avatar_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function PublicProfileClient({
  handle,
  companies,
}: PublicProfileClientProps) {
  const normalizedHandle = normalizeProfileHandle(handle);
  const { profile: viewerProfile, ready: viewerReady } = useLocalProfile();
  const [publicProfile, setPublicProfile] = useState<UserProfile | null>(null);
  const [watchingCompanyIds, setWatchingCompanyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseBrowserClient();

    async function loadPublicProfile() {
      if (!supabase) {
        setError("Profiles are not configured yet.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, handle, name, one_line_bio, avatar_id, created_at, updated_at")
        .eq("handle", normalizedHandle)
        .limit(1)
        .returns<ProfileRow[]>();

      if (!isMounted) return;

      if (profileError) {
        setError(profileError.message);
        setPublicProfile(null);
        setWatchingCompanyIds([]);
        setLoading(false);
        return;
      }

      const nextProfile = profiles?.[0] ? mapProfileRow(profiles[0]) : null;

      if (!nextProfile?.userId) {
        setPublicProfile(null);
        setWatchingCompanyIds([]);
        setLoading(false);
        return;
      }

      const { data: savedRows, error: savedError } = await supabase
        .from("saved_companies")
        .select("company_id")
        .eq("user_id", nextProfile.userId)
        .order("created_at", { ascending: false })
        .returns<SavedCompanyRow[]>();

      if (!isMounted) return;

      setPublicProfile(nextProfile);
      setWatchingCompanyIds(
        savedError ? [] : (savedRows ?? []).map((row) => row.company_id),
      );
      setError(savedError?.message ?? "");
      setLoading(false);
    }

    void loadPublicProfile();

    return () => {
      isMounted = false;
    };
  }, [normalizedHandle]);

  const isCurrentProfile =
    viewerReady && viewerProfile?.handle === publicProfile?.handle;
  const watchingCompanies = useMemo(
    () =>
      watchingCompanyIds
        .map((id) => companies.find((company) => company.id === id))
        .filter((company): company is Company => Boolean(company)),
    [companies, watchingCompanyIds],
  );

  if (loading) {
    return (
      <section className="bg-section">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="h-48 animate-pulse rounded-md bg-[rgb(154_61_43_/_0.06)] app-card-border" />
        </div>
      </section>
    );
  }

  if (!publicProfile) {
    return (
      <section className="bg-section">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-[rgb(154_61_43_/_0.10)] text-[#9A3D2B] ring-1 ring-[#E7E1D8]">
            <UserRound className="size-6" />
          </div>
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.01em] text-[#9A3D2B]">
            Profile
          </p>
          <h1 className="mt-3 font-heading text-[clamp(40px,5vw,64px)] font-medium leading-[0.95] tracking-[-0.04em] text-[#181818]">
            @{normalizedHandle} is not published yet.
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-base leading-[1.6] text-[#5F5A52]">
            {error ||
              "Create an AI Atlas account to publish a profile and saved companies list."}
          </p>
          <Button asChild className="mt-5 app-primary-button">
            <Link href="/profile">
              Create your profile
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="hero">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.01em] text-[#9A3D2B]">
              Public profile
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar avatarId={publicProfile.avatarId} size="lg" />
              <div>
                <h1 className="font-heading text-[clamp(40px,5vw,64px)] font-medium leading-[0.95] tracking-[-0.04em] text-[#181818]">
                  {publicProfile.name}
                </h1>
                <p className="mt-1 text-sm font-medium text-[#9A3D2B]">
                  @{publicProfile.handle}
                </p>
              </div>
            </div>
            <p className="mt-6 max-w-[680px] text-base leading-[1.6] text-[#5F5A52]">
              {publicProfile.bio}
            </p>
          </div>

          <div className="rounded-md bg-[var(--app-surface)] p-5 shadow-sm app-card-border">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-md bg-[rgb(154_61_43_/_0.10)] text-[#9A3D2B] ring-1 ring-[#E7E1D8]">
                <Heart className="size-5 fill-current" />
              </span>
              <div>
                <p className="font-semibold text-[#181818]">Saved companies</p>
                <p className="text-sm text-[#5F5A52]">
                  {watchingCompanies.length} saved companies
                </p>
              </div>
            </div>
            {isCurrentProfile ? (
              <Button asChild variant="outline" className="mt-6 w-full bg-[var(--app-surface)]">
                <Link href="/profile">Edit profile</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-section">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.01em] text-[#9A3D2B]">
                Saved Companies
              </p>
              <h2 className="mt-2 font-heading text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.02em] text-[#181818]">
                Companies on this radar
              </h2>
            </div>
            <Button asChild className="app-primary-button">
              <Link href="/companies">
                Browse atlas
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <WatchingCompanyList
            companies={watchingCompanies}
            emptyTitle="No saved companies yet"
            emptyDescription="This profile has not saved any companies yet."
          />
        </div>
      </section>
    </>
  );
}
