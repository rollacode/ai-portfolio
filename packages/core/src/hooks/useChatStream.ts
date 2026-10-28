'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { parseStream, type StreamEvent } from '../lib/stream-parser';
import { handleToolCall, type PanelState } from '../lib/tool-handler';
import type { ActionQueue } from '../lib/action-queue';
import type { Message } from './types';
import { track } from '../lib/analytics';
import { ChatLifecycle, loadingLabel, retryHistory, validToolArguments } from '../lib/chat-lifecycle';
import { parseClassification, type ConversationEvent, type ClaimReceipt, type ConversationRequestFields } from '../lib/conversation-events';
import { getConversationError, type ConversationError, type ConversationErrorCode } from '../lib/conversation-errors';
import type { ConversationContextValue } from '../context/ConversationContext';

interface UseChatStreamArgs {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  panelState: PanelState;
  setPanelState: React.Dispatch<React.SetStateAction<PanelState>>;
  actionQueue: ActionQueue;
  onShowtime?: (topic: string, intent: string) => void;
  enhancedExperience?: boolean;
  projectSlugs?: readonly string[];
}

export function useChatStream({ messages, setMessages, panelState, setPanelState, actionQueue,
  onShowtime, enhancedExperience = false, projectSlugs }: UseChatStreamArgs) {
  const [lifecycle] = useState(() => new ChatLifecycle());
  const [requestIds] = useState(() => new WeakMap<Message, string>());
  const [, redraw] = useState(0);
  const refresh = useCallback(() => redraw(n => n + 1), []);
  const history = useRef(messages);
  history.current = messages;
  const panel = useRef(panelState);
  panel.current = panelState;
  const controller = useRef<AbortController | null>(null);
  const assistantIndex = useRef(-1);
  const hasText = useRef(false);
  const [error, setError] = useState<ConversationError | null>(null);
  const [receipts, setReceipts] = useState<Record<string, ClaimReceipt[]>>({});
  const [corrections, setCorrections] = useState<Record<string, string[]>>({});

  const updateMessages = useCallback((update: (previous: Message[]) => Message[]) => {
    // Keep the event-handler snapshot synchronous, including rapid Retry clicks.
    history.current = update(history.current);
    setMessages(history.current);
  }, [setMessages]);

  const navigatePanel = useCallback((next: PanelState, force = false) => {
    lifecycle.dismissPending();
    panel.current = next;
    if (lifecycle.panel(next, force)) {
      actionQueue.setPanelIdentity(lifecycle.identity);
    }
    setPanelState(next);
    refresh();
  }, [lifecycle, actionQueue, setPanelState, refresh]);

  useEffect(() => {
    if (lifecycle.panel(panelState)) {
      actionQueue.setPanelIdentity(lifecycle.identity);
      refresh();
    }
  }, [panelState, lifecycle, actionQueue, refresh]);

  const resetSession = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    lifecycle.reset();
    actionQueue.setPanelIdentity(lifecycle.identity);
    setReceipts({});
    setCorrections({});
    setError(null);
    hasText.current = false;
    refresh();
  }, [lifecycle, actionQueue, refresh]);
  useEffect(() => {
    window.addEventListener('clear-chat', resetSession);
    return () => {
      window.removeEventListener('clear-chat', resetSession);
      controller.current?.abort();
      lifecycle.reset();
      actionQueue.clear();
    };
  }, [resetSession, lifecycle, actionQueue]);

  const appendToTurn = useCallback((id: string, update: (message: Message) => Message) => {
    if (id !== lifecycle.requestId) return;
    updateMessages(previous => {
      const next = [...previous];
      if (assistantIndex.current < 0) {
        assistantIndex.current = next.length;
        next.push({ role: 'assistant', content: '' });
      }
      const index = assistantIndex.current;
      if (next[index]?.role === 'assistant') {
        next[index] = update(next[index]);
        requestIds.set(next[index], id);
      }
      return next;
    });
  }, [lifecycle, updateMessages, requestIds]);

  const onFitCommentary = useCallback((id: string, text: string) => {
    if (!enhancedExperience || !lifecycle.fitCommentary(id, text)) return;
    appendToTurn(id, message => ({ ...message, content: message.content + (message.content ? '\n\n' : '') + text }));
    refresh();
  }, [enhancedExperience, lifecycle, appendToTurn, refresh]);

  const runRequest = useCallback(async (requestHistory: Message[], visibleHistory: Message[]) => {
    if (lifecycle.status === 'loading') return;
    const priorHint = enhancedExperience ? parseClassification(lifecycle.classification) : undefined;
    const id = crypto.randomUUID();
    lifecycle.begin(id);
    assistantIndex.current = -1;
    hasText.current = false;
    setError(null);
    updateMessages(() => visibleHistory);
    refresh(); // Feedback is visible before fetch resolves or headers arrive.
    const abort = new AbortController();
    controller.current = abort;
    let timedOut = false;
    let failed = false;
    let meaningful = false;
    let done = false;
    let requestedPanel = false;
    const timeout = setTimeout(() => { timedOut = true; abort.abort(); }, 30_000);
    const fail = (code: ConversationErrorCode) => {
      failed = true;
      if (lifecycle.current(id)) setError(getConversationError(code));
    };
    try {
      const fields: ConversationRequestFields = enhancedExperience ? {
        requestId: id, ...(priorHint?.available ? { priorSessionHint: priorHint } : {}),
        capabilities: { calibrated: true, deferMatchCommentary: true },
      } : {};
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: requestHistory, ...fields }), signal: abort.signal,
      });
      if (!lifecycle.current(id)) return;
      if (!response.ok) {
        if (response.status === 429) {
          const body = await response.json().catch(() => null);
          fail(body?.remaining === 0 ? 'quota' : 'rate_limit');
        } else fail('unavailable');
        return;
      }
      // The deadline covers the entire stream, including a hung body.
      for await (const event of parseStream(response) as AsyncIterable<StreamEvent | ConversationEvent>) {
        if (!lifecycle.current(id)) break;
        if ('requestId' in event && event.requestId !== id) continue;
        switch (event.type) {
          case 'reasoning': break; // Never interpret or reveal provider reasoning.
          case 'classification':
            if (enhancedExperience) lifecycle.classify(id, event.classification);
            break;
          case 'tool_start':
            if (enhancedExperience && lifecycle.startTool(id, event.toolCallId, event.name)) {
              actionQueue.setPanelIdentity({ type: lifecycle.pendingTool!.panelType, generation: lifecycle.pendingTool!.generation });
            }
            break;
          case 'claim_receipt':
            if (enhancedExperience) setReceipts(previous => ({ ...previous, [id]: [...(previous[id] || []).filter(r => r.claimId !== event.claimId), event] }));
            break;
          case 'correction':
            if (enhancedExperience) {
              setCorrections(previous => ({ ...previous, [id]: [...(previous[id] || []), event.text] }));
              setReceipts(previous => ({ ...previous, [id]: (previous[id] || []).filter(r => event.claimId ? r.claimId !== event.claimId : false) }));
              // Append visibly; never erase text that has already been read.
              appendToTurn(id, message => ({ ...message, content: message.content + '\n\n' + event.text }));
            }
            break;
          case 'text':
            if (!event.content) break;
            meaningful = true;
            hasText.current = true;
            appendToTurn(id, message => ({ ...message, content: message.content + event.content }));
            break;
          case 'tool_call': {
            if (!validToolArguments(event.name, event.arguments, projectSlugs)) {
              lifecycle.pendingTool = undefined;
              fail('interrupted');
              break;
            }
            if (!lifecycle.dispatch(id, event.id, event.name, event.arguments, projectSlugs)) break;
            meaningful = true;
            const result = handleToolCall(event.name, event.arguments);
            appendToTurn(id, message => ({ ...message, toolCalls: [...(message.toolCalls || []), { name: event.name, arguments: event.arguments }] }));
            if (result.showtime) onShowtime?.(result.showtime.topic, result.showtime.intent);
            if (result.action?.type === 'set_theme') {
              const html = document.documentElement;
              const theme = result.action.theme;
              if (theme === 'fallout') html.classList.add('dark', 'fallout');
              else {
                html.classList.remove('fallout');
                if (theme === 'toggle') html.classList.toggle('dark');
                else html.classList.toggle('dark', theme === 'dark');
              }
              localStorage.setItem('theme', theme === 'fallout' ? theme : html.classList.contains('dark') ? 'dark' : 'light');
            } else {
              if (result.panelState) {
                const explicit = event.name.startsWith('show_') || ['match_job', 'compare_projects', 'play_game'].includes(event.name);
                const base = result.panelState.type === panel.current.type ? panel.current : { open: false, type: null };
                const next = { ...base, ...result.panelState } as PanelState;
                const same = next.type === panel.current.type && next.slug === panel.current.slug;
                // Housekeeping/narration must not replace the requested panel.
                if (!enhancedExperience || !requestedPanel || explicit || same && event.name !== 'hide_panel') {
                  navigatePanel(next, explicit);
                  if (explicit) requestedPanel = true;
                }
              }
              if (result.action && (!requestedPanel || !result.panelState || result.panelState.type === panel.current.type)) {
                actionQueue.enqueue(result.action, lifecycle.identity);
              }
            }
            break;
          }
          case 'error':
            if ('error' in event && event.error.code === 'jev_unavailable') break;
            fail('error' in event ? event.error.code : meaningful ? 'interrupted' : 'unavailable');
            break;
          case 'done': done = true; break;
        }
        refresh();
        if (failed) break;
      }
      if (!failed && !done) fail('interrupted');
      else if (!failed && !meaningful) fail('empty');
    } catch {
      if (lifecycle.current(id)) fail(timedOut ? 'timeout' : typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : meaningful ? 'interrupted' : 'network');
    } finally {
      clearTimeout(timeout);
      if (lifecycle.current(id)) {
        lifecycle.finish(id, failed);
        // Clear pending shell and restore readiness for the last stable content.
        actionQueue.setPanelIdentity(lifecycle.identity);
        controller.current = null;
        refresh();
      }
    }
  }, [lifecycle, enhancedExperience, updateMessages, refresh, appendToTurn, actionQueue, projectSlugs, onShowtime, navigatePanel]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || lifecycle.status === 'loading') return;
    const next = [...history.current, { role: 'user' as const, content }];
    track('message_sent', { message: content, message_length: content.length, message_index: next.length });
    await runRequest(next, next);
  }, [lifecycle, runRequest]);
  const retryLast = useCallback(() => {
    if (lifecycle.status === 'loading' || !error?.retryable) return;
    const requestHistory = retryHistory(history.current);
    if (!requestHistory) return;
    // Preserve partial answers already read, and reuse the original visitor turn.
    void runRequest(requestHistory, history.current.filter(m => !m.isError));
  }, [lifecycle, runRequest, error]);

  const conversation: ConversationContextValue = {
    enabled: enhancedExperience, activeRequestId: lifecycle.requestId,
    requestStatus: lifecycle.status, classification: lifecycle.classification,
    pendingTool: lifecycle.pendingTool,
    panelIdentity: lifecycle.pendingTool ? { type: lifecycle.pendingTool.panelType, generation: lifecycle.pendingTool.generation } : lifecycle.identity,
    receiptsByRequest: receipts, correctionsByRequest: corrections, onFitCommentary,
  };
  return { sendMessage, retryLast, isLoading: lifecycle.status === 'loading',
    showLoading: lifecycle.status === 'loading' && !hasText.current,
    thinkingStatus: loadingLabel(lifecycle.classification, lifecycle.toolName),
    error, conversation, navigatePanel, resetSession,
    getMessageRequestId: (message: Message) => requestIds.get(message) };
}
