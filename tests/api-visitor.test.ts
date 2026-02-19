import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock the fs module before importing the route
// ---------------------------------------------------------------------------

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue('[]'),
    writeFileSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue('[]'),
  writeFileSync: vi.fn(),
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
  let fs: typeof import('fs');

  beforeEach(async () => {
    vi.unstubAllEnvs();
    fs = (await import('fs')).default as unknown as typeof import('fs');
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.readFileSync).mockReturnValue('[]');
    vi.mocked(fs.writeFileSync).mockReset();
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
    expect(fs.writeFileSync).toHaveBeenCalledOnce();

    // Verify the written data contains our visitor
    const written = JSON.parse(
      vi.mocked(fs.writeFileSync).mock.calls[0][1] as string,
    );
    expect(written).toHaveLength(1);
    expect(written[0].name).toBe('Alice');
    expect(written[0].company).toBe('Acme');
  });

  // -----------------------------------------------------------------------
  // 2. Merges by visitorId
  // -----------------------------------------------------------------------

  it('merges data when same visitorId is sent twice', async () => {
    const visitorId = 'visitor-uuid-123';

    // After first POST writes, second POST should see that data on read
    let savedData = '[]';
    vi.mocked(fs.writeFileSync).mockImplementation((_path, data) => {
      savedData = data as string;
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation(() => savedData);

    const { POST } = await import('../app/api/visitor/route');

    // First call — creates entry
    const res1 = await POST(postRequest({ visitorId, name: 'Bob' }));
    expect((await res1.json()).merged).toBe(false);

    // Second call — should merge into existing entry
    const res2 = await POST(postRequest({ visitorId, company: 'BobCorp' }));
    expect((await res2.json()).merged).toBe(true);

    // Verify the merged result
    const finalData = JSON.parse(savedData);
    expect(finalData).toHaveLength(1);
    expect(finalData[0].name).toBe('Bob');
    expect(finalData[0].company).toBe('BobCorp');
    expect(finalData[0].visitorId).toBe(visitorId);
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
    // Should NOT write to disk when there's nothing to save
    expect(fs.writeFileSync).not.toHaveBeenCalled();
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
  let fs: typeof import('fs');

  beforeEach(async () => {
    vi.unstubAllEnvs();
    fs = (await import('fs')).default as unknown as typeof import('fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('[]');
    vi.mocked(fs.writeFileSync).mockReset();
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
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify([{ name: 'Alice', timestamp: '2025-01-01T00:00:00Z' }]),
    );

    const { GET } = await import('../app/api/visitor/route');

    const res = await GET(getRequest({ bearerToken: 'secret-admin-token' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.count).toBe(1);
    expect(json.visitors).toHaveLength(1);
    expect(json.visitors[0].name).toBe('Alice');
  });

  // -----------------------------------------------------------------------
  // 7. Returns visitors with query param token
  // -----------------------------------------------------------------------

  it('returns visitors when valid query param token is provided', async () => {
    vi.stubEnv('ADMIN_TOKEN', 'qp-token');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify([{ name: 'Bob', timestamp: '2025-02-01T00:00:00Z' }]),
    );

    const { GET } = await import('../app/api/visitor/route');

    const res = await GET(getRequest({ queryToken: 'qp-token' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.count).toBe(1);
    expect(json.visitors[0].name).toBe('Bob');
  });
});
