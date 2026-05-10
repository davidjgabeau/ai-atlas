import type { Metadata } from "next";

import { AskAtlasClient } from "@/components/ask/ask-atlas-client";
import { JsonLd } from "@/components/seo/JsonLd";
import { PixelSiteIcon } from "@/components/site/pixel-site-icon";
import { PublicShell } from "@/components/site/public-shell";
import { categoryMeta } from "@/data/market";
import { patterns } from "@/data/patterns";
import {
  absoluteUrl,
  createShareMetadata,
  getShareImageUrl,
} from "@/lib/seo/shareMetadata";
import { getPublishedCompanies } from "@/lib/supabase/market-data";

export const dynamic = "force-dynamic";

const examples = [
  "I'm a seed investor focused on infrastructure — what should I be watching?",
  "If I'm building an AI sales tool, who am I competing with?",
  "What NYC AI startups are building in healthcare?",
  "Which companies here would make good Claude API customers?",
];

export async function generateMetadata(): Promise<Metadata> {
  return createShareMetadata({
    title: "Ask Atlas",
    description:
      "Ask natural-language questions about early-stage NYC AI companies, categories, and market patterns.",
    path: "/ask",
    image: getShareImageUrl({ page: "ask" }),
  });
}

export default async function AskPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const [params, companies] = await Promise.all([
    searchParams,
    getPublishedCompanies(),
  ]);
  const initialQuery = (params?.q ?? "").trim().slice(0, 700);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Ask Atlas",
          description:
            "Ask natural-language questions about early-stage NYC AI companies, categories, and market patterns.",
          url: absoluteUrl("/ask"),
        }}
      />
      <PublicShell>
        <section className="border-b border-[#E7E1D8] bg-section">
          <div className="editorial-container !max-w-[1180px] py-10 md:py-14 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.5fr)] lg:items-end">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-md border border-[#E7E1D8] bg-[#FBFAF7] text-[#9A3D2B]">
                    <PixelSiteIcon name="compass" size="xs" />
                  </span>
                  <p className="editorial-label">Ask Atlas</p>
                </div>
                <h1 className="mt-5 max-w-[780px] font-heading text-[clamp(48px,7vw,78px)] font-medium leading-[0.94] tracking-[0] text-[#111111]">
                  Ask the NYC AI market map in plain English.
                </h1>
                <p className="mt-5 max-w-[650px] text-[17px] leading-[1.6] text-[#5F5A52] md:text-[19px]">
                  Claude reasons over AI Atlas companies, categories, patterns,
                  and recent signals, then returns a concise answer with
                  startups worth inspecting.
                </p>
              </div>

              <div className="grid grid-cols-3 divide-x divide-[#E7E1D8] rounded-[14px] border border-[#E7E1D8] bg-[rgb(251_250_247_/_0.65)]">
                <AskStat label="Companies" value={companies.length} />
                <AskStat label="Categories" value={categoryMeta.length} />
                <AskStat label="Patterns" value={patterns.length} />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-section">
          <div className="editorial-container !max-w-[1180px] py-8 md:py-10 lg:py-12">
            <AskAtlasClient initialQuery={initialQuery} examples={examples} />
          </div>
        </section>
      </PublicShell>
    </>
  );
}

function AskStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 md:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#9A3D2B]">
        {label}
      </p>
      <p className="mt-2 font-heading text-[34px] font-medium leading-none text-[#111111] md:text-[40px]">
        {value}
      </p>
    </div>
  );
}
