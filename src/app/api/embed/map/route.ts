import { NextResponse, type NextRequest } from "next/server";

import { categoryMeta } from "@/data/market";
import { getCompanyStats } from "@/lib/companies/getCompanyStats";
import {
  createEmbedCorsPreflightResponse,
  getEmbedCorsResult,
} from "@/lib/embed/cors";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import {
  buildCompanyMapLocations,
  categoryColors,
  getNormalizedMapPosition,
  mapLayoutBounds,
  type CompanyMapLocation,
} from "@/lib/map-layout";
import { SITE_URL } from "@/lib/seo/config";
import { getCompanySignalLabel } from "@/lib/signals/companySignal";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import type { Category, Company } from "@/types/market";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const corsOptions = {
  methods: ["GET", "OPTIONS"],
  allowAnyOrigin: true,
};

export function OPTIONS(request: NextRequest) {
  return createEmbedCorsPreflightResponse(request, corsOptions);
}

export async function GET(request: NextRequest) {
  const cors = getEmbedCorsResult(request, corsOptions);
  if (!cors.allowed) {
    return NextResponse.json(
      { error: "This origin is not allowed to read AI Atlas map embeds." },
      {
        status: 403,
        headers: cors.headers,
      },
    );
  }

  const companies = await getPublishedCompanies();
  const stats = getCompanyStats(companies);
  const locations = buildCompanyMapLocations(companies);
  const locationsByCategory = new Map<Category, typeof locations>();

  locations.forEach((location) => {
    const categoryLocations =
      locationsByCategory.get(location.company.category) ?? [];
    categoryLocations.push(location);
    locationsByCategory.set(location.company.category, categoryLocations);
  });

  const headers = new Headers(cors.headers);
  headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");

  return NextResponse.json(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      source: {
        name: "AI Atlas NYC",
        url: SITE_URL,
        mapUrl: absoluteUrl("/companies"),
      },
      layout: {
        type: "ai-atlas-nyc-normalized-map",
        coordinateSystem: "normalized-0-1",
        origin: "top-left",
        xAxis: "west-to-east",
        yAxis: "north-to-south",
        bounds: mapLayoutBounds,
        note:
          "x and y match the AI Atlas static map projection. Multiply by your SVG or canvas width and height.",
      },
      stats: {
        totalCompanies: stats.totalCompanies,
        totalCategories: stats.totalCategories,
        recentlyAddedCount: stats.recentlyAddedCount,
        lastUpdatedAt: stats.lastUpdatedAt,
        lastUpdatedLabel: stats.lastUpdatedAt
          ? formatRelativeUpdate(stats.lastUpdatedAt)
          : "recently",
      },
      categories: categoryMeta.map((category) => {
        const categoryLocations = locationsByCategory.get(category.name) ?? [];
        const center = getCategoryCenter(categoryLocations);

        return {
          name: category.name,
          slug: category.slug,
          href: absoluteUrl(`/categories/${category.slug}`),
          color: categoryColors[category.name],
          companyCount: categoryLocations.length,
          cx: center.x,
          cy: center.y,
          description: category.description,
        };
      }),
      companies: locations.map((location) => {
        const normalized = getNormalizedMapPosition(location.position);

        return {
          ...toMapCompany(location.company),
          color: categoryColors[location.company.category],
          confidence: location.confidence,
          neighborhood: location.neighborhood,
          lat: location.position.lat,
          lng: location.position.lng,
          x: normalized.x,
          y: normalized.y,
          radius: location.company.is_breakout ? 0.014 : 0.01,
        };
      }),
    },
    {
      headers,
    },
  );
}

function toMapCompany(company: Company) {
  const category = categoryMeta.find((item) => item.name === company.category);

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    href: absoluteUrl(`/companies/${company.slug}`),
    logoUrl: company.logo_url,
    websiteUrl: company.website_url,
    category: company.category,
    categorySlug: category?.slug ?? "",
    stage: company.stage,
    hook: company.generated.hook,
    signalLabel: getCompanySignalLabel(company),
    views: company.metrics?.views ?? 0,
    isFeatured: company.is_featured,
    isBreakout: company.is_breakout,
  };
}

function getCategoryCenter(locations: CompanyMapLocation[]) {
  if (locations.length === 0) {
    return { x: 0.5, y: 0.5 };
  }

  const totals = locations.reduce(
    (sum, location) => {
      const normalized = getNormalizedMapPosition(location.position);
      return {
        x: sum.x + normalized.x,
        y: sum.y + normalized.y,
      };
    },
    { x: 0, y: 0 },
  );

  return {
    x: Number((totals.x / locations.length).toFixed(4)),
    y: Number((totals.y / locations.length).toFixed(4)),
  };
}

function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}
