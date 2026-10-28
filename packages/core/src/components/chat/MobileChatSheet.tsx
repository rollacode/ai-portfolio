'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { reducedMotionCrossfade } from '../../lib/motion';
import type { Message } from '../../hooks/types';
import type { ConversationError } from '../../lib/conversation-errors';

interface MobileChatSheetProps {
  messages: Message[];
  isLoading: boolean;
  showLoading?: boolean;
  thinkingStatus?: string | null;
  error?: ConversationError | null;
  onContact?: () => void;
  getMessageRequestId?: (message: Message) => string | undefined;
  onSend: (message: string) => void;
  onRetry: () => void;
  prefillText?: string;
  onPrefillConsumed?: () => void;
}

export default function MobileChatSheet({ messages, isLoading, showLoading = isLoading,
  thinkingStatus, error, onContact, getMessageRequestId, onSend, onRetry, prefillText, onPrefillConsumed }: MobileChatSheetProps) {
  const [expanded, setExpanded] = useState(true);
  const reduced = useReducedMotion();
  const reopenRef = useRef<HTMLButtonElement>(null);
  const userCollapsed = useRef(false);
  useEffect(() => {
    if (prefillText) setExpanded(true);
  }, [prefillText]);
  useEffect(() => {
    if (!expanded && userCollapsed.current) reopenRef.current?.focus();
  }, [expanded]);

  if (!expanded) return (
    <button ref={reopenRef} onClick={() => setExpanded(true)} aria-expanded="false" aria-controls="mobile-chat"
      style={{ bottom: 'calc(8px + var(--consent-inset, 0px))' }}
      className="fixed bottom-2 left-2 right-2 z-[60] rounded-[14px_18px_14px_18px] border border-gray-300 dark:border-neutral-700 bg-white dark:bg-black p-4 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500">
      {showLoading ? thinkingStatus || 'Waiting for a response…' : error ? error.title : 'Open chat'}
    </button>
  );
  return (
    <motion.section id="mobile-chat" aria-label="Chat" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={reducedMotionCrossfade}
      className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col bg-white dark:bg-black rounded-t-[18px_24px] border-t border-x border-gray-200 dark:border-neutral-700 shadow-lg"
      style={{ height: '50dvh', maxHeight: 'calc(100dvh - var(--consent-inset, 0px) - 64px)', bottom: 'var(--consent-inset, 0px)' }}>
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 dark:border-neutral-800">
        <span className="text-sm font-medium">Chat</span>
        <button aria-label="Collapse chat" aria-expanded="true" aria-controls="mobile-chat"
          onClick={() => { userCollapsed.current = true; setExpanded(false); }}
          className="min-h-11 min-w-11 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500">↓</button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4">
        {messages.map((message, index) => {
          if (message.role === 'assistant' && !message.content && (!message.toolCalls?.length || isLoading && index === messages.length - 1)) return null;
          return <ChatMessage key={index} {...message} {...{ requestId: getMessageRequestId?.(message) }} onRetry={message.isError ? onRetry : undefined} />;
        })}
        {showLoading && <TypingIndicator thinkingStatus={thinkingStatus} />}
        {error && <div role="alert" className="border border-gray-900/10 dark:border-gray-100/10 bg-gray-50/70 dark:bg-gray-900/40 rounded-[14px_18px_14px_18px] p-4 text-sm">
          <p className="font-medium">{error.title}</p>
          <p className="mt-1 text-gray-600 dark:text-neutral-400">{error.detail}</p>
          {error.retryable && <button onClick={onRetry} disabled={isLoading} className="mt-3 min-h-11 rounded-[10px_14px_10px_14px] bg-lime-600/10 px-4 text-lime-600 dark:text-lime-400 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500">Retry</button>}
          {error.code === 'quota' && onContact && <button onClick={onContact} className="mt-3 min-h-11 rounded-[10px_14px_10px_14px] bg-lime-600/10 px-4 text-lime-600 dark:text-lime-400 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500">Contact details</button>}
        </div>}
      </div>
      <div className="px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-100 dark:border-neutral-800">
        <ChatInput onSend={onSend} disabled={isLoading} prefillText={prefillText} onPrefillConsumed={onPrefillConsumed} focusOnMount />
      </div>
    </motion.section>
  );
}
