import { revalidateTag } from "next/cache";

export async function runWithNextCacheFallback<T>(
  cached: () => Promise<T>,
  direct: () => Promise<T>,
) {
  try {
    return await cached();
  } catch (error) {
    if (isMissingNextCacheContext(error)) {
      return direct();
    }

    throw error;
  }
}

export function safeRevalidateTag(tag: string) {
  try {
    revalidateTag(tag, "max");
  } catch (error) {
    if (!isMissingNextCacheContext(error)) {
      throw error;
    }
  }
}

function isMissingNextCacheContext(error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  return (
    message.includes("incrementalCache missing") ||
    message.includes("static generation store missing")
  );
}
