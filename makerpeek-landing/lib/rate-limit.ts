/**
 * Per-IP limiter + per-host result cache for the public detector tool.
 *
 * LIMITATION, read before trusting this: state lives in the process. Each
 * serverless instance keeps its own counters, so the real ceiling is
 * LIMIT x (number of warm instances), not LIMIT. That is fine at this site's
 * traffic — it stops casual hammering and makes repeat lookups free — but it
 * is NOT a defence against a determined attacker. If this page ever gets real
 * traffic, move to Vercel Firewall rate limiting or Upstash Redis.
 */

const WINDOW_MS = 60_000;
const LIMIT = 30;
const CACHE_TTL_MS = 15 * 60_000;
const MAX_KEYS = 5_000;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const cache = new Map<string, { at: number; value: unknown }>();

function prune<T>(map: Map<string, T>) {
  if (map.size <= MAX_KEYS) return;
  const excess = map.size - MAX_KEYS;
  let i = 0;
  for (const key of map.keys()) {
    map.delete(key);
    if (++i >= excess) break;
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    prune(buckets);
    return { allowed: true, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > LIMIT) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function getCached<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value as T;
}

export function setCached(key: string, value: unknown) {
  cache.set(key, { at: Date.now(), value });
  prune(cache);
}
