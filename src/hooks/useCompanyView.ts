"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatViewCount } from "@/lib/metrics/formatViewCount";

export function useCompanyView(companyId: string, initialViews: number) {
  const [views, setViews] = useState(normalizeViews(initialViews));
  const recordingRef = useRef(false);
  const viewsRef = useRef(views);

  useEffect(() => {
    viewsRef.current = views;
  }, [views]);

  const recordView = useCallback(async () => {
    if (!companyId || typeof window === "undefined") return;
    if (recordingRef.current) return;

    recordingRef.current = true;

    try {
      const response = await fetch(
        `/api/companies/${encodeURIComponent(companyId)}/view`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentViews: viewsRef.current }),
          keepalive: true,
        },
      );

      if (!response.ok) return;

      const data = (await response.json()) as { views?: number };
      if (typeof data.views === "number") {
        setViews(normalizeViews(data.views));
      }
    } catch (error) {
      console.warn("Company view count failed:", error);
    } finally {
      recordingRef.current = false;
    }
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
