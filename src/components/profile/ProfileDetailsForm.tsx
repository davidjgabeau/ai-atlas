"use client";

import type { FormEvent, ReactNode } from "react";
import { LogOut, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ProfileDetailsFormState = {
  name: string;
  handle: string;
  bio: string;
};

type ProfileDetailsFormProps = {
  authBusy: boolean;
  authError: string;
  authMessage: string;
  form: ProfileDetailsFormState;
  hasProfile: boolean;
  isSignedIn: boolean;
  isEditing: boolean;
  newsletterChecked: boolean;
  pendingCompanyName?: string;
  publicUrl: string;
  userEmail: string;
  onFieldChange: (field: keyof ProfileDetailsFormState, value: string) => void;
  onNewsletterChange: (checked: boolean) => void;
  onStartEdit?: () => void;
  onSignOut?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const maxBioLength = 160;

export function ProfileDetailsForm({
  authBusy,
  authError,
  authMessage,
  form,
  hasProfile,
  isSignedIn,
  isEditing,
  newsletterChecked,
  pendingCompanyName,
  publicUrl,
  userEmail,
  onFieldChange,
  onNewsletterChange,
  onStartEdit,
  onSignOut,
  onSubmit,
}: ProfileDetailsFormProps) {
  const readOnly = hasProfile && !isEditing;

  return (
    <section id="profile-details" className="rounded-md border border-[#E7E1D8] bg-[#FBFAF7]">
      <div className="flex flex-col gap-3 border-b border-[#E7E1D8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-[1.45rem] font-semibold leading-tight text-[#111111]">
            Profile details
          </h2>
          {readOnly ? (
            <p className="mt-1 text-sm leading-6 text-[#66625C]">
              Your profile is published. Click Edit profile to make changes.
            </p>
          ) : pendingCompanyName ? (
            <p className="mt-1 text-sm leading-6 text-[#66625C]">
              Create your profile to save {pendingCompanyName}.
            </p>
          ) : null}
        </div>
        {readOnly && onStartEdit ? (
          <Button
            type="button"
            variant="outline"
            className="border-[#E7E1D8] bg-[#FBFAF7]"
            onClick={onStartEdit}
          >
            Edit profile
          </Button>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="px-5 py-5">
        <div className="grid gap-5">
          <Field label="Name" htmlFor="profile-name">
            <Input
              id="profile-name"
              required
              value={form.name}
              disabled={readOnly}
              onChange={(event) => onFieldChange("name", event.target.value)}
              placeholder="Your name"
              className="h-10 rounded-md border-[#E7E1D8] bg-[#FBFAF7]"
            />
          </Field>

          <Field
            label="Handle"
            htmlFor="profile-handle"
            helperText={`Your public URL: ${publicUrl}`}
          >
            <div className="flex overflow-hidden rounded-md border border-[#E7E1D8] bg-[#FBFAF7] focus-within:ring-2 focus-within:ring-[#E7E1D8]">
              <span className="grid place-items-center border-r border-[#E7E1D8] px-3 text-sm text-[#66625C]">
                aiatlas.nyc/profiles/
              </span>
              <input
                id="profile-handle"
                value={form.handle}
                disabled={readOnly}
                onChange={(event) => onFieldChange("handle", event.target.value)}
                placeholder="your-handle"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-[#111111] outline-none disabled:text-[#66625C]"
              />
            </div>
          </Field>

          <Field
            label="One-line bio"
            htmlFor="profile-bio"
            helperText={`${form.bio.length}/${maxBioLength} characters`}
          >
            <Textarea
              id="profile-bio"
              maxLength={maxBioLength}
              value={form.bio}
              disabled={readOnly}
              onChange={(event) => onFieldChange("bio", event.target.value)}
              placeholder="Saving AI companies changing finance, legal, and consumer behavior in NYC."
              className="min-h-28 rounded-md border-[#E7E1D8] bg-[#FBFAF7]"
            />
          </Field>

          <label className="flex items-start gap-3 rounded-md border border-[#E7E1D8] bg-[#F8F6F1] p-4 text-sm">
            <input
              type="checkbox"
              checked={newsletterChecked}
              disabled={readOnly}
              onChange={(event) => onNewsletterChange(event.target.checked)}
              className="mt-1 size-4 accent-[#9A3D2B]"
            />
            <span>
              <span className="flex items-center gap-2 font-semibold text-[#111111]">
                <Mail className="size-4 text-[#9A3D2B]" />
                Newsletter updates
              </span>
              <span className="mt-1 block leading-6 text-[#66625C]">
                Use {userEmail || "your account email"} for AI Atlas updates.
                Your email is private.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!readOnly ? (
            <Button type="submit" className="app-primary-button" disabled={authBusy}>
              {hasProfile || !isSignedIn ? "Save profile" : "Publish profile"}
            </Button>
          ) : null}
          {isSignedIn && onSignOut ? (
            <Button
              type="button"
              variant="outline"
              className="border-[#E7E1D8] bg-[#FBFAF7] lg:hidden"
              disabled={authBusy}
              onClick={onSignOut}
            >
              <LogOut className="size-4" />
              {authBusy ? "Signing out..." : "Log out"}
            </Button>
          ) : null}
          <StatusMessage error={authError} message={authMessage} />
        </div>
      </form>
    </section>
  );
}

function Field({
  children,
  helperText,
  htmlFor,
  label,
}: {
  children: ReactNode;
  helperText?: string;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <Label
          htmlFor={htmlFor}
          className="text-xs font-semibold text-[#66625C]"
        >
          {label}
        </Label>
        {helperText ? (
          <p className="text-xs leading-5 text-[#66625C]">{helperText}</p>
        ) : null}
      </div>
      {children}
    </div>
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
          ? "text-sm font-medium text-[#9A3D2B]"
          : "text-sm font-medium text-emerald-700"
      }
    >
      {error || message}
    </p>
  );
}
