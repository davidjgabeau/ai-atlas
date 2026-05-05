import type { AgentCompany, RawSourceRecord } from "../../../types/agent";
import { createContentHash, createId } from "../hash";
import type { SourceProvider } from "./SourceProvider";

export class WebsiteProvider implements SourceProvider {
  name = "website";

  async fetchForCompany(company: AgentCompany): Promise<RawSourceRecord[]> {
    if (process.env.ENABLE_WEBSITE_FETCH !== "true") {
      return [];
    }

    if (!company.website) return [];

    const response = await fetch(company.website, {
      headers: {
        "user-agent": "AI Atlas NYC editorial refresh (+https://aiatlas.nyc)",
      },
      signal: AbortSignal.timeout(8_000),
    }).catch(() => null);

    if (!response?.ok) return [];

    const html = await response.text();
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    const text = stripHtml(html).slice(0, 12_000);
    const contentHash = createContentHash({
      url: company.website,
      title,
      text,
    });

    return [
      {
        id: createId("raw", contentHash),
        sourceType: "website",
        companyId: company.id,
        url: company.website,
        title,
        text,
        discoveredAt: new Date().toISOString(),
        contentHash,
      },
    ];
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
