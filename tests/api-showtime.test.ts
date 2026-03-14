import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

vi.mock('../lib/showtime-prompt', () => ({
  buildShowtimePrompt: () => 'You are a dramatic storyteller.',
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/showtime', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeBrokenRequest(): NextRequest {
  return new NextRequest('http://localhost/api/showtime', {
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
//
// NOTE: The showtime route reads env vars at MODULE LEVEL (not lazily),
// so we must vi.resetModules() + set env BEFORE each dynamic import.
// ---------------------------------------------------------------------------

describe('POST /api/showtime', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns 500 when no API key is set', async () => {
    vi.stubEnv('AI_API_KEY', '');
    vi.stubEnv('XAI_API_KEY', '');

    const { POST } = await import('../app/api/showtime/route');

    const res = await POST(makeRequest({ topic: 'My career' }));
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toMatch(/API key/i);
  });

  it('returns 400 on invalid JSON body', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');

    const { POST } = await import('../app/api/showtime/route');

    const res = await POST(makeBrokenRequest());
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toMatch(/JSON/i);
  });

  it('returns 400 when topic is missing', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');

    const { POST } = await import('../app/api/showtime/route');

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toMatch(/topic/i);
  });

  it('returns 400 when topic is not a string', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');

    const { POST } = await import('../app/api/showtime/route');

    const res = await POST(makeRequest({ topic: 123 }));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toMatch(/topic/i);
  });

  it('streams SSE response on success', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');
    vi.stubEnv('AI_BASE_URL', 'https://api.test.ai/v1');
    mockFetchStream('Once upon a time...');

    const { POST } = await import('../app/api/showtime/route');

    const res = await POST(makeRequest({ topic: 'My career' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');

    const text = await res.text();
    expect(text).toContain('"delta"');
  });

  it('forwards AI API error status', async () => {
    vi.stubEnv('AI_API_KEY', 'test-key');
    mockFetchError(503);

    const { POST } = await import('../app/api/showtime/route');

    const res = await POST(makeRequest({ topic: 'My career' }));
    expect(res.status).toBe(503);
  });
});
