const askIntentTerms = [
  "what",
  "which",
  "who",
  "where",
  "why",
  "how",
  "if",
  "should",
  "could",
  "would",
  "recommend",
  "compare",
  "competing",
  "competition",
  "white space",
  "watching",
  "interesting",
  "customers",
  "investor",
  "founder",
  "building",
  "raised",
  "market",
  "pattern",
];

export function isAskAtlasQuery(value: string) {
  const query = value.trim();
  if (!query) return false;

  const wordCount = query.split(/\s+/).filter(Boolean).length;
  if (query.includes("?") && wordCount >= 3) return true;
  if (wordCount < 5 || query.length < 22) return false;

  const normalized = query.toLowerCase();
  return askIntentTerms.some((term) =>
    new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(normalized),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
