import type { AgentCompany, RawSourceRecord } from "../../../types/agent";

export type SourceProvider = {
  name: string;
  fetchForCompany(company: AgentCompany): Promise<RawSourceRecord[]>;
  discoverCandidates?(): Promise<RawSourceRecord[]>;
};

export type SourceProviderLog = {
  provider: string;
  message: string;
};
