import type { Company } from "@/types/market";

function hasValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== "undisclosed";
}

function trimTrailingZero(value: string) {
  return value.replace(/\.0$/, "");
}

export function formatFundingAmount(value: string) {
  const amount = value.trim().replace(/\.$/, "");
  if (!hasValue(amount)) return amount;

  if (/\b(?:k|m|b|thousand|million|billion)\b/i.test(amount)) {
    return amount;
  }

  const exactMatch = amount.match(/^\$?([0-9]+(?:\.[0-9]+)?)$/);
  if (!exactMatch) return amount;

  const numericAmount = Number(exactMatch[1]);
  if (!Number.isFinite(numericAmount)) return amount;

  if (numericAmount > 0 && numericAmount < 1) {
    return `$${Math.round(numericAmount * 1000)}k`;
  }

  if (numericAmount >= 1000 && numericAmount < 1_000_000) {
    return `$${trimTrailingZero((numericAmount / 1000).toFixed(1))}k`;
  }

  if (numericAmount >= 1_000_000) {
    return `$${trimTrailingZero((numericAmount / 1_000_000).toFixed(1))}M`;
  }

  return `$${trimTrailingZero(String(numericAmount))}M`;
}

export function formatFundingText(value: string) {
  return value.replace(
    /\b(raised|raises|raise|raising)\s+\$([0-9]+(?:\.[0-9]+)?)(?![0-9]|\.[0-9]|\s?(?:[KMBkmb]|thousand|million|billion))/gi,
    (match, verb: string, amount: string) =>
      `${verb} ${formatFundingAmount(`$${amount}`)}` || match,
  );
}

export function formatFundingHeadline(company: Company) {
  const parts = [
    company.funding_round,
    hasValue(company.funding_amount)
      ? formatFundingAmount(company.funding_amount)
      : "",
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
    sentences.push(`Total raised: ${formatFundingAmount(company.total_raised)}.`);
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
    ["Round amount", formatFundingAmount(company.funding_amount)],
    ["Round date", company.funding_date],
    ["Total raised", formatFundingAmount(company.total_raised)],
    ["Lead investor", company.lead_investor],
  ].filter(([, value]) => hasValue(value));
}
