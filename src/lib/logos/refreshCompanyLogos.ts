import {
  createSupabasePrivilegedClient,
  hasSupabasePrivilegedCredentials,
} from "@/lib/supabase/privileged";

type CompanyLogoRow = {
  id: string;
  name: string;
  slug: string;
  website_url: string;
  logo_url: string;
};

type RefreshCompanyLogosOptions = {
  force?: boolean;
  limit?: number;
};

export type RefreshCompanyLogosResult = {
  ok: boolean;
  companiesChecked: number;
  logosUpdated: number;
  skipped: number;
  errors: Array<{ company: string; error: string }>;
};

export async function refreshCompanyLogos({
  force = false,
  limit = 120,
}: RefreshCompanyLogosOptions = {}): Promise<RefreshCompanyLogosResult> {
  const supabase = createSupabasePrivilegedClient();

  if (!supabase || !hasSupabasePrivilegedCredentials()) {
    return {
      ok: false,
      companiesChecked: 0,
      logosUpdated: 0,
      skipped: 0,
      errors: [
        {
          company: "Supabase",
          error:
            "A Supabase service key or agent write secret is required to persist logos.",
        },
      ],
    };
  }

  const { data, error } = await supabase
    .from("companies")
    .select("id,name,slug,website_url,logo_url")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return {
      ok: false,
      companiesChecked: 0,
      logosUpdated: 0,
      skipped: 0,
      errors: [
        {
          company: "Supabase",
          error: error?.message ?? "Unable to load companies.",
        },
      ],
    };
  }

  let logosUpdated = 0;
  let skipped = 0;
  const errors: RefreshCompanyLogosResult["errors"] = [];

  for (const company of data as CompanyLogoRow[]) {
    if (!company.website_url) {
      skipped += 1;
      continue;
    }

    if (!force && company.logo_url && !isStaleLocalLogo(company.logo_url)) {
      skipped += 1;
      continue;
    }

    try {
      const logoUrl = await resolveLogoUrl(company.website_url);
      if (!logoUrl || logoUrl === company.logo_url) {
        skipped += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_url: logoUrl })
        .eq("id", company.id);

      if (updateError) throw new Error(updateError.message);

      logosUpdated += 1;
    } catch (logoError) {
      errors.push({
        company: company.name,
        error:
          logoError instanceof Error ? logoError.message : "Unknown logo error.",
      });
    }
  }

  return {
    ok: errors.length === 0,
    companiesChecked: data.length,
    logosUpdated,
    skipped,
    errors,
  };
}

export async function resolveLogoUrl(websiteUrl: string) {
  const homepageUrl = normalizeUrl(websiteUrl);
  if (!homepageUrl) return "";

  const homepage = await fetchText(homepageUrl);
  const candidates = homepage
    ? extractIconCandidates(homepage.text, homepage.finalUrl)
    : [];

  candidates.push(new URL("/favicon.ico", homepage?.finalUrl ?? homepageUrl).toString());
  candidates.push(getFaviconFallback(homepage?.finalUrl ?? homepageUrl));

  for (const candidate of uniqueStrings(candidates)) {
    if (await isImageUrl(candidate)) return candidate;
  }

  return "";
}

function extractIconCandidates(html: string, baseUrl: string) {
  const candidates: Array<{ url: string; score: number }> = [];

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = getAttribute(tag, "rel").toLowerCase();
    const href = getAttribute(tag, "href");
    if (!href || !rel) continue;

    if (!rel.includes("icon")) continue;

    candidates.push({
      url: toAbsoluteUrl(href, baseUrl),
      score: getIconScore(rel, getAttribute(tag, "sizes")),
    });
  }

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const property = getAttribute(tag, "property").toLowerCase();
    const name = getAttribute(tag, "name").toLowerCase();
    const content = getAttribute(tag, "content");

    if (!content) continue;
    if (property === "og:image" || name === "twitter:image") {
      candidates.push({ url: toAbsoluteUrl(content, baseUrl), score: 20 });
    }
  }

  return candidates
    .filter((candidate) => Boolean(candidate.url))
    .sort((a, b) => b.score - a.score)
    .map((candidate) => candidate.url);
}

function getIconScore(rel: string, sizes: string) {
  let score = 40;
  if (rel.includes("apple-touch-icon")) score += 40;
  if (rel.includes("shortcut")) score += 20;
  if (rel.includes("mask-icon")) score -= 10;

  const sizeMatch = sizes.match(/(\d+)x(\d+)/);
  if (sizeMatch) score += Math.min(Number(sizeMatch[1]), 256) / 8;

  return score;
}

function getAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

async function fetchText(url: string) {
  const response = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": "AI Atlas NYC logo refresh (+https://aiatlas.nyc)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) return null;

  const text = await response.text();
  return {
    text,
    finalUrl: response.url || url,
  };
}

async function isImageUrl(url: string) {
  if (!url) return false;

  try {
    const response = await fetchWithTimeout(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "AI Atlas NYC logo refresh (+https://aiatlas.nyc)",
        Accept: "image/*,*/*;q=0.8",
      },
    });

    if (response.ok && isImageResponse(response, url)) return true;
  } catch {
    // Some sites block HEAD; retry below with GET.
  }

  try {
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        "User-Agent": "AI Atlas NYC logo refresh (+https://aiatlas.nyc)",
        Accept: "image/*,*/*;q=0.8",
        Range: "bytes=0-512",
      },
    });

    return response.ok && isImageResponse(response, url);
  } catch {
    return false;
  }
}

function isImageResponse(response: Response, url: string) {
  const contentType = response.headers.get("content-type") ?? "";

  return (
    contentType.startsWith("image/") ||
    /\.(avif|gif|ico|jpeg|jpg|png|svg|webp)(\?|$)/i.test(url)
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000,
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

function getFaviconFallback(value: string) {
  const url = normalizeUrl(value);
  if (!url) return "";

  const domain = new URL(url).hostname.replace(/^www\./, "");
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain,
  )}&sz=128`;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isStaleLocalLogo(value: string) {
  return value.startsWith("/logos/");
}
