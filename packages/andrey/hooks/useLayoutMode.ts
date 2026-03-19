'use client';

import type { PanelState } from '@/lib/tool-handler';
import type { Message, LayoutMode } from './types';

/**
 * Derives the layout mode from current state:
 * - 'welcome' — no messages
 * - 'split'   — panel open on desktop
 * - 'chat'    — messages exist, no panel (or mobile)
 */
export function useLayoutMode(
  messages: Message[],
  panelState: PanelState,
  isDesktop: boolean,
): LayoutMode {
  if (messages.length === 0) return 'welcome';
  if (panelState.open && isDesktop) return 'split';
  return 'chat';
}
