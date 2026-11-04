import { createHash } from "node:crypto";
import reviews from "@/data/reporting/companies.json";
import offices from "@/data/reporting/offices.json";
import { companyToDatabasePayload } from "@/lib/admin-company-record";
import type { Company } from "@/types/market";

/** Reviewed source records are also available during a database outage. Explicit
 * database draft/archive decisions take precedence over registry additions. */
export function mergeReviewedCompanyRows<T extends Partial<Company>>(rows: T[]): T[] {
  const existing = new Set(rows.map((row) => row.slug));
  const additions = reviews.filter((review) => {
    const previous = (review as Record<string, unknown>).previous_slug;
    return !existing.has(review.slug) && !(typeof previous === "string" && existing.has(previous));
  }).map((review) => {
    const office = offices.find((o) => o.company_slug === review.slug && o.address && ["office", "headquarters"].includes(o.location_type));
    const record = companyToDatabasePayload({
      ...review, id: `cmp_${createHash("sha256").update(review.slug).digest("hex").slice(0, 16)}`,
      category: review.category as Company["category"],
      office_address: office?.address ?? "", why_it_matters: review.short_description,
      created_at: review.added_at, status: "published",
      discoveryReason: { trigger: "manual", sourceEventIds: [], sourceUrls: review.source_urls, confidence: "high", notes: review.notes },
    } as Partial<Company>);
    record.generated.hook = review.one_line_thesis;
    record.recent_activity_text = "";
    return record as unknown as T;
  });
  return [...rows, ...additions];
}
