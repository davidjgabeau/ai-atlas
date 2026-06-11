import type { AgentCompany, CompanyEvent } from "@/types/agent";

import { createContentHash, createId } from "./hash";
import { scoreEvent } from "./scoreEvent";

export type PublishedCompanyEventInput = {
  id: string;
  slug: string;
  name: string;
  category: string;
  website?: string;
  location?: string;
  oneSentenceDescription?: string;
  description?: string;
  sourceUrls?: string[];
  createdAt: string;
  generatedHook?: string;
};

export function createNewCompanyAddedEvents({
  published,
  existingEvents,
}: {
  published: PublishedCompanyEventInput[];
  existingEvents: CompanyEvent[];
}) {
  const existingHashes = new Set(existingEvents.map((event) => event.contentHash));
  const discoveredAt = new Date().toISOString();
  const events: CompanyEvent[] = [];

  for (const company of published) {
    const addedHash = createContentHash({
      companyId: company.id,
      type: "new_company_added",
      createdAt: company.createdAt.slice(0, 10),
    });

    if (existingHashes.has(addedHash)) continue;

    const agentCompany = toAgentCompany(company);
    const baseEvent: CompanyEvent = {
      id: createId("event", addedHash),
      companyId: company.id,
      type: "new_company_added",
      title: `${company.name} joins ${company.category}`,
      summary:
        company.generatedHook ??
        company.oneSentenceDescription ??
        company.description ??
        `${company.name} was added to AI Atlas NYC.`,
      sourceUrl:
        company.sourceUrls?.[0] ??
        company.website ??
        `https://aiatlas.nyc/companies/${company.slug}`,
      sourceName: "AI Atlas discovery",
      occurredAt: company.createdAt,
      discoveredAt,
      confidence: "high",
      importanceScore: 0,
      noveltyScore: 0,
      relevanceScore: 0,
      finalScore: 0,
      extractedFacts: {
        location: company.location,
      },
      contentHash: addedHash,
    };

    events.push(
      scoreEvent({
        event: baseEvent,
        company: agentCompany,
        existingEvents: [...existingEvents, ...events],
      }),
    );
    existingHashes.add(addedHash);
  }

  return events;
}

function toAgentCompany(company: PublishedCompanyEventInput): AgentCompany {
  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    website: company.website,
    location: company.location ?? "New York, NY",
    locationConfidence: "medium",
    stage: "Unknown",
    category: company.category as AgentCompany["category"],
    description: company.description ?? company.oneSentenceDescription ?? "",
    oneSentenceDescription: company.oneSentenceDescription ?? "",
    sourceUrls: company.sourceUrls ?? [],
    tags: [company.category],
    createdAt: company.createdAt,
    updatedAt: company.createdAt,
  };
}
