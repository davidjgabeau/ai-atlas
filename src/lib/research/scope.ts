import exclusions from "@/data/reporting/exclusions.json";
import profiles from "@/data/reporting/companies.json";

const excluded = new Set((exclusions as Array<{ slug: string }>).map((entry) => entry.slug));
const approved = new Set(profiles.filter((profile) => (profile as Record<string, unknown>).publication_review === "publish").map((profile) => profile.slug));

/** A source review can hold an otherwise published legacy row without deleting
 * its history. The same decision applies to profiles, maps, search and jobs. */
export function isExcludedFromPublicAtlas(slug: string | undefined) {
  return Boolean(slug && excluded.has(slug));
}

export function hasReviewedPublicationDecision(slug: string) {
  return approved.has(slug) && !excluded.has(slug);
}
