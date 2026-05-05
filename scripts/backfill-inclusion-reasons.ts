import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { generateInclusionReason } from "../src/lib/agent/generateInclusionReason";
import type { AgentCompany, CompanyEvent, DiscoveryReason } from "../src/types/agent";

const force = process.argv.includes("--force");
const companiesPath = path.join(process.cwd(), "data", "companies.json");
const eventsPath = path.join(process.cwd(), "data", "company-events.json");

async function main() {
  const companies = await readJson<AgentCompany[]>(companiesPath, []);
  const events = await readJson<CompanyEvent[]>(eventsPath, []);
  const categoryCounts = companies.reduce<Record<string, number>>((counts, company) => {
    counts[company.category] = (counts[company.category] ?? 0) + 1;
    return counts;
  }, {});
  let updatedCount = 0;

  const nextCompanies = companies.map((company) => {
    const triggeringEvents = events.filter((event) => event.companyId === company.id);
    const shouldBackfillInclusion = force || !company.inclusionReason?.body;
    const shouldBackfillDiscovery = !company.discoveryReason;

    if (!shouldBackfillInclusion && !shouldBackfillDiscovery) return company;

    updatedCount += 1;
    return {
      ...company,
      discoveryReason: company.discoveryReason ?? createBackfillDiscoveryReason(company),
      inclusionReason: shouldBackfillInclusion
        ? generateInclusionReason({
            company: force
              ? {
                  ...company,
                  inclusionReason: undefined,
                }
              : company,
            triggeringEvents,
            categoryCounts,
          })
        : company.inclusionReason,
    };
  });

  await writeFile(companiesPath, `${JSON.stringify(nextCompanies, null, 2)}\n`);
  console.log(
    `${force ? "Regenerated" : "Backfilled"} inclusion reasons for ${updatedCount} ${updatedCount === 1 ? "company" : "companies"}.`,
  );
}

function createBackfillDiscoveryReason(company: AgentCompany): DiscoveryReason {
  return {
    trigger: "profile_import",
    sourceEventIds: [],
    sourceUrls: company.sourceUrls ?? [company.website ?? ""].filter(Boolean),
    confidence: company.locationConfidence === "high" ? "high" : "medium",
    notes: "Imported from the existing AI Atlas company dataset.",
  };
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  const raw = await readFile(filePath, "utf8").catch(() => "");
  if (!raw) return fallback;

  return JSON.parse(raw) as T;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
