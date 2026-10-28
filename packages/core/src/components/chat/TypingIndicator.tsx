'use client';

interface TypingIndicatorProps {
  currentTools?: Array<{ name: string; arguments: Record<string, unknown> }>;
  thinkingStatus?: string | null;
}

export default function TypingIndicator({ thinkingStatus }: TypingIndicatorProps) {
  return (
    <p role="status" aria-live="polite" aria-atomic="true" data-chat-loading
      className="px-1 text-sm text-gray-600 dark:text-neutral-400">
      {thinkingStatus || 'Waiting for a response…'}
    </p>
  );
}
