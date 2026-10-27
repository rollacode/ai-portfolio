'use client';

import { useEffect, useRef } from 'react';

/**
 * The Domios dot grid behind the page: faint everywhere, brighter in a soft circle
 * that follows a fine pointer. Coarse pointers and reduced motion keep the still grid.
 */
export default function DotField() {
  const lit = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = lit.current;
    if (!layer) return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || still) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      layer.style.setProperty('--dot-x', `${x}px`);
      layer.style.setProperty('--dot-y', `${y}px`);
      layer.dataset.active = 'true';
    };
    const move = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const leave = () => { delete layer.dataset.active; };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <div className="dot-field" aria-hidden="true" data-no-theme-transition>
      <div className="dot-field__grid" />
      <div ref={lit} className="dot-field__lit" />
    </div>
  );
}
