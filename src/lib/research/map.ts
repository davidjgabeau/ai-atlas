import { officeMatchesFilters, type OfficeFilters } from "./evidence";
import type { OfficeEvidence, ResearchCompany } from "./types";

export type ResearchMapEntry = { company: ResearchCompany; office: OfficeEvidence };
export type ResearchMapGroup = { key: string; latitude: number; longitude: number; entries: ResearchMapEntry[] };

export function hasOfficeCoordinates(office: OfficeEvidence) {
  return Boolean(office.address?.trim()) && typeof office.latitude === "number" && Number.isFinite(office.latitude)
    && typeof office.longitude === "number" && Number.isFinite(office.longitude)
    && office.latitude > 40.49 && office.latitude < 40.93
    && office.longitude > -74.27 && office.longitude < -73.68;
}

/** One marker per physical location; preserve all tenants and multiple offices. */
export function buildResearchMapGroups(companies: ResearchCompany[], filters: OfficeFilters = {}) {
  const groups = new Map<string, ResearchMapGroup>();
  for (const company of companies) {
    for (const office of company.offices) {
      if (!officeMatchesFilters(office, filters) || !hasOfficeCoordinates(office)) continue;
      const latitude = office.latitude!, longitude = office.longitude!;
      const key = `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
      const group = groups.get(key) ?? { key, latitude, longitude, entries: [] };
      const previous = group.entries.findIndex((e) => e.company.slug === company.slug);
      if (previous < 0) group.entries.push({ company, office });
      else if (group.entries[previous].office.evidence_status !== "verified" && office.evidence_status === "verified") group.entries[previous] = { company, office };
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.entries[0].company.name.localeCompare(b.entries[0].company.name));
}

export function researchMapToGeoJson(groups: ResearchMapGroup[]) {
  return {
    type: "FeatureCollection",
    features: groups.flatMap((group) => group.entries.map(({ company, office }) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [group.longitude, group.latitude] },
      properties: {
        company: company.name, slug: company.slug, stage: company.stage, category: company.category,
        address: office.address ?? null, borough: office.borough, neighborhood: office.neighborhood ?? null,
        evidence: office.evidence_status, occupancy: office.occupancy_status ?? "unknown",
        source: office.source_url, source_date: office.source_date ?? null, checked: office.verified_at,
        notes: office.notes ?? null, geocode_source: office.geocode_source ?? null,
        geocode_note: office.geocode_note ?? null,
      },
    }))),
  };
}
