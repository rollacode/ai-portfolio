'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useChatReducedMotion } from '../../lib/chat-lifecycle';
import { motion, AnimatePresence } from 'framer-motion';
import { press, reducedMotionCrossfade } from '../../lib/motion';
import Link from 'next/link';

const STORAGE_KEY = 'storage-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const reduced = useChatReducedMotion();

  useEffect(() => {
    try { setVisible(!localStorage.getItem(STORAGE_KEY)); }
    catch { setVisible(true); }
    return () => document.documentElement.style.removeProperty('--consent-inset');
  }, []);

  useLayoutEffect(() => {
    if (!visible || !card.current) return;
    const measure = () => {
      if (!card.current) return;
      const inset = window.innerHeight - card.current.getBoundingClientRect().top + 12;
      document.documentElement.style.setProperty('--consent-inset', `${Math.max(0, inset)}px`);
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(card.current);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [visible]);

  function handleConsent(value: 'accepted' | 'declined') {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* Dismiss for this visit. */ }
    setVisible(false);
    document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')?.focus({ preventScroll: true });
  }

  return (
    <AnimatePresence onExitComplete={() => document.documentElement.style.removeProperty('--consent-inset')}>
      {visible && (
        <motion.div
          ref={card}
          role="region"
          aria-label="Privacy choices"
          data-consent-card
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reducedMotionCrossfade}
          className="fixed left-3 right-3 z-[90] mx-auto max-w-3xl rounded-[14px_18px_14px_18px] border border-gray-900/10 dark:border-gray-100/10 bg-white dark:bg-gray-950 p-4 shadow-[0_8px_28px_rgba(0,0,0,0.08)] print:hidden"
          style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              Chat uses an AI service. Save this conversation on this device?{' '}
              <Link
                href="/privacy"
                className="text-lime-600 dark:text-lime-400 underline underline-offset-4 focus-visible:outline focus-visible:outline-2"
              >
                Privacy policy
              </Link>
            </p>

            <div className="flex items-center justify-end gap-2 shrink-0">
              <motion.button
                onClick={() => handleConsent('declined')}
                whileTap={reduced ? undefined : { scale: 0.98 }}
                transition={press}
                className="min-h-11 rounded-[10px_14px_10px_14px] px-4 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500"
              >
                Decline
              </motion.button>
              <motion.button
                onClick={() => handleConsent('accepted')}
                whileTap={reduced ? undefined : { scale: 0.98 }}
                transition={press}
                className="min-h-11 rounded-[10px_14px_10px_14px] px-4 text-sm font-medium bg-lime-600/10 text-lime-700 dark:text-lime-300 hover:bg-lime-600/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500"
              >
                Accept
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
