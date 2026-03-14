// ---------------------------------------------------------------------------
// URL detection & content extraction for chat messages
//
// Scans user messages for URLs, fetches them server-side, and returns
// extracted text so the AI agent can see the page content as context.
// ---------------------------------------------------------------------------

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

const FETCH_TIMEOUT = 8000;
const MAX_CONTENT_LENGTH = 12000; // chars — enough for a job posting or resume
const MIN_USEFUL_LENGTH = 200; // chars — below this, content is likely a shell/SPA stub

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
 * Try to fetch a job posting from Ashby's public GraphQL API.
 * Works for URLs containing ashby_jid query param (e.g. lavendo.io, etc.)
 */
async function tryAshbyJobPosting(url: string): Promise<string | null> {
  try {
    const parsed = new URL(url);
    const jid = parsed.searchParams.get('ashby_jid');
    if (!jid) return null;

    // Extract org name from hostname (e.g. lavendo.io -> lavendo)
    const hostname = parsed.hostname.replace('www.', '');
    const org = hostname.split('.')[0];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch('https://jobs.ashbyhq.com/api/non-user-graphql', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationName: 'ApiJobPosting',
        variables: {
          organizationHostedJobsPageName: org,
          jobPostingId: jid,
        },
        query: `query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
          jobPosting(organizationHostedJobsPageName: $organizationHostedJobsPageName, jobPostingId: $jobPostingId) {
            title descriptionHtml locationName employmentType departmentName
          }
        }`,
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    const job = data?.data?.jobPosting;
    if (!job?.title) return null;

    const description = htmlToText(job.descriptionHtml || '');
    const lines = [
      `Job Title: ${job.title}`,
      job.departmentName ? `Department: ${job.departmentName}` : '',
      job.locationName ? `Location: ${job.locationName}` : '',
      job.employmentType ? `Type: ${job.employmentType}` : '',
      '',
      description,
    ].filter(Boolean);

    return lines.join('\n').slice(0, MAX_CONTENT_LENGTH);
  } catch {
    return null;
  }
}

/**
 * Fetch a URL and extract readable text content.
 * Returns null if fetch fails or content is not HTML/text.
 */
async function fetchUrlContent(url: string): Promise<string | null> {
  // Try known job board APIs first (handles SPA sites like Ashby-powered boards)
  const ashbyResult = await tryAshbyJobPosting(url);
  if (ashbyResult) return ashbyResult;

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
    if (!text || text.length < MIN_USEFUL_LENGTH) return null;
    return text.slice(0, MAX_CONTENT_LENGTH);
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
  const toFetch = urls.slice(0, 2);
  const fetches = toFetch.map(async (url) => {
    const content = await fetchUrlContent(url);
    return { url, content };
  });

  const results = await Promise.all(fetches);
  const succeeded = results.filter((r) => r.content !== null);
  const failed = results.filter((r) => r.content === null);

  const parts: string[] = [];

  for (const r of succeeded) {
    parts.push(`--- Content from ${r.url} ---\n${r.content}\n--- End of content ---`);
  }

  for (const r of failed) {
    parts.push(
      `--- Could not read ${r.url} ---\nThe page could not be fetched or is a JavaScript-rendered app (SPA) whose content is not available via server-side fetch. Tell the visitor you couldn't access this link and ask them to paste the relevant text directly.\n--- End ---`,
    );
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}
