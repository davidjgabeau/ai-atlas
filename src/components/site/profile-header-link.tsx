"use client";

import Link from "next/link";

import { Avatar } from "@/components/avatars/Avatar";
import { useViewerAvatar } from "@/components/avatars/useViewerAvatar";
import { useLocalProfile } from "@/hooks/use-local-profile";
import { cn } from "@/lib/utils";

export function ProfileHeaderLink({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { isSignedIn, profile, ready, watchingCompanyIds } = useLocalProfile();
  const { avatarId } = useViewerAvatar(profile);
  const label = profile?.name ?? (isSignedIn ? "Profile" : "Sign in");
  const detail = ready
    ? isSignedIn
      ? `${watchingCompanyIds.length} saved`
      : "Profile"
    : "Profile";

  return (
    <Link
      href="/profile"
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-2 py-1 transition hover:bg-[rgb(17_17_17_/_0.035)]",
        className,
      )}
      aria-label={
        profile ? `Open profile for ${profile.name}` : "Sign in or sign up"
      }
    >
      <Avatar avatarId={avatarId} size="sm" />
      <span className={cn("min-w-0 leading-tight", compact && "hidden xl:block")}>
        <span className="block max-w-28 truncate text-sm font-medium text-[#181818]">
          {label}
        </span>
        <span className="text-meta block max-w-28 truncate text-xs">
          {detail}
        </span>
      </span>
    </Link>
  );
}
