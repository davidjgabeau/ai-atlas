import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";

import { CategoryBadge } from "@/components/market-map/category-badge";
import { CompanyLogo } from "@/components/market-map/company-logo";
import { RecentActivity } from "@/components/market-map/recent-activity";
import { UsageBadge } from "@/components/market-map/usage-badge";
import { PublicShell } from "@/components/site/public-shell";
import { Button } from "@/components/ui/button";
import {
  createShareMetadata,
  getShareImageUrl,
  shareCta,
} from "@/lib/seo/shareMetadata";
import { getCompanySignalLabel } from "@/lib/signals/companySignal";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import type { Company } from "@/types/market";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createShareMetadata({
  title: "Current Read | AI Atlas NYC",
  description: `Short editorial notes from the full early-stage NYC AI map and latest additions. ${shareCta}.`,
  path: "/insights",
  image: getShareImageUrl({ page: "insights" }),
});

export default async function InsightsPage() {
  const companies = await getPublishedCompanies();
  const recentlyActive = [...companies]
    .sort(
      (a, b) =>
        new Date(b.recent_activity_date).getTime() -
        new Date(a.recent_activity_date).getTime(),
    )
    .slice(0, 6);
  const clearSignalCompanies = companies
    .filter((company) =>
      ["Clear buyer pull", "Workflow signal", "Funding signal"].includes(
        getCompanySignalLabel(company),
      ),
    )
    .slice(0, 6);
  const clearSignalCount = companies.filter(
    (company) =>
      ["Clear buyer pull", "Workflow signal", "Funding signal"].includes(
        getCompanySignalLabel(company),
      ),
  );
  const breakoutCompanies = companies.filter((company) => company.is_breakout);
  const breakout = breakoutCompanies.slice(0, 6);

  return (
    <PublicShell>
      <section className="hero">
        <div className="editorial-container grid gap-8 py-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="editorial-label">
              NYC AI Signals
            </p>
            <h1 className="mt-5 max-w-[760px] font-heading text-[clamp(40px,5vw,64px)] font-medium leading-[0.95] tracking-[-0.04em] text-[#181818]">
              Which Early-Stage NYC AI Startups Show the Clearest Signal Right Now
            </h1>
            <p className="mt-5 max-w-[640px] text-[18px] leading-[1.55] text-[#5F5A52]">
              Follow featured companies, recently active updates, and startups
              with unusually clear buyer or workflow signal.
            </p>
            <Button asChild className="mt-5 app-primary-button">
              <Link href="/companies">
                Browse the directory
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="border-y border-[#E7E1D8] py-6 lg:col-span-4 lg:col-start-9">
            <div className="flex items-center gap-3">
              <span className="text-[#9A3D2B]">
                <TrendingUp className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#181818]">
                  NYC startup pulse
                </p>
                <p className="text-sm text-[#7A746C]">
                  Activity, buyer clarity, and founder signal in one view.
                </p>
              </div>
            </div>
            <div className="mt-6 grid divide-y divide-[#E7E1D8] border-y border-[#E7E1D8]">
              <InsightMetric
                label="Featured"
                value={String(breakoutCompanies.length)}
              />
              <InsightMetric
                label="Workflow depth"
                value={String(clearSignalCount.length)}
              />
              <InsightMetric
                label="Recently active"
                value={String(recentlyActive.length)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-section">
        <div className="editorial-container grid gap-8 py-12 xl:grid-cols-3">
          <InsightColumn
            id="breakout-watch"
            title="Featured"
            description="NYC startups with a sharp wedge, fast activity, or strong platform fit."
            companies={breakout}
            accent="text-amber-600"
          />
          <InsightColumn
            id="recently-active"
            title="Recently Active"
            description="The newest NYC activity across launches, pilots, funding, and product updates."
            companies={recentlyActive}
            accent="text-[#9A3D2B]"
          />
          <InsightColumn
            id="high-usage-potential"
            title="Clear Workflow Depth"
            description="NYC products likely to create repeated AI work and durable customer pull."
            companies={clearSignalCompanies}
            accent="text-emerald-600"
          />
        </div>
      </section>
    </PublicShell>
  );
}

function InsightMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-sm text-[#5F5A52]">{label}</span>
      <span className="font-heading text-2xl font-medium text-[#181818]">
        {value}
      </span>
    </div>
  );
}

function InsightColumn({
  id,
  title,
  description,
  companies,
  accent,
}: {
  id: string;
  title: string;
  description: string;
  companies: Company[];
  accent: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-y border-[#E7E1D8]"
    >
      <div className="border-b border-[#E7E1D8] p-5">
        <div className="flex items-center gap-2">
          <Sparkles className={`size-4 ${accent}`} />
          <h2 className="text-[24px] font-medium tracking-[-0.02em] text-[#181818]">
            {title}
          </h2>
        </div>
        <p className="mt-3 text-sm leading-[1.6] text-[#5F5A52]">{description}</p>
      </div>
      <div className="divide-y divide-[#E7E1D8]">
        {companies.map((company) => (
          <Link
            key={company.id}
            href={`/companies/${company.slug}`}
            className="block border-l-4 border-l-transparent p-4 transition hover:border-l-[#E7E1D8] hover:bg-[rgb(154_61_43_/_0.06)]"
          >
            <div className="flex items-start gap-3">
              <CompanyLogo
                company={company}
                name={company.name}
                category={company.category}
                className="size-10 text-xs"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-[#181818]">
                    {company.name}
                  </p>
                  <UsageBadge value={getCompanySignalLabel(company)} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-[1.55] text-[#66625C]">
                  {company.short_description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <CategoryBadge category={company.category} />
                  <span className="rounded-md border border-[#E7E1D8] px-2 py-1 text-xs text-[#5F5A52]">
                    {company.stage}
                  </span>
                </div>
                <div className="mt-3">
                  <RecentActivity
                    text={company.recent_activity_text}
                    date={company.recent_activity_date}
                    compact
                  />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
