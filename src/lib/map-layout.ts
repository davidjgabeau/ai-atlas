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
};

const categoryClusters: Record<
  Category,
  Array<{ position: LatLngLiteral; neighborhood: string }>
> = {
  "Fintech & Trading AI": [
    { neighborhood: "Financial District", position: { lat: 40.7075, lng: -74.0113 } },
    { neighborhood: "Midtown", position: { lat: 40.7549, lng: -73.984 } },
    { neighborhood: "Flatiron", position: { lat: 40.7411, lng: -73.9897 } },
  ],
  "Legal & Compliance AI": [
    { neighborhood: "Tribeca", position: { lat: 40.7163, lng: -74.0086 } },
    { neighborhood: "Grand Central", position: { lat: 40.7527, lng: -73.9772 } },
    { neighborhood: "SoHo", position: { lat: 40.7243, lng: -74.0018 } },
  ],
  "Cybersecurity AI": [
    { neighborhood: "Midtown", position: { lat: 40.7549, lng: -73.984 } },
    { neighborhood: "Grand Central", position: { lat: 40.7527, lng: -73.9772 } },
    { neighborhood: "Flatiron", position: { lat: 40.7411, lng: -73.9897 } },
  ],
  "Media, Ads & Creative AI": [
    { neighborhood: "Chelsea", position: { lat: 40.7465, lng: -74.0014 } },
    { neighborhood: "Flatiron", position: { lat: 40.7411, lng: -73.9897 } },
    { neighborhood: "DUMBO", position: { lat: 40.7033, lng: -73.9881 } },
  ],
  "Health & Clinical AI": [
    { neighborhood: "Upper East Side", position: { lat: 40.7736, lng: -73.9566 } },
    { neighborhood: "Hudson Yards", position: { lat: 40.754, lng: -74.0022 } },
    { neighborhood: "Lower Manhattan", position: { lat: 40.709, lng: -74.01 } },
  ],
  "Life Sciences AI": [
    { neighborhood: "Kips Bay", position: { lat: 40.7391, lng: -73.9764 } },
    { neighborhood: "Union Square", position: { lat: 40.7359, lng: -73.9911 } },
    { neighborhood: "NoMad", position: { lat: 40.744, lng: -73.9884 } },
  ],
  "AI-Native Consumer & Social": [
    { neighborhood: "SoHo", position: { lat: 40.7243, lng: -74.0018 } },
    { neighborhood: "DUMBO", position: { lat: 40.7033, lng: -73.9881 } },
    { neighborhood: "Williamsburg", position: { lat: 40.7081, lng: -73.9571 } },
  ],
  "Agent Infrastructure": [
    { neighborhood: "Flatiron", position: { lat: 40.7411, lng: -73.9897 } },
    { neighborhood: "Hudson Square", position: { lat: 40.726, lng: -74.0075 } },
    { neighborhood: "Brooklyn Navy Yard", position: { lat: 40.7021, lng: -73.9707 } },
  ],
  "Model Tools & Dev Platform": [
    { neighborhood: "Flatiron", position: { lat: 40.7411, lng: -73.9897 } },
    { neighborhood: "NoHo", position: { lat: 40.7287, lng: -73.9926 } },
    { neighborhood: "Union Square", position: { lat: 40.7359, lng: -73.9911 } },
  ],
  "Enterprise GTM & RevOps AI": [
    { neighborhood: "Bryant Park", position: { lat: 40.7536, lng: -73.9832 } },
    { neighborhood: "NoMad", position: { lat: 40.744, lng: -73.9884 } },
    { neighborhood: "Lower East Side", position: { lat: 40.715, lng: -73.9843 } },
  ],
  "Data & Memory Layer": [
    { neighborhood: "Chelsea", position: { lat: 40.7465, lng: -74.0014 } },
    { neighborhood: "Union Square", position: { lat: 40.7359, lng: -73.9911 } },
    { neighborhood: "Williamsburg", position: { lat: 40.7081, lng: -73.9571 } },
  ],
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
  const categoryIndexes = new Map<Category, number>();

  return companies.map((company) => {
    const categoryIndex = categoryIndexes.get(company.category) ?? 0;
    categoryIndexes.set(company.category, categoryIndex + 1);

    const knownOffice = knownOfficeCoordinates[company.slug];
    if (knownOffice) {
      return {
        company,
        confidence: "confirmed",
        neighborhood: knownOffice.neighborhood,
        position: knownOffice.position,
      };
    }

    const cluster =
      categoryClusters[company.category] ??
      categoryClusters["Fintech & Trading AI"];
    const base = cluster[categoryIndex % cluster.length];
    const ring = Math.floor(categoryIndex / cluster.length);
    const latOffset = ((categoryIndex % 5) - 2) * 0.0018 + ring * 0.0008;
    const lngOffset = ((categoryIndex % 7) - 3) * 0.0022 - ring * 0.0007;

    return {
      company,
      confidence: company.office_address ? "confirmed" : "estimated",
      neighborhood: base.neighborhood,
      position: {
        lat: base.position.lat + latOffset,
        lng: base.position.lng + lngOffset,
      },
    };
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
