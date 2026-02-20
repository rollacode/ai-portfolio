import { describe, it, expect } from 'vitest';
import { parseStream, isToolCallEvent, type StreamEvent } from '../lib/stream-parser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Response with a ReadableStream body from raw SSE text. */
function makeResponse(sseText: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(sseText));
      controller.close();
    },
  });
  return new Response(stream);
}

/** Build a Response that delivers chunks one-by-one (simulates real streaming). */
function makeChunkedResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream);
}

/** Collect all events from the async generator. */
async function collectEvents(response: Response): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of parseStream(response)) {
    events.push(event);
  }
  return events;
}

/** Build a standard SSE data line from an OpenAI-style delta. */
function sseData(delta: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`;
}

// ---------------------------------------------------------------------------
// isToolCallEvent type guard
// ---------------------------------------------------------------------------

describe('isToolCallEvent', () => {
  it('returns true for tool_call events', () => {
    const event: StreamEvent = {
      type: 'tool_call',
      id: 'tc1',
      name: 'show_project',
      arguments: { slug: 'test' },
    };
    expect(isToolCallEvent(event)).toBe(true);
  });

  it('returns false for non-tool_call events', () => {
    expect(isToolCallEvent({ type: 'text', content: 'hi' })).toBe(false);
    expect(isToolCallEvent({ type: 'done' })).toBe(false);
    expect(isToolCallEvent({ type: 'error', message: 'oops' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseStream — basic SSE parsing
// ---------------------------------------------------------------------------

describe('parseStream', () => {
  describe('basic SSE handling', () => {
    it('yields error when response body is null', async () => {
      const response = new Response(null);
      const events = await collectEvents(response);
      expect(events).toEqual([{ type: 'error', message: 'Response body is null' }]);
    });

    it('yields done on [DONE] signal', async () => {
      const sse = 'data: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));
      expect(events).toEqual([{ type: 'done' }]);
    });

    it('skips empty lines', async () => {
      const sse = '\n\n\ndata: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));
      expect(events).toEqual([{ type: 'done' }]);
    });

    it('skips SSE comment lines (starting with :)', async () => {
      const sse = ': this is a comment\ndata: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));
      expect(events).toEqual([{ type: 'done' }]);
    });

    it('skips lines that do not start with data:', async () => {
      const sse = 'event: message\nid: 1\ndata: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));
      expect(events).toEqual([{ type: 'done' }]);
    });

    it('skips payloads without choices[0].delta', async () => {
      const sse = 'data: {"id":"abc","object":"chat.completion.chunk"}\n\ndata: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));
      expect(events).toEqual([{ type: 'done' }]);
    });
  });

  // -------------------------------------------------------------------------
  // Text content
  // -------------------------------------------------------------------------

  describe('text content', () => {
    it('yields text events from delta content', async () => {
      const sse = sseData({ content: 'Hello' }) + sseData({ content: ' world' }) + 'data: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));
      expect(events).toEqual([
        { type: 'text', content: 'Hello' },
        { type: 'text', content: ' world' },
        { type: 'done' },
      ]);
    });

    it('skips deltas with null/empty content', async () => {
      const sse = sseData({ content: null }) + sseData({ role: 'assistant' }) + 'data: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));
      // null content is falsy, role-only delta has no content
      expect(events).toEqual([{ type: 'done' }]);
    });
  });

  // -------------------------------------------------------------------------
  // Tool calls
  // -------------------------------------------------------------------------

  describe('tool calls', () => {
    it('parses a single tool call arriving in one chunk', async () => {
      const toolDelta = {
        tool_calls: [
          {
            index: 0,
            id: 'call_1',
            function: { name: 'show_project', arguments: '{"slug":"portfolio"}' },
          },
        ],
      };
      const sse = sseData(toolDelta) + 'data: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));

      expect(events).toEqual([
        {
          type: 'tool_call',
          id: 'call_1',
          name: 'show_project',
          arguments: { slug: 'portfolio' },
        },
        { type: 'done' },
      ]);
    });

    it('accumulates chunked tool call arguments', async () => {
      // First chunk: id + name + partial args
      const chunk1 = sseData({
        tool_calls: [
          {
            index: 0,
            id: 'call_2',
            function: { name: 'show_skills', arguments: '{"categ' },
          },
        ],
      });
      // Second chunk: more args
      const chunk2 = sseData({
        tool_calls: [
          {
            index: 0,
            function: { arguments: 'ory":"ai' },
          },
        ],
      });
      // Third chunk: closing
      const chunk3 = sseData({
        tool_calls: [
          {
            index: 0,
            function: { arguments: '"}' },
          },
        ],
      });

      const sse = chunk1 + chunk2 + chunk3 + 'data: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));

      expect(events).toEqual([
        {
          type: 'tool_call',
          id: 'call_2',
          name: 'show_skills',
          arguments: { category: 'ai' },
        },
        { type: 'done' },
      ]);
    });

    it('handles tool call with empty arguments', async () => {
      const toolDelta = {
        tool_calls: [
          {
            index: 0,
            id: 'call_3',
            function: { name: 'show_contact', arguments: '' },
          },
        ],
      };
      const sse = sseData(toolDelta) + 'data: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));

      expect(events).toEqual([
        { type: 'tool_call', id: 'call_3', name: 'show_contact', arguments: {} },
        { type: 'done' },
      ]);
    });

    it('handles multiple parallel tool calls (different indices)', async () => {
      const chunk1 = sseData({
        tool_calls: [
          { index: 0, id: 'call_a', function: { name: 'show_timeline', arguments: '' } },
          { index: 1, id: 'call_b', function: { name: 'show_contact', arguments: '' } },
        ],
      });
      const sse = chunk1 + 'data: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));

      const toolEvents = events.filter((e) => e.type === 'tool_call');
      expect(toolEvents).toHaveLength(2);
      expect(toolEvents[0]).toMatchObject({ name: 'show_timeline' });
      expect(toolEvents[1]).toMatchObject({ name: 'show_contact' });
    });

    it('flushes pending tool calls on [DONE]', async () => {
      // Tool call start but no [DONE]-triggered flush — the [DONE] should finalize it
      const chunk = sseData({
        tool_calls: [
          { index: 0, id: 'call_x', function: { name: 'hide_panel', arguments: '' } },
        ],
      });
      const sse = chunk + 'data: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));

      expect(events).toEqual([
        { type: 'tool_call', id: 'call_x', name: 'hide_panel', arguments: {} },
        { type: 'done' },
      ]);
    });

    it('flushes pending tool calls when stream ends without [DONE]', async () => {
      const chunk = sseData({
        tool_calls: [
          { index: 0, id: 'call_no_done', function: { name: 'show_resume', arguments: '{}' } },
        ],
      });
      // No [DONE] — stream just ends
      const events = await collectEvents(makeResponse(chunk));

      expect(events).toEqual([
        { type: 'tool_call', id: 'call_no_done', name: 'show_resume', arguments: {} },
      ]);
    });

    it('replaces existing pending call at same index', async () => {
      // First tool at index 0
      const chunk1 = sseData({
        tool_calls: [
          { index: 0, id: 'call_old', function: { name: 'show_skills', arguments: '{}' } },
        ],
      });
      // New tool at same index 0 (overwrites)
      const chunk2 = sseData({
        tool_calls: [
          { index: 0, id: 'call_new', function: { name: 'show_contact', arguments: '' } },
        ],
      });
      const sse = chunk1 + chunk2 + 'data: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));

      // The old one should be flushed, then the new one finalized at [DONE]
      const toolEvents = events.filter((e) => e.type === 'tool_call');
      expect(toolEvents).toHaveLength(2);
      expect(toolEvents[0]).toMatchObject({ id: 'call_old', name: 'show_skills' });
      expect(toolEvents[1]).toMatchObject({ id: 'call_new', name: 'show_contact' });
    });
  });

  // -------------------------------------------------------------------------
  // Interleaved text and tool calls
  // -------------------------------------------------------------------------

  describe('interleaved text and tool calls', () => {
    it('handles text and tool calls in the same stream', async () => {
      const sse =
        sseData({ content: 'Let me show you ' }) +
        sseData({
          tool_calls: [
            { index: 0, id: 'call_i', function: { name: 'show_project', arguments: '{"slug":"demo"}' } },
          ],
        }) +
        sseData({ content: 'Here it is!' }) +
        'data: [DONE]\n\n';

      const events = await collectEvents(makeResponse(sse));
      // Text events arrive as they stream; tool calls are flushed at [DONE]
      expect(events[0]).toEqual({ type: 'text', content: 'Let me show you ' });
      expect(events[1]).toEqual({ type: 'text', content: 'Here it is!' });
      expect(events[2]).toMatchObject({ type: 'tool_call', name: 'show_project' });
      expect(events[3]).toEqual({ type: 'done' });
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('yields error for malformed JSON payloads', async () => {
      const sse = 'data: {invalid json\n\ndata: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));

      expect(events[0]).toMatchObject({ type: 'error' });
      expect((events[0] as any).message).toContain('Malformed JSON');
      expect(events[1]).toEqual({ type: 'done' });
    });

    it('yields error when tool arguments are invalid JSON', async () => {
      const chunk = sseData({
        tool_calls: [
          { index: 0, id: 'call_bad', function: { name: 'bad_tool', arguments: '{broken' } },
        ],
      });
      const sse = chunk + 'data: [DONE]\n\n';
      const events = await collectEvents(makeResponse(sse));

      expect(events[0]).toMatchObject({ type: 'error' });
      expect((events[0] as any).message).toContain('Failed to parse arguments');
      expect((events[0] as any).message).toContain('bad_tool');
    });
  });

  // -------------------------------------------------------------------------
  // Multi-chunk buffering
  // -------------------------------------------------------------------------

  describe('multi-chunk buffering', () => {
    it('handles SSE data split across multiple stream chunks', async () => {
      // Split a single SSE line across two chunks
      const chunk1 = 'data: {"choices":[{"delta":{"con';
      const chunk2 = 'tent":"hello"}}]}\n\ndata: [DONE]\n\n';

      const response = makeChunkedResponse([chunk1, chunk2]);
      const events = await collectEvents(response);

      expect(events).toEqual([
        { type: 'text', content: 'hello' },
        { type: 'done' },
      ]);
    });

    it('handles lines split exactly at newline boundary', async () => {
      const chunk1 = 'data: [DONE]\n';
      const chunk2 = '\n';

      const response = makeChunkedResponse([chunk1, chunk2]);
      const events = await collectEvents(response);

      expect(events).toEqual([{ type: 'done' }]);
    });
  });
});
