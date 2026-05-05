import type { Company } from "@/types/market";

function hasValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== "undisclosed";
}

export function formatFundingHeadline(company: Company) {
  const parts = [
    company.funding_round,
    hasValue(company.funding_amount) ? company.funding_amount : "",
    hasValue(company.funding_date) ? company.funding_date : "",
  ].filter(hasValue);

  return parts.length > 0 ? parts.join(" · ") : "Funding not disclosed";
}

export function formatFundingBody(company: Company) {
  const sentences: string[] = [];
  const headline = formatFundingHeadline(company);

  if (headline !== "Funding not disclosed") {
    sentences.push(`Latest funding: ${headline}.`);
  }

  if (hasValue(company.total_raised)) {
    sentences.push(`Total raised: ${company.total_raised}.`);
  }

  if (hasValue(company.lead_investor)) {
    sentences.push(`Lead investor: ${company.lead_investor}.`);
  }

  return sentences.length > 0
    ? sentences.join(" ")
    : "Public funding details are not disclosed yet.";
}

export function getFundingRows(company: Company) {
  return [
    ["Latest round", company.funding_round],
    ["Round amount", company.funding_amount],
    ["Round date", company.funding_date],
    ["Total raised", company.total_raised],
    ["Lead investor", company.lead_investor],
  ].filter(([, value]) => hasValue(value));
}
