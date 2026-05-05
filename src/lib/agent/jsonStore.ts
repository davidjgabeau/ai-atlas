import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AgentDataFiles,
  AgentRun,
  CandidateUpdate,
  CompanyEvent,
  CompanyExposure,
  EditorialSurface,
  GeneratedInsightHistory,
  MarketSnapshot,
  RawSourceRecord,
  AgentCompany,
} from "../../types/agent";

export const agentDataDir = path.join(process.cwd(), "data");

const fileNames = {
  companies: "companies.json",
  companyEvents: "company-events.json",
  rawSourceRecords: "raw-source-records.json",
  marketSnapshots: "market-snapshots.json",
  editorialSurfaces: "editorial-surfaces.json",
  candidateUpdates: "candidate-updates.json",
  companyExposures: "company-exposures.json",
  generatedInsightHistory: "generated-insight-history.json",
  agentRuns: "agent-runs.json",
} satisfies Record<keyof AgentDataFiles, string>;

const emptyAgentData: AgentDataFiles = {
  companies: [],
  companyEvents: [],
  rawSourceRecords: [],
  marketSnapshots: [],
  editorialSurfaces: [],
  candidateUpdates: [],
  companyExposures: [],
  generatedInsightHistory: [],
  agentRuns: [],
};

export async function readAgentDataFiles(): Promise<AgentDataFiles> {
  const [
    companies,
    companyEvents,
    rawSourceRecords,
    marketSnapshots,
    editorialSurfaces,
    candidateUpdates,
    companyExposures,
    generatedInsightHistory,
    agentRuns,
  ] = await Promise.all([
    readAgentJson<AgentCompany[]>("companies", []),
    readAgentJson<CompanyEvent[]>("companyEvents", []),
    readAgentJson<RawSourceRecord[]>("rawSourceRecords", []),
    readAgentJson<MarketSnapshot[]>("marketSnapshots", []),
    readAgentJson<EditorialSurface[]>("editorialSurfaces", []),
    readAgentJson<CandidateUpdate[]>("candidateUpdates", []),
    readAgentJson<CompanyExposure[]>("companyExposures", []),
    readAgentJson<GeneratedInsightHistory[]>("generatedInsightHistory", []),
    readAgentJson<AgentRun[]>("agentRuns", []),
  ]);

  return {
    companies,
    companyEvents,
    rawSourceRecords,
    marketSnapshots,
    editorialSurfaces,
    candidateUpdates,
    companyExposures,
    generatedInsightHistory,
    agentRuns,
  };
}

export async function writeAgentDataFiles(data: Partial<AgentDataFiles>) {
  await mkdir(agentDataDir, { recursive: true });

  await Promise.all(
    Object.entries(data).map(([key, value]) => {
      return writeAgentJson(key as keyof AgentDataFiles, value);
    }),
  );
}

export async function readAgentJson<T>(
  key: keyof AgentDataFiles,
  fallback: T,
): Promise<T> {
  const filePath = getAgentFilePath(key);
  const raw = await readFile(filePath, "utf8").catch(() => "");
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Unable to parse ${filePath}:`, error);
    return fallback;
  }
}

export async function writeAgentJson(
  key: keyof AgentDataFiles,
  value: unknown,
) {
  await mkdir(agentDataDir, { recursive: true });
  const filePath = getAgentFilePath(key);
  const next = `${JSON.stringify(value ?? emptyAgentData[key], null, 2)}\n`;
  const current = await readFile(filePath, "utf8").catch(() => "");

  if (current !== next) {
    await writeFile(filePath, next);
  }
}

function getAgentFilePath(key: keyof AgentDataFiles) {
  return path.join(agentDataDir, fileNames[key]);
}
