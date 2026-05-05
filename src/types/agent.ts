export type LocationConfidence = "high" | "medium" | "low";

export type AgentCompanyStage =
  | "Pre-seed"
  | "Seed"
  | "Series A"
  | "Seed / Series A"
  | "Unknown";

export type Founder = {
  name: string;
  role?: string;
};

export type DiscoveryReasonTrigger =
  | "manual"
  | "cron_discovery"
  | "source_update"
  | "funding_signal"
  | "press_signal"
  | "profile_import";

export type DiscoveryReason = {
  trigger: DiscoveryReasonTrigger;
  sourceEventIds: string[];
  sourceUrls: string[];
  confidence: "high" | "medium" | "low";
  notes: string;
};

export type InclusionReason = {
  title: string;
  body: string;
  generatedAt: string;
  sourceEventIds: string[];
  sourceCompanyIds: string[];
};

export type AgentCompany = {
  id: string;
  slug: string;
  name: string;

  website?: string;
  x?: string;
  linkedin?: string;
  crunchbase?: string;

  location: string;
  locationConfidence: LocationConfidence;

  stage: AgentCompanyStage;
  category: string;
  subcategory?: string;

  description: string;
  oneSentenceDescription: string;

  founders?: Founder[];
  investors?: string[];
  customers?: string[];

  funding?: {
    totalRaised?: string;
    latestRound?: string;
    latestRoundAmount?: string;
    latestRoundDate?: string;
    leadInvestors?: string[];
  };

  tags: string[];

  generated?: {
    hook: string;
    signalLabel: string;
    signalReason: string;
    keywords: string[];
    trendDimensions: string[];
    generatedAt: string;
    sourceHash: string;
  };

  sourceUrls: string[];
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  discoveryReason?: DiscoveryReason;
  inclusionReason?: InclusionReason;
};

export type CompanyEventType =
  | "funding"
  | "product_launch"
  | "customer_signal"
  | "hiring_signal"
  | "founder_signal"
  | "website_change"
  | "press"
  | "social_post"
  | "category_change"
  | "new_company_added"
  | "traction_signal"
  | "partnership"
  | "other";

export type Confidence = "high" | "medium" | "low";

export type CompanyEvent = {
  id: string;
  companyId: string;

  type: CompanyEventType;
  title: string;
  summary: string;

  sourceUrl: string;
  sourceName: string;

  occurredAt: string;
  discoveredAt: string;

  confidence: Confidence;

  importanceScore: number;
  noveltyScore: number;
  relevanceScore: number;
  finalScore: number;

  extractedFacts: {
    round?: string;
    amount?: string;
    investorNames?: string[];
    customerNames?: string[];
    productNames?: string[];
    roleCount?: number;
    location?: string;
  };

  contentHash: string;
};

export type RawSourceType =
  | "website"
  | "blog"
  | "press"
  | "x"
  | "linkedin"
  | "jobs"
  | "search";

export type RawSourceRecord = {
  id: string;
  sourceType: RawSourceType;

  companyId?: string;
  candidateCompanyName?: string;

  url: string;
  title?: string;
  text: string;
  author?: string;
  publishedAt?: string;
  discoveredAt: string;

  contentHash: string;
};

export type MarketSnapshot = {
  id: string;
  generatedAt: string;

  companyCount: number;
  categoryCounts: Record<string, number>;
  stageCounts: Record<string, number>;

  recentCompanyIds: string[];
  recentEventIds: string[];

  topCategories: {
    category: string;
    count: number;
    delta: number;
  }[];

  topSignals: {
    type: string;
    count: number;
    delta: number;
  }[];

  sourceHash: string;
};

export type EditorialSurfaceName =
  | "companies_to_know"
  | "current_read"
  | "market_snapshot"
  | "category_pulse"
  | "recently_added"
  | "latest_signals";

export type EditorialSurface = {
  id: string;
  surface: EditorialSurfaceName;
  generatedAt: string;
  expiresAt: string;

  items: EditorialItem[];

  sourceEventIds: string[];
  sourceCompanyIds: string[];
  sourceSnapshotIds: string[];

  model?: string;
  promptVersion: string;
  sourceHash: string;
};

export type EditorialItem = {
  id: string;
  title: string;
  body?: string;
  companyId?: string;
  category?: string;
  label?: string;
  supportingEventIds?: string[];
  supportingCompanyIds?: string[];
  score?: number;
  sourceName?: string;
  sourceUrl?: string;
  occurredAt?: string;
};

export type CandidateUpdate = {
  id: string;
  companyId?: string;
  candidateCompanyName?: string;
  proposedUpdate: Partial<AgentCompany>;
  reason: string;
  sourceUrls: string[];
  confidence: Confidence;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type CompanyExposure = {
  id: string;
  companyId: string;
  surface: EditorialSurfaceName;
  shownAt: string;
  position: number;
};

export type GeneratedInsightHistory = {
  id: string;
  title: string;
  body: string;
  generatedAt: string;
  sourceCompanyIds: string[];
  sourceEventIds: string[];
  embedding?: number[];
};

export type AgentRun = {
  id: string;
  job: "refresh" | "discover" | "editorial" | "all";
  startedAt: string;
  finishedAt: string;
  status: "success" | "partial" | "failed";
  stats: {
    rawRecordsCreated: number;
    eventsCreated: number;
    eventsDeduped: number;
    candidateUpdatesCreated: number;
    companiesPublished: number;
    companiesArchived: number;
    editorialSurfacesGenerated: number;
    qualityGateFailures: number;
  };
  errors: string[];
};

export type ExtractedSignal = {
  companyName: string;
  possibleCompanyId?: string;

  signalType: Exclude<CompanyEventType, "social_post" | "category_change" | "new_company_added">;

  title: string;
  summary: string;

  occurredAt?: string;
  confidence: Confidence;

  facts: {
    fundingAmount?: string;
    round?: string;
    investors?: string[];
    product?: string;
    customers?: string[];
    jobs?: string[];
    location?: string;
  };

  shouldUpdateCompanyProfile: boolean;
  suggestedCompanyUpdates?: Partial<AgentCompany>;
};

export type AgentDataFiles = {
  companies: AgentCompany[];
  companyEvents: CompanyEvent[];
  rawSourceRecords: RawSourceRecord[];
  marketSnapshots: MarketSnapshot[];
  editorialSurfaces: EditorialSurface[];
  candidateUpdates: CandidateUpdate[];
  companyExposures: CompanyExposure[];
  generatedInsightHistory: GeneratedInsightHistory[];
  agentRuns: AgentRun[];
};
