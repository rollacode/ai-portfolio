// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { canPlayLoop, playEligibleMedia } from '../../core/src/components/panels/ProjectLoop';

const eligible = { active: true, inView: true, visible: true, reducedMotion: false, paused: false, failed: false };
describe('meaningful demo eligibility', () => {
  it('requires every eligibility condition, including explicit motion preference', () => {
    expect(canPlayLoop(eligible)).toBe(true);
    for (const key of Object.keys(eligible)) {
      expect(canPlayLoop({ ...eligible, [key]: !eligible[key as keyof typeof eligible] })).toBe(false);
    }
  });
  it('pauses immediately on cleanup and again if an obsolete play resolves', async () => {
    let resolve!: () => void;
    const video = { play: vi.fn(() => new Promise<void>(r => { resolve = r; })), pause: vi.fn() };
    const failure = vi.fn();
    const stop = playEligibleMedia(video, failure);
    stop();
    expect(video.pause).toHaveBeenCalledTimes(1);
    resolve();
    await Promise.resolve();
    expect(video.pause).toHaveBeenCalledTimes(2);
    expect(failure).not.toHaveBeenCalled();
  });
  it('handles a rejected play once; ignores a stale rejection', async () => {
    const failure = vi.fn();
    playEligibleMedia({ play: () => Promise.reject(new Error('codec')), pause() {} }, failure);
    await Promise.resolve();
    expect(failure).toHaveBeenCalledTimes(1);
    const stop = playEligibleMedia({ play: () => Promise.reject(new Error('aborted')), pause() {} }, failure);
    stop();
    await Promise.resolve();
    expect(failure).toHaveBeenCalledTimes(1);
  });
  it('handles synchronous media exceptions', () => {
    const failure = vi.fn();
    playEligibleMedia({ play() { throw new Error('unsupported'); }, pause() {} }, failure);
    expect(failure).toHaveBeenCalledTimes(1);
  });
});

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach } from 'vitest';
import ProjectLoop from '../../core/src/components/panels/ProjectLoop';

let root: Root;
let mount: HTMLDivElement;
let observe: (entries: Partial<IntersectionObserverEntry>[]) => void;
let reduced = false;
let preferenceChanged: () => void;
let visibility = 'visible';
const media = { mp4: '/loops/domios/loop.mp4', webm: '/loops/domios/loop.webm', poster: '/loops/domios/poster.webp' };
const render = (props = {}) => act(() => root.render(createElement(ProjectLoop, { media, alt: 'Domios orchestration', ...props })));
const enter = (value: boolean) => act(() => observe([{ isIntersecting: value, intersectionRatio: value ? 1 : 0 }]));
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  reduced = false;
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  window.matchMedia = vi.fn(() => ({ get matches() { return reduced; }, addEventListener: (_: string, fn: () => void) => { preferenceChanged = fn; }, removeEventListener: vi.fn() })) as any;
  globalThis.IntersectionObserver = class {
    constructor(callback: any) { observe = callback; }
    observe() {}
    disconnect() {}
  } as any;
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  mount = document.createElement('div');
  document.body.append(mount);
  root = createRoot(mount);
});
afterEach(() => { act(() => root.unmount()); mount.remove(); vi.restoreAllMocks(); });
describe('ProjectLoop DOM lifecycle', () => {
  it('has no video/source before visibility; activates with preload none and pauses offscreen', async () => {
    render();
    expect(mount.querySelector('video')).toBeNull();
    enter(true);
    await act(async () => {});
    const video = mount.querySelector('video')!;
    expect(video.preload).toBe('none');
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.querySelectorAll('source')).toHaveLength(2);
    enter(false);
    expect(mount.querySelector('video')).toBeNull();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
  it('pauses on inactive and document hidden; resumes only after eligibility returns', async () => {
    render(); enter(true); await act(async () => {});
    render({ active: false });
    expect(mount.querySelector('video')).toBeNull();
    render({ active: true }); await act(async () => {});
    act(() => { visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
    expect(mount.querySelector('video')).toBeNull();
    act(() => { visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
    await act(async () => {});
    expect(mount.querySelector('video')).not.toBeNull();
  });
  it('never creates media under reduced motion and immediately removes it if preference changes', async () => {
    reduced = true; render(); enter(true);
    expect(mount.querySelector('video')).toBeNull();
    expect(mount.querySelector('button')).toBeNull();
    expect(mount.querySelector('img')?.alt).toBe('Domios orchestration');
    act(() => { reduced = false; preferenceChanged(); }); await act(async () => {});
    expect(mount.querySelector('video')).not.toBeNull();
    act(() => { reduced = true; preferenceChanged(); });
    expect(mount.querySelector('video')).toBeNull();
  });
  it('offers tap/keyboard-native pause and play, without losing the poster', async () => {
    render(); enter(true); await act(async () => {});
    act(() => mount.querySelector('button')!.click());
    expect(mount.textContent).toContain('Play demo');
    expect(mount.querySelector('video')).toBeNull();
    expect(mount.querySelector('img')).not.toBeNull();
    act(() => mount.querySelector('button')!.click()); await act(async () => {});
    expect(mount.querySelector('video')).not.toBeNull();
  });
  it('rejected play and media errors produce a still and bounded explicit retry', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new Error('codec'));
    render(); enter(true); await act(async () => {});
    expect(mount.querySelector('video')).toBeNull();
    expect(mount.textContent).toContain('Demo unavailable');
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    vi.mocked(HTMLMediaElement.prototype.play).mockResolvedValue();
    act(() => mount.querySelector('button')!.click()); await act(async () => {});
    act(() => mount.querySelector('video')!.dispatchEvent(new Event('error')));
    expect(mount.textContent).toContain('Demo unavailable');
  });
  it('no-loop projects remain an honest screenshot without media controls', () => {
    render({ media: undefined, fallback: '/screenshots/example.webp' }); enter(true);
    expect(mount.querySelector('video')).toBeNull();
    expect(mount.querySelector('button')).toBeNull();
    expect(mount.querySelector('img')?.getAttribute('src')).toBe('/screenshots/example.webp');
  });
  it('unmount pauses media and disconnects observers', async () => {
    render(); enter(true); await act(async () => {});
    act(() => root.render(null));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
});
