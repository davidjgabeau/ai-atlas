import type { Metadata } from "next";

import { MarketMapClient } from "@/components/market-map/market-map-client";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  createShareMetadata,
  getShareImageUrl,
} from "@/lib/seo/shareMetadata";
import {
  collectionPageSchema,
  companyCollectionItems,
} from "@/lib/seo/schema";
import { getPublishedCompanies } from "@/lib/supabase/market-data";

export async function generateMetadata(): Promise<Metadata> {
  return createShareMetadata({
    title: "NYC AI Startup Map",
    description:
      "Browse early-stage NYC AI startups by category, stage, buyer, workflow, and product surface.",
    path: "/companies",
    image: getShareImageUrl({ page: "companies" }),
  });
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; search?: string }>;
}) {
  const params = await searchParams;
  const initialSearch = params?.q ?? params?.search ?? "";
  const companies = await getPublishedCompanies();

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: "NYC AI Startup Map",
          description:
            "Browse early-stage NYC AI startups by category, stage, buyer, workflow, and product surface.",
          url: "https://aiatlas.nyc/companies",
          items: companyCollectionItems(companies),
        })}
      />
      <MarketMapClient companies={companies} initialSearch={initialSearch} />
    </>
  );
}
