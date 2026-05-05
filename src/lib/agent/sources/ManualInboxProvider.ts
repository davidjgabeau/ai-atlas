import { readFile } from "node:fs/promises";
import path from "node:path";

import type { AgentCompany, RawSourceRecord } from "../../../types/agent";
import { createContentHash, createId } from "../hash";
import type { SourceProvider } from "./SourceProvider";

type ManualInboxItem = Partial<RawSourceRecord> & {
  companySlug?: string;
};

export class ManualInboxProvider implements SourceProvider {
  name = "manual-inbox";

  async fetchForCompany(company: AgentCompany): Promise<RawSourceRecord[]> {
    const records = await readManualInbox();

    return records
      .filter((record) => {
        return record.companyId === company.id || record.companySlug === company.slug;
      })
      .map((record) => normalizeManualRecord(record, company));
  }

  async discoverCandidates(): Promise<RawSourceRecord[]> {
    const records = await readManualInbox();

    return records
      .filter((record) => !record.companyId && !record.companySlug)
      .map((record) => normalizeManualRecord(record));
  }
}

async function readManualInbox(): Promise<ManualInboxItem[]> {
  const filePath = path.join(process.cwd(), "data", "inbox", "raw-sources.json");
  const raw = await readFile(filePath, "utf8").catch(() => "[]");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeManualRecord(
  record: ManualInboxItem,
  company?: AgentCompany,
): RawSourceRecord {
  const discoveredAt = record.discoveredAt ?? new Date().toISOString();
  const text = String(record.text ?? "");
  const title = record.title ? String(record.title) : undefined;
  const url = String(record.url ?? `manual:${company?.slug ?? record.candidateCompanyName ?? "candidate"}`);
  const contentHash = record.contentHash ?? createContentHash({ url, title, text });

  return {
    id: record.id ?? createId("raw", contentHash),
    sourceType: record.sourceType ?? "search",
    companyId: record.companyId ?? company?.id,
    candidateCompanyName: record.candidateCompanyName,
    url,
    title,
    text,
    author: record.author,
    publishedAt: record.publishedAt,
    discoveredAt,
    contentHash,
  };
}
