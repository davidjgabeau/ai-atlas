import type { CompanyJob } from "@/types/market";

const exactGenericTitles = new Set([
  "analyst",
  "developer",
  "engineer",
  "intern",
  "manager",
  "marketing",
  "product",
  "scientist",
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
  if (/\b(changelog|newsletter|platform|pricing|privacy|solutions?|terms)\b/i.test(title)) {
    return false;
  }

  return /\b(account|analyst|architect|chief of staff|designer|developer|director|engineer|founder|growth|head of|lead|manager|operations|partnerships|principal|product manager|recruiter|researcher|scientist|software|specialist|staff|success|talent)\b/i.test(
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
