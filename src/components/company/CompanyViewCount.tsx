"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye } from "lucide-react";

import { recordSampledCompanyView } from "@/lib/metrics/companyViewClient";
import { formatViewCount } from "@/lib/metrics/formatViewCount";
import { cn } from "@/lib/utils";

type CompanyViewCountProps = {
  views?: number;
  companyId?: string;
  className?: string;
  showTextLabel?: boolean;
  trackImpression?: boolean;
};

export function CompanyViewCount({
  views = 0,
  companyId,
  className,
  showTextLabel = false,
  trackImpression = true,
}: CompanyViewCountProps) {
  const [displayViews, setDisplayViews] = useState(normalizeViews(views));
  const elementRef = useRef<HTMLSpanElement | null>(null);
  const recordedRef = useRef(false);
  const viewsRef = useRef(displayViews);
  const formattedViews = useMemo(
    () => formatViewCount(displayViews),
    [displayViews],
  );

  useEffect(() => {
    viewsRef.current = normalizeViews(views);
  }, [views]);

  useEffect(() => {
    viewsRef.current = displayViews;
  }, [displayViews]);

  useEffect(() => {
    recordedRef.current = false;
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !trackImpression || typeof window === "undefined") return;
    if (recordedRef.current) return;

    const element = elementRef.current;
    if (!element) return;

    let cancelled = false;

    const recordImpression = async () => {
      if (cancelled || recordedRef.current) return;

      recordedRef.current = true;

      const nextViews = await recordSampledCompanyView(
        companyId,
        viewsRef.current,
      );
      if (!cancelled && typeof nextViews === "number") {
        setDisplayViews(normalizeViews(nextViews));
      }
    };

    if (!("IntersectionObserver" in window)) {
      void recordImpression();
      return () => {
        cancelled = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        observer.disconnect();
        void recordImpression();
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.35,
      },
    );

    observer.observe(element);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [companyId, trackImpression]);

  return (
    <span
      aria-label={`${formattedViews} views`}
      ref={elementRef}
      className={cn(
        "inline-flex items-center gap-1 text-[12px] font-medium leading-none text-[#66625C] transition group-hover:text-[#4F4A43]",
        className,
      )}
    >
      <Eye className="size-3.5 opacity-65" aria-hidden="true" />
      <span>{formattedViews}</span>
      {showTextLabel ? (
        <span aria-hidden="true">{displayViews === 1 ? "view" : "views"}</span>
      ) : (
        <span className="sr-only">views</span>
      )}
    </span>
  );
}

function normalizeViews(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
