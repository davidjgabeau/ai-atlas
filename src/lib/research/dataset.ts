import { cache } from "react";
import reviewedCompanies from "@/data/reporting/companies.json";
import reviewedSignals from "@/data/reporting/signals.json";
import resources from "@/data/reporting/resources.json";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import { getPublicCompanyJobs } from "@/lib/supabase/jobs";
import { getNewsItems } from "@/lib/news/news-store";
import { stageGroup } from "@/lib/company-stages";
import { officeEvidence, isDocumentedOffice } from "./evidence";
import { hasCompanyNewsSubject } from "./newsSubject";
import type { ReportingResources, ResearchCompany, ResearchDataset, ResearchSignal } from "./types";

type ReviewedCompany = { slug: string; source_urls: string[]; verified_at?: string; nyc_presence?: string; stage?: string; review_scope?: string; parent_company?: string };

export const getResearchDataset = cache(async (): Promise<ResearchDataset> => {
  const [companies, jobs, news] = await Promise.all([
    getPublishedCompanies(), getPublicCompanyJobs(), getNewsItems({ limit: 120 }),
  ]);
  const checked = new Map((reviewedCompanies as ReviewedCompany[]).map((c) => [c.slug, c]));
  const directory: ResearchCompany[] = companies.map((company) => {
    const review = checked.get(company.slug);
    const roles = jobs.filter((job) => job.company_id === company.id);
    return {
      id: company.id, slug: company.slug, name: company.name, stage: company.stage,
      stage_group: stageGroup(company.stage), category: company.category,
      ...(review?.parent_company ? { parent_company: review.parent_company } : {}),
      description: company.short_description, website: company.website_url,
      founders: company.founders.map((founder) => founder.name),
      funding_round: company.funding_round, funding_amount: company.funding_amount,
      funding_date: company.funding_date, jobs: roles.length,
      jobs_checked_at: latest(roles.map((job) => job.last_seen_at)),
      checked_at: review?.verified_at ?? null, presence: officeEvidence.some((o) => o.company_slug === company.slug && isDocumentedOffice(o)) ? (officeEvidence.some((o) => o.company_slug === company.slug && isDocumentedOffice(o) && o.location_type === "headquarters") ? "headquarters" : "office") : review?.nyc_presence ?? "NYC basis in original profile; recheck for reporting",
      review_scope: review?.review_scope ?? (review ? "Company identity, product and linked public funding sources." : "Original profile has not had a source review in this research pass."),
      stage_reviewed: Boolean(review?.stage),
      sources: [...new Set([...(review ? review.source_urls : company.discoveryReason?.sourceUrls ?? []), company.website_url])].filter(isHttp),
      offices: officeEvidence.filter((office) => office.company_slug === company.slug),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const bySlug = new Map(companies.map((c) => [c.slug, c]));
  const signals: ResearchSignal[] = (reviewedSignals as Array<Omit<ResearchSignal, "id" | "company_name" | "review">>)
    .filter((s) => bySlug.has(s.company_slug))
    .map((s) => ({ ...s, id: `reviewed:${s.company_slug}:${s.source_url}`, company_name: bySlug.get(s.company_slug)!.name, review: "Reviewed" }));
  for (const item of news) {
    // Whole company names, not category keywords, tie a news link to a profile.
    const company = companies.find((c) => hasCompanyNewsSubject(item.title, c.name));
    if (!company || !item.published_at) continue;
    signals.push({ id: item.id, company_slug: company.slug, company_name: company.name,
      type: "news", title: item.title, summary: item.summary, source_url: item.source_url,
      source_name: item.source_name, occurred_at: item.published_at, review: "Collected" });
  }
  const seen = new Set<string>();
  const datedSignals = signals.filter((signal) => {
    const date = Date.parse(signal.occurred_at);
    if (!Number.isFinite(date) || date > Date.now() || !isHttp(signal.source_url) || seen.has(signal.source_url)) return false;
    seen.add(signal.source_url); return true;
  }).sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
  return {
    companies: directory, signals: datedSignals, resources: resources as ReportingResources,
    generated_at: new Date().toISOString(),
    collection: [
      { name: "Reviewed profiles", latest: latest(directory.map((c) => c.checked_at)), note: "Review dates cover the stated scope. Funding stages and office occupancy may need separate checks." },
      { name: "Office evidence", latest: latest(officeEvidence.map((o) => o.verified_at)), note: "Source checks do not independently confirm current occupancy. Reported leases retain their original dates." },
      { name: "Hiring", latest: latest(jobs.map((j) => j.last_seen_at)), note: "Collected openings, seen within 14 days; capped at 1,000 across the site. Check the employer before citing; absence is not zero hiring." },
      { name: "News", latest: latest(news.map((n) => n.discovered_at)), note: "Collected daily from available feeds. Event date is separate from collection date; coverage is not exhaustive." },
    ],
  };
});

function isHttp(value: string) { return /^https?:\/\//i.test(value); }
function latest(values: Array<string | null | undefined>) {
  return values.filter((v): v is string => Boolean(v) && Number.isFinite(Date.parse(v!))).sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}
