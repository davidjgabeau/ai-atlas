"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AuthPromptDialogProps = {
  authBusy: boolean;
  authError: string;
  authMessage: string;
  continueLabel?: string;
  description: string;
  open: boolean;
  showSignUpOption?: boolean;
  signInLabel?: string;
  signUpLabel?: string;
  title: string;
  onContinueWithGoogle: () => void;
  onOpenChange: (open: boolean) => void;
  onSignUpWithGoogle?: () => void;
};

export function AuthPromptDialog({
  authBusy,
  authError,
  authMessage,
  continueLabel = "Continue with Google",
  description,
  open,
  showSignUpOption = true,
  signInLabel = "Sign in with Google",
  signUpLabel = "Sign up with Google",
  title,
  onContinueWithGoogle,
  onOpenChange,
  onSignUpWithGoogle,
}: AuthPromptDialogProps) {
  const signUpAction = onSignUpWithGoogle ?? onContinueWithGoogle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-0 text-[#111111] sm:max-w-lg">
        <DialogHeader className="border-b border-[#E7E1D8] px-5 py-4">
          <div className="flex items-start gap-3 pr-8">
            <span className="grid size-10 shrink-0 place-items-center rounded-md border border-[#E7E1D8] bg-[#F8F6F1] text-[#9A3D2B]">
              <span className="font-heading text-xl font-semibold">G</span>
            </span>
            <div>
              <DialogTitle className="font-heading text-[1.55rem] leading-tight text-[#111111]">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-[#66625C]">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-5">
          <Button
            type="button"
            className="h-12 w-full justify-between border border-[#111111] bg-[#111111] px-4 text-[#F8F6F1] hover:bg-[#2A2926]"
            disabled={authBusy}
            onClick={onContinueWithGoogle}
          >
            <span>
              {authBusy
                ? "Opening Google..."
                : showSignUpOption
                  ? signInLabel
                  : continueLabel}
            </span>
            <ArrowRight className="size-4" />
          </Button>
          {showSignUpOption ? (
            <Button
              type="button"
              variant="outline"
              className="mt-2 h-12 w-full justify-between border-[#CFC7BC] bg-[#FBFAF7] px-4 text-[#111111] shadow-none hover:bg-[rgb(17_17_17_/_0.035)]"
              disabled={authBusy}
              onClick={signUpAction}
            >
              <span>{signUpLabel}</span>
              <ArrowRight className="size-4" />
            </Button>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-[#7A746C]">
            {showSignUpOption
              ? "Already have an AI Atlas account? Sign in. New here? Sign up. Both use Google, with no password or email confirmation."
              : "Google opens your AI Atlas account with no password or email confirmation."}
          </p>
          <StatusMessage error={authError} message={authMessage} />

          <DialogFooter className="-mx-5 -mb-5 mt-6 rounded-b-md border-t border-[#E7E1D8] bg-[#F8F6F1] px-5 py-4">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-[#5F5A52]"
              disabled={authBusy}
              onClick={() => onOpenChange(false)}
            >
              Not now
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusMessage({
  error,
  message,
}: {
  error: string;
  message: string;
}) {
  if (!error && !message) return null;

  return (
    <p
      className={
        error
          ? "mt-4 text-sm font-medium text-[#9A3D2B]"
          : "mt-4 text-sm font-medium text-emerald-700"
      }
    >
      {error || message}
    </p>
  );
}
