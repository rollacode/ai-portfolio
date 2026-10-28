// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStream } from '../../core/src/hooks/useChatStream';
import { ChatLifecycle, loadingLabel, relevantContact, validToolArguments } from '../../core/src/lib/chat-lifecycle';
import { ActionQueue } from '../../core/src/lib/action-queue';
import { ConversationProvider } from '../../core/src/context/ConversationContext';
import ContactCard from '../../core/src/components/panels/ContactCard';
import ChatInput from '../../core/src/components/chat/ChatInput';
import TypingIndicator from '../../core/src/components/chat/TypingIndicator';
import type { Message } from '../../core/src/hooks/types';
import type { PanelState } from '../../core/src/lib/tool-handler';
import { handleToolCall } from '../../core/src/lib/tool-handler';
import { parseStream } from '../../core/src/lib/stream-parser';

vi.mock('../../core/src/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('../../core/src/lib/stream-parser', () => ({ parseStream: vi.fn() }));
vi.mock('../../core/src/lib/tool-handler', async importOriginal => {
  const original = await importOriginal<typeof import('../../core/src/lib/tool-handler')>();
  return { ...original, handleToolCall: vi.fn(original.handleToolCall) };
});
vi.mock('../../core/src/context/PortfolioDataContext', () => { const data = {
  config: { name: 'Andrey', social: { email: 'configured@example.test', linkedin: 'https://example.test/in/andrey' }, suggestedQuestions: [] },
  projects: [{ slug: 'domios' }, { slug: 'rekap' }],
}; return { usePortfolioData: () => data }; });

const classification = (leadScore?: number) => ({ available: true, visitorType: 'recruiter', intent: 'projects', language: 'en', leadScore });
let root: Root;
let container: HTMLDivElement;
let current: ReturnType<typeof useChatStream>;
let visibleMessages: Message[];
let stablePanel: PanelState;
let queue: ActionQueue;
let requestPromise: Promise<void>;
const fetchMock = vi.fn();
let events: any[];
const release = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
};
function Harness({ enhanced = true }: { enhanced?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [panelState, setPanelState] = useState<PanelState>({ open: false, type: null });
  visibleMessages = messages;
  stablePanel = panelState;
  current = useChatStream({ messages, setMessages, panelState, setPanelState, actionQueue: queue,
    enhancedExperience: enhanced, projectSlugs: ['domios', 'rekap'] });
  return React.createElement(ConversationProvider, { value: current.conversation },
    current.showLoading ? React.createElement(TypingIndicator, { thinkingStatus: current.thinkingStatus }) : null,
    current.error ? React.createElement('div', { role: 'alert' }, current.error.title) : null);
}
async function mount(enhanced = true) { await act(async () => { root.render(React.createElement(Harness, { enhanced })); }); }
async function send(content = 'Show Domios') {
  await act(async () => { requestPromise = current.sendMessage(content); });
}
async function flush() { await act(async () => { await requestPromise; }); }

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  queue = new ActionQueue(vi.fn());
  events = [];
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response('ok'));
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(handleToolCall).mockClear();
  vi.mocked(parseStream).mockImplementation(async function* () { yield* events; } as any);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('chat lifecycle adapters', () => {
  it('uses current computed intent, then real name, then neutral, never reasoning', () => {
    expect(loadingLabel(classification(), 'show_skills')).toBe('Looking through projects…');
    expect(loadingLabel({ ...classification(), available: false }, 'show_skills')).toBe('Opening skills…');
    expect(loadingLabel({ ...classification(), intent: 'raw private reasoning' })).toBe('Waiting for a response…');
    expect(loadingLabel()).toBe('Waiting for a response…');
  });
  it('validates complete schema args and real project slugs', () => {
    expect(validToolArguments('show_project', {}, ['domios'])).toBe(false);
    expect(validToolArguments('show_project', { slug: 'invented' }, ['domios'])).toBe(false);
    expect(validToolArguments('set_theme', { theme: 'unknown' })).toBe(false);
    expect(validToolArguments('remember_visitor', { name: 'Name', leadScore: 4 })).toBe(false);
    expect(validToolArguments('focus_screenshot', { slug: 'domios', index: -1 })).toBe(false);
    expect(validToolArguments('show_project', { slug: 'domios' }, ['domios'])).toBe(true);
  });
  it('discards stale metadata, tool calls and commentary after cancellation/reset', () => {
    const lifecycle = new ChatLifecycle();
    lifecycle.begin('old');
    lifecycle.reset();
    lifecycle.begin('new');
    expect(lifecycle.classify('old', classification(4))).toBe(false);
    expect(lifecycle.startTool('old', 'tool', 'show_project')).toBe(false);
    expect(lifecycle.dispatch('old', 'tool', 'remember_visitor', { name: 'old' })).toBe(false);
    expect(lifecycle.fitCommentary('old', 'old assessment')).toBe(false);
    expect(lifecycle.classification).toBeUndefined();
  });
  it('keeps shell and actual content generations distinct, including rollback/reopen', () => {
    const lifecycle = new ChatLifecycle();
    lifecycle.panel({ open: true, type: 'project', slug: 'domios' });
    const a = lifecycle.identity;
    lifecycle.begin('r');
    lifecycle.startTool('r', 't', 'show_project');
    const shell = lifecycle.pendingTool!.generation;
    lifecycle.dispatch('r', 't', 'show_project', { slug: 'rekap' });
    lifecycle.panel({ open: true, type: 'project', slug: 'rekap' }, true);
    expect(lifecycle.identity.generation).toBeGreaterThan(shell);
    expect(shell).toBeGreaterThan(a.generation);
    lifecycle.panel({ open: false, type: null });
    lifecycle.panel({ open: true, type: 'project', slug: 'rekap' });
    expect(lifecycle.identity.generation).toBeGreaterThan(shell + 1);
  });
});

describe('request hook with controlled streams (no production requests)', () => {
  it('renders accessible neutral feedback before headers with zero reasoning and no empty assistant', async () => {
    const headers = release<Response>();
    fetchMock.mockReturnValue(headers.promise);
    await mount();
    await send();
    expect(container.querySelector('[role=status]')?.textContent).toBe('Waiting for a response…');
    expect(visibleMessages).toEqual([{ role: 'user', content: 'Show Domios' }]);
    events = [{ type: 'text', content: 'Here is Domios.' }, { type: 'done' }];
    headers.resolve(new Response('ok'));
    await flush();
    expect(current.isLoading).toBe(false);
    expect(visibleMessages[1].content).toBe('Here is Domios.');
    expect(container.querySelector('[role=status]')).toBeNull();
  });
  it('opens pending name shell before args, executes one complete call, never executes duplicate', async () => {
    const args = release<void>();
    vi.mocked(parseStream).mockImplementation(async function* () {
      const requestId = JSON.parse(fetchMock.mock.calls[0][1].body).requestId;
      yield { type: 'tool_start', requestId, toolCallId: 't', name: 'show_project', id: 'e' };
      await args.promise;
      yield { type: 'tool_call', id: 't', name: 'show_project', arguments: { slug: 'domios' } };
      yield { type: 'tool_call', id: 't', name: 'show_project', arguments: { slug: 'domios' } };
      yield { type: 'done' };
    } as any);
    await mount();
    await send();
    expect(current.conversation.pendingTool?.panelType).toBe('project');
    expect(stablePanel).toEqual({ open: false, type: null });
    expect(handleToolCall).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Opening project…');
    args.resolve();
    await flush();
    expect(handleToolCall).toHaveBeenCalledExactlyOnceWith('show_project', { slug: 'domios' });
    expect(stablePanel.slug).toBe('domios');
    expect(current.conversation.pendingTool).toBeUndefined();
  });
  it('recovers invalid args without visitor/theme/game side effects or invented slug', async () => {
    events = [{ type: 'tool_call', id: 'bad', name: 'show_project', arguments: {} }, { type: 'done' }];
    await mount(); await send(); await flush();
    expect(handleToolCall).not.toHaveBeenCalled();
    expect(stablePanel.type).toBeNull();
    expect(current.error?.code).toBe('interrupted');
    expect(visibleMessages).toEqual([{ role: 'user', content: 'Show Domios' }]);
  });
  it('preserves requested panel through housekeeping while explicit next panel supersedes it', async () => {
    events = [
      { type: 'tool_call', id: '1', name: 'show_skills', arguments: {} },
      { type: 'text', content: 'Narration' },
      { type: 'tool_call', id: '2', name: 'hide_panel', arguments: {} },
      { type: 'tool_call', id: '3', name: 'highlight_project', arguments: { slug: 'domios' } },
      { type: 'done' },
    ];
    await mount(); await send(); await flush();
    expect(stablePanel.type).toBe('skills');
    events = [{ type: 'tool_call', id: '4', name: 'show_timeline', arguments: {} }, { type: 'done' }];
    await send('Show timeline'); await flush();
    expect(stablePanel.type).toBe('timeline');
  });
  it('recovers offline and retries the original visitor once with no stale history or duplicate clicks', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await mount(); await send('Python experience?'); await flush();
    expect(current.error?.code).toBe('offline');
    events = [{ type: 'text', content: 'Relevant experience.' }, { type: 'done' }];
    await act(async () => { current.retryLast(); current.retryLast(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.messages).toEqual([{ role: 'user', content: 'Python experience?' }]);
    expect(visibleMessages.filter(m => m.role === 'user')).toHaveLength(1);
    expect(visibleMessages.filter(m => m.role === 'assistant')).toHaveLength(1);
    expect(current.error).toBeNull();
  });
  it('uses typed quota and empty output states without duplicate error bubbles', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ remaining: 0 }), { status: 429 }));
    await mount(); await send(); await flush();
    expect(current.error?.code).toBe('quota');
    expect(current.error?.retryable).toBe(false);
    expect(visibleMessages).toHaveLength(1);
    events = [{ type: 'done' }];
    await send('Another question'); await flush();
    expect(current.error?.code).toBe('empty');
    expect(visibleMessages).toHaveLength(2);
  });
  it('does not delay text for slow classification; discards stale/late metadata and preserves one fit commentary', async () => {
    const metadata = release<void>();
    let id = '';
    vi.mocked(parseStream).mockImplementation(async function* () {
      id = JSON.parse(fetchMock.mock.calls[0][1].body).requestId;
      yield { type: 'text', content: 'Initial acknowledgement.' };
      await metadata.promise;
      yield { type: 'classification', id: 'e', requestId: 'stale', classification: classification(4) };
      yield { type: 'classification', id: 'e2', requestId: id, classification: classification(3) };
      yield { type: 'done' };
    } as any);
    await mount(); await send();
    expect(visibleMessages[1].content).toBe('Initial acknowledgement.');
    expect(current.showLoading).toBe(false);
    expect(current.conversation.classification).toBeUndefined();
    metadata.resolve(); await flush();
    expect(current.conversation.classification?.leadScore).toBe(3);
    await act(async () => {
      current.conversation.onFitCommentary?.(id, 'Computed fit commentary.');
      current.conversation.onFitCommentary?.(id, 'Duplicate commentary.');
    });
    expect(visibleMessages[1].content).toBe('Initial acknowledgement.\n\nComputed fit commentary.');
    expect(current.getMessageRequestId(visibleMessages[1])).toBe(id);
    const persisted = JSON.stringify(visibleMessages);
    expect(persisted).not.toMatch(/leadScore|classification|requestId|priorSessionHint/);
    expect(JSON.stringify(stablePanel)).not.toContain('lead');
    expect(localStorage.length).toBe(0);
    await act(async () => window.dispatchEvent(new Event('clear-chat')));
    expect(current.conversation.classification).toBeUndefined();
    expect(current.conversation.activeRequestId).toBeUndefined();
    expect(current.isLoading).toBe(false);
  });
  it('keeps Anya/default request free of Jev/calibration fields', async () => {
    events = [{ type: 'text', content: 'Default answer' }, { type: 'done' }];
    await mount(false); await send(); await flush();
    expect(Object.keys(JSON.parse(fetchMock.mock.calls[0][1].body))).toEqual(['messages']);
    expect(current.conversation.enabled).toBe(false);
  });
  it('allows the next turn after the secondary fit endpoint fails or never returns', async () => {
    events = [{ type: 'tool_call', id: 'match', name: 'match_job', arguments: { role: 'Engineer', company: 'Example', description: 'Python and TypeScript' } }, { type: 'done' }];
    await mount(); await send('Compare this role'); await flush();
    const oldId = current.conversation.activeRequestId!;
    expect(current.isLoading).toBe(false);
    events = [{ type: 'text', content: 'Next turn works.' }, { type: 'done' }];
    await send('Show skills instead'); await flush();
    await act(async () => current.conversation.onFitCommentary?.(oldId, 'Stale fit result'));
    expect(visibleMessages.at(-1)?.content).toBe('Next turn works.');
    expect(JSON.stringify(visibleMessages)).not.toContain('Stale fit result');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('keeps a correction visible while invalidating its stale receipt and keeping metadata volatile', async () => {
    vi.mocked(parseStream).mockImplementation(async function* () {
      const requestId = JSON.parse(fetchMock.mock.calls[0][1].body).requestId;
      yield { type: 'text', content: 'Original claim.' };
      yield { type: 'claim_receipt', id: 'receipt', requestId, claimId: 'c', start: 0, end: 15, source: 'project', available: true };
      yield { type: 'correction', id: 'correction', requestId, claimId: 'c', text: 'Correction: the evidence is narrower.' };
      yield { type: 'done' };
    } as any);
    await mount(); await send(); await flush();
    const id = current.conversation.activeRequestId!;
    expect(visibleMessages[1].content).toBe('Original claim.\n\nCorrection: the evidence is narrower.');
    expect(current.conversation.receiptsByRequest?.[id]).toEqual([]);
    expect(current.conversation.correctionsByRequest?.[id]).toHaveLength(1);
    expect(JSON.stringify(visibleMessages)).not.toMatch(/claimId|receiptsByRequest|source/);
    const restored = JSON.parse(JSON.stringify(visibleMessages));
    expect(current.getMessageRequestId(restored[1])).toBeUndefined();
  });
  it('cancels pending metadata and dispatch after clear-chat without resurrecting loading', async () => {
    const resume = release<void>();
    vi.mocked(parseStream).mockImplementation(async function* () {
      const requestId = JSON.parse(fetchMock.mock.calls[0][1].body).requestId;
      yield { type: 'tool_start', id: 'event', requestId, toolCallId: 'pending', name: 'show_project' };
      await resume.promise;
      yield { type: 'tool_call', id: 'pending', name: 'show_project', arguments: { slug: 'domios' } };
      yield { type: 'classification', id: 'late', requestId, classification: classification(4) };
    } as any);
    await mount(); await send();
    expect(current.conversation.pendingTool).toBeDefined();
    await act(async () => window.dispatchEvent(new Event('clear-chat')));
    resume.resolve(); await flush();
    expect(current.isLoading).toBe(false);
    expect(current.conversation.pendingTool).toBeUndefined();
    expect(current.conversation.classification).toBeUndefined();
    expect(handleToolCall).not.toHaveBeenCalled();
  });
});

describe('contact and keyboard surfaces', () => {
  it.each([2.5, 4, 2.49, undefined, NaN, 5])('only offers configured next action for valid high lead %s', async score => {
    const value = classification(score);
    await act(async () => root.render(React.createElement(ConversationProvider, { value: { enabled: true, classification: value } }, React.createElement(ContactCard))));
    const link = [...container.querySelectorAll('a')].find(a => a.textContent === 'Share a few details by email');
    expect(Boolean(link)).toBe(relevantContact(value));
    if (link) expect(link.getAttribute('href')).toBe('mailto:configured@example.test');
    expect(container.textContent).not.toMatch(/score/i);
    expect(container.textContent).toContain('configured@example.test');
  });
  it('sends by Enter with accessible names and keeps focus', async () => {
    const send = vi.fn();
    await act(async () => root.render(React.createElement(ChatInput, { onSend: send, focusOnMount: true })));
    const input = container.querySelector('textarea')!;
    expect(input.getAttribute('aria-label')).toBe('Message');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    await act(async () => { setter.call(input, 'Show REKAP'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(send).toHaveBeenCalledExactlyOnceWith('Show REKAP');
    expect(document.activeElement).toBe(input);
    expect(container.querySelector('button')?.getAttribute('aria-label')).toBe('Send message');
  });
});
