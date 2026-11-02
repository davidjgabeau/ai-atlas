import { getAddedTime } from "./recentAdditions";
import type { Company } from "@/types/market";

export type CompanySort = "name" | "recent";
export function sortCompanies(companies: Company[], sort: CompanySort) {
  return [...companies].sort((a, b) =>
    (sort === "recent" ? getAddedTime(b) - getAddedTime(a) : 0) || a.name.localeCompare(b.name),
  );
}
