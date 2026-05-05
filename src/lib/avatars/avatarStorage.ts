import {
  defaultAvatarId,
  isAvatarId,
  publicAvatarIds,
  resolveAvatarId,
} from "@/lib/avatars/avatarCatalog";

export const ANONYMOUS_AVATAR_STORAGE_KEY = "aiatlas:anonymousAvatar";
export const ANONYMOUS_AVATAR_STORE_EVENT = "aiatlas-anonymous-avatar-change";

export function getAnonymousAvatarId(): string | null {
  if (typeof window === "undefined") return defaultAvatarId;

  const avatarId = window.localStorage.getItem(ANONYMOUS_AVATAR_STORAGE_KEY);
  const resolvedAvatarId = resolveAvatarId(avatarId);
  return isAvatarId(resolvedAvatarId) ? resolvedAvatarId : null;
}

export function setAnonymousAvatarId(id: string): void {
  if (typeof window === "undefined" || !isAvatarId(id)) return;

  window.localStorage.setItem(
    ANONYMOUS_AVATAR_STORAGE_KEY,
    resolveAvatarId(id) ?? defaultAvatarId,
  );
  window.dispatchEvent(new Event(ANONYMOUS_AVATAR_STORE_EVENT));
}

export function getOrCreateAnonymousAvatarId(): string {
  if (typeof window === "undefined") return defaultAvatarId;

  const existingAvatarId = getAnonymousAvatarId();
  if (existingAvatarId) return existingAvatarId;

  const avatarId = getRandomAvatarId();
  setAnonymousAvatarId(avatarId);
  return avatarId;
}

function getRandomAvatarId() {
  const index = getRandomIndex(publicAvatarIds.length);
  return publicAvatarIds[index] ?? defaultAvatarId;
}

function getRandomIndex(length: number) {
  if (length <= 1) return 0;

  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoApi.getRandomValues(values);
    return values[0] % length;
  }

  return Math.floor(Math.random() * length);
}
