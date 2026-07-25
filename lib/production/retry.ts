/** Retry helper for transient network / 5xx failures. */

export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Return true to retry this error/response */
  shouldRetry?: (info: { attempt: number; error?: unknown; status?: number }) => boolean;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const retries = opts.retries ?? 2;
  const base = opts.baseDelayMs ?? 300;
  const max = opts.maxDelayMs ?? 2_500;
  const shouldRetry =
    opts.shouldRetry ||
    (({ error, status }) => {
      if (error) return true;
      if (status === 429 || (status != null && status >= 500)) return true;
      return false;
    });

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !shouldRetry({ attempt, error })) throw error;
      const delay = Math.min(max, base * 2 ** attempt);
      await sleep(delay + Math.floor(Math.random() * 80));
    }
  }
  throw lastError;
}
