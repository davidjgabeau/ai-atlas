"use client";

import { useState } from "react";
import { Bookmark, Check } from "lucide-react";

import { AuthPromptDialog } from "@/components/auth/AuthPromptDialog";
import { Button } from "@/components/ui/button";
import { useLocalProfile } from "@/hooks/use-local-profile";
import {
  getProfileCreationUrlForCompanySave,
  storePendingCompanySave,
} from "@/lib/profile-intents";
import { cn } from "@/lib/utils";

type SaveCompanyButtonProps = {
  companyId: string;
  companyName: string;
  className?: string;
  showLabel?: boolean;
  stopPropagation?: boolean;
  size?: "sm" | "default" | "icon" | "icon-sm";
};

export function SaveCompanyButton({
  companyId,
  companyName,
  className,
  showLabel = true,
  stopPropagation = false,
  size = showLabel ? "sm" : "icon-sm",
}: SaveCompanyButtonProps) {
  const {
    authBusy,
    authError,
    authMessage,
    isSignedIn,
    isWatchingCompany,
    profile,
    ready,
    signInWithGoogle,
    toggleCompany,
  } = useLocalProfile();
  const [profilePromptOpen, setProfilePromptOpen] = useState(false);
  const isSaved = isWatchingCompany(companyId);
  const needsProfile = !isSignedIn || !profile;
  const label = isSaved ? "Saved" : "Save company";
  const shouldShowLabel = showLabel && !size.startsWith("icon");

  function storeSaveIntent() {
    const intent = { companyId, companyName };
    storePendingCompanySave(intent);
    return intent;
  }

  function startProfileFlow() {
    const intent = storeSaveIntent();

    if (isSignedIn) {
      window.location.href = getProfileCreationUrlForCompanySave(intent);
      return;
    }

    setProfilePromptOpen(true);
  }

  async function continueWithGoogle() {
    storeSaveIntent();
    await signInWithGoogle({ next: "/profile" });
  }

  const button = (
    <Button
      type="button"
      variant={isSaved ? "default" : "outline"}
      size={size}
      aria-label={isSaved ? `${companyName} saved` : `Save company: ${companyName}`}
      aria-pressed={isSaved}
      title={isSaved ? `${companyName} saved` : `Save company: ${companyName}`}
      disabled={!ready || authBusy}
      onClick={(event) => {
        if (stopPropagation) {
          event.preventDefault();
          event.stopPropagation();
        }

        if (needsProfile) {
          startProfileFlow();
          return;
        }

        void toggleCompany(companyId);
      }}
      className={cn(
        "rounded-md border-[#CFC7BC] bg-[#FBFAF7] text-[#111111] shadow-none hover:border-[#BFB5A8] hover:bg-[rgb(17_17_17_/_0.035)]",
        isSaved &&
          "border-[#111111] bg-[#111111] text-[#F8F6F1] hover:bg-[#111111]/90 hover:text-[#F8F6F1]",
        shouldShowLabel && "gap-1.5",
        className,
      )}
    >
      {isSaved ? (
        <Check className={cn("size-4", shouldShowLabel && "size-3.5")} />
      ) : (
        <Bookmark className={cn("size-4", shouldShowLabel && "size-3.5")} />
      )}
      {shouldShowLabel ? <span>{label}</span> : null}
    </Button>
  );

  return (
    <>
      {button}
      {isSignedIn ? null : (
        <AuthPromptDialog
          authBusy={authBusy}
          authError={authError}
          authMessage={authMessage}
          description="Use Google to open your account or create a free profile, then this company will be ready to save."
          open={profilePromptOpen}
          signUpLabel="Sign up with Google"
          title="Sign in or sign up to save companies"
          onContinueWithGoogle={() => void continueWithGoogle()}
          onOpenChange={setProfilePromptOpen}
        />
      )}
    </>
  );
}
