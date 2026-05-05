import type { Metadata } from "next";

import { SubmitCompanyGate } from "@/components/market-map/submit-company-gate";
import { PublicShell } from "@/components/site/public-shell";
import {
  createShareMetadata,
  getShareImageUrl,
  shareCta,
} from "@/lib/seo/shareMetadata";

export const metadata: Metadata = createShareMetadata({
  title: "Submit a startup | AI Atlas NYC",
  description: `Submit an early-stage company building AI in New York. ${shareCta}.`,
  path: "/submit",
  image: getShareImageUrl({ page: "submit" }),
});

export default function SubmitCompanyPage() {
  return (
    <PublicShell>
      <section className="hero">
        <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.01em] text-[#7A746C]">
            Founder signal
          </p>
          <h1 className="mt-3 max-w-[680px] font-heading text-[clamp(40px,5vw,64px)] font-medium leading-[0.95] tracking-[-0.04em] text-[#181818]">
            Submit your NYC AI startup.
          </h1>
          <p className="mt-5 max-w-[680px] text-base leading-[1.6] text-[#5F5A52]">
            Get considered for the NYC AI startup directory, featured picks,
            and editorial signals. Share what you are building, who it helps,
            and why the scene should know about it. Create a lightweight
            profile first so we know who submitted it.
          </p>
        </div>
      </section>
      <section>
        <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <SubmitCompanyGate />
        </div>
      </section>
    </PublicShell>
  );
}
