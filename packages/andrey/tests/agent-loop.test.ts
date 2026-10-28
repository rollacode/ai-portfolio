import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAgentLoop } from '../../core/src/lib/agent-loop';
import { parseStream } from '../../core/src/lib/stream-parser';
const frame = (data: unknown) => `data: ${JSON.stringify(data)}\n\n`;
const textResponse = () => new Response(frame({ choices: [{ delta: { content: 'hello' }, finish_reason: 'stop' }] }) + 'data: [DONE]\n\n');
const opts = { baseUrl: 'https://chat.test', apiKey: 'key', model: 'unchanged', messages: [{ role: 'system', content: 'stable' }, { role: 'user', content: 'hi' }], tools: [] };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('first substantive output independence', () => {
  it('streams text while Jev is blocked, cancels its body at turn end', async () => {
    let jevSignal: AbortSignal | undefined;
    const bodies: any[] = [];
    vi.stubGlobal('fetch', vi.fn((url, init) => {
      if (String(url).includes('typesafe')) { jevSignal = init.signal; return new Promise(() => {}); }
      bodies.push(JSON.parse(init.body)); return Promise.resolve(textResponse());
    }));
    const started = performance.now();
    const response = await runAgentLoop({ ...opts, enableJev: true, jevApiKey: 'secret' });
    const events = [];
    for await (const e of parseStream(response)) events.push(e);
    expect(events.find(e => e.type === 'text')).toEqual({ type: 'text', content: 'hello' });
    expect(performance.now() - started).toBeLessThan(1000);
    expect(jevSignal?.aborted).toBe(true);
    expect(bodies[0].messages).toEqual(opts.messages);
  });
  it('default callers keep exact request bytes and never call Jev even with global key', async () => {
    vi.stubEnv('TYPESAFE_API_KEY', 'global-key');
    const fetcher = vi.fn().mockResolvedValue(textResponse()); vi.stubGlobal('fetch', fetcher);
    await (await runAgentLoop(opts)).text();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1].body).toBe(JSON.stringify({ model: opts.model, messages: opts.messages, tools: [], stream: true, temperature: 0.7 }));
    vi.unstubAllEnvs();
  });
});

describe('bounded transport and rounds', () => {
  const tool = { type: 'function', function: { name: 'show_project' } };
  const toolRound = (id: string) => new Response(frame({ choices: [{ delta: { tool_calls: [{ index: 0, id, function: { name: 'show_', arguments: '' } }] } }] }) + frame({ choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'project', arguments: '{"slug":"demo"}' } }] }, finish_reason: 'tool_calls' }] }) + 'data: [DONE]\n\n');
  it('preserves usage-only frames, fragmented names, and exactly-once tool dispatch across reused indices', async () => {
    const responses = [toolRound('one'), toolRound('two'), new Response(frame({ model: 'returned', choices: [{ delta: { content: 'done' }, finish_reason: 'stop' }] }) + frame({ choices: [], usage: { prompt_tokens: 12, completion_tokens: 3, prompt_tokens_details: { cached_tokens: 8 } } }) + 'data: [DONE]\n\n')];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(responses.shift())));
    const onTiming = vi.fn();
    const events = [];
    for await (const e of parseStream(await runAgentLoop({ ...opts, tools: [tool], includeUsage: true, reasoningEffort: 'none', onTiming }))) events.push(e);
    expect(events.filter(e => e.type === 'tool_call').map(e => e.id)).toEqual(['one', 'two']);
    expect(events.filter(e => e.type === 'tool_start').map(e => e.name)).toEqual(['show_project', 'show_project']);
    expect(events.filter(e => e.type === 'done')).toHaveLength(1);
    expect(events.find(e => e.type === 'usage')).toMatchObject({ cachedTokens: 8 });
    expect(onTiming.mock.calls[0][0]).toMatchObject({ rounds: 3, requestedModel: 'unchanged', returnedModel: 'returned', effort: 'none', cachedTokens: 8 });
    const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
    expect(body.reasoning_effort).toBe('none'); expect(body.stream_options).toEqual({ include_usage: true });
    expect(Object.values(onTiming.mock.calls[0][0]).filter(v => typeof v === 'number').every(Number.isFinite)).toBe(true);
  });
  it('snapshots the stable prefix and appends late hints only to unsent requests', async () => {
    let resolveJev!: (response: Response) => void;
    let chatController!: ReadableStreamDefaultController;
    const bodies: any[] = [];
    const chatStream = new ReadableStream({ start(c) { chatController = c; } });
    const answers = { visitorType: { type: 'choice', choice: 'peer', probabilities: { peer: 1 } }, intent: { type: 'choice', choice: 'projects', probabilities: { projects: 1 } }, language: { type: 'choice', choice: 'en', probabilities: { en: 1 } }, lead: { type: 'score', score: 2, probabilities: { '2': 1 }, confidence: 0.7 }, injection: { type: 'noul', noul: 0 } };
    vi.stubGlobal('fetch', vi.fn((url, init) => {
      if (String(url).includes('typesafe')) return new Promise<Response>(resolve => { resolveJev = resolve; });
      bodies.push(JSON.parse(init.body)); return Promise.resolve(bodies.length === 1 ? new Response(chatStream) : textResponse());
    }));
    const response = await runAgentLoop({ ...opts, tools: [tool], enableJev: true, jevApiKey: 'secret', dynamicContext: 'visitor data' });
    const iterator = parseStream(response);
    chatController.enqueue(new TextEncoder().encode(frame({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'late-tool', function: { name: 'show_project' } }] } }] })));
    expect((await iterator.next()).value).toMatchObject({ type: 'tool_start' });
    resolveJev(Response.json({ answers }));
    expect((await iterator.next()).value).toMatchObject({ type: 'classification', classification: { leadScore: 2, leadConfidence: 0.7 } });
    chatController.enqueue(new TextEncoder().encode(frame({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{}' } }] }, finish_reason: 'tool_calls' }] }) + 'data: [DONE]\n\n')); chatController.close();
    while (!(await iterator.next()).done) { /* drain */ }
    expect(bodies).toHaveLength(2);
    expect(bodies[0].messages.at(-1).content).not.toContain('leadScore');
    expect(bodies[1].messages.at(-1).content).toContain('advisoryClassification');
    expect(bodies[1].messages.at(-1).role).toBe('system');
    expect(bodies[1].messages[0]).toEqual(bodies[0].messages[0]); expect(bodies[1].tools).toEqual(bodies[0].tools);
    expect(bodies[1].messages.filter((m: any) => m.role === 'system')).toHaveLength(2);
  });
  it('makes one visible correction and one grounded revision, never certification', async () => {
    let chats = 0, rejects = 0;
    const logged: any[] = [];
    vi.stubGlobal('fetch', vi.fn((url, init) => {
      if (String(url).includes('typesafe')) {
        const body = JSON.parse(init.body);
        if (body.questions.support) { rejects++; return Promise.resolve(Response.json({ answers: { support: { type: 'noul', noul: 0.1 } } })); }
        return Promise.resolve(new Response('bad', { status: 500 }));
      }
      chats++; return Promise.resolve(textResponse());
    }));
    const events = [];
    for await (const e of parseStream(await runAgentLoop({ ...opts, enableJev: true, jevApiKey: 'key', portfolioEvidence: 'canonical facts', onTiming: t => logged.push(t) }))) events.push(e);
    expect(chats).toBe(2); expect(rejects).toBe(1);
    expect(events.filter(e => e.type === 'correction')).toHaveLength(1);
    expect(events.findIndex(e => e.type === 'text')).toBeLessThan(events.findIndex(e => e.type === 'correction'));
    expect(events.filter(e => e.type === 'claim_receipt')).toHaveLength(0);
    expect(JSON.stringify(logged)).not.toMatch(/hello|leadScore|canonical facts|hi"/);
  });
  it('stops after calibrated match while legacy/default still follows up', async () => {
    const match = () => new Response(frame({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'match', function: { name: 'match_job', arguments: '{}' } }] }, finish_reason: 'tool_calls' }] }) + 'data: [DONE]\n\n');
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(match())); vi.stubGlobal('fetch', fetcher);
    await (await runAgentLoop({ ...opts, deferMatchCommentary: true })).text(); expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockClear();
    await (await runAgentLoop({ ...opts, maxRounds: 2 })).text(); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('caps rounds at six and aborts a stalled upstream body', async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(toolRound('same'))); vi.stubGlobal('fetch', fetcher);
    await (await runAgentLoop({ ...opts, tools: [tool], maxRounds: 999 })).text(); expect(fetcher).toHaveBeenCalledTimes(6);
    vi.useFakeTimers(); let cancelled = false;
    fetcher.mockImplementation(() => Promise.resolve(new Response(new ReadableStream({ cancel() { cancelled = true; } }))));
    const response = await runAgentLoop({ ...opts, deadlineMs: 100 }); const result = response.text();
    await vi.advanceTimersByTimeAsync(100);
    expect(await result).toContain('timeout'); expect(cancelled).toBe(true);
  });
  it('bounds stalled headers and cancellation, without exposing upstream errors', async () => {
    vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const pending = runAgentLoop({ ...opts, deadlineMs: 50 }); await vi.advanceTimersByTimeAsync(50);
    expect((await pending).status).toBe(504);
    vi.useRealTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret visitor echo', { status: 500 })));
    const failed = await runAgentLoop(opts); expect(failed.status).toBe(500); expect(await failed.text()).not.toContain('secret visitor echo');
  });
});

describe('turn cleanup', () => {
  it('cancels upstream and stale Jev on consumer cancellation, with one timing log and no pending timers', async () => {
    vi.useFakeTimers();
    let upstreamCancelled = false, jevSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((url, init) => {
      if (String(url).includes('typesafe')) { jevSignal = init.signal; return new Promise(() => {}); }
      return Promise.resolve(new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(frame({ choices: [{ delta: { content: 'first' } }] }))); }, cancel() { upstreamCancelled = true; } })));
    }));
    const onTiming = vi.fn();
    const response = await runAgentLoop({ ...opts, enableJev: true, jevApiKey: 'secret', onTiming });
    const reader = response.body!.getReader(); await reader.read(); await reader.cancel();
    await vi.advanceTimersByTimeAsync(0);
    expect(upstreamCancelled).toBe(true); expect(jevSignal?.aborted).toBe(true);
    expect(onTiming).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
});

describe('rejector fail-open boundary', () => {
  it('cannot hold first text and completes after unavailable rejector deadline', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((url) => String(url).includes('typesafe') ? new Promise(() => {}) : Promise.resolve(textResponse())));
    const response = await runAgentLoop({ ...opts, enableJev: true, jevApiKey: 'key', portfolioEvidence: 'canonical' });
    const iterator = parseStream(response);
    expect((await iterator.next()).value).toEqual({ type: 'text', content: 'hello' });
    const rest = (async () => { const events = []; for (;;) { const item = await iterator.next(); if (item.done) return events; events.push(item.value); } })();
    await vi.advanceTimersByTimeAsync(1500);
    const events = await rest;
    expect(events.filter(e => e.type === 'done')).toHaveLength(1);
    expect(events.filter(e => e.type === 'correction')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not certify high support or veto at the strict 0.2 boundary', async () => {
    let chats = 0;
    vi.stubGlobal('fetch', vi.fn((url, init) => {
      if (String(url).includes('typesafe')) {
        return Promise.resolve(JSON.parse(init.body).questions.support ? Response.json({ answers: { support: { type: 'noul', noul: 0.2 } } }) : new Response('{}', { status: 500 }));
      }
      chats++; return Promise.resolve(textResponse());
    }));
    const events = []; for await (const e of parseStream(await runAgentLoop({ ...opts, enableJev: true, jevApiKey: 'key', portfolioEvidence: 'canonical' }))) events.push(e);
    expect(chats).toBe(1); expect(events.some(e => e.type === 'correction' || e.type === 'claim_receipt')).toBe(false);
  });
});

describe('known tool name completion', () => {
  it('does not confuse an ambiguous name prefix with a complete shorter name', async () => {
    const tools = ['show_project', 'show_projects'].map(name => ({ type: 'function', function: { name } }));
    const first = frame({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'prefix', function: { name: 'show_project', arguments: '' } }] } }] });
    const end = frame({ choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 's', arguments: '{}' } }] }, finish_reason: 'tool_calls' }] }) + 'data: [DONE]\n\n';
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(first + end)).mockResolvedValueOnce(textResponse()); vi.stubGlobal('fetch', fetcher);
    const events = []; for await (const e of parseStream(await runAgentLoop({ ...opts, tools }))) events.push(e);
    expect(events.filter(e => e.type === 'tool_start').map(e => e.name)).toEqual(['show_projects']);
    expect(events.filter(e => e.type === 'tool_call').map(e => e.name)).toEqual(['show_projects']);
  });
});
