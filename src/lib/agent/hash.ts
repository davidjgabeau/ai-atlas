import { createHash } from "node:crypto";

export function createContentHash(value: unknown) {
  return createHash("sha256")
    .update(stableStringify(value))
    .digest("hex");
}

export function createId(prefix: string, value: unknown) {
  return `${prefix}_${createContentHash(value).slice(0, 16)}`;
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
