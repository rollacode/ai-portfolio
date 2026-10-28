'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { useConversationContext } from '../../context/ConversationContext';
import { liquidSettle, hoverSwell, press, reducedMotionCrossfade } from '../../lib/motion';
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
  const [glowing, setGlowing] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* Focus index handling ------------------------------------------- */
  useEffect(() => {
    if (focusIndex != null && focusIndex >= 0 && focusIndex < screenshots.length) {
      setCurrentIndex(focusIndex);
      setGlowing(true);

      // Scroll thumbnail into view
      const thumb = thumbRefs.current[focusIndex];
      if (thumb) {
        thumb.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
      }

      const timer = setTimeout(() => {
        setGlowing(false);
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
      setCurrentIndex(next);
      // Scroll thumbnail into view
      const thumb = thumbRefs.current[next];
      if (thumb) {
        thumb.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
      }
    },
    [screenshots.length],
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
      className="fixed inset-0 z-[90] flex flex-col bg-black/90"
      onClick={onClose}
    >
      {/* Close button */}
      <motion.button
        ref={closeButton}
        whileHover={still ? {} : { scale: 1.03, transition: hoverSwell }}
        whileTap={still ? {} : { scale: 0.98, transition: press }}
        transition={hoverSwell}
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20
                   text-white transition-colors"
        aria-label="Close gallery"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </motion.button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10 text-sm text-white/60 font-medium tabular-nums">
        {currentIndex + 1} / {screenshots.length}
      </div>

      {/* Main image area */}
      <div
        className="flex-1 flex items-center justify-center px-12 py-8 min-h-0 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left arrow */}
        {screenshots.length > 1 && (
          <button
            onClick={goPrev}
            className="absolute left-2 md:left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20
                       text-white transition-colors"
            aria-label="Previous screenshot"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Image */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={still ? reducedMotionCrossfade : liquidSettle}
            className={`relative w-full max-w-3xl h-full rounded-xl overflow-hidden
                       ${glowing ? 'ring-2 ring-lime-400 shadow-[0_0_32px_rgba(132,204,22,0.5)]' : ''}`}
          >
            <Image
              src={currentSrc}
              alt={`${project.name} — screenshot ${currentIndex + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 80vw"
              className="object-contain"
              priority
            />
          </motion.div>
        </AnimatePresence>

        {/* Right arrow */}
        {screenshots.length > 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 md:right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20
                       text-white transition-colors"
            aria-label="Next screenshot"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {screenshots.length > 1 && (
        <div
          className="flex-shrink-0 px-4 pb-4 pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={thumbnailsRef}
            className="flex gap-2 overflow-x-auto justify-center scrollbar-thin scrollbar-thumb-white/20
                       scrollbar-track-transparent pb-1"
          >
            {screenshots.map((src, idx) => {
              const thumbSrc = `/screenshots/${slug}/${src.split('/').pop()}`;
              const isActive = idx === currentIndex;

              return (
                <button
                  key={src}
                  ref={(el) => { thumbRefs.current[idx] = el; }}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden
                             transition-all duration-200 border-2
                             ${isActive
                               ? 'border-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.4)]'
                               : 'border-transparent opacity-60 hover:opacity-100'
                             }`}
                  aria-label={`Screenshot ${idx + 1}`}
                >
                  <Image
                    src={thumbSrc}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Project name */}
      <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none">
        <p className="text-sm text-white/40 font-medium">{project.name}</p>
      </div>
    </motion.div>
  );
}
