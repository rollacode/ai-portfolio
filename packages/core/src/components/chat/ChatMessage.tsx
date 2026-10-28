'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useConversationContext } from '../../context/ConversationContext';
import { CALIBRATION, currentReceipt } from '../../lib/evidence/receipts';
import { subscribeFitNarration, isFitNarrationSettled } from '../../lib/evidence/fit-narration';
import { subscribeReceiptBatches, getReceiptBatch, requestReceiptBatch } from '../../lib/evidence/receipt-batches';
import ReceiptSummary from './ReceiptSummary';
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
  const fitSettled = useSyncExternalStore(subscribeFitNarration, () => isFitNarrationSettled(requestId), () => false);
  const awaitsFitCommentary = toolCalls?.some(call => call.name === 'match_job') && !fitSettled;
  const computed = useSyncExternalStore(subscribeReceiptBatches, () => getReceiptBatch(requestId), () => undefined);
  useEffect(() => {
    if (awaitsFitCommentary) return;
    if (!CALIBRATION.enabled || role !== 'assistant' || !requestId || !conversation.enabled || conversation.activeRequestId !== requestId || conversation.requestStatus !== 'complete') return;
    requestReceiptBatch(requestId,content);
  }, [requestId, content, role, conversation.enabled, conversation.activeRequestId, conversation.requestStatus, awaitsFitCommentary]);
  const validReceipts = conversation.enabled && computed?.content === content && requestId === conversation.activeRequestId ? computed.receipts.filter(r=>currentReceipt(r,requestId,content)) : [];
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
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">{content}</p>
      ) : (
        <div className="w-full">
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
                          [&>ul]:!my-6 [&>ul]:space-y-3
                          [&>ul>li]:border-l-2 [&>ul>li]:border-lime-500/40 [&>ul>li]:pl-3
                          [&>ul>li]:py-2 [&>ul>li]:rounded-r
                          [&>ul>li]:bg-white/[0.04] dark:[&>ul>li]:bg-white/[0.04]">
            <ReactMarkdown>
              {content}
            </ReactMarkdown>
          </div>
          <ReceiptSummary receipts={validReceipts} />

          {corrections?.map((note,i)=><p key={i} role="note" className="mt-2 border-l-2 border-lime-500 pl-3 text-sm text-gray-600 dark:text-gray-300">Correction: {note}</p>)}
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
