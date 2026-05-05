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
