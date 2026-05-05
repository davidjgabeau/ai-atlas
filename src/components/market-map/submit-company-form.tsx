"use client";

import type { FormEvent, ReactNode } from "react";
import { CheckCircle2, Send } from "lucide-react";

import { UsageBadge } from "@/components/market-map/usage-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UsagePotential } from "@/types/market";

export type SubmitCompanyFormState = {
  company_name: string;
  website_url: string;
  founder_name: string;
  email: string;
  usage_potential: UsagePotential;
  description: string;
};

export const initialSubmitCompanyFormState: SubmitCompanyFormState = {
  company_name: "",
  website_url: "",
  founder_name: "",
  email: "",
  usage_potential: "Promising",
  description: "",
};

type SubmitCompanyFormProps = {
  error: string;
  form: SubmitCompanyFormState;
  submitted: boolean;
  submitting: boolean;
  submitLabel?: string;
  onFieldChange: (field: keyof SubmitCompanyFormState, value: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SubmitCompanyForm({
  error,
  form,
  submitted,
  submitting,
  submitLabel = "Submit startup",
  onFieldChange,
  onReset,
  onSubmit,
}: SubmitCompanyFormProps) {
  if (submitted) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 size-5 text-emerald-600" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[#181818]">
              Submission received
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5F5A52]">
              {form.company_name || "This company"} is now in the NYC startup
              submission queue for editorial review.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm font-medium text-[#5F5A52]">
                Editorial signal
              </span>
              <UsageBadge value="Worth watching" />
            </div>
            <Button
              variant="outline"
              className="mt-5 bg-[var(--app-surface)]"
              onClick={onReset}
            >
              Submit another company
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-md bg-[var(--app-surface)] p-5 shadow-sm app-card-border"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Company name" htmlFor="company_name">
          <Input
            id="company_name"
            required
            value={form.company_name}
            onChange={(event) =>
              onFieldChange("company_name", event.target.value)
            }
            className="h-10 rounded-md border-[#E7E1D8]"
          />
        </Field>
        <Field label="Website" htmlFor="website_url">
          <Input
            id="website_url"
            type="url"
            required
            placeholder="https://"
            value={form.website_url}
            onChange={(event) =>
              onFieldChange("website_url", event.target.value)
            }
            className="h-10 rounded-md border-[#E7E1D8]"
          />
        </Field>
        <Field label="Founder name" htmlFor="founder_name">
          <Input
            id="founder_name"
            required
            value={form.founder_name}
            onChange={(event) =>
              onFieldChange("founder_name", event.target.value)
            }
            className="h-10 rounded-md border-[#E7E1D8]"
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(event) => onFieldChange("email", event.target.value)}
            className="h-10 rounded-md border-[#E7E1D8]"
          />
        </Field>
      </div>
      <div className="mt-5">
        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            required
            rows={7}
            placeholder="What are they building, who in NYC is it for, and why now?"
            value={form.description}
            onChange={(event) =>
              onFieldChange("description", event.target.value)
            }
            className="rounded-md border-[#E7E1D8]"
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end">
        {error ? (
          <p className="mr-auto text-sm font-medium text-[#9A3D2B]">{error}</p>
        ) : null}
        <Button type="submit" className="app-primary-button" disabled={submitting}>
          <Send className="size-4" />
          {submitting ? "Submitting..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
