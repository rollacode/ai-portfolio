'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import ContentPanel from './ContentPanel';
import { parseStream } from '@/lib/stream-parser';
import { handleToolCall, type PanelState, type PanelAction } from '@/lib/tool-handler';
import { ActionQueue } from '@/lib/action-queue';
import { saveMessages, loadMessages, savePanelState, loadPanelState, clearAll } from '@/lib/chat-store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import config from '@/portfolio/config.json';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ToolCallEntry {
  name: string;
  arguments: Record<string, any>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallEntry[];
  isError?: boolean;
}

// Layout states:
// 'welcome'  — no messages, centered minimal landing
// 'chat'     — messages exist, centered chat (no panel)
// 'split'    — panel open on left, chat pushed right
type LayoutMode = 'welcome' | 'chat' | 'split';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_PANEL_STATE: PanelState = { open: false, type: null };
const SPRING = { type: 'spring' as const, damping: 25, stiffness: 200 };
const PANEL_WIDTH = 'calc(100vw - 500px)';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [panelState, setPanelState] = useState<PanelState>(DEFAULT_PANEL_STATE);
  const [currentAction, setCurrentAction] = useState<PanelAction | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // ---------------------------------------------------------------------------
  // Layout mode
  // ---------------------------------------------------------------------------

  const layout: LayoutMode =
    messages.length === 0
      ? 'welcome'
      : panelState.open && isDesktop
        ? 'split'
        : 'chat';

  // ---------------------------------------------------------------------------
  // Action queue
  // ---------------------------------------------------------------------------

  const actionQueue = useMemo(
    () => new ActionQueue((a) => setCurrentAction(a)),
    [],
  );

  // ---------------------------------------------------------------------------
  // Auto-scroll
  // ---------------------------------------------------------------------------

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ---------------------------------------------------------------------------
  // IndexedDB persistence
  // ---------------------------------------------------------------------------

  useEffect(() => {
    loadMessages().then((saved) => {
      if (saved.length > 0) setMessages(saved);
    });
    loadPanelState().then((saved) => {
      if (saved) setPanelState(saved as PanelState);
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    savePanelState(panelState);
  }, [panelState]);

  // ---------------------------------------------------------------------------
  // Clear chat (via custom event)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleClear = () => {
      clearAll();
      setMessages([]);
      setPanelState(DEFAULT_PANEL_STATE);
      actionQueue.clear();
    };
    window.addEventListener('clear-chat', handleClear);
    return () => window.removeEventListener('clear-chat', handleClear);
  }, [actionQueue]);

  // ---------------------------------------------------------------------------
  // Panel callbacks
  // ---------------------------------------------------------------------------

  const handlePanelClose = useCallback(() => {
    setPanelState(DEFAULT_PANEL_STATE);
    actionQueue.setPanelReady(false);
    actionQueue.clear();
  }, [actionQueue]);

  const handlePanelAnimationComplete = useCallback(() => {
    actionQueue.setPanelReady(true);
  }, [actionQueue]);

  const handleActionConsumed = useCallback(() => {
    setCurrentAction(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Stream helpers
  // ---------------------------------------------------------------------------

  const appendAssistantText = useCallback((text: string) => {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === 'assistant') {
        updated[updated.length - 1] = { ...last, content: last.content + text };
      }
      return updated;
    });
  }, []);

  const processToolCall = useCallback(
    (name: string, args: Record<string, any>) => {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          const toolCalls = [...(last.toolCalls ?? []), { name, arguments: args }];
          updated[updated.length - 1] = { ...last, toolCalls };
        }
        return updated;
      });
      const result = handleToolCall(name, args);
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
    [actionQueue],
  );

  const appendError = useCallback((message: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant' && last.content === '') {
        return [...prev.slice(0, -1), { role: 'assistant' as const, content: message, isError: true }];
      }
      return [...prev, { role: 'assistant' as const, content: message, isError: true }];
    });
  }, []);

  const markLastAsError = useCallback((suffix: string) => {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === 'assistant') {
        updated[updated.length - 1] = { ...last, content: last.content + '\n\n' + suffix, isError: true };
      }
      return updated;
    });
  }, []);

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

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updatedHistory }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            appendError("I'm getting a lot of questions! Please wait a moment and try again.");
          } else {
            appendError("Sorry, I'm having trouble connecting. Please try again.");
          }
          return;
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
        let hadContent = false;

        for await (const event of parseStream(response)) {
          switch (event.type) {
            case 'text':
              hadContent = true;
              appendAssistantText(event.content);
              break;
            case 'tool_call':
              hadContent = true;
              processToolCall(event.name, event.arguments);
              break;
            case 'error':
              hadContent
                ? markLastAsError('Sorry, the response was interrupted. Please try again.')
                : appendError(event.message);
              break;
            case 'done':
              break;
          }
        }
      } catch (err) {
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
      } finally {
        setIsLoading(false);
      }
    },
    [messages, appendAssistantText, processToolCall, appendError, markLastAsError],
  );

  // ---------------------------------------------------------------------------
  // Retry
  // ---------------------------------------------------------------------------

  const handleRetry = useCallback(() => {
    if (!lastUserMessage || isLoading) return;
    setMessages((prev) => {
      const trimmed = [...prev];
      while (trimmed.length && trimmed[trimmed.length - 1].role === 'assistant' && trimmed[trimmed.length - 1].isError) trimmed.pop();
      if (trimmed.length && trimmed[trimmed.length - 1].role === 'user') trimmed.pop();
      return trimmed;
    });
    setTimeout(() => sendMessage(lastUserMessage), 50);
  }, [lastUserMessage, isLoading, sendMessage]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Panel — only rendered in split mode (or mobile overlay) */}
      <ContentPanel
        panelState={panelState}
        currentAction={currentAction}
        onActionConsumed={handleActionConsumed}
        onAnimationComplete={handlePanelAnimationComplete}
        onClose={handlePanelClose}
      />

      {/* ================================================================== */}
      {/* WELCOME — centered landing                                         */}
      {/* ================================================================== */}
      {/* ================================================================== */}
      {/* WELCOME — title + input centered together                          */}
      {/* ================================================================== */}
      <AnimatePresence>
        {layout === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="fixed inset-0 flex flex-col items-center justify-center z-10 print:hidden"
          >
            <h1 className="text-2xl md:text-3xl font-medium text-gray-500 dark:text-gray-500 mb-6">
              ask me about <span className="text-black dark:text-white">{(config as Record<string, unknown>).firstName as string || config.name.split(' ')[0]}</span>
            </h1>
            <div className="w-full max-w-3xl px-4">
              <ChatInput onSend={sendMessage} disabled={isLoading} animatePlaceholder />
              <p className="text-[10px] text-center text-gray-400 dark:text-gray-600 mt-2">
                {(config as Record<string, unknown>).firstName as string || config.name.split(' ')[0]}&apos;s portfolio agent
                {config.social?.github && (
                  <>
                    {' · '}
                    <a
                      href={config.social.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gray-300 transition-colors"
                    >
                      GitHub
                    </a>
                  </>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================== */}
      {/* CHAT / SPLIT — messages + floating input at bottom                 */}
      {/* ================================================================== */}
      {layout !== 'welcome' && (
        <>
          <div
            className="flex flex-col h-screen transition-all duration-300 ease-out print:hidden"
            style={layout === 'split' ? { marginLeft: 'calc(100vw - 500px)' } : undefined}
          >
            <div className="flex-1 overflow-y-auto pb-32 pt-6">
              <div className={`mx-auto px-4 space-y-4 ${layout === 'split' ? 'max-w-[500px]' : 'max-w-3xl'}`}>
                {messages.map((msg, i) => {
                  // Don't render empty assistant message while loading — TypingIndicator replaces it
                  const isEmptyStreaming = isLoading && msg.role === 'assistant' && msg.content === '' && i === messages.length - 1;
                  if (isEmptyStreaming) {
                    return (
                      <TypingIndicator
                        key={i}
                        currentTools={msg.toolCalls}
                      />
                    );
                  }
                  return (
                    <ChatMessage
                      key={i}
                      role={msg.role}
                      content={msg.content}
                      toolCalls={msg.toolCalls}
                      isError={msg.isError}
                      onRetry={msg.isError ? handleRetry : undefined}
                    />
                  );
                })}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none print:hidden"
               style={layout === 'split' ? { paddingLeft: 'calc(100vw - 500px)' } : undefined}
          >
            <div className={`mx-auto px-4 pb-4 pt-2 pointer-events-auto ${layout === 'split' ? 'max-w-[500px]' : 'max-w-3xl'}`}>
              <ChatInput onSend={sendMessage} disabled={isLoading} />
              <p className="text-[10px] text-center text-gray-400 dark:text-gray-600 mt-2">
                {(config as Record<string, unknown>).firstName as string || config.name.split(' ')[0]}&apos;s portfolio agent
                {config.social?.github && (
                  <>
                    {' · '}
                    <a
                      href={config.social.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gray-300 transition-colors"
                    >
                      GitHub
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
