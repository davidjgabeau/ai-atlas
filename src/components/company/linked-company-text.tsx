import Link from "next/link";
import type { ReactNode } from "react";

import type { Company } from "@/types/market";

type LinkableCompany = Pick<Company, "id" | "name" | "slug">;

type LinkedCompanyTextProps = {
  text: string;
  companies: Iterable<LinkableCompany> | Map<string, LinkableCompany>;
  excludeCompanyId?: string;
  linkClassName?: string;
};

const ambiguousCompanyNames = new Set([
  "aspect",
  "granted",
  "icon",
  "series",
  "tabs",
]);

export function LinkedCompanyText({
  text,
  companies,
  excludeCompanyId,
  linkClassName = "font-semibold text-[#181818] underline decoration-[#CFC7BC] underline-offset-[3px] transition hover:text-[#9A3D2B] hover:decoration-[#9A3D2B]",
}: LinkedCompanyTextProps) {
  if (!text) return null;

  const linkableCompanies = getLinkableCompanies(companies, excludeCompanyId);
  if (linkableCompanies.length === 0) return text;

  const parts = linkCompanyMentions(text, linkableCompanies, linkClassName);

  return <>{parts}</>;
}

function getLinkableCompanies(
  companies: Iterable<LinkableCompany> | Map<string, LinkableCompany>,
  excludeCompanyId?: string,
) {
  const values = companies instanceof Map ? companies.values() : companies;
  const seen = new Set<string>();

  return Array.from(values)
    .filter((company) => {
      const normalized = company.name.trim().toLowerCase();
      if (!company.slug || !normalized) return false;
      if (company.id === excludeCompanyId) return false;
      if (ambiguousCompanyNames.has(normalized)) return false;
      if (seen.has(normalized)) return false;
      if (normalized.length < 4 && !/[.\d]/.test(normalized)) return false;

      seen.add(normalized);
      return true;
    })
    .map((company) => ({
      ...company,
      normalizedName: company.name.toLowerCase(),
    }))
    .sort((a, b) => b.normalizedName.length - a.normalizedName.length);
}

function linkCompanyMentions(
  text: string,
  companies: Array<LinkableCompany & { normalizedName: string }>,
  linkClassName: string,
) {
  const lowerText = text.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  while (cursor < text.length) {
    const match = companies.find((company) =>
      isCompanyMentionAt(lowerText, cursor, company.normalizedName),
    );

    if (!match) {
      const nextMentionIndex = findNextMentionIndex(lowerText, cursor + 1, companies);
      const nextCursor = nextMentionIndex === -1 ? text.length : nextMentionIndex;
      parts.push(text.slice(cursor, nextCursor));
      cursor = nextCursor;
      continue;
    }

    const matchedText = text.slice(cursor, cursor + match.name.length);
    parts.push(
      <Link
        key={`${match.id}-${key}`}
        href={`/companies/${match.slug}`}
        className={linkClassName}
      >
        {matchedText}
      </Link>,
    );
    key += 1;
    cursor += match.name.length;
  }

  return parts;
}

function findNextMentionIndex(
  lowerText: string,
  start: number,
  companies: Array<LinkableCompany & { normalizedName: string }>,
) {
  let next = -1;

  for (const company of companies) {
    const index = lowerText.indexOf(company.normalizedName, start);
    if (index === -1) continue;
    if (!isCompanyMentionAt(lowerText, index, company.normalizedName)) continue;
    if (next === -1 || index < next) next = index;
  }

  return next;
}

function isCompanyMentionAt(text: string, index: number, name: string) {
  if (!text.startsWith(name, index)) return false;

  const before = index > 0 ? text[index - 1] : "";
  const after = text[index + name.length] ?? "";

  return isBoundary(before) && isBoundary(after);
}

function isBoundary(value: string) {
  return !value || !/[a-z0-9]/i.test(value);
}
