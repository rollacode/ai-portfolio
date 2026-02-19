import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock dependencies that the chat route imports at module level
// ---------------------------------------------------------------------------

vi.mock('../lib/system-prompt', () => ({
  buildSystemPrompt: () => 'You are a test assistant.',
}));

vi.mock('../lib/tools', () => ({
  getToolsWithContext: () => [
    {
      type: 'function',
      function: { name: 'test_tool', description: 'A test tool', parameters: {} },
    },
  ],
}));

vi.mock('../portfolio/projects.json', () => ({
  default: [{ slug: 'test-project' }],
}));

vi.mock('../portfolio/experience.json', () => ({
  default: [{ company: 'TestCo' }],
}));

vi.mock('../portfolio/skills.json', () => ({
  default: { primary: [{ name: 'TypeScript' }] },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeBrokenRequest(): NextRequest {
  // NextRequest with invalid JSON — send raw string that isn't JSON
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '<<<not json>>>',
  });
}

function mockFetchSuccess(body?: BodyInit | null): void {
  const stream =
    body ??
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[]}\n\n'));
        controller.close();
      },
    });

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    ),
  );
}

function mockFetchError(status: number, body = 'upstream error'): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(body, { status })),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/chat', () => {
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

  // -----------------------------------------------------------------------
  // 1. No API key
  // -----------------------------------------------------------------------

  it('returns 500 with helpful message when no API key is set', async () => {
    vi.stubEnv('AI_API_KEY', '');
    vi.stubEnv('XAI_API_KEY', '');

    // Dynamic import to pick up fresh env each time
    const { POST } = await import('../app/api/chat/route');

    const res = await POST(makeRequest({ messages: [{ role: 'user', content: 'hi' }] }));
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toMatch(/API key/i);
  });

  // -----------------------------------------------------------------------
  // 2. Calls AI API with correct payload
  // -----------------------------------------------------------------------

  it('calls AI API with correct payload', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key-123');
    vi.stubEnv('AI_BASE_URL', 'https://api.test.ai/v1');
    vi.stubEnv('AI_MODEL', 'test-model');
    mockFetchSuccess();

    const { POST } = await import('../app/api/chat/route');

    const messages = [{ role: 'user', content: 'Tell me about yourself' }];
    await POST(makeRequest({ messages }));

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test.ai/v1/chat/completions');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer test-key-123');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('test-model');
    expect(body.stream).toBe(true);
    expect(body.tools).toBeDefined();
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Tell me about yourself' });
  });

  // -----------------------------------------------------------------------
  // 3. Returns SSE stream headers on success
  // -----------------------------------------------------------------------

  it('returns SSE stream headers on success', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');
    mockFetchSuccess();

    const { POST } = await import('../app/api/chat/route');

    const res = await POST(makeRequest({ messages: [{ role: 'user', content: 'hi' }] }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
  });

  // -----------------------------------------------------------------------
  // 4. Forwards AI API error status
  // -----------------------------------------------------------------------

  it('forwards AI API error status', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');
    mockFetchError(429, 'rate limited');

    const { POST } = await import('../app/api/chat/route');

    const res = await POST(makeRequest({ messages: [{ role: 'user', content: 'hi' }] }));
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.error).toMatch(/429/);
    expect(json.detail).toBe('rate limited');
  });

  // -----------------------------------------------------------------------
  // 5. Returns 500 on request parse error
  // -----------------------------------------------------------------------

  it('returns 500 on invalid JSON body', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');

    const { POST } = await import('../app/api/chat/route');

    const res = await POST(makeBrokenRequest());
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBeTruthy();
  });
});
