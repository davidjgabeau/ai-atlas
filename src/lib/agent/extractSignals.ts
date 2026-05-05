import type {
  AgentCompany,
  ExtractedSignal,
  RawSourceRecord,
} from "../../types/agent";

const fundingWords = /\b(raised|funding|financing|round|led by|seed|series a|pre-seed|preseed)\b/i;
const productWords = /\b(launches|launched|introduces|introduced|announces|announced|ships|released|unveils|unveiled)\b/i;
const tractionWords = /\b(customers|revenue|arr|users|used by|adopted by|deployed|pilots|signed)\b/i;
const hiringWords = /\b(hiring|open roles|jobs|careers|headcount|team expansion)\b/i;
const partnershipWords = /\b(partners with|partnership|integrates with|integration with)\b/i;
const founderWords = /\b(founder|co-founder|ceo|cto|appointed|joins as)\b/i;
const amountPattern = /\$[\d,.]+(?:\s?(?:m|b|million|billion))?/i;
const roundPattern = /\b(pre-seed|preseed|seed|series a|strategic funding|series b)\b/i;

export function extractSignals(
  raw: RawSourceRecord,
  companies: AgentCompany[],
): ExtractedSignal[] {
  if (process.env.ENABLE_LLM_EXTRACTION === "true" && process.env.OPENAI_API_KEY) {
    // TODO: plug in an LLM extractor here. The deterministic extractor below is
    // intentionally conservative and remains the default for cost and safety.
  }

  return extractSignalsDeterministically(raw, companies);
}

function extractSignalsDeterministically(
  raw: RawSourceRecord,
  companies: AgentCompany[],
): ExtractedSignal[] {
  const text = normalizeWhitespace([raw.title, raw.text].filter(Boolean).join("\n"));
  if (!text || isTrivialMarketing(text)) return [];

  const matchedCompanies = findCompanies(raw, companies, text);
  const signals: ExtractedSignal[] = [];

  for (const company of matchedCompanies) {
    const sourceDate = raw.publishedAt ?? raw.discoveredAt;

    if (fundingWords.test(text)) {
      const amount = text.match(amountPattern)?.[0];
      const round = text.match(roundPattern)?.[0];

      if (round || amount) {
        signals.push({
          companyName: company.name,
          possibleCompanyId: company.id,
          signalType: "funding",
          title: `${company.name} funding signal`,
          summary: summarize(text, 220),
          occurredAt: sourceDate,
          confidence: round || amount ? "high" : "medium",
          facts: {
            fundingAmount: amount,
            round: normalizeRound(round),
            investors: extractInvestors(text),
          },
          shouldUpdateCompanyProfile: true,
          suggestedCompanyUpdates:
            round || amount
              ? {
                  funding: {
                    ...company.funding,
                    latestRound: normalizeRound(round) ?? company.funding?.latestRound,
                    latestRoundDate: raw.publishedAt ?? company.funding?.latestRoundDate,
                    leadInvestors:
                      extractInvestors(text).length > 0
                        ? extractInvestors(text)
                        : company.funding?.leadInvestors,
                  },
                }
              : undefined,
        });
        continue;
      }
    }

    if (productWords.test(text)) {
      signals.push({
        companyName: company.name,
        possibleCompanyId: company.id,
        signalType: "product_launch",
        title: `${company.name} product update`,
        summary: summarize(text, 220),
        occurredAt: sourceDate,
        confidence: "medium",
        facts: {
          product: extractProductName(raw.title ?? text),
        },
        shouldUpdateCompanyProfile: false,
      });
      continue;
    }

    if (tractionWords.test(text)) {
      signals.push({
        companyName: company.name,
        possibleCompanyId: company.id,
        signalType: "traction_signal",
        title: `${company.name} traction signal`,
        summary: summarize(text, 220),
        occurredAt: sourceDate,
        confidence: hasNamedEntityAfter(text, /customers|used by|adopted by/i)
          ? "medium"
          : "low",
        facts: {
          customers: extractNamedCustomers(text),
        },
        shouldUpdateCompanyProfile: false,
      });
      continue;
    }

    if (partnershipWords.test(text)) {
      signals.push({
        companyName: company.name,
        possibleCompanyId: company.id,
        signalType: "partnership",
        title: `${company.name} partnership signal`,
        summary: summarize(text, 220),
        occurredAt: sourceDate,
        confidence: "medium",
        facts: {},
        shouldUpdateCompanyProfile: false,
      });
      continue;
    }

    if (hiringWords.test(text)) {
      signals.push({
        companyName: company.name,
        possibleCompanyId: company.id,
        signalType: "hiring_signal",
        title: `${company.name} hiring signal`,
        summary: summarize(text, 220),
        occurredAt: sourceDate,
        confidence: "medium",
        facts: {
          jobs: extractJobs(text),
        },
        shouldUpdateCompanyProfile: false,
      });
      continue;
    }

    if (founderWords.test(text)) {
      signals.push({
        companyName: company.name,
        possibleCompanyId: company.id,
        signalType: "founder_signal",
        title: `${company.name} founder signal`,
        summary: summarize(text, 220),
        occurredAt: sourceDate,
        confidence: "medium",
        facts: {},
        shouldUpdateCompanyProfile: false,
      });
    }
  }

  return signals;
}

function findCompanies(
  raw: RawSourceRecord,
  companies: AgentCompany[],
  text: string,
) {
  if (raw.companyId) {
    const company = companies.find((item) => item.id === raw.companyId);
    return company ? [company] : [];
  }

  const lowerText = text.toLowerCase();

  return companies.filter((company) => {
    return (
      lowerText.includes(company.name.toLowerCase()) ||
      lowerText.includes(company.slug.replace(/-/g, " "))
    );
  });
}

function extractInvestors(text: string) {
  const ledByMatch = text.match(/led by ([^.,"\n]+(?:, [^.,"\n]+)?)/i);
  if (!ledByMatch?.[1]) return [];

  return ledByMatch[1]
    .split(/,| and /)
    .map((investor) => investor.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function extractNamedCustomers(text: string) {
  const match = text.match(/(?:used by|customers include|including)\s+([^.]+)/i);
  if (!match?.[1]) return [];

  return match[1]
    .split(/,| and /)
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function extractJobs(text: string) {
  const roles = Array.from(text.matchAll(/\b(engineer|designer|sales|growth|researcher|product|operations)\b/gi));
  return Array.from(new Set(roles.map((role) => role[0].toLowerCase()))).slice(0, 5);
}

function extractProductName(text: string) {
  const quoted = text.match(/["“]([^"”]+)["”]/)?.[1];
  return quoted?.slice(0, 80);
}

function normalizeRound(round?: string) {
  if (!round) return undefined;
  if (/preseed|pre-seed/i.test(round)) return "Pre-seed";
  if (/series a/i.test(round)) return "Series A";
  if (/series b/i.test(round)) return "Series B";
  if (/strategic funding/i.test(round)) return "Strategic funding";
  if (/seed/i.test(round)) return "Seed";
  return round;
}

function hasNamedEntityAfter(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match?.index) return false;
  return /[A-Z][a-z]+/.test(text.slice(match.index, match.index + 140));
}

function summarize(text: string, maxLength: number) {
  const sentence = text.split(/(?<=\.)\s+/)[0] ?? text;
  if (sentence.length <= maxLength) return sentence;
  return `${sentence.slice(0, maxLength - 1).trim()}…`;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isTrivialMarketing(text: string) {
  const lower = text.toLowerCase();
  return lower.length < 80 || lower === "home" || lower.includes("cookie policy");
}
