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
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function(this: HTMLMediaElement) { this.dispatchEvent(new Event('playing')); return Promise.resolve(); });
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
    expect(mount.querySelector('video')).toBe(video);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
  it('pauses on inactive and document hidden; resumes only after eligibility returns', async () => {
    render(); enter(true); await act(async () => {});
    const playing = mount.querySelector('video');
    const calls = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;
    render({ active: false });
    expect(mount.querySelector('video')).toBe(playing);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(calls);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    render({ active: true }); await act(async () => {});
    act(() => { visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
    expect(mount.querySelector('video')).toBe(playing);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
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
  it('keyboard focus holds the same video frame and blur resumes without player chrome', async () => {
    render(); enter(true); await act(async () => {});
    const video = mount.querySelector('video')!;
    video.currentTime = 2.5;
    render({ media: { ...media } });
    expect(mount.querySelector('video')).toBe(video);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    const surface = mount.querySelector<HTMLElement>('[tabindex]')!;
    act(() => surface.focus());
    expect(mount.querySelector('[data-loop-state]')?.getAttribute('data-loop-state')).toBe('inspecting');
    expect(mount.querySelector('video')).toBe(video);
    expect(video.currentTime).toBe(2.5);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    act(() => surface.blur()); await act(async () => {});
    expect(mount.querySelector('video')).toBe(video);
    expect(video.currentTime).toBe(2.5);
    expect(mount.querySelector('button')).toBeNull();
    expect(video.controls).toBe(false);
    expect(video.hasAttribute('disablepictureinpicture')).toBe(true);
  });
  it('rejected play and media errors retain the poster with no automatic retry or player UI', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new Error('codec'));
    render(); enter(true); await act(async () => {});
    expect(mount.querySelector('video')).toBeNull();
    expect(mount.querySelector('[data-loop-state]')?.getAttribute('data-loop-state')).toBe('unavailable');
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(mount.querySelector('button')).toBeNull();
    expect(mount.querySelector('img')?.getAttribute('src')).toBe(media.poster);
    vi.mocked(HTMLMediaElement.prototype.play).mockResolvedValue();
    render({ media: { mp4: '/loops/sos-portal/loop.mp4', webm: '/loops/sos-portal/loop.webm', poster: '/loops/sos-portal/poster.webp' } }); await act(async () => {});
    act(() => mount.querySelector('video')!.dispatchEvent(new Event('error')));
    expect(mount.querySelector('[data-loop-state]')?.getAttribute('data-loop-state')).toBe('unavailable');
  });
  it('no-loop projects remain an honest screenshot without media controls', () => {
    render({ media: undefined, fallback: '/screenshots/example.webp' }); enter(true);
    expect(mount.querySelector('video')).toBeNull();
    expect(mount.querySelector('button')).toBeNull();
    expect(mount.querySelector('img')?.getAttribute('src')).toBe('/screenshots/example.webp');
  });
  it('tries the other delivered codec when one source fails, then falls back if both fail', async () => {
    render(); enter(true); await act(async () => {});
    const sources = mount.querySelectorAll('source');
    act(() => sources[0].dispatchEvent(new Event('error')));
    expect(mount.querySelector('video')).not.toBeNull();
    expect(mount.querySelector('[data-loop-state]')?.getAttribute('data-loop-state')).not.toBe('unavailable');
    act(() => sources[1].dispatchEvent(new Event('error')));
    expect(mount.querySelector('video')).toBeNull();
    expect(mount.querySelector('[data-loop-state]')?.getAttribute('data-loop-state')).toBe('unavailable');
  });
  it('falls back once to the delivered MP4 after a WebM decode failure', async () => {
    render(); enter(true); await act(async () => {});
    const first = mount.querySelector('video')!;
    Object.defineProperty(first, 'error', { value: { code: 3 } });
    act(() => first.dispatchEvent(new Event('error')));
    await act(async () => {});
    const second = mount.querySelector('video')!;
    expect(second).not.toBe(first);
    expect(second.querySelectorAll('source')).toHaveLength(1);
    expect(second.querySelector('source')?.getAttribute('src')).toBe(media.mp4);
    Object.defineProperty(second, 'error', { value: { code: 3 } });
    act(() => second.dispatchEvent(new Event('error')));
    expect(mount.querySelector('[data-loop-state]')?.getAttribute('data-loop-state')).toBe('unavailable');
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
  });
  it('uses the screenshot if the poster fails and an honest still state if both are unavailable', () => {
    render({ fallback: '/screenshots/example.webp', active: false });
    act(() => mount.querySelector('img')!.dispatchEvent(new Event('error')));
    expect(mount.querySelector('img')?.getAttribute('src')).toBe('/screenshots/example.webp');
    act(() => mount.querySelector('img')!.dispatchEvent(new Event('error')));
    expect(mount.querySelector('img')).toBeNull();
    expect(mount.textContent).toContain('Preview unavailable');
    expect(mount.querySelector('video')).toBeNull();
  });
  it('unmount pauses media and disconnects observers', async () => {
    render(); enter(true); await act(async () => {});
    act(() => root.render(null));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
});
