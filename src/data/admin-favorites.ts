import adminFavoritesJson from "@/data/admin-favorites.json";
import { marketMapCompanies } from "@/data/market";
import type { Company } from "@/types/market";

export type AdminFavorites = {
  userHandle: string;
  userName: string;
  companyIds: string[];
};

export const davidAdminFavorites = adminFavoritesJson as AdminFavorites;

export function getAdminFavoriteCompanies(
  favorites: AdminFavorites = davidAdminFavorites,
  companies: Company[] = marketMapCompanies,
) {
  const publishedCompaniesById = new Map(
    companies
      .filter((company) => company.status === "published")
      .map((company) => [company.id, company]),
  );
  const seenCompanyIds = new Set<string>();

  return favorites.companyIds.flatMap((companyId) => {
    if (seenCompanyIds.has(companyId)) return [];

    seenCompanyIds.add(companyId);
    const company = publishedCompaniesById.get(companyId);

    return company ? [company] : [];
  });
}

export const davidFavoriteCompanies = getAdminFavoriteCompanies();
