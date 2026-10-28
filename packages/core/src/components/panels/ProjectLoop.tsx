'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { brandSpring, liquidSettle, EASE } from '../../lib/motion';
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
export function playEligibleMedia(video: Pick<HTMLVideoElement, 'play' | 'pause'>, onFailure: (error?: unknown) => void) {
  let cancelled = false;
  try {
    void Promise.resolve(video.play()).then(() => {
      if (cancelled) video.pause();
    }, error => { if (!cancelled) onFailure(error); });
  } catch (error) { onFailure(error); }
  return () => { cancelled = true; video.pause(); };
}

interface ProjectLoopProps {
  media?: ProjectLoopMedia;
  fallback?: string;
  alt: string;
  active?: boolean;
  layoutId?: string;
  onOpen?: () => void;
  surfaceId?: string;
}

export default function ProjectLoop({ media, fallback, alt, active = true, layoutId, onOpen, surfaceId }: ProjectLoopProps) {
  // Unknown visibility/motion preference is deliberately ineligible, including SSR.
  const mediaKey = JSON.stringify([media?.mp4, media?.webm, media?.poster]);
  const [stillSource, setStillSource] = useState(media?.poster || fallback);
  const [stillUnavailable, setStillUnavailable] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const failedSources = useRef(new Set<string>());
  const [mp4Only, setMp4Only] = useState(false);
  const mp4Attempted = useRef(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [started, setStarted] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const relevant = !!media && canPlayLoop({ active, inView, visible, reducedMotion, paused: false, failed });
  const inspecting = hovered || focused;
  const eligible = relevant && !inspecting;

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

  useEffect(() => { setFailed(false); setStarted(false); setHasFrame(false); setMp4Only(false); mp4Attempted.current = false; setStillSource(media?.poster || fallback); setStillUnavailable(false); }, [mediaKey, fallback]);
  useEffect(() => { if (relevant) setStarted(true); }, [relevant]);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (!eligible) { element.pause(); setPlaying(false); return; }
    failedSources.current.clear();
    return playEligibleMedia(element, error => {
      if (error instanceof DOMException && error.name === 'NotSupportedError' && media?.webm && !mp4Attempted.current) {
        mp4Attempted.current = true; setMp4Only(true); setPlaying(false); setHasFrame(false);
      } else { setFailed(true); setPlaying(false); }
    });
  }, [eligible, mediaKey, mp4Only]);

  const sourceFailed = (source: string) => {
    failedSources.current.add(source);
    if (failedSources.current.size >= (media?.webm && !mp4Only ? 2 : 1)) { setFailed(true); setPlaying(false); }
  };
  const poster = stillUnavailable ? undefined : stillSource;
  const showVideo = (started || relevant) && !reducedMotion && !failed;
  return (
    <div ref={host} data-loop-state={failed ? 'unavailable' : inspecting && hasFrame ? 'inspecting' : playing ? 'playing' : 'still'}>
      <motion.div id={surfaceId} layoutId={layoutId} transition={{ ...(reducedMotion ? { duration: 0 } : liquidSettle), layout: brandSpring }}
        role={onOpen ? 'button' : media && !reducedMotion ? 'group' : undefined}
        tabIndex={onOpen || media && !reducedMotion ? 0 : undefined}
        aria-label={onOpen ? 'Open ' + alt : media && !reducedMotion ? alt + '. Focus to pause the demonstration.' : undefined}
        onClick={onOpen}
        onKeyDown={event => {
          if (onOpen && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onOpen(); }
        }}
        onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
        onFocus={event => setFocused(event.currentTarget.matches(':focus-visible'))}
        onBlur={() => setFocused(false)}
        animate={{ filter: inspecting && media && !reducedMotion ? 'brightness(1.035)' : 'brightness(1)' }}
        className={'relative aspect-video overflow-hidden rounded-[18px_24px_18px_24px] bg-gray-100 outline-none focus-visible:ring-1 focus-visible:ring-lime-400/50 dark:bg-neutral-900 ' + (inspecting && media && !reducedMotion ? 'ring-1 ring-inset ring-lime-400/40' : '')}
        style={{ transition: 'box-shadow ' + (reducedMotion ? '0ms' : '380ms') + ' ' + EASE.liquidSettle }}>
        {poster ? <img src={poster} alt={alt} aria-hidden={hasFrame} onError={() => { if (fallback && stillSource !== fallback) setStillSource(fallback); else setStillUnavailable(true); }} width={1280} height={720} className="h-full w-full object-cover" /> : <p className="p-5 text-sm">Preview unavailable.</p>}
        {showVideo && (
          <video key={mp4Only ? 'mp4' : 'preferred'} ref={video} muted playsInline loop preload="none"
            disablePictureInPicture disableRemotePlayback controlsList="nodownload nofullscreen noremoteplayback"
            poster={poster} aria-label={alt} aria-hidden={!hasFrame}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            style={{ opacity: hasFrame ? 1 : 0, transition: 'opacity ' + (reducedMotion ? '0ms' : '380ms') + ' ' + EASE.liquidSettle }}
            onPlaying={() => { setPlaying(true); setHasFrame(true); }} onPause={() => setPlaying(false)}
            onError={event => {
              if (event.target !== event.currentTarget) return;
              if (media?.webm && !mp4Attempted.current && [3, 4].includes(event.currentTarget.error?.code || 0)) {
                mp4Attempted.current = true; setMp4Only(true); setPlaying(false); setHasFrame(false);
              } else { setFailed(true); setPlaying(false); }
            }}>
            {media?.webm && !mp4Only && <source src={media.webm} type="video/webm" onError={() => sourceFailed('webm')} />}
            <source src={media?.mp4} type="video/mp4" onError={() => sourceFailed('mp4')} />
          </video>
        )}
      </motion.div>
    </div>
  );
}
