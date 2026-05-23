import "./load-env";

import { getPublishedCompanies } from "@/lib/supabase/market-data";
import {
  getCompanyXHandle,
  isBlockedCompanyXHandleCandidate,
} from "@/lib/social/companyXHandles";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

const defaultPaths = [
  "",
  "/about",
  "/company",
  "/contact",
  "/team",
  "/press",
  "/blog",
  "/news",
  "/careers",
  "/jobs",
];

const ignoredHandles = new Set([
  "download",
  "hashtag",
  "home",
  "intent",
  "jobs",
  "messages",
  "notifications",
  "privacy",
  "search",
  "settings",
  "share",
  "tos",
  "twitter",
  "x",
]);

type Candidate = {
  handle: string;
  sourceUrl: string;
  kind: "meta" | "href";
  score: number;
};

type CompanyForDiscovery = {
  name: string;
  slug: string;
  website_url: string;
  x_handle?: string | null;
  updated_at?: string | null;
};

async function main() {
  const limit = readNumericEnv("DISCOVERY_HANDLE_LIMIT", 80);
  const companies = (await getCompaniesForDiscovery())
    .filter(
      (company) =>
        !getCompanyXHandle({
          slug: company.slug,
          currentHandle: company.x_handle,
        }),
    )
    .slice(0, limit);
  const results = [];

  for (const company of companies) {
    const candidates = await discoverFromWebsite({
      companyName: company.name,
      websiteUrl: company.website_url,
    });
    const best = candidates[0] ?? null;
    const result = {
      name: company.name,
      slug: company.slug,
      website: company.website_url,
      handle: best?.handle ?? "",
      sourceUrl: best?.sourceUrl ?? "",
      score: best?.score ?? 0,
      all: candidates.slice(0, 3),
    };

    results.push(result);
    console.log(JSON.stringify(result));
  }

  console.log(JSON.stringify({
    checked: companies.length,
    found: results.filter((result) => result.handle).length,
    results: results.filter((result) => result.handle),
  }, null, 2));
}

async function discoverFromWebsite({
  companyName,
  websiteUrl,
}: {
  companyName: string;
  websiteUrl: string;
}) {
  const normalizedWebsite = normalizeWebsiteUrl(websiteUrl);
  if (!normalizedWebsite) return [];

  const base = new URL(normalizedWebsite);
  const inspectedUrls = new Set<string>();
  const candidates: Candidate[] = [];

  for (const path of defaultPaths) {
    const url = new URL(path, base.origin).toString();
    if (inspectedUrls.has(url)) continue;
    inspectedUrls.add(url);

    const page = await fetchHtml(url);
    if (!page) continue;

    candidates.push(
      ...extractCandidates(page.html, page.url, companyName, normalizedWebsite),
    );

    if (candidates.some((candidate) => candidate.score >= 8)) break;
  }

  return dedupeCandidates(candidates)
    .filter((candidate) => candidate.score >= 7)
    .filter(
      (candidate) =>
        !isBlockedCompanyXHandleCandidate({
          slug: slugify(companyName),
          handle: candidate.handle,
        }),
    )
    .sort((a, b) => b.score - a.score);
}

async function getCompaniesForDiscovery(): Promise<CompanyForDiscovery[]> {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) {
    const companies = await getPublishedCompanies();

    return [...companies].sort((a, b) =>
      String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")),
    );
  }

  const { data, error } = await supabase
    .from("companies")
    .select("name,slug,website_url,x_handle,updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(120);

  if (error || !data) {
    console.warn(
      "Unable to load live companies for handle discovery; falling back to published data.",
      error?.message,
    );
    const companies = await getPublishedCompanies();

    return [...companies].sort((a, b) =>
      String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")),
    );
  }

  return (data as CompanyForDiscovery[]).filter((company) =>
    Boolean(company.name && company.slug && company.website_url),
  );
}

async function fetchHtml(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "AI Atlas handle discovery (+https://aiatlas.nyc)",
      },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok || !contentType.includes("text/html")) return null;

    return {
      url: response.url,
      html: await response.text(),
    };
  } catch {
    return null;
  }
}

function extractCandidates(
  html: string,
  pageUrl: string,
  companyName: string,
  websiteUrl: string,
) {
  const candidates: Candidate[] = [];
  const urlPattern =
    /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})(?=[/?#"'<>\\\s]|$)/gi;

  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = getTagAttributes(tag[0]);
    const key = attributes.name ?? attributes.property ?? "";
    if (!/^twitter:(site|creator)$/i.test(key)) continue;

    addCandidate(
      candidates,
      attributes.content,
      pageUrl,
      "meta",
      companyName,
      websiteUrl,
    );
  }

  for (const match of html.matchAll(urlPattern)) {
    addCandidate(candidates, match[1], pageUrl, "href", companyName, websiteUrl);
  }

  return candidates;
}

function getTagAttributes(tag: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

  for (const match of tag.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }

  return attributes;
}

function addCandidate(
  candidates: Candidate[],
  rawHandle: string | undefined,
  sourceUrl: string,
  kind: Candidate["kind"],
  companyName: string,
  websiteUrl: string,
) {
  const handle = normalizeHandle(rawHandle);
  if (!handle || ignoredHandles.has(handle.toLowerCase())) return;

  candidates.push({
    handle,
    sourceUrl,
    kind,
    score: scoreCandidate(handle, companyName, websiteUrl, kind),
  });
}

function scoreCandidate(
  handle: string,
  companyName: string,
  websiteUrl: string,
  kind: Candidate["kind"],
) {
  const normalizedHandle = normalizeComparable(handle);
  const normalizedName = normalizeComparable(companyName);
  const hostLabels = getHostLabels(websiteUrl).map(normalizeComparable);
  const nameTokens = normalizedName
    .split(/\s+/)
    .filter((token) => token.length >= 3);
  const compactName = normalizedName.replace(/\s+/g, "");
  let score = kind === "href" ? 5 : 4;

  if (compactName && normalizedHandle.includes(compactName)) score += 4;
  if (
    compactName &&
    compactName.includes(normalizedHandle) &&
    normalizedHandle.length >= 4
  ) {
    score += 3;
  }
  if (
    nameTokens.some(
      (token) => normalizedHandle.includes(token) || token.includes(normalizedHandle),
    )
  ) {
    score += 2;
  }
  if (
    hostLabels.some(
      (label) =>
        label.length >= 3 &&
        (normalizedHandle.includes(label) || label.includes(normalizedHandle)),
    )
  ) {
    score += 4;
  }

  return score;
}

function dedupeCandidates(candidates: Candidate[]) {
  const byHandle = new Map<string, Candidate>();

  for (const candidate of candidates) {
    const key = candidate.handle.toLowerCase();
    const existing = byHandle.get(key);
    if (!existing || candidate.score > existing.score) {
      byHandle.set(key, candidate);
    }
  }

  return [...byHandle.values()];
}

function normalizeHandle(value: unknown) {
  if (typeof value !== "string") return "";

  const handle = value
    .replace(/^@+/, "")
    .trim()
    .split(/[/?#]/)[0]
    .replace(/[^A-Za-z0-9_]/g, "");

  return handle.length <= 15 ? handle : "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeComparable(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(ai|inc|hq|health|labs|bio|app|technologies|technology|systems|formerly|captions)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeWebsiteUrl(value: string) {
  const clean = value.trim();
  if (!clean) return "";

  try {
    return new URL(clean.startsWith("http") ? clean : `https://${clean}`).toString();
  } catch {
    return "";
  }
}

function getHostLabels(value: string) {
  try {
    const labels = new URL(value).hostname
      .replace(/^www\./i, "")
      .split(".")
      .filter(Boolean);
    const primary = labels.length > 1 ? labels[labels.length - 2] : labels[0];

    return [primary ?? "", labels[0] ?? ""].filter(Boolean);
  } catch {
    return [];
  }
}

function readNumericEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
