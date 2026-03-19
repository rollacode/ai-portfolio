import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock the visitor-store module before importing the route
// ---------------------------------------------------------------------------

let mockVisitors: Array<Record<string, unknown>> = [];

vi.mock('@/lib/visitor-store', () => ({
  loadVisitors: vi.fn(async () => mockVisitors),
  saveVisitors: vi.fn(async (visitors: Array<Record<string, unknown>>) => {
    mockVisitors = visitors;
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/visitor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function brokenPostRequest(): NextRequest {
  return new NextRequest('http://localhost/api/visitor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '<<<not json>>>',
  });
}

function getRequest(opts?: { bearerToken?: string; queryToken?: string }): NextRequest {
  const url = opts?.queryToken
    ? `http://localhost/api/visitor?token=${opts.queryToken}`
    : 'http://localhost/api/visitor';

  const headers: Record<string, string> = {};
  if (opts?.bearerToken) {
    headers['Authorization'] = `Bearer ${opts.bearerToken}`;
  }

  return new NextRequest(url, { method: 'GET', headers });
}

// ---------------------------------------------------------------------------
// Tests — POST /api/visitor
// ---------------------------------------------------------------------------

describe('POST /api/visitor', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockVisitors = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // -----------------------------------------------------------------------
  // 1. Saves new visitor
  // -----------------------------------------------------------------------

  it('saves a new visitor and returns ok with merged=false', async () => {
    const { POST } = await import('../app/api/visitor/route');

    const res = await POST(postRequest({ name: 'Alice', company: 'Acme' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, merged: false });
    expect(mockVisitors).toHaveLength(1);
    expect(mockVisitors[0].name).toBe('Alice');
    expect(mockVisitors[0].company).toBe('Acme');
  });

  // -----------------------------------------------------------------------
  // 2. Merges by visitorId
  // -----------------------------------------------------------------------

  it('merges data when same visitorId is sent twice', async () => {
    const visitorId = 'visitor-uuid-123';
    const { POST } = await import('../app/api/visitor/route');

    // First call — creates entry
    const res1 = await POST(postRequest({ visitorId, name: 'Bob' }));
    expect((await res1.json()).merged).toBe(false);

    // Second call — should merge into existing entry
    const res2 = await POST(postRequest({ visitorId, company: 'BobCorp' }));
    expect((await res2.json()).merged).toBe(true);

    // Verify the merged result
    expect(mockVisitors).toHaveLength(1);
    expect(mockVisitors[0].name).toBe('Bob');
    expect(mockVisitors[0].company).toBe('BobCorp');
    expect(mockVisitors[0].visitorId).toBe(visitorId);
  });

  // -----------------------------------------------------------------------
  // 2b. Contact fields overwrite; notes append
  // -----------------------------------------------------------------------

  it('overwrites contact fields and appends notes on merge', async () => {
    const visitorId = 'visitor-append-test';
    const { POST } = await import('../app/api/visitor/route');

    // First call — creates entry with name and telegram
    await POST(postRequest({ visitorId, name: 'Dolev', telegram: '@dolev' }));

    // Second call — adds email and phone (contact fields overwrite, not append)
    const res2 = await POST(
      postRequest({ visitorId, email: 'dolev@gmail.com', phone: '+972 521234567' }),
    );
    expect((await res2.json()).merged).toBe(true);

    // All three contact fields should exist on the merged record
    expect(mockVisitors).toHaveLength(1);
    expect(mockVisitors[0].telegram).toBe('@dolev');
    expect(mockVisitors[0].email).toBe('dolev@gmail.com');
    expect(mockVisitors[0].phone).toBe('+972 521234567');

    // Third call — first note
    await POST(postRequest({ visitorId, notes: 'worked at Trax' }));

    // Fourth call — second note should be appended with `;` separator
    await POST(postRequest({ visitorId, notes: 'interested in collaboration' }));

    expect(mockVisitors).toHaveLength(1);
    expect(mockVisitors[0].notes).toBe('worked at Trax; interested in collaboration');
  });

  // -----------------------------------------------------------------------
  // 3. Filters empty fields — nothing to save
  // -----------------------------------------------------------------------

  it('returns ok with merged=false when all fields are empty', async () => {
    const { POST } = await import('../app/api/visitor/route');

    const res = await POST(postRequest({ name: '', company: '  ' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, merged: false });
    // Should NOT save when there's nothing to save
    expect(mockVisitors).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // 4. Handles invalid JSON
  // -----------------------------------------------------------------------

  it('returns 500 on invalid JSON body', async () => {
    const { POST } = await import('../app/api/visitor/route');

    const res = await POST(brokenPostRequest());
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Tests — GET /api/visitor
// ---------------------------------------------------------------------------

describe('GET /api/visitor', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockVisitors = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // -----------------------------------------------------------------------
  // 5. Returns 401 without token
  // -----------------------------------------------------------------------

  it('returns 401 when no token is provided', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'secret-admin-token');

    const { GET } = await import('../app/api/visitor/route');

    const res = await GET(getRequest());
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error).toMatch(/unauthorized/i);
  });

  it('returns 401 when ADMIN_TOKEN is not set at all', async () => {
    vi.stubEnv('ADMIN_TOKEN', '');

    const { GET } = await import('../app/api/visitor/route');

    const res = await GET(getRequest({ bearerToken: 'anything' }));
    expect(res.status).toBe(401);
  });

  // -----------------------------------------------------------------------
  // 6. Returns visitors with Bearer token
  // -----------------------------------------------------------------------

  it('returns visitors when valid Bearer token is provided', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'secret-admin-token');
    mockVisitors = [{ name: 'Alice', timestamp: '2025-01-01T00:00:00Z' }];

    const { GET } = await import('../app/api/visitor/route');

    const res = await GET(getRequest({ bearerToken: 'secret-admin-token' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.count).toBe(1);
    expect(json.visitors).toHaveLength(1);
    expect(json.visitors[0].name).toBe('Alice');
  });

  // -----------------------------------------------------------------------
  // 7. Rejects query param token (only Bearer header accepted)
  // -----------------------------------------------------------------------

  it('returns 401 when token is provided via query param instead of header', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'qp-token');
    mockVisitors = [{ name: 'Bob', timestamp: '2025-02-01T00:00:00Z' }];

    const { GET } = await import('../app/api/visitor/route');

    const res = await GET(getRequest({ queryToken: 'qp-token' }));
    expect(res.status).toBe(401);
  });
});
