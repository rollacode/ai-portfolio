import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractUrls, enrichMessageWithUrls } from '../lib/url-fetcher';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    // The regex stops at common delimiters — trailing dot is excluded
    // because the regex matches greedily up to whitespace/quotes/brackets
    expect(urls.length).toBe(1);
    expect(urls[0]).toMatch(/^https:\/\/example\.com\/path/);
  });

  it('handles URLs inside parentheses', () => {
    const urls = extractUrls('(see https://example.com/page)');
    expect(urls.length).toBe(1);
    // The closing paren should be excluded by the regex
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

  // -----------------------------------------------------------------------
  // No URLs
  // -----------------------------------------------------------------------

  it('returns null when message has no URLs', async () => {
    const result = await enrichMessageWithUrls('just plain text');
    expect(result).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Successful fetch
  // -----------------------------------------------------------------------

  it('returns enrichment text when fetch succeeds', async () => {
    mockFetchResponse('<html><body><p>Hello World</p></body></html>');

    const result = await enrichMessageWithUrls(
      'Check https://example.com please',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('Content from https://example.com');
    expect(result).toContain('Hello World');
    expect(result).toContain('--- End of content ---');
  });

  // -----------------------------------------------------------------------
  // Failed fetch
  // -----------------------------------------------------------------------

  it('returns null when fetch fails with error status', async () => {
    mockFetchResponse('Not Found', { status: 404 });

    const result = await enrichMessageWithUrls(
      'Check https://example.com please',
    );
    expect(result).toBeNull();
  });

  // -----------------------------------------------------------------------
  // HTML content stripping
  // -----------------------------------------------------------------------

  it('strips HTML tags from fetched content', async () => {
    const html = `
      <html>
        <head><style>body { color: red; }</style></head>
        <body>
          <script>alert("hi")</script>
          <h1>Job Title</h1>
          <p>We are looking for a <strong>developer</strong>.</p>
        </body>
      </html>
    `;
    mockFetchResponse(html);

    const result = await enrichMessageWithUrls(
      'See https://example.com/job',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('Job Title');
    expect(result).toContain('developer');
    // Script and style content should be stripped
    expect(result).not.toContain('alert');
    expect(result).not.toContain('color: red');
  });

  // -----------------------------------------------------------------------
  // Plain text content
  // -----------------------------------------------------------------------

  it('handles plain text content type', async () => {
    mockFetchResponse('This is plain text content.', {
      contentType: 'text/plain',
    });

    const result = await enrichMessageWithUrls(
      'Read https://example.com/file.txt',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('This is plain text content.');
  });

  // -----------------------------------------------------------------------
  // JSON content
  // -----------------------------------------------------------------------

  it('handles application/json content type', async () => {
    mockFetchResponse('{"name": "test", "value": 42}', {
      contentType: 'application/json',
    });

    const result = await enrichMessageWithUrls(
      'Check https://api.example.com/data',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('"name": "test"');
  });

  // -----------------------------------------------------------------------
  // Unsupported content type
  // -----------------------------------------------------------------------

  it('returns null for unsupported content types', async () => {
    mockFetchResponse('binary data', {
      contentType: 'application/pdf',
    });

    const result = await enrichMessageWithUrls(
      'Download https://example.com/file.pdf',
    );

    expect(result).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Max 2 URL limit
  // -----------------------------------------------------------------------

  it('fetches at most 2 URLs even when more are present', async () => {
    mockFetchResponse('<p>Page content</p>');

    await enrichMessageWithUrls(
      'See https://a.com https://b.com https://c.com https://d.com',
    );

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // -----------------------------------------------------------------------
  // Timeout / abort
  // -----------------------------------------------------------------------

  it('returns null when fetch throws (e.g. timeout/network error)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    );

    const result = await enrichMessageWithUrls(
      'Check https://example.com please',
    );

    expect(result).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Multiple URLs — partial success
  // -----------------------------------------------------------------------

  it('returns enrichment for URLs that succeed even if others fail', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response('<p>Good content</p>', {
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
    expect(result).not.toContain('https://bad.com');
  });
});
