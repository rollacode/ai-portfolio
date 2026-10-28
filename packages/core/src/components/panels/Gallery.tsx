'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { useConversationContext } from '../../context/ConversationContext';
import { brandSpring, liquidSettle, hoverSwell, press, reducedMotionCrossfade } from '../../lib/motion';
import { usePortfolioData } from '../../context/PortfolioDataContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProjectData {
  slug: string;
  name: string;
  screenshots: string[];
}

interface GalleryProps {
  slug: string;
  focusIndex?: number | null;
  onFocusConsumed?: () => void;
  onClose?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GLOW_DURATION_MS = 1500;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Gallery({
  slug,
  focusIndex = null,
  onFocusConsumed,
  onClose,
}: GalleryProps) {
  const { projects } = usePortfolioData();
  const { enabled } = useConversationContext();
  const still = useReducedMotion();
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!enabled) return;
    closeButton.current?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button') || []);
      if (!buttons.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [enabled]);
  const project = (projects as ProjectData[]).find((p) => p.slug === slug);
  const screenshots = project?.screenshots ?? [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* Focus index handling ------------------------------------------- */
  useEffect(() => {
    if (focusIndex != null && focusIndex >= 0 && focusIndex < screenshots.length) {
      setCurrentIndex(focusIndex);

      // Scroll thumbnail into view
      const thumb = thumbRefs.current[focusIndex];
      if (thumb) {
        thumb.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
      }

      const timer = setTimeout(() => {
        onFocusConsumed?.();
      }, GLOW_DURATION_MS);

      return () => clearTimeout(timer);
    }
  }, [focusIndex, screenshots.length, onFocusConsumed]);

  /* Keyboard navigation ------------------------------------------- */
  const goTo = useCallback(
    (index: number) => {
      if (screenshots.length === 0) return;
      const next = (index + screenshots.length) % screenshots.length;
      setDirection(index < currentIndex ? -1 : 1);
      setCurrentIndex(next);
      // Scroll thumbnail into view
      const thumb = thumbRefs.current[next];
      if (thumb) {
        thumb.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
      }
    },
    [screenshots.length, currentIndex],
  );

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);
  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === 'ArrowRight') {
        goNext();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPrev, goNext]);

  /* Empty state --------------------------------------------------- */
  if (!project || screenshots.length === 0) {
    return (
      <div role="dialog" aria-label="Gallery unavailable" className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-4 bg-white p-6 dark:bg-black">
        <p>No screenshots available for this project.</p><button type="button" onClick={onClose} className="underline">Return to project</button>
      </div>
    );
  }

  const currentSrc = '/screenshots/' + screenshots[Math.min(currentIndex, screenshots.length - 1)];
  const slide = still ? {} : { x: direction * 48 };

  return (
    <motion.div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={project.name + ' screenshots'}
      initial={still ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={still ? reducedMotionCrossfade : liquidSettle}
      className="fixed inset-0 z-[90] flex flex-col bg-[#0b1016]/95 backdrop-blur-md"
      onClick={onClose}
    >
      {/* One quiet header row: what you are looking at, where you are, and the way out. */}
      <div className="flex flex-shrink-0 items-center justify-between gap-4 px-5 pt-4" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 truncate text-sm text-white/70">
          <span className="font-medium text-white">{project.name.split(' - ')[0]}</span>
          <span className="ml-3 tabular-nums text-white/40">{currentIndex + 1} of {screenshots.length}</span>
        </p>
        <motion.button
          ref={closeButton}
          whileHover={still ? {} : { scale: 1.06, transition: hoverSwell }}
          whileTap={still ? {} : { scale: 0.94, transition: press }}
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/80 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
          aria-label="Close gallery"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 16 16" aria-hidden="true"><path strokeLinecap="round" d="m4 4 8 8M12 4l-8 8" /></svg>
        </motion.button>
      </div>

      {/* Main image: no frame, the screenshot itself floats; changes slide in from the side you moved toward. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-16 py-6" onClick={(e) => e.stopPropagation()}>
        {screenshots.length > 1 && <GalleryArrow side="left" onClick={goPrev} still={!!still} />}
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={currentIndex}
            initial={still ? false : { opacity: 0, ...slide, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={still ? { opacity: 0 } : { opacity: 0, x: direction * -48, scale: 0.985 }}
            transition={still ? reducedMotionCrossfade : brandSpring}
            className="relative h-full w-full max-w-4xl"
          >
            <Image
              src={currentSrc}
              alt={`${project.name}, screenshot ${currentIndex + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 80vw"
              className="object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.45)]"
              priority
            />
          </motion.div>
        </AnimatePresence>
        {screenshots.length > 1 && <GalleryArrow side="right" onClick={goNext} still={!!still} />}
      </div>

      {screenshots.length > 1 && (
        <div className="flex-shrink-0 px-4 pb-5 pt-1" onClick={(e) => e.stopPropagation()}>
          <div ref={thumbnailsRef} className="flex justify-center gap-2.5 overflow-x-auto pb-1">
            {screenshots.map((src, idx) => {
              const thumbSrc = `/screenshots/${slug}/${src.split('/').pop()}`;
              const isActive = idx === currentIndex;
              return (
                <button
                  key={src}
                  ref={(el) => { thumbRefs.current[idx] = el; }}
                  onClick={() => goTo(idx)}
                  aria-current={isActive || undefined}
                  className={`relative h-16 flex-shrink-0 overflow-hidden rounded-[10px] transition-[opacity,transform,box-shadow] duration-[380ms] [transition-timing-function:cubic-bezier(.16,1,.3,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400 md:h-20 ${
                    isActive ? 'opacity-100 shadow-[0_0_0_1.5px_#58a6ff,0_0_0_4px_rgba(11,16,22,0.95)]' : 'opacity-45 hover:-translate-y-0.5 hover:opacity-90'
                  }`}
                  aria-label={`Screenshot ${idx + 1}`}
                >
                  <img src={thumbSrc} alt="" loading="lazy" className="h-full w-auto max-w-[9rem] object-contain" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );

}

function GalleryArrow({ side, onClick, still }: { side: 'left' | 'right'; onClick: () => void; still: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={still ? {} : { scale: 1.06, x: side === 'left' ? -2 : 2, transition: hoverSwell }}
      whileTap={still ? {} : { scale: 0.94, transition: press }}
      className={`absolute ${side === 'left' ? 'left-3 md:left-5' : 'right-3 md:right-5'} z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/80 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400`}
      aria-label={side === 'left' ? 'Previous screenshot' : 'Next screenshot'}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 16 16" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d={side === 'left' ? 'M10 3.5 5.5 8l4.5 4.5' : 'M6 3.5 10.5 8 6 12.5'} />
      </svg>
    </motion.button>
  );
}
