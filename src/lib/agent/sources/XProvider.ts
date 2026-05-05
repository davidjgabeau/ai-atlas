import type { AgentCompany, RawSourceRecord } from "../../../types/agent";
import type { SourceProvider } from "./SourceProvider";

export class XProvider implements SourceProvider {
  name = "x";

  async fetchForCompany(company: AgentCompany): Promise<RawSourceRecord[]> {
    if (!process.env.X_BEARER_TOKEN && !process.env.TWITTER_BEARER_TOKEN) {
      return [];
    }

    // TODO: reuse the social feed sync client and convert posts into raw records.
    void company;
    return [];
  }
}
