'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { liquidSettle, reducedMotionCrossfade } from '../../lib/motion';
import type { Classification } from '../../lib/conversation-events';

const VISITOR: Record<string, string> = { recruiter: 'Recruiter', client: 'Potential client', peer: 'Engineer', other: 'Curious visitor' };
const INTENT: Record<string, string> = { projects: 'wants projects', experience: 'asks about experience', skills: 'asks about skills', match: 'has a role to fill', contact: 'wants to get in touch', conversation: 'just talking' };
const LANGUAGE: Record<string, string> = { en: 'English', ru: 'Russian' };
const LEAD = ['no hiring intent', 'exploring', 'possible opportunity', 'concrete opportunity', 'ready for a next step'];

/** The Domios vertebrae mark: three stacked bones that fire in sequence when the cord reacts. */
export function Vertebrae({ firing, className = '' }: { firing?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 10 16" aria-hidden="true" className={`spinal-vertebrae ${firing ? 'spinal-vertebrae--firing' : ''} ${className}`}>
      <rect x="1.5" y="0.5" width="7" height="3.6" rx="1.6" />
      <rect x="1" y="6.2" width="8" height="3.6" rx="1.6" />
      <rect x="1.5" y="11.9" width="7" height="3.6" rx="1.6" />
    </svg>
  );
}

/**
 * The supporting agent made visible: while the chat model answers, the spinal cord (Jev, a fast calibrated judge)
 * reads who is asking and why, and the reading lands here as a quiet line of signals above the reply.
 */
export default function SpinalCordLine({ classification, corrected }: { classification?: Classification; corrected?: boolean }) {
  const still = useReducedMotion();
  const [open, setOpen] = useState(false);
  if (!classification?.available && !corrected) return null;
  const lead = typeof classification?.leadScore === 'number' ? Math.max(0, Math.min(4, Math.round(classification.leadScore))) : undefined;
  const signals = classification?.available ? [
    VISITOR[classification.visitorType] ?? null,
    INTENT[classification.intent] ?? null,
    LANGUAGE[classification.language] ?? null,
    lead !== undefined && lead >= 2 ? LEAD[lead] : null,
    classification.injection ? 'ignored an instruction in the message' : null,
    corrected ? 'caught an unsupported claim' : null,
  ].filter((value): value is string => !!value) : ['caught an unsupported claim'];

  return (
    <div className="relative mb-2" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        className="group inline-flex max-w-full items-center gap-2 rounded-full border border-lime-500/20 bg-lime-500/[0.06] py-1 pl-2 pr-3 text-[11px] text-gray-600 transition-colors hover:border-lime-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 dark:text-gray-300">
        <Vertebrae firing className="h-3.5 w-2.5 flex-shrink-0 text-lime-600 dark:text-lime-400" />
        <span className="font-medium text-gray-800 dark:text-gray-100">Spinal cord</span>
        <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          {signals.map((signal, index) => (
            <motion.span key={signal} className="flex items-center gap-1.5 whitespace-nowrap"
              initial={still ? false : { opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
              transition={still ? reducedMotionCrossfade : { ...liquidSettle, delay: 0.12 + index * 0.14 }}>
              <span className="h-1 w-1 rounded-full bg-gray-400/60" aria-hidden="true" />
              {signal}
            </motion.span>
          ))}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="note" initial={still ? { opacity: 0 } : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={still ? reducedMotionCrossfade : liquidSettle}
            className="absolute left-0 top-full z-20 mt-2 w-80 rounded-[12px_16px_12px_16px] border border-gray-900/10 bg-white/95 p-3 text-xs leading-relaxed text-gray-600 shadow-lg backdrop-blur dark:border-white/10 dark:bg-gray-900/95 dark:text-gray-300">
            <p className="font-medium text-gray-900 dark:text-gray-100">A second mind beside the chat</p>
            <p className="mt-1">While the agent answers, the spinal cord from Domios reads the conversation in about 0.2 s: who is asking, what they need, their language and how concrete the opportunity is. The agent uses it to choose tone and next step, and if a draft claims something the portfolio doesn&apos;t support, the cord catches it.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
