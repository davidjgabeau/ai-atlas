export const MIN_VISIBLE_VIEW_COUNT = 25;

export function formatViewCount(count: number): string {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;

  if (safeCount < 1_000) return String(safeCount);
  if (safeCount < 1_000_000) {
    return `${formatCompactNumber(safeCount / 1_000)}k`;
  }

  return `${formatCompactNumber(safeCount / 1_000_000)}m`;
}

function formatCompactNumber(value: number) {
  return value >= 100 || Number.isInteger(value)
    ? String(Math.floor(value))
    : value.toFixed(1).replace(/\.0$/, "");
}

export function formatViewCountLabel(count: number) {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return `${formatViewCount(safeCount)} ${safeCount === 1 ? "view" : "views"}`;
}

export function shouldShowViewCount(count: number) {
  return Number.isFinite(count) && Math.floor(count) >= MIN_VISIBLE_VIEW_COUNT;
}
