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

const knownOfficeCoordinates: Record<
  string,
  { position: LatLngLiteral; neighborhood: string }
> = {
  hebbia: {
    neighborhood: "SoHo",
    position: { lat: 40.7247, lng: -74.0004 },
  },
  "norm-ai": {
    neighborhood: "World Trade Center",
    position: { lat: 40.713, lng: -74.0117 },
  },
  "manifest-os": {
    neighborhood: "Flatiron",
    position: { lat: 40.741, lng: -73.9865 },
  },
  agentio: {
    neighborhood: "NoMad",
    position: { lat: 40.7461, lng: -73.9865 },
  },
  anterior: {
    neighborhood: "NoMad",
    position: { lat: 40.7457, lng: -73.9847 },
  },
  "emergence-ai": {
    neighborhood: "Bryant Park",
    position: { lat: 40.7525, lng: -73.9833 },
  },
  kalepa: {
    neighborhood: "Flatiron",
    position: { lat: 40.7399, lng: -73.9895 },
  },
  hyperscience: {
    neighborhood: "World Trade Center",
    position: { lat: 40.713, lng: -74.0132 },
  },
};

export function buildCompanyMapLocations(
  companies: Company[],
): CompanyMapLocation[] {
  return companies.flatMap((company): CompanyMapLocation[] => {
    const office = knownOfficeCoordinates[company.slug];
    if (!office || !company.office_address?.trim()) return [];
    return [{ company, confidence: "confirmed", neighborhood: office.neighborhood, position: office.position }];
  });
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
