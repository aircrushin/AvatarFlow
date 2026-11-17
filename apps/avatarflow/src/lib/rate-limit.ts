import 'server-only';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * In-process fixed-window rate limiter. Sufficient for a single instance and
 * the first paid deployment; swap for Upstash/Redis when scaling out.
 */
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

// Periodically evict expired buckets to avoid unbounded memory growth.
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 60_000);
  timer.unref?.();
}
