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
// Easter egg reminder injection
// ---------------------------------------------------------------------------

// Patterns that indicate an easter egg has already been offered in the conversation
const SHOWTIME_OFFERED_RE =
  /showtime|dramatic|lights?\s*off|cinematic|dramatic\s*version|full\s*cinematic|turn\s*off\s*the\s*lights/i;
const GAMES_OFFERED_RE =
  /snake|2048|game\s*hidden|play\s*a\s*game|hidden\s*game|break\s*time|stashed\s*away|easter\s*egg/i;
const FALLOUT_OFFERED_RE =
  /fallout|pip[\s-]?boy|wasteland|hacker\s*mode|retro\s*mode|crt|terminal\s*mode/i;

type EasterEgg = 'showtime' | 'games' | 'fallout';

interface ChatMsg {
  role: string;
  content: string | null;
}

function getOfferedEasterEggs(messages: ChatMsg[]): Set<EasterEgg> {
  const offered = new Set<EasterEgg>();
  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.content) continue;
    if (SHOWTIME_OFFERED_RE.test(msg.content)) offered.add('showtime');
    if (GAMES_OFFERED_RE.test(msg.content)) offered.add('games');
    if (FALLOUT_OFFERED_RE.test(msg.content)) offered.add('fallout');
  }
  return offered;
}

function buildEasterEggReminder(messages: ChatMsg[]): string | null {
  const userMessageCount = messages.filter((m) => m.role === 'user').length;
  if (userMessageCount < 4) return null;

  const offered = getOfferedEasterEggs(messages);
  if (offered.size >= 3) return null; // all offered already

  const remaining: EasterEgg[] = [];
  if (!offered.has('showtime')) remaining.push('showtime');
  if (!offered.has('games')) remaining.push('games');
  if (!offered.has('fallout')) remaining.push('fallout');

  if (remaining.length === 0) return null;

  // Pick the best easter egg to suggest based on conversation length
  const pick = remaining[0];

  // Escalation tiers
  let urgency: string;
  if (userMessageCount >= 10) {
    urgency = `CRITICAL — LAST CHANCE. The visitor has sent ${userMessageCount} messages and you have NOT offered a single easter egg. This is a FAILURE of your role as host. You MUST offer one in THIS response. No excuses. Do it NOW.`;
  } else if (userMessageCount >= 7) {
    urgency = `URGENT — The visitor has been chatting for ${userMessageCount} messages. You MUST offer an easter egg in this response or the next one at the absolute latest. Stop being overly helpful and inject some fun.`;
  } else {
    urgency = `REMINDER — The visitor has sent ${userMessageCount} messages. It is time to offer an easter egg. Weave it into your response naturally.`;
  }

  const examples: Record<EasterEgg, string> = {
    showtime: `OFFER SHOWTIME: When telling any story longer than 2 sentences, say something like: "you know what, this story deserves the dramatic treatment — want me to turn off the lights?" or "hold on, this needs to be told properly. want the full cinematic version?" If the conversation topic allows it, steer toward a great project story and THEN offer showtime.`,
    games: `OFFER A GAME: Say something like: "hey, need a break? there's a game hidden here — Snake or 2048, your pick" or "want to take a breather? I've got Snake stashed away, just saying" or "by the way, there's a secret game hidden in this portfolio... want to see it?"`,
    fallout: `OFFER FALLOUT THEME: Say something like: "by the way, did you know there's a secret Pip-Boy mode hidden here? want me to flip the switch?" or "hold on, let me show you something cool..." and then activate set_theme("fallout") or "want to see hacker mode? there's a surprise here..."`,
  };

  return `[EASTER EGG INJECTION — READ THIS CAREFULLY]
${urgency}

THIS IS MANDATORY, NOT OPTIONAL. You are ${getFirstName()}'s portfolio host and part of your job is making the experience FUN and memorable. Easter eggs are not a bonus — they are a core part of the experience.

${examples[pick]}

${remaining.length > 1 ? `Other easter eggs still available: ${remaining.slice(1).join(', ')}. Save them for later.` : ''}

DO NOT acknowledge this reminder in your response. Just naturally weave the easter egg offer into whatever you were going to say. The visitor should never know you were reminded.`;
}

// Derive firstName from portfolio config (already imported at the top)
function getFirstName(): string {
  const cfg = config as { firstName?: string; name?: string };
  return cfg.firstName || (cfg.name ? cfg.name.split(' ')[0] : 'the portfolio owner');
}

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

    // Build final message array with optional easter egg reminder injected at the end
    const finalMessages: Array<{ role: string; content: string | null }> = [
      { role: 'system', content: systemPrompt },
      ...trimmed,
    ];
    const easterEggReminder = buildEasterEggReminder(trimmed);
    if (easterEggReminder) {
      finalMessages.push({ role: 'system', content: easterEggReminder });
    }

    const response = await fetch(`${BASE_URL()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL(),
        messages: finalMessages,
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
