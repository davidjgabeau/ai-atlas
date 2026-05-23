const curatedCompanyXHandlesBySlug: Record<string, string> = {
  "general-intelligence-company": "intelligenceco",
  "output-biosciences": "OutputBio",
  "proxima-bio": "proximabio",
  ghosteye: "GhostEyeAI",
  glif: "heyglif",
  qualitate: "qualitateio",
  status: "thestatusai",
  teleskope: "TeleskopeAI",
};

const blockedCompanyXHandlesBySlug = new Set([
  "orion-security",
]);

const invalidCompanyXHandlesBySlug: Record<string, string[]> = {
  auctor: ["auctor_ai"],
  rebar: ["rebar_ai"],
  series: ["series"],
};

export function getCompanyXHandle({
  slug,
  currentHandle,
}: {
  slug: string;
  currentHandle?: string | null;
}) {
  const normalizedSlug = slug.trim().toLowerCase();
  if (blockedCompanyXHandlesBySlug.has(normalizedSlug)) return "";

  const normalizedCurrentHandle = normalizeCompanyXHandle(currentHandle);
  if (
    normalizedCurrentHandle &&
    isBlockedCompanyXHandleCandidate({
      slug: normalizedSlug,
      handle: normalizedCurrentHandle,
    })
  ) {
    return "";
  }

  return (
    normalizeCompanyXHandle(curatedCompanyXHandlesBySlug[normalizedSlug]) ||
    normalizedCurrentHandle
  );
}

export function isBlockedCompanyXHandleCandidate({
  slug,
  handle,
}: {
  slug: string;
  handle: string;
}) {
  const normalizedSlug = slug.trim().toLowerCase();
  const normalizedHandle = normalizeCompanyXHandle(handle).toLowerCase();

  if (!normalizedHandle) return true;
  if (blockedCompanyXHandlesBySlug.has(normalizedSlug)) return true;

  return (
    invalidCompanyXHandlesBySlug[normalizedSlug]?.some(
      (candidate) =>
        normalizeCompanyXHandle(candidate).toLowerCase() === normalizedHandle,
    ) ?? false
  );
}

export function normalizeCompanyXHandle(value: unknown) {
  if (typeof value !== "string") return "";

  const handle = value
    .replace(/^@+/, "")
    .trim()
    .split(/[/?#]/)[0]
    .replace(/[^A-Za-z0-9_]/g, "");

  return handle.length <= 15 ? handle : "";
}
