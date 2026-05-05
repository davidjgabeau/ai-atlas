import { NextResponse } from "next/server";

import { formatViewCount } from "@/lib/metrics/formatViewCount";
import {
  getSeededCompanyViews,
  incrementCompanyViews,
} from "@/lib/metrics/companyViews";
import { getPublishedCompanies } from "@/lib/supabase/market-data";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params;
  const companies = await getPublishedCompanies();
  const company = companies.find((item) => item.id === companyId);

  if (!company) {
    return NextResponse.json(
      { ok: false, error: "Company not found." },
      { status: 404 },
    );
  }

  const body = await readRequestBody(request);
  const metric = await incrementCompanyViews(
    companyId,
    normalizeBaselineViews(body.currentViews ?? company.metrics?.views, companyId),
  );

  return NextResponse.json({
    companyId,
    views: metric.views,
    formattedViews: formatViewCount(metric.views),
  });
}

async function readRequestBody(request: Request) {
  try {
    return (await request.json()) as { currentViews?: number };
  } catch {
    return {};
  }
}

function normalizeBaselineViews(value: unknown, companyId: string) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : getSeededCompanyViews(companyId);
}
