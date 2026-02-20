import { NextRequest } from 'next/server';
import { loadPortfolioContent } from '@/lib/system-prompt';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import config from '@/portfolio/config.json';

// ---------------------------------------------------------------------------
// Env helpers (same as chat route — AI_* with XAI_* fallbacks)
// ---------------------------------------------------------------------------

function env(key: string, fallbackKey: string, defaultValue?: string): string {
  return process.env[key] || process.env[fallbackKey] || defaultValue || '';
}

const API_KEY = () => env('AI_API_KEY', 'XAI_API_KEY');
const BASE_URL = () => env('AI_BASE_URL', 'XAI_BASE_URL', 'https://api.x.ai/v1');
const MODEL = () => env('AI_MODEL', 'XAI_MODEL', 'grok-3-mini-fast');

// ---------------------------------------------------------------------------
// Insight system prompt builder
// ---------------------------------------------------------------------------

function buildInsightPrompt(
  topic: string,
  intent: string,
  visitorContext: string | null,
  portfolioData: string,
  language: string = 'en',
): string {
  const languageInstruction =
    language === 'ru' ? 'Russian' : language === 'en' ? 'English' : language;

  const firstName = (config as { firstName?: string }).firstName || 'the developer';

  return `You are a portfolio insight analyst for ${firstName}. Analyze the portfolio data and generate a structured insight card.

OUTPUT FORMAT:
Write your response using these exact section headers (## followed by the section name in caps). Write naturally within each section.

## HEADLINE
<One compelling line summarizing the insight>

## METRICS
years: <number> | projects: <number> | level: <expert/professional/familiar>

## NARRATIVE
<2-3 paragraphs of analysis. Be specific — reference real projects, achievements, and numbers. Tailor to the visitor's intent. This is the main content.>

## PROJECTS
- <project-slug> | <Project Name> | <One sentence why relevant>
- <project-slug> | <Project Name> | <One sentence why relevant>

## QUOTES
- <Author Name>, <Their Title at Company> | "<relevant quote from recommendations>"

## CONNECTIONS
- <Surprising cross-reference insight 1>
- <Surprising cross-reference insight 2>

RULES:
- Write ALL sections in order. Do NOT skip HEADLINE, METRICS, or NARRATIVE.
- QUOTES is optional — only include if genuinely relevant recommendations exist. Skip the header entirely if none.
- CONNECTIONS should be surprising cross-references between different parts of the portfolio.
- Output ONLY the sections above. No extra commentary, no code fences, no intro/outro text.

LANGUAGE:
Write ALL content in ${languageInstruction}. Section headers (## HEADLINE etc.) stay in English.

VISITOR CONTEXT:
Topic: ${topic}
Intent: ${intent}
Visitor: ${visitorContext || 'Unknown visitor'}

PORTFOLIO DATA:
${portfolioData}`;
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

function sseErrorResponse(message: string, status: number = 500): Response {
  const encoder = new TextEncoder();
  const errorPayload = JSON.stringify({ error: message });
  const body = encoder.encode(`data: ${errorPayload}\n\ndata: [DONE]\n\n`);
  return new Response(body, { status, headers: SSE_HEADERS });
}

// ---------------------------------------------------------------------------
// POST /api/insight
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Rate limit (10 req/min — insights are expensive)
  const ip = getClientIp(request);
  if (!rateLimit(ip, 10)) {
    return sseErrorResponse('Too many requests', 429);
  }

  // 2. Validate API key
  const apiKey = API_KEY();
  if (!apiKey) {
    return sseErrorResponse('AI API key is not configured', 500);
  }

  // 3. Parse & validate body
  let topic: string;
  let intent: string;
  let visitor_context: string | null;
  let language: string;

  try {
    const body = await request.json();
    topic = body.topic;
    intent = body.intent;
    visitor_context = body.visitor_context ?? null;
    language = body.language || 'en';
  } catch {
    return sseErrorResponse('Invalid JSON body', 400);
  }

  if (!topic || !intent) {
    return sseErrorResponse('topic and intent are required', 400);
  }

  try {
    // 4. Load portfolio data
    const portfolioData = loadPortfolioContent();

    // 5. Build insight-specific system prompt
    const systemPrompt = buildInsightPrompt(topic, intent, visitor_context, portfolioData, language);

    // 6. Call AI provider with streaming
    const response = await fetch(`${BASE_URL()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate an insight card about: ${topic}` },
        ],
        stream: true,
        temperature: 0.4,
      }),
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.text();
      console.error('Insight AI API error:', response.status, errorBody);
      return sseErrorResponse(`AI API error: ${response.status}`, response.status);
    }

    // 7. Dumb pipe: forward every text delta immediately as SSE
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let sseBuffer = '';

    const stream = new ReadableStream({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') continue;

            try {
              const chunk = JSON.parse(payload);
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                // Forward immediately — no buffering!
                const escaped = JSON.stringify(delta);
                controller.enqueue(encoder.encode(`data: {"delta":${escaped}}\n\n`));
              }
            } catch {
              // skip malformed
            }
          }
        }
      },
      cancel() {
        reader.cancel();
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (error) {
    console.error('Insight API error:', error);
    return sseErrorResponse('Failed to generate insight', 500);
  }
}
