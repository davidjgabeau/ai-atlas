"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { recordSampledCompanyView } from "@/lib/metrics/companyViewClient";
import { formatViewCount } from "@/lib/metrics/formatViewCount";

export function useCompanyView(companyId: string, initialViews: number) {
  const views = normalizeViews(initialViews);
  const recordingRef = useRef(false);
  const viewsRef = useRef(views);

  useEffect(() => {
    viewsRef.current = views;
  }, [views]);

  const recordView = useCallback(async () => {
    if (!companyId || typeof window === "undefined") return;
    if (recordingRef.current) return;

    recordingRef.current = true;
    void recordSampledCompanyView(
      companyId,
      viewsRef.current,
    ).finally(() => {
      recordingRef.current = false;
    });
  }, [companyId]);

  const formattedViews = useMemo(() => formatViewCount(views), [views]);

  return {
    views,
    formattedViews,
    recordView,
  };
}

function normalizeViews(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
