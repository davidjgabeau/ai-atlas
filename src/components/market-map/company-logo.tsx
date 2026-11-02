"use client";

import { useMemo, useState } from "react";

import { categoryStyles } from "@/components/market-map/category-style";
import { getCompanyLogoSource, getDomainFromUrl, getFaviconSourceForDomain } from "@/lib/logos/companyLogoSource";
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
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const domain = getDomainFromUrl(company?.website_url ?? websiteUrl);
  const candidates = [logoSource, domain ? getFaviconSourceForDomain(domain) : "", categoryStyle.avatarSrc];
  const source = candidates.find((candidate) => candidate && !failedSources.includes(candidate));
  const showCompanyLogo = source !== categoryStyle.avatarSrc;
  const markFailed = (value: string) => setFailedSources((current) => current.includes(value) ? current : [...current, value]);

  return (
    <div
      aria-label={`${name} logo`}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#E7E1D8] bg-[#F8F4EF] ring-4 ring-[#E7E1D8]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- company favicons come from arbitrary domains and fall back safely. */}
      {source ? <img
        key={source}
        src={source}
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
        ref={(image) => {
          if (image?.complete && image.naturalWidth === 0) markFailed(source);
        }}
        onError={() => markFailed(source)}
      /> : <span aria-hidden="true" className="font-semibold text-[#746D64]">{name.slice(0, 2).toUpperCase()}</span>}
    </div>
  );
}
