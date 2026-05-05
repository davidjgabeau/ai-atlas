import type { Company } from "@/types/market";

export type CompanyStats = {
  totalCompanies: number;
  totalCategories: number;
  recentlyAddedCount: number;
  lastUpdatedAt?: string;
};

const recentWindowMs = 30 * 24 * 60 * 60 * 1000;

export function getCompanyStats(companies: Company[]): CompanyStats {
  const totalCompanies = companies.length;
  const totalCategories = new Set(
    companies
      .map((company) => company.category)
      .filter((category) => category.trim().length > 0),
  ).size;
  const recentByCreatedAt = companies.filter((company) =>
    isWithinRecentWindow(getCreatedAtValue(company)),
  ).length;
  const recentlyAddedCount =
    recentByCreatedAt > 0
      ? recentByCreatedAt
      : companies.filter(
          (company) => company.generated?.signalLabel === "Recently added",
        ).length;
  const lastUpdatedAt = getLastUpdatedAt(companies);

  return {
    totalCompanies,
    totalCategories,
    recentlyAddedCount,
    lastUpdatedAt,
  };
}

function isWithinRecentWindow(dateValue?: string) {
  if (!dateValue) return false;

  const time = new Date(dateValue).getTime();
  if (Number.isNaN(time)) return false;

  return Date.now() - time <= recentWindowMs;
}

function getCreatedAtValue(company: Company) {
  return (
    company.created_at ??
    (company as Company & { createdAt?: string }).createdAt
  );
}

function getUpdatedAtValue(company: Company) {
  return (
    company.updated_at ??
    (company as Company & { updatedAt?: string }).updatedAt ??
    getCreatedAtValue(company)
  );
}

function getLastUpdatedAt(companies: Company[]) {
  const latest = companies.reduce(
    (max, company) => Math.max(max, getDateTime(getUpdatedAtValue(company))),
    0,
  );

  return latest > 0 ? new Date(latest).toISOString() : undefined;
}

function getDateTime(dateValue?: string) {
  if (!dateValue) return 0;

  const time = new Date(dateValue).getTime();
  return Number.isNaN(time) ? 0 : time;
}
