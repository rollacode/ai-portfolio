import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock rate-limit module (Redis-backed functions)
// ---------------------------------------------------------------------------

const mockGetDailyUsage = vi.fn();
const mockResetDailyQuota = vi.fn();

vi.mock('../lib/rate-limit', () => ({
  getDailyUsage: (...args: unknown[]) => mockGetDailyUsage(...args),
  resetDailyQuota: (...args: unknown[]) => mockResetDailyQuota(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRequest(ip?: string, bearerToken?: string): NextRequest {
  const url = ip
    ? `http://localhost/api/quota?ip=${ip}`
    : 'http://localhost/api/quota';

  const headers: Record<string, string> = {};
  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
  }

  return new NextRequest(url, { method: 'GET', headers });
}

function deleteRequest(ip?: string, bearerToken?: string): NextRequest {
  const url = ip
    ? `http://localhost/api/quota?ip=${ip}`
    : 'http://localhost/api/quota';

  const headers: Record<string, string> = {};
  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
  }

  return new NextRequest(url, { method: 'DELETE', headers });
}

// ---------------------------------------------------------------------------
// Tests — GET /api/quota
// ---------------------------------------------------------------------------

describe('GET /api/quota', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockGetDailyUsage.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns 401 without admin token', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'secret');
    const { GET } = await import('../app/api/quota/route');

    const res = await GET(getRequest('1.2.3.4'));
    expect(res.status).toBe(401);
  });

  it('returns 401 with wrong token', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'secret');
    const { GET } = await import('../app/api/quota/route');

    const res = await GET(getRequest('1.2.3.4', 'wrong-token'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when ADMIN_TOKEN is not set', async () => {
    vi.stubEnv('ADMIN_TOKEN', '');
    const { GET } = await import('../app/api/quota/route');

    const res = await GET(getRequest('1.2.3.4', 'anything'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when ip query param is missing', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'secret');
    const { GET } = await import('../app/api/quota/route');

    const res = await GET(getRequest(undefined, 'secret'));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toMatch(/ip/i);
  });

  it('returns usage data for valid request', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'secret');
    mockGetDailyUsage.mockResolvedValue(12);

    const { GET } = await import('../app/api/quota/route');

    const res = await GET(getRequest('1.2.3.4', 'secret'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ip).toBe('1.2.3.4');
    expect(json.used).toBe(12);
    expect(json.limit).toBe(40);
    expect(json.remaining).toBe(28);
  });
});

// ---------------------------------------------------------------------------
// Tests — DELETE /api/quota
// ---------------------------------------------------------------------------

describe('DELETE /api/quota', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockResetDailyQuota.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns 401 without admin token', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'secret');
    const { DELETE } = await import('../app/api/quota/route');

    const res = await DELETE(deleteRequest('1.2.3.4'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when ip query param is missing', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'secret');
    const { DELETE } = await import('../app/api/quota/route');

    const res = await DELETE(deleteRequest(undefined, 'secret'));
    expect(res.status).toBe(400);
  });

  it('returns 503 when Redis is unavailable', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'secret');
    mockResetDailyQuota.mockResolvedValue(false);

    const { DELETE } = await import('../app/api/quota/route');

    const res = await DELETE(deleteRequest('1.2.3.4', 'secret'));
    expect(res.status).toBe(503);
  });

  it('resets quota and returns ok', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'secret');
    mockResetDailyQuota.mockResolvedValue(true);

    const { DELETE } = await import('../app/api/quota/route');

    const res = await DELETE(deleteRequest('1.2.3.4', 'secret'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.ip).toBe('1.2.3.4');
  });
});
