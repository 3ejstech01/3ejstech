import { bump, available } from './rate-limit-store';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now()
): Promise<RateLimitResult> {
  if (available()) {
    const count = await bump(key);
    const remaining = Math.max(0, max - count);
    return { allowed: count <= max, remaining, resetMs: windowMs };
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetMs: windowMs };
  }
  if (existing.count >= max) {
    return { allowed: false, remaining: 0, resetMs: existing.resetAt - now };
  }
  existing.count += 1;
  return {
    allowed: true,
    remaining: max - existing.count,
    resetMs: existing.resetAt - now,
  };
}

export function _resetRateLimits() {
  buckets.clear();
}