'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import ToolCallBadge from './ToolCallBadge';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, any> }>;
  isError?: boolean;
  onRetry?: () => void;
}

export default function ChatMessage({ role, content, toolCalls, isError, onRetry }: ChatMessageProps) {
  const isUser = role === 'user';
  const hasToolCalls = toolCalls && toolCalls.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="py-2"
    >
      {isUser ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">{content}</p>
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
                          prose-p:my-1.5 prose-p:leading-relaxed
                          prose-headings:font-medium prose-headings:mt-4 prose-headings:mb-2
                          prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:text-gray-900 dark:prose-pre:text-gray-100
                          prose-code:text-gray-900 dark:prose-code:text-gray-100
                          prose-code:bg-gray-100 dark:prose-code:bg-gray-800
                          prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                          prose-a:text-sky-500 hover:prose-a:text-sky-400 prose-a:no-underline
                          prose-li:my-0.5
                          text-gray-900 dark:text-gray-100">
            <ReactMarkdown>
              {content}
            </ReactMarkdown>
          </div>

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
            <ToolCallBadge toolCalls={toolCalls} />
          )}
        </div>
      )}
    </motion.div>
  );
}
