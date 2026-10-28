'use client';

import { useEffect, useRef } from 'react';

// The CSS grid draws a dot at (STEP·i + 1, STEP·j + 1); the wave canvas lights the same dots.
const STEP = 24;
const DOT_RADIUS = 1;
// The same wave shape as domios.dev, kept quieter here: a short, soft ripple from the mark.
const WAVE_BAND = 26;
const WAVE_ALPHA = 0.55;
const WAVE_GROWTH = 0.5;
const WAVE_REACH = 360;
const WAVE_DURATION_MS = 1500;
const WAVE_STRENGTH = 0.7;
const WAVE_COOLDOWN_MS = 700;
const AFTERGLOW_ALPHA = 0.28;
const AFTERGLOW_HALF_LIFE_MS = 550;
const MARK_PULSE_MS = 720;
const WAVE_SOURCE = '.domios-credit';

// A keystroke is a tap, not an announcement: a small, quick ring under the letter that was just typed.
const KEY_WAVE = { reach: 150, durationMs: 1000, strength: 0.58, band: 18 };
const KEY_COOLDOWN_MS = 45;

type Wave = { x: number; y: number; startedAt: number; reach: number; durationMs: number; strength: number; band: number };

function waveAt(wave: Wave, now: number, x: number, y: number) {
  const progress = (now - wave.startedAt) / wave.durationMs;
  if (progress < 0 || progress >= 1) return 0;
  const band = (Math.hypot(x - wave.x, y - wave.y) - wave.reach * progress) / wave.band;
  return Math.exp(-0.5 * band * band) * (1 - progress) * wave.strength;
}

let measureContext: CanvasRenderingContext2D | null = null;
/** Where the caret sits after an input, in viewport pixels: the current line's text is measured in the field's own font. */
function caretPoint(field: HTMLTextAreaElement | HTMLInputElement) {
  const style = getComputedStyle(field);
  measureContext ??= document.createElement('canvas').getContext('2d');
  if (!measureContext) return null;
  measureContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const before = field.value.slice(0, field.selectionStart ?? field.value.length);
  const lines = before.split('\n');
  const box = field.getBoundingClientRect();
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
  const x = box.left + parseFloat(style.paddingLeft) + measureContext.measureText(lines[lines.length - 1]).width - field.scrollLeft;
  const y = box.top + parseFloat(style.paddingTop) + lineHeight * (lines.length - 0.5) - field.scrollTop;
  return { x: Math.min(Math.max(x, box.left), box.right), y: Math.min(Math.max(y, box.top), box.bottom) };
}

/**
 * The Domios dot grid behind the page: faint everywhere, brighter in a soft circle
 * that follows a fine pointer, and a light ripple that leaves the Domios mark when
 * someone reaches for it. Coarse pointers and reduced motion keep the still grid.
 */
export default function DotField() {
  const lit = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const layer = lit.current;
    if (!layer) return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || still) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    let card: HTMLElement | null = null;
    const paint = () => {
      frame = 0;
      layer.style.setProperty('--dot-x', `${x}px`);
      layer.style.setProperty('--dot-y', `${y}px`);
      layer.dataset.active = 'true';
      // The same pointer light reaches into whichever card is under it (.living-card in globals.css).
      if (card) {
        const box = card.getBoundingClientRect();
        card.style.setProperty('--lx', `${x - box.left}px`);
        card.style.setProperty('--ly', `${y - box.top}px`);
      }
    };
    const move = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      card = (event.target as Element | null)?.closest?.('.living-card') as HTMLElement | null;
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let columns = 0;
    let frame = 0;
    let lastFrame = 0;
    let lastWave = -Infinity;
    let waves: Wave[] = [];
    let charge = new Float32Array(0);
    let accent = '';

    const measure = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      columns = Math.ceil(width / STEP) + 1;
      charge = new Float32Array(columns * (Math.ceil(height / STEP) + 1));
    };
    const draw = (now: number) => {
      const elapsed = lastFrame ? Math.min(100, now - lastFrame) : 0;
      lastFrame = now;
      waves = waves.filter((wave) => now - wave.startedAt < wave.durationMs);
      let charged = false;
      context.clearRect(0, 0, width, height);
      context.fillStyle = accent;
      for (let row = 0, py = 1; py < height; row++, py += STEP) {
        for (let column = 0, px = 1; px < width; column++, px += STEP) {
          const index = row * columns + column;
          let wave = 0;
          for (const item of waves) wave = Math.max(wave, waveAt(item, now, px, py));
          const glow = Math.max(charge[index] * 0.5 ** (elapsed / AFTERGLOW_HALF_LIFE_MS), wave);
          charge[index] = glow < 0.004 ? 0 : glow;
          if (charge[index]) charged = true;
          const alpha = Math.max(WAVE_ALPHA * wave, AFTERGLOW_ALPHA * glow);
          if (alpha < 0.01) continue;
          context.globalAlpha = alpha;
          context.beginPath();
          context.arc(px, py, DOT_RADIUS * (1 + WAVE_GROWTH * wave), 0, Math.PI * 2);
          context.fill();
        }
      }
      context.globalAlpha = 1;
      return waves.length > 0 || charged;
    };
    const tick = (now: number) => {
      frame = 0;
      if (draw(now) && !document.hidden) frame = requestAnimationFrame(tick);
      else lastFrame = 0;
    };
    const launch = (wave: Wave) => {
      accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#58a6ff';
      waves = [...waves, wave];
      if (!frame) frame = requestAnimationFrame(tick);
    };
    let lastKey = -Infinity;
    const typed = (event: Event) => {
      const field = event.target;
      if (!(field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) || field.type === 'password') return;
      const now = performance.now();
      if (motion.matches || document.hidden || now - lastKey < KEY_COOLDOWN_MS) return;
      const point = caretPoint(field);
      if (!point) return;
      lastKey = now;
      launch({ ...point, startedAt: now, ...KEY_WAVE });
    };
    const emit = (source: Element) => {
      const now = performance.now();
      if (motion.matches || document.hidden || now - lastWave < WAVE_COOLDOWN_MS) return;
      lastWave = now;
      const mark = source.querySelector('.domios-credit__mark') ?? source;
      mark.animate(
        [{ filter: 'brightness(1)' }, { filter: 'brightness(1.6)', offset: 0.25 }, { filter: 'brightness(1)' }],
        { duration: MARK_PULSE_MS, easing: 'cubic-bezier(.16, 1, .3, 1)' },
      );
      const box = mark.getBoundingClientRect();
      launch({ x: box.left + box.width / 2, y: box.top + box.height / 2, startedAt: now, reach: WAVE_REACH, durationMs: WAVE_DURATION_MS, strength: WAVE_STRENGTH, band: WAVE_BAND });
    };
    const answer = (event: PointerEvent | FocusEvent) => {
      const source = (event.target as Element | null)?.closest?.(WAVE_SOURCE);
      if (source && !source.contains(event.relatedTarget as Node | null)) emit(source);
    };

    measure();
    window.addEventListener('resize', measure);
    document.addEventListener('pointerover', answer);
    document.addEventListener('focusin', answer);
    document.addEventListener('input', typed, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      document.removeEventListener('pointerover', answer);
      document.removeEventListener('focusin', answer);
      document.removeEventListener('input', typed, true);
    };
  }, []);

  return (
    <div className="dot-field" aria-hidden="true" data-no-theme-transition>
      <div className="dot-field__grid" />
      <div ref={lit} className="dot-field__lit" />
      <canvas ref={canvasRef} className="dot-field__waves" />
    </div>
  );
}
