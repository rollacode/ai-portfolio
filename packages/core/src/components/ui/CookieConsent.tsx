'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const STORAGE_KEY = 'storage-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) setVisible(true);
  }, []);

  function handleConsent(value: 'accepted' | 'declined') {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 print:hidden"
        >
          <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This site stores chat history locally on your device and sends
              messages to an AI service. See our{' '}
              <Link
                href="/privacy"
                className="underline underline-offset-2"
              >
                Privacy Policy
              </Link>{' '}
              for details.
            </p>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleConsent('declined')}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-1.5 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={() => handleConsent('accepted')}
                className="bg-black dark:bg-white text-white dark:text-black text-xs px-4 py-1.5 rounded-full transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
