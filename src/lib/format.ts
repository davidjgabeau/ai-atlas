export function formatRelativeDate(dateValue: string, referenceNow = new Date()) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  const diffMs = date.getTime() - referenceNow.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const absHours = Math.abs(diffHours);

  if (absHours > 0 && absHours < 24) {
    return diffHours < 0 ? `${absHours}h ago` : `in ${absHours}h`;
  }

  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const absDays = Math.abs(diffDays);

  if (absDays < 1) {
    return "today";
  }

  if (absDays < 7) {
    return diffDays < 0 ? `${absDays}d ago` : `in ${absDays}d`;
  }

  const diffWeeks = Math.round(diffDays / 7);
  const absWeeks = Math.abs(diffWeeks);
  if (absWeeks < 8) {
    return diffWeeks < 0 ? `${absWeeks}w ago` : `in ${absWeeks}w`;
  }

  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatActivity(activity: string, dateValue: string) {
  return `${activity} · ${formatRelativeDate(dateValue)}`;
}

export function formatDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
