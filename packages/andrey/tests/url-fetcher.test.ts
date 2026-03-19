import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractUrls, enrichMessageWithUrls } from '../lib/url-fetcher';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LONG_TEXT = 'This is a detailed job posting for a Senior Full-Stack Developer. ' +
  'We are looking for someone with 5+ years of experience in React, TypeScript, and Node.js. ' +
  'The ideal candidate will have strong problem-solving skills and experience with cloud services. ' +
  'Join our team and work on exciting projects that impact millions of users worldwide.';

function mockFetchResponse(
  body: string,
  options: { status?: number; contentType?: string } = {},
): void {
  const { status = 200, contentType = 'text/html' } = options;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(body, {
        status,
        headers: { 'Content-Type': contentType },
      }),
    ),
  );
}

function wrapHtml(text: string): string {
  return `<html><body><p>${text}</p></body></html>`;
}

// ---------------------------------------------------------------------------
// extractUrls
// ---------------------------------------------------------------------------

describe('extractUrls', () => {
  it('finds a single URL in text', () => {
    const urls = extractUrls('Check out https://example.com for details');
    expect(urls).toEqual(['https://example.com']);
  });

  it('finds multiple URLs in text', () => {
    const urls = extractUrls(
      'See https://example.com and http://other.org/page for more',
    );
    expect(urls).toEqual(['https://example.com', 'http://other.org/page']);
  });

  it('deduplicates identical URLs', () => {
    const urls = extractUrls(
      'Visit https://example.com and again https://example.com',
    );
    expect(urls).toEqual(['https://example.com']);
  });

  it('returns empty array when no URLs are present', () => {
    expect(extractUrls('just some plain text')).toEqual([]);
    expect(extractUrls('')).toEqual([]);
  });

  it('handles URLs with trailing punctuation', () => {
    const urls = extractUrls('Go to https://example.com/path.');
    expect(urls.length).toBe(1);
    expect(urls[0]).toMatch(/^https:\/\/example\.com\/path/);
  });

  it('handles URLs inside parentheses', () => {
    const urls = extractUrls('(see https://example.com/page)');
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://example.com/page');
  });
});

// ---------------------------------------------------------------------------
// enrichMessageWithUrls
// ---------------------------------------------------------------------------

describe('enrichMessageWithUrls', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns null when message has no URLs', async () => {
    const result = await enrichMessageWithUrls('just plain text');
    expect(result).toBeNull();
  });

  it('returns enrichment text when fetch succeeds with enough content', async () => {
    mockFetchResponse(wrapHtml(LONG_TEXT));

    const result = await enrichMessageWithUrls(
      'Check https://example.com please',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('Content from https://example.com');
    expect(result).toContain('Senior Full-Stack Developer');
    expect(result).toContain('--- End of content ---');
  });

  it('reports failure when fetch returns error status', async () => {
    mockFetchResponse('Not Found', { status: 404 });

    const result = await enrichMessageWithUrls(
      'Check https://example.com please',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('Could not read https://example.com');
  });

  it('reports failure when HTML content is too short (SPA stub)', async () => {
    mockFetchResponse('<html><body><div id="app"></div></body></html>');

    const result = await enrichMessageWithUrls(
      'Check https://spa-app.com please',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('Could not read https://spa-app.com');
  });

  it('strips HTML tags, scripts, and styles from fetched content', async () => {
    const html = `
      <html>
        <head><style>body { color: red; }</style></head>
        <body>
          <script>alert("hi")</script>
          <h1>Job Title</h1>
          <p>${LONG_TEXT}</p>
        </body>
      </html>
    `;
    mockFetchResponse(html);

    const result = await enrichMessageWithUrls(
      'See https://example.com/job',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('Job Title');
    expect(result).toContain('Senior Full-Stack Developer');
    expect(result).not.toContain('alert');
    expect(result).not.toContain('color: red');
  });

  it('handles plain text content type', async () => {
    mockFetchResponse(LONG_TEXT, { contentType: 'text/plain' });

    const result = await enrichMessageWithUrls(
      'Read https://example.com/file.txt',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('Senior Full-Stack Developer');
  });

  it('handles application/json content type', async () => {
    const json = JSON.stringify({ title: 'Engineer', description: LONG_TEXT });
    mockFetchResponse(json, { contentType: 'application/json' });

    const result = await enrichMessageWithUrls(
      'Check https://api.example.com/data',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('Engineer');
  });

  it('reports failure for unsupported content types', async () => {
    mockFetchResponse('binary data', { contentType: 'application/pdf' });

    const result = await enrichMessageWithUrls(
      'Download https://example.com/file.pdf',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('Could not read');
  });

  it('fetches at most 2 URLs even when more are present', async () => {
    mockFetchResponse(wrapHtml(LONG_TEXT));

    await enrichMessageWithUrls(
      'See https://a.com https://b.com https://c.com https://d.com',
    );

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports failure when fetch throws (timeout/network error)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    );

    const result = await enrichMessageWithUrls(
      'Check https://example.com please',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('Could not read https://example.com');
  });

  it('returns enrichment for succeeded URLs and failure notes for failed ones', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(wrapHtml(LONG_TEXT), {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('Not Found', { status: 404 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await enrichMessageWithUrls(
      'See https://good.com and https://bad.com',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('Content from https://good.com');
    expect(result).toContain('Could not read https://bad.com');
  });
});
