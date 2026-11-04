import exclusions from "@/data/reporting/exclusions.json";

const excluded = new Set((exclusions as Array<{ slug: string }>).map((entry) => entry.slug));

/** A source review can hold an otherwise published legacy row without deleting
 * its history. The same decision applies to profiles, maps, search and jobs. */
export function isExcludedFromPublicAtlas(slug: string | undefined) {
  return Boolean(slug && excluded.has(slug));
}
