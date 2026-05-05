import { getSocialAutomationConfig } from "@/lib/social-automation/config";
import { upsertSocialTarget } from "@/lib/social-automation/store";
import { verifyHandle } from "@/lib/social-automation/x-client";

type DiscoveryCandidate = {
  handle: string;
  evidence: Array<{
    pageUrl: string;
    kind: "href" | "meta" | "structured" | "url";
    snippet: string;
  }>;
};

export type CompanyXHandleDiscovery = {
  status: "found" | "not_found" | "ambiguous" | "skipped" | "failed";
  reason: string;
  handle?: string;
  userId?: string;
  sourceUrl?: string;
  verifiedAt?: string;
};

type CompanyPayloadWithX = {
  id?: string;
  name?: string | null;
  website_url?: string | null;
  x_handle?: string | null;
  x_user_id?: string | null;
};

const maxPagesToInspect = 8;
const socialPagePathPattern =
  /(about|company|contact|team|press|news|blog|careers|jobs|legal|security)/i;

const ignoredHandles = new Set([
  "atomhq",
  "content",
  "download",
  "hashtag",
  "home",
  "i",
  "intent",
  "jobs",
  "messages",
  "notifications",
  "privacy",
  "search",
  "settings",
  "share",
  "squarespace",
  "squadhelp",
  "tos",
  "twitter",
  "twitterapi",
  "twitterdev",
  "webflow",
  "x",
]);

const domainMarketplaceHosts = [
  "afternic.com",
  "atom.com",
  "dan.com",
  "godaddy.com",
  "hugedomains.com",
  "sedo.com",
  "squadhelp.com",
];

export async function discoverCompanyXHandle({
  companyName,
  websiteUrl,
  existingHandle,
}: {
  companyName: string;
  websiteUrl: string;
  existingHandle?: string;
}): Promise<CompanyXHandleDiscovery> {
  if (normalizeHandle(existingHandle)) {
    return {
      status: "skipped",
      reason: "Company already has an X handle.",
    };
  }

  const normalizedWebsiteUrl = normalizeWebsiteUrl(websiteUrl);
  if (!companyName.trim() || !normalizedWebsiteUrl) {
    return {
      status: "skipped",
      reason: "Company name or website is missing.",
    };
  }

  const config = getSocialAutomationConfig();
  if (config.killSwitch) {
    return {
      status: "skipped",
      reason: "SOCIAL_KILL_SWITCH is enabled.",
    };
  }
  if (!config.xBearerToken && !config.xAccessToken) {
    return {
      status: "skipped",
      reason: "X_BEARER_TOKEN or X_ACCESS_TOKEN is required for handle verification.",
    };
  }

  const inspected = await inspectWebsiteForXHandles({
    companyName,
    websiteUrl: normalizedWebsiteUrl,
  });

  if (inspected.status !== "found" || !inspected.candidate) {
    return {
      status: inspected.status,
      reason: inspected.reason,
    };
  }

  const verification = await verifyHandle({
    handle: inspected.candidate.handle,
    config,
  });

  if (!verification.ok || !verification.user) {
    return {
      status: "failed",
      handle: inspected.candidate.handle,
      sourceUrl: inspected.candidate.evidence[0]?.pageUrl,
      reason: verification.reason ?? `Unable to verify @${inspected.candidate.handle}.`,
    };
  }

  return {
    status: "found",
    handle: verification.handle ?? inspected.candidate.handle,
    userId: verification.user.id,
    sourceUrl: inspected.candidate.evidence[0]?.pageUrl,
    verifiedAt: new Date().toISOString(),
    reason: `Found and verified @${verification.handle ?? inspected.candidate.handle}.`,
  };
}

export async function enrichCompanyPayloadWithDiscoveredXHandle<
  T extends CompanyPayloadWithX,
>(payload: T): Promise<{
  payload: T;
  discovery: CompanyXHandleDiscovery;
}> {
  const discovery = await discoverCompanyXHandle({
    companyName: String(payload.name ?? ""),
    websiteUrl: String(payload.website_url ?? ""),
    existingHandle: String(payload.x_handle ?? ""),
  });

  if (discovery.status !== "found" || !discovery.handle) {
    return { payload, discovery };
  }

  return {
    payload: {
      ...payload,
      x_handle: discovery.handle,
      x_user_id: discovery.userId ?? "",
    },
    discovery,
  };
}

export async function saveDiscoveredXHandleTarget({
  companyId,
  discovery,
}: {
  companyId: string;
  discovery: CompanyXHandleDiscovery;
}) {
  if (discovery.status !== "found" || !discovery.handle) return;

  await upsertSocialTarget({
    companyId,
    handle: discovery.handle,
    confidence: "verified",
    sourceUrl: discovery.sourceUrl ?? "",
    lastVerifiedAt: discovery.verifiedAt ?? new Date().toISOString(),
  });
}

async function inspectWebsiteForXHandles({
  companyName,
  websiteUrl,
}: {
  companyName: string;
  websiteUrl: string;
}): Promise<
  | {
      status: "found";
      reason: string;
      candidate: DiscoveryCandidate;
    }
  | {
      status: "not_found" | "ambiguous" | "failed";
      reason: string;
      candidate?: undefined;
    }
> {
  const candidates = new Map<string, DiscoveryCandidate>();
  const queuedUrls = [websiteUrl];
  const inspectedUrls = new Set<string>();
  let officialHost = getHost(websiteUrl);

  while (queuedUrls.length > 0 && inspectedUrls.size < maxPagesToInspect) {
    const nextUrl = queuedUrls.shift();
    if (!nextUrl || inspectedUrls.has(nextUrl)) continue;

    inspectedUrls.add(nextUrl);
    const response = await fetchWebsiteText(nextUrl);
    if (!response.ok || !response.text) continue;

    if (isDomainMarketplaceHost(response.finalUrl)) {
      continue;
    }

    const finalHost = getHost(response.finalUrl);
    if (inspectedUrls.size === 1 && finalHost) officialHost = finalHost;

    mergeCandidates(
      candidates,
      extractCandidatesFromHtml(response.text, response.finalUrl),
    );

    if (candidates.size > 0) continue;

    const internalLinks = extractInternalLinks(
      response.text,
      response.finalUrl,
      officialHost,
    )
      .filter((url) => !inspectedUrls.has(url))
      .slice(0, maxPagesToInspect - inspectedUrls.size);

    queuedUrls.push(...internalLinks);
  }

  const rankedCandidates = [...candidates.values()]
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, companyName, websiteUrl),
    }))
    .filter(({ candidate, score }) => score >= 5 && hasIdentityMatch(candidate, companyName, websiteUrl))
    .sort((a, b) => b.score - a.score);

  if (rankedCandidates.length === 0) {
    return {
      status: "not_found",
      reason: "No official X handle found on the company website.",
    };
  }

  const [best, second] = rankedCandidates;
  if (second && best.score - second.score < 2) {
    return {
      status: "ambiguous",
      reason: `Multiple plausible X handles found: ${rankedCandidates
        .slice(0, 3)
        .map(({ candidate }) => `@${candidate.handle}`)
        .join(", ")}.`,
    };
  }

  return {
    status: "found",
    reason: `Found @${best.candidate.handle} on the company website.`,
    candidate: best.candidate,
  };
}

function mergeCandidates(
  target: Map<string, DiscoveryCandidate>,
  candidates: DiscoveryCandidate[],
) {
  for (const candidate of candidates) {
    const normalizedHandle = normalizeHandle(candidate.handle);
    if (!normalizedHandle || ignoredHandles.has(normalizedHandle.toLowerCase())) {
      continue;
    }

    const existing = target.get(normalizedHandle.toLowerCase());
    if (existing) {
      existing.evidence.push(...candidate.evidence);
    } else {
      target.set(normalizedHandle.toLowerCase(), {
        handle: normalizedHandle,
        evidence: candidate.evidence,
      });
    }
  }
}

function extractCandidatesFromHtml(html: string, pageUrl: string) {
  const candidates = new Map<string, DiscoveryCandidate>();
  const decodedHtml = decodeHtml(html);

  addMetaCandidates(candidates, decodedHtml, pageUrl);
  addUrlCandidates(candidates, decodedHtml, pageUrl);

  return [...candidates.values()];
}

function addMetaCandidates(
  candidates: Map<string, DiscoveryCandidate>,
  html: string,
  pageUrl: string,
) {
  const metaPattern =
    /<meta[^>]+(?:name|property)=["']twitter:(?:site|creator)["'][^>]+content=["']@?([A-Za-z0-9_]{1,15})["'][^>]*>/gi;

  for (const match of html.matchAll(metaPattern)) {
    addCandidate(candidates, match[1], {
      pageUrl,
      kind: "meta",
      snippet: match[0],
    });
  }
}

function addUrlCandidates(
  candidates: Map<string, DiscoveryCandidate>,
  html: string,
  pageUrl: string,
) {
  const socialUrlPattern =
    /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})(?=[/?#"'<>\\\s]|$)/gi;

  for (const match of html.matchAll(socialUrlPattern)) {
    const snippet = html.slice(
      Math.max(0, match.index - 120),
      Math.min(html.length, match.index + match[0].length + 120),
    );

    addCandidate(candidates, match[1], {
      pageUrl,
      kind: classifyUrlEvidence(snippet),
      snippet,
    });
  }
}

function addCandidate(
  candidates: Map<string, DiscoveryCandidate>,
  rawHandle: string | undefined,
  evidence: DiscoveryCandidate["evidence"][number],
) {
  const handle = normalizeHandle(rawHandle);
  if (!handle || ignoredHandles.has(handle.toLowerCase())) return;

  const key = handle.toLowerCase();
  const existing = candidates.get(key);
  if (existing) {
    existing.evidence.push(evidence);
  } else {
    candidates.set(key, {
      handle,
      evidence: [evidence],
    });
  }
}

function classifyUrlEvidence(
  snippet: string,
): DiscoveryCandidate["evidence"][number]["kind"] {
  const lower = snippet.toLowerCase();
  if (/\bhref\s*=/.test(lower)) return "href";
  if (lower.includes("sameas")) return "structured";
  if (lower.includes("twitter:site") || lower.includes("twitter:creator")) {
    return "meta";
  }

  return "url";
}

function scoreCandidate(
  candidate: DiscoveryCandidate,
  companyName: string,
  websiteUrl: string,
) {
  const evidenceScore = candidate.evidence.reduce((score, evidence) => {
    if (evidence.kind === "href") return score + 4;
    if (evidence.kind === "meta") return score + 3;
    if (evidence.kind === "structured") return score + 2;
    return score + 1;
  }, 0);

  return evidenceScore + getIdentityScore(candidate.handle, companyName, websiteUrl);
}

function hasIdentityMatch(
  candidate: DiscoveryCandidate,
  companyName: string,
  websiteUrl: string,
) {
  return getIdentityScore(candidate.handle, companyName, websiteUrl) > 0;
}

function getIdentityScore(
  handle: string,
  companyName: string,
  websiteUrl: string,
) {
  const normalizedHandle = normalizeComparable(handle);
  const normalizedName = normalizeComparable(companyName);
  const hostLabels = getHostLabels(websiteUrl).map(normalizeComparable);

  if (!normalizedHandle) return 0;

  const nameTokens = normalizedName
    .split(/\s+/)
    .map(normalizeComparable)
    .filter((token) => token.length >= 3);
  const compactName = normalizeComparable(companyName).replace(/\s+/g, "");

  let score = 0;
  if (compactName && normalizedHandle.includes(compactName)) score += 3;
  if (
    compactName &&
    compactName.includes(normalizedHandle) &&
    normalizedHandle.length >= 4
  ) {
    score += 2;
  }
  if (nameTokens.some((token) => normalizedHandle.includes(token))) score += 2;
  if (
    hostLabels.some(
      (label) =>
        label.length >= 3 &&
        (normalizedHandle.includes(label) || label.includes(normalizedHandle)),
    )
  ) {
    score += 3;
  }

  return score;
}

function extractInternalLinks(
  html: string,
  pageUrl: string,
  officialHost: string,
) {
  const links = new Set<string>();
  const linkPattern = /<a\s+[^>]*href=["']([^"']+)["']/gi;

  for (const match of html.matchAll(linkPattern)) {
    const href = match[1];
    if (!href) continue;

    try {
      const url = new URL(href, pageUrl);
      if (!["http:", "https:"].includes(url.protocol)) continue;
      if (stripWww(url.hostname) !== stripWww(officialHost)) continue;
      if (!socialPagePathPattern.test(url.pathname)) continue;

      url.hash = "";
      links.add(url.toString());
    } catch {
      continue;
    }
  }

  return [...links];
}

async function fetchWebsiteText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "AI Atlas social handle discovery",
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return {
        ok: false,
        finalUrl: response.url,
        text: "",
      };
    }

    return {
      ok: response.ok,
      finalUrl: response.url,
      text: await response.text(),
    };
  } catch {
    return {
      ok: false,
      finalUrl: url,
      text: "",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isDomainMarketplaceHost(value: string) {
  const host = stripWww(getHost(value));

  return domainMarketplaceHosts.some(
    (marketplaceHost) =>
      host === marketplaceHost || host.endsWith(`.${marketplaceHost}`),
  );
}

function normalizeWebsiteUrl(value: string) {
  const clean = value.trim();
  if (!clean) return "";

  try {
    return new URL(
      clean.startsWith("http") ? clean : `https://${clean}`,
    ).toString();
  } catch {
    return "";
  }
}

function getHost(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function getHostLabels(value: string) {
  const host = stripWww(getHost(value));
  const labels = host.split(".").filter(Boolean);
  const primary = labels.length > 1 ? labels[labels.length - 2] : labels[0];

  return [primary ?? "", labels[0] ?? ""].filter(Boolean);
}

function stripWww(value: string) {
  return value.replace(/^www\./i, "").toLowerCase();
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

function normalizeComparable(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(ai|inc|hq|health|labs|bio|app|technologies|technology|systems)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/g, "/")
    .replace(/\\u002F/g, "/");
}
