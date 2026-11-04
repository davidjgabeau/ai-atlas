import type { CompanyJob } from "@/types/market";

const exactGenericTitles = new Set([
  "account",
  "talent",
  "analyst",
  "developer",
  "engineer",
  "intern",
  "manager",
  "marketing",
  "platform",
  "partnerships",
  "firm partnerships",
  "founder directory",
  "find a co-founder",
  "immigration manager portal",
  "product",
  "scientist",
  "solution",
  "solutions",
]);

export function cleanJobTitleForDisplay(value: string) {
  let title = normalizeText(value)
    .replace(/\s*[-|]\s*(apply|view job|view role|learn more)$/i, "")
    .replace(/\s+view\s*&\s*apply$/i, "")
    .replace(/\s+jobs?\s+[\d,]+\s+open jobs?$/i, "")
    .replace(/\s+open jobs?$/i, "")
    .replace(/\s+jobs?$/i, "")
    .trim();

  for (let index = 0; index < 2; index += 1) {
    title = title
      .replace(
        /\s+(commercial|engineering|finance|gtm|legal|marketing|operations|people|product|sales|talent)\s+(us|usa|united states)?\s*(\((remote|new york|nyc|usa|us|united states)\))?$/i,
        "",
      )
      .replace(/\s+\((new york|nyc|remote|usa|us|united states)\)$/i, "")
      .trim();
  }

  title = cleanDuplicatedTitleParts(title);

  return title || "Open role";
}

export function getJobDepartmentLabel(
  job: Pick<CompanyJob, "department" | "source_url" | "title">,
) {
  return inferJobDepartment(job.department, job.title, job.source_url);
}

export function inferJobDepartment(
  department: string,
  title: string,
  sourceUrl = "",
) {
  const explicit = normalizeDepartmentLabel(department);
  if (explicit) return explicit;

  const value = `${title} ${sourceUrl}`.toLowerCase();
  if (/finance|accounting|legal|people|recruit|talent|operations|chief of staff|bizops/.test(value)) {
    return "Operations";
  }
  if (/account|business development|commercial|customer|gtm|partnership|sales|solutions|success/.test(value)) {
    return "GTM";
  }
  if (/brand|content|growth|marketing/.test(value)) return "Marketing";
  if (/designer|design|product manager|product lead|head of product|ux/.test(value)) {
    return "Product";
  }
  if (/research|scientist/.test(value)) return "Research";
  if (/ai|data|developer|devops|engineer|infra|machine learning|ml|platform|security|software/.test(value)) {
    return "Engineering";
  }

  return "Other";
}

export function getJobListedAt(
  job: Pick<CompanyJob, "posted_at" | "discovered_at" | "last_seen_at">,
) {
  return job.posted_at ?? job.discovered_at ?? job.last_seen_at;
}

export function isNavigableCompanyJob(
  job: Pick<CompanyJob, "title" | "source_url">,
) {
  const title = cleanJobTitleForDisplay(job.title);

  if (isGenericJobDirectoryUrl(job.source_url)) return false;
  if (isNonJobContentUrl(job.source_url)) return false;
  if (!looksLikeSpecificRoleTitle(title)) return false;

  return true;
}

export function isGenericJobDirectoryUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "");

    return (
      hostname === "linkedin.com" &&
      /^\/jobs\/[^/?#]+-jobs\/?$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function isNonJobContentUrl(value: string) {
  try {
    const url = new URL(value);
    const path = url.pathname.toLowerCase();
    if (/^\/(talent|account|login|sign-in|sign-up|talent-pool)\/?$/i.test(path)) return true;

    return /\/(articles?|blogs?|blog-posts?|case-stud(?:y|ies)|changelog|customers?|customer-stories?|e-?books?|enterprise-platform|events?|guides?|news|newsroom|platform|press|pricing|privacy|resources?|solutions?|stories|terms|use-cases?|webinars?)(\/|$)/i.test(
      path,
    );
  } catch {
    return false;
  }
}

export function looksLikeSpecificRoleTitle(value: string) {
  const title = cleanJobTitleForDisplay(value);
  const normalizedTitle = title.toLowerCase();

  if (!title || title.length < 4 || title.length > 90) return false;
  if (exactGenericTitles.has(normalizedTitle)) return false;
  if (
    /^(careers?|jobs?|open roles?|view jobs?|see openings?|apply|learn more|read more|join us|work with us|home|about|contact|login|sign in)$/i.test(
      title,
    )
  ) {
    return false;
  }
  if (/\b(changelog|newsletter|pricing|privacy|terms)\b/i.test(title)) {
    return false;
  }
  if (looksLikeEditorialTitle(title)) return false;

  return /\b(account|analyst|architect|chief of staff|designer|developer|director|engineer|founder|growth|head of|lead|manager|operations|partnerships|principal|product manager|recruiter|researcher|scientist|software|specialist|talent)\b/i.test(
    title,
  );
}

export function looksLikeEditorialTitle(value: string) {
  const title = cleanJobTitleForDisplay(value);

  if (
    /^(announcing|case study|ebook|guide|how|introducing|playbook|report|webinar|what|when|where|why)\b/i.test(
      title,
    )
  ) {
    return true;
  }

  return /\b(article|blog|case study|customer story|ebook|guide|newsletter|playbook|webinar|whitepaper)\b/i.test(
    title,
  );
}

function normalizeDepartmentLabel(value: string) {
  const department = normalizeText(value).toLowerCase();
  if (!department) return "";
  if (/engineer|engineering|infra|platform|software|data|ml|ai|security/.test(department)) {
    return "Engineering";
  }
  if (/product|design|ux/.test(department)) return "Product";
  if (/commercial|customer|gtm|partnership|sales|solutions|success/.test(department)) {
    return "GTM";
  }
  if (/marketing|brand|content|growth/.test(department)) return "Marketing";
  if (/finance|legal|operations|people|recruit|talent/.test(department)) {
    return "Operations";
  }
  if (/research|science/.test(department)) return "Research";

  return normalizeText(value);
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanDuplicatedTitleParts(value: string) {
  let title = value;

  for (let index = 0; index < 4; index += 1) {
    const nextTitle = stripTrailingJobMeta(collapseRepeatedLeadingPhrase(title));
    if (nextTitle === title) return title;
    title = nextTitle;
  }

  return title;
}

function collapseRepeatedLeadingPhrase(value: string) {
  const tokens = value.split(/\s+/).filter(Boolean);

  for (let size = Math.floor(tokens.length / 2); size >= 1; size -= 1) {
    const first = tokens.slice(0, size);
    const second = tokens.slice(size, size * 2);
    if (!sameTokenSequence(first, second)) continue;

    return [...first, ...tokens.slice(size * 2)].join(" ").trim();
  }

  return value;
}

function sameTokenSequence(left: string[], right: string[]) {
  if (left.length === 0 || left.length !== right.length) return false;

  return left.every(
    (token, index) => normalizeTitleToken(token) === normalizeTitleToken(right[index]),
  );
}

function normalizeTitleToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function stripTrailingJobMeta(value: string) {
  let title = value;

  for (let index = 0; index < 4; index += 1) {
    const nextTitle = title
      .replace(
        /\s*(?:(?:-|\u2013|\u2014|[|,/])\s*)?\(?(?:brooklyn,\s*ny|hybrid|manhattan,\s*ny|new york,\s*ny|new york|nyc|on-?site|remote|san francisco,\s*ca|united states|usa|us)\)?$/i,
        "",
      )
      .replace(/\s*(?:(?:-|\u2013|\u2014|[|,/])\s*)?(?:contract|full[-\s]?time|part[-\s]?time)$/i, "")
      .trim();

    if (nextTitle === title) return title;
    title = nextTitle;
  }

  return title;
}
