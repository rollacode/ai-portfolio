'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import ToolCallBadge from './ToolCallBadge';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import type { Message } from '@/hooks/types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SHEET_HEIGHT_VH = 50;
const DRAG_CLOSE_THRESHOLD = 80;
const AUTO_COLLAPSE_DELAY = 6000; // ms — hold open so user can read
const INITIAL_EXPAND_DELAY = 600; // ms — slight pause before first expand
const SPRING = { type: 'spring' as const, damping: 28, stiffness: 260 };

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface MobileChatSheetProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (message: string) => void;
  onRetry: () => void;
  prefillText?: string;
  onPrefillConsumed?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MobileChatSheet({
  messages,
  isLoading,
  onSend,
  onRetry,
  prefillText,
  onPrefillConsumed,
}: MobileChatSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const [userExpanded, setUserExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useAutoScroll(messages);
  const prevMsgCountRef = useRef(messages.length);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  const dragY = useMotionValue(0);
  const sheetOpacity = useTransform(dragY, [0, 300], [1, 0.5]);

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  const scheduleCollapse = useCallback((delay: number) => {
    clearCollapseTimer();
    collapseTimerRef.current = setTimeout(() => {
      setExpanded(false);
      setUserExpanded(false);
      collapseTimerRef.current = null;
    }, delay);
  }, [clearCollapseTimer]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.y > DRAG_CLOSE_THRESHOLD) {
        setExpanded(false);
        setUserExpanded(false);
        clearCollapseTimer();
      }
    },
    [clearCollapseTimer],
  );

  // User taps the tab — expand and mark as user-initiated (no auto-collapse)
  const handleUserExpand = useCallback(() => {
    setExpanded(true);
    setUserExpanded(true);
    clearCollapseTimer();
  }, [clearCollapseTimer]);

  // On first mount: auto-expand after a short pause so user sees the transition
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const timer = setTimeout(() => {
      setExpanded(true);
      // Auto-collapse after reading time
      scheduleCollapse(AUTO_COLLAPSE_DELAY);
    }, INITIAL_EXPAND_DELAY);

    return () => clearTimeout(timer);
  }, [scheduleCollapse]);

  // Auto-expand when prefill text arrives (e.g. skill click)
  useEffect(() => {
    if (prefillText) {
      setExpanded(true);
      setUserExpanded(true);
      clearCollapseTimer();
    }
  }, [prefillText, clearCollapseTimer]);

  // Auto-expand when new assistant message arrives, then auto-collapse
  useEffect(() => {
    const newCount = messages.length;
    const prevCount = prevMsgCountRef.current;
    prevMsgCountRef.current = newCount;

    if (newCount <= prevCount) return;

    const lastMsg = messages[newCount - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.content) return;

    // Don't auto-collapse if user manually opened the sheet
    if (userExpanded) return;

    setExpanded(true);
    scheduleCollapse(AUTO_COLLAPSE_DELAY);
  }, [messages, userExpanded, scheduleCollapse]);

  // Cleanup timer on unmount
  useEffect(() => clearCollapseTimer, [clearCollapseTimer]);

  // Collapse expanded sheet when user scrolls the panel underneath
  useEffect(() => {
    if (!expanded) return;

    const onScroll = () => {
      // Only auto-collapse, not user-initiated sessions where they're actively typing
      setExpanded(false);
      setUserExpanded(false);
      clearCollapseTimer();
    };

    // Capture scroll on any element except our own scroll area
    const handler = (e: Event) => {
      // Ignore scrolls inside our own sheet
      if (sheetRef.current?.contains(e.target as Node)) return;
      onScroll();
    };

    window.addEventListener('scroll', handler, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handler, { capture: true });
  }, [expanded, clearCollapseTimer]);

  // Last assistant message for the collapsed tab preview
  const lastAssistantMsg = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant' && m.content);

  // Show the END of the last message, trimmed to last whole word
  let previewText = 'Tap to continue chatting';
  if (lastAssistantMsg) {
    const content = lastAssistantMsg.content;
    if (content.length <= 140) {
      previewText = content;
    } else {
      // Slice from end, find first space to start at a word boundary
      const raw = content.slice(-140);
      const spaceIdx = raw.indexOf(' ');
      previewText = '...' + (spaceIdx >= 0 ? raw.slice(spaceIdx + 1) : raw);
    }
  }

  return (
    <>
      {/* ---- Collapsed floating tab ---- */}
      <AnimatePresence>
        {!expanded && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={SPRING}
            onClick={handleUserExpand}
            className="fixed bottom-2 left-2 right-2 z-[60] flex items-start gap-3
                       min-h-[56px] px-4 py-3 rounded-2xl text-left
                       bg-gray-100/95 dark:bg-[#0d0d0d]/95 backdrop-blur-md
                       border border-gray-300 dark:border-neutral-800
                       shadow-lg shadow-black/15 dark:shadow-black/70
                       active:scale-[0.98] transition-transform"
          >
            <div className="flex-1 min-w-0">
              {/* Preview text — end of message */}
              <span className="block text-sm leading-snug text-gray-600 dark:text-gray-300
                               line-clamp-3">
                {previewText}
              </span>
              {/* What the agent did */}
              {lastAssistantMsg?.toolCalls?.length ? (
                <ToolCallBadge toolCalls={lastAssistantMsg.toolCalls} />
              ) : null}
            </div>

            {/* Chevron up */}
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ---- Expanded bottom sheet (no backdrop — panel stays interactive) ---- */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.3}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            style={{ opacity: sheetOpacity, height: `${SHEET_HEIGHT_VH}vh` }}
            className="fixed bottom-0 left-0 right-0 z-[60]
                       flex flex-col
                       bg-white dark:bg-black
                       rounded-t-2xl
                       border-t border-x border-gray-200 dark:border-neutral-700
                       shadow-[0_-4px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
          >
            {/* Drag handle area — large touch target */}
            <div
              className="flex items-center justify-between px-4 pt-3 pb-1"
              style={{ touchAction: 'none' }}
            >
              {/* Spacer for centering */}
              <div className="w-8" />

              {/* Drag handle pill */}
              <div className="flex-1 flex justify-center py-3 -my-3 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-neutral-600" />
              </div>

              {/* Close / collapse button */}
              <button
                onClick={() => { setExpanded(false); setUserExpanded(false); clearCollapseTimer(); }}
                className="w-8 h-8 flex items-center justify-center rounded-full
                           hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Collapse chat"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto overscroll-contain px-4 pb-2"
            >
              <div className="space-y-4">
                {messages.map((msg, i) => {
                  const isEmptyStreaming =
                    isLoading &&
                    msg.role === 'assistant' &&
                    msg.content === '' &&
                    i === messages.length - 1;
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
                      onRetry={msg.isError ? onRetry : undefined}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="px-3 pb-4 pt-2 border-t border-gray-100 dark:border-neutral-800">
              <ChatInput onSend={onSend} disabled={isLoading} prefillText={prefillText} onPrefillConsumed={onPrefillConsumed} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
