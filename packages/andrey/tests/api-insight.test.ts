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
  return new NextRequest('http://localhost/api/insight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeBrokenRequest(): NextRequest {
  return new NextRequest('http://localhost/api/insight', {
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

describe('POST /api/insight', () => {
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
    vi.stubEnv('AI_API_KEY', '');
    vi.stubEnv('XAI_API_KEY', '');

    const { POST } = await import('../app/api/insight/route');

    const res = await POST(
      makeRequest({ topic: 'React', intent: 'hiring' }),
    );
    expect(res.status).toBe(500);

    const text = await res.text();
    expect(text).toContain('API key');
  });

  it('returns 400 on invalid JSON body', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');

    const { POST } = await import('../app/api/insight/route');

    const res = await POST(makeBrokenRequest());
    expect(res.status).toBe(400);

    const text = await res.text();
    expect(text).toContain('Invalid JSON');
  });

  it('returns 400 when topic is missing', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');

    const { POST } = await import('../app/api/insight/route');

    const res = await POST(makeRequest({ intent: 'hiring' }));
    expect(res.status).toBe(400);

    const text = await res.text();
    expect(text).toContain('topic');
  });

  it('returns 400 when intent is missing', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');

    const { POST } = await import('../app/api/insight/route');

    const res = await POST(makeRequest({ topic: 'React' }));
    expect(res.status).toBe(400);

    const text = await res.text();
    expect(text).toContain('intent');
  });

  it('streams SSE response on success', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');
    vi.stubEnv('AI_BASE_URL', 'https://api.test.ai/v1');
    mockFetchStream('Hello world');

    const { POST } = await import('../app/api/insight/route');

    const res = await POST(
      makeRequest({ topic: 'React', intent: 'hiring' }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');

    // Read the stream to verify delta forwarding
    const text = await res.text();
    expect(text).toContain('"delta"');
    expect(text).toContain('[DONE]');
  });

  it('forwards AI API errors', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');
    mockFetchError(503);

    const { POST } = await import('../app/api/insight/route');

    const res = await POST(
      makeRequest({ topic: 'React', intent: 'hiring' }),
    );
    expect(res.status).toBe(503);
  });

  it('calls AI API with correct URL and payload', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');
    vi.stubEnv('AI_BASE_URL', 'https://api.test.ai/v1');
    vi.stubEnv('AI_MODEL', 'test-model');
    mockFetchStream('test');

    const { POST } = await import('../app/api/insight/route');

    await POST(
      makeRequest({
        topic: 'TypeScript',
        intent: 'hiring',
        visitor_context: 'CTO at Acme',
        language: 'en',
      }),
    );

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test.ai/v1/chat/completions');
    expect(options.headers['Authorization']).toBe('Bearer test-key');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('test-model');
    expect(body.stream).toBe(true);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('TypeScript');
  });
});
