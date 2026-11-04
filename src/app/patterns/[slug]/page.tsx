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
      description: `Recurring shapes across NYC AI startups. ${shareCta}.`,
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
  const patternCategories = getPatternCategories(patternCompanies);

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

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
              <div>
                <p className="editorial-label">Pattern</p>
                <h1 className="mt-5 max-w-[880px] font-heading text-[clamp(40px,5vw,64px)] font-medium leading-[0.95] tracking-[0] text-[#181818]">
                  {pattern.title}
                </h1>
                <div className="mt-6 max-w-[780px] space-y-5 text-[18px] leading-[1.6] text-[#5F5A52]">
                  {pattern.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>

              <aside className="rounded-md border border-[#E7E1D8] bg-[rgb(251_250_247_/_0.72)] p-6 lg:self-start">
                <p className="editorial-label">Pattern brief</p>
                <dl className="mt-5 divide-y divide-[#E7E1D8] border-y border-[#E7E1D8] text-sm">
                  <div className="flex items-start justify-between gap-4 py-4">
                    <dt className="font-semibold text-[#5F5A52]">Companies</dt>
                    <dd className="font-heading text-[24px] leading-none text-[#181818]">
                      {patternCompanies.length}
                    </dd>
                  </div>
                  <div className="py-4">
                    <dt className="font-semibold text-[#5F5A52]">Categories</dt>
                    <dd className="mt-2 leading-[1.55] text-[#181818]">
                      {patternCategories.length > 0
                        ? patternCategories.join(", ")
                        : "Mapped companies"}
                    </dd>
                  </div>
                </dl>
                <a
                  href="#companies-that-fit"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#9A3D2B] transition hover:text-[#181818]"
                >
                  {pattern.cta}
                  <ArrowRight className="size-4" />
                </a>
              </aside>
            </div>
          </div>
        </section>

        <section id="companies-that-fit" className="scroll-mt-24 bg-section">
          <div className="editorial-container py-12">
            <div className="mb-6">
              <p className="editorial-label">Companies</p>
              <h2 className="mt-3 editorial-section-title">
                Companies that fit
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5F5A52]">
                The companies below show how the pattern appears in real buyer
                work, from first contact through repeat operations.
              </p>
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
                          <h3 className="line-clamp-2 text-lg font-semibold tracking-[0] text-[#181818]">
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
                More company links will appear as the map expands.
              </p>
            )}
          </div>
        </section>
      </PublicShell>
    </>
  );
}

function getPatternCategories(
  patternCompanies: Array<{ relation: PatternCompany; company: Company }>,
) {
  return Array.from(
    new Set(
      patternCompanies.map(({ company }) => company.category).filter(Boolean),
    ),
  );
}
