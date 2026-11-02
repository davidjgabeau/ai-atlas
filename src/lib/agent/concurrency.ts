/** Bounded workers with a shared deadline. In-flight work is always settled. */
export async function forEachConcurrent<T>(
  items: readonly T[],
  concurrency: number,
  visit: (item: T, index: number) => Promise<void>,
  deadline = Infinity,
) {
  let cursor = 0;
  let completed = 0;
  let failed = false;
  const workers = Array.from(
    { length: Math.min(items.length, Math.max(1, Math.floor(concurrency) || 1)) },
    async () => {
      while (!failed && cursor < items.length && Date.now() < deadline) {
        const index = cursor++;
        try {
          await visit(items[index], index);
          completed++;
        } catch (error) {
          failed = true;
          throw error;
        }
      }
    },
  );
  const results = await Promise.allSettled(workers);
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
  return { completed, remaining: items.length - completed };
}
