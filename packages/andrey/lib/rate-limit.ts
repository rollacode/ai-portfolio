// ---------------------------------------------------------------------------
// Rate limiting — Redis-backed (Vercel prod) with in-memory fallback (local)
// ---------------------------------------------------------------------------

import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Redis client (reused across requests)
// ---------------------------------------------------------------------------

let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  _redis = url && token ? new Redis({ url, token }) : null;
  return _redis;
}

// ---------------------------------------------------------------------------
// In-memory fallback (local dev / no Redis)
// ---------------------------------------------------------------------------

const memoryStore = new Map<string, number[]>();

// Periodic cleanup to prevent memory leak in local dev
if (typeof globalThis !== 'undefined') {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of memoryStore) {
      const recent = timestamps.filter(t => now - t < 60_000);
      if (recent.length === 0) memoryStore.delete(key);
      else memoryStore.set(key, recent);
    }
  }, 60_000);
  interval.unref?.();
}

// ---------------------------------------------------------------------------
// Short-window rate limit (per-minute, for burst protection)
//
// Used by visitor and insight endpoints. In-memory only — acceptable
// because these are low-stakes and cold starts naturally reset.
// ---------------------------------------------------------------------------

export function rateLimit(ip: string, limit: number, windowMs: number = 60_000): boolean {
  const now = Date.now();
  const key = `burst:${ip}`;
  const timestamps = memoryStore.get(key) ?? [];
  const recent = timestamps.filter(t => now - t < windowMs);

  if (recent.length >= limit) return false;

  recent.push(now);
  memoryStore.set(key, recent);
  return true;
}

// ---------------------------------------------------------------------------
// Daily chat quota (Redis-backed, persists across lambda invocations)
//
// Key: `chat-quota:{ip}` → counter with TTL = seconds until midnight UTC
// ---------------------------------------------------------------------------

const DEFAULT_DAILY_LIMIT = 40;

function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

/**
 * Check and increment daily chat quota for an IP.
 * Returns { allowed, remaining, limit } or null if Redis is unavailable.
 * When Redis is unavailable, returns allowed: true (fallback to burst limiter only).
 */
export async function checkDailyQuota(
  ip: string,
  limit: number = DEFAULT_DAILY_LIMIT,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const redis = getRedis();

  if (!redis) {
    // No Redis — allow (burst limiter still applies)
    return { allowed: true, remaining: limit, limit };
  }

  const key = `chat-quota:${ip}`;

  try {
    const current = await redis.get<number>(key) ?? 0;

    if (current >= limit) {
      return { allowed: false, remaining: 0, limit };
    }

    // Increment and set TTL (only on first request of the day)
    const newCount = await redis.incr(key);
    if (newCount === 1) {
      await redis.expire(key, secondsUntilMidnightUTC());
    }

    return { allowed: true, remaining: limit - newCount, limit };
  } catch {
    // Redis error — allow request (degrade gracefully)
    return { allowed: true, remaining: limit, limit };
  }
}

/**
 * Reset daily quota for a specific IP (admin action).
 */
export async function resetDailyQuota(ip: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.del(`chat-quota:${ip}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current usage for an IP (admin inspection).
 */
export async function getDailyUsage(ip: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  try {
    return await redis.get<number>(`chat-quota:${ip}`) ?? 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// IP extraction
// ---------------------------------------------------------------------------

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? 'unknown';
}
