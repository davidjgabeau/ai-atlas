import "./load-env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import reviews from "../src/data/reporting/companies.json";
import offices from "../src/data/reporting/offices.json";
import exclusions from "../src/data/reporting/exclusions.json";
import { companyToDatabasePayload } from "../src/lib/admin-company-record";
import { createSupabasePrivilegedClient } from "../src/lib/supabase/privileged";
import { categories, type Company } from "../src/types/market";

async function main() {
  const apply = process.argv.includes("--apply");
  const only = process.argv.find((arg) => arg.startsWith("--company="))?.slice("--company=".length);
  const backupArg = process.argv.find((arg) => arg.startsWith("--backup-dir="));
  const backupDir = backupArg?.slice("--backup-dir=".length);
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) throw new Error("Database credentials are required.");
  const { data: existing, error } = await supabase.from("companies").select("*");
  if (error || !existing) throw new Error(error?.message || "Unable to read companies.");
  if (apply && !backupDir) throw new Error("--apply requires --backup-dir for a restorable snapshot.");
  if (backupDir) { await mkdir(backupDir, { recursive: true }); await writeFile(path.join(backupDir, "companies-before-reviewed-import.json"), JSON.stringify(existing, null, 2)); }
  const stringFields = ["name", "website_url", "category", "stage", "short_description", "one_line_thesis", "funding_round", "funding_amount", "funding_date", "total_raised", "lead_investor"] as const;
  const plan: Array<{ slug: string; action: string; fields?: string[] }> = [];
  const records: Record<string, unknown>[] = [];
  for (const review of reviews.filter((review) => !only || only.split(",").includes(review.slug))) {
    const r = review as unknown as Record<string, unknown>;
    if ((exclusions as Array<{ slug: string }>).some((entry) => entry.slug === review.slug)) continue;
    if (!categories.includes(review.category as Company["category"])) throw new Error(`Unsupported category: ${review.slug}`);
    if (!/^https:\/\//.test(review.website_url)) throw new Error(`Missing canonical HTTPS site: ${review.slug}`);
    const previous = existing.find((row) => row.slug === review.slug || (r.previous_slug && row.slug === r.previous_slug));
    const id = previous?.id ?? `cmp_${createHash("sha256").update(review.slug).digest("hex").slice(0, 16)}`;
    const patch: Record<string, unknown> = { slug: review.slug };
    for (const field of stringFields) if (r[field] !== null && r[field] !== undefined) patch[field] = r[field];
    // The source registry carries the canonical category. Older database CHECK
    // constraints use an existing category until their schema is migrated.
    if (typeof r.storage_category === "string") patch.category = r.storage_category;
    if (Array.isArray(r.founders)) { patch.founders = r.founders; patch.founder_name = (r.founders as Array<{ name: string }>).map((f) => f.name).join("; "); }
    const office = offices.find((o) => o.company_slug === review.slug && o.address && ["office", "headquarters"].includes(o.location_type));
    if (office?.address) patch.office_address = office.address;
    // Identity corrections invalidate generated article fragments and stale profile briefs.
    patch.why_it_matters = review.short_description;
    patch.ai_usage_profile = "";
    patch.discoveryReason = { trigger: "source_update", sourceEventIds: [], sourceUrls: review.source_urls, confidence: "high", notes: review.notes || "Reviewed public sources." };
    const payload = companyToDatabasePayload({ ...previous, ...patch, id,
      status: r.publication_review === "publish" ? "published" : previous?.status ?? "published", created_at: previous?.created_at ?? String(r.added_at),
      recent_activity_text: previous?.recent_activity_text ?? "",
      recent_activity_date: previous?.recent_activity_date ?? new Date().toISOString(),
    } as Partial<Company>);
    payload.generated.hook = review.one_line_thesis;
    if (!previous) { payload.recent_activity_text = ""; payload.recent_activity_date = payload.created_at; }
    records.push(payload);
    plan.push({ slug: review.slug, action: previous ? "update" : "insert", fields: Object.keys(patch) });
    if (apply) {
      if (previous) {
        const { data, error: updateError } = await supabase.from("companies").update(payload).eq("id", id).eq("updated_at", previous.updated_at).select("id");
        if (updateError || data?.length !== 1) throw new Error(`${review.slug}: ${updateError?.message || "Concurrent edit; import stopped"}`);
      } else {
        const { error: insertError } = await supabase.from("companies").insert(payload);
        if (insertError) throw new Error(`${review.slug}: ${insertError.message}`);
      }
    }
  }
  for (const slug of [...new Set(["new-york-city-startups", "tabs-quickly", ...(exclusions as Array<{ slug: string }>).map((entry) => entry.slug)])].filter((slug) => !only || only.split(",").includes(slug))) {
    const row = existing.find((row) => row.slug === slug);
    if (!row || row.status !== "published") continue;
    plan.push({ slug, action: "hold out-of-scope or unresolved record for review" });
    if (apply) {
      const { data, error: holdError } = await supabase.from("companies").update({ status: "draft" }).eq("id", row.id).eq("updated_at", row.updated_at).select("id");
      if (holdError || data?.length !== 1) throw new Error(holdError?.message || `${slug}: concurrent edit; hold stopped`);
    }
  }
  if (backupDir) await writeFile(path.join(backupDir, apply ? "reviewed-import-applied.json" : "reviewed-import-plan.json"), JSON.stringify(plan, null, 2));
  console.log(JSON.stringify({ applied: apply, inserted: plan.filter((p) => p.action === "insert").length, updated: plan.filter((p) => p.action === "update").length, held: plan.filter((p) => p.action.startsWith("hold")).length, plan }, null, 2));

}
main().catch((error) => { console.error(error); process.exitCode = 1; });
