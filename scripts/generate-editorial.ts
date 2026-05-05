import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { marketMapCompanies } from "../src/data/market";
import existingCompanyEditorial from "../src/data/company-editorial.json";
import existingMarketInsights from "../src/data/market-insights.json";
import { generateCompanyHook } from "../src/lib/editorial/generateCompanyHook";
import {
  generateMarketInsights,
  getInsightSourceCompanies,
} from "../src/lib/editorial/generateMarketInsights";
import {
  getCompanySourceHash,
  getMarketInsightsSourceHash,
} from "../src/lib/editorial/hash";
import type { GeneratedCompanyFields, MarketInsight } from "../src/types/market";

type CompanyEditorialFile = {
  generatedAt: string;
  companies: Record<string, GeneratedCompanyFields>;
};

type MarketInsightsFile = {
  generatedAt: string;
  sourceHash: string;
  insights: MarketInsight[];
};

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const dataDir = path.join(projectRoot, "src", "data");
const companyEditorialPath = path.join(dataDir, "company-editorial.json");
const marketInsightsPath = path.join(dataDir, "market-insights.json");

async function main() {
  const existingCompanyFile = existingCompanyEditorial as CompanyEditorialFile;
  const existingInsightFile = existingMarketInsights as MarketInsightsFile;
  const generatedAt = new Date().toISOString();
  const force =
    process.argv.includes("--force") || process.env.FORCE_EDITORIAL === "1";

  const companies: Record<string, GeneratedCompanyFields> = {};
  let companyUpdates = 0;

  for (const company of marketMapCompanies) {
    const sourceHash = getCompanySourceHash(company);
    const cached = existingCompanyFile.companies?.[company.id];

    if (!force && cached?.sourceHash === sourceHash) {
      companies[company.id] = cached;
      continue;
    }

    companies[company.id] = generateCompanyHook(company);
    companyUpdates += 1;
  }

  const companiesWithGenerated = marketMapCompanies.map((company) => ({
    ...company,
    generated: companies[company.id],
  }));
  const insightSourceCompanies = getInsightSourceCompanies(companiesWithGenerated);
  const insightSourceHash = getMarketInsightsSourceHash(insightSourceCompanies);
  const insights =
    !force &&
    existingInsightFile.sourceHash === insightSourceHash &&
    existingInsightFile.insights?.length === 3
      ? existingInsightFile.insights
      : generateMarketInsights(companiesWithGenerated);

  await mkdir(dataDir, { recursive: true });
  await writeJsonIfChanged(companyEditorialPath, {
    generatedAt:
      companyUpdates === 0 && existingCompanyFile.generatedAt
        ? existingCompanyFile.generatedAt
        : generatedAt,
    companies,
  } satisfies CompanyEditorialFile);
  await writeJsonIfChanged(marketInsightsPath, {
    generatedAt:
      existingInsightFile.sourceHash === insightSourceHash &&
      existingInsightFile.generatedAt
        ? existingInsightFile.generatedAt
        : generatedAt,
    sourceHash: insightSourceHash,
    insights,
  } satisfies MarketInsightsFile);

  console.log(
    `Editorial generation complete: ${companyUpdates} company hooks refreshed, ${insights.length} market insights available.`,
  );
}

async function writeJsonIfChanged(filePath: string, value: unknown) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  const current = await readFile(filePath, "utf8").catch(() => "");

  if (current === next) {
    return;
  }

  await writeFile(filePath, next);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
