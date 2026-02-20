import type { PanelAction } from '@/lib/tool-handler';

// -----------------------------------------------------------------------------
// Shared types for chat hooks
// -----------------------------------------------------------------------------

export interface ToolCallEntry {
  name: string;
  arguments: Record<string, any>;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallEntry[];
  isError?: boolean;
}

// Layout states:
// 'welcome'  — no messages, centered minimal landing
// 'chat'     — messages exist, centered chat (no panel)
// 'split'    — panel open on left, chat pushed right
export type LayoutMode = 'welcome' | 'chat' | 'split';
