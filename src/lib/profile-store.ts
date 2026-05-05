import { isAvatarId, resolveAvatarId } from "@/lib/avatars/avatarCatalog";
import { getOrCreateAnonymousAvatarId } from "@/lib/avatars/avatarStorage";
import type { UserProfile, UserProfileInput } from "@/types/profile";

export const PROFILE_STORAGE_KEY = "ai-atlas-nyc.profile.v1";
export const WATCHING_STORAGE_KEY = "ai-atlas-nyc.watching.v1";
export const PROFILE_STORE_EVENT = "ai-atlas-nyc-profile-change";

export function normalizeProfileHandle(value: string) {
  const handle = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return handle || "nyc-ai-reader";
}

export function getProfileUrl(handle: string) {
  return `/profiles/${normalizeProfileHandle(handle)}`;
}

export function readStoredProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const rawProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!rawProfile) return null;

    return JSON.parse(rawProfile) as UserProfile;
  } catch {
    return null;
  }
}

export function writeStoredProfile(input: UserProfileInput) {
  if (typeof window === "undefined") return null;

  const existingProfile = readStoredProfile();
  const now = new Date().toISOString();
  const avatarId = getProfileAvatarId(input.avatarId, existingProfile);
  const profile: UserProfile = {
    handle: normalizeProfileHandle(input.handle),
    name: input.name.trim() || "NYC AI reader",
    bio:
      input.bio.trim() ||
      "Saving early-stage NYC AI companies from pre-seed through Series A.",
    avatarId,
    createdAt: existingProfile?.createdAt ?? now,
    updatedAt: now,
  };

  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  emitProfileStoreChange();

  return profile;
}

function getProfileAvatarId(
  inputAvatarId: string | undefined,
  existingProfile: UserProfile | null,
) {
  if (isAvatarId(inputAvatarId)) {
    return resolveAvatarId(inputAvatarId);
  }
  if (isAvatarId(existingProfile?.avatarId)) {
    return resolveAvatarId(existingProfile?.avatarId);
  }

  return getOrCreateAnonymousAvatarId();
}

export function readWatchingCompanyIds() {
  if (typeof window === "undefined") return [];

  try {
    const rawIds = window.localStorage.getItem(WATCHING_STORAGE_KEY);
    if (!rawIds) return [];

    const ids = JSON.parse(rawIds);
    if (!Array.isArray(ids)) return [];

    return ids.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function writeWatchingCompanyIds(companyIds: string[]) {
  if (typeof window === "undefined") return [];

  const dedupedIds = Array.from(new Set(companyIds));
  window.localStorage.setItem(WATCHING_STORAGE_KEY, JSON.stringify(dedupedIds));
  emitProfileStoreChange();

  return dedupedIds;
}

export function toggleWatchingCompany(companyId: string) {
  const savedIds = readWatchingCompanyIds();
  const isSaved = savedIds.includes(companyId);
  const nextIds = isSaved
    ? savedIds.filter((id) => id !== companyId)
    : [companyId, ...savedIds];

  writeWatchingCompanyIds(nextIds);

  return !isSaved;
}

export function emitProfileStoreChange() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(PROFILE_STORE_EVENT));
}
