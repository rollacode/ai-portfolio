import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

vi.mock('../lib/system-prompt', () => ({
  loadPortfolioContent: () => 'mock portfolio data',
}));

vi.mock('../portfolio/config.json', () => ({
  default: { firstName: 'TestUser' },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeBrokenRequest(): NextRequest {
  return new NextRequest('http://localhost/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '<<<not json>>>',
  });
}

function mockFetchStream(content: string): void {
  const ssePayload = `data: ${JSON.stringify({
    choices: [{ delta: { content } }],
  })}\n\ndata: [DONE]\n\n`;

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(ssePayload, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    ),
  );
}

function mockFetchError(status: number): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('upstream error', { status })),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/match', () => {
  beforeEach(() => {
    vi.stubEnv('AI_API_KEY', '');
    vi.stubEnv('XAI_API_KEY', '');
    vi.stubEnv('AI_BASE_URL', '');
    vi.stubEnv('AI_MODEL', '');
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns SSE error when no API key is set', async () => {
    const { POST } = await import('../app/api/match/route');

    const res = await POST(
      makeRequest({ role: 'Engineer', description: 'Build stuff' }),
    );
    expect(res.status).toBe(500);

    const text = await res.text();
    expect(text).toContain('API key');
  });

  it('returns 400 on invalid JSON body', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');

    const { POST } = await import('../app/api/match/route');

    const res = await POST(makeBrokenRequest());
    expect(res.status).toBe(400);

    const text = await res.text();
    expect(text).toContain('Invalid JSON');
  });

  it('returns 400 when role is missing', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');

    const { POST } = await import('../app/api/match/route');

    const res = await POST(makeRequest({ description: 'Build stuff' }));
    expect(res.status).toBe(400);

    const text = await res.text();
    expect(text).toContain('role');
  });

  it('returns 400 when description is missing', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');

    const { POST } = await import('../app/api/match/route');

    const res = await POST(makeRequest({ role: 'Engineer' }));
    expect(res.status).toBe(400);

    const text = await res.text();
    expect(text).toContain('description');
  });

  it('streams SSE response on success', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');
    vi.stubEnv('AI_BASE_URL', 'https://api.test.ai/v1');
    mockFetchStream('Match analysis');

    const { POST } = await import('../app/api/match/route');

    const res = await POST(
      makeRequest({
        role: 'Senior Engineer',
        company: 'Acme',
        description: 'Build distributed systems',
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');

    const text = await res.text();
    expect(text).toContain('"delta"');
    expect(text).toContain('[DONE]');
  });

  it('forwards AI API errors', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');
    mockFetchError(500);

    const { POST } = await import('../app/api/match/route');

    const res = await POST(
      makeRequest({
        role: 'Engineer',
        description: 'Build stuff',
      }),
    );
    expect(res.status).toBe(500);
  });

  it('defaults company to Unknown when not provided', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');
    vi.stubEnv('AI_BASE_URL', 'https://api.test.ai/v1');
    vi.stubEnv('AI_MODEL', 'test-model');
    mockFetchStream('test');

    const { POST } = await import('../app/api/match/route');

    await POST(
      makeRequest({ role: 'Engineer', description: 'Build stuff' }),
    );

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);

    // The system prompt should contain "Unknown" as company
    expect(body.messages[0].content).toContain('Unknown');
  });
});
