import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";

import { PublicShell } from "@/components/site/public-shell";
import { patterns } from "@/data/patterns";
import {
  createShareMetadata,
  getShareImageUrl,
  shareCta,
} from "@/lib/seo/shareMetadata";

export const metadata: Metadata = createShareMetadata({
  title: "Patterns across the NYC AI map | AI Atlas NYC",
  description: `Recurring shapes across early-stage NYC AI startups. ${shareCta}.`,
  path: "/patterns",
  image: getShareImageUrl({ page: "insights" }),
});

export default function PatternsPage() {
  const latestUpdatedAt = getLatestPatternUpdatedAt();

  return (
    <PublicShell>
      <section className="hero">
        <div className="editorial-container py-12">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="editorial-label">Pattern recognition</p>
            {latestUpdatedAt ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E1D8] bg-[#FBFAF7] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
                <RefreshCw className="size-3.5" />
                Updated {formatUpdatedMarker(latestUpdatedAt)}
              </span>
            ) : null}
          </div>
          <h1 className="mt-5 max-w-[840px] font-heading text-[clamp(40px,5vw,64px)] font-medium leading-[0.95] tracking-[-0.04em] text-[#181818]">
            Patterns across the NYC AI map
          </h1>
          <p className="mt-5 max-w-[700px] text-[18px] leading-[1.55] text-[#5F5A52]">
            Recurring shapes the map keeps producing. Each pattern names the
            companies that fit.
          </p>
        </div>
      </section>

      <section className="bg-section">
        <div className="editorial-container py-12">
          <div className="grid gap-4 md:grid-cols-2">
            {patterns.map((pattern) => (
              <Link
                key={pattern.slug}
                href={`/patterns/${pattern.slug}`}
                className="group rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-6 transition hover:bg-[rgb(154_61_43_/_0.045)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-heading text-[26px] font-medium leading-[1.05] tracking-[-0.025em] text-[#181818]">
                    {pattern.title}
                  </h2>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-[#9A3D2B] transition group-hover:translate-x-0.5" />
                </div>
                <p className="mt-4 line-clamp-4 text-sm leading-[1.65] text-[#5F5A52]">
                  {pattern.framing}
                </p>
                <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#E7E1D8] pt-4">
                  <span className="rounded-md border border-[#E7E1D8] bg-[#F8F6F1] px-2.5 py-1 text-xs font-semibold text-[#5F5A52]">
                    {pattern.companies.length} companies
                  </span>
                  <span className="text-sm font-semibold text-[#9A3D2B]">
                    Read pattern
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function getLatestPatternUpdatedAt() {
  const latest = patterns.reduce((max, pattern) => {
    const time = new Date(pattern.updated_at).getTime();
    return Number.isNaN(time) ? max : Math.max(max, time);
  }, 0);

  return latest > 0 ? new Date(latest).toISOString() : undefined;
}

function formatUpdatedMarker(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "recently";

  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}
