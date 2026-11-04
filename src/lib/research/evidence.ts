import offices from "@/data/reporting/offices.json";
import type { OfficeEvidence, ResearchCompany } from "./types";

export const officeEvidence = offices as OfficeEvidence[];

export function isDocumentedOffice(office: OfficeEvidence) {
  return office.location_type !== "mailing" && office.location_type !== "unverified"
    && ["verified", "reported"].includes(office.evidence_status)
    && Boolean(office.borough) && Boolean(office.source_url);
}

export function filterResearchCompanies(companies: ResearchCompany[], filters: {
  query?: string; borough?: string; neighborhood?: string; stage?: string;
  category?: string; evidence?: string; outside?: boolean;
}) {
  const query = (filters.query ?? "").toLowerCase().trim();
  return companies.filter((company) => {
    const offices = company.offices.filter(isDocumentedOffice);
    return (!query || [company.name, company.description, ...company.founders,
      ...offices.flatMap((o) => [o.address, o.neighborhood, o.borough])].join(" ").toLowerCase().includes(query))
      && (!filters.stage || (company.stage_group === filters.stage || company.stage === filters.stage))
      && (!filters.category || company.category === filters.category)
      && (!filters.borough || offices.some((o) => o.borough === filters.borough))
      && (!filters.neighborhood || offices.some((o) => o.neighborhood === filters.neighborhood))
      && (!filters.evidence || (filters.evidence === "documented" ? offices.length > 0 : filters.evidence === "verified" ? offices.some((o) => o.evidence_status === "verified") : filters.evidence === "reported" ? offices.some((o) => o.evidence_status === "reported") : offices.length === 0))
      && (!filters.outside || offices.some((o) => o.borough !== "Manhattan"));
  });
}

/** Quoted cells preserve commas/newlines; formula-like text is exported as text. */
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function companiesToCsv(companies: ResearchCompany[]) {
  const headers = ["Company", "Stage", "Category", "Description", "Website", "Founders", "NYC presence", "Borough", "Neighborhood", "Office address", "Office evidence", "Office source", "Office source date", "Office checked", "Office notes", "Funding round", "Funding amount", "Funding date", "Open roles collected", "Hiring checked", "Profile reviewed", "Review scope", "Stage rechecked", "Profile sources", "Latitude", "Longitude", "Geocode source", "Geocode note"];
  const rows = companies.flatMap((c) => {
    const offices: Array<OfficeEvidence | undefined> = c.offices.length ? c.offices : [undefined];
    return offices.map((o) => [c.name, c.stage, c.category, c.description, c.website,
      c.founders.join("; "), c.presence, o?.borough, o?.neighborhood, o?.address,
      o ? `${o.evidence_status}; ${o.location_type}` : "Not verified", o?.source_url,
      o?.source_date, o?.verified_at, [o?.notes, ...(o?.supporting_sources ?? []).map((s) => s.source_url)].filter(Boolean).join("; "), c.funding_round, c.funding_amount,
      c.funding_date, c.jobs, c.jobs_checked_at, c.checked_at, c.review_scope, c.stage_reviewed ? "yes" : "no", c.sources.join("; "), o?.latitude, o?.longitude, o?.geocode_source, o?.geocode_note]);
  });
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
