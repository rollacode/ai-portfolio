'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import ContentPanel from './ContentPanel';
import { type PanelState, type PanelAction } from '@/lib/tool-handler';
import { ActionQueue } from '@/lib/action-queue';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useChatPersistence } from '@/hooks/useChatPersistence';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useChatStream } from '@/hooks/useChatStream';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import type { Message } from '@/hooks/types';
import MobileChatSheet from './MobileChatSheet';
import Link from 'next/link';
import config from '@/portfolio/config.json';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_PANEL_STATE: PanelState = { open: false, type: null };

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function Chat() {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [panelState, setPanelState] = useState<PanelState>(DEFAULT_PANEL_STATE);
  const [currentAction, setCurrentAction] = useState<PanelAction | null>(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [prefillText, setPrefillText] = useState('');

  // Action queue (stable singleton)
  const actionQueue = useMemo(
    () => new ActionQueue((a) => setCurrentAction(a)),
    [],
  );

  // Derived layout
  const layout = useLayoutMode(messages, panelState, isDesktop);

  // Persistence (IndexedDB load/save + clear-chat event)
  useChatPersistence({ messages, setMessages, panelState, setPanelState, actionQueue });

  // Auto-scroll sentinel ref
  const messagesEndRef = useAutoScroll(messages);

  // Streaming, send, retry
  const { sendMessage, retryLast, isLoading } = useChatStream({
    messages,
    setMessages,
    setPanelState,
    actionQueue,
  });

  // Panel callbacks
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
  // Render
  // ---------------------------------------------------------------------------

  const firstName = (config as Record<string, unknown>).firstName as string || config.name.split(' ')[0];

  return (
    <>
      {/* Panel */}
      <ContentPanel
        panelState={panelState}
        currentAction={currentAction}
        onActionConsumed={handleActionConsumed}
        onAnimationComplete={handlePanelAnimationComplete}
        onClose={handlePanelClose}
        onNavigate={(newState) => setPanelState(prev => ({ ...prev, ...newState }))}
        onPrefillChat={setPrefillText}
      />

      {/* WELCOME — centered landing */}
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
              ask me about <span className="text-black dark:text-white">{firstName}</span>
            </h1>
            <div className="w-full max-w-3xl px-4">
              <ChatInput onSend={sendMessage} disabled={isLoading} animatePlaceholder prefillText={prefillText} onPrefillConsumed={() => setPrefillText('')} />
              <p className="text-[10px] text-center text-gray-400 dark:text-gray-600 mt-2">
                {firstName}&apos;s portfolio agent
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
                {' · '}
                <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
                {' · '}
                <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: collapsed chat tab + bottom sheet when panel is open */}
      {layout !== 'welcome' && !isDesktop && panelState.open && (
        <MobileChatSheet
          messages={messages}
          isLoading={isLoading}
          onSend={sendMessage}
          onRetry={retryLast}
          prefillText={prefillText}
          onPrefillConsumed={() => setPrefillText('')}
        />
      )}

      {/* CHAT / SPLIT — messages + floating input (hidden on mobile when panel open) */}
      {layout !== 'welcome' && !(! isDesktop && panelState.open) && (
        <>
          <div
            className="flex flex-col h-screen transition-all duration-300 ease-out print:hidden"
            style={layout === 'split' ? { marginLeft: 'calc(100vw - 500px)' } : undefined}
          >
            <div className="flex-1 overflow-y-auto pb-32 pt-6">
              <div className={`mx-auto px-4 space-y-4 ${layout === 'split' ? 'max-w-[500px]' : 'max-w-3xl'}`}>
                {messages.map((msg, i) => {
                  const isEmptyStreaming = isLoading && msg.role === 'assistant' && msg.content === '' && i === messages.length - 1;
                  if (isEmptyStreaming) {
                    return <TypingIndicator key={i} currentTools={msg.toolCalls} />;
                  }
                  return (
                    <ChatMessage
                      key={i}
                      role={msg.role}
                      content={msg.content}
                      toolCalls={msg.toolCalls}
                      isError={msg.isError}
                      onRetry={msg.isError ? retryLast : undefined}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          <div
            className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none print:hidden"
            style={layout === 'split' ? { paddingLeft: 'calc(100vw - 500px)' } : undefined}
          >
            <div className={`mx-auto px-4 pb-4 pt-2 pointer-events-auto ${layout === 'split' ? 'max-w-[500px]' : 'max-w-3xl'}`}>
              <ChatInput onSend={sendMessage} disabled={isLoading} prefillText={prefillText} onPrefillConsumed={() => setPrefillText('')} />
              <p className="text-[10px] text-center text-gray-400 dark:text-gray-600 mt-2">
                {firstName}&apos;s portfolio agent
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
                {' · '}
                <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
                {' · '}
                <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
