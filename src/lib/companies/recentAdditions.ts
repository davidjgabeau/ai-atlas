import type { Company } from "@/types/market";

export const RECENT_ADDITION_WINDOW_DAYS = 7;
export const RECENT_ADDITION_WINDOW_MS =
  RECENT_ADDITION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

type AdditionDateShape = {
  created_at?: string;
  createdAt?: string;
};

export function isRecentCompanyAddition(
  company: AdditionDateShape,
  referenceTime = Date.now(),
) {
  return isWithinRecentAdditionWindow(getCompanyAddedAt(company), referenceTime);
}

export function getRecentCompanyAdditions(
  companies: Company[],
  limit = 6,
  referenceTime = Date.now(),
) {
  return [...companies]
    .filter((company) => isRecentCompanyAddition(company, referenceTime))
    .sort((a, b) => getAddedTime(b) - getAddedTime(a))
    .slice(0, limit);
}

export function isWithinRecentAdditionWindow(
  dateValue?: string,
  referenceTime = Date.now(),
) {
  const time = getDateTime(dateValue);
  const diff = referenceTime - time;

  return time > 0 && diff >= 0 && diff <= RECENT_ADDITION_WINDOW_MS;
}

export function getCompanyAddedAt(company: AdditionDateShape) {
  return company.created_at ?? company.createdAt;
}

export function getAddedTime(company: AdditionDateShape) {
  return getDateTime(getCompanyAddedAt(company));
}

function getDateTime(dateValue?: string) {
  if (!dateValue) return 0;

  const time = new Date(dateValue).getTime();
  return Number.isNaN(time) ? 0 : time;
}
