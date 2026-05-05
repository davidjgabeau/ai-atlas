import { ImageResponse } from "next/og";
import type React from "react";

import { getCategoryBySlug } from "@/data/market";
import { getCompanyStats } from "@/lib/companies/getCompanyStats";
import {
  formatAiStartupCount,
  formatCompanyCount,
} from "@/lib/companies/formatCompanyCount";
import { getCompanyBySlugFromData, getPublishedCompanies } from "@/lib/supabase/market-data";
import { shareCta, siteName } from "@/lib/seo/shareMetadata";
import type { Category, Company } from "@/types/market";

export const dynamic = "force-dynamic";

const size = {
  width: 1200,
  height: 630,
};

const categorySpritePaths: Record<Category, string> = {
  "Fintech & Trading AI": "/avatars/categories/fintech-trading-ai.png",
  "Legal & Compliance AI": "/avatars/categories/legal-compliance-ai.png",
  "Media, Ads & Creative AI": "/avatars/categories/media-ads-creative-ai.png",
  "Health & Clinical AI": "/avatars/categories/health-clinical-ai.png",
  "AI-Native Consumer & Social": "/avatars/categories/ai-native-consumer-social.png",
  "Agent Infrastructure": "/avatars/categories/agent-infrastructure.png",
  "Model Tools & Dev Platform": "/avatars/categories/model-tools-dev-platform.png",
  "Enterprise GTM & RevOps AI": "/avatars/categories/enterprise-gtm-revops-ai.png",
  "Data & Memory Layer": "/avatars/categories/data-memory-layer.png",
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const companySlug = searchParams.get("company");
  const categorySlug = searchParams.get("category");
  const page = searchParams.get("page") ?? "home";

  if (companySlug) {
    const company = await getCompanyBySlugFromData(companySlug);
    if (company) {
      return imageResponse(
        getCompanyCard({
          company,
          origin,
        }),
      );
    }
  }

  if (categorySlug) {
    const category = getCategoryBySlug(categorySlug);
    if (category) {
      const companies = await getPublishedCompanies();
      const count = companies.filter(
        (company) => company.category === category.name,
      ).length;

      return imageResponse(
        getShareCard({
          origin,
          eyebrow: shareCta,
          title: category.name,
          body: `${formatCompanyCount(count)} to know. ${category.description}`,
          meta: "Category map",
          spritePath: categorySpritePaths[category.name],
        }),
      );
    }
  }

  const companies = await getPublishedCompanies();
  const stats = getCompanyStats(companies);

  const pageCards: Record<string, {
    title: string;
    body: string;
    meta: string;
    spritePath: string;
  }> = {
    companies: {
      title: "Early-Stage NYC AI Companies to Know",
      body: `${formatAiStartupCount(stats.totalCompanies)} across consumer, healthcare, infrastructure, and more.`,
      meta: "Startup directory",
      spritePath: "/icons/map.png",
    },
    categories: {
      title: "Browse the map by category.",
      body: `${stats.totalCategories} categories across the early-stage NYC AI map.`,
      meta: "Category guide",
      spritePath: "/icons/grid.png",
    },
    feed: {
      title: "Newsfeed",
      body: "Early-stage NYC AI news links and official updates from mapped companies.",
      meta: "Newsfeed",
      spritePath: "/icons/compass.png",
    },
    jobs: {
      title: "Roles at Early-Stage NYC AI Companies",
      body: "A hiring board for people exploring teams in the AI Atlas map.",
      meta: "Jobs board",
      spritePath: "/icons/pin.png",
    },
    insights: {
      title: "Current Read",
      body: "Short editorial notes from the full early-stage NYC AI map and latest additions.",
      meta: "Current read",
      spritePath: "/icons/skyline.png",
    },
    submit: {
      title: "Submit a startup.",
      body: "Add an early-stage company building AI in New York.",
      meta: "Curation",
      spritePath: "/icons/bridge-mini.png",
    },
    home: {
      title: siteName,
      body: `${formatAiStartupCount(stats.totalCompanies)} across consumer, healthcare, infrastructure, and more.`,
      meta: "Market map",
      spritePath: "/icons/globe.png",
    },
  };

  return imageResponse(
    getShareCard({
      origin,
      eyebrow: shareCta,
      ...(pageCards[page] ?? pageCards.home),
    }),
  );
}

function imageResponse(element: React.ReactElement) {
  return new ImageResponse(element, {
    ...size,
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}

function getCompanyCard({
  company,
  origin,
}: {
  company: Company;
  origin: string;
}) {
  return getShareCard({
    origin,
    eyebrow: shareCta,
    title: company.name,
    body: company.generated?.hook || company.one_line_thesis || company.short_description,
    meta: `${company.category} · ${company.stage}`,
    spritePath: categorySpritePaths[company.category],
  });
}

function getShareCard({
  origin,
  eyebrow,
  title,
  body,
  meta,
  spritePath,
}: {
  origin: string;
  eyebrow: string;
  title: string;
  body: string;
  meta: string;
  spritePath: string;
}) {
  const spriteUrl = new URL(spritePath, origin).toString();
  const globeUrl = new URL("/icons/globe.png", origin).toString();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#F8F6F1",
        color: "#111111",
        border: "1px solid #E7E1D8",
        padding: 54,
        fontFamily: "Georgia, serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 86% 12%, rgba(154, 61, 43, 0.08), transparent 30%), linear-gradient(90deg, rgba(231,225,216,0.56) 1px, transparent 1px)",
          backgroundSize: "auto, 80px 80px",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          borderTop: "2px solid #111111",
          borderBottom: "1px solid #E7E1D8",
          padding: "30px 0 28px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontFamily: "Arial, sans-serif",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain img tags inside ImageResponse. */}
            <img
              src={globeUrl}
              width={54}
              height={54}
              style={{ imageRendering: "pixelated" }}
              alt=""
            />
            {siteName}
          </div>
          <div
            style={{
              color: "#9A3D2B",
              fontFamily: "Arial, sans-serif",
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 48,
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 780,
            }}
          >
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: 22,
                color: "#66625C",
                marginBottom: 18,
              }}
            >
              {meta}
            </div>
            <div
              style={{
                fontSize: title.length > 28 ? 72 : 88,
                lineHeight: 0.92,
                letterSpacing: "-0.03em",
                fontWeight: 700,
                maxWidth: 810,
              }}
            >
              {title}
            </div>
            <div
              style={{
                marginTop: 24,
                maxWidth: 740,
                fontFamily: "Arial, sans-serif",
                fontSize: 30,
                lineHeight: 1.28,
                color: "#4D4943",
                fontWeight: 600,
              }}
            >
              {truncateForCard(body, 138)}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 188,
              height: 188,
              border: "1px solid #E7E1D8",
              borderRadius: 8,
              background: "#FBFAF7",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain img tags inside ImageResponse. */}
            <img
              src={spriteUrl}
              width={132}
              height={132}
              style={{ imageRendering: "pixelated", objectFit: "contain" }}
              alt=""
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            fontFamily: "Arial, sans-serif",
            color: "#66625C",
            fontSize: 22,
          }}
        >
          <span>aiatlas.nyc</span>
          <span>Explore companies →</span>
        </div>
      </div>
    </div>
  );
}

function truncateForCard(value: string, maxLength: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;

  return `${clean.slice(0, maxLength - 1).replace(/\s+\S*$/, "").trim()}...`;
}
