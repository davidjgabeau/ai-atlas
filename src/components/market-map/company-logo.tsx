"use client";

import { useMemo, useState } from "react";

import { categoryStyles } from "@/components/market-map/category-style";
import { getCompanyLogoSource } from "@/lib/logos/companyLogoSource";
import { cn } from "@/lib/utils";
import type { Category, Company } from "@/types/market";

export function CompanyLogo({
  company,
  name,
  category,
  logoUrl,
  websiteUrl,
  className,
}: {
  company?: Company;
  name: string;
  category: Category;
  logoUrl?: string;
  websiteUrl?: string;
  className?: string;
}) {
  const categoryStyle = categoryStyles[category];
  const logoSource = useMemo(
    () =>
      getCompanyLogoSource(
        company ?? {
          logoUrl,
          websiteUrl,
        },
      ),
    [company, logoUrl, websiteUrl],
  );
  const [logoFailed, setLogoFailed] = useState(false);
  const showCompanyLogo = Boolean(logoSource && !logoFailed);

  return (
    <div
      aria-label={`${name} logo`}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#E7E1D8] bg-[#F8F4EF] ring-4 ring-[#E7E1D8]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- company favicons come from arbitrary domains and fall back safely. */}
      <img
        src={showCompanyLogo ? logoSource : categoryStyle.avatarSrc}
        alt=""
        width={96}
        height={96}
        loading="lazy"
        decoding="async"
        className={cn(
          "h-full w-full object-contain",
          showCompanyLogo
            ? "bg-white p-1.5"
            : "[image-rendering:pixelated]",
        )}
        draggable={false}
        onError={() => setLogoFailed(true)}
      />
    </div>
  );
}
