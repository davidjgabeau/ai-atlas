import type { AgentCompany, RawSourceRecord } from "../../../types/agent";
import type { SourceProvider } from "./SourceProvider";

export class LinkedInProvider implements SourceProvider {
  name = "linkedin";

  async fetchForCompany(company: AgentCompany): Promise<RawSourceRecord[]> {
    // LinkedIn does not provide a simple public crawl API for this use case.
    // Store verified LinkedIn excerpts in data/inbox/raw-sources.json instead.
    void company;
    return [];
  }
}
