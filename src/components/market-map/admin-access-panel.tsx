"use client";

import { useState } from "react";
import { LockKeyhole } from "lucide-react";

import { AuthPromptDialog } from "@/components/auth/AuthPromptDialog";
import { Button } from "@/components/ui/button";
import { useLocalProfile } from "@/hooks/use-local-profile";

type AdminAccessPanelProps = {
  adminEmail: string;
  currentUserEmail: string;
};

export function AdminAccessPanel({
  adminEmail,
  currentUserEmail,
}: AdminAccessPanelProps) {
  const {
    authBusy,
    authError,
    authMessage,
    signInWithGoogle,
    signOut,
  } = useLocalProfile({ handleAuthRedirect: true });
  const [authOpen, setAuthOpen] = useState(false);

  async function onContinueWithGoogle() {
    await signInWithGoogle({ next: "/admin" });
  }

  async function onSignOut() {
    await signOut();
    window.location.reload();
  }

  return (
    <>
      <div className="rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-md border border-[#E7E1D8] bg-[#F8F6F1] text-[#9A3D2B]">
            <LockKeyhole className="size-5" />
          </span>
          <div>
            <h2 className="font-heading text-[1.7rem] leading-tight text-[#111111]">
              Admin access
            </h2>
            <p className="mt-2 max-w-[640px] text-sm leading-6 text-[#66625C]">
              Company editing is restricted to {adminEmail}. Sign in with that
              account to add, feature, archive, and delete companies.
            </p>
            {currentUserEmail && currentUserEmail !== adminEmail ? (
              <p className="mt-3 text-sm font-medium text-[#9A3D2B]">
                You are currently signed in as {currentUserEmail}.
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                className="app-primary-button"
                onClick={() => setAuthOpen(true)}
              >
                Continue with Google
              </Button>
              {currentUserEmail ? (
                <Button
                  variant="outline"
                  className="border-[#E7E1D8] bg-[#FBFAF7]"
                  disabled={authBusy}
                  onClick={() => void onSignOut()}
                >
                  Sign out current account
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <AuthPromptDialog
        authBusy={authBusy}
        authError={authError}
        authMessage={authMessage}
        continueLabel="Sign in with Google"
        description={`Use Google with ${adminEmail} to manage AI Atlas company records.`}
        open={authOpen}
        showSignUpOption={false}
        title="Sign in to Curation Studio"
        onContinueWithGoogle={() => void onContinueWithGoogle()}
        onOpenChange={setAuthOpen}
      />
    </>
  );
}
