'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { Message } from './types';

/**
 * Auto-scrolls to bottom whenever messages change.
 * Returns a ref to attach to a sentinel div at the bottom of the messages list.
 */
export function useAutoScroll(messages: Message[]) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return messagesEndRef;
}
