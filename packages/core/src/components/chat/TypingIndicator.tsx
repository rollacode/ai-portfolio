'use client';

import { useChatReducedMotion } from '../../lib/chat-lifecycle';

interface TypingIndicatorProps {
  currentTools?: Array<{ name: string; arguments: Record<string, unknown> }>;
  thinkingStatus?: string | null;
}

/**
 * The Domios app's activity dots (shared/ActivityDots + agent-state.css): three dots that squash, jump and land
 * in a stagger. Thinking runs the slower rhythm; once a tool or text is known the faster streaming rhythm.
 */
export default function TypingIndicator({ currentTools, thinkingStatus }: TypingIndicatorProps) {
  const reduced = useChatReducedMotion();
  const rhythm = currentTools?.length || thinkingStatus ? 'streaming' : 'thinking';
  return (
    <p role="status" aria-live="polite" aria-atomic="true" data-chat-loading
      className="inline-flex items-center gap-2.5 px-1 text-xs text-gray-500 dark:text-gray-400">
      <span aria-hidden="true" className={`activity-dots activity-dots--medium activity-dots--${rhythm}${reduced ? ' activity-dots--still-visible' : ''}`}>
        <i /><i /><i />
      </span>
      <span>{thinkingStatus || 'Thinking'}</span>
    </p>
  );
}
