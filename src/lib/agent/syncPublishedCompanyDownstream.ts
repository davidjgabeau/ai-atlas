import type { CompanyEvent } from "@/types/agent";
import { refreshCompanyProfileBriefs } from "@/lib/agent/refreshCompanyProfileBriefs";
import { refreshCompanyJobs } from "@/lib/jobs/refreshCompanyJobs";
import { generateSocialDrafts } from "@/lib/social-automation/generator";
import {
  createSupabasePrivilegedClient,
  hasSupabasePrivilegedCredentials,
} from "@/lib/supabase/privileged";

import {
  createNewCompanyAddedEvents,
  type PublishedCompanyEventInput,
} from "./createPublishedCompanyEvents";
import { readAgentDataFiles } from "./jsonStore";
import {
  loadAgentDataForPipelineFromSupabase,
  saveAgentDataToSupabase,
} from "./supabaseAgentStore";

export type { PublishedCompanyEventInput };

export type SyncPublishedCompanyDownstreamResult = {
  eventsCreated: number;
  jobsUpserted: number;
  briefsGenerated: number;
  socialDraftsCreated: number;
  events: CompanyEvent[];
  errors: string[];
};

export async function syncPublishedCompanyDownstream(
  published: PublishedCompanyEventInput[],
): Promise<SyncPublishedCompanyDownstreamResult> {
  if (published.length === 0) {
    return {
      eventsCreated: 0,
      jobsUpserted: 0,
      briefsGenerated: 0,
      socialDraftsCreated: 0,
      events: [],
      errors: [],
    };
  }

  const errors: string[] = [];
  const slugs = published.map((company) => company.slug);
  const existingEvents = await loadExistingCompanyEvents();
  const events = createNewCompanyAddedEvents({ published, existingEvents });

  if (events.length > 0) {
    const persistResult = await persistCompanyEvents(events, existingEvents);
    errors.push(...persistResult.errors);
  }

  const [jobsResult, briefsResult, socialResult] = await Promise.all([
    refreshCompanyJobs({
      companySlugs: slugs,
      companyLimit: Math.max(slugs.length, 8),
    }).catch((error) => ({
      ok: false,
      jobsUpserted: 0,
      errors: [{ company: "jobs", error: getErrorMessage(error) }],
    })),
    refreshCompanyProfileBriefs({
      companySlugs: slugs,
      force: true,
      limit: Math.max(slugs.length, 8),
      persistJson: false,
    }).catch((error) => ({
      ok: false,
      briefsGenerated: 0,
      errors: [{ company: "briefs", error: getErrorMessage(error) }],
    })),
    shouldGenerateSocialDrafts()
      ? generateSocialDrafts().catch((error) => ({
          ok: false,
          draftsCreated: 0,
          errors: [getErrorMessage(error)],
        }))
      : Promise.resolve({
          ok: true,
          draftsCreated: 0,
          errors: [] as string[],
        }),
  ]);

  errors.push(
    ...jobsResult.errors.map((entry) => `${entry.company}: ${entry.error}`),
    ...briefsResult.errors.map((entry) => `${entry.company}: ${entry.error}`),
    ...socialResult.errors,
  );

  return {
    eventsCreated: events.length,
    jobsUpserted: "jobsUpserted" in jobsResult ? jobsResult.jobsUpserted : 0,
    briefsGenerated:
      "briefsGenerated" in briefsResult ? briefsResult.briefsGenerated : 0,
    socialDraftsCreated:
      "draftsCreated" in socialResult ? socialResult.draftsCreated : 0,
    events,
    errors,
  };
}

async function loadExistingCompanyEvents() {
  const [jsonData, supabaseData] = await Promise.all([
    readAgentDataFiles(),
    loadAgentDataForPipelineFromSupabase(),
  ]);

  return supabaseData.companyEvents && supabaseData.companyEvents.length > 0
    ? supabaseData.companyEvents
    : jsonData.companyEvents;
}

async function persistCompanyEvents(
  events: CompanyEvent[],
  existingEvents: CompanyEvent[],
) {
  const errors: string[] = [];
  const nextEvents = [...existingEvents];

  for (const event of events) {
    if (nextEvents.some((existing) => existing.contentHash === event.contentHash)) {
      continue;
    }
    nextEvents.push(event);
  }

  const supabase = createSupabasePrivilegedClient();
  if (supabase && hasSupabasePrivilegedCredentials()) {
    const { error } = await supabase.from("company_events").upsert(
      events.map((event) => ({
        id: event.id,
        company_id: event.companyId,
        type: event.type,
        title: event.title,
        summary: event.summary,
        source_url: event.sourceUrl,
        source_name: event.sourceName,
        occurred_at: event.occurredAt,
        discovered_at: event.discoveredAt,
        confidence: event.confidence,
        importance_score: event.importanceScore,
        novelty_score: event.noveltyScore,
        relevance_score: event.relevanceScore,
        final_score: event.finalScore,
        extracted_facts: event.extractedFacts,
        content_hash: event.contentHash,
      })),
      { onConflict: "id" },
    );

    if (error) {
      errors.push(`company_events: ${error.message}`);
    }
  } else {
    errors.push(
      "Supabase privileged credentials are not configured for company event sync.",
    );
  }

  const mirrorResult = await saveAgentDataToSupabase({
    companyEvents: nextEvents,
  });
  if (!mirrorResult.ok) {
    errors.push(...(mirrorResult.errors ?? []));
    if (mirrorResult.reason) errors.push(mirrorResult.reason);
  }

  return { errors };
}

function shouldGenerateSocialDrafts() {
  return (
    process.env.SOCIAL_KILL_SWITCH !== "true" &&
    Boolean(process.env.ANTHROPIC_API_KEY?.trim()) &&
    process.env.SOCIAL_AUTO_POST !== "false"
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
