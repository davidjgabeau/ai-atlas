import { createHash } from "node:crypto";

import {
  createSupabasePrivilegedClient,
  hasSupabasePrivilegedCredentials,
} from "@/lib/supabase/privileged";

type CompanyJobSyncRow = {
  id: string;
  name: string;
  slug: string;
  website_url: string;
};

type DiscoveredJob = {
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
  status: "open";
  raw: Record<string, unknown>;
};

type RefreshCompanyJobsOptions = {
  companyLimit?: number;
  jobsPerCompany?: number;
};

export type RefreshCompanyJobsResult = {
  ok: boolean;
  companiesChecked: number;
  companiesWithJobs: number;
  jobsFound: number;
  jobsUpserted: number;
  errors: Array<{ company: string; error: string }>;
};

export async function refreshCompanyJobs({
  companyLimit = 120,
  jobsPerCompany = 25,
}: RefreshCompanyJobsOptions = {}): Promise<RefreshCompanyJobsResult> {
  const supabase = createSupabasePrivilegedClient();

  if (!supabase || !hasSupabasePrivilegedCredentials()) {
    return {
      ok: false,
      companiesChecked: 0,
      companiesWithJobs: 0,
      jobsFound: 0,
      jobsUpserted: 0,
      errors: [
        {
          company: "Supabase",
          error:
            "A Supabase service key or agent write secret is required to persist jobs.",
        },
      ],
    };
  }

  const { data, error } = await supabase
    .from("companies")
    .select("id,name,slug,website_url")
    .eq("status", "published")
    .neq("website_url", "")
    .order("updated_at", { ascending: false })
    .limit(companyLimit);

  if (error || !data) {
    return {
      ok: false,
      companiesChecked: 0,
      companiesWithJobs: 0,
      jobsFound: 0,
      jobsUpserted: 0,
      errors: [
        {
          company: "Supabase",
          error: error?.message ?? "Unable to load companies.",
        },
      ],
    };
  }

  let jobsFound = 0;
  let jobsUpserted = 0;
  let companiesWithJobs = 0;
  const errors: RefreshCompanyJobsResult["errors"] = [];

  for (const company of data as CompanyJobSyncRow[]) {
    try {
      const jobs = await discoverJobsForCompany(company, jobsPerCompany);
      jobsFound += jobs.length;
      if (jobs.length > 0) companiesWithJobs += 1;

      if (jobs.length === 0) continue;

      const rows = jobs.map((job) => ({
        id: createJobId(job.company_id, job.source_url),
        ...job,
      }));

      const { error: upsertError } = await supabase
        .from("company_jobs")
        .upsert(rows, { onConflict: "company_id,source_url" });

      if (upsertError) throw new Error(upsertError.message);

      jobsUpserted += rows.length;
    } catch (jobError) {
      errors.push({
        company: company.name,
        error:
          jobError instanceof Error ? jobError.message : "Unknown job sync error.",
      });
    }
  }

  return {
    ok: errors.length === 0,
    companiesChecked: data.length,
    companiesWithJobs,
    jobsFound,
    jobsUpserted,
    errors,
  };
}

async function discoverJobsForCompany(
  company: CompanyJobSyncRow,
  jobsPerCompany: number,
) {
  const websiteUrl = normalizeUrl(company.website_url);
  if (!websiteUrl) return [];

  const homepage = await fetchHtml(websiteUrl);
  const careerUrls = uniqueStrings([
    ...(homepage ? extractCareerLinks(homepage.html, homepage.finalUrl) : []),
    ...getCommonCareerUrls(homepage?.finalUrl ?? websiteUrl),
  ]).slice(0, 6);

  const jobs: DiscoveredJob[] = [];
  const seenJobUrls = new Set<string>();

  for (const careerUrl of careerUrls) {
    const page = await fetchHtml(careerUrl);
    if (!page) continue;

    for (const job of [
      ...extractStructuredJobs(page.html, page.finalUrl),
      ...extractJobLinks(page.html, page.finalUrl),
    ]) {
      if (seenJobUrls.has(job.source_url)) continue;
      seenJobUrls.add(job.source_url);

      jobs.push({
        company_id: company.id,
        title: job.title,
        department: job.department,
        location: job.location,
        employment_type: job.employment_type,
        remote_policy: job.remote_policy,
        source_url: job.source_url,
        source_name: getSourceName(job.source_url),
        external_id: job.external_id || createJobId(company.id, job.source_url),
        posted_at: job.posted_at,
        discovered_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        status: "open",
        raw: {
          sourcePage: page.finalUrl,
          company: company.slug,
          extraction: job.extraction,
        },
      });

      if (jobs.length >= jobsPerCompany) return jobs;
    }
  }

  return jobs;
}

function extractCareerLinks(html: string, baseUrl: string) {
  const urls: string[] = [];

  for (const anchor of extractAnchors(html, baseUrl)) {
    const text = normalizeText(anchor.text);
    const href = anchor.href.toLowerCase();

    if (
      /\b(careers?|jobs?|open roles?|work with us|join us|hiring)\b/i.test(text) ||
      /\/(careers?|jobs?|openings?|roles?)(\/|$|\?)/i.test(href) ||
      /greenhouse|lever\.co|ashbyhq|workable|breezy|wellfound/i.test(href)
    ) {
      urls.push(anchor.href);
    }
  }

  return urls;
}

function extractStructuredJobs(html: string, baseUrl: string) {
  const jobs: Array<Omit<DiscoveredJob, "company_id" | "discovered_at" | "last_seen_at" | "status" | "source_name" | "raw"> & { extraction: string }> = [];

  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const rawJson = decodeHtml(match[1].trim());
    const parsed = safeJsonParse(rawJson);
    const items = flattenJsonLd(parsed);

    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const type = Array.isArray(record["@type"])
        ? record["@type"].join(" ")
        : String(record["@type"] ?? "");

      if (!type.toLowerCase().includes("jobposting")) continue;

      const title = cleanJobTitle(String(record.title ?? ""));
      if (!looksLikeJobTitle(title)) continue;

      const sourceUrl = toAbsoluteUrl(
        String(record.url ?? record.sameAs ?? baseUrl),
        baseUrl,
      );

      jobs.push({
        title,
        department: normalizeText(String(record.industry ?? "")),
        location: getStructuredLocation(record.jobLocation),
        employment_type: normalizeText(String(record.employmentType ?? "")),
        remote_policy: "",
        source_url: sourceUrl || baseUrl,
        external_id: createJobId(title, sourceUrl || baseUrl),
        posted_at: normalizeDate(String(record.datePosted ?? "")),
        extraction: "json-ld",
      });
    }
  }

  return jobs;
}

function extractJobLinks(html: string, baseUrl: string) {
  const jobs: Array<Omit<DiscoveredJob, "company_id" | "discovered_at" | "last_seen_at" | "status" | "source_name" | "raw"> & { extraction: string }> = [];

  for (const anchor of extractAnchors(html, baseUrl)) {
    const title = cleanJobTitle(anchor.text);
    if (!looksLikeJobTitle(title)) continue;
    if (!looksLikeJobUrl(anchor.href) && !looksLikeSpecificJobTitle(title)) continue;

    jobs.push({
      title,
      department: inferDepartment(title, anchor.href),
      location: inferLocation(title, anchor.href),
      employment_type: "",
      remote_policy: inferRemotePolicy(title, anchor.href),
      source_url: anchor.href,
      external_id: createJobId(title, anchor.href),
      posted_at: undefined,
      extraction: "career-link",
    });
  }

  return dedupeJobs(jobs);
}

function extractAnchors(html: string, baseUrl: string) {
  const anchors: Array<{ href: string; text: string }> = [];

  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = getAttribute(match[1], "href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) continue;

    anchors.push({
      href: toAbsoluteUrl(href, baseUrl),
      text: stripTags(match[2]),
    });
  }

  return anchors.filter((anchor) => Boolean(anchor.href));
}

function getCommonCareerUrls(baseUrl: string) {
  const url = new URL(baseUrl);
  const origin = url.origin;

  return [
    new URL("/careers", origin).toString(),
    new URL("/jobs", origin).toString(),
    new URL("/company/careers", origin).toString(),
    new URL("/about/careers", origin).toString(),
  ];
}

function looksLikeJobUrl(value: string) {
  return /\/(jobs?|careers?|openings?|roles?|positions?|postings?)[/?#-]/i.test(
    value,
  );
}

function looksLikeSpecificJobTitle(title: string) {
  return /\b(engineer|designer|product|growth|sales|account|founder|chief|marketing|operations|data|research|scientist|manager|recruiter|finance|legal|clinical|customer|solutions|developer|analyst|lead|head of|staff|principal|intern)\b/i.test(
    title,
  );
}

function looksLikeJobTitle(title: string) {
  if (!title || title.length < 4 || title.length > 90) return false;
  if (!/[a-z]/i.test(title)) return false;
  if (/^(careers?|jobs?|open roles?|view jobs?|see openings?|apply|learn more|read more|join us|work with us|home|about|contact|login|sign in)$/i.test(title)) {
    return false;
  }
  if (/\b(privacy|terms|cookie|newsletter|blog|press|contact|pricing|demo)\b/i.test(title)) {
    return false;
  }

  return looksLikeSpecificJobTitle(title);
}

function cleanJobTitle(value: string) {
  return normalizeText(value)
    .replace(/\s*[-|]\s*(apply|view job|learn more)$/i, "")
    .replace(/\s*\(.*?apply.*?\)$/i, "")
    .trim();
}

function inferDepartment(title: string, href: string) {
  const value = `${title} ${href}`.toLowerCase();
  if (/engineer|developer|infra|platform|software|data|ml|ai/.test(value)) return "Engineering";
  if (/product|design|ux/.test(value)) return "Product";
  if (/sales|account|customer|success|solutions|gtm/.test(value)) return "GTM";
  if (/marketing|growth|content/.test(value)) return "Marketing";
  if (/operations|finance|legal|people|recruit/.test(value)) return "Operations";
  return "";
}

function inferLocation(title: string, href: string) {
  const value = `${title} ${href}`;
  if (/new york|nyc|brooklyn|manhattan/i.test(value)) return "New York, NY";
  if (/remote/i.test(value)) return "Remote";
  return "";
}

function inferRemotePolicy(title: string, href: string) {
  const value = `${title} ${href}`;
  return /remote/i.test(value) ? "Remote" : "";
}

function getStructuredLocation(value: unknown) {
  if (!value) return "";
  const locations = Array.isArray(value) ? value : [value];
  const labels = locations
    .map((location) => {
      if (!location || typeof location !== "object") return "";
      const record = location as Record<string, unknown>;
      const address = record.address;
      if (!address || typeof address !== "object") return "";
      const addressRecord = address as Record<string, unknown>;
      return normalizeText(
        [
          addressRecord.addressLocality,
          addressRecord.addressRegion,
          addressRecord.addressCountry,
        ]
          .filter(Boolean)
          .join(", "),
      );
    })
    .filter(Boolean);

  return labels.join(" / ");
}

function getSourceName(value: string) {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, "");
    if (hostname.includes("greenhouse")) return "Greenhouse";
    if (hostname.includes("lever.co")) return "Lever";
    if (hostname.includes("ashbyhq")) return "Ashby";
    if (hostname.includes("workable")) return "Workable";
    if (hostname.includes("breezy")) return "Breezy";
    return "Company careers";
  } catch {
    return "Company careers";
  }
}

async function fetchHtml(url: string) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "AI Atlas NYC jobs refresh (+https://aiatlas.nyc)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !contentType.includes("html")) return null;

    return {
      html: await response.text(),
      finalUrl: response.url || url,
    };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 9000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return /^https?:\/\//i.test(trimmed)
      ? new URL(trimmed).toString()
      : new URL(`https://${trimmed}`).toString();
  } catch {
    return "";
  }
}

function toAbsoluteUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function getAttribute(value: string, name: string) {
  const match = value.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return decodeHtml(match?.[1] ?? "");
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, " "));
}

function normalizeText(value: string) {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeDate(value: string) {
  if (!value) return undefined;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return undefined;
  return new Date(time).toISOString();
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function flattenJsonLd(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  const graph = record["@graph"];
  return [record, ...flattenJsonLd(graph)];
}

function dedupeJobs<T extends { source_url: string; title: string }>(jobs: T[]) {
  const seen = new Set<string>();
  const uniqueJobs: T[] = [];

  for (const job of jobs) {
    const key = `${job.title.toLowerCase()}|${job.source_url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueJobs.push(job);
  }

  return uniqueJobs;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function createJobId(companyId: string, sourceUrl: string) {
  return `job_${createHash("sha256")
    .update(`${companyId}:${sourceUrl}`)
    .digest("hex")
    .slice(0, 24)}`;
}
