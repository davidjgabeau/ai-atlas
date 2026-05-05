import type { Metadata } from "next";

import { MarketMapClient } from "@/components/market-map/market-map-client";
import { getCompanyStats } from "@/lib/companies/getCompanyStats";
import { formatAiStartupCount } from "@/lib/companies/formatCompanyCount";
import {
  createShareMetadata,
  getShareImageUrl,
  shareCta,
  truncateMeta,
} from "@/lib/seo/shareMetadata";
import { getPublishedCompanies } from "@/lib/supabase/market-data";

export async function generateMetadata(): Promise<Metadata> {
  const companies = await getPublishedCompanies();
  const stats = getCompanyStats(companies);

  return createShareMetadata({
    title: "Early-Stage NYC AI Companies to Know | AI Atlas NYC",
    description: truncateMeta(
      `${formatAiStartupCount(stats.totalCompanies)} across consumer, healthcare, infrastructure, and more. ${shareCta}.`,
    ),
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

  return <MarketMapClient companies={companies} initialSearch={initialSearch} />;
}
