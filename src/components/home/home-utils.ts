import type { Company } from "@/types/market";
import { getInclusionReasonBody } from "@/lib/agent/generateInclusionReason";
import { getCompanySignalLabel } from "@/lib/signals/companySignal";

export function getCompanyHook(company: Company) {
  const hook = company.generated?.hook?.trim();
  if (hook) return hook;

  return company.short_description
    .replace(/\s+/g, " ")
    .replace(/\.$/, "")
    .slice(0, 72);
}

export function getHomeSignalLabel(company: Company) {
  return getCompanySignalLabel(company);
}

export function getCompanyInclusionReason(company: Company) {
  return formatInclusionReasonForDisplay(
    company.inclusionReason?.body ?? getInclusionReasonBody(company),
  );
}

export function formatMonthYear(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "Recently updated";

  return date.toLocaleDateString("en", {
    month: "short",
    year: "numeric",
  });
}

function formatInclusionReasonForDisplay(value: string) {
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/\band early-stage NYC relevance\b/gi, "")
    .replace(/\band early-stage NYC market fit\b/gi, "")
    .trim();

  if (/^added\s*:/i.test(cleaned)) return cleaned;

  const reason = cleaned
    .replace(/^added\s+because\s+it\s+/i, "")
    .replace(/^added\s+because\s+/i, "")
    .replace(/^added\s+for\s+its\s+/i, "")
    .replace(/^added\s+for\s+/i, "")
    .replace(/\s+\./g, ".")
    .trim();

  if (!reason) return "Added: expands the early-stage NYC AI map.";

  return `Added: ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`;
}
