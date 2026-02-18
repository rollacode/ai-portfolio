'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import experienceData from '@/data/experience.json';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ExperienceEntry {
  company: string;
  role: string;
  period: string;
  location: string;
  description: string;
  highlights: string[];
  stack: string[];
}

interface TimelineAction {
  type: 'scroll_timeline_to' | 'highlight_period';
  company?: string;
  years?: string;
}

interface TimelineProps {
  currentAction?: TimelineAction | null;
  onActionConsumed?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const HIGHLIGHT_DURATION_MS = 3000;

const entries = experienceData as ExperienceEntry[];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function normalizeCompany(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchesCompany(entry: ExperienceEntry, query: string): boolean {
  const q = normalizeCompany(query);
  return normalizeCompany(entry.company).includes(q) || q.includes(normalizeCompany(entry.company));
}

/* ------------------------------------------------------------------ */
/*  Dot component on the timeline line                                 */
/* ------------------------------------------------------------------ */

function TimelineDot({ isActive, isHighlighted }: { isActive: boolean; isHighlighted: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse ring for highlighted state */}
      <AnimatePresence>
        {isHighlighted && (
          <motion.div
            className="absolute w-8 h-8 rounded-full border-2 border-sky-400"
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      {/* Glow behind the dot */}
      {(isActive || isHighlighted) && (
        <motion.div
          className="absolute w-5 h-5 rounded-full bg-sky-500/40 blur-sm"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* The dot itself */}
      <motion.div
        className={`relative z-10 w-3.5 h-3.5 rounded-full border-2 transition-colors duration-300 ${
          isHighlighted
            ? 'bg-sky-400 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.6)]'
            : isActive
              ? 'bg-sky-500 border-sky-500'
              : 'bg-gray-700 border-gray-600 dark:bg-gray-600 dark:border-gray-500'
        }`}
        animate={isHighlighted ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={isHighlighted ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } : {}}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Entry card component                                               */
/* ------------------------------------------------------------------ */

function TimelineCard({
  entry,
  index,
  isHighlighted,
}: {
  entry: ExperienceEntry;
  index: number;
  isHighlighted: boolean;
}) {
  const isEven = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, y: 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        delay: index * 0.12,
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`
        relative rounded-xl p-5 transition-all duration-500
        ${isEven
          ? 'bg-gray-50 dark:bg-gray-800/80'
          : 'bg-gray-50 dark:bg-gray-800/50'
        }
        border
        ${isHighlighted
          ? 'border-sky-500/60 shadow-[0_0_24px_rgba(14,165,233,0.25)]'
          : 'border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {/* Highlight pulse overlay */}
      <AnimatePresence>
        {isHighlighted && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-sky-400/50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {entry.company}
            </h3>
            <p className="text-sm font-medium text-sky-600 dark:text-sky-400 mt-0.5">
              {entry.role}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
              {entry.period}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {entry.location}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mb-4">
        {entry.description}
      </p>

      {/* Highlights */}
      {entry.highlights.length > 0 && (
        <div className="mb-4">
          <ul className="space-y-1.5">
            {entry.highlights.map((item) => (
              <li
                key={item}
                className="flex items-start text-sm text-gray-600 dark:text-gray-400"
              >
                <span className="mr-2 mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-500/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stack tags */}
      {entry.stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.stack.map((tech) => (
            <span
              key={tech}
              className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-600 dark:text-sky-400"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Timeline component                                            */
/* ------------------------------------------------------------------ */

export default function Timeline({ currentAction, onActionConsumed }: TimelineProps) {
  const [highlightedCompany, setHighlightedCompany] = useState<string | null>(null);
  const [scrolledTo, setScrolledTo] = useState<string | null>(null);
  const entryRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setEntryRef = useCallback(
    (company: string) => (el: HTMLDivElement | null) => {
      if (el) {
        entryRefs.current.set(normalizeCompany(company), el);
      }
    },
    [],
  );

  /* Handle agent actions ------------------------------------------- */
  useEffect(() => {
    if (!currentAction) return;

    const { type, company } = currentAction;

    if (type === 'scroll_timeline_to' && company) {
      const target = entries.find((e) => matchesCompany(e, company));
      if (target) {
        const key = normalizeCompany(target.company);
        const el = entryRefs.current.get(key);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setScrolledTo(key);
          // Clear scrolled-to after a moment
          setTimeout(() => setScrolledTo(null), 2000);
        }
      }
      onActionConsumed?.();
    }

    if (type === 'highlight_period' && company) {
      const target = entries.find((e) => matchesCompany(e, company));
      if (target) {
        const key = normalizeCompany(target.company);
        const el = entryRefs.current.get(key);

        // Scroll to the entry first
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        setHighlightedCompany(key);

        // Clear previous timer
        if (highlightTimerRef.current) {
          clearTimeout(highlightTimerRef.current);
        }

        highlightTimerRef.current = setTimeout(() => {
          setHighlightedCompany(null);
          onActionConsumed?.();
          highlightTimerRef.current = null;
        }, HIGHLIGHT_DURATION_MS);
      } else {
        onActionConsumed?.();
      }
    }
  }, [currentAction, onActionConsumed]);

  /* Cleanup ------------------------------------------------------- */
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative py-2">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-sky-500 whitespace-nowrap">
            Career Timeline
          </h2>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {entries.length} positions &middot; {entries[entries.length - 1]?.period.split('—')[0].trim()} to present
        </p>
      </motion.div>

      {/* Timeline entries */}
      <div className="relative">
        {/* The vertical timeline line */}
        <div className="absolute left-[7px] top-0 bottom-0 w-0.5">
          {/* Base line */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-500/50 via-sky-500/20 to-gray-600/20 dark:from-sky-500/40 dark:via-sky-500/15 dark:to-gray-700/20 rounded-full" />
          {/* Glow overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-sky-400/30 to-transparent rounded-full blur-[2px]"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Entries */}
        <div className="space-y-8">
          {entries.map((entry, index) => {
            const key = normalizeCompany(entry.company);
            const isHighlighted = highlightedCompany === key;
            const isScrolledTo = scrolledTo === key;

            return (
              <div
                key={entry.company}
                ref={setEntryRef(entry.company)}
                className="relative flex gap-5 pl-0"
              >
                {/* Timeline dot (positioned on the line) */}
                <div className="flex-shrink-0 w-[15px] relative z-10 pt-6">
                  <TimelineDot
                    isActive={isScrolledTo}
                    isHighlighted={isHighlighted}
                  />
                </div>

                {/* Card */}
                <div className="flex-1 min-w-0">
                  <TimelineCard
                    entry={entry}
                    index={index}
                    isHighlighted={isHighlighted}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Terminal dot at end of line */}
        <div className="absolute left-[5px] bottom-0 w-[5px] h-[5px] rounded-full bg-gray-500/40 dark:bg-gray-600/40" />
      </div>
    </div>
  );
}
