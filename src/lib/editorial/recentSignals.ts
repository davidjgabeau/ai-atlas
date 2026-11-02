import type { EditorialItem } from "@/types/agent";

/** Regenerating a surface does not make its underlying company events new. */
export function getRecentEditorialSignals(
  items: EditorialItem[] = [],
  companyIds: ReadonlySet<string>,
  now = Date.now(),
) {
  return items.filter((item) => {
    const occurredAt = Date.parse(item.occurredAt ?? "");
    return item.companyId && companyIds.has(item.companyId)
      && Number.isFinite(occurredAt)
      && occurredAt <= now && now - occurredAt <= 30 * 86_400_000
      && Boolean(item.body?.trim())
      && !/\b(cron|pipeline|fallback|placeholder|todo|high potential|promising)\b/i.test(item.body ?? "");
  }).sort((a, b) => Date.parse(b.occurredAt!) - Date.parse(a.occurredAt!));
}
