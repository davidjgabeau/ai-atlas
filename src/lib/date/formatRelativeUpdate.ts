export function formatRelativeUpdate(dateValue: string | Date): string {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const time = date.getTime();

  if (Number.isNaN(time)) return "recently";

  const diffMs = Date.now() - time;
  if (diffMs < 0) return "less than 1h ago";

  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) return "less than 1h ago";
  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return `${hours}h ago`;
  }
  if (diffMs < 7 * dayMs) {
    const days = Math.max(1, Math.floor(diffMs / dayMs));
    return `${days}d ago`;
  }

  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
