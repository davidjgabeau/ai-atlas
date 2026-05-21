import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import type { AskAtlasCompanyCard } from "@/types/ask-atlas";
import type { Category } from "@/types/market";

export type AskAtlasCompanyReference = {
  name: string;
  slug: string;
  category: Category;
  categorySlug: string;
};

type StructuredAskAnswerProps = {
  answer: string;
  companyReferences: AskAtlasCompanyReference[];
  suggestedCompanies: AskAtlasCompanyCard[];
};

type ParsedAnswer = {
  takeaway: string;
  sections: ParsedSection[];
  bottomLine: string;
  relatedCompanies: AskAtlasCompanyReference[];
  cta?: {
    href: string;
    label: string;
  };
};

type ParsedSection = {
  number?: number;
  title: string;
  description: string;
  whyItMatters: string;
  companies: AskAtlasCompanyReference[];
};

const ambiguousCompanyNames = new Set([
  "aspect",
  "granted",
  "icon",
  "series",
  "tabs",
]);

export function StructuredAskAnswer({
  answer,
  companyReferences,
  suggestedCompanies,
}: StructuredAskAnswerProps) {
  const parsed = parseAskAnswer({
    answer,
    companyReferences,
    suggestedCompanies,
  });

  if (!parsed) {
    return <FallbackAskAnswer answer={answer} companies={companyReferences} />;
  }

  return (
    <div className="space-y-5">
      {parsed.takeaway ? (
        <section className="rounded-[12px] border border-[#E3D9CE] bg-[#F8F6F1] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A3D2B]">
            Takeaway
          </p>
          <p className="mt-2 text-[15px] leading-7 text-[#33302C]">
            <InlineCompanyText
              text={parsed.takeaway}
              companies={companyReferences}
            />
          </p>
        </section>
      ) : null}

      {parsed.sections.length > 0 ? (
        <div className="space-y-3">
          {parsed.sections.map((section, index) => (
            <section
              key={`${section.number ?? index}-${section.title}`}
              className="rounded-[12px] border border-[#E3D9CE] bg-[rgb(251_250_247_/_0.78)] p-4"
            >
              <div className="flex items-start gap-3">
                {section.number ? (
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-[#DECFC1] bg-[#F8F6F1] text-xs font-bold text-[#9A3D2B]">
                    {section.number}
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-[22px] font-medium leading-[1.12] tracking-[0] text-[#181818]">
                    <InlineCompanyText
                      text={section.title}
                      companies={companyReferences}
                      chipClassName="align-baseline"
                    />
                  </h3>
                  {section.description ? (
                    <p className="mt-2 text-[15px] leading-7 text-[#4F4A43]">
                      <InlineCompanyText
                        text={section.description}
                        companies={companyReferences}
                      />
                    </p>
                  ) : null}
                  {section.whyItMatters ? (
                    <p className="mt-3 border-l border-[#D8CFC1] pl-3 text-sm leading-6 text-[#5F5A52]">
                      <span className="font-semibold text-[#181818]">
                        Why it matters:
                      </span>{" "}
                      <InlineCompanyText
                        text={section.whyItMatters}
                        companies={companyReferences}
                      />
                    </p>
                  ) : null}
                  {section.companies.length > 0 ? (
                    <CompanyChipRow companies={section.companies} />
                  ) : null}
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {parsed.bottomLine ? (
        <section className="border-t border-[#E7E1D8] pt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A3D2B]">
            Bottom line
          </p>
          <p className="mt-2 text-[15px] leading-7 text-[#33302C]">
            <InlineCompanyText
              text={parsed.bottomLine}
              companies={companyReferences}
            />
          </p>
        </section>
      ) : null}

      {parsed.relatedCompanies.length > 0 || parsed.cta ? (
        <div className="border-t border-[#E7E1D8] pt-4">
          {parsed.relatedCompanies.length > 0 ? (
            <CompanyChipRow
              label="Companies"
              companies={parsed.relatedCompanies}
            />
          ) : null}
          {parsed.cta ? (
            <Link
              href={parsed.cta.href}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#9A3D2B] transition hover:text-[#181818]"
            >
              {parsed.cta.label}
              <ArrowRight className="size-4" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function parseAskAnswer({
  answer,
  companyReferences,
  suggestedCompanies,
}: {
  answer: string;
  companyReferences: AskAtlasCompanyReference[];
  suggestedCompanies: AskAtlasCompanyCard[];
}): ParsedAnswer | null {
  const lines = answer
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  const introParts: string[] = [];
  const sections: ParsedSection[] = [];
  const bottomParts: string[] = [];
  let currentSection: ParsedSection | null = null;
  let readingBottomLine = false;

  for (const line of lines) {
    const bottomLine = parseLabeledLine(line, ["bottom line", "summary"]);
    if (bottomLine !== null) {
      readingBottomLine = true;
      if (bottomLine) bottomParts.push(bottomLine);
      currentSection = null;
      continue;
    }

    if (readingBottomLine) {
      bottomParts.push(cleanMarkdownText(line));
      continue;
    }

    const heading = parseSectionHeading(line, companyReferences);
    if (heading) {
      currentSection = {
        number: heading.number,
        title: heading.title,
        description: "",
        whyItMatters: "",
        companies: [],
      };
      sections.push(currentSection);
      if (heading.description) {
        appendSectionText(currentSection, heading.description);
      }
      continue;
    }

    if (currentSection) {
      appendSectionText(currentSection, line);
      continue;
    }

    const takeaway = parseLabeledLine(line, ["takeaway"]);
    introParts.push(takeaway ?? cleanMarkdownText(line));
  }

  const takeaway = cleanMarkdownText(introParts.join(" "));
  const bottomLine = cleanMarkdownText(bottomParts.join(" "));
  const sectionsWithCompanies = sections.map((section) => {
    const matchedCompanies = findCompaniesInText(
      [section.title, section.description, section.whyItMatters].join(" "),
      companyReferences,
    );

    return {
      ...section,
      title: cleanMarkdownText(section.title),
      description: cleanMarkdownText(section.description),
      whyItMatters: cleanMarkdownText(section.whyItMatters),
      companies: matchedCompanies,
    };
  });

  const relatedCompanies = uniqueCompanies([
    ...findCompaniesInText(answer, companyReferences),
    ...suggestedCompanies
      .map((company) => companyReferences.find((item) => item.slug === company.slug))
      .filter((company): company is AskAtlasCompanyReference => Boolean(company)),
  ]).slice(0, 8);

  const ctaCategory = getMostRelevantCategory(relatedCompanies);
  const parsed: ParsedAnswer = {
    takeaway,
    sections: sectionsWithCompanies,
    bottomLine,
    relatedCompanies,
    cta: ctaCategory
      ? {
          href: `/categories/${ctaCategory.slug}`,
          label: "Explore related companies",
        }
      : undefined,
  };

  if (!parsed.takeaway && parsed.sections.length === 0 && !parsed.bottomLine) {
    return null;
  }

  return parsed;
}

function appendSectionText(section: ParsedSection, rawLine: string) {
  const companyLine = parseLabeledLine(rawLine, ["companies", "companies to inspect"]);
  if (companyLine !== null) {
    section.description = joinSentence(section.description, companyLine);
    return;
  }

  const whyItMatters = parseLabeledLine(rawLine, ["why it matters"]);
  if (whyItMatters !== null) {
    section.whyItMatters = joinSentence(section.whyItMatters, whyItMatters);
    return;
  }

  const split = splitWhyItMatters(rawLine);
  section.description = joinSentence(section.description, split.description);
  if (split.whyItMatters) {
    section.whyItMatters = joinSentence(section.whyItMatters, split.whyItMatters);
  }
}

function parseSectionHeading(
  line: string,
  companies: AskAtlasCompanyReference[],
): { number?: number; title: string; description: string } | null {
  const numberedMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
  if (numberedMatch) {
    const parsed = parseTitleAndDescription(numberedMatch[2], companies);
    return {
      number: Number(numberedMatch[1]),
      ...parsed,
    };
  }

  const boldMatch = line.match(/^\*\*([^*]+?)\*\*(.*)$/);
  if (boldMatch && !isCompanyName(boldMatch[1], companies)) {
    const remainder = boldMatch[2].replace(/^\s*[:\-–—]\s*/, "").trim();
    return {
      title: cleanMarkdownText(boldMatch[1]),
      description: cleanMarkdownText(remainder),
    };
  }

  return null;
}

function parseTitleAndDescription(
  value: string,
  companies: AskAtlasCompanyReference[],
) {
  const clean = value.trim();
  const boldTitleMatch = clean.match(/^\*\*([^*]+?)\*\*(.*)$/);
  if (boldTitleMatch && !isCompanyName(boldTitleMatch[1], companies)) {
    return {
      title: cleanMarkdownText(boldTitleMatch[1]),
      description: cleanMarkdownText(
        boldTitleMatch[2].replace(/^\s*[:\-–—]\s*/, "").trim(),
      ),
    };
  }

  const separatorMatch = clean.match(/^(.{8,86}?)(?:\s*[:–—-]\s+)(.+)$/);
  if (separatorMatch) {
    return {
      title: cleanMarkdownText(separatorMatch[1]),
      description: cleanMarkdownText(separatorMatch[2]),
    };
  }

  return {
    title: cleanMarkdownText(clean),
    description: "",
  };
}

function parseLabeledLine(line: string, labels: string[]) {
  const normalized = line.replace(/\*\*/g, "").trim();

  for (const label of labels) {
    const pattern = new RegExp(`^${escapeRegExp(label)}\\s*:?\\s*(.*)$`, "i");
    const match = normalized.match(pattern);
    if (match) return cleanMarkdownText(match[1] ?? "");
  }

  return null;
}

function splitWhyItMatters(line: string) {
  const match = line.match(/^(.*?)(?:\s+)?Why it matters:\s*(.+)$/i);
  if (!match) {
    return {
      description: cleanMarkdownText(line),
      whyItMatters: "",
    };
  }

  return {
    description: cleanMarkdownText(match[1] ?? ""),
    whyItMatters: cleanMarkdownText(match[2] ?? ""),
  };
}

function InlineCompanyText({
  text,
  companies,
  chipClassName = "",
}: {
  text: string;
  companies: AskAtlasCompanyReference[];
  chipClassName?: string;
}) {
  const matches = findCompanyMatches(text, companies);
  if (matches.length === 0) return <>{cleanMarkdownText(text)}</>;

  const pieces: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match) => {
    if (match.start > cursor) {
      pieces.push(cleanMarkdownText(text.slice(cursor, match.start)));
    }
    pieces.push(
      <CompanyChip
        key={`${match.company.slug}-${match.start}`}
        company={match.company}
        className={chipClassName}
      />,
    );
    cursor = match.end;
  });

  if (cursor < text.length) {
    pieces.push(cleanMarkdownText(text.slice(cursor)));
  }

  return <>{pieces}</>;
}

function CompanyChipRow({
  companies,
  label = "Companies",
}: {
  companies: AskAtlasCompanyReference[];
  label?: string;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#7B746B]">
        {label}
      </span>
      {companies.map((company) => (
        <CompanyChip key={company.slug} company={company} />
      ))}
    </div>
  );
}

function CompanyChip({
  company,
  className = "",
}: {
  company: AskAtlasCompanyReference;
  className?: string;
}) {
  return (
    <Link
      href={`/companies/${company.slug}`}
      className={[
        "inline-flex max-w-full items-center rounded-full border border-[#DECFC1] bg-[#FBFAF7] px-2.5 py-1 text-xs font-semibold leading-none text-[#181818] transition hover:border-[#BDAA98] hover:text-[#9A3D2B]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {company.name}
    </Link>
  );
}

function FallbackAskAnswer({
  answer,
  companies,
}: {
  answer: string;
  companies: AskAtlasCompanyReference[];
}) {
  const blocks = answer
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4 text-[16px] leading-7 text-[#33302C]">
      {blocks.map((block) => (
        <p key={block}>
          <InlineCompanyText text={block} companies={companies} />
        </p>
      ))}
    </div>
  );
}

function findCompaniesInText(
  text: string,
  companies: AskAtlasCompanyReference[],
) {
  return uniqueCompanies(findCompanyMatches(text, companies).map((match) => match.company));
}

function findCompanyMatches(
  text: string,
  companies: AskAtlasCompanyReference[],
) {
  const matches: Array<{
    start: number;
    end: number;
    company: AskAtlasCompanyReference;
  }> = [];
  const eligibleCompanies = companies
    .filter((company) => isEligibleCompanyName(company.name))
    .sort((a, b) => b.name.length - a.name.length);

  eligibleCompanies.forEach((company) => {
    const regex = new RegExp(
      `(^|[^A-Za-z0-9])(${escapeRegExp(company.name)})(?=$|[^A-Za-z0-9])`,
      "gi",
    );

    for (const match of text.matchAll(regex)) {
      const prefixLength = match[1]?.length ?? 0;
      const start = (match.index ?? 0) + prefixLength;
      const end = start + (match[2]?.length ?? 0);

      if (start === end) continue;
      if (matches.some((item) => rangesOverlap(start, end, item.start, item.end))) {
        continue;
      }

      matches.push({ start, end, company });
    }
  });

  return matches.sort((a, b) => a.start - b.start);
}

function isEligibleCompanyName(name: string) {
  const normalized = name.trim().toLowerCase();
  if (ambiguousCompanyNames.has(normalized)) return false;
  if (normalized.length < 4 && !/\d/.test(normalized)) return false;
  return true;
}

function isCompanyName(name: string, companies: AskAtlasCompanyReference[]) {
  const normalized = name.trim().toLowerCase();
  return companies.some((company) => company.name.toLowerCase() === normalized);
}

function uniqueCompanies(companies: AskAtlasCompanyReference[]) {
  const seen = new Set<string>();
  const unique: AskAtlasCompanyReference[] = [];

  companies.forEach((company) => {
    if (seen.has(company.slug)) return;
    seen.add(company.slug);
    unique.push(company);
  });

  return unique;
}

function getMostRelevantCategory(companies: AskAtlasCompanyReference[]) {
  const counts = new Map<string, { label: Category; slug: string; count: number }>();

  companies.forEach((company) => {
    const current = counts.get(company.categorySlug) ?? {
      label: company.category,
      slug: company.categorySlug,
      count: 0,
    };
    counts.set(company.categorySlug, {
      ...current,
      count: current.count + 1,
    });
  });

  return Array.from(counts.values()).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  )[0];
}

function cleanMarkdownText(value: string) {
  return value
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[-*]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function joinSentence(current: string, next: string) {
  const clean = cleanMarkdownText(next);
  if (!clean) return current;
  if (!current) return clean;
  return `${current} ${clean}`;
}

function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) {
  return startA < endB && startB < endA;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
