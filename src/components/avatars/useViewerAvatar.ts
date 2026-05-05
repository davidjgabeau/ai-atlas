"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  defaultAvatarId,
  isAvatarId,
  resolveAvatarId,
} from "@/lib/avatars/avatarCatalog";
import {
  ANONYMOUS_AVATAR_STORE_EVENT,
  getOrCreateAnonymousAvatarId,
  setAnonymousAvatarId,
} from "@/lib/avatars/avatarStorage";

type AvatarUser = {
  avatarId?: string | null;
};

function subscribeToAnonymousAvatarStore(onStoreChange: () => void) {
  window.addEventListener(ANONYMOUS_AVATAR_STORE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(ANONYMOUS_AVATAR_STORE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getClientSnapshot() {
  return getOrCreateAnonymousAvatarId();
}

function getServerSnapshot() {
  return defaultAvatarId;
}

export function useViewerAvatar(user?: AvatarUser | null) {
  const anonymousAvatarId = useSyncExternalStore(
    subscribeToAnonymousAvatarStore,
    getClientSnapshot,
    getServerSnapshot,
  );

  const userAvatarId = isAvatarId(user?.avatarId)
    ? resolveAvatarId(user?.avatarId)
    : null;
  const avatarId = userAvatarId ?? anonymousAvatarId;

  const setAvatarId = useCallback((nextAvatarId: string) => {
    if (!isAvatarId(nextAvatarId)) return;

    setAnonymousAvatarId(nextAvatarId);
  }, []);

  return {
    avatarId,
    setAvatarId,
    isAnonymous: !userAvatarId,
    ready: true,
  };
}
