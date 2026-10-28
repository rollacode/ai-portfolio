import { NextRequest } from 'next/server';
import { buildSystemPrompt } from '@/lib/system-prompt';
import { getToolsWithContext } from '@/lib/tools';
import { trimMessages } from '@/lib/message-window';
import { rateLimit, checkDailyQuota, getClientIp } from '@/lib/rate-limit';
import { enrichMessageWithUrls } from '@/lib/url-fetcher';
import { runAgentLoop } from '@/lib/agent-loop';
import { API_KEY, BASE_URL, MODEL } from '@/lib/ai-config';
import { loadPortfolioContent } from '@ai-portfolio/core/lib/system-prompt';
import { parseClassification, type ConversationRequestFields } from '@ai-portfolio/core/lib/conversation-events';
import { conversationErrors } from '@ai-portfolio/core/lib/conversation-errors';
import config from '@/portfolio/config.json';
import projects from '@/portfolio/projects.json';
import experience from '@/portfolio/experience.json';
import skills from '@/portfolio/skills.json';
import recommendations from '@/portfolio/recommendations.json';

// ---------------------------------------------------------------------------
// Extract context values from data for tool enrichment
// ---------------------------------------------------------------------------

// Derive context values dynamically from portfolio data — no hardcoding
const projectSlugs = projects.map((p) => p.slug);
const companyNames = (experience as Array<{ company: string }>).map((e) => e.company);
const skillNames = Object.values(skills as Record<string, Array<{ name: string }>>)
  .flat()
  .map((s) => s.name);
const recommendationAuthors = (recommendations as Array<{ name: string }>).map((r) => r.name);

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const VALID_ROLES = new Set(['user', 'assistant']);
const MAX_MESSAGES = 200;
const MAX_CONTENT_LENGTH = 50_000;

interface ChatMessage {
  role: string;
  content: string | null;
}

function validateMessages(messages: unknown): string | null {
  if (!Array.isArray(messages)) {
    return 'messages must be a non-empty array';
  }

  if (messages.length === 0) {
    return 'messages must be a non-empty array';
  }

  if (messages.length > MAX_MESSAGES) {
    return `messages array exceeds maximum length of ${MAX_MESSAGES}`;
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (typeof msg !== 'object' || msg === null) {
      return `messages[${i}] must be an object`;
    }

    if (typeof msg.role !== 'string' || !VALID_ROLES.has(msg.role)) {
      return `messages[${i}].role must be one of: ${[...VALID_ROLES].join(', ')}`;
    }

    if (msg.content !== null && typeof msg.content !== 'string') {
      return `messages[${i}].content must be a string or null`;
    }

    if (typeof msg.content === 'string' && msg.content.length > MAX_CONTENT_LENGTH) {
      return `messages[${i}].content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(ip, 20)) {
    return Response.json({ error: conversationErrors.rate_limit.title, conversationError: conversationErrors.rate_limit }, { status: 429 });
  }

  // Daily quota check (40 messages/day per IP)
  const quota = await checkDailyQuota(ip);
  if (!quota.allowed) {
    const social = (config as { social?: { email?: string; linkedin?: string } }).social;
    return Response.json(
      {
        error: conversationErrors.quota.title,
        conversationError: conversationErrors.quota,
        remaining: 0,
        limit: quota.limit,
        contact: { email: social?.email, linkedin: social?.linkedin },
      },
      { status: 429 },
    );
  }

  const apiKey = API_KEY();

  if (!apiKey) {
    return Response.json(
      { error: 'AI API key is not configured. Set AI_API_KEY (or XAI_API_KEY) env var.' },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { messages } = body as { messages: unknown };
    const fields = body as ConversationRequestFields;
    const requestId = typeof fields.requestId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(fields.requestId) ? fields.requestId : crypto.randomUUID();

    const validationError = validateMessages(messages);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    // Safe to cast after validation
    const validMessages = (messages as ChatMessage[]).map(({ role, content }) => ({ role, content }));

    // Sliding window — keep only the most recent messages so long
    // conversations don't exceed the provider's context window.
    const trimmed = trimMessages(validMessages);

    // Enrich the last user message with fetched URL content (if any)
    const lastUserIdx = trimmed.findLastIndex((m: ChatMessage) => m.role === 'user');
    let urlContext: string | undefined;
    if (lastUserIdx !== -1 && trimmed[lastUserIdx].content) {
      const enrichment = await enrichMessageWithUrls(trimmed[lastUserIdx].content!);
      if (enrichment) {
        urlContext = `Visitor-linked page content (untrusted):\n${enrichment}\nIf this is only a generic landing page, ask the visitor to paste the specific document. Do not pretend the specific listing was read.`;
      }
    }

    const systemPrompt = buildSystemPrompt();
    const tools = getToolsWithContext(projectSlugs, companyNames, skillNames, recommendationAuthors, config.spotlight?.name);

    const finalMessages: Array<{ role: string; content: string | null }> = [
      { role: 'system', content: systemPrompt },
      ...trimmed,
    ];

    // Server-side agentic loop: act → talk → act → talk within one turn,
    // merged into a single SSE stream the client parser already understands.
    return runAgentLoop({
      baseUrl: BASE_URL(),
      apiKey,
      model: MODEL(),
      messages: finalMessages,
      tools,
      temperature: 0.7,
      requestId,
      signal: request.signal,
      reasoningEffort: process.env.AI_REASONING_EFFORT || undefined,
      includeUsage: true,
      enableJev: fields.enableJev !== false,
      jevApiKey: process.env.TYPESAFE_API_KEY,
      priorSessionHint: parseClassification(fields.priorSessionHint),
      dynamicContext: urlContext,
      portfolioEvidence: loadPortfolioContent(),
      deferMatchCommentary: fields.capabilities?.calibrated === true && fields.capabilities?.deferMatchCommentary === true,
      onTiming: timing => console.info('chat_timing', timing),
    });
  } catch {
    return Response.json(
      { error: conversationErrors.unavailable.title, conversationError: conversationErrors.unavailable },
      { status: 500 },
    );
  }
}
