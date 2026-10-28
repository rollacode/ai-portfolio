import { afterEach, describe, expect, it, vi } from 'vitest';
import { askJev, parseJevAnswers, type JevQuestion } from '../../core/src/lib/jev';
const questions: Record<string, JevQuestion> = { support: { type: 'noul', instructions: 'support' } };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('Jev fail open', () => {
  it('has no implicit env enablement', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect(await askJev({ state: {}, questions })).toEqual({ available: false, reason: 'missing_key' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('bounds stalled response bodies to one total 1500ms deadline', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url, init) => { signal = init.signal; return Promise.resolve(new Response(new ReadableStream({ start() {} }))); }));
    const result = askJev({ state: {}, questions, apiKey: 'secret' });
    await vi.advanceTimersByTimeAsync(1500);
    expect(await result).toEqual({ available: false, reason: 'deadline' });
    expect(signal?.aborted).toBe(true);
  });
  it('validates finite support and exact names', () => {
    expect(parseJevAnswers({ answers: { support: { type: 'noul', noul: 0.1 } } }, questions).available).toBe(true);
    for (const answers of [{}, { support: { type: 'noul', noul: Infinity } }, { support: { type: 'noul', noul: -1 } }, { support: { type: 'score', score: 1 } }, { support: { type: 'noul', noul: 1 }, extra: {} }]) {
      expect(parseJevAnswers({ answers }, questions)).toEqual({ available: false, reason: 'invalid' });
    }
  });
});

describe('strict Jev wire contract', () => {
  it('validates score/choice ranges and optional confidence without inventing it', () => {
    const q: Record<string, JevQuestion> = { lead: { type: 'score', instructions: '', criteria: ['0', '1', '2', '3', '4'] }, intent: { type: 'choice', instructions: '', criteria: { projects: 'projects' } } };
    const good = { lead: { type: 'score', score: 2, probabilities: { '2': 1 } }, intent: { type: 'choice', choice: 'projects', probabilities: { projects: 1 } } };
    const parsed = parseJevAnswers({ answers: good }, q);
    expect(parsed.available).toBe(true); if (parsed.available) expect(parsed.answers.lead).not.toHaveProperty('confidence');
    for (const bad of [{ score: 5 }, { score: NaN }, { probabilities: {} }, { probabilities: { '5': 1 } }, { confidence: 1.1 }, { probabilities: { '2': -1 } }]) {
      expect(parseJevAnswers({ answers: { ...good, lead: { ...good.lead, ...bad } } }, q).available).toBe(false);
    }
    expect(parseJevAnswers({ answers: { ...good, intent: { ...good.intent, choice: 'other' } } }, q).available).toBe(false);
  });
  it('sends exact verified auth/schema with redirects disabled, no retries', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ answers: { support: { type: 'noul', noul: 0.6 } } })); vi.stubGlobal('fetch', fetcher);
    expect((await askJev({ state: { evidence: 'facts' }, questions, apiKey: 'key' })).available).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce(); const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.typesafe.ai/v1/systemone'); expect(init.redirect).toBe('error'); expect(init.headers.Authorization).toBe('Bearer key');
    expect(JSON.parse(init.body)).toEqual({ model: 'jev-latest', state: { evidence: 'facts' }, questions });
  });
  it.each([402, 429, 500])('fails open on HTTP %s', async status => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status })); vi.stubGlobal('fetch', fetcher);
    expect(await askJev({ state: {}, questions, apiKey: 'key' })).toEqual({ available: false, reason: status === 402 ? 'credits' : 'http' });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('fails open on invalid JSON, credit codes, transport and caller abort', async () => {
    for (const [response, reason] of [[new Response('bad'), 'invalid'], [Response.json({ error: { code: 'credit_exhausted' } }), 'credits']] as const) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response)); expect(await askJev({ state: {}, questions, apiKey: 'key' })).toEqual({ available: false, reason });
    }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret')));
    expect(await askJev({ state: {}, questions, apiKey: 'key' })).toEqual({ available: false, reason: 'transport' });
    const abort = new AbortController();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const result = askJev({ state: {}, questions, apiKey: 'key', signal: abort.signal }); abort.abort();
    expect(await result).toEqual({ available: false, reason: 'aborted' });
  });
});
