'use client';

import { useEffect } from 'react';
import { saveMessages, loadMessages, savePanelState, loadPanelState, clearAll } from '@/lib/chat-store';
import type { PanelState } from '@/lib/tool-handler';
import type { ActionQueue } from '@/lib/action-queue';
import type { Message } from './types';

// Default panel state used when clearing
const DEFAULT_PANEL_STATE: PanelState = { open: false, type: null };

interface UseChatPersistenceArgs {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  panelState: PanelState;
  setPanelState: React.Dispatch<React.SetStateAction<PanelState>>;
  actionQueue: ActionQueue;
}

/**
 * Handles IndexedDB load/save for messages and panel state,
 * plus the clear-chat custom event handler.
 */
export function useChatPersistence({
  messages,
  setMessages,
  panelState,
  setPanelState,
  actionQueue,
}: UseChatPersistenceArgs): void {
  // Load persisted state on mount
  useEffect(() => {
    loadMessages().then((saved) => {
      if (saved.length > 0) setMessages(saved);
    });
    loadPanelState().then((saved) => {
      if (saved) setPanelState(saved as PanelState);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist messages on change
  useEffect(() => {
    if (messages.length > 0) saveMessages(messages);
  }, [messages]);

  // Persist panel state on change
  useEffect(() => {
    savePanelState(panelState);
  }, [panelState]);

  // Clear chat via custom event
  useEffect(() => {
    const handleClear = () => {
      clearAll();
      setMessages([]);
      setPanelState(DEFAULT_PANEL_STATE);
      actionQueue.clear();
    };
    window.addEventListener('clear-chat', handleClear);
    return () => window.removeEventListener('clear-chat', handleClear);
  }, [actionQueue, setMessages, setPanelState]);
}
