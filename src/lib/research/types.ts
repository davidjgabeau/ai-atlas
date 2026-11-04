export type OfficeEvidence = {
  company_slug: string;
  name: string;
  address?: string;
  borough?: string;
  neighborhood?: string;
  location_type: "headquarters" | "office" | "mailing" | "unverified";
  evidence_status: "verified" | "reported" | "unverified";
  occupancy_status?: "current" | "announced" | "historical" | "unknown";
  latitude?: number;
  longitude?: number;
  source_url: string;
  source_title: string;
  source_date?: string;
  verified_at: string;
  notes?: string;
  excerpt?: string;
  supporting_sources?: Array<{ source_url: string; source_title: string; source_date?: string }>;
  geocode_source?: string;
  geocode_note?: string;
};

export type ResearchCompany = {
  id: string;
  slug: string;
  name: string;
  category: string;
  stage: string;
  stage_group: string;
  description: string;
  website: string;
  founders: string[];
  funding_round: string;
  funding_amount: string;
  funding_date: string;
  jobs: number;
  jobs_checked_at: string | null;
  checked_at: string | null;
  review_scope: string;
  stage_reviewed: boolean;
  presence: string;
  sources: string[];
  offices: OfficeEvidence[];
};

export type ResearchSignal = {
  id: string;
  company_slug: string;
  company_name: string;
  type: string;
  title: string;
  summary: string;
  source_url: string;
  source_name: string;
  occurred_at: string;
  verified_at?: string;
  review: "Reviewed" | "Collected";
};

export type ReportingResources = {
  resources: Array<{
    id: string; title: string; organization: string; url: string;
    type: string; topic: string; description: string; coverage: string;
    caveat: string; published_at?: string; checked_at: string;
  }>;
  experts: Array<{
    name: string; role: string; organization: string; url: string;
    expertise: string; public_contact_url?: string;
  }>;
  methodology_notes: string[];
};

export type ResearchDataset = {
  companies: ResearchCompany[];
  signals: ResearchSignal[];
  resources: ReportingResources;
  generated_at: string;
  collection: Array<{ name: string; latest: string | null; note: string }>;
};
