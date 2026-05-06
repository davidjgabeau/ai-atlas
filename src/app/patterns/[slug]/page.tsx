import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

import { CompanyLogo } from "@/components/market-map/company-logo";
import { JsonLd } from "@/components/seo/JsonLd";
import { PublicShell } from "@/components/site/public-shell";
import { Button } from "@/components/ui/button";
import {
  getPatternBySlug,
  patterns,
  type PatternCompany,
} from "@/data/patterns";
import { getConsumptionProfileLabel } from "@/lib/model-usage/consumptionProfile";
import {
  absoluteUrl,
  createShareMetadata,
  getShareImageUrl,
  shareCta,
  truncateMeta,
} from "@/lib/seo/shareMetadata";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import type { Company } from "@/types/market";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return patterns.map((pattern) => ({ slug: pattern.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pattern = getPatternBySlug(slug);

  if (!pattern) {
    return createShareMetadata({
      title: "Pattern",
      description: `Recurring shapes across early-stage NYC AI startups. ${shareCta}.`,
      path: `/patterns/${slug}`,
      image: getShareImageUrl({ page: "insights" }),
    });
  }

  return createShareMetadata({
    title: pattern.title,
    description: truncateMeta(`${pattern.framing} ${shareCta}.`),
    path: `/patterns/${pattern.slug}`,
    image: getShareImageUrl({ page: "insights" }),
    type: "article",
  });
}

export default async function PatternDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pattern = getPatternBySlug(slug);

  if (!pattern) {
    notFound();
  }

  const companies = await getPublishedCompanies();
  const companiesBySlug = new Map(companies.map((company) => [company.slug, company]));
  const patternCompanies = pattern.companies
    .map((item) => ({
      relation: item,
      company: companiesBySlug.get(item.company_slug),
    }))
    .filter(
      (item): item is { relation: PatternCompany; company: Company } =>
        Boolean(item.company),
    );

  return (
    <>
      <JsonLd
        data={[
          articleSchema({
            title: pattern.title,
            description: pattern.framing,
            url: absoluteUrl(`/patterns/${pattern.slug}`),
            dateModified: pattern.updated_at,
          }),
          breadcrumbSchema([
            { name: "AI Atlas NYC", url: absoluteUrl("/") },
            { name: "Patterns", url: absoluteUrl("/patterns") },
            {
              name: pattern.title,
              url: absoluteUrl(`/patterns/${pattern.slug}`),
            },
          ]),
        ]}
      />
      <PublicShell>
      <section className="hero">
        <div className="editorial-container py-12">
          <Button asChild variant="ghost" size="sm" className="mb-8">
            <Link href="/patterns">
              <ArrowLeft className="size-4" />
              Back to patterns
            </Link>
          </Button>
          <p className="editorial-label">Pattern</p>
          <h1 className="mt-5 max-w-[880px] font-heading text-[clamp(40px,5vw,64px)] font-medium leading-[0.95] tracking-[-0.04em] text-[#181818]">
            {pattern.title}
          </h1>
          <p className="mt-6 max-w-[780px] text-[18px] leading-[1.6] text-[#5F5A52]">
            {pattern.framing}
          </p>
        </div>
      </section>

      <section className="bg-section">
        <div className="editorial-container py-12">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="editorial-label">Companies</p>
              <h2 className="mt-3 editorial-section-title">
                Companies that fit
              </h2>
            </div>
            {pattern.related_consumption_profile ? (
              <p className="max-w-md text-sm leading-6 text-[#5F5A52]">
                Pattern tends to drive heavy{" "}
                {getConsumptionProfileLabel(
                  pattern.related_consumption_profile,
                ).toLowerCase()}{" "}
                usage.
              </p>
            ) : null}
          </div>

          {patternCompanies.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {patternCompanies.map(({ relation, company }) => (
                <Link
                  key={relation.company_slug}
                  href={`/companies/${company.slug}`}
                  className="group rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-5 transition hover:bg-[rgb(154_61_43_/_0.045)]"
                >
                  <div className="flex items-start gap-3">
                    <CompanyLogo
                      company={company}
                      name={company.name}
                      category={company.category}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-lg font-semibold tracking-tight text-[#181818]">
                          {company.name}
                        </h3>
                        <ArrowRight className="size-3.5 shrink-0 text-[#9A3D2B] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#5F5A52]">
                        {relation.one_liner}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-[#E7E1D8] p-6 text-sm text-[#5F5A52]">
              Company links for this pattern will appear as the map syncs.
            </p>
          )}
        </div>
      </section>
      </PublicShell>
    </>
  );
}
