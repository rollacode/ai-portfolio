// ---------------------------------------------------------------------------
// URL detection & content extraction for chat messages
//
// Scans user messages for URLs, fetches them server-side, and returns
// extracted text so the AI agent can see the page content as context.
// ---------------------------------------------------------------------------

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

const FETCH_TIMEOUT = 8000;
const MAX_CONTENT_LENGTH = 12000; // chars — enough for a job posting or resume

/**
 * Extract URLs from a text message.
 */
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  // Deduplicate
  return [...new Set(matches)];
}

/**
 * Strip HTML tags, scripts, styles, and collapse whitespace into readable text.
 */
function htmlToText(html: string): string {
  return html
    // Remove script/style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    // Replace common block elements with newlines
    .replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Fetch a URL and extract readable text content.
 * Returns null if fetch fails or content is not HTML/text.
 */
async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PortfolioBot/1.0)',
        Accept: 'text/html, text/plain, application/json',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';

    // Only process text-based content
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/json')
    ) {
      return null;
    }

    const raw = await res.text();

    if (contentType.includes('text/plain') || contentType.includes('application/json')) {
      return raw.slice(0, MAX_CONTENT_LENGTH);
    }

    const text = htmlToText(raw);
    return text.slice(0, MAX_CONTENT_LENGTH) || null;
  } catch {
    return null;
  }
}

/**
 * Scan a message for URLs, fetch their content, and return enrichment text.
 * Returns null if no URLs found or all fetches failed.
 */
export async function enrichMessageWithUrls(message: string): Promise<string | null> {
  const urls = extractUrls(message);
  if (urls.length === 0) return null;

  // Fetch up to 2 URLs in parallel (avoid abuse)
  const fetches = urls.slice(0, 2).map(async (url) => {
    const content = await fetchUrlContent(url);
    return content ? { url, content } : null;
  });

  const results = (await Promise.all(fetches)).filter(Boolean) as {
    url: string;
    content: string;
  }[];

  if (results.length === 0) return null;

  const parts = results.map(
    (r) => `--- Content from ${r.url} ---\n${r.content}\n--- End of content ---`,
  );

  return parts.join('\n\n');
}
