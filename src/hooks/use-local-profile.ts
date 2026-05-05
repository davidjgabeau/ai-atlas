"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

import {
  PROFILE_STORE_EVENT,
  emitProfileStoreChange,
  normalizeProfileHandle,
} from "@/lib/profile-store";
import { isAdminEmail } from "@/lib/admin";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserProfile, UserProfileInput } from "@/types/profile";

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

type NewsletterRow = {
  subscribed: boolean;
};

type AuthResult = {
  ok: boolean;
};

type AuthRedirectOptions = {
  next?: string;
};

type SaveProfileOptions = {
  newsletterOptIn?: boolean;
};

type UseLocalProfileOptions = {
  handleAuthRedirect?: boolean;
};

type SupabaseProfileState = {
  profile: UserProfile | null;
  watchingCompanyIds: string[];
  ready: boolean;
  userId: string;
  userEmail: string;
  newsletterOptIn: boolean;
  authBusy: boolean;
  authError: string;
  authMessage: string;
};

const SIGNED_OUT_STATE: SupabaseProfileState = {
  profile: null,
  watchingCompanyIds: [],
  ready: false,
  userId: "",
  userEmail: "",
  newsletterOptIn: true,
  authBusy: false,
  authError: "",
  authMessage: "",
};

const AUTH_REDIRECT_MESSAGE_KEY = "ai-atlas.auth-redirect-message.v1";

type AuthRedirectMessage = {
  error?: string;
  message?: string;
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

function getFriendlyError(message: string) {
  const normalized = message.toLowerCase();

  if (message.toLowerCase().includes("duplicate key")) {
    return "That handle is already taken. Try a slightly different one.";
  }

  if (
    normalized.includes("unsupported provider") ||
    normalized.includes("provider is not enabled")
  ) {
    return "Google sign-in is not enabled in Supabase yet. Add the Google OAuth Client ID and Secret in Supabase Auth, then try again.";
  }

  return message;
}

async function validateOAuthUrlBeforeRedirect(url: string) {
  try {
    const response = await fetch("/api/auth/validate-oauth-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });
    const result = (await response.json()) as {
      ok?: boolean;
      error?: string;
    };

    return {
      ok: response.ok && result.ok === true,
      error: result.error ?? "",
    };
  } catch {
    return {
      ok: false,
      error: "Google sign-in is not available right now. Try again in a minute.",
    };
  }
}

function getConfirmationRedirectUrl(next = "/profile") {
  if (typeof window === "undefined") return undefined;

  const redirectTo = new URL("/auth/confirm", window.location.origin);
  redirectTo.searchParams.set("next", next);

  return redirectTo.toString();
}

function getOAuthRedirectUrl(next = "/profile") {
  return getConfirmationRedirectUrl(next);
}

function getBrowserAuthParams() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);

  return {
    code: params.get("code"),
    error:
      params.get("auth_error") ??
      params.get("error_description") ??
      params.get("error") ??
      "",
    confirmed: params.get("confirmed") === "1",
  };
}

function getAuthRedirectMessageFromUrl(): AuthRedirectMessage | null {
  const params = getBrowserAuthParams();

  if (!params) return null;
  if (params.error) return { error: getFriendlyError(params.error) };
  if (params.confirmed) {
    return { message: "Signed in. Finish your profile." };
  }

  return null;
}

function storeAuthRedirectMessage(message: AuthRedirectMessage) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    AUTH_REDIRECT_MESSAGE_KEY,
    JSON.stringify(message),
  );
}

function readStoredAuthRedirectMessage(): AuthRedirectMessage | null {
  if (typeof window === "undefined") return null;

  try {
    const rawMessage = window.sessionStorage.getItem(AUTH_REDIRECT_MESSAGE_KEY);
    if (!rawMessage) return null;

    return JSON.parse(rawMessage) as AuthRedirectMessage;
  } catch {
    return null;
  }
}

function scheduleStoredAuthRedirectMessageCleanup() {
  if (typeof window === "undefined") return;

  window.setTimeout(() => {
    window.sessionStorage.removeItem(AUTH_REDIRECT_MESSAGE_KEY);
  }, 1000);
}

function clearAuthParamsFromUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const paramsToRemove = [
    "auth_error",
    "code",
    "confirmed",
    "error",
    "error_code",
    "error_description",
    "next",
    "token_hash",
    "type",
  ];

  paramsToRemove.forEach((param) => url.searchParams.delete(param));
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function useLocalProfile({
  handleAuthRedirect = false,
}: UseLocalProfileOptions = {}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const requestIdRef = useRef(0);
  const initialAuthRedirectMessage = useMemo(
    () =>
      handleAuthRedirect
        ? getAuthRedirectMessageFromUrl() ?? readStoredAuthRedirectMessage()
        : null,
    [handleAuthRedirect],
  );
  const initialState = useMemo<SupabaseProfileState>(
    () =>
      supabase
        ? {
            ...SIGNED_OUT_STATE,
            authError: initialAuthRedirectMessage?.error ?? "",
            authMessage: initialAuthRedirectMessage?.message ?? "",
          }
        : {
            ...SIGNED_OUT_STATE,
            ready: true,
            authError:
              initialAuthRedirectMessage?.error ??
              "Profile accounts are not configured yet.",
            authMessage: initialAuthRedirectMessage?.message ?? "",
          },
    [initialAuthRedirectMessage, supabase],
  );
  const [state, setState] = useState<SupabaseProfileState>(initialState);

  const loadUserState = useCallback(
    async (user: User | null, options?: { silent?: boolean }) => {
      const requestId = ++requestIdRef.current;

      if (!supabase) {
        setState({
          ...SIGNED_OUT_STATE,
          ready: true,
          authError: "Profile accounts are not configured yet.",
        });
        return;
      }

      if (!user) {
        setState((current) => ({
          ...SIGNED_OUT_STATE,
          ready: true,
          authError: current.authError,
          authMessage: current.authMessage,
        }));
        return;
      }

      if (!options?.silent) {
        setState((current) => ({
          ...current,
          ready: false,
          userId: user.id,
          userEmail: user.email ?? "",
          authError: "",
        }));
      }

      const [profileResult, savedResult, newsletterResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, handle, name, one_line_bio, avatar_id, created_at, updated_at")
          .eq("user_id", user.id)
          .maybeSingle<ProfileRow>(),
        supabase
          .from("saved_companies")
          .select("company_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .returns<SavedCompanyRow[]>(),
        supabase
          .from("newsletter_subscribers")
          .select("subscribed")
          .eq("user_id", user.id)
          .maybeSingle<NewsletterRow>(),
      ]);

      if (requestId !== requestIdRef.current) return;

      const loadError =
        profileResult.error?.message ??
        savedResult.error?.message ??
        newsletterResult.error?.message ??
        "";

      setState((current) => ({
        ...current,
        profile: profileResult.data ? mapProfileRow(profileResult.data) : null,
        watchingCompanyIds: (savedResult.data ?? []).map(
          (row) => row.company_id,
        ),
        ready: true,
        userId: user.id,
        userEmail: user.email ?? "",
        newsletterOptIn: newsletterResult.data?.subscribed ?? true,
        authError: loadError ? getFriendlyError(loadError) : "",
      }));
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) return;

    void (async () => {
      const browserAuthParams = handleAuthRedirect
        ? getBrowserAuthParams()
        : null;

      if (browserAuthParams?.error) {
        const authErrorMessage = getFriendlyError(browserAuthParams.error);
        storeAuthRedirectMessage({ error: authErrorMessage });
        setState({
          ...SIGNED_OUT_STATE,
          ready: true,
          authError: authErrorMessage,
        });
        clearAuthParamsFromUrl();
        scheduleStoredAuthRedirectMessageCleanup();
        return;
      }

      if (browserAuthParams?.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          browserAuthParams.code,
        );

        if (error) {
          const authErrorMessage = getFriendlyError(error.message);
          storeAuthRedirectMessage({ error: authErrorMessage });
          setState({
            ...SIGNED_OUT_STATE,
            ready: true,
            authError: authErrorMessage,
          });
          clearAuthParamsFromUrl();
          scheduleStoredAuthRedirectMessageCleanup();
          return;
        }

        storeAuthRedirectMessage({
          message: "Signed in. Finish your profile.",
        });
        setState((current) => ({
          ...current,
          authMessage: "Signed in. Finish your profile.",
        }));
        clearAuthParamsFromUrl();
        scheduleStoredAuthRedirectMessageCleanup();
      } else if (browserAuthParams?.confirmed) {
        storeAuthRedirectMessage({
          message: "Signed in. Finish your profile.",
        });
        setState((current) => ({
          ...current,
          authMessage: "Signed in. Finish your profile.",
        }));
        clearAuthParamsFromUrl();
        scheduleStoredAuthRedirectMessageCleanup();
      }

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setState({
          ...SIGNED_OUT_STATE,
          ready: true,
          authError: getFriendlyError(error.message),
        });
        return;
      }

      await loadUserState(data.session?.user ?? null);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;

      void loadUserState(session?.user ?? null);
    });

    return () => {
      requestIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, [handleAuthRedirect, loadUserState, supabase]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const reloadProfileState = async () => {
      const {
        data: { user },
      } = await client.auth.getUser();

      await loadUserState(user, { silent: true });
    };

    window.addEventListener(PROFILE_STORE_EVENT, reloadProfileState);

    return () => {
      window.removeEventListener(PROFILE_STORE_EVENT, reloadProfileState);
    };
  }, [loadUserState, supabase]);

  const clearAuthMessage = useCallback(() => {
    setState((current) => ({
      ...current,
      authError: "",
      authMessage: "",
    }));
  }, []);

  const signInWithGoogle = useCallback(
    async (options?: AuthRedirectOptions): Promise<AuthResult> => {
      if (!supabase) {
        setState((current) => ({
          ...current,
          authError: "Profile accounts are not configured yet.",
        }));
        return { ok: false };
      }

      setState((current) => ({
        ...current,
        authBusy: true,
        authError: "",
        authMessage: "Opening Google sign-in...",
      }));

      const redirectTo = getOAuthRedirectUrl(options?.next);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          ...(redirectTo ? { redirectTo } : {}),
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setState((current) => ({
          ...current,
          authBusy: false,
          authError: getFriendlyError(error.message),
          authMessage: "",
        }));
        return { ok: false };
      }

      const oauthUrl = data.url;

      if (!oauthUrl) {
        setState((current) => ({
          ...current,
          authBusy: false,
          authError: "Google sign-in could not be started.",
          authMessage: "",
        }));
        return { ok: false };
      }

      const validation = await validateOAuthUrlBeforeRedirect(oauthUrl);

      if (!validation.ok) {
        setState((current) => ({
          ...current,
          authBusy: false,
          authError: getFriendlyError(validation.error),
          authMessage: "",
        }));
        return { ok: false };
      }

      window.location.assign(oauthUrl);
      return { ok: true };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;

    setState((current) => ({
      ...current,
      authBusy: true,
      authError: "",
      authMessage: "",
    }));

    const { error } = await supabase.auth.signOut();

    if (error) {
      setState((current) => ({
        ...current,
        authBusy: false,
        authError: error.message,
      }));
      return;
    }

    setState({
      ...SIGNED_OUT_STATE,
      ready: true,
      authMessage: "Signed out.",
    });
    emitProfileStoreChange();
  }, [supabase]);

  const saveProfile = useCallback(
    async (
      input: UserProfileInput,
      options?: SaveProfileOptions,
    ): Promise<UserProfile | null> => {
      if (!supabase) {
        setState((current) => ({
          ...current,
          authError: "Profile accounts are not configured yet.",
        }));
        return null;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setState((current) => ({
          ...current,
          authError: "Sign in before creating a profile.",
        }));
        return null;
      }

      setState((current) => ({
        ...current,
        authBusy: true,
        authError: "",
        authMessage: "",
      }));

      const profilePayload = {
        user_id: user.id,
        handle: normalizeProfileHandle(input.handle || input.name),
        name: input.name.trim() || "NYC AI reader",
        one_line_bio:
          input.bio.trim() ||
          "Saving early-stage NYC AI companies from pre-seed through Series A.",
        avatar_id: input.avatarId ?? "",
      };

      const { data, error } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "user_id" })
        .select("user_id, handle, name, one_line_bio, avatar_id, created_at, updated_at")
        .single<ProfileRow>();

      if (error) {
        setState((current) => ({
          ...current,
          authBusy: false,
          authError: getFriendlyError(error.message),
        }));
        return null;
      }

      const nextNewsletterOptIn =
        options?.newsletterOptIn ?? state.newsletterOptIn;
      const userEmail = user.email ?? state.userEmail;

      if (userEmail) {
        const { error: newsletterError } = await supabase
          .from("newsletter_subscribers")
          .upsert(
            {
              user_id: user.id,
              email: userEmail,
              subscribed: nextNewsletterOptIn,
              source: "profile",
            },
            { onConflict: "user_id" },
          );

        if (newsletterError) {
          setState((current) => ({
            ...current,
            authBusy: false,
            authError: getFriendlyError(newsletterError.message),
          }));
          return null;
        }
      }

      const savedProfile = mapProfileRow(data);

      setState((current) => ({
        ...current,
        profile: savedProfile,
        userId: user.id,
        userEmail,
        newsletterOptIn: nextNewsletterOptIn,
        authBusy: false,
        authMessage: "Profile saved.",
      }));
      emitProfileStoreChange();

      return savedProfile;
    },
    [state.newsletterOptIn, state.userEmail, supabase],
  );

  const toggleCompany = useCallback(
    async (companyId: string) => {
      if (!supabase) {
        setState((current) => ({
          ...current,
          authError: "Sign in before saving companies.",
        }));
        return false;
      }

      let userId = state.userId;
      let userEmail = state.userEmail;

      if (!userId) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setState((current) => ({
            ...current,
            authError: "Sign in before saving companies.",
          }));
          return false;
        }

        userId = user.id;
        userEmail = user.email ?? "";
      }

      const wasSaved = state.watchingCompanyIds.includes(companyId);
      const nextCompanyIds = wasSaved
        ? state.watchingCompanyIds.filter((id) => id !== companyId)
        : [companyId, ...state.watchingCompanyIds];

      setState((current) => ({
        ...current,
        watchingCompanyIds: nextCompanyIds,
        authError: "",
      }));

      const result = wasSaved
        ? await supabase
            .from("saved_companies")
            .delete()
            .match({ user_id: userId, company_id: companyId })
        : await supabase
            .from("saved_companies")
            .upsert(
              { user_id: userId, company_id: companyId },
              { onConflict: "user_id,company_id" },
            );

      if (result.error) {
        setState((current) => ({
          ...current,
          watchingCompanyIds: state.watchingCompanyIds,
          authError: getFriendlyError(result.error.message),
        }));
        return wasSaved;
      }

      if (isAdminEmail(userEmail)) {
        void fetch(`/api/admin/companies/${companyId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_featured: !wasSaved }),
        });
      }

      emitProfileStoreChange();
      return !wasSaved;
    },
    [state.userEmail, state.userId, state.watchingCompanyIds, supabase],
  );

  const isWatchingCompany = useCallback(
    (companyId: string) => state.watchingCompanyIds.includes(companyId),
    [state.watchingCompanyIds],
  );

  return {
    ...state,
    ready: state.ready,
    isSignedIn: Boolean(state.userId),
    clearAuthMessage,
    signInWithGoogle,
    signOut,
    saveProfile,
    toggleCompany,
    isWatchingCompany,
  };
}
