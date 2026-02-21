'use client';

/* ------------------------------------------------------------------ */
/*  useShowtime — manages the dramatic storytelling lifecycle          */
/* ------------------------------------------------------------------ */

import { useState, useCallback, useRef } from 'react';
import {
  parseShowtimeResponse,
  type ShowtimeSegment,
} from '@/lib/showtime-parser';

export interface ShowtimeState {
  active: boolean;
  topic: string;
  intent: string;
  segments: ShowtimeSegment[];
  loading: boolean;
}

const INITIAL: ShowtimeState = {
  active: false,
  topic: '',
  intent: '',
  segments: [],
  loading: false,
};

export function useShowtime() {
  const [state, setState] = useState<ShowtimeState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const prevThemeRef = useRef({ dark: true, fallout: false });

  const start = useCallback(async (topic: string, intent: string) => {
    /* Abort any running showtime */
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    /* Save current theme and force dark */
    prevThemeRef.current = {
      dark: document.documentElement.classList.contains('dark'),
      fallout: document.documentElement.classList.contains('fallout'),
    };
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('fallout');
    document.documentElement.setAttribute('data-showtime', '');

    setState({ active: true, topic, intent, segments: [], loading: true });

    try {
      const response = await fetch('/api/showtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, intent }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Showtime request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.delta) fullText += parsed.delta;
          } catch {
            /* skip */
          }
        }
      }

      if (!controller.signal.aborted) {
        const segments = parseShowtimeResponse(fullText);
        setState((prev) => ({ ...prev, segments, loading: false }));
      }
    } catch {
      if (!controller.signal.aborted) {
        // Restore theme on error
        restoreTheme(prevThemeRef.current);
        setState(INITIAL);
      }
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    restoreTheme(prevThemeRef.current);
    setState(INITIAL);
  }, []);

  return { ...state, start, stop };
}

/* ---- helpers ---- */

function restoreTheme(prev: { dark: boolean; fallout: boolean }) {
  document.documentElement.removeAttribute('data-showtime');
  if (!prev.dark) document.documentElement.classList.remove('dark');
  if (prev.fallout) document.documentElement.classList.add('fallout');
}
