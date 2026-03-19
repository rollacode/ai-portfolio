// Manages sequencing of Layer 2 tool actions.
// Actions (scroll, highlight, focus) depend on Layer 1 panels being open and
// fully animated in. This queue buffers actions until the panel signals ready,
// then flushes them with a stagger delay.

import type { PanelAction } from './tool-handler';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface QueuedAction {
  action: PanelAction;
}

// -----------------------------------------------------------------------------
// ActionQueue
// -----------------------------------------------------------------------------

const STAGGER_DELAY_MS = 150;

export class ActionQueue {
  private queue: QueuedAction[] = [];
  private panelReady = false;
  private pendingTimeouts: ReturnType<typeof setTimeout>[] = [];
  private onAction: (action: PanelAction) => void;

  constructor(onAction: (action: PanelAction) => void) {
    this.onAction = onAction;
  }

  /**
   * Called when a panel open/close animation completes.
   * When `ready` is true, any queued actions are flushed.
   * When `ready` is false (panel closing), the queue is cleared.
   */
  setPanelReady(ready: boolean): void {
    this.panelReady = ready;

    if (ready) {
      this.processQueue();
    } else {
      this.clear();
    }
  }

  /**
   * Enqueue an action. If the panel is already ready, execute immediately.
   * Otherwise, buffer it until the panel signals ready.
   */
  enqueue(action: PanelAction): void {
    if (this.panelReady) {
      this.onAction(action);
    } else {
      this.queue.push({ action });
    }
  }

  /**
   * Process queued actions with a stagger delay between each.
   */
  private processQueue(): void {
    const items = this.queue.splice(0);

    items.forEach((item, i) => {
      if (i === 0) {
        this.onAction(item.action);
      } else {
        const timeout = setTimeout(() => {
          this.onAction(item.action);
        }, i * STAGGER_DELAY_MS);
        this.pendingTimeouts.push(timeout);
      }
    });
  }

  /**
   * Clear all pending actions and cancel scheduled timeouts.
   */
  clear(): void {
    this.queue = [];
    for (const timeout of this.pendingTimeouts) {
      clearTimeout(timeout);
    }
    this.pendingTimeouts = [];
  }
}
