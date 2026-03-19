import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionQueue } from '../lib/action-queue';
import type { PanelAction } from '../lib/tool-handler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAction(type: string, extra: Record<string, unknown> = {}): PanelAction {
  return { type: 'scroll_timeline_to', company: type, ...extra } as PanelAction;
}

// ---------------------------------------------------------------------------
// ActionQueue
// ---------------------------------------------------------------------------

describe('ActionQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Basic enqueueing
  // -------------------------------------------------------------------------

  describe('enqueue', () => {
    it('fires action immediately when panel is ready', () => {
      const handler = vi.fn();
      const queue = new ActionQueue(handler);

      queue.setPanelReady(true);
      queue.enqueue(makeAction('CompanyA'));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(makeAction('CompanyA'));
    });

    it('buffers action when panel is not ready', () => {
      const handler = vi.fn();
      const queue = new ActionQueue(handler);

      queue.enqueue(makeAction('CompanyA'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('fires buffered actions when panel becomes ready', () => {
      const handler = vi.fn();
      const queue = new ActionQueue(handler);

      queue.enqueue(makeAction('CompanyA'));
      queue.setPanelReady(true);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(makeAction('CompanyA'));
    });
  });

  // -------------------------------------------------------------------------
  // Queue ordering (FIFO)
  // -------------------------------------------------------------------------

  describe('FIFO ordering', () => {
    it('processes queued actions in order', () => {
      const calls: string[] = [];
      const handler = vi.fn((action: PanelAction) => {
        if (action.type === 'scroll_timeline_to') {
          calls.push(action.company);
        }
      });
      const queue = new ActionQueue(handler);

      queue.enqueue(makeAction('First'));
      queue.enqueue(makeAction('Second'));
      queue.enqueue(makeAction('Third'));

      queue.setPanelReady(true);

      // First fires immediately
      expect(calls).toEqual(['First']);

      // Second fires after 150ms
      vi.advanceTimersByTime(150);
      expect(calls).toEqual(['First', 'Second']);

      // Third fires after 300ms from start
      vi.advanceTimersByTime(150);
      expect(calls).toEqual(['First', 'Second', 'Third']);
    });
  });

  // -------------------------------------------------------------------------
  // Stagger timing
  // -------------------------------------------------------------------------

  describe('stagger timing', () => {
    it('first action fires immediately, subsequent actions are staggered by 150ms', () => {
      const handler = vi.fn();
      const queue = new ActionQueue(handler);

      queue.enqueue(makeAction('A'));
      queue.enqueue(makeAction('B'));
      queue.enqueue(makeAction('C'));
      queue.enqueue(makeAction('D'));

      queue.setPanelReady(true);

      // Only first fires immediately
      expect(handler).toHaveBeenCalledTimes(1);

      // After 149ms — still only 1
      vi.advanceTimersByTime(149);
      expect(handler).toHaveBeenCalledTimes(1);

      // After 150ms — second fires
      vi.advanceTimersByTime(1);
      expect(handler).toHaveBeenCalledTimes(2);

      // After 300ms — third fires
      vi.advanceTimersByTime(150);
      expect(handler).toHaveBeenCalledTimes(3);

      // After 450ms — fourth fires
      vi.advanceTimersByTime(150);
      expect(handler).toHaveBeenCalledTimes(4);
    });

    it('does not stagger when actions enqueued while panel is already ready', () => {
      const handler = vi.fn();
      const queue = new ActionQueue(handler);

      queue.setPanelReady(true);

      queue.enqueue(makeAction('A'));
      queue.enqueue(makeAction('B'));
      queue.enqueue(makeAction('C'));

      // All fire immediately because panel is already ready
      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  // -------------------------------------------------------------------------
  // Panel ready / not ready
  // -------------------------------------------------------------------------

  describe('setPanelReady', () => {
    it('clears queue when panel set to not ready', () => {
      const handler = vi.fn();
      const queue = new ActionQueue(handler);

      queue.enqueue(makeAction('A'));
      queue.enqueue(makeAction('B'));
      queue.setPanelReady(false);

      // Now set ready — nothing should fire because queue was cleared
      queue.setPanelReady(true);

      expect(handler).not.toHaveBeenCalled();
    });

    it('cancels pending staggered timeouts when panel set to not ready', () => {
      const handler = vi.fn();
      const queue = new ActionQueue(handler);

      queue.enqueue(makeAction('A'));
      queue.enqueue(makeAction('B'));
      queue.enqueue(makeAction('C'));

      // Set ready — starts stagger
      queue.setPanelReady(true);
      expect(handler).toHaveBeenCalledTimes(1); // A fires

      // Immediately set not ready — should cancel B and C timeouts
      queue.setPanelReady(false);

      vi.advanceTimersByTime(1000);
      expect(handler).toHaveBeenCalledTimes(1); // Still only A
    });

    it('can re-process new actions after ready toggled off and on', () => {
      const handler = vi.fn();
      const queue = new ActionQueue(handler);

      queue.enqueue(makeAction('Old'));
      queue.setPanelReady(false); // clears

      queue.enqueue(makeAction('New'));
      queue.setPanelReady(true);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(makeAction('New'));
    });
  });

  // -------------------------------------------------------------------------
  // clear()
  // -------------------------------------------------------------------------

  describe('clear', () => {
    it('clears the internal queue', () => {
      const handler = vi.fn();
      const queue = new ActionQueue(handler);

      queue.enqueue(makeAction('A'));
      queue.enqueue(makeAction('B'));
      queue.clear();

      queue.setPanelReady(true);
      expect(handler).not.toHaveBeenCalled();
    });

    it('cancels pending timeouts', () => {
      const handler = vi.fn();
      const queue = new ActionQueue(handler);

      queue.enqueue(makeAction('A'));
      queue.enqueue(makeAction('B'));
      queue.enqueue(makeAction('C'));
      queue.setPanelReady(true);

      expect(handler).toHaveBeenCalledTimes(1); // A fires immediately

      queue.clear();

      vi.advanceTimersByTime(1000);
      expect(handler).toHaveBeenCalledTimes(1); // B and C were cancelled
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles empty queue — setPanelReady does nothing', () => {
      const handler = vi.fn();
      const queue = new ActionQueue(handler);

      queue.setPanelReady(true);
      expect(handler).not.toHaveBeenCalled();
    });

    it('handles rapid sequential enqueues when not ready', () => {
      const calls: string[] = [];
      const handler = vi.fn((action: PanelAction) => {
        if (action.type === 'scroll_timeline_to') calls.push(action.company);
      });
      const queue = new ActionQueue(handler);

      for (let i = 0; i < 100; i++) {
        queue.enqueue(makeAction(`Item${i}`));
      }

      queue.setPanelReady(true);

      // First fires immediately
      expect(calls[0]).toBe('Item0');
      expect(handler).toHaveBeenCalledTimes(1);

      // Advance through all stagger delays (99 * 150ms)
      vi.advanceTimersByTime(99 * 150);
      expect(handler).toHaveBeenCalledTimes(100);
      expect(calls[99]).toBe('Item99');
    });

    it('handles mixed action types', () => {
      const received: PanelAction[] = [];
      const handler = vi.fn((action: PanelAction) => received.push(action));
      const queue = new ActionQueue(handler);

      const actions: PanelAction[] = [
        { type: 'scroll_timeline_to', company: 'Google' },
        { type: 'highlight_skill', name: 'TypeScript' },
        { type: 'set_theme', theme: 'dark' },
      ];

      for (const a of actions) queue.enqueue(a);
      queue.setPanelReady(true);

      // First fires immediately
      expect(received).toEqual([actions[0]]);

      vi.advanceTimersByTime(150);
      expect(received).toEqual([actions[0], actions[1]]);

      vi.advanceTimersByTime(150);
      expect(received).toEqual(actions);
    });

    it('clear on empty queue does not throw', () => {
      const handler = vi.fn();
      const queue = new ActionQueue(handler);
      expect(() => queue.clear()).not.toThrow();
    });
  });
});
