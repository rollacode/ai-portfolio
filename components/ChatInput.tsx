'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import config from '@/portfolio/config.json';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  animatePlaceholder?: boolean;
}

const STATIC_PLACEHOLDER = 'Ask me anything...';
const ROTATE_INTERVAL = 3000;
const MAX_SUGGESTIONS = 6;

/** Fisher-Yates shuffle (returns new array) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ChatInput({ onSend, disabled, animatePlaceholder }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Shuffle on client only to avoid hydration mismatch
  useEffect(() => {
    setSuggestions(shuffle(config.suggestedQuestions ?? []).slice(0, MAX_SUGGESTIONS));
  }, []);

  // Rotate placeholder in welcome mode
  useEffect(() => {
    if (!animatePlaceholder || suggestions.length === 0) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % suggestions.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(interval);
  }, [animatePlaceholder, suggestions.length]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentPlaceholder = animatePlaceholder && suggestions.length > 0
    ? suggestions[placeholderIndex]
    : STATIC_PLACEHOLDER;

  return (
    <div className="relative flex items-end gap-2 w-full px-3 py-3
                    bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-sm
                    border border-gray-300 dark:border-neutral-700 rounded-2xl
                    focus-within:border-gray-400 dark:focus-within:border-neutral-500
                    transition-all duration-200">

      {/* Animated placeholder overlay */}
      {!input && (
        <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={currentPlaceholder}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="text-base text-gray-400 dark:text-gray-500 whitespace-nowrap"
            >
              {currentPlaceholder}
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        enterKeyHint="send"
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-transparent text-base
                   focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
                   max-h-[200px] py-1 leading-relaxed"
      />

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center
                   rounded-lg text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-white
                   disabled:opacity-20
                   transition-colors duration-150"
      >
        {disabled ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
