"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { AuthPromptDialog } from "@/components/auth/AuthPromptDialog";
import { Avatar } from "@/components/avatars/Avatar";
import { useViewerAvatar } from "@/components/avatars/useViewerAvatar";
import { AvatarPickerModal } from "@/components/profile/AvatarPickerModal";
import { ProfileDetailsForm, type ProfileDetailsFormState } from "@/components/profile/ProfileDetailsForm";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStatsRow } from "@/components/profile/ProfileStatsRow";
import { ProfileWatchingPanel } from "@/components/profile/ProfileWatchingPanel";
import { PublicProfilePreview } from "@/components/profile/PublicProfilePreview";
import { useLocalProfile } from "@/hooks/use-local-profile";
import { defaultAvatarId } from "@/lib/avatars/avatarCatalog";
import {
  clearPendingCompanySave,
  readInitialPendingCompanySave,
} from "@/lib/profile-intents";
import { getProfileUrl, normalizeProfileHandle } from "@/lib/profile-store";
import type { Company } from "@/types/market";

type ProfileClientProps = {
  companies: Company[];
};

type ProfileFormState = ProfileDetailsFormState & {
  avatarId: string;
};

const emptyForm: ProfileFormState = {
  name: "",
  handle: "",
  bio: "",
  avatarId: "",
};

const fallbackBio =
  "Saving AI companies changing finance, legal, and consumer behavior in NYC.";

const profileDraftStorageKey = "ai-atlas.profile-draft.v1";
const profilePendingStorageKey = "ai-atlas.profile-pending-save.v1";

type StoredProfileDraft = {
  form: ProfileFormState;
  newsletterPreference: boolean | null;
};

function readStoredProfileDraft(): StoredProfileDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const rawDraft = window.sessionStorage.getItem(profileDraftStorageKey);
    if (!rawDraft) return null;

    return JSON.parse(rawDraft) as StoredProfileDraft;
  } catch {
    return null;
  }
}

function storeProfileDraft(draft: StoredProfileDraft) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(profileDraftStorageKey, JSON.stringify(draft));
}

function clearStoredProfileDraft() {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(profileDraftStorageKey);
}

function readPendingProfileSaveFlag() {
  if (typeof window === "undefined") return false;

  return window.sessionStorage.getItem(profilePendingStorageKey) === "1";
}

function storePendingProfileSaveFlag() {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(profilePendingStorageKey, "1");
}

function clearPendingProfileSaveFlag() {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(profilePendingStorageKey);
}

export function ProfileClient({ companies }: ProfileClientProps) {
  const {
    profile,
    watchingCompanyIds,
    ready,
    saveProfile,
    toggleCompany,
    userEmail,
    newsletterOptIn,
    authBusy,
    authError,
    authMessage,
    isSignedIn,
    signInWithGoogle,
    signOut,
  } = useLocalProfile({ handleAuthRedirect: true });
  const {
    avatarId: viewerAvatarId,
    ready: avatarReady,
    setAvatarId: setViewerAvatarId,
  } = useViewerAvatar(profile);
  const [initialDraft] = useState<StoredProfileDraft | null>(() =>
    readStoredProfileDraft(),
  );
  const [form, setForm] = useState<ProfileFormState>(
    () => initialDraft?.form ?? emptyForm,
  );
  const [newsletterPreference, setNewsletterPreference] = useState<
    boolean | null
  >(() => initialDraft?.newsletterPreference ?? null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [pendingCompanySave, setPendingCompanySave] = useState(() =>
    readInitialPendingCompanySave(),
  );
  const [pendingProfileSave, setPendingProfileSave] = useState(() =>
    readPendingProfileSaveFlag(),
  );
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarDraftId, setAvatarDraftId] = useState(
    () => initialDraft?.form.avatarId || defaultAvatarId,
  );
  const [profileDetailsEditable, setProfileDetailsEditable] = useState(false);

  const baseForm: ProfileFormState = profile
    ? {
        name: profile.name,
        handle: profile.handle,
        bio: profile.bio,
        avatarId: viewerAvatarId,
      }
    : emptyForm;
  const displayForm =
    profile && !profileDetailsEditable
      ? baseForm
      : {
          ...baseForm,
          ...form,
        };
  const displayAvatarId = displayForm.avatarId || viewerAvatarId;
  const displayName = profile?.name || displayForm.name || "Create your profile";
  const suggestedHandle = normalizeProfileHandle(
    displayForm.handle || displayForm.name,
  );
  const displayHandle =
    profile?.handle || displayForm.handle || suggestedHandle || "your-handle";
  const displayBio = profile?.bio || displayForm.bio || fallbackBio;
  const publicPath = getProfileUrl(displayHandle);
  const publicUrl = `aiatlas.nyc${publicPath}`;
  const newsletterChecked = newsletterPreference ?? newsletterOptIn;
  const isCreatingProfile = !profile;
  const detailsEditable = isCreatingProfile || profileDetailsEditable;
  const shouldShowProfileGate =
    ready && !isSignedIn && !profile && !pendingCompanySave && !initialDraft;

  const watchingCompanies = useMemo(
    () =>
      watchingCompanyIds
        .map((id) => companies.find((company) => company.id === id))
        .filter((company): company is Company => Boolean(company)),
    [companies, watchingCompanyIds],
  );
  const topCategory = getTopCategory(watchingCompanies);

  useEffect(() => {
    if (!ready || !avatarReady || !profile || profile.avatarId) return;

    void saveProfile({
      name: profile.name,
      handle: profile.handle,
      bio: profile.bio,
      avatarId: viewerAvatarId,
    });
  }, [avatarReady, profile, ready, saveProfile, viewerAvatarId]);

  useEffect(() => {
    if (!ready || !isSignedIn || !pendingProfileSave) return;

    const pendingForm = {
      name: form.name,
      handle: form.handle || suggestedHandle,
      bio: form.bio,
      avatarId: form.avatarId || viewerAvatarId || defaultAvatarId,
    };

    void (async () => {
      const savedProfile = await saveProfile(pendingForm, {
        newsletterOptIn: newsletterChecked,
      });

      if (!savedProfile) return;

      if (pendingCompanySave) {
        if (!watchingCompanyIds.includes(pendingCompanySave.companyId)) {
          await toggleCompany(pendingCompanySave.companyId);
        }

        clearPendingCompanySave();
        setPendingCompanySave(null);
      }

      clearStoredProfileDraft();
      clearPendingProfileSaveFlag();
      setPendingProfileSave(false);
      setAuthPromptOpen(false);
      setProfileDetailsEditable(false);
      setForm({
        name: "",
        handle: "",
        bio: "",
        avatarId: "",
      });
    })();
  }, [
    form.avatarId,
    form.bio,
    form.handle,
    form.name,
    isSignedIn,
    newsletterChecked,
    pendingCompanySave,
    pendingProfileSave,
    ready,
    saveProfile,
    suggestedHandle,
    toggleCompany,
    viewerAvatarId,
    watchingCompanyIds,
  ]);

  function updateProfileField(field: keyof ProfileDetailsFormState, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: field === "handle" ? normalizeProfileHandle(value) : value,
    }));
  }

  function openAvatarModal() {
    setAvatarDraftId(displayAvatarId);
    setAvatarModalOpen(true);
  }

  function getProfileDraft(nextAvatarId = displayAvatarId): ProfileFormState {
    return {
      name: displayForm.name,
      handle: displayForm.handle || suggestedHandle,
      bio: displayForm.bio,
      avatarId: nextAvatarId || defaultAvatarId,
    };
  }

  function persistProfileDraft(nextForm = getProfileDraft()) {
    storeProfileDraft({
      form: nextForm,
      newsletterPreference: newsletterChecked,
    });
  }

  async function saveDraftedProfile(nextForm = getProfileDraft()) {
    const savedProfile = await saveProfile(
      {
        name: nextForm.name,
        handle: nextForm.handle || suggestedHandle,
        bio: nextForm.bio,
        avatarId: nextForm.avatarId || displayAvatarId,
      },
      { newsletterOptIn: newsletterChecked },
    );

    if (savedProfile) {
      if (pendingCompanySave) {
        if (!watchingCompanyIds.includes(pendingCompanySave.companyId)) {
          await toggleCompany(pendingCompanySave.companyId);
        }

        clearPendingCompanySave();
        setPendingCompanySave(null);
      }

      clearStoredProfileDraft();
      clearPendingProfileSaveFlag();
      setPendingProfileSave(false);
      setAuthPromptOpen(false);
      setProfileDetailsEditable(false);
      setForm({
        name: "",
        handle: "",
        bio: "",
        avatarId: "",
      });
    }

    return savedProfile;
  }

  useEffect(() => {
    if (!ready || !isSignedIn || !profile || !pendingCompanySave || authBusy) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        if (!watchingCompanyIds.includes(pendingCompanySave.companyId)) {
          await toggleCompany(pendingCompanySave.companyId);
        }

        clearPendingCompanySave();
        setPendingCompanySave(null);
      })();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    authBusy,
    isSignedIn,
    pendingCompanySave,
    profile,
    ready,
    toggleCompany,
    watchingCompanyIds,
  ]);

  async function saveAvatar() {
    if (profile && !detailsEditable) return;

    const nextForm = getProfileDraft(avatarDraftId);

    setViewerAvatarId(avatarDraftId);
    setForm((currentForm) => ({ ...currentForm, avatarId: avatarDraftId }));

    if (profile) {
      await saveDraftedProfile(nextForm);
    } else {
      persistProfileDraft(nextForm);
    }

    setAvatarModalOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextForm = getProfileDraft();

    if (!isSignedIn) {
      persistProfileDraft(nextForm);
      setAuthPromptOpen(true);
      return;
    }

    await saveDraftedProfile(nextForm);
  }

  async function handleGoogleAuth() {
    persistProfileDraft();
    storePendingProfileSaveFlag();
    setPendingProfileSave(true);
    await signInWithGoogle({ next: "/profile" });
  }

  function startEditingProfile() {
    if (profile) {
      setForm({
        name: profile.name,
        handle: profile.handle,
        bio: profile.bio,
        avatarId: viewerAvatarId,
      });
    }

    setProfileDetailsEditable(true);
  }

  function scrollToDetails() {
    startEditingProfile();
    document.getElementById("profile-details")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (!ready) {
    return (
      <section className="bg-[#F8F6F1]">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="h-64 animate-pulse rounded-md border border-[#E7E1D8] bg-[#FBFAF7]" />
        </div>
      </section>
    );
  }

  if (shouldShowProfileGate) {
    return (
      <>
        <ProfileAccessGate
          avatarId={displayAvatarId}
          companyCount={companies.length}
          onOpenAuth={() => setAuthPromptOpen(true)}
        />

        <AuthPromptDialog
          authBusy={authBusy}
          authError={authError}
          authMessage={authMessage}
          description="Use Google to open your existing account or create a free profile to claim your avatar, save companies, and begin scouting."
          open={authPromptOpen}
          signUpLabel="Sign up with Google"
          title="Sign in or create your profile"
          onContinueWithGoogle={() => void handleGoogleAuth()}
          onOpenChange={setAuthPromptOpen}
        />
      </>
    );
  }

  return (
    <>
      <ProfileHero
        authBusy={authBusy}
        avatarId={displayAvatarId}
        bio={displayBio}
        handle={displayHandle}
        hasProfile={Boolean(profile)}
        isEditing={detailsEditable}
        isSignedIn={isSignedIn}
        name={displayName}
        publicPath={publicPath}
        watchingCount={watchingCompanies.length}
        onChangeAvatar={openAvatarModal}
        onEditProfile={scrollToDetails}
        onSignOut={() => void signOut()}
      />

      <ProfileStatsRow
        hasProfile={Boolean(profile)}
        topCategory={topCategory}
        watchingCount={watchingCompanies.length}
      />

      <main className="bg-[#F8F6F1]">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-7">
            <ProfileDetailsForm
              authBusy={authBusy}
              authError={authError}
              authMessage={authMessage}
              form={{
                name: displayForm.name,
                handle: displayForm.handle || suggestedHandle,
                bio: displayForm.bio,
              }}
              hasProfile={Boolean(profile)}
              isEditing={detailsEditable}
              isSignedIn={isSignedIn}
              newsletterChecked={newsletterChecked}
              pendingCompanyName={
                pendingCompanySave?.companyName &&
                pendingCompanySave.companyName !== "this company"
                  ? pendingCompanySave.companyName
                  : undefined
              }
              publicUrl={publicUrl}
              userEmail={userEmail}
              onFieldChange={updateProfileField}
              onNewsletterChange={setNewsletterPreference}
              onStartEdit={startEditingProfile}
              onSignOut={() => void signOut()}
              onSubmit={handleSubmit}
            />
          </div>
          <div className="lg:col-span-5">
            <ProfileWatchingPanel
              avatarId={displayAvatarId}
              companies={watchingCompanies}
            />
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <PublicProfilePreview
            avatarId={displayAvatarId}
            bio={displayBio}
            companies={watchingCompanies}
            handle={displayHandle}
            hasProfile={Boolean(profile)}
            name={displayName}
            publicPath={publicPath}
          />
        </div>
      </main>

      <AvatarPickerModal
        open={avatarModalOpen}
        saving={authBusy}
        selectedAvatarId={avatarDraftId}
        onOpenChange={setAvatarModalOpen}
        onSave={() => void saveAvatar()}
        onSelectAvatar={setAvatarDraftId}
      />

      <AuthPromptDialog
        authBusy={authBusy}
        authError={authError}
        authMessage={authMessage}
          description={
            pendingCompanySave
              ? `Your profile draft is ready. Sign in or sign up with Google so ${pendingCompanySave.companyName} can be saved to your profile.`
              : "Your profile draft is ready. Sign in or sign up with Google so it can be saved privately and shared publicly on AI Atlas."
          }
          open={authPromptOpen}
          signUpLabel="Sign up with Google"
          title="Sign in or create your profile"
          onContinueWithGoogle={() => void handleGoogleAuth()}
          onOpenChange={setAuthPromptOpen}
        />
    </>
  );
}

function ProfileAccessGate({
  avatarId,
  companyCount,
  onOpenAuth,
}: {
  avatarId: string;
  companyCount: number;
  onOpenAuth: () => void;
}) {
  return (
    <section className="bg-[#F8F6F1]">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="relative min-h-[520px] overflow-hidden rounded-md border border-[#E7E1D8] bg-[#FBFAF7] sm:min-h-[620px]">
          <div className="pointer-events-none select-none opacity-45 blur-[2px]">
            <div className="border-b border-[#E7E1D8] px-5 py-6">
              <div className="flex items-center gap-4">
                <Avatar avatarId={avatarId} size="lg" className="size-[72px]" />
                <div>
                  <p className="editorial-label">Profile</p>
                  <h1 className="mt-2 font-heading text-[clamp(40px,5vw,68px)] font-medium leading-none tracking-[-0.035em] text-[#181818]">
                    Your AI Atlas profile
                  </h1>
                  <p className="mt-3 text-base text-[#66625C]">
                    Saved companies, scouting notes, and your public avatar.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-md border border-[#E7E1D8] bg-[#F8F6F1] p-5">
                <p className="editorial-label">Profile details</p>
                <div className="mt-5 grid gap-4">
                  <PreviewLine width="w-2/3" />
                  <PreviewLine width="w-1/2" />
                  <PreviewLine width="w-full" />
                  <PreviewLine width="w-5/6" />
                </div>
              </div>

              <div className="rounded-md border border-[#E7E1D8] bg-[#F8F6F1] p-5">
                <p className="editorial-label">Saved companies</p>
                <div className="mt-5 grid gap-4">
                  {["Companies to revisit", "Market notes", "Category watch"].map(
                    (label) => (
                      <div
                        key={label}
                        className="flex items-center justify-between border-b border-[#E7E1D8] pb-3 last:border-b-0"
                      >
                        <span className="font-medium text-[#181818]">{label}</span>
                        <span className="text-sm text-[#66625C]">Private view</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-start gap-3 overflow-y-auto bg-[rgb(248_246_241_/_0.74)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6 backdrop-blur-[1px] sm:justify-center sm:gap-4 sm:p-5">
            <div className="order-2 w-full max-w-[720px] overflow-hidden rounded-md border border-[#E7E1D8] bg-[rgb(251_250_247_/_0.96)] sm:order-1">
              <dl className="grid divide-y divide-[#E7E1D8] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <ProfileGateStat label="Access" value="Free" />
                <ProfileGateStat label="Avatar" value="Claim yours" />
                <ProfileGateStat
                  label="Scouting"
                  value={`${companyCount} companies`}
                />
              </dl>
            </div>

            <div className="order-1 w-full max-w-[460px] rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-5 text-center sm:order-2 sm:p-6">
              <div className="mx-auto grid size-12 place-items-center rounded-md border border-[#E7E1D8] bg-[#F8F6F1] text-[#9A3D2B]">
                <LockKeyhole className="size-5" />
              </div>
              <h2 className="mt-4 font-heading text-[clamp(31px,9vw,38px)] font-medium leading-[1] tracking-[-0.03em] text-[#181818] sm:text-[clamp(32px,5vw,42px)]">
                Create a profile to start scouting
              </h2>
              <p className="mt-4 text-[15px] leading-6 text-[#5F5A52] sm:text-sm">
                Get full access to AI Atlas for free, claim your pixel avatar,
                and build a saved-company view as you scout the map.
              </p>
              <button
                type="button"
                className="app-primary-button mt-5 inline-flex h-11 w-full max-w-[280px] items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold sm:w-auto"
                onClick={onOpenAuth}
              >
                Sign in or sign up with Google
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileGateStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 text-center">
      <dt className="editorial-label text-[10px]">{label}</dt>
      <dd className="mt-1 font-heading text-[24px] font-medium leading-none tracking-[-0.025em] text-[#181818]">
        {value}
      </dd>
    </div>
  );
}

function PreviewLine({ width }: { width: string }) {
  return <div className={`h-4 rounded-sm bg-[#E7E1D8] ${width}`} />;
}

function getTopCategory(companies: Company[]) {
  if (companies.length === 0) return null;

  const counts = companies.reduce<Record<string, number>>((totals, company) => {
    totals[company.category] = (totals[company.category] ?? 0) + 1;
    return totals;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
