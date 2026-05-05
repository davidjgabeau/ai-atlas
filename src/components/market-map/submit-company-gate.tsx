"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, LockKeyhole, Mail } from "lucide-react";

import { AuthPromptDialog } from "@/components/auth/AuthPromptDialog";
import {
  initialSubmitCompanyFormState,
  SubmitCompanyForm,
  type SubmitCompanyFormState,
} from "@/components/market-map/submit-company-form";
import { Button } from "@/components/ui/button";
import { useLocalProfile } from "@/hooks/use-local-profile";
import { getProfileUrl } from "@/lib/profile-store";

const submitDraftStorageKey = "ai-atlas.submit-draft.v1";
const submitPendingStorageKey = "ai-atlas.submit-pending.v1";

function readStoredSubmitDraft(): SubmitCompanyFormState | null {
  if (typeof window === "undefined") return null;

  try {
    const rawDraft = window.sessionStorage.getItem(submitDraftStorageKey);
    if (!rawDraft) return null;

    return JSON.parse(rawDraft) as SubmitCompanyFormState;
  } catch {
    return null;
  }
}

function storeSubmitDraft(form: SubmitCompanyFormState) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(submitDraftStorageKey, JSON.stringify(form));
}

function clearStoredSubmitDraft() {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(submitDraftStorageKey);
}

function readPendingSubmitFlag() {
  if (typeof window === "undefined") return false;

  return window.sessionStorage.getItem(submitPendingStorageKey) === "1";
}

function storePendingSubmitFlag() {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(submitPendingStorageKey, "1");
}

function clearPendingSubmitFlag() {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(submitPendingStorageKey);
}

export function SubmitCompanyGate() {
  const {
    profile,
    ready,
    userEmail,
    authBusy,
    authError,
    authMessage,
    isSignedIn,
    signInWithGoogle,
  } = useLocalProfile({ handleAuthRedirect: true });
  const [initialDraft] = useState<SubmitCompanyFormState | null>(() =>
    readStoredSubmitDraft(),
  );
  const [submissionForm, setSubmissionForm] =
    useState<SubmitCompanyFormState>(
      () => initialDraft ?? initialSubmitCompanyFormState,
    );
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [pendingSubmitAfterAuth, setPendingSubmitAfterAuth] = useState(() =>
    readPendingSubmitFlag(),
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const submitDraft = useCallback(async () => {
    setSubmitting(true);
    setSubmitError("");
    setPendingSubmitAfterAuth(false);
    clearPendingSubmitFlag();

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionForm),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Submission failed.");
      }

      setSubmitted(true);
      clearStoredSubmitDraft();
    } catch (submitError) {
      setSubmitError(
        submitError instanceof Error
          ? submitError.message
          : "Submission failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [submissionForm]);

  useEffect(() => {
    if (
      !ready ||
      !isSignedIn ||
      !pendingSubmitAfterAuth ||
      submitted ||
      submitting
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void submitDraft();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    isSignedIn,
    pendingSubmitAfterAuth,
    ready,
    submitDraft,
    submitted,
    submitting,
  ]);

  function updateSubmissionField(
    field: keyof SubmitCompanyFormState,
    value: string,
  ) {
    setSubmissionForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      storeSubmitDraft(next);
      return next;
    });
  }

  function requestAuthForSubmission() {
    storeSubmitDraft(submissionForm);
    setAuthPromptOpen(true);
  }

  async function onContinueWithGoogle() {
    storeSubmitDraft(submissionForm);
    storePendingSubmitFlag();
    setPendingSubmitAfterAuth(true);
    await signInWithGoogle({ next: "/submit" });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSignedIn) {
      requestAuthForSubmission();
      return;
    }

    await submitDraft();
  }

  function resetSubmission() {
    setSubmissionForm(initialSubmitCompanyFormState);
    setSubmitted(false);
    setSubmitError("");
    clearStoredSubmitDraft();
    clearPendingSubmitFlag();
  }

  if (!ready) {
    return (
      <div className="rounded-md bg-[var(--app-surface)] p-5 shadow-sm app-card-border">
        <div className="h-5 w-44 animate-pulse rounded-full bg-[rgb(154_61_43_/_0.08)]" />
        <div className="mt-5 grid gap-3">
          <div className="h-10 animate-pulse rounded-md bg-[rgb(154_61_43_/_0.06)]" />
          <div className="h-10 animate-pulse rounded-md bg-[rgb(154_61_43_/_0.06)]" />
          <div className="h-24 animate-pulse rounded-md bg-[rgb(154_61_43_/_0.06)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <SubmissionContextCard
        isSignedIn={isSignedIn}
        profile={profile}
        userEmail={userEmail}
      />

      <SubmitCompanyForm
        error={submitError}
        form={submissionForm}
        submitted={submitted}
        submitting={submitting}
        onFieldChange={updateSubmissionField}
        onReset={resetSubmission}
        onSubmit={onSubmit}
      />

      <AuthPromptDialog
        authBusy={authBusy}
        authError={authError}
        authMessage={authMessage}
        description="Your startup draft is saved in this tab. Sign in or sign up with Google so the submission has a real AI Atlas account behind it."
        open={authPromptOpen}
        signUpLabel="Sign up with Google"
        title="Sign in or sign up to submit"
        onContinueWithGoogle={() => void onContinueWithGoogle()}
        onOpenChange={setAuthPromptOpen}
      />
    </div>
  );
}

function SubmissionContextCard({
  isSignedIn,
  profile,
  userEmail,
}: {
  isSignedIn: boolean;
  profile: {
    handle: string;
    name: string;
  } | null;
  userEmail: string;
}) {
  if (profile) {
    return (
      <div className="flex flex-col gap-4 rounded-md bg-[var(--app-surface)] p-5 shadow-sm app-card-border sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
            <CheckCircle2 className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-[#181818]">
              Submitting as {profile.name}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#5F5A52]">
              Your submission will be associated with{" "}
              <Link
                href={getProfileUrl(profile.handle)}
                className="font-medium text-[#9A3D2B] hover:underline"
              >
                @{profile.handle}
              </Link>
              .
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="bg-[var(--app-surface)]">
          <Link href="/profile">Edit profile</Link>
        </Button>
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="flex items-start gap-3 rounded-md bg-[var(--app-surface)] p-5 shadow-sm app-card-border">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[rgb(154_61_43_/_0.08)] text-[#9A3D2B] ring-1 ring-[#E7E1D8]">
          <LockKeyhole className="size-5" />
        </span>
        <div>
          <p className="font-semibold text-[#181818]">
            Signed in as {userEmail || "your AI Atlas account"}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#5F5A52]">
            You can submit now. Your email stays private, and you can add a
            public profile later from the profile page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-md bg-[var(--app-surface)] p-5 shadow-sm app-card-border">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[rgb(154_61_43_/_0.08)] text-[#9A3D2B] ring-1 ring-[#E7E1D8]">
        <Mail className="size-5" />
      </span>
      <div>
        <p className="font-semibold text-[#181818]">
          Fill out the startup first
        </p>
        <p className="mt-1 text-sm leading-6 text-[#5F5A52]">
          When you press submit, AI Atlas will ask for Google sign-in before
          sending it to the review queue.
        </p>
      </div>
    </div>
  );
}
