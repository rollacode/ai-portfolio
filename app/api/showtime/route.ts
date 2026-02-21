/* ------------------------------------------------------------------ */
/*  POST /api/showtime — dramatic storytelling SSE stream              */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { buildShowtimePrompt } from '@/lib/showtime-prompt';

const API_KEY = process.env.AI_API_KEY || process.env.XAI_API_KEY;
const BASE_URL =
  process.env.AI_BASE_URL || process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const MODEL =
  process.env.AI_MODEL || process.env.XAI_MODEL || 'grok-3-mini-fast';

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 },
    );
  }

  let topic: string;
  let intent: string | undefined;
  let language: string | undefined;

  try {
    const body = await req.json();
    topic = body.topic;
    intent = body.intent;
    language = body.language;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!topic || typeof topic !== 'string') {
    return NextResponse.json(
      { error: 'topic is required' },
      { status: 400 },
    );
  }

  const systemPrompt = buildShowtimePrompt(topic, intent, language);

  const aiResponse = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      temperature: 0.8,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Tell the story of: ${topic}` },
      ],
    }),
  });

  if (!aiResponse.ok || !aiResponse.body) {
    const errorText = await aiResponse.text().catch(() => 'Unknown error');
    return NextResponse.json({ error: errorText }, { status: aiResponse.status });
  }

  /* Stream through — extract content deltas, re-encode as simplified SSE */
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      const reader = aiResponse.body!.getReader();
      let buffer = '';

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
                );
              }
            } catch {
              /* skip malformed chunks */
            }
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: String(err) })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
