import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

import { CategoryPixelIcon } from "@/components/market-map/category-pixel-icon";
import { CompanyCard } from "@/components/market-map/company-card";
import { PublicShell } from "@/components/site/public-shell";
import { Button } from "@/components/ui/button";
import {
  categoryMeta,
  getCategoryBySlug,
} from "@/data/market";
import { formatCompanyCount } from "@/lib/companies/formatCompanyCount";
import {
  createShareMetadata,
  getShareImageUrl,
  shareCta,
  truncateMeta,
} from "@/lib/seo/shareMetadata";
import { getCompaniesByCategoryFromData } from "@/lib/supabase/market-data";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return categoryMeta.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    return createShareMetadata({
      title: "Category | AI Atlas NYC",
      description: `Browse AI Atlas categories and companies. ${shareCta}.`,
      path: `/categories/${slug}`,
      image: getShareImageUrl({ page: "categories" }),
    });
  }

  const companies = await getCompaniesByCategoryFromData(category.name);

  return createShareMetadata({
    title: `${category.name} | AI Atlas NYC`,
    description: truncateMeta(
      `${formatCompanyCount(companies.length)} in ${category.name}. ${category.description} ${shareCta}.`,
    ),
    path: `/categories/${category.slug}`,
    image: getShareImageUrl({ category: category.slug }),
    type: "article",
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const companies = await getCompaniesByCategoryFromData(category.name);

  return (
    <PublicShell>
      <section className="hero">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" size="sm" className="mb-8">
            <Link href="/companies">
              <ArrowLeft className="size-4" />
              Back to directory
            </Link>
          </Button>
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <CategoryPixelIcon
                category={category.name}
                size="lg"
                labeled
                className="mb-5"
              />
              <p className="live-count-pill px-3 py-1.5 text-xs">
                {companies.length} NYC startups to know
              </p>
              <h1 className="mt-4 font-heading text-[clamp(40px,5vw,64px)] font-medium leading-[0.95] tracking-[-0.04em] text-[#181818]">
                {category.name}
              </h1>
              <p className="mt-5 max-w-[680px] text-base leading-[1.6] text-[#5F5A52]">
                {category.description}
              </p>
            </div>
            <div className="rounded-md bg-[var(--app-surface)] p-5 app-card-border">
              <p className="text-xs font-medium uppercase tracking-[0.01em] text-[#7A746C]">
                Why this category matters
              </p>
              <p className="mt-3 text-base leading-7 text-[#5F5A52]">
                {category.thesis}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="font-heading text-[1.5rem] font-semibold leading-[1.2] tracking-[-0.02em] text-[#181818] md:text-[1.75rem]">
              Startups to know in {category.name}
            </h2>
            <Button asChild className="app-primary-button">
              <Link href="/submit">
                Submit a startup
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
