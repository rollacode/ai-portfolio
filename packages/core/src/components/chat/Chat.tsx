'use client';

import { useState, useCallback, useMemo, useRef, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import ContentPanel from '../panels/ContentPanel';
import { type PanelState, type PanelAction } from '../../lib/tool-handler';
import { ActionQueue } from '../../lib/action-queue';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useChatPersistence } from '../../hooks/useChatPersistence';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import { useChatStream } from '../../hooks/useChatStream';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import type { Message } from '../../hooks/types';
import MobileChatSheet from './MobileChatSheet';
import ShowtimeStage from '../panels/ShowtimeStage';
import { useShowtime } from '../../hooks/useShowtime';
import Link from 'next/link';
import { usePortfolioData } from '../../context/PortfolioDataContext';
import { track, identify } from '../../lib/analytics';
import { ConversationProvider } from '../../context/ConversationContext';
import type { PanelIdentity } from '../../lib/conversation-events';
import { reducedMotionCrossfade } from '../../lib/motion';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_PANEL_STATE: PanelState = { open: false, type: null };

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/** `credit` replaces the "<name>'s portfolio agent" label under the input. */
export default function Chat({ credit, enhancedExperience = false }: { credit?: ReactNode; enhancedExperience?: boolean } = {}) {
  const reduced = useReducedMotion();
  const { config, projects } = usePortfolioData();

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

  // Showtime (dramatic storytelling mode)
  const showtime = useShowtime();

  // Derived layout

  // Persistence (IndexedDB load/save + clear-chat event)
  useChatPersistence({ messages, setMessages, panelState, setPanelState, actionQueue });

  // Auto-scroll sentinel ref
  const messagesEndRef = useAutoScroll(messages);

  // Analytics — page view + identify visitor
  useEffect(() => {
    track('page_view', { referrer: document.referrer || undefined });
    const vid = sessionStorage.getItem('visitorId');
    if (vid) identify(vid);
  }, []);

  // Streaming, send, retry
  const { sendMessage, retryLast, isLoading, showLoading, thinkingStatus, error, conversation, navigatePanel, getMessageRequestId } = useChatStream({
    messages,
    setMessages,
    setPanelState,
    panelState,
    actionQueue,
    enhancedExperience,
    projectSlugs: projects.map(project => project.slug),
    onShowtime: (topic, intent) => showtime.start(topic, intent),
  });

  const displayPanel = conversation.pendingTool ? { open: true, type: conversation.pendingTool.panelType as PanelState['type'] } : panelState;
  const layout = useLayoutMode(messages, displayPanel, isDesktop);

  // Panel callbacks
  const handlePanelClose = useCallback(() => {
    navigatePanel(DEFAULT_PANEL_STATE, true);
    setCurrentAction(null);
    actionQueue.setPanelReady(false);
    actionQueue.clear();
  }, [actionQueue, navigatePanel]);

  const renderedIdentity = conversation.panelIdentity;
  const handlePanelAnimationComplete = useCallback((identity?: PanelIdentity) => {
    const readyIdentity = identity || renderedIdentity;
    if (readyIdentity && !conversation.pendingTool && actionQueue.isCurrent(readyIdentity)) {
      actionQueue.setPanelReady(true, readyIdentity);
    }
  }, [actionQueue, renderedIdentity, conversation.pendingTool]);

  useEffect(() => { setCurrentAction(null); }, [renderedIdentity?.generation]);

  const handleActionConsumed = useCallback(() => {
    setCurrentAction(null);
    actionQueue.consume(renderedIdentity);
  }, [actionQueue, renderedIdentity]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const firstName = config.firstName || config.name.split(' ')[0];

  // Build per-message memory snapshots for MemoryBubble
  const memorySnapshots = useMemo(() => {
    const accumulated: Record<string, string> = {};
    return messages.map((msg) => {
      if (msg.role !== 'assistant' || !msg.toolCalls) return null;
      const memoryCalls = msg.toolCalls.filter((tc) => tc.name === 'remember_visitor');
      if (memoryCalls.length === 0) return null;

      const newKeys = new Set<string>();
      for (const tc of memoryCalls) {
        for (const [key, value] of Object.entries(tc.arguments)) {
          if (value && typeof value === 'string' && value.trim() && key !== 'visitorId') {
            if (accumulated[key] !== value.trim()) {
              newKeys.add(key);
            }
            accumulated[key] = value.trim();
          }
        }
      }
      return { snapshot: { ...accumulated }, newKeys };
    });
  }, [messages]);

  return (
    <ConversationProvider value={conversation}>
      {/* Panel */}
      <ContentPanel
        panelState={displayPanel}
        currentAction={currentAction}
        onActionConsumed={handleActionConsumed}
        onAnimationComplete={handlePanelAnimationComplete}
        onClose={handlePanelClose}
        onNavigate={(newState) => navigatePanel({ ...panelState, ...newState }, true)}
        onPrefillChat={setPrefillText}
      />

      {/* WELCOME — centered landing */}
      <AnimatePresence>
        {layout === 'welcome' && (
          <motion.div
            key="welcome"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: reducedMotionCrossfade }}
            className="fixed inset-0 flex flex-col items-center justify-center z-10 print:hidden"
            data-welcome
          >
            <h1 data-welcome-title className="text-2xl md:text-3xl font-medium text-gray-500 dark:text-gray-500 mb-6">
              ask me about <span data-welcome-name className="text-black dark:text-white">{firstName}</span>
            </h1>
            <div data-welcome-input className="w-full max-w-3xl px-4">
              <ChatInput onSend={sendMessage} disabled={isLoading} animatePlaceholder prefillText={prefillText} onPrefillConsumed={() => setPrefillText('')} />
              <p data-welcome-meta className="text-[10px] text-center text-gray-400 dark:text-gray-600 mt-2">
                {credit ?? <>{firstName}&apos;s portfolio agent</>}
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
                {config.social?.linkedin && (
                  <>
                    {' · '}
                    <a
                      href={config.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gray-300 transition-colors"
                    >
                      LinkedIn
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
      {layout !== 'welcome' && !isDesktop && displayPanel.open && (
        <MobileChatSheet
          messages={messages}
          isLoading={isLoading}
          showLoading={showLoading}
          thinkingStatus={thinkingStatus}
          error={error}
          onContact={() => navigatePanel({ open: true, type: 'contact' }, true)}
          getMessageRequestId={getMessageRequestId}
          onSend={sendMessage}
          onRetry={retryLast}
          prefillText={prefillText}
          onPrefillConsumed={() => setPrefillText('')}
        />
      )}

      {/* CHAT / SPLIT — messages + floating input (hidden on mobile when panel open) */}
      {layout !== 'welcome' && !(! isDesktop && displayPanel.open) && (
        <>
          <div
            className="flex flex-col h-screen print:hidden"
            style={layout === 'split' ? { marginLeft: 'calc(100vw - 500px)' } : undefined}
          >
            <div className="flex-1 overflow-y-auto pb-32 pt-6">
              <div className={`mx-auto px-4 space-y-4 ${layout === 'split' ? 'max-w-[500px]' : 'max-w-3xl'}`}>
                {messages.map((msg, i) => {
                  if (msg.role === 'assistant' && !msg.content && !msg.toolCalls?.length) return null;
                  if (isLoading && msg.role === 'assistant' && !msg.content && i === messages.length - 1) return null;
                  return (
                    <ChatMessage
                      key={i}
                      {...{ requestId: getMessageRequestId(msg) }}
                      role={msg.role}
                      content={msg.content}
                      toolCalls={msg.toolCalls}
                      isError={msg.isError}
                      onRetry={msg.isError ? retryLast : undefined}
                      memorySnapshot={memorySnapshots[i]?.snapshot}
                      memoryNewKeys={memorySnapshots[i]?.newKeys}
                    />
                  );
                })}
                {showLoading && <TypingIndicator thinkingStatus={thinkingStatus} />}
                {error && (
                  <div role="alert" className="rounded-tl-2xl rounded-br-2xl border border-gray-300 dark:border-neutral-700 p-4 text-sm">
                    <p className="font-medium">{error.title}</p>
                    <p className="mt-1 text-gray-600 dark:text-neutral-400">{error.detail}</p>
                    {error.retryable && <button onClick={retryLast} disabled={isLoading} className="mt-3 text-blue-600 dark:text-blue-400 underline focus-visible:outline focus-visible:outline-2">Retry</button>}
                    {error.code === 'quota' && <button onClick={() => navigatePanel({ open: true, type: 'contact' }, true)} className="mt-3 text-blue-600 dark:text-blue-400 underline">Contact details</button>}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          <div
            className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none print:hidden"
            style={layout === 'split' ? { paddingLeft: 'calc(100vw - 500px)' } : undefined}
          >
            <div className={`mx-auto px-4 pb-4 pt-2 pointer-events-auto ${layout === 'split' ? 'max-w-[500px]' : 'max-w-3xl'}`}>
              <ChatInput onSend={sendMessage} disabled={isLoading} prefillText={prefillText} onPrefillConsumed={() => setPrefillText('')} focusOnMount />
              <p className="text-[10px] text-center text-gray-400 dark:text-gray-600 mt-2">
                {credit ?? <>{firstName}&apos;s portfolio agent</>}
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
                {config.social?.linkedin && (
                  <>
                    {' · '}
                    <a
                      href={config.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gray-300 transition-colors"
                    >
                      LinkedIn
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
      {/* Showtime — dramatic storytelling overlay */}
      {showtime.active && (
        <ShowtimeStage
          segments={showtime.segments}
          loading={showtime.loading}
          topic={showtime.topic}
          onClose={showtime.stop}
        />
      )}
    </ConversationProvider>
  );
}
