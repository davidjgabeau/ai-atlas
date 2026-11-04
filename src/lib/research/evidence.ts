import offices from "@/data/reporting/offices.json";
import type { OfficeEvidence, ResearchCompany } from "./types";
import { normalizeCompanyStage } from "../company-stages";

export const officeEvidence = offices as OfficeEvidence[];
export const nycBoroughs = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;

export function isDocumentedOffice(office: OfficeEvidence) {
  return office.location_type !== "mailing" && office.location_type !== "unverified"
    && office.occupancy_status !== "historical"
    && ["verified", "reported"].includes(office.evidence_status)
    && Boolean(office.borough) && Boolean(office.source_url);
}

export type OfficeFilters = { borough?: string; neighborhood?: string; evidence?: string; outside?: boolean };

export function officeMatchesFilters(office: OfficeEvidence, filters: OfficeFilters) {
  return isDocumentedOffice(office)
    && (!filters.borough || office.borough === filters.borough)
    && (!filters.neighborhood || office.neighborhood === filters.neighborhood)
    && (!filters.outside || office.borough !== "Manhattan")
    && (!filters.evidence || filters.evidence === "documented" || office.evidence_status === filters.evidence);
}

/** Company counts, not office counts. Borough membership can overlap; unknowns stay in the denominator. */
export function summarizeCitywideCoverage(companies: ResearchCompany[]) {
  const unique = [...new Map(companies.map((company) => [company.slug, company])).values()];
  const memberships = unique.map((company) => {
    const offices = company.offices.filter((office) => isDocumentedOffice(office)
      && nycBoroughs.some((borough) => borough === office.borough));
    return {
      boroughs: new Set(offices.map((office) => office.borough)),
      williamsburg: offices.some((office) => office.borough === "Brooklyn" && office.neighborhood === "Williamsburg"),
    };
  });
  return {
    scope: "citywide_directory" as const,
    total_companies: unique.length,
    companies_with_borough: memberships.filter((company) => company.boroughs.size > 0).length,
    companies_without_borough: memberships.filter((company) => company.boroughs.size === 0).length,
    companies_in_multiple_boroughs: memberships.filter((company) => company.boroughs.size > 1).length,
    boroughs: nycBoroughs.map((borough) => ({ borough, company_count: memberships.filter((company) => company.boroughs.has(borough)).length })),
    williamsburg_companies: memberships.filter((company) => company.williamsburg).length,
    brooklyn_elsewhere_companies: memberships.filter((company) => company.boroughs.has("Brooklyn") && !company.williamsburg).length,
    outside_manhattan_companies: memberships.filter((company) => [...company.boroughs].some((borough) => borough !== "Manhattan")).length,
  };
}

export type CitywideCoverage = ReturnType<typeof summarizeCitywideCoverage>;

export function citywideComparisonToCsv(coverage: CitywideCoverage) {
  const rows = [
    ["Citywide directory", coverage.total_companies, "All company profiles; NYC presence supported, borough may be unknown"],
    ["Borough documented", coverage.companies_with_borough, "Unique companies with documented office evidence in a named NYC borough"],
    ["Borough not established", coverage.companies_without_borough, "Included in the citywide directory; no qualifying borough evidence"],
    ...coverage.boroughs.map(({ borough, company_count }) => [borough, company_count, "Documented office evidence; a company can appear in multiple boroughs"]),
    ["Williamsburg (within Brooklyn)", coverage.williamsburg_companies, "Subset of Brooklyn, not an additional borough or citywide total"],
    ["Other Brooklyn (no Williamsburg evidence)", coverage.brooklyn_elsewhere_companies, "Brooklyn companies without documented Williamsburg office evidence"],
    ["Multiple boroughs", coverage.companies_in_multiple_boroughs, "Already included in each applicable borough; counted once citywide"],
  ];
  return [["Coverage group", "Companies", "Counting rule"], ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Counts refer to the documented sample, including offices with no public street address. */
export function summarizeOfficeGeography(evidence: OfficeEvidence[]) {
  const documented = evidence.filter(isDocumentedOffice);
  const neighborhoods = [...new Set(documented.filter((o) => o.neighborhood).map((o) => `${o.borough}|${o.neighborhood}`))];
  return neighborhoods.map((key) => {
    const [borough, neighborhood] = key.split("|");
    const records = documented.filter((o) => o.borough === borough && o.neighborhood === neighborhood);
    const addresses = [...new Set(records.map((o) => o.address).filter((a): a is string => Boolean(a)))];
    return {
      borough, neighborhood,
      company_count: new Set(records.map((o) => o.company_slug)).size,
      company_slugs: [...new Set(records.map((o) => o.company_slug))],
      companies_without_public_street_address: [...new Set(records.filter((o) => !o.address).map((o) => o.company_slug))],
      addresses: addresses.map((address) => ({ address, company_slugs: [...new Set(records.filter((o) => o.address === address).map((o) => o.company_slug))] })),
    };
  });
}

export function filterResearchCompanies(companies: ResearchCompany[], filters: {
  query?: string; borough?: string; neighborhood?: string; stage?: string;
  category?: string; evidence?: string; outside?: boolean;
}) {
  const normalizeSearch = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const tokens = normalizeSearch(filters.query ?? "").trim().split(/\s+/).filter(Boolean);
  return companies.filter((company) => {
    const offices = company.offices.filter(isDocumentedOffice);
    const text = normalizeSearch([company.name, company.slug, company.website, ...(company.sources ?? []).map((url) => new URL(url).hostname), company.description, company.category, company.stage, ...company.founders,
      ...offices.flatMap((o) => [o.address, o.neighborhood, o.borough])].join(" "));
    return tokens.every((token) => text.includes(token))
      && (!filters.stage || company.stage_group === filters.stage || company.stage === filters.stage
        || ((filters.stage === "Pre-seed" || filters.stage === "Seed" || filters.stage.startsWith("Series ")) && normalizeCompanyStage(company.stage) === filters.stage))
      && (!filters.category || company.category === filters.category)
      && (filters.evidence === "unknown"
        ? offices.length === 0 && !filters.borough && !filters.neighborhood && !filters.outside
        : !(filters.borough || filters.neighborhood || filters.evidence || filters.outside) || offices.some((o) => officeMatchesFilters(o, filters)));
  });
}

/** Quoted cells preserve commas/newlines; formula-like text is exported as text. */
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (typeof value !== "number" && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function companiesToCsv(companies: ResearchCompany[]) {
  const headers = ["Company", "Stage", "Category", "Description", "Website", "Founders", "NYC presence", "Borough", "Neighborhood", "Office address", "Office evidence", "Office source", "Office source date", "Office checked", "Office notes", "Funding round", "Funding amount", "Funding date", "Open roles collected", "Hiring checked", "Profile reviewed", "Review scope", "Stage rechecked", "Profile sources", "Latitude", "Longitude", "Geocode source", "Geocode note", "Occupancy status", "Parent company"];
  const rows = companies.flatMap((c) => {
    const offices: Array<OfficeEvidence | undefined> = c.offices.length ? c.offices : [undefined];
    return offices.map((o) => [c.name, c.stage, c.category, c.description, c.website,
      c.founders.join("; "), c.presence, o?.borough, o?.neighborhood, o?.address,
      o ? `${o.evidence_status}; ${o.location_type}` : "Not verified", o?.source_url,
      o?.source_date, o?.verified_at, [o?.notes, ...(o?.supporting_sources ?? []).map((s) => s.source_url)].filter(Boolean).join("; "), c.funding_round, c.funding_amount,
      c.funding_date, c.jobs, c.jobs_checked_at, c.checked_at, c.review_scope, c.stage_reviewed ? "yes" : "no", c.sources.join("; "), o?.latitude, o?.longitude, o?.geocode_source, o?.geocode_note, o?.occupancy_status ?? "unknown", c.parent_company]);
  });
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
