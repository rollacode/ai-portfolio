import type { ConversationEvent } from './conversation-events';

export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'reasoning'; content: string }
  | { type: 'tool_call'; id: string; name: string; arguments: Record<string, any> }
  | { type: 'done' }
  | { type: 'error'; message: string }
  | ConversationEvent;

export function isToolCallEvent(event: StreamEvent): event is Extract<StreamEvent, { type: 'tool_call' }> {
  return event.type === 'tool_call';
}

/** Incremental UTF-8 decoder, including final unterminated data lines. */
export async function* readSsePayloads(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let abort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    abort = () => { void reader.cancel().catch(() => {}); reject(new Error('aborted')); };
    signal?.addEventListener('abort', abort, { once: true });
  });
  try {
    for (;;) {
      if (signal?.aborted) throw new Error('aborted');
      const { done, value } = await Promise.race([reader.read(), aborted]);
      if (signal?.aborted) throw new Error('aborted');
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      if (done && buffer) { lines.push(buffer); buffer = ''; }
      for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith('data:')) yield line.slice(5).trim();
      }
      if (done) break;
    }
  } finally {
    if (abort) signal?.removeEventListener('abort', abort);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function* parseStream(response: Response): AsyncGenerator<StreamEvent> {
  if (!response.body) { yield { type: 'error', message: 'Response body is null' }; return; }
  const pending = new Map<number, { id: string; name: string; arguments: string }>();
  const dispatched = new Set<string>();
  function* flush(): Generator<StreamEvent> {
    for (const call of pending.values()) {
      if (!call.id || dispatched.has(call.id)) continue;
      dispatched.add(call.id);
      try {
        const args = call.arguments.trim() ? JSON.parse(call.arguments) : {};
        if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error();
        yield { type: 'tool_call', id: call.id, name: call.name, arguments: args };
      } catch { yield { type: 'error', message: `Failed to parse arguments for tool "${call.name}"` }; }
    }
    pending.clear();
  }
  try {
    for await (const payload of readSsePayloads(response.body)) {
      if (payload === '[DONE]') { yield* flush(); yield { type: 'done' }; return; }
      let data: any;
      try { data = JSON.parse(payload); }
      catch { yield { type: 'error', message: 'Malformed JSON in SSE payload' }; continue; }
      const meta = data?.conversation_event;
      if (meta && typeof meta.id === 'string' && typeof meta.requestId === 'string' &&
        ['classification', 'tool_start', 'claim_receipt', 'correction', 'error', 'usage', 'timing', 'context'].includes(meta.type)) {
        yield meta as ConversationEvent;
        continue;
      }
      const choice = data?.choices?.[0], delta = choice?.delta;
      if (delta?.reasoning_content) yield { type: 'reasoning', content: delta.reasoning_content };
      if (delta?.content) yield { type: 'text', content: delta.content };
      for (const tc of delta?.tool_calls ?? []) {
        const index = tc.index ?? 0;
        let call = pending.get(index);
        if (call && tc.id && call.id && tc.id !== call.id) { yield* flush(); call = undefined; }
        if (!call) { call = { id: '', name: '', arguments: '' }; pending.set(index, call); }
        if (tc.id) call.id = tc.id;
        if (tc.function?.name) call.name += tc.function.name;
        if (tc.function?.arguments != null) call.arguments += tc.function.arguments;
      }
      if (choice?.finish_reason) yield* flush();
    }
    yield* flush();
    yield { type: 'error', message: 'Response interrupted before completion' };
    yield { type: 'done' };
  } catch {
    yield { type: 'error', message: 'Response interrupted' };
    yield { type: 'done' };
  }
}
