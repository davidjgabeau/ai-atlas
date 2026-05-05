"use client";

import Link from "next/link";
import { PenLine, Sparkles, UserRound } from "lucide-react";

import { Avatar } from "@/components/avatars/Avatar";
import { Button } from "@/components/ui/button";

type ProfileHeroProps = {
  avatarId: string;
  bio: string;
  handle: string;
  hasProfile: boolean;
  isEditing: boolean;
  name: string;
  publicPath: string;
  watchingCount: number;
  onChangeAvatar: () => void;
  onEditProfile: () => void;
};

export function ProfileHero({
  avatarId,
  bio,
  handle,
  hasProfile,
  isEditing,
  name,
  publicPath,
  watchingCount,
  onChangeAvatar,
  onEditProfile,
}: ProfileHeroProps) {
  return (
    <section className="border-b border-[#E7E1D8] bg-[#F8F6F1]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar avatarId={avatarId} size="lg" className="size-[72px]" />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.01em] text-[#9A3D2B]">
              Profile
            </p>
            <h1 className="mt-2 max-w-[720px] font-heading text-[clamp(42px,5vw,72px)] font-medium leading-[0.92] text-[#111111]">
              {name}
            </h1>
            <p className="mt-2 text-sm font-medium text-[#9A3D2B]">
              @{handle}
            </p>
            <p className="mt-4 max-w-[680px] text-base leading-7 text-[#66625C]">
              {bio}
            </p>
            <p className="mt-3 text-sm text-[#66625C]">
              {watchingCount} saved {watchingCount === 1 ? "company" : "companies"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-[#E7E1D8] bg-[#FBFAF7] text-[#111111]"
            onClick={onEditProfile}
          >
            <PenLine className="size-4" />
            Edit profile
          </Button>
          {hasProfile ? (
            <Button
              asChild
              variant="outline"
              className="border-[#E7E1D8] bg-[#FBFAF7] text-[#111111]"
            >
              <Link href={publicPath}>
                <UserRound className="size-4" />
                View public profile
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled
              className="border-[#E7E1D8] bg-[#FBFAF7] text-[#111111]"
            >
                <UserRound className="size-4" />
                View public profile
            </Button>
          )}
          <Button
            type="button"
            className="app-primary-button"
            disabled={hasProfile && !isEditing}
            title={
              hasProfile && !isEditing
                ? "Click Edit profile before changing your avatar"
                : "Change avatar"
            }
            onClick={onChangeAvatar}
          >
            <Sparkles className="size-4" />
            Change avatar
          </Button>
        </div>
      </div>
    </section>
  );
}
