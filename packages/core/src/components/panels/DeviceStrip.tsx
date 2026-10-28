'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimationFrame, useReducedMotion } from 'framer-motion';
import { hoverSwell, liquidSettle } from '../../lib/motion';

/**
 * A living row of phone screens built from the real screenshots: crisp at any size, drifting slowly
 * while in view. Reaching for it brakes the drift; the phone under the pointer lifts and the others
 * quiet down; a click opens that screen. Reduced motion keeps a still, scrollable row.
 */
export default function DeviceStrip({ screens, framed = true, size = 'hero', onOpen, label }: {
  screens: { src: string; index: number }[];
  framed?: boolean;
  size?: 'hero' | 'card';
  onOpen?: (index: number) => void;
  label: string;
}) {
  const still = useReducedMotion();
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const speed = useRef(0);
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [inside, setInside] = useState(false);
  const cruise = size === 'hero' ? 22 : 14; // px per second

  useEffect(() => {
    const element = host.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useAnimationFrame((_, delta) => {
    const element = track.current;
    if (!element || still) return;
    const target = inView && !inside && !document.hidden ? cruise : 0;
    // Ease toward the target speed so stopping and starting feel like inertia, not a cut.
    speed.current += (target - speed.current) * Math.min(1, delta / 260);
    if (Math.abs(speed.current) < 0.05 && target === 0) return;
    const half = element.scrollWidth / 2;
    offset.current = (offset.current + (speed.current * delta) / 1000) % (half || 1);
    element.style.transform = `translate3d(${-offset.current}px,0,0)`;
  });

  const loop = still ? screens : [...screens, ...screens];
  const height = size === 'hero' ? 'h-[19rem] md:h-[22rem]' : 'h-40';
  return (
    <div
      ref={host}
      role="group"
      aria-label={label}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setInside(true); }}
      onPointerLeave={() => { setInside(false); setHovered(null); }}
      className={`relative overflow-hidden rounded-[18px_24px_18px_24px] bg-gradient-to-b from-gray-100 to-gray-200/70 dark:from-[#111821] dark:to-[#0b1016] ${still ? 'overflow-x-auto' : ''}`}
    >
      <div
        ref={track}
        className={`flex w-max items-center ${size === 'hero' ? 'gap-6 px-6 py-7' : 'gap-3 px-3 py-4'} will-change-transform`}
      >
        {loop.map((screen, position) => {
          const key = `${screen.src}-${position}`;
          const isHovered = hovered === position;
          const quiet = hovered !== null && !isHovered;
          return (
            <motion.button
              key={key}
              type="button"
              tabIndex={position >= screens.length ? -1 : 0}
              aria-hidden={position >= screens.length || undefined}
              aria-label={`Open screen ${screen.index + 1}`}
              onClick={() => onOpen?.(screen.index)}
              onPointerEnter={() => setHovered(position)}
              onFocus={() => { setInside(true); setHovered(position); }}
              onBlur={() => { setInside(false); setHovered(null); }}
              animate={{ y: isHovered ? -8 : 0, scale: isHovered ? 1.04 : 1, opacity: quiet ? 0.55 : 1 }}
              transition={isHovered ? hoverSwell : liquidSettle}
              className={`relative aspect-[9/19.5] ${height} flex-shrink-0 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-400 ${
                framed
                  ? 'rounded-[1.6rem] border-[5px] border-[#151b23] bg-[#151b23] shadow-[0_22px_40px_-22px_rgba(0,0,0,0.6)] dark:border-[#1d2530] dark:bg-[#1d2530]'
                  : 'rounded-[1.1rem] shadow-[0_22px_40px_-22px_rgba(0,0,0,0.5)]'
              } ${isHovered ? 'ring-1 ring-lime-400/50' : ''}`}
            >
              <img src={'/screenshots/' + screen.src} alt="" loading="lazy" decoding="async" draggable={false} className={`h-full w-full ${framed ? 'rounded-[1.25rem] object-cover object-top' : 'object-cover object-top'}`} />
            </motion.button>
          );
        })}
      </div>
      {!still && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-gray-100 to-transparent dark:from-[#0f151d]" />}
      {!still && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-gray-100 to-transparent dark:from-[#0f151d]" />}
    </div>
  );
}
