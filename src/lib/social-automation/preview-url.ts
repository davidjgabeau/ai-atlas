const aiAtlasHostnames = new Set(["aiatlas.nyc", "www.aiatlas.nyc"]);
const aiAtlasUrlPattern =
  /\b(?:https?:\/\/)?(?:www\.)?aiatlas\.nyc\/[^\s<>"')\]]+/gi;

export function prepareSocialTextForPublish(text: string) {
  const seenAtlasPaths = new Set<string>();

  return text
    .replace(aiAtlasUrlPattern, (match) => {
      const normalized = getPreviewSafeAtlasUrl(match);
      if (!normalized) return match;

      const url = new URL(normalized);
      const dedupeKey = `${url.hostname}${url.pathname}`;
      if (seenAtlasPaths.has(dedupeKey)) return "";

      seenAtlasPaths.add(dedupeKey);
      return normalized;
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getPreviewSafeAtlasUrl(value: string) {
  const normalized = value.startsWith("http") ? value : `https://${value}`;

  try {
    const url = new URL(normalized);
    if (!aiAtlasHostnames.has(url.hostname)) return value;

    url.searchParams.set("x", "2");
    url.hash = "";

    return url.toString();
  } catch {
    return "";
  }
}
