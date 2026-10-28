'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { liquidSettle, reducedMotionCrossfade } from '../../lib/motion';
import type { Receipt } from '../../lib/evidence/receipts';

/** One quiet line under an answer instead of a mark on every word; the checked facts open on hover, focus or tap. */
export default function ReceiptSummary({ receipts }: { receipts: Receipt[] }) {
  const [open, setOpen] = useState(false);
  const still = useReducedMotion();
  if (!receipts.length) return null;
  return (
    <div className="relative mt-2 inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
        className="inline-flex items-center gap-1.5 rounded-full text-[11px] text-gray-500 transition-colors hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 dark:text-gray-500 dark:hover:text-gray-200"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3 text-lime-600 dark:text-lime-400"><path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {receipts.length} {receipts.length === 1 ? 'fact' : 'facts'} checked against the portfolio
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="list"
            initial={still ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={still ? reducedMotionCrossfade : liquidSettle}
            className="absolute bottom-full left-0 z-20 mb-2 w-72 space-y-1.5 rounded-[12px_16px_12px_16px] border border-gray-900/10 bg-white/95 p-3 text-xs text-gray-700 shadow-lg backdrop-blur dark:border-white/10 dark:bg-gray-900/95 dark:text-gray-200"
          >
            {receipts.map((receipt) => (
              <li key={receipt.id} className="flex items-baseline gap-2">
                <span className="mt-[5px] h-1 w-1 flex-shrink-0 rounded-full bg-lime-500" aria-hidden="true" />
                <span><span className="font-medium">{receipt.text}</span><span className="text-gray-500"> · {receipt.source.split(':')[0]}</span></span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
