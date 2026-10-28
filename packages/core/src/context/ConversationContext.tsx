'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Classification, ClaimReceipt, PanelIdentity, PendingTool } from '../lib/conversation-events';

export interface ConversationContextValue {
  enabled: boolean;
  activeRequestId?: string;
  requestStatus?: 'idle' | 'loading' | 'complete' | 'error';
  classification?: Classification;
  pendingTool?: PendingTool;
  panelIdentity?: PanelIdentity;
  receiptsByRequest?: Record<string, ClaimReceipt[]>;
  correctionsByRequest?: Record<string, string[]>;
  onFitCommentary?: (requestId: string, text: string) => void;
}
export const ConversationContext = createContext<ConversationContextValue>({ enabled: false, receiptsByRequest: {}, correctionsByRequest: {} });
export function ConversationProvider({ value, children }: { value: ConversationContextValue; children: ReactNode }) {
  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}
export const useConversationContext = () => useContext(ConversationContext);
