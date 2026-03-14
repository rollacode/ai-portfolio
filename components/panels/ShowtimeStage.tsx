'use client';

/* ------------------------------------------------------------------ */
/*  ShowtimeStage — cinematic storytelling on a pure black canvas      */
/* ------------------------------------------------------------------ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ShowtimeSegment, LightMode, TextStyle } from '@/lib/showtime-parser';

/* ---- Constants ---- */

const MS_PER_WORD = 60;
const MIN_READ_TIME = 1400;
const LIGHT_SETTLE_DELAY = 900;
const CURTAIN_CALL_DELAY = 5000;
const VISIBLE_WINDOW = 4;

/* ---- Text style configs — font-based only, all white ---- */

const STYLE_CONFIG: Record<TextStyle, {
  className: string;
  enterY: number;
  enterScale: number;
  glowIntensity: number;
}> = {
  whisper: {
    className: 'text-sm md:text-base lg:text-lg italic font-extralight',
    enterY: 6,
    enterScale: 0.99,
    glowIntensity: 0,
  },
  normal: {
    className: 'text-xl md:text-2xl font-normal',
    enterY: 20,
    enterScale: 0.97,
    glowIntensity: 0.25,
  },
  dramatic: {
    className: 'text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight',
    enterY: 50,
    enterScale: 0.85,
    glowIntensity: 1,
  },
  accent: {
    className: 'text-xl md:text-2xl font-semibold tracking-[0.2em] uppercase',
    enterY: 12,
    enterScale: 0.96,
    glowIntensity: 0.5,
  },
};

/* ---- Types ---- */

interface ShowtimeLine {
  text: string;
  style: TextStyle;
  id: number;
}

interface ShowtimeStageProps {
  segments: ShowtimeSegment[];
  loading: boolean;
  topic: string;
  onClose: () => void;
}

/* ---- Component ---- */

export default function ShowtimeStage({
  segments,
  loading,
  topic,
  onClose,
}: ShowtimeStageProps) {
  const [lines, setLines] = useState<ShowtimeLine[]>([]);
  const [lightMode, setLightMode] = useState<LightMode>('off');
  const [showFin, setShowFin] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const hasStartedRef = useRef(false);
  const cancelRef = useRef(false);
  const lineIdRef = useRef(0);

  function readingDelay(text: string): number {
    const words = text.split(/\s+/).length;
    return Math.max(MIN_READ_TIME, words * MS_PER_WORD);
  }

  /* ---- Sequential segment player ---- */
  useEffect(() => {
    if (segments.length === 0 || hasStartedRef.current) return;
    hasStartedRef.current = true;
    cancelRef.current = false;

    const play = async () => {
      for (const seg of segments) {
        if (cancelRef.current) return;

        switch (seg.type) {
          case 'text': {
            const id = ++lineIdRef.current;
            setLines((prev) => [...prev, { text: seg.content, style: seg.style, id }]);
            await sleep(readingDelay(seg.content));
            break;
          }
          case 'pause':
            await sleep(seg.duration * 1000);
            break;
          case 'lights':
            setLightMode(seg.mode);
            await sleep(LIGHT_SETTLE_DELAY);
            break;
          case 'style':
            break;
        }
      }

      if (cancelRef.current) return;

      setIsEnding(true);
      await sleep(1000);
      setShowFin(true);
      await sleep(CURTAIN_CALL_DELAY);
      if (!cancelRef.current) onClose();
    };

    play();
  }, [segments, onClose]);

  useEffect(() => () => { cancelRef.current = true; }, []);

  const handleClose = useCallback(() => {
    cancelRef.current = true;
    onClose();
  }, [onClose]);

  /* Rolling window — only recent lines rendered, keeps center stable */
  const visibleLines = lines.slice(Math.max(0, lines.length - VISIBLE_WINDOW));

  return (
    <>
      {/* Solid black backdrop */}
      <div className="fixed inset-0 z-[95] bg-black" style={{ backgroundColor: '#000' }} />

      <motion.div
        key="showtime-stage"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5 }}
        className="fixed inset-0 z-[96] select-none overflow-hidden"
      >
        {/* ---- Lighting layers ---- */}

        {/* Base ambient — responds to light mode */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            opacity: lightMode === 'off' ? 0
              : lightMode === 'dim' ? 0.15
              : lightMode === 'spotlight' ? 0.35
              : 0.5,
          }}
          transition={{ duration: 2.5, ease: 'easeInOut' }}
          style={{
            background:
              lightMode === 'spotlight'
                ? 'radial-gradient(ellipse 50% 60% at 50% 45%, rgba(255,255,255,0.1) 0%, transparent 100%)'
                : lightMode === 'dim'
                ? 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 100%)'
                : lightMode === 'on'
                ? 'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 100%)'
                : 'none',
          }}
        />

        {/* Spotlight — focused beam + tight inner core */}
        {lightMode === 'spotlight' && (
          <>
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.2, 0.1, 0.18] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                background: 'radial-gradient(ellipse 35% 50% at 50% 42%, rgba(255,255,255,0.12) 0%, transparent 100%)',
              }}
            />
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.04, 0.14, 0.06, 0.1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
              style={{
                background: 'radial-gradient(circle 18% at 50% 48%, rgba(255,255,255,0.18) 0%, transparent 100%)',
              }}
            />
          </>
        )}

        {/* Dim — warm subtle breathing glow */}
        {lightMode === 'dim' && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.04, 0.1, 0.05, 0.08] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,240,220,0.04) 0%, transparent 100%)',
            }}
          />
        )}

        {/* On — house lights rising */}
        {lightMode === 'on' && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ duration: 3, ease: 'easeInOut' }}
            style={{
              background: 'radial-gradient(ellipse 120% 100% at 50% 30%, rgba(255,255,255,0.06) 0%, transparent 70%)',
            }}
          />
        )}

        {/* Vignette — always present, darkens edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(0,0,0,0.5) 100%)',
          }}
        />

        {/* Exit button */}
        <motion.button
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1.5 }}
          className="absolute top-4 right-4 z-10 p-3 text-white/15 hover:text-white/50
                     transition-colors rounded-full"
          aria-label="Exit showtime"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>

        {/* ---- Stage — centered narrative ---- */}
        <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-6 md:px-16">

          {/* Loading state */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.7, 0.4, 0.7] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-center"
            >
              <p className="font-[family-name:var(--font-playfair)] text-lg md:text-xl italic text-white/50">
                Setting the stage…
              </p>
            </motion.div>
          )}

          {/* Narrative lines — centered rolling window */}
          {!loading && (
            <div className="flex flex-col gap-6 md:gap-8 items-center max-w-3xl w-full">
              <AnimatePresence mode="popLayout">
                {visibleLines.map((line, i) => {
                  const age = visibleLines.length - 1 - i;
                  const cfg = STYLE_CONFIG[line.style];

                  let targetOpacity: number;
                  if (isEnding) {
                    targetOpacity = 0.06;
                  } else if (line.style === 'dramatic') {
                    targetOpacity = age === 0 ? 1 : age === 1 ? 0.45 : 0.15;
                  } else if (line.style === 'whisper') {
                    targetOpacity = age === 0 ? 0.5 : age === 1 ? 0.2 : 0.08;
                  } else if (line.style === 'accent') {
                    targetOpacity = age === 0 ? 0.9 : age === 1 ? 0.4 : 0.15;
                  } else {
                    targetOpacity = age === 0 ? 0.85 : age === 1 ? 0.4 : age === 2 ? 0.15 : 0.06;
                  }

                  const glowStrength = cfg.glowIntensity * (age === 0 ? 1 : 0.2);
                  const textShadow = glowStrength > 0.05
                    ? `0 0 ${30 * glowStrength}px rgba(255,255,255,${0.15 * glowStrength}), 0 0 ${70 * glowStrength}px rgba(255,255,255,${0.06 * glowStrength})`
                    : undefined;

                  return (
                    <motion.p
                      key={line.id}
                      layout
                      initial={{
                        opacity: 0,
                        y: cfg.enterY,
                        scale: cfg.enterScale,
                        filter: 'blur(4px)',
                      }}
                      animate={{
                        opacity: targetOpacity,
                        y: 0,
                        scale: isEnding ? 0.96 : 1,
                        filter: 'blur(0px)',
                      }}
                      exit={{
                        opacity: 0,
                        y: -30,
                        scale: 0.95,
                        filter: 'blur(8px)',
                      }}
                      transition={{
                        opacity: { duration: isEnding ? 1.5 : 1.2, ease: 'easeOut' },
                        y: { duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] },
                        scale: { duration: 0.7, ease: 'easeOut' },
                        filter: { duration: 0.8 },
                        layout: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
                      }}
                      className={`font-[family-name:var(--font-playfair)] leading-relaxed
                                  md:leading-loose text-center text-white max-w-2xl ${cfg.className}`}
                      style={textShadow ? { textShadow } : undefined}
                    >
                      {line.text}
                    </motion.p>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Ending sequence */}
          {isEnding && (
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 0.12 }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
              className="mt-12 mb-4 h-px w-24 bg-white origin-center"
            />
          )}

          {showFin && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="text-center"
            >
              <span className="font-[family-name:var(--font-playfair)] text-xs
                               tracking-[0.5em] uppercase text-white/15 italic">
                fin
              </span>
            </motion.div>
          )}
        </div>

        {/* Topic at the very bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 2.5 }}
          className="absolute bottom-4 left-0 right-0 z-10 text-center"
        >
          <span className="font-[family-name:var(--font-playfair)] text-[9px]
                           tracking-[0.3em] uppercase text-white/[0.06]">
            {topic}
          </span>
        </motion.div>
      </motion.div>
    </>
  );
}

/* ---- helpers ---- */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
