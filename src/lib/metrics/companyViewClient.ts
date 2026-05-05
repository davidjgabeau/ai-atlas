const companyViewSampleRate = 0.5;
const recordedCompanyViewKeys = new Set<string>();

export async function recordSampledCompanyView(
  companyId: string,
  currentViews: number,
) {
  if (!shouldRecordCompanyView(companyId)) return null;

  try {
    const response = await fetch(
      `/api/companies/${encodeURIComponent(companyId)}/view`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentViews }),
        keepalive: true,
      },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as { views?: number };
    return typeof data.views === "number" ? data.views : null;
  } catch (error) {
    console.warn("Company view count failed:", error);
    return null;
  }
}

function shouldRecordCompanyView(companyId: string) {
  if (!companyId || typeof window === "undefined") return false;

  const viewKey = [
    window.location.pathname,
    window.location.search,
    companyId,
  ].join(":");

  if (recordedCompanyViewKeys.has(viewKey)) return false;

  recordedCompanyViewKeys.add(viewKey);
  return Math.random() < companyViewSampleRate;
}
