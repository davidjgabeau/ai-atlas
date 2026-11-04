import { officeEvidence, isDocumentedOffice } from "./research/evidence";
import type { Category, Company } from "@/types/market";

export type LatLngLiteral = {
  lat: number;
  lng: number;
};

export type CompanyMapLocation = {
  company: Company;
  confidence: "confirmed" | "estimated";
  neighborhood: string;
  position: LatLngLiteral;
};

export type NormalizedMapPosition = {
  x: number;
  y: number;
};

export const mapLayoutBounds = {
  minLng: -74.08,
  maxLng: -73.75,
  minLat: 40.55,
  maxLat: 40.92,
} as const;

export const categoryColors: Record<Category, string> = {
  "Fintech & Trading AI": "#2563eb",
  "Legal & Compliance AI": "#7c3aed",
  "Cybersecurity AI": "#0f766e",
  "Media, Ads & Creative AI": "#e11d48",
  "Health & Clinical AI": "#059669",
  "Life Sciences AI": "#047857",
  "AI-Native Consumer & Social": "#f59e0b",
  "Agent Infrastructure": "#0891b2",
  "Model Tools & Dev Platform": "#0f766e",
  "Enterprise GTM & RevOps AI": "#ea580c",
  "Data & Memory Layer": "#4f46e5",
  "Personal AI": "#A855F7",
};

export function buildCompanyMapLocations(companies: Company[]): CompanyMapLocation[] {
  const locations: CompanyMapLocation[] = [];
  for (const company of companies) {
    const office = officeEvidence.find((o) => o.company_slug === company.slug && isDocumentedOffice(o)
      && typeof o.latitude === "number" && typeof o.longitude === "number");
    if (!office || typeof office.latitude !== "number" || typeof office.longitude !== "number") continue;
    locations.push({ company, confidence: office.evidence_status === "verified" ? "confirmed" : "estimated",
      neighborhood: office.neighborhood || office.borough || "NYC", position: { lat: office.latitude, lng: office.longitude } });
  }
  return locations;
}

export function getNormalizedMapPosition(
  position: LatLngLiteral,
): NormalizedMapPosition {
  const { minLng, maxLng, minLat, maxLat } = mapLayoutBounds;

  return {
    x: clamp((position.lng - minLng) / (maxLng - minLng), 0.08, 0.92),
    y: clamp((maxLat - position.lat) / (maxLat - minLat), 0.1, 0.88),
  };
}

export function getCategoryMapCenters(locations: CompanyMapLocation[]) {
  const byCategory = new Map<Category, CompanyMapLocation[]>();
  locations.forEach((location) => {
    const categoryLocations = byCategory.get(location.company.category) ?? [];
    categoryLocations.push(location);
    byCategory.set(location.company.category, categoryLocations);
  });

  return byCategory;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
