/**
 * Lightweight in-memory rate limiter.
 * Suitable for single-instance deployments; swap for Redis in multi-instance.
 *
 * Presets:
 * - auth: 10 / 60s
 * - search: 60 / 60s
 * - ai: 30 / 60s
 * - write: 120 / 60s
 */

export const RATE_PRESETS = {
  auth: { limit: 10, windowMs: 60_000 },
  search: { limit: 60, windowMs: 60_000 },
  ai: { limit: 30, windowMs: 60_000 },
  write: { limit: 120, windowMs: 60_000 },
} as const;

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const CLEAN_EVERY = 200;
let ops = 0;

function sweep(now: number) {
  ops += 1;
  if (ops % CLEAN_EVERY !== 0) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return {
      ok: true,
      remaining: opts.limit - 1,
      retryAfterSec: Math.ceil(opts.windowMs / 1000),
    };
  }

  if (existing.count >= opts.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: opts.limit - existing.count,
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

export function clientKey(req: Request, prefix: string) {
  const fwd =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${prefix}:${fwd}`;
}
