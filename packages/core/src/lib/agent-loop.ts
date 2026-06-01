// Server-side agentic tool loop.
//
// A tool-calling model ends its completion with finish_reason "tool_calls" and
// writes no text — narration comes in a follow-up completion after tool results
// are returned. This runs that loop on the server and emits a SINGLE merged SSE
// stream to the client (tool_calls of round 1 → text → tool_calls of round 2 …),
// so the existing client parser needs no changes.

import { SSE_HEADERS } from './ai-config';

type LoopMessage = {
  role: string;
  content: string | null;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
};

export interface AgentLoopOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string | null }>;
  tools: unknown[];
  temperature?: number;
  maxRounds?: number;
}

interface RoundResult {
  content: string;
  toolCalls: Array<{ id: string; name: string; arguments: string }>;
  finishReason: string | null;
}

const encoder = new TextEncoder();

function callUpstream(opts: AgentLoopOptions, messages: LoopMessage[]): Promise<Response> {
  return fetch(`${opts.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages,
      tools: opts.tools,
      stream: true,
      temperature: opts.temperature ?? 0.7,
    }),
  });
}

function emitText(controller: ReadableStreamDefaultController, text: string): void {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
}

// Reads one upstream SSE response, forwards every chunk except [DONE] to the
// client, and accumulates the round's content, tool_calls, and finish_reason.
async function pumpRound(
  upstream: Response,
  controller: ReadableStreamDefaultController,
): Promise<RoundResult> {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const result: RoundResult = { content: '', toolCalls: [], finishReason: null };
  const byIndex = new Map<number, { id: string; name: string; arguments: string }>();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice('data:'.length).trim();

      // Swallow per-round DONE — the loop emits a single terminal DONE itself.
      if (payload === '[DONE]') continue;

      // Forward verbatim so the client streams content + tool_calls live.
      controller.enqueue(encoder.encode(`data: ${payload}\n\n`));

      let data: { choices?: Array<{ delta?: { content?: string; tool_calls?: Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string } }> }; finish_reason?: string }> };
      try {
        data = JSON.parse(payload);
      } catch {
        continue;
      }

      const choice = data?.choices?.[0];
      const delta = choice?.delta;
      if (delta?.content) result.content += delta.content;
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (tc.id && tc.function?.name) {
            byIndex.set(idx, { id: tc.id, name: tc.function.name, arguments: tc.function.arguments ?? '' });
          } else if (tc.function?.arguments != null) {
            const entry = byIndex.get(idx);
            if (entry) entry.arguments += tc.function.arguments;
          }
        }
      }
      if (choice?.finish_reason) result.finishReason = choice.finish_reason;
    }
  }

  result.toolCalls = [...byIndex.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  return result;
}

export async function runAgentLoop(opts: AgentLoopOptions): Promise<Response> {
  const maxRounds = opts.maxRounds ?? 6;
  const messages: LoopMessage[] = [...opts.messages];

  // First round runs before returning so a provider error becomes a clean JSON
  // response with the upstream status (matches the prior non-streaming behavior).
  const first = await callUpstream(opts, messages);
  if (!first.ok) {
    const detail = await first.text();
    return Response.json({ error: `AI API error: ${first.status}`, detail }, { status: first.status });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let upstream = first;
        for (let round = 1; round <= maxRounds; round++) {
          const { content, toolCalls } = await pumpRound(upstream, controller);

          // No tools requested → the model is done talking.
          if (toolCalls.length === 0) break;

          // Tools requested but we are out of rounds → stop without another call.
          if (round === maxRounds) break;

          messages.push({
            role: 'assistant',
            content: content || '',
            tool_calls: toolCalls.map((t) => ({
              id: t.id,
              type: 'function',
              function: { name: t.name, arguments: t.arguments },
            })),
          });
          for (const t of toolCalls) {
            messages.push({ role: 'tool', tool_call_id: t.id, content: '{"ok":true}' });
          }

          const next = await callUpstream(opts, messages);
          if (!next.ok) {
            emitText(controller, '\n\nSorry, the response was interrupted. Please try again.');
            break;
          }
          upstream = next;
        }
      } catch {
        emitText(controller, '\n\nSorry, the response was interrupted. Please try again.');
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
