import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CategoryPixelIcon } from "@/components/market-map/category-pixel-icon";
import { CompanyCard } from "@/components/market-map/company-card";
import { SectionHeading } from "@/components/market-map/section-heading";
import { JsonLd } from "@/components/seo/JsonLd";
import { PublicShell } from "@/components/site/public-shell";
import { Button } from "@/components/ui/button";
import {
  categoryMeta,
  getCategoryCounts,
} from "@/data/market";
import {
  createShareMetadata,
  getShareImageUrl,
} from "@/lib/seo/shareMetadata";
import {
  categoryCollectionItems,
  collectionPageSchema,
} from "@/lib/seo/schema";
import { getPublishedCompanies } from "@/lib/supabase/market-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createShareMetadata({
  title: "NYC AI Startup Categories",
  description:
    "Explore early-stage NYC AI startups across healthcare, infrastructure, finance, legal, consumer, creative, and enterprise automation.",
  path: "/categories",
  image: getShareImageUrl({ page: "categories" }),
});

export default async function CategoriesPage() {
  const companies = await getPublishedCompanies();
  const counts = getCategoryCounts(companies);

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: "NYC AI Startup Categories",
          description:
            "Explore early-stage NYC AI startups across healthcare, infrastructure, finance, legal, consumer, creative, and enterprise automation.",
          url: "https://aiatlas.nyc/categories",
          items: categoryCollectionItems(),
        })}
      />
      <PublicShell>
      <section className="hero">
        <div className="editorial-container py-12">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="editorial-label">
                NYC AI categories
              </p>
              <h1 className="mt-5 max-w-[760px] font-heading text-[clamp(40px,5vw,64px)] font-medium leading-[0.95] tracking-[0] text-[#181818]">
                Explore the NYC AI scene by category.
              </h1>
              <p className="mt-5 max-w-[640px] text-[18px] leading-[1.55] text-[#5F5A52]">
                Learn which NYC startups are building across finance, legal,
                creative, healthcare, consumer, agent infrastructure, GTM, and
                data layers.
              </p>
            </div>
            <Button asChild className="app-primary-button">
              <Link href="/companies">
                Open startup directory
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-section">
        <div className="editorial-container py-12">
          <div className="grid border-t border-[#E7E1D8] lg:grid-cols-2">
            {categoryMeta.map((category) => {
              const categoryCompanies = companies
                .filter((company) => company.category === category.name)
                .slice(0, 2);

              return (
                <Link
                  key={category.slug}
                  href={`/categories/${category.slug}`}
                  className="group border-b border-[#E7E1D8] p-6 transition hover:bg-[rgb(17_17_17_/_0.025)] lg:odd:border-r"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <CategoryPixelIcon
                        category={category.name}
                        size="lg"
                        labeled
                      />
                      <div>
                        <h2 className="text-[24px] font-medium leading-[1.05] tracking-[0] text-[#181818]">
                          {category.name}
                        </h2>
                        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
                          {counts[category.name]} startups to know
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="app-arrow size-4 transition group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-5 text-sm leading-[1.6] text-[#5F5A52]">
                    {category.description}
                  </p>
                  <div className="mt-5 grid gap-2">
                    {categoryCompanies.map((company) => (
                      <div
                        key={company.id}
                        className="border-t border-[#E7E1D8] py-3 text-sm text-[#5F5A52]"
                      >
                        <span className="font-medium text-[#181818]">
                          {company.name}
                        </span>{" "}
                        · {company.short_description}
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-section">
        <div className="editorial-container py-12">
          <div className="mb-6 flex items-end justify-between">
            <SectionHeading
              eyebrow="Live directory"
              title="Representative startups"
              description="A live slice of companies shaping the map."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {companies.slice(0, 4).map((company) => (
              <CompanyCard key={company.id} company={company} compact />
            ))}
          </div>
        </div>
      </section>
      </PublicShell>
    </>
  );
}
