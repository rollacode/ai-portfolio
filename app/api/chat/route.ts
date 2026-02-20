import { NextRequest } from 'next/server';
import { buildSystemPrompt } from '@/lib/system-prompt';
import { getToolsWithContext } from '@/lib/tools';
import { trimMessages } from '@/lib/message-window';
import { rateLimit, checkDailyQuota, getClientIp } from '@/lib/rate-limit';
import config from '@/portfolio/config.json';
import projects from '@/portfolio/projects.json';
import experience from '@/portfolio/experience.json';
import skills from '@/portfolio/skills.json';
import recommendations from '@/portfolio/recommendations.json';

// ---------------------------------------------------------------------------
// Multi-provider AI support
//
// This route works with ANY OpenAI-compatible chat completions API.
// Just set three env vars: AI_API_KEY, AI_BASE_URL, AI_MODEL.
//
// Supported providers (set AI_BASE_URL and AI_MODEL in .env):
// - xAI/Grok:     AI_BASE_URL=https://api.x.ai/v1              AI_MODEL=grok-3-mini-fast
// - OpenAI:       AI_BASE_URL=https://api.openai.com/v1         AI_MODEL=gpt-4o-mini
// - Groq:         AI_BASE_URL=https://api.groq.com/openai/v1    AI_MODEL=llama-3.1-70b-versatile
// - Together:     AI_BASE_URL=https://api.together.xyz/v1       AI_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
// - Local/Ollama: AI_BASE_URL=http://localhost:11434/v1          AI_MODEL=llama3.1
//
// All providers use the same Authorization: Bearer header and
// POST /chat/completions endpoint. No provider-specific logic needed.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Env helpers (AI_* with XAI_* fallbacks for backward compat)
// ---------------------------------------------------------------------------

function env(key: string, fallbackKey: string, defaultValue?: string): string {
  return process.env[key] || process.env[fallbackKey] || defaultValue || '';
}

const API_KEY = () => env('AI_API_KEY', 'XAI_API_KEY');
const BASE_URL = () => env('AI_BASE_URL', 'XAI_BASE_URL', 'https://api.x.ai/v1');
const MODEL = () => env('AI_MODEL', 'XAI_MODEL', 'grok-3-mini-fast');

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

const VALID_ROLES = new Set(['user', 'assistant', 'system', 'tool']);
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

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(ip, 20)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Daily quota check (40 messages/day per IP)
  const quota = await checkDailyQuota(ip);
  if (!quota.allowed) {
    const social = (config as { social?: { email?: string; linkedin?: string } }).social;
    return Response.json(
      {
        error: 'Daily message limit reached. Come back tomorrow!',
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

    const validationError = validateMessages(messages);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    // Safe to cast after validation
    const validMessages = messages as ChatMessage[];

    // Sliding window — keep only the most recent messages so long
    // conversations don't exceed the provider's context window.
    const trimmed = trimMessages(validMessages);

    const systemPrompt = buildSystemPrompt();
    const tools = getToolsWithContext(projectSlugs, companyNames, skillNames, recommendationAuthors);

    const response = await fetch(`${BASE_URL()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL(),
        messages: [{ role: 'system', content: systemPrompt }, ...trimmed],
        tools,
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return Response.json(
        { error: `AI API error: ${response.status}`, detail: errorBody },
        { status: response.status },
      );
    }

    // Pipe the raw SSE stream straight through — the client-side parser
    // handles content deltas and tool_calls from the chunked response.
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
