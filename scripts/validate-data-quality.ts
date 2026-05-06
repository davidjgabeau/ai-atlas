import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { categoryMeta, companies as appCompanies } from "../src/data/market";
import { patterns } from "../src/data/patterns";
import { categories, type Company, type Founder } from "../src/types/market";
import type { AgentCompany, EditorialSurface } from "../src/types/agent";

type Issue = {
  level: "error" | "warning";
  message: string;
};

type CompanyEditorialFile = {
  companies?: Record<
    string,
    {
      hook?: string;
      signalReason?: string;
    }
  >;
};

const issues: Issue[] = [];
const repoRoot = process.cwd();
const categorySet = new Set<string>(categories);
const forbiddenCopyPhrases = [
  "added to ai atlas",
  "cron",
  "cutting-edge",
  "disrupting",
  "fallback",
  "gains density",
  "heat index",
  "heating up",
  "high model usage potential",
  "joined the map",
  "leverage",
  "leveraging",
  "pipeline",
  "placeholder",
  "revolutionize",
  "revolutionizing",
  "signals from x point to y",
  "unlock",
  "workflow depth",
] as const;

function main() {
  const discoveryCompanies = readJson<AgentCompany[]>("data/companies.json");
  const editorialSurfaces = readJson<EditorialSurface[]>(
    "data/editorial-surfaces.json",
  );
  const companyEditorial = readJson<CompanyEditorialFile>(
    "src/data/company-editorial.json",
  );

  validateCategorySource();
  validateCompanies("app companies", appCompanies);
  validateDiscoveryCompanies(discoveryCompanies);
  validateCompanyEditorial(companyEditorial);
  validateEditorialSurfaces(editorialSurfaces);
  validatePatterns();
  validateNoHardcodedHomepageCount();

  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");

  for (const issue of issues) {
    const prefix = issue.level === "error" ? "ERROR" : "WARN";
    console[issue.level === "error" ? "error" : "warn"](
      `${prefix}: ${issue.message}`,
    );
  }

  if (errors.length > 0) {
    console.error(
      `Data quality validation failed with ${errors.length} error(s) and ${warnings.length} warning(s).`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Data quality validation passed with ${warnings.length} warning(s).`,
  );
}

function validateCompanyEditorial(file: CompanyEditorialFile) {
  for (const [companyId, editorial] of Object.entries(file.companies ?? {})) {
    scanCopy(`company editorial ${companyId} hook`, editorial.hook, {
      rejectLeadingAiPowered: true,
    });
    scanCopy(
      `company editorial ${companyId} signal reason`,
      editorial.signalReason,
      { rejectLeadingAiPowered: true },
    );
  }
}

function validateCategorySource() {
  const metaNames = categoryMeta.map((category) => category.name);
  const metaSlugs = categoryMeta.map((category) => category.slug);

  validateUnique("category names", metaNames, (name) => name.toLowerCase());
  validateUnique("category slugs", metaSlugs, (slug) => slug.toLowerCase());

  for (const category of categories) {
    if (!metaNames.includes(category)) {
      addError(`Category source is missing metadata for "${category}".`);
    }
  }

  for (const meta of categoryMeta) {
    if (!categorySet.has(meta.name)) {
      addError(`Category metadata contains invalid category "${meta.name}".`);
    }
    scanCopy(`category ${meta.name} description`, meta.description, {
      rejectLeadingAiPowered: true,
    });
    scanCopy(`category ${meta.name} thesis`, meta.thesis, {
      rejectLeadingAiPowered: true,
    });
  }
}

function validateCompanies(label: string, companies: Company[]) {
  validateUnique(
    `${label} names`,
    companies.map((company) => company.name),
    normalizeName,
  );
  validateUnique(
    `${label} slugs`,
    companies.map((company) => company.slug),
    (slug) => slug.toLowerCase(),
  );

  for (const company of companies) {
    const prefix = `${label}: ${company.name || company.id}`;
    requireText(company.name, `${prefix} is missing name.`);
    requireText(company.slug, `${prefix} is missing slug.`);
    requireText(company.short_description, `${prefix} is missing description.`);
    requireText(company.generated?.hook, `${prefix} is missing hook.`);
    validateCategory(company.category, `${prefix} uses invalid category`);
    validateUrl(company.website_url, `${prefix} has malformed website URL`);
    validateFounders(company.founders, prefix);
    scanCopy(`${prefix} description`, company.short_description, {
      rejectLeadingAiPowered: true,
    });
    scanCopy(`${prefix} thesis`, company.one_line_thesis, {
      rejectLeadingAiPowered: true,
    });
    scanCopy(`${prefix} why it matters`, company.why_it_matters, {
      rejectLeadingAiPowered: true,
    });
    scanCopy(`${prefix} hook`, company.generated?.hook);
    scanCopy(`${prefix} signal reason`, company.generated?.signalReason);
    scanCopy(`${prefix} inclusion reason`, company.inclusionReason?.body);
  }

  warnEmptySourceCategories(
    companies.map((company) => company.category),
    `${label}`,
  );
}

function validateDiscoveryCompanies(companies: AgentCompany[]) {
  validateUnique(
    "discovery company names",
    companies.map((company) => company.name),
    normalizeName,
  );
  validateUnique(
    "discovery company slugs",
    companies.map((company) => company.slug),
    (slug) => slug.toLowerCase(),
  );

  for (const company of companies) {
    const prefix = `discovery data: ${company.name || company.id}`;
    requireText(company.name, `${prefix} is missing name.`);
    requireText(company.slug, `${prefix} is missing slug.`);
    requireText(company.description, `${prefix} is missing description.`);
    validateCategory(company.category, `${prefix} uses invalid category`);
    if (company.website) {
      validateUrl(company.website, `${prefix} has malformed website URL`);
    }
    validateAgentFounders(company.founders ?? [], prefix);
    scanCopy(`${prefix} description`, company.description, {
      rejectLeadingAiPowered: true,
    });
    scanCopy(`${prefix} one-sentence description`, company.oneSentenceDescription, {
      rejectLeadingAiPowered: true,
    });
    scanCopy(`${prefix} hook`, company.generated?.hook);
    scanCopy(`${prefix} signal reason`, company.generated?.signalReason);
    scanCopy(`${prefix} inclusion reason`, company.inclusionReason?.body);
  }

  warnEmptySourceCategories(
    companies.map((company) => company.category),
    "Discovery corpus",
  );
}

function validateEditorialSurfaces(surfaces: EditorialSurface[]) {
  const latestByName = new Map<string, EditorialSurface>();
  for (const surface of surfaces) {
    latestByName.set(surface.surface, surface);
    validateUnique(
      `${surface.surface} item ids`,
      surface.items.map((item) => item.id),
      (id) => id.toLowerCase(),
    );
    for (const item of surface.items) {
      const prefix = `${surface.surface}: ${item.title || item.id}`;
      requireText(item.title, `${prefix} is missing title.`);
      scanCopy(`${prefix} title`, item.title, {
        rejectLeadingAiPowered: true,
      });
      scanCopy(`${prefix} body`, item.body, {
        rejectLeadingAiPowered: true,
      });
      if (item.category) {
        validateCategory(item.category, `${prefix} uses invalid category`);
      }
      if (item.sourceUrl) {
        validateUrl(item.sourceUrl, `${prefix} has malformed source URL`);
      }
    }
  }

  const currentRead = latestByName.get("current_read");
  if (!currentRead) {
    addError("No current_read editorial surface found.");
  } else if (currentRead.items.length !== 3) {
    addError(
      `current_read must have exactly 3 notes, found ${currentRead.items.length}.`,
    );
  }

  const recent = latestByName.get("recently_added");
  for (const item of recent?.items ?? []) {
    if (!item.body?.startsWith("Added:")) {
      addError(`recently_added: "${item.title}" reason must start with "Added:".`);
    }
  }
}

function validatePatterns() {
  validateUnique(
    "pattern slugs",
    patterns.map((pattern) => pattern.slug),
    (slug) => slug.toLowerCase(),
  );

  for (const pattern of patterns) {
    scanCopy(`pattern ${pattern.slug} title`, pattern.title, {
      rejectLeadingAiPowered: true,
    });
    scanCopy(`pattern ${pattern.slug} framing`, pattern.framing, {
      rejectLeadingAiPowered: true,
    });
    validateCategoryishConsumptionProfile(
      pattern.related_consumption_profile ?? "",
    );
  }
}

function validateNoHardcodedHomepageCount() {
  const files = collectFiles(["src/app", "src/components/home"]);
  const countPattern = /\b(53|55|66)\s+(early-stage\s+)?AI\s+(companies|startups)\b/i;

  for (const file of files) {
    const contents = readFileSync(path.join(repoRoot, file), "utf8");
    if (countPattern.test(contents)) {
      addError(`${file} appears to hardcode a homepage company count.`);
    }
  }
}

function validateCategory(category: string, message: string) {
  if (!categorySet.has(category)) {
    addError(`${message}: "${category}".`);
  }
}

function warnEmptySourceCategories(categoryValues: string[], label: string) {
  const categoriesWithCompanies = new Set(categoryValues);
  const emptyCategories = categories.filter(
    (category) => !categoriesWithCompanies.has(category),
  );
  if (emptyCategories.length > 0) {
    addWarning(
      `${label} has no companies in source category/categories: ${emptyCategories.join(", ")}.`,
    );
  }
}

function validateCategoryishConsumptionProfile(value: string) {
  if (!value.trim()) {
    addError("Pattern is missing related consumption profile.");
  }
}

function validateFounders(founders: Founder[], prefix: string) {
  for (const founder of founders) {
    validateFounderName(founder.name, prefix);
  }
}

function validateAgentFounders(
  founders: Array<{ name?: string; role?: string }>,
  prefix: string,
) {
  for (const founder of founders) {
    validateFounderName(founder.name ?? "", prefix);
  }
}

function validateFounderName(name: string, prefix: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    addError(`${prefix} has an empty founder name.`);
    return;
  }

  if (/\b(team|founders?)\b/i.test(trimmed)) {
    addError(`${prefix} has malformed founder name "${trimmed}".`);
  }
}

function validateUrl(value: string, message: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      addError(`${message}: "${value}".`);
    }
  } catch {
    addError(`${message}: "${value}".`);
  }
}

function scanCopy(
  label: string,
  value: string | undefined,
  options: { rejectLeadingAiPowered?: boolean } = {},
) {
  if (!value) return;

  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  if (options.rejectLeadingAiPowered && normalized.startsWith("ai-powered")) {
    addError(`${label} starts with "AI-powered".`);
  }

  for (const phrase of forbiddenCopyPhrases) {
    if (normalized.includes(phrase)) {
      addError(`${label} contains forbidden phrase "${phrase}".`);
    }
  }
}

function validateUnique(
  label: string,
  values: string[],
  normalize: (value: string) => string,
) {
  const seen = new Map<string, string>();
  for (const value of values) {
    const normalized = normalize(value);
    if (!normalized) continue;

    const existing = seen.get(normalized);
    if (existing) {
      addError(`${label} contains duplicate "${existing}" / "${value}".`);
    } else {
      seen.set(normalized, value);
    }
  }
}

function requireText(value: string | undefined, message: string) {
  if (!value?.trim()) addError(message);
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function collectFiles(roots: string[]) {
  const files: string[] = [];
  for (const root of roots) {
    walk(root, files);
  }
  return files.filter((file) => /\.(tsx?|jsx?)$/.test(file));
}

function walk(relativePath: string, files: string[]) {
  const absolutePath = path.join(repoRoot, relativePath);
  const stat = statSync(absolutePath);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(absolutePath)) {
      walk(path.join(relativePath, entry), files);
    }
    return;
  }

  files.push(relativePath);
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), "utf8")) as T;
}

function addError(message: string) {
  issues.push({ level: "error", message });
}

function addWarning(message: string) {
  issues.push({ level: "warning", message });
}

main();
