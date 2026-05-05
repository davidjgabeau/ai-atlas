export const categories = [
  "Fintech & Trading AI",
  "Legal & Compliance AI",
  "Media, Ads & Creative AI",
  "Health & Clinical AI",
  "AI-Native Consumer & Social",
  "Agent Infrastructure",
  "Model Tools & Dev Platform",
  "Enterprise GTM & RevOps AI",
  "Data & Memory Layer",
] as const;

export const usagePotentials = [
  "Emerging",
  "Promising",
  "High Potential",
  "Breakout Watch",
] as const;

export const companyStatuses = ["draft", "published", "archived"] as const;
export const submissionStatuses = ["new", "accepted", "rejected"] as const;

export type Category = (typeof categories)[number];
export type UsagePotential = (typeof usagePotentials)[number];
export type CompanyStatus = (typeof companyStatuses)[number];
export type SubmissionStatus = (typeof submissionStatuses)[number];

export const generatedSignalLabels = [
  "Featured",
  "Worth watching",
  "Recently added",
  "Clear buyer pull",
  "Workflow signal",
  "Infra signal",
  "Consumer signal",
  "Enterprise signal",
  "Funding signal",
] as const;

export type GeneratedSignalLabel = (typeof generatedSignalLabels)[number];

export type GeneratedCompanyFields = {
  hook: string;
  signalLabel: GeneratedSignalLabel;
  signalReason: string;
  keywords: string[];
  trendDimensions: string[];
  generatedAt: string;
  sourceHash: string;
  profileBriefs?: CompanyProfileBriefs;
};

export type CompanyProfileBriefs = {
  whySaving: string;
  whatBuilding: string;
  aiModelUse: string;
  generatedAt: string;
  sourceHash: string;
  model?: string;
};

export type CompanyMetrics = {
  views: number;
  lastViewedAt?: string;
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

export type MarketInsight = {
  id: string;
  title: string;
  body: string;
  supportingCompanyIds: string[];
  generatedAt: string;
  sourceCompanyIds: string[];
  sourceHash: string;
};

export type CompanySocialPost = {
  id: string;
  company_id: string;
  platform: "x";
  external_post_id: string;
  author_handle: string;
  author_name: string;
  post_text: string;
  post_url: string;
  posted_at: string;
  metrics: Record<string, number>;
  media: Array<{
    type: string;
    url?: string;
    preview_image_url?: string;
  }>;
  synced_at: string;
  created_at: string;
};

export type NewsScope = "nyc" | "broad";

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  source_url: string;
  source_name: string;
  source_domain: string;
  published_at?: string;
  discovered_at: string;
  scope: NewsScope;
  topic: string;
  relevance_score: number;
  image_url?: string;
  status: "published" | "hidden";
  raw: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CompanyJob = {
  id: string;
  company_id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  remote_policy: string;
  source_url: string;
  source_name: string;
  external_id: string;
  posted_at?: string;
  discovered_at: string;
  last_seen_at: string;
  status: "open" | "closed";
  raw: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CompanyJobWithCompany = CompanyJob & {
  company?: Company;
};

export type Company = {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  website_url: string;
  x_handle: string;
  x_user_id: string;
  x_last_synced_at?: string;
  founder_name?: string;
  office_address: string;
  funding_round: string;
  funding_amount: string;
  funding_date: string;
  total_raised: string;
  lead_investor: string;
  funding_note: string;
  category: Category;
  stage: string;
  short_description: string;
  one_line_thesis: string;
  why_it_matters: string;
  ai_usage_profile: string;
  openai_fit: string;
  usage_potential: UsagePotential;
  recent_activity_text: string;
  recent_activity_date: string;
  is_featured: boolean;
  is_breakout: boolean;
  status: CompanyStatus;
  created_at: string;
  updated_at: string;
  generated: GeneratedCompanyFields;
  discoveryReason?: DiscoveryReason;
  inclusionReason?: InclusionReason;
  metrics?: CompanyMetrics;
};

export type Submission = {
  id: string;
  company_name: string;
  website_url: string;
  founder_name: string;
  email: string;
  description: string;
  usage_potential?: UsagePotential;
  status: SubmissionStatus;
  created_at: string;
};

export type CategoryMeta = {
  name: Category;
  slug: string;
  description: string;
  thesis: string;
};
