"use client";

import { Clock3, Hand, Sprout } from "lucide-react";

type HeroMetadataLineProps = {
  updatedLabel?: string;
};

export function HeroMetadataLine({ updatedLabel }: HeroMetadataLineProps) {
  return (
    <>
      <p className="text-meta hero-metadata-line mt-5 flex items-center gap-x-1.5 text-[10.75px] leading-none max-[380px]:text-[10px] lg:hidden">
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <Hand className="hidden size-3.5 min-[430px]:inline" aria-hidden="true" />
          Curated by hand
        </span>
        <span aria-hidden="true" className="shrink-0 text-[#AFA79C]">
          •
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <Sprout className="hidden size-3.5 min-[430px]:inline" aria-hidden="true" />
          Pre-seed through Series A
        </span>
        {updatedLabel ? (
          <>
            <span aria-hidden="true" className="shrink-0 text-[#AFA79C]">
              •
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <Clock3 className="hidden size-3.5 min-[430px]:inline" aria-hidden="true" />
              Updated {updatedLabel}
            </span>
          </>
        ) : null}
      </p>

      <div className="text-meta hero-metadata-stack mt-8 hidden space-y-3 text-[15px] leading-[1.45] lg:block">
        <p className="inline-flex items-center gap-2">
          <Hand className="size-4 text-[#5F5A52]" aria-hidden="true" />
          Curated by hand. Updated agentically.
        </p>
        <p className="inline-flex items-center gap-2">
          <Sprout className="size-4 text-[#5F5A52]" aria-hidden="true" />
          Pre-seed through Series A.
        </p>
        {updatedLabel ? (
          <p className="inline-flex items-center gap-2">
            <Clock3 className="size-4 text-[#5F5A52]" aria-hidden="true" />
            Latest update: {updatedLabel}
          </p>
        ) : null}
      </div>
    </>
  );
}
