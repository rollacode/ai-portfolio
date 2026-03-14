import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @upstash/redis — the module caches its Redis instance, so we mock
// at the top level and control behavior via mockRedis* functions.
// ---------------------------------------------------------------------------

const mockRedisGet = vi.fn();
const mockRedisIncr = vi.fn();
const mockRedisExpire = vi.fn();
const mockRedisDel = vi.fn();

vi.mock('@upstash/redis', () => ({
  Redis: class MockRedis {
    get = mockRedisGet;
    incr = mockRedisIncr;
    expire = mockRedisExpire;
    del = mockRedisDel;
  },
}));

// ---------------------------------------------------------------------------
// Tests — rateLimit (in-memory burst limiter)
// ---------------------------------------------------------------------------

describe('rateLimit', () => {
  it('allows requests under the limit', async () => {
    const { rateLimit } = await import('../lib/rate-limit');

    const ip = `test-allow-${Date.now()}`;
    expect(rateLimit(ip, 3)).toBe(true);
    expect(rateLimit(ip, 3)).toBe(true);
    expect(rateLimit(ip, 3)).toBe(true);
  });

  it('blocks requests at the limit', async () => {
    const { rateLimit } = await import('../lib/rate-limit');

    const ip = `test-block-${Date.now()}`;
    expect(rateLimit(ip, 2)).toBe(true);
    expect(rateLimit(ip, 2)).toBe(true);
    // Third request should be blocked
    expect(rateLimit(ip, 2)).toBe(false);
  });

  it('uses separate counters per IP', async () => {
    const { rateLimit } = await import('../lib/rate-limit');

    const ip1 = `test-ip1-${Date.now()}`;
    const ip2 = `test-ip2-${Date.now()}`;

    expect(rateLimit(ip1, 1)).toBe(true);
    expect(rateLimit(ip1, 1)).toBe(false); // ip1 exhausted

    expect(rateLimit(ip2, 1)).toBe(true); // ip2 still has quota
  });

  it('respects custom window — expired timestamps are discarded', async () => {
    const { rateLimit } = await import('../lib/rate-limit');

    const ip = `test-window-${Date.now()}`;
    // Use a very short window (1ms) so timestamps expire immediately
    expect(rateLimit(ip, 1, 1)).toBe(true);

    // Wait a bit so the 1ms window expires
    await new Promise((r) => setTimeout(r, 10));

    // Should be allowed again since the old timestamp expired
    expect(rateLimit(ip, 1, 1)).toBe(true);
  });

  it('blocks when limit is 0', async () => {
    const { rateLimit } = await import('../lib/rate-limit');

    const ip = `test-zero-${Date.now()}`;
    expect(rateLimit(ip, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests — getClientIp
// ---------------------------------------------------------------------------

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', async () => {
    const { getClientIp } = await import('../lib/rate-limit');

    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('returns "unknown" when no forwarded header', async () => {
    const { getClientIp } = await import('../lib/rate-limit');

    const req = new Request('http://localhost');
    expect(getClientIp(req)).toBe('unknown');
  });

  it('trims whitespace from IP', async () => {
    const { getClientIp } = await import('../lib/rate-limit');

    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '  10.0.0.1  , 10.0.0.2' },
    });
    expect(getClientIp(req)).toBe('10.0.0.1');
  });
});

// ---------------------------------------------------------------------------
// Tests — checkDailyQuota (Redis-backed)
//
// The module has a cached `_redis` variable. Whether Redis is used depends
// on KV_REST_API_URL + KV_REST_API_TOKEN env vars at first call time.
// Since we mock @upstash/redis with a class, and set KV env vars, the
// module will create a Redis instance on first checkDailyQuota call.
// ---------------------------------------------------------------------------

describe('checkDailyQuota', () => {
  beforeEach(() => {
    // Ensure Redis env vars are set so getRedis() creates an instance
    vi.stubEnv('KV_REST_API_URL', 'https://redis.test');
    vi.stubEnv('KV_REST_API_TOKEN', 'test-token');
    mockRedisGet.mockReset();
    mockRedisIncr.mockReset();
    mockRedisExpire.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns allowed=false when Redis counter is at limit', async () => {
    mockRedisGet.mockResolvedValue(40);

    const { checkDailyQuota } = await import('../lib/rate-limit');
    const result = await checkDailyQuota('1.2.3.4');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.limit).toBe(40);
  });

  it('increments counter and sets TTL on first request of the day', async () => {
    mockRedisGet.mockResolvedValue(0);
    mockRedisIncr.mockResolvedValue(1);
    mockRedisExpire.mockResolvedValue(true);

    const { checkDailyQuota } = await import('../lib/rate-limit');
    const result = await checkDailyQuota('1.2.3.4');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(39);
    expect(mockRedisIncr).toHaveBeenCalled();
    expect(mockRedisExpire).toHaveBeenCalled();
  });

  it('does not set TTL on subsequent requests', async () => {
    mockRedisGet.mockResolvedValue(5);
    mockRedisIncr.mockResolvedValue(6);

    const { checkDailyQuota } = await import('../lib/rate-limit');
    const result = await checkDailyQuota('1.2.3.4');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(34);
    expect(mockRedisExpire).not.toHaveBeenCalled();
  });

  it('degrades gracefully on Redis error', async () => {
    mockRedisGet.mockRejectedValue(new Error('Connection refused'));

    const { checkDailyQuota } = await import('../lib/rate-limit');
    const result = await checkDailyQuota('1.2.3.4');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(40);
  });

  it('respects custom limit parameter', async () => {
    mockRedisGet.mockResolvedValue(10);

    const { checkDailyQuota } = await import('../lib/rate-limit');
    const result = await checkDailyQuota('1.2.3.4', 10);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.limit).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Tests — resetDailyQuota
// ---------------------------------------------------------------------------

describe('resetDailyQuota', () => {
  beforeEach(() => {
    vi.stubEnv('KV_REST_API_URL', 'https://redis.test');
    vi.stubEnv('KV_REST_API_TOKEN', 'test-token');
    mockRedisDel.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('deletes key and returns true', async () => {
    mockRedisDel.mockResolvedValue(1);

    const { resetDailyQuota } = await import('../lib/rate-limit');
    expect(await resetDailyQuota('1.2.3.4')).toBe(true);
    expect(mockRedisDel).toHaveBeenCalledWith('chat-quota:1.2.3.4');
  });

  it('returns false on Redis error', async () => {
    mockRedisDel.mockRejectedValue(new Error('timeout'));

    const { resetDailyQuota } = await import('../lib/rate-limit');
    expect(await resetDailyQuota('1.2.3.4')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests — getDailyUsage
// ---------------------------------------------------------------------------

describe('getDailyUsage', () => {
  beforeEach(() => {
    vi.stubEnv('KV_REST_API_URL', 'https://redis.test');
    vi.stubEnv('KV_REST_API_TOKEN', 'test-token');
    mockRedisGet.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns current usage from Redis', async () => {
    mockRedisGet.mockResolvedValue(15);

    const { getDailyUsage } = await import('../lib/rate-limit');
    expect(await getDailyUsage('1.2.3.4')).toBe(15);
  });

  it('returns 0 when Redis returns null', async () => {
    mockRedisGet.mockResolvedValue(null);

    const { getDailyUsage } = await import('../lib/rate-limit');
    expect(await getDailyUsage('1.2.3.4')).toBe(0);
  });

  it('returns 0 on Redis error', async () => {
    mockRedisGet.mockRejectedValue(new Error('timeout'));

    const { getDailyUsage } = await import('../lib/rate-limit');
    expect(await getDailyUsage('1.2.3.4')).toBe(0);
  });
});
