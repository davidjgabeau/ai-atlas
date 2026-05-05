import type { CompanyStats } from "@/lib/companies/getCompanyStats";

export function formatCompanyCount(count: number): string {
  return `${count} ${count === 1 ? "startup" : "startups"}`;
}

export function formatAiStartupCount(count: number): string {
  return `${count} ${count === 1 ? "AI startup" : "AI startups"}`;
}

export function formatTrackedLine(): string {
  return "Curated by hand. Updated agentically.";
}

export function formatMobileSubheadline(stats: CompanyStats): string {
  return `${stats.totalCompanies} early-stage AI ${
    stats.totalCompanies === 1 ? "company" : "companies"
  } across consumer, healthcare, infrastructure, and more.`;
}
