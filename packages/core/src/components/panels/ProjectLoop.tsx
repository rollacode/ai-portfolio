'use client';

import { useEffect, useRef, useState } from 'react';
import type { ProjectLoopMedia } from '../../types/portfolio';

export interface LoopEligibility {
  active: boolean;
  inView: boolean;
  visible: boolean;
  reducedMotion: boolean;
  paused: boolean;
  failed: boolean;
}

export function canPlayLoop(state: LoopEligibility): boolean {
  return state.active && state.inView && state.visible && !state.reducedMotion && !state.paused && !state.failed;
}

/** A cancelled play promise cannot restart media after its eligibility changes. */
export function playEligibleMedia(video: Pick<HTMLVideoElement, 'play' | 'pause'>, onFailure: () => void) {
  let cancelled = false;
  try {
    void Promise.resolve(video.play()).then(() => {
      if (cancelled) video.pause();
    }, () => { if (!cancelled) onFailure(); });
  } catch { onFailure(); }
  return () => { cancelled = true; video.pause(); };
}

interface ProjectLoopProps {
  media?: ProjectLoopMedia;
  fallback?: string;
  alt: string;
  active?: boolean;
}

export default function ProjectLoop({ media, fallback, alt, active = true }: ProjectLoopProps) {
  // Unknown visibility/motion preference is deliberately ineligible, including SSR.
  const host = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const eligible = !!media && canPlayLoop({ active, inView, visible, reducedMotion, paused, failed });

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionChanged = () => setReducedMotion(preference.matches);
    const visibilityChanged = () => setVisible(document.visibilityState === 'visible');
    motionChanged();
    visibilityChanged();
    preference.addEventListener('change', motionChanged);
    document.addEventListener('visibilitychange', visibilityChanged);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.25),
      { threshold: [0, 0.25] },
    );
    if (host.current) observer?.observe(host.current);
    return () => {
      observer?.disconnect();
      preference.removeEventListener('change', motionChanged);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, []);

  useEffect(() => { setFailed(false); setPaused(false); }, [media]);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (!eligible) { element.pause(); setPlaying(false); return; }
    return playEligibleMedia(element, () => { setFailed(true); setPlaying(false); });
  }, [eligible, media]);

  const poster = media?.poster || fallback;
  return (
    <div ref={host} className="space-y-2" data-loop-state={failed ? 'unavailable' : playing ? 'playing' : 'still'}>
      <div className="relative aspect-video overflow-hidden rounded-[14px_22px_14px_22px] bg-gray-100 dark:bg-neutral-900">
        {poster ? <img src={poster} alt={alt} width={1280} height={720} className="h-full w-full object-contain" /> : <p className="p-5 text-sm">Demo preview unavailable.</p>}
        {eligible && (
          <video ref={video} muted playsInline loop preload="none" poster={poster}
            aria-label={`${alt} demo`} className={`absolute inset-0 h-full w-full object-contain ${playing ? '' : 'opacity-0'}`}
            onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onError={() => { setFailed(true); setPlaying(false); }}>
            {media?.webm && <source src={media.webm} type="video/webm" />}
            <source src={media?.mp4} type="video/mp4" />
          </video>
        )}
      </div>
      {media && !reducedMotion && (
        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
          <button type="button" aria-pressed={paused} className="rounded-lg border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500 dark:border-gray-700"
            onClick={() => { if (failed) { setFailed(false); setPaused(false); } else setPaused(!paused); }}>
            {failed ? 'Retry demo' : paused ? 'Play demo' : 'Pause demo'}
          </button>
          {failed && <span role="status">Demo unavailable. Showing the still preview.</span>}
        </div>
      )}
    </div>
  );
}
