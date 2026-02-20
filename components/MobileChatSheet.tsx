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
import { useAutoScroll } from '@/hooks/useAutoScroll';
import type { Message } from '@/hooks/types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SHEET_HEIGHT_VH = 50; // percent of viewport
const DRAG_CLOSE_THRESHOLD = 80; // px to swipe down to collapse
const AUTO_COLLAPSE_DELAY = 4000; // ms — how long to show before auto-collapsing
const SPRING = { type: 'spring' as const, damping: 28, stiffness: 260 };

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface MobileChatSheetProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (message: string) => void;
  onRetry: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MobileChatSheet({
  messages,
  isLoading,
  onSend,
  onRetry,
}: MobileChatSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const [userExpanded, setUserExpanded] = useState(false); // true when user tapped to open
  const sheetRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useAutoScroll(messages);
  const prevMsgCountRef = useRef(messages.length);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag-to-dismiss
  const dragY = useMotionValue(0);
  const sheetOpacity = useTransform(dragY, [0, 300], [1, 0.5]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.y > DRAG_CLOSE_THRESHOLD) {
        setExpanded(false);
        setUserExpanded(false);
      }
    },
    [],
  );

  // User taps the tab — expand and mark as user-initiated
  const handleUserExpand = useCallback(() => {
    setExpanded(true);
    setUserExpanded(true);
    // Clear any pending auto-collapse
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  // Auto-expand when new assistant message arrives, then auto-collapse
  useEffect(() => {
    const newCount = messages.length;
    const prevCount = prevMsgCountRef.current;
    prevMsgCountRef.current = newCount;

    // Only trigger on new messages, not initial render
    if (newCount <= prevCount) return;

    const lastMsg = messages[newCount - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.content) return;

    // Don't auto-expand if user manually opened the sheet
    if (userExpanded) return;

    // Auto-expand to show new message
    setExpanded(true);

    // Clear previous timer
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }

    // Auto-collapse after delay
    collapseTimerRef.current = setTimeout(() => {
      setExpanded(false);
      collapseTimerRef.current = null;
    }, AUTO_COLLAPSE_DELAY);

    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
    };
  }, [messages, userExpanded]);

  // When user collapses manually, reset userExpanded
  const handleBackdropClose = useCallback(() => {
    setExpanded(false);
    setUserExpanded(false);
  }, []);

  // Last assistant message for the collapsed tab preview
  const lastAssistantMsg = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant' && m.content);

  const previewText = lastAssistantMsg
    ? lastAssistantMsg.content.slice(0, 60) + (lastAssistantMsg.content.length > 60 ? '...' : '')
    : 'Tap to continue chatting';

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
            className="fixed bottom-3 left-3 right-3 z-[60] flex items-center gap-3
                       h-14 px-4 rounded-2xl
                       bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md
                       border border-gray-200 dark:border-neutral-700
                       shadow-lg shadow-black/10 dark:shadow-black/30
                       active:scale-[0.98] transition-transform"
          >
            {/* Chat bubble icon */}
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center
                            rounded-full bg-lime-500/15 text-lime-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
            </div>

            {/* Preview text */}
            <span className="flex-1 text-left text-sm text-gray-600 dark:text-gray-400 truncate">
              {previewText}
            </span>

            {/* Chevron up */}
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ---- Expanded bottom sheet ---- */}
      <AnimatePresence>
        {expanded && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 z-[60]"
              onClick={handleBackdropClose}
            />

            {/* Sheet */}
            <motion.div
              ref={sheetRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={SPRING}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.4}
              onDragEnd={handleDragEnd}
              style={{ opacity: sheetOpacity, height: `${SHEET_HEIGHT_VH}vh` }}
              className="fixed bottom-0 left-0 right-0 z-[70]
                         flex flex-col
                         bg-white dark:bg-black
                         rounded-t-2xl
                         shadow-2xl shadow-black/20"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-neutral-600" />
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 pb-2">
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
                <ChatInput onSend={onSend} disabled={isLoading} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
