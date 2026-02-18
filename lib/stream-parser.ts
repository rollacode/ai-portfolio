// Parses SSE streams from the OpenAI-compatible xAI API.
// Handles interleaved text content and tool calls with chunked arguments.

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; id: string; name: string; arguments: Record<string, any> }
  | { type: 'done' }
  | { type: 'error'; message: string };

// Internal accumulator for a tool call whose arguments arrive in chunks
interface PendingToolCall {
  id: string;
  name: string;
  arguments: string;
}

// -----------------------------------------------------------------------------
// Type guard
// -----------------------------------------------------------------------------

export function isToolCallEvent(
  event: StreamEvent,
): event is Extract<StreamEvent, { type: 'tool_call' }> {
  return event.type === 'tool_call';
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function finalizePending(pending: PendingToolCall): StreamEvent {
  try {
    const parsed = pending.arguments.trim()
      ? JSON.parse(pending.arguments)
      : {};
    return { type: 'tool_call', id: pending.id, name: pending.name, arguments: parsed };
  } catch {
    return {
      type: 'error',
      message: `Failed to parse arguments for tool "${pending.name}": ${pending.arguments}`,
    };
  }
}

// -----------------------------------------------------------------------------
// Main parser
// -----------------------------------------------------------------------------

export async function* parseStream(response: Response): AsyncGenerator<StreamEvent> {
  const body = response.body;
  if (!body) {
    yield { type: 'error', message: 'Response body is null' };
    return;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();

  // Accumulated tool calls keyed by their stream index
  const pendingCalls = new Map<number, PendingToolCall>();
  // Buffer for incomplete lines across chunks
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on newlines — each SSE line ends with \n
      const lines = buffer.split('\n');
      // Keep the last (possibly incomplete) segment in the buffer
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();

        // Skip empty lines and SSE comments
        if (!line || line.startsWith(':')) continue;

        // Must be a `data: ...` line
        if (!line.startsWith('data:')) continue;

        const payload = line.slice('data:'.length).trim();

        // Terminal signal
        if (payload === '[DONE]') {
          // Flush any remaining pending tool calls
          for (const [idx, pending] of pendingCalls) {
            yield finalizePending(pending);
            pendingCalls.delete(idx);
          }
          yield { type: 'done' };
          return;
        }

        // Parse the JSON payload
        let data: any;
        try {
          data = JSON.parse(payload);
        } catch {
          yield { type: 'error', message: `Malformed JSON in SSE payload: ${payload}` };
          continue;
        }

        const delta = data?.choices?.[0]?.delta;
        if (!delta) continue;

        // --- Text content ---
        if (delta.content) {
          yield { type: 'text', content: delta.content };
        }

        // --- Tool calls ---
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls as any[]) {
            const idx: number = tc.index;

            // New tool call starting — has id + function.name
            if (tc.id && tc.function?.name) {
              // If there was already a pending call at a different index, flush it
              // (shouldn't normally collide on the same index, but be safe)
              const existing = pendingCalls.get(idx);
              if (existing) {
                yield finalizePending(existing);
              }

              pendingCalls.set(idx, {
                id: tc.id,
                name: tc.function.name,
                arguments: tc.function.arguments ?? '',
              });
            } else if (tc.function?.arguments != null) {
              // Continuation chunk — append arguments
              const pending = pendingCalls.get(idx);
              if (pending) {
                pending.arguments += tc.function.arguments;
              }
            }
          }
        }
      }
    }

    // Stream ended without [DONE] — flush remaining
    for (const [, pending] of pendingCalls) {
      yield finalizePending(pending);
    }
  } finally {
    reader.releaseLock();
  }
}
