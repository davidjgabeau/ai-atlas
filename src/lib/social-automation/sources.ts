import { createContentHash } from "@/lib/agent/hash";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";
import type { CompanyEvent, MarketSnapshot } from "@/types/agent";
import type { Category, NewsItem } from "@/types/market";
import type {
  SocialCompany,
  SocialJob,
  SocialPostCandidate,
} from "@/types/social";

type CompanyRow = Partial<SocialCompany> & {
  status?: string;
};

type EventRow = {
  id?: string;
  company_id?: string;
  type?: CompanyEvent["type"];
  title?: string;
  summary?: string;
  source_url?: string;
  source_name?: string;
  occurred_at?: string;
  discovered_at?: string;
  confidence?: CompanyEvent["confidence"];
  importance_score?: number;
  novelty_score?: number;
  relevance_score?: number;
  final_score?: number;
  extracted_facts?: CompanyEvent["extractedFacts"];
  content_hash?: string;
};

type SnapshotRow = {
  id?: string;
  generated_at?: string;
  company_count?: number;
  category_counts?: Record<string, number>;
  stage_counts?: Record<string, number>;
  recent_company_ids?: string[];
  recent_event_ids?: string[];
  top_categories?: MarketSnapshot["topCategories"];
  top_signals?: MarketSnapshot["topSignals"];
  source_hash?: string;
};

type EditorialSurfaceRow = {
  id?: string;
  surface?: string;
  generated_at?: string;
  items?: Array<Record<string, unknown>>;
  source_event_ids?: string[];
  source_company_ids?: string[];
  source_snapshot_ids?: string[];
  source_hash?: string;
};

type CandidateInput = Omit<
  SocialPostCandidate,
  | "sourceHash"
  | "score"
  | "sourceCompanyIds"
  | "sourceEventIds"
  | "sourceJobIds"
  | "sourceNewsIds"
  | "sourceSnapshotIds"
  | "sourceUrls"
> &
  Partial<
    Pick<
      SocialPostCandidate,
      | "sourceCompanyIds"
      | "sourceEventIds"
      | "sourceJobIds"
      | "sourceNewsIds"
      | "sourceSnapshotIds"
      | "sourceUrls"
    >
  > & {
    raw?: Record<string, unknown>;
    score?: number;
  };

export async function collectSocialPostCandidates(limit: number) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) {
    return {
      candidates: [] as SocialPostCandidate[],
      errors: ["Supabase privileged credentials are not configured."],
    };
  }

  const [
    companiesResult,
    eventsResult,
    jobsResult,
    newsResult,
    snapshotsResult,
    editorialResult,
  ] =
    await Promise.all([
      supabase
        .from("companies")
        .select("id,name,slug,category,stage,short_description,one_line_thesis,recent_activity_text,recent_activity_date,x_handle,is_featured,is_breakout,updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(500),
      supabase
        .from("company_events")
        .select("*")
        .order("final_score", { ascending: false })
        .order("discovered_at", { ascending: false })
        .limit(30),
      supabase
        .from("company_jobs")
        .select("id,company_id,title,location,source_url,source_name,discovered_at,last_seen_at")
        .eq("status", "open")
        .order("discovered_at", { ascending: false })
        .limit(40),
      supabase
        .from("news_items")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("discovered_at", { ascending: false })
        .limit(40),
      supabase
        .from("market_snapshots")
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(2),
      supabase
        .from("editorial_surfaces")
        .select("*")
        .eq("surface", "current_read")
        .order("generated_at", { ascending: false })
        .limit(2),
    ]);

  const errors = [
    companiesResult.error?.message,
    eventsResult.error?.message,
    jobsResult.error?.message,
    newsResult.error?.message,
    snapshotsResult.error?.message,
    editorialResult.error?.message,
  ].filter((error): error is string => Boolean(error));

  const companies = ((companiesResult.data ?? []) as CompanyRow[])
    .map(normalizeCompany)
    .filter((company): company is SocialCompany => Boolean(company));
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const events = ((eventsResult.data ?? []) as EventRow[]).map(normalizeEvent);
  const jobs = ((jobsResult.data ?? []) as Array<Partial<SocialJob>>)
    .map(normalizeJob)
    .filter((job): job is SocialJob => Boolean(job));
  const newsItems = ((newsResult.data ?? []) as Array<Partial<NewsItem>>)
    .map(normalizeNewsItem)
    .filter((item): item is NewsItem => Boolean(item));
  const snapshots = ((snapshotsResult.data ?? []) as SnapshotRow[]).map(
    normalizeSnapshot,
  );
  const editorialSurfaces = (editorialResult.data ?? []) as EditorialSurfaceRow[];

  return {
    candidates: rankCandidates([
      ...createCompanyUpdateCandidates(events, companiesById),
      ...createJobCandidates(jobs, companiesById),
      ...createNewsCandidates(newsItems, companies),
      ...createCategoryMovementCandidates(snapshots, companies),
      ...createCurrentReadCandidates(editorialSurfaces, companies),
      ...createEvergreenCandidates(companies),
    ]).slice(0, limit),
    errors,
  };
}

function createCompanyUpdateCandidates(
  events: CompanyEvent[],
  companiesById: Map<string, SocialCompany>,
): SocialPostCandidate[] {
  return events
    .filter((event) =>
      [
        "funding",
        "product_launch",
        "customer_signal",
        "hiring_signal",
        "new_company_added",
        "traction_signal",
        "partnership",
      ].includes(event.type),
    )
    .map((event) => {
      const company = companiesById.get(event.companyId);
      if (!company) return null;

      return candidate({
        sourceKind: "company_update",
        title: event.title,
        facts: [
          event.summary,
          `${company.name} is in ${company.category}.`,
          company.short_description,
        ],
        companies: [company],
        sourceCompanyIds: [company.id],
        sourceEventIds: [event.id],
        sourceUrls: [event.sourceUrl].filter(Boolean),
        raw: {
          type: event.type,
          occurredAt: event.occurredAt,
          finalScore: event.finalScore,
        },
        score: scoreCandidate("company_update", {
          eventPriority: event.type === "funding" ? 5 : 4,
          companies: [company],
          sourceUrls: [event.sourceUrl].filter(Boolean),
          hasEvent: true,
        }),
      });
    })
    .filter((item): item is SocialPostCandidate => Boolean(item));
}

function createJobCandidates(
  jobs: SocialJob[],
  companiesById: Map<string, SocialCompany>,
): SocialPostCandidate[] {
  const seenCompanies = new Set<string>();
  const candidates: SocialPostCandidate[] = [];

  for (const job of jobs) {
    if (seenCompanies.has(job.company_id)) continue;
    const company = companiesById.get(job.company_id);
    if (!company) continue;

    seenCompanies.add(company.id);
    candidates.push(
      candidate({
        sourceKind: "job_alert",
        title: `${company.name} is hiring`,
        facts: [
          `${company.name} has an open ${job.title} role.`,
          job.location ? `Location: ${job.location}.` : "",
          `${company.name} is in ${company.category}.`,
        ].filter(Boolean),
        companies: [company],
        sourceCompanyIds: [company.id],
        sourceJobIds: [job.id],
        sourceUrls: [job.source_url],
        raw: { jobTitle: job.title, sourceName: job.source_name },
        score: scoreCandidate("job_alert", {
          eventPriority: 3,
          companies: [company],
          sourceUrls: [job.source_url],
        }),
      }),
    );
  }

  return candidates;
}

function createNewsCandidates(
  newsItems: NewsItem[],
  companies: SocialCompany[],
): SocialPostCandidate[] {
  return newsItems
    .map((item) => {
      const matchedCompanies = companies
        .filter((company) => mentionsCompany(item, company))
        .slice(0, 3);

      if (matchedCompanies.length === 0) return null;

      return candidate({
        sourceKind: "company_news",
        title: item.title,
        facts: [
          item.summary,
          `Source: ${item.source_name || item.source_domain}.`,
          item.topic,
        ].filter(Boolean),
        companies: matchedCompanies,
        sourceCompanyIds: matchedCompanies.map((company) => company.id),
        sourceNewsIds: [item.id],
        sourceUrls: [item.source_url],
        raw: { scope: item.scope, relevanceScore: item.relevance_score },
        score: scoreCandidate("company_news", {
          eventPriority: 5,
          companies: matchedCompanies,
          sourceUrls: [item.source_url],
        }),
      });
    })
    .filter((item): item is SocialPostCandidate => Boolean(item))
    .slice(0, 8);
}

function createCategoryMovementCandidates(
  snapshots: MarketSnapshot[],
  companies: SocialCompany[],
): SocialPostCandidate[] {
  const latest = snapshots[0];
  if (!latest) return [];

  return latest.topCategories.filter((item) => item.delta > 0).slice(0, 3).map((item) => {
    const categoryCompanies = companies
      .filter((company) => company.category === item.category)
      .slice(0, 3);

    return candidate({
      sourceKind: "category_movement",
      title: `${item.category} has ${item.count} mapped companies`,
      facts: [
        `${item.category}: ${item.count} companies.`,
        item.delta > 0 ? `Change since prior snapshot: +${item.delta}.` : "No major count change.",
        categoryCompanies.length > 0
          ? `Examples: ${categoryCompanies.map((company) => company.name).join(", ")}.`
          : "",
      ].filter(Boolean),
      companies: categoryCompanies,
      category: item.category,
      sourceCompanyIds: categoryCompanies.map((company) => company.id),
      sourceSnapshotIds: [latest.id],
      sourceUrls: [],
      raw: item,
      score: scoreCandidate("category_movement", {
        eventPriority: 3,
        companies: categoryCompanies,
        sourceUrls: [],
      }),
    });
  });
}

function createCurrentReadCandidates(
  surfaces: EditorialSurfaceRow[],
  companies: SocialCompany[],
): SocialPostCandidate[] {
  return surfaces
    .map((surface) => {
      const items = Array.isArray(surface.items) ? surface.items : [];
      const firstItem = items[0];
      const title = stringValue(firstItem?.title) || "AI Atlas Current Read";
      const body = stringValue(firstItem?.body) || stringValue(firstItem?.summary);
      const companyIds = arrayValue(surface.source_company_ids).slice(0, 3);
      const mentionedCompanies = companies.filter((company) =>
        companyIds.includes(company.id),
      );

      if (!body) return null;

      return candidate({
        sourceKind: "current_read",
        title,
        facts: [body, "Current Read from AI Atlas NYC."],
        companies: mentionedCompanies,
        sourceCompanyIds: companyIds,
        sourceEventIds: arrayValue(surface.source_event_ids),
        sourceSnapshotIds: arrayValue(surface.source_snapshot_ids),
        sourceUrls: ["https://aiatlas.nyc/"],
        raw: {
          surface: surface.surface,
          generatedAt: surface.generated_at,
          sourceHash: surface.source_hash,
        },
        score: scoreCandidate("current_read", {
          eventPriority: 3,
          companies: mentionedCompanies,
          sourceUrls: ["https://aiatlas.nyc/"],
          hasEvent: arrayValue(surface.source_event_ids).length > 0,
        }),
      });
    })
    .filter((item): item is SocialPostCandidate => Boolean(item));
}

function createEvergreenCandidates(companies: SocialCompany[]): SocialPostCandidate[] {
  return [...companies]
    .sort(compareEvergreenCompanies)
    .slice(0, 8)
    .map((company) =>
      candidate({
        sourceKind: "evergreen_spotlight",
        title: `${company.name} spotlight`,
        facts: [
          company.one_line_thesis || company.short_description,
          `${company.name} is in ${company.category}.`,
          company.recent_activity_text,
        ].filter(Boolean),
        companies: [company],
        sourceCompanyIds: [company.id],
        sourceUrls: [`https://aiatlas.nyc/companies/${company.slug}`],
        raw: { featured: company.is_featured, breakout: company.is_breakout },
        score: scoreCandidate("evergreen_spotlight", {
          eventPriority: 1,
          companies: [company],
          sourceUrls: [`https://aiatlas.nyc/companies/${company.slug}`],
        }),
      }),
    );
}

function candidate({
  sourceKind,
  title,
  facts,
  companies,
  category,
  sourceCompanyIds = [],
  sourceEventIds = [],
  sourceJobIds = [],
  sourceNewsIds = [],
  sourceSnapshotIds = [],
  sourceUrls = [],
  raw = {},
  score,
}: CandidateInput): SocialPostCandidate {
  const sourceHash = createContentHash({
    sourceKind,
    sourceCompanyIds,
    sourceEventIds,
    sourceJobIds,
    sourceNewsIds,
    sourceSnapshotIds,
    title,
  });

  return {
    sourceKind,
    title,
    facts,
    companies,
    category,
    sourceCompanyIds,
    sourceEventIds,
    sourceJobIds,
    sourceNewsIds,
    sourceSnapshotIds,
    sourceUrls,
    sourceHash,
    score: score ?? 0,
    event: raw.event as CompanyEvent | undefined,
    job: raw.job as SocialJob | undefined,
    newsItem: raw.newsItem as NewsItem | undefined,
    snapshot: raw.snapshot as MarketSnapshot | undefined,
  };
}

function rankCandidates(candidates: SocialPostCandidate[]) {
  const kindPriority: Record<SocialPostCandidate["sourceKind"], number> = {
    company_update: 5,
    job_alert: 4,
    company_news: 3,
    category_movement: 2,
    current_read: 2,
    evergreen_spotlight: 1,
  };

  return candidates
    .filter((item) => item.title && item.facts.some(Boolean))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return kindPriority[right.sourceKind] - kindPriority[left.sourceKind];
    });
}

function scoreCandidate(
  sourceKind: SocialPostCandidate["sourceKind"],
  input: {
    eventPriority: number;
    companies: SocialCompany[];
    sourceUrls: string[];
    hasEvent?: boolean;
  },
) {
  const contentBucketPriority: Record<SocialPostCandidate["sourceKind"], number> = {
    company_update: 5,
    job_alert: 4,
    company_news: 4,
    category_movement: 3,
    current_read: 3,
    evergreen_spotlight: 1,
  };
  const companyCompleteness =
    input.companies.length > 0 &&
    input.companies.every(
      (company) => company.short_description || company.one_line_thesis,
    )
      ? 2
      : 0;
  const hasVerifiedHandle = input.companies.some((company) => company.x_handle)
    ? 1
    : 0;
  const hasFreshExternalLink = input.sourceUrls.length > 0 ? 1 : 0;
  const categoryDiversityBoost = new Set(
    input.companies.map((company) => company.category),
  ).size > 1
    ? 1
    : 0;
  const weakProfilePenalty =
    input.companies.length > 0 && companyCompleteness === 0 ? 2 : 0;

  return (
    input.eventPriority +
    companyCompleteness +
    hasVerifiedHandle +
    hasFreshExternalLink +
    categoryDiversityBoost +
    contentBucketPriority[sourceKind] -
    weakProfilePenalty
  );
}

function normalizeCompany(row: CompanyRow): SocialCompany | null {
  if (!row.id || !row.name || !row.slug) return null;

  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    category: String(row.category ?? "") as Category,
    stage: String(row.stage ?? ""),
    short_description: String(row.short_description ?? ""),
    one_line_thesis: String(row.one_line_thesis ?? ""),
    recent_activity_text: String(row.recent_activity_text ?? ""),
    recent_activity_date: String(row.recent_activity_date ?? ""),
    x_handle: normalizeHandle(row.x_handle),
    is_featured: Boolean(row.is_featured),
    is_breakout: Boolean(row.is_breakout),
    updated_at: String(row.updated_at ?? ""),
  };
}

function normalizeEvent(row: EventRow): CompanyEvent {
  return {
    id: String(row.id ?? ""),
    companyId: String(row.company_id ?? ""),
    type: row.type ?? "other",
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    sourceUrl: String(row.source_url ?? ""),
    sourceName: String(row.source_name ?? ""),
    occurredAt: String(row.occurred_at ?? row.discovered_at ?? ""),
    discoveredAt: String(row.discovered_at ?? ""),
    confidence: row.confidence ?? "medium",
    importanceScore: numberValue(row.importance_score),
    noveltyScore: numberValue(row.novelty_score),
    relevanceScore: numberValue(row.relevance_score),
    finalScore: numberValue(row.final_score),
    extractedFacts:
      row.extracted_facts && typeof row.extracted_facts === "object"
        ? row.extracted_facts
        : {},
    contentHash: String(row.content_hash ?? ""),
  };
}

function normalizeJob(row: Partial<SocialJob>): SocialJob | null {
  if (!row.id || !row.company_id || !row.title || !row.source_url) return null;

  return {
    id: String(row.id),
    company_id: String(row.company_id),
    title: String(row.title),
    location: String(row.location ?? ""),
    source_url: String(row.source_url),
    source_name: String(row.source_name ?? "Company careers"),
    discovered_at: String(row.discovered_at ?? ""),
    last_seen_at: String(row.last_seen_at ?? ""),
  };
}

function normalizeNewsItem(row: Partial<NewsItem>): NewsItem | null {
  if (!row.id || !row.title || !row.source_url) return null;

  return {
    id: String(row.id),
    title: String(row.title),
    summary: String(row.summary ?? ""),
    source_url: String(row.source_url),
    source_name: String(row.source_name ?? ""),
    source_domain: String(row.source_domain ?? ""),
    published_at: row.published_at ? String(row.published_at) : undefined,
    discovered_at: String(row.discovered_at ?? ""),
    scope: row.scope === "nyc" ? "nyc" : "broad",
    topic: String(row.topic ?? ""),
    relevance_score: numberValue(row.relevance_score),
    image_url: row.image_url ? String(row.image_url) : undefined,
    status: row.status === "hidden" ? "hidden" : "published",
    raw:
      row.raw && typeof row.raw === "object" && !Array.isArray(row.raw)
        ? row.raw
        : {},
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function normalizeSnapshot(row: SnapshotRow): MarketSnapshot {
  return {
    id: String(row.id ?? ""),
    generatedAt: String(row.generated_at ?? ""),
    companyCount: numberValue(row.company_count),
    categoryCounts: objectValue(row.category_counts),
    stageCounts: objectValue(row.stage_counts),
    recentCompanyIds: arrayValue(row.recent_company_ids),
    recentEventIds: arrayValue(row.recent_event_ids),
    topCategories: Array.isArray(row.top_categories) ? row.top_categories : [],
    topSignals: Array.isArray(row.top_signals) ? row.top_signals : [],
    sourceHash: String(row.source_hash ?? ""),
  };
}

function mentionsCompany(item: NewsItem, company: SocialCompany) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  return text.includes(company.name.toLowerCase());
}

function compareEvergreenCompanies(left: SocialCompany, right: SocialCompany) {
  if (left.is_featured !== right.is_featured) return left.is_featured ? -1 : 1;
  if (left.is_breakout !== right.is_breakout) return left.is_breakout ? -1 : 1;
  return getTime(right.updated_at) - getTime(left.updated_at);
}

function getTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function normalizeHandle(value: unknown) {
  return typeof value === "string" ? value.replace(/^@/, "").trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function objectValue(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => {
      return typeof entry[1] === "number";
    }),
  );
}

function arrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
