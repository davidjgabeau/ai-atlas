/** Keep an unavailable database from hanging a page, search, or Ask response. */
export const fetchWithDatabaseDeadline: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(8_000)])
      : AbortSignal.timeout(8_000),
  });
