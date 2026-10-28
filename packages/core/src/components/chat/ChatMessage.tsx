'use client';

import { useConversationContext } from '../../context/ConversationContext';
import SpinalCordLine, { Vertebrae } from './SpinalCordLine';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { PanelState } from '../../lib/tool-handler';
import ToolCallBadge from './ToolCallBadge';
import MemoryLine from '../panels/MemoryLine';

interface ChatMessageProps {
  /** Originating volatile request; never infer it for persisted messages. */
  requestId?: string;
  onNavigate?: (state: Partial<PanelState>) => void;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, any> }>;
  isError?: boolean;
  onRetry?: () => void;
  /** Accumulated visitor memory up to AND including this message */
  memorySnapshot?: Record<string, string>;
  /** Keys added by this specific message's remember_visitor calls */
  memoryNewKeys?: Set<string>;
}

export default function ChatMessage({ requestId, onNavigate, role, content, toolCalls, isError, onRetry, memorySnapshot, memoryNewKeys }: ChatMessageProps) {
  const conversation = useConversationContext();

  const corrections = requestId && requestId === conversation.activeRequestId ? conversation.correctionsByRequest?.[requestId] : undefined;
  const isUser = role === 'user';
  const hasToolCalls = toolCalls && toolCalls.length > 0;
  const hasMemoryCall = toolCalls?.some((tc) => tc.name === 'remember_visitor') ?? false;

  return (
    <motion.div
      initial={conversation.enabled ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="py-0.5"
    >
      {isUser ? (
        <div className="mb-1 flex justify-end">
          {/* The visitor's words sit in a soft bubble on the right; it rises in once, like a message sent. */}
          <motion.p initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="chat-bubble max-w-[85%] rounded-[18px_18px_6px_18px] px-3.5 py-2 text-sm leading-relaxed text-gray-800 dark:text-gray-100">{content}</motion.p>
        </div>
      ) : (
        <div className="w-full">
          {requestId && requestId === conversation.activeRequestId && <SpinalCordLine classification={conversation.classification} corrected={!!corrections?.length} />}
          {isError && (
            <div className="flex items-center gap-1.5 mb-1.5 text-red-500 dark:text-red-400 text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              Error
            </div>
          )}

          <div className="prose prose-sm dark:prose-invert max-w-none
                          prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3
                          prose-h3:text-sm prose-h3:uppercase prose-h3:tracking-wide prose-h3:text-gray-500 dark:prose-h3:text-gray-400
                          prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-semibold
                          prose-li:my-0 prose-li:leading-relaxed
                          prose-li:marker:text-lime-500
                          prose-pre:bg-neutral-100 dark:prose-pre:bg-neutral-900 prose-pre:text-black dark:prose-pre:text-white
                          prose-code:text-black dark:prose-code:text-white
                          prose-code:bg-neutral-100 dark:prose-code:bg-neutral-900
                          prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                          prose-a:text-lime-500 hover:prose-a:text-lime-400 prose-a:no-underline
                          text-gray-900 dark:text-gray-100
                          [&>p]:my-4 [&>p]:leading-relaxed
                          [&>hr]:!my-5 [&>hr]:border-neutral-700/50
                          [&>ul]:!my-5 [&>ul]:space-y-2 [&>ul]:!pl-0 [&>ul]:list-none
                          chat-answer">
            <ReactMarkdown>
              {content}
            </ReactMarkdown>
          </div>

          {corrections?.map((note,i)=><p key={i} role="note" className="mt-2 flex items-start gap-2 rounded-[10px_14px_10px_14px] border border-lime-500/25 bg-lime-500/[0.06] px-3 py-2 text-sm text-gray-700 dark:text-gray-200"><Vertebrae firing className="mt-1 h-3.5 w-2.5 flex-shrink-0 text-lime-600 dark:text-lime-400" /><span><span className="font-medium">The spinal cord caught a slip.</span> {note}</span></p>)}
          {isError && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                         text-red-600 dark:text-red-400
                         hover:text-red-500 dark:hover:text-red-300
                         transition-colors duration-200"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
              Retry
            </button>
          )}

          {hasToolCalls && (
            <ToolCallBadge toolCalls={toolCalls} onNavigate={onNavigate} />
          )}

          {hasMemoryCall && memorySnapshot && memoryNewKeys && memoryNewKeys.size > 0 && (
            <MemoryLine visitorMemory={memorySnapshot} newKeys={memoryNewKeys} />
          )}
        </div>
      )}
    </motion.div>
  );
}
