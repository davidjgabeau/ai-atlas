"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { formatViewCount } from "@/lib/metrics/formatViewCount";

const viewedCompaniesKey = "aiatlas:viewedCompanies";
const viewWindowMs = 24 * 60 * 60 * 1000;

type ViewedCompanies = Record<string, string>;

export function useCompanyView(companyId: string, initialViews: number) {
  const [views, setViews] = useState(normalizeViews(initialViews));
  const recordingRef = useRef(false);

  const recordView = useCallback(async () => {
    if (!companyId || typeof window === "undefined") return;
    if (recordingRef.current) return;

    const viewedCompanies = readViewedCompanies();
    const lastViewedAt = viewedCompanies[companyId];
    if (lastViewedAt && Date.now() - new Date(lastViewedAt).getTime() < viewWindowMs) {
      return;
    }

    const recordedAt = new Date().toISOString();
    recordingRef.current = true;
    viewedCompanies[companyId] = recordedAt;
    writeViewedCompanies(viewedCompanies);

    try {
      const response = await fetch(
        `/api/companies/${encodeURIComponent(companyId)}/view`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentViews: views }),
        },
      );

      if (!response.ok) {
        removeRecordedView(companyId, recordedAt);
        return;
      }

      const data = (await response.json()) as { views?: number };
      if (typeof data.views === "number") {
        setViews(normalizeViews(data.views));
      }
    } catch (error) {
      removeRecordedView(companyId, recordedAt);
      console.warn("Company view count failed:", error);
    } finally {
      recordingRef.current = false;
    }
  }, [companyId, views]);

  const formattedViews = useMemo(() => formatViewCount(views), [views]);

  return {
    views,
    formattedViews,
    recordView,
  };
}

function readViewedCompanies(): ViewedCompanies {
  try {
    const raw = window.localStorage.getItem(viewedCompaniesKey);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as ViewedCompanies)
      : {};
  } catch {
    return {};
  }
}

function writeViewedCompanies(viewedCompanies: ViewedCompanies) {
  try {
    window.localStorage.setItem(viewedCompaniesKey, JSON.stringify(viewedCompanies));
  } catch {
    // localStorage can be unavailable in private browsing; view tracking is non-critical.
  }
}

function removeRecordedView(companyId: string, recordedAt: string) {
  const viewedCompanies = readViewedCompanies();
  if (viewedCompanies[companyId] !== recordedAt) return;

  delete viewedCompanies[companyId];
  writeViewedCompanies(viewedCompanies);
}

function normalizeViews(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
