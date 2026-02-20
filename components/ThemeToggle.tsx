'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const LONG_PRESS_MS = 600;

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  const [isFallout, setIsFallout] = useState(false);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setIsFallout(document.documentElement.classList.contains('fallout'));
  }, []);

  const activateFallout = useCallback(() => {
    document.documentElement.classList.add('dark', 'fallout');
    localStorage.setItem('theme', 'fallout');
    setIsDark(true);
    setIsFallout(true);
  }, []);

  const deactivateFallout = useCallback(() => {
    document.documentElement.classList.remove('fallout');
    localStorage.removeItem('theme');
  }, []);

  const toggleTheme = useCallback(() => {
    // If fallout is active, any normal click exits fallout → dark
    if (isFallout) {
      deactivateFallout();
      setIsFallout(false);
      setIsDark(true);
      localStorage.setItem('theme', 'dark');
      return;
    }

    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark, isFallout, deactivateFallout]);

  // Long press handlers
  const handlePressStart = useCallback(() => {
    didLongPressRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      activateFallout();
    }, LONG_PRESS_MS);
  }, [activateFallout]);

  const handlePressEnd = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    // Skip if long press just fired
    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return;
    }
    toggleTheme();
  }, [toggleTheme]);

  // Fallout icon (radiation symbol)
  const FalloutIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.38 0 2.63.56 3.54 1.46L12 12l-3.54-5.54A4.98 4.98 0 0112 5zm-5 7c0-1.38.56-2.63 1.46-3.54L12 12l-5.54 3.54A4.98 4.98 0 017 12zm5 5a4.98 4.98 0 01-3.54-1.46L12 12l3.54 3.54A4.98 4.98 0 0112 17zm3.54-1.46L12 12l3.54-3.54A4.98 4.98 0 0117 12a4.98 4.98 0 01-1.46 3.54z" />
    </svg>
  );

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      className={`p-2 rounded-xl backdrop-blur-sm
                 border transition-colors shadow-sm
                 ${isFallout
                   ? 'bg-[#0b0c0a]/80 border-[#33ff33]/20 text-[#33ff33] hover:bg-[#33ff33]/10'
                   : 'bg-white/80 dark:bg-neutral-900/80 border-gray-200 dark:border-neutral-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800'
                 }`}
      aria-label="Toggle theme"
    >
      {isFallout ? (
        <FalloutIcon />
      ) : isDark ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </motion.button>
  );
}
