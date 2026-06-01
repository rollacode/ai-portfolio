# Agentic tool loop — design

## Problem

The chat agent calls a tool (opens a panel) but writes no text — the user sees a
bare "I did: show skills" badge and no reply. The first message works because it
has no tool call; every tool-calling turn dies.

**Root cause (verified live against xAI):** when a model calls tools it ends the
completion with `finish_reason: tool_calls` and emits **no text content**. Text is
expected in a *second* completion, after tool results are returned. The current
`/api/chat` does a single upstream call and pipes the raw SSE straight to the
client — there is no second round-trip. Switching to a stronger model does not
help: `grok-4.3` and `grok-4.20-*` behave identically (standard function-calling
semantics).

Confirmed the fix premise: feeding a `role:'tool'` ack back and calling again
yields the narration text with `finish_reason: stop`.

## Goal

A real tool-calling agent loop: within one user turn the model may **act → talk →
act → talk …** as many rounds as it needs. Minimal footprint — no client rewrite,
no data/IndexedDB contract changes.

## Architecture

Server-side orchestration, **one merged SSE stream** to the client (decided with
the user). The client and its `parseStream` consumer stay as-is (one tiny parser
correctness fix, below).

### New: `core/src/lib/agent-loop.ts`

`runAgentLoop(opts): Promise<Response>` where opts =
`{ baseUrl, apiKey, model, messages, tools, temperature?, maxRounds? }`.

- First upstream fetch. If `!response.ok` → return `Response.json({ error, detail }, { status })` (preserves current error behavior + provider-error visibility).
- If ok → return a streaming `Response` whose `ReadableStream` runs the loop:
  - **Round r:** read the upstream SSE. For each `data:` line:
    - `[DONE]` → end of this round, **do not forward** (intermediate DONE would stop the client parser).
    - otherwise → **forward the chunk verbatim** to the client, and parse it to accumulate `content`, `tool_calls` (id/name/arguments by index), and `finish_reason`.
  - After the round: if `tool_calls` were produced and `r < maxRounds` →
    append to the internal message list:
    - `{ role:'assistant', content, tool_calls:[{id,type:'function',function:{name,arguments}}] }`
    - one `{ role:'tool', tool_call_id, content:'{"ok":true}' }` per call
    then start round r+1.
  - else → stop.
  - On a non-ok fetch in rounds ≥2 → emit one error SSE event, stop.
  - Finally → emit a single `data: [DONE]\n\n` and close.
- `maxRounds` default **6**. Guards runaway loops.

Tool results are a fixed `{"ok":true}` ack — UI tools have no return value and the
full portfolio data is already in the system prompt, so the model narrates from
what it knows.

### Client parser fix: `core/src/lib/stream-parser.ts`

Currently pending tool calls are finalized only on `[DONE]` or when a new call
reuses the same index. With multiple rounds under one `[DONE]`, a round's tool
calls would not finalize until the very end — badges/actions would fire *after*
later text, breaking order.

Fix: when a chunk carries a truthy `choices[0].finish_reason`, flush all pending
tool calls immediately (emit their `tool_call` events). ~3 lines. This is also
just-correct SSE behavior and is provider-agnostic.

### Routes: `andrey` + `anya` `app/api/chat/route.ts`

Both files are byte-identical today. Replace only the final
"fetch + ok-check + pipe `response.body`" block (~30 lines) with:

```ts
return runAgentLoop({
  baseUrl: BASE_URL(), apiKey, model: MODEL(),
  messages: finalMessages, tools, temperature: 0.7,
});
```

Add `export const maxDuration = 60;` (sequential rounds can exceed the default).
Import via a per-package shim `lib/agent-loop.ts` that re-exports
`@ai-portfolio/core/lib/agent-loop`, matching the existing `lib/*` pattern.

All validation, rate-limit, quota, URL-enrichment, and system-prompt/tool building
stay untouched.

## Data flow

```
client → POST /api/chat (history)
  → route builds [system, ...history, urlContext] + tools
  → runAgentLoop:
      round1: xAI stream → forward tool_calls deltas → finish=tool_calls
              → append assistant(tool_calls) + tool acks
      round2: xAI stream → forward text deltas → finish=stop
      → [DONE]
  → client parseStream: tool_call events (panels open) then text (narration),
    appended to one assistant message — interleaving renders in order
```

## Error handling

- Round-1 upstream error → JSON error response, status passthrough (unchanged).
- Round ≥2 upstream error → single SSE `{error}` event then `[DONE]`; client shows
  "response interrupted".
- Malformed upstream chunks → skipped (parser already tolerant).
- `maxRounds` reached with tool_calls still pending → stop and `[DONE]`; whatever
  text streamed remains. (No silent infinite loop.)

## Testing

- **Unit:** `stream-parser` flushes pending tool calls on `finish_reason`
  (new test). Existing 213 andrey tests stay green.
- **Live:** replicate the loop against xAI — round1 tool_calls, ack, round2 text
  (already verified manually). Post-deploy: hit `rollacode.org/api/chat`, confirm
  the SSE contains both `tool_calls` and trailing text content.

## Out of scope (deliberately)

- Cross-user-turn tool memory (client currently sends `toolCalls` in a non-OpenAI
  field that xAI ignores). Not needed to fix the bug; would touch client +
  IndexedDB. Left as a separate future improvement.
- Any change to the 22 tool definitions, the action queue, or panel components.
