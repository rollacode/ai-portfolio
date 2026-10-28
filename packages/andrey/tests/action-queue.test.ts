import { describe, it, expect, vi } from 'vitest';
import { ActionQueue } from '../lib/action-queue';
import type { PanelAction } from '../lib/tool-handler';

const action = (company: string): PanelAction => ({ type: 'scroll_timeline_to', company });
const identity = (generation: number, slug = 'a') => ({ type: 'project', slug, generation });

describe('readiness and identity action queue', () => {
  it('buffers until actual readiness, with no timer', () => {
    const handler = vi.fn();
    const queue = new ActionQueue(handler);
    queue.enqueue(action('A'));
    expect(handler).not.toHaveBeenCalled();
    queue.setPanelReady(true);
    expect(handler).toHaveBeenCalledExactlyOnceWith(action('A'));
  });
  it('uses consumption acknowledgement for FIFO instead of arbitrary delays', () => {
    const handler = vi.fn();
    const queue = new ActionQueue(handler);
    queue.enqueue(action('A'));
    queue.enqueue(action('B'));
    queue.enqueue(action('C'));
    queue.setPanelReady(true);
    expect(handler.mock.calls).toEqual([[action('A')]]);
    queue.consume();
    expect(handler.mock.calls).toEqual([[action('A')], [action('B')]]);
    queue.consume();
    expect(handler.mock.calls).toEqual([[action('A')], [action('B')], [action('C')]]);
  });
  it('sends a new action immediately when ready and idle', () => {
    const handler = vi.fn();
    const queue = new ActionQueue(handler);
    queue.setPanelReady(true);
    queue.enqueue(action('A'));
    queue.consume();
    queue.enqueue(action('B'));
    expect(handler).toHaveBeenCalledTimes(2);
  });
  it('clears buffered and active work when closing', () => {
    const handler = vi.fn();
    const queue = new ActionQueue(handler);
    queue.enqueue(action('A'));
    queue.setPanelReady(false);
    queue.setPanelReady(true);
    expect(handler).not.toHaveBeenCalled();
  });
  it('rejects same-type A readiness and highlights after switching to B', () => {
    const handler = vi.fn();
    const queue = new ActionQueue(handler);
    const a = identity(1);
    const b = identity(2, 'b');
    queue.setPanelIdentity(a);
    queue.enqueue(action('A'), a);
    queue.setPanelIdentity(b);
    queue.enqueue(action('B'), b);
    queue.setPanelReady(true, a);
    queue.enqueue(action('stale'), a);
    expect(handler).not.toHaveBeenCalled();
    queue.setPanelReady(true, b);
    expect(handler).toHaveBeenCalledExactlyOnceWith(action('B'));
  });
  it('rejects stale close/reopen callbacks even for the same slug', () => {
    const handler = vi.fn();
    const queue = new ActionQueue(handler);
    const before = identity(1);
    const reopened = identity(3);
    queue.setPanelIdentity(before);
    queue.setPanelReady(true, before);
    queue.setPanelIdentity({ type: null, generation: 2 });
    queue.setPanelIdentity(reopened);
    queue.enqueue(action('new'), reopened);
    queue.setPanelReady(true, before);
    expect(handler).not.toHaveBeenCalled();
    queue.setPanelReady(true, reopened);
    expect(handler).toHaveBeenCalledExactlyOnceWith(action('new'));
  });
  it('ignores consumption from the previous content identity', () => {
    const handler = vi.fn();
    const queue = new ActionQueue(handler);
    queue.setPanelIdentity(identity(2));
    queue.setPanelReady(true, identity(2));
    queue.enqueue(action('first'));
    queue.enqueue(action('second'));
    queue.consume(identity(1));
    expect(handler).toHaveBeenCalledTimes(1);
    queue.consume(identity(2));
    expect(handler).toHaveBeenCalledTimes(2);
  });
  it('can clear and reuse an empty queue', () => {
    const handler = vi.fn();
    const queue = new ActionQueue(handler);
    queue.clear();
    queue.setPanelReady(true);
    queue.enqueue(action('A'));
    queue.clear();
    queue.enqueue(action('B'));
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
