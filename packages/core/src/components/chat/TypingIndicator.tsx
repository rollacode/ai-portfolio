'use client';

import { useChatReducedMotion } from '../../lib/chat-lifecycle';
import { motion } from 'framer-motion';
import { liquidBreathe, reducedMotionCrossfade } from '../../lib/motion';

interface TypingIndicatorProps {
  currentTools?: Array<{ name: string; arguments: Record<string, unknown> }>;
  thinkingStatus?: string | null;
}

export default function TypingIndicator({ thinkingStatus }: TypingIndicatorProps) {
  const reduced = useChatReducedMotion();
  return (
    <p role="status" aria-live="polite" aria-atomic="true" data-chat-loading
      className="inline-flex items-center gap-2.5 px-1 text-xs text-gray-500 dark:text-gray-400">
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        {[0, 1, 2].map(index => <motion.span key={index}
          className="h-1 w-1 rounded-full bg-lime-600 dark:bg-lime-400"
          initial={false}
          animate={reduced ? { opacity: 0.65 } : { opacity: [0.3, 0.9, 0.3] }}
          transition={reduced ? reducedMotionCrossfade : { ...liquidBreathe, duration: 1.4, repeat: Infinity, delay: index * 0.16 }} />)}
      </span>
      <span>{thinkingStatus || 'Waiting for a response'}</span>
    </p>
  );
}
