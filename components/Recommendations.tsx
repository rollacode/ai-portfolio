'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import recommendations from '@/portfolio/recommendations.json';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Recommendation {
  name: string;
  title: string;
  date: string;
  relation: string;
  text: string;
}

interface RecommendationsProps {
  highlightedName?: string | null;
  onActionConsumed?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LINE_CLAMP_LINES = 4;

/* ------------------------------------------------------------------ */
/*  Single recommendation card                                         */
/* ------------------------------------------------------------------ */

function RecommendationCard({
  rec,
  index,
  isHighlighted,
  onVisible,
}: {
  rec: Recommendation;
  index: number;
  isHighlighted: boolean;
  onVisible?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [needsClamp, setNeedsClamp] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Detect if text overflows the line clamp
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    // Compare scrollHeight to the clamped height
    setNeedsClamp(el.scrollHeight > el.clientHeight + 2);
  }, []);

  // Auto-scroll to highlighted card
  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onVisible?.();
    }
  }, [isHighlighted, onVisible]);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: 'easeOut' }}
      className={`
        relative rounded-xl p-5 md:p-6
        bg-gray-50/70 dark:bg-white/[0.05]
        transition-all duration-300
        ${isHighlighted
          ? 'border-2 border-lime-500 shadow-[0_0_20px_rgba(132,204,22,0.15)]'
          : 'border border-gray-200/60 dark:border-white/[0.06]'
        }
      `}
    >
      {/* Quote icon */}
      <svg
        className={`w-8 h-8 mb-3 ${isHighlighted ? 'text-lime-500' : 'text-gray-300 dark:text-white/10'} transition-colors duration-300`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
      </svg>

      {/* Recommendation text */}
      <div className="relative">
        <p
          ref={textRef}
          className={`text-sm md:text-base italic text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line ${
            !expanded ? `line-clamp-${LINE_CLAMP_LINES}` : ''
          }`}
          style={!expanded ? { display: '-webkit-box', WebkitLineClamp: LINE_CLAMP_LINES, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
        >
          {rec.text}
        </p>

        <AnimatePresence>
          {needsClamp && !expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50/70 dark:from-neutral-900/80 to-transparent pointer-events-none"
            />
          )}
        </AnimatePresence>

        {needsClamp && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-lime-500 dark:hover:text-lime-400 transition-colors"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Author info */}
      <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-white/[0.06]">
        <p className="font-semibold text-sm text-gray-900 dark:text-white">
          {rec.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {rec.title}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {rec.relation} &middot; {rec.date}
        </p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function Recommendations({
  highlightedName,
  onActionConsumed,
}: RecommendationsProps) {
  const handleHighlightVisible = useCallback(() => {
    // Small delay so the scroll animation completes before consuming
    setTimeout(() => {
      onActionConsumed?.();
    }, 600);
  }, [onActionConsumed]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        {recommendations.length} recommendations from LinkedIn
      </p>

      {(recommendations as Recommendation[]).map((rec, i) => (
        <RecommendationCard
          key={rec.name}
          rec={rec}
          index={i}
          isHighlighted={
            highlightedName != null &&
            rec.name.toLowerCase().includes(highlightedName.toLowerCase())
          }
          onVisible={handleHighlightVisible}
        />
      ))}
    </div>
  );
}
