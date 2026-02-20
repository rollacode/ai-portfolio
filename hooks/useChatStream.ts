'use client';

import { useState, useCallback } from 'react';
import { parseStream } from '@/lib/stream-parser';
import { handleToolCall, type PanelState, type PanelAction } from '@/lib/tool-handler';
import type { ActionQueue } from '@/lib/action-queue';
import type { Message } from './types';

// -----------------------------------------------------------------------------
// Args
// -----------------------------------------------------------------------------

interface UseChatStreamArgs {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setPanelState: React.Dispatch<React.SetStateAction<PanelState>>;
  actionQueue: ActionQueue;
}

// -----------------------------------------------------------------------------
// Return type
// -----------------------------------------------------------------------------

interface UseChatStreamReturn {
  sendMessage: (content: string) => Promise<void>;
  retryLast: () => void;
  isLoading: boolean;
}

// -----------------------------------------------------------------------------
// Internal helpers (message state updaters)
// -----------------------------------------------------------------------------

function appendAssistantText(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  text: string,
) {
  setMessages((prev) => {
    const updated = [...prev];
    const last = updated[updated.length - 1];
    if (last?.role === 'assistant') {
      updated[updated.length - 1] = { ...last, content: last.content + text };
    }
    return updated;
  });
}

function appendToolCall(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  name: string,
  args: Record<string, any>,
) {
  setMessages((prev) => {
    const updated = [...prev];
    const last = updated[updated.length - 1];
    if (last?.role === 'assistant') {
      const toolCalls = [...(last.toolCalls ?? []), { name, arguments: args }];
      updated[updated.length - 1] = { ...last, toolCalls };
    }
    return updated;
  });
}

function appendError(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  message: string,
) {
  setMessages((prev) => {
    const last = prev[prev.length - 1];
    if (last?.role === 'assistant' && last.content === '') {
      return [...prev.slice(0, -1), { role: 'assistant' as const, content: message, isError: true }];
    }
    return [...prev, { role: 'assistant' as const, content: message, isError: true }];
  });
}

function markLastAsError(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  suffix: string,
) {
  setMessages((prev) => {
    const updated = [...prev];
    const last = updated[updated.length - 1];
    if (last?.role === 'assistant') {
      updated[updated.length - 1] = { ...last, content: last.content + '\n\n' + suffix, isError: true };
    }
    return updated;
  });
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useChatStream({
  messages,
  setMessages,
  setPanelState,
  actionQueue,
}: UseChatStreamArgs): UseChatStreamReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Process a single tool call result
  // ---------------------------------------------------------------------------

  const processToolCall = useCallback(
    (name: string, args: Record<string, any>) => {
      appendToolCall(setMessages, name, args);
      const result = handleToolCall(name, args);

      // Handle set_theme immediately — it's a side effect, not a panel action
      if (result.action?.type === 'set_theme') {
        const html = document.documentElement;
        const theme = result.action.theme;
        if (theme === 'toggle') {
          html.classList.toggle('dark');
        } else if (theme === 'dark') {
          html.classList.add('dark');
        } else {
          html.classList.remove('dark');
        }
        localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
        return;
      }

      if (result.panelState) {
        // When switching panel type, reset action queue so queued actions
        // from the old panel don't fire on the new one
        setPanelState((prev) => {
          const next = { ...prev, ...result.panelState };
          if (next.type !== prev.type && prev.open && next.open) {
            // Panel type is changing while staying open — reset queue
            actionQueue.clear();
            actionQueue.setPanelReady(false);
          }
          return next;
        });
      }
      if (result.action) actionQueue.enqueue(result.action);
    },
    [setMessages, setPanelState, actionQueue],
  );

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = { role: 'user', content };
      const updatedHistory = [...messages, userMessage];
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setLastUserMessage(content);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updatedHistory }),
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 429) {
            try {
              const body = await response.json();
              if (body.remaining === 0 && body.limit) {
                // Daily quota exhausted — show friendly message with contact links
                appendError(
                  setMessages,
                  "Daily message limit reached! Thanks for the interest though — really appreciate it.\n\nIf you'd like to continue the conversation, reach out directly:\n\n" +
                  "- Email: [g.andry90@gmail.com](mailto:g.andry90@gmail.com)\n" +
                  "- LinkedIn: [linkedin.com/in/andrey-roll](https://www.linkedin.com/in/andrey-roll/)\n\n" +
                  "The limit resets tomorrow, so feel free to come back!"
                );
              } else {
                appendError(setMessages, "I'm getting a lot of questions! Please wait a moment and try again.");
              }
            } catch {
              appendError(setMessages, "I'm getting a lot of questions! Please wait a moment and try again.");
            }
          } else {
            appendError(setMessages, "Sorry, I'm having trouble connecting. Please try again.");
          }
          return;
        }

        // Response received — clear the connection timeout (stream can take longer)
        clearTimeout(timeout);

        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
        let hadContent = false;

        for await (const event of parseStream(response)) {
          switch (event.type) {
            case 'text':
              hadContent = true;
              appendAssistantText(setMessages, event.content);
              break;
            case 'tool_call':
              hadContent = true;
              processToolCall(event.name, event.arguments);
              break;
            case 'error':
              hadContent
                ? markLastAsError(setMessages, 'Sorry, the response was interrupted. Please try again.')
                : appendError(setMessages, event.message);
              break;
            case 'done':
              break;
          }
        }
      } catch (err) {
        clearTimeout(timeout);

        const isTimeout = err instanceof DOMException && err.name === 'AbortError';
        if (isTimeout) {
          appendError(setMessages, "Response is taking too long — the AI server might be overloaded. Please try again in a moment.");
        } else {
          console.error('Error sending message:', err);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant' && last.content.length > 0 && !last.isError) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                content: last.content + '\n\nSorry, the response was interrupted. Please try again.',
                isError: true,
              };
              return updated;
            }
            return prev;
          });
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.isError) return prev;
            return [...prev, { role: 'assistant' as const, content: "Sorry, I'm having trouble connecting. Please try again.", isError: true }];
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [messages, setMessages, processToolCall],
  );

  // ---------------------------------------------------------------------------
  // Retry last message
  // ---------------------------------------------------------------------------

  const retryLast = useCallback(() => {
    if (!lastUserMessage || isLoading) return;
    setMessages((prev) => {
      const trimmed = [...prev];
      while (trimmed.length && trimmed[trimmed.length - 1].role === 'assistant' && trimmed[trimmed.length - 1].isError) trimmed.pop();
      if (trimmed.length && trimmed[trimmed.length - 1].role === 'user') trimmed.pop();
      return trimmed;
    });
    setTimeout(() => sendMessage(lastUserMessage), 50);
  }, [lastUserMessage, isLoading, sendMessage, setMessages]);

  return { sendMessage, retryLast, isLoading };
}
