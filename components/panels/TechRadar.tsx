'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import skillsData from '@/portfolio/skills.json';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Skill {
  id: string;
  name: string;
  years?: number;
  level: string;
}

type Ring = 'primary' | 'strong' | 'ai' | 'working' | 'hobby';

interface TechRadarProps {
  highlightedSkill?: string | null;
  focusCategory?: string | null;
  onActionConsumed?: () => void;
}

interface PlacedSkill extends Skill {
  x: number;
  y: number;
  ring: Ring;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DetailCard {
  skill: PlacedSkill;
  screenX: number;
  screenY: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const RINGS: { key: Ring; label: string; radius: number }[] = [
  { key: 'primary', label: 'Expert', radius: 130 },
  { key: 'strong', label: 'Strong', radius: 250 },
  { key: 'ai', label: 'AI / LLM', radius: 370 },
  { key: 'working', label: 'Working Knowledge', radius: 490 },
  { key: 'hobby', label: 'Hobby', radius: 590 },
];

const LEVEL_LABELS: Record<string, string> = {
  expert: 'Expert',
  professional: 'Strong',
  familiar: 'Working Knowledge',
};

const VIEW_SIZE = 1100;
const CENTER = VIEW_SIZE / 2;
const DOT_RADIUS = 7;
const DOT_RADIUS_HOVER = 11;
const DOT_RADIUS_FOCUSED = 9;

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

const DEFAULT_VIEWBOX: ViewBox = { x: 0, y: 0, w: VIEW_SIZE, h: VIEW_SIZE };

const NEIGHBOR_COUNT = 3;

/* ------------------------------------------------------------------ */
/*  Seeded PRNG for deterministic placement                            */
/* ------------------------------------------------------------------ */

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ------------------------------------------------------------------ */
/*  Position skills in polar coordinates                               */
/* ------------------------------------------------------------------ */

function placeSkills(): PlacedSkill[] {
  const placed: PlacedSkill[] = [];

  RINGS.forEach((ring, ringIdx) => {
    const skills = (skillsData as Record<Ring, Skill[]>)[ring.key] || [];
    const count = skills.length;
    if (count === 0) return;

    const innerR = ringIdx === 0 ? 40 : RINGS[ringIdx - 1].radius + 14;
    const outerR = ring.radius - 8;
    const midR = (innerR + outerR) / 2;

    const rng = seededRandom(ringIdx * 1000 + 42);

    skills.forEach((skill, i) => {
      const baseAngle = (2 * Math.PI * i) / count;
      const angleOffset = (rng() - 0.5) * (0.6 / count) * Math.PI;
      const radiusOffset = (rng() - 0.5) * (outerR - innerR) * 0.5;

      const angle = baseAngle + angleOffset - Math.PI / 2;
      const r = midR + radiusOffset;

      placed.push({
        ...skill,
        x: CENTER + r * Math.cos(angle),
        y: CENTER + r * Math.sin(angle),
        ring: ring.key,
      });
    });
  });

  return placed;
}

/* ------------------------------------------------------------------ */
/*  Precompute nearest neighbors                                       */
/* ------------------------------------------------------------------ */

function computeNeighbors(skills: PlacedSkill[]): Map<string, PlacedSkill[]> {
  const map = new Map<string, PlacedSkill[]>();

  for (const skill of skills) {
    const others = skills
      .filter((s) => s.id !== skill.id)
      .map((s) => ({
        skill: s,
        dist: Math.hypot(s.x - skill.x, s.y - skill.y),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, NEIGHBOR_COUNT)
      .map((entry) => entry.skill);

    map.set(skill.id, others);
  }

  return map;
}

/* ------------------------------------------------------------------ */
/*  ViewBox zoom/pan hook                                              */
/* ------------------------------------------------------------------ */

function useViewBoxZoomPan(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [viewBox, setViewBox] = useState<ViewBox>(DEFAULT_VIEWBOX);

  const dragState = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startVbX: number;
    startVbY: number;
  }>({ active: false, pointerId: null, startX: 0, startY: 0, startVbX: 0, startVbY: 0 });

  const pinchState = useRef<{
    active: boolean;
    initialDist: number;
    initialVb: ViewBox;
    pointers: Map<number, { x: number; y: number }>;
  }>({ active: false, initialDist: 0, initialVb: DEFAULT_VIEWBOX, pointers: new Map() });

  const clampViewBox = useCallback((vb: ViewBox): ViewBox => {
    // Clamp dimensions to scale range
    const w = Math.min(VIEW_SIZE / MIN_SCALE, Math.max(VIEW_SIZE / MAX_SCALE, vb.w));
    const h = Math.min(VIEW_SIZE / MIN_SCALE, Math.max(VIEW_SIZE / MAX_SCALE, vb.h));
    // Clamp position so we don't pan too far
    const maxPan = VIEW_SIZE * 0.5;
    const x = Math.min(maxPan, Math.max(-maxPan, vb.x));
    const y = Math.min(maxPan, Math.max(-maxPan, vb.y));
    return { x, y, w, h };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;

      pinchState.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinchState.current.pointers.size === 2) {
        const pts = Array.from(pinchState.current.pointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        pinchState.current.active = true;
        pinchState.current.initialDist = dist;
        pinchState.current.initialVb = { ...viewBox };
        dragState.current.active = false;
        return;
      }

      if (pinchState.current.pointers.size === 1) {
        dragState.current = {
          active: true,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          startVbX: viewBox.x,
          startVbY: viewBox.y,
        };
        el.setPointerCapture(e.pointerId);
      }
    },
    [containerRef, viewBox],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      pinchState.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinchState.current.active && pinchState.current.pointers.size === 2) {
        const pts = Array.from(pinchState.current.pointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const ratio = pinchState.current.initialDist / dist; // inverse: pinch in = zoom out
        const initVb = pinchState.current.initialVb;
        const newW = initVb.w * ratio;
        const newH = initVb.h * ratio;
        // Keep center stable
        const cx = initVb.x + initVb.w / 2;
        const cy = initVb.y + initVb.h / 2;
        setViewBox(
          clampViewBox({
            x: cx - newW / 2,
            y: cy - newH / 2,
            w: newW,
            h: newH,
          }),
        );
        return;
      }

      if (dragState.current.active && e.pointerId === dragState.current.pointerId) {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // Current viewBox determines how many SVG units per pixel
        const dxSvg = ((e.clientX - dragState.current.startX) / rect.width) * viewBox.w;
        const dySvg = ((e.clientY - dragState.current.startY) / rect.height) * viewBox.h;
        setViewBox(
          clampViewBox({
            ...viewBox,
            x: dragState.current.startVbX - dxSvg,
            y: dragState.current.startVbY - dySvg,
          }),
        );
      }
    },
    [containerRef, viewBox, clampViewBox],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pinchState.current.pointers.delete(e.pointerId);

    if (pinchState.current.pointers.size < 2) {
      pinchState.current.active = false;
    }

    if (dragState.current.pointerId === e.pointerId) {
      dragState.current.active = false;
      dragState.current.pointerId = null;
    }
  }, []);

  // Mouse wheel zoom — zoom toward cursor position
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = 1 + e.deltaY * 0.001;

      setViewBox((prev) => {
        const rect = el.getBoundingClientRect();
        // Mouse position in SVG space
        const mouseX = prev.x + ((e.clientX - rect.left) / rect.width) * prev.w;
        const mouseY = prev.y + ((e.clientY - rect.top) / rect.height) * prev.h;

        const newW = prev.w * factor;
        const newH = prev.h * factor;

        // Keep mouse position stationary in SVG space
        const newX = mouseX - ((e.clientX - rect.left) / rect.width) * newW;
        const newY = mouseY - ((e.clientY - rect.top) / rect.height) * newH;

        return clampViewBox({ x: newX, y: newY, w: newW, h: newH });
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, clampViewBox]);

  const resetViewBox = useCallback(() => {
    setViewBox(DEFAULT_VIEWBOX);
  }, []);

  const isTransformed =
    viewBox.x !== 0 || viewBox.y !== 0 || viewBox.w !== VIEW_SIZE || viewBox.h !== VIEW_SIZE;

  return {
    viewBox,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetViewBox,
    isTransformed,
  };
}

/* ------------------------------------------------------------------ */
/*  SVG coord to screen coord converter                                */
/* ------------------------------------------------------------------ */

function svgToScreen(
  svgX: number,
  svgY: number,
  viewBox: ViewBox,
  containerRect: DOMRect,
): { x: number; y: number } {
  const x = containerRect.left + ((svgX - viewBox.x) / viewBox.w) * containerRect.width;
  const y = containerRect.top + ((svgY - viewBox.y) / viewBox.h) * containerRect.height;
  return { x, y };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TechRadar({
  highlightedSkill,
  focusCategory,
  onActionConsumed,
}: TechRadarProps) {
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [focusedRing, setFocusedRing] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<DetailCard | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const placedSkills = useMemo(() => placeSkills(), []);
  const neighborsMap = useMemo(() => computeNeighbors(placedSkills), [placedSkills]);

  const {
    viewBox,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetViewBox,
    isTransformed,
  } = useViewBoxZoomPan(containerRef);

  // Track drag distance to distinguish clicks from drags
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  // Handle highlight from tool action
  useEffect(() => {
    if (highlightedSkill) {
      setActiveHighlight(highlightedSkill);

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }

      highlightTimerRef.current = setTimeout(() => {
        setActiveHighlight(null);
        onActionConsumed?.();
        highlightTimerRef.current = null;
      }, 2500);
    }

    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, [highlightedSkill, onActionConsumed]);

  // Handle focus category from tool action
  useEffect(() => {
    if (focusCategory) {
      setFocusedRing(focusCategory);

      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }

      focusTimerRef.current = setTimeout(() => {
        setFocusedRing(null);
        onActionConsumed?.();
        focusTimerRef.current = null;
      }, 5000);
    }

    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
    };
  }, [focusCategory, onActionConsumed]);

  const isHighlighted = (name: string) =>
    activeHighlight !== null &&
    name.toLowerCase().includes(activeHighlight.toLowerCase());

  const isHovered = (id: string) => hoveredSkill === id;

  // Show detail card for a skill
  const showDetailCard = useCallback(
    (skill: PlacedSkill) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const screen = svgToScreen(skill.x, skill.y, viewBox, rect);
      // Position relative to the container
      setDetailCard({
        skill,
        screenX: screen.x - rect.left,
        screenY: screen.y - rect.top,
      });
    },
    [viewBox],
  );

  // Dismiss detail card on empty space click
  const handleContainerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      pointerDownPos.current = { x: e.clientX, y: e.clientY };
      onPointerDown(e);
    },
    [onPointerDown],
  );

  const handleContainerPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const downPos = pointerDownPos.current;
      onPointerUp(e);

      // Only treat as click if pointer barely moved (< 5px)
      if (downPos) {
        const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
        if (dist < 5) {
          // Check if we clicked on a dot — if not, dismiss card
          const target = e.target as Element;
          if (!target.closest('[data-skill-dot]')) {
            setDetailCard(null);
          }
        }
      }
      pointerDownPos.current = null;
    },
    [onPointerUp],
  );

  // Handle skill dot click
  const handleDotClick = useCallback(
    (e: React.PointerEvent, skill: PlacedSkill) => {
      const downPos = pointerDownPos.current;
      if (downPos) {
        const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
        if (dist >= 5) return; // was a drag, not a click
      }
      // Toggle: if same skill, dismiss; otherwise show new
      if (detailCard?.skill.id === skill.id) {
        setDetailCard(null);
      } else {
        showDetailCard(skill);
      }
    },
    [detailCard, showDetailCard],
  );

  // Handle ring label click — toggle focus
  const handleRingLabelClick = useCallback(
    (ringKey: string) => {
      // Clear any tool-action timer when user manually toggles
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
      setFocusedRing((prev) => (prev === ringKey ? null : ringKey));
    },
    [],
  );

  // Update detail card position when viewBox changes
  useEffect(() => {
    if (!detailCard) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const screen = svgToScreen(detailCard.skill.x, detailCard.skill.y, viewBox, rect);
    setDetailCard((prev) =>
      prev
        ? {
            ...prev,
            screenX: screen.x - rect.left,
            screenY: screen.y - rect.top,
          }
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewBox]);

  // Connection lines for hovered skill
  const connectionLines = useMemo(() => {
    if (!hoveredSkill) return [];
    const neighbors = neighborsMap.get(hoveredSkill);
    if (!neighbors) return [];
    const source = placedSkills.find((s) => s.id === hoveredSkill);
    if (!source) return [];
    return neighbors.map((target) => ({
      x1: source.x,
      y1: source.y,
      x2: target.x,
      y2: target.y,
      id: `${source.id}-${target.id}`,
    }));
  }, [hoveredSkill, neighborsMap, placedSkills]);

  const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  return (
    <div className="tech-radar-container flex flex-col items-center w-full h-full min-h-[60vh]">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <span className="text-xs text-gray-400 dark:text-gray-500 select-none">
          Scroll to zoom, drag to pan
        </span>
        {isTransformed && (
          <button
            onClick={resetViewBox}
            className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Interactive radar area */}
      <div
        ref={containerRef}
        className="relative w-full flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={handleContainerPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={handleContainerPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          viewBox={viewBoxStr}
          className="w-full h-full"
          role="img"
          aria-label="Tech Radar — skills organized by expertise level"
        >
          {/* Ring backgrounds — outermost first for correct layering */}
          {[...RINGS].reverse().map((ring, i) => {
            const isFocusedRing = focusedRing === ring.key;
            return (
              <motion.circle
                key={ring.key}
                cx={CENTER}
                cy={CENTER}
                r={ring.radius}
                className={
                  isFocusedRing
                    ? 'fill-gray-100 dark:fill-white/[0.03]'
                    : 'fill-gray-100 dark:fill-white/[0.03] stroke-gray-200 dark:stroke-white/10'
                }
                stroke={isFocusedRing ? '#84cc16' : undefined}
                strokeWidth={isFocusedRing ? 2.5 : 1}
                animate={{
                  opacity: focusedRing ? (isFocusedRing ? 1 : 0.3) : 1 - i * 0.15,
                }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            );
          })}

          {/* Cross-hair lines for visual structure */}
          <motion.line
            x1={CENTER}
            y1={CENTER - RINGS[RINGS.length - 1].radius}
            x2={CENTER}
            y2={CENTER + RINGS[RINGS.length - 1].radius}
            className="stroke-gray-200 dark:stroke-white/10"
            strokeWidth={0.5}
            animate={{ opacity: focusedRing ? 0.2 : 1 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
          <motion.line
            x1={CENTER - RINGS[RINGS.length - 1].radius}
            y1={CENTER}
            x2={CENTER + RINGS[RINGS.length - 1].radius}
            y2={CENTER}
            className="stroke-gray-200 dark:stroke-white/10"
            strokeWidth={0.5}
            animate={{ opacity: focusedRing ? 0.2 : 1 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />

          {/* Ring labels — clickable to toggle focus */}
          {RINGS.map((ring) => {
            const isFocusedLabel = focusedRing === ring.key;
            return (
              <motion.text
                key={`label-${ring.key}`}
                x={CENTER + 8}
                y={CENTER - ring.radius + 18}
                className={
                  isFocusedLabel
                    ? 'cursor-pointer'
                    : 'fill-gray-400 dark:fill-gray-500 cursor-pointer'
                }
                fill={isFocusedLabel ? '#84cc16' : undefined}
                fontSize={isFocusedLabel ? 15 : 13}
                fontWeight={isFocusedLabel ? 700 : 500}
                animate={{
                  opacity: focusedRing ? (isFocusedLabel ? 1 : 0.2) : 1,
                }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                onPointerUp={(e) => {
                  // Only on click (not drag)
                  const downPos = pointerDownPos.current;
                  if (downPos) {
                    const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
                    if (dist < 5) {
                      e.stopPropagation();
                      handleRingLabelClick(ring.key);
                    }
                  }
                }}
                data-skill-dot="true"
              >
                {ring.label}
              </motion.text>
            );
          })}

          {/* Connection lines on hover */}
          <AnimatePresence>
            {connectionLines.map((line) => (
              <motion.line
                key={line.id}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#84cc16"
                strokeWidth={1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </AnimatePresence>

          {/* Skill dots + labels */}
          {placedSkills.map((skill, i) => {
            const highlighted = isHighlighted(skill.name);
            const hovered = isHovered(skill.id);
            const isOnFocusedRing = focusedRing !== null && skill.ring === focusedRing;
            const isDimmedByFocus = focusedRing !== null && skill.ring !== focusedRing;
            const active = highlighted || hovered || isOnFocusedRing;

            const dotRadius =
              highlighted || hovered
                ? DOT_RADIUS_HOVER
                : isOnFocusedRing
                  ? DOT_RADIUS_FOCUSED
                  : DOT_RADIUS;

            const dotOpacity = isDimmedByFocus ? 0.15 : 1;

            return (
              <motion.g
                key={skill.id}
                onPointerEnter={() => setHoveredSkill(skill.id)}
                onPointerLeave={() => setHoveredSkill(null)}
                onPointerUp={(e) => handleDotClick(e, skill)}
                className="cursor-pointer"
                animate={{ opacity: dotOpacity }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                data-skill-dot="true"
              >
                {/* Highlight glow ring */}
                {highlighted && (
                  <motion.circle
                    cx={skill.x}
                    cy={skill.y}
                    r={18}
                    fill="none"
                    stroke="#84cc16"
                    strokeWidth={2.5}
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}

                {/* Breathing animation wrapper */}
                <motion.circle
                  cx={skill.x}
                  cy={skill.y}
                  fill={
                    highlighted || isOnFocusedRing
                      ? '#84cc16'
                      : hovered
                        ? '#84cc16'
                        : '#9ca3af'
                  }
                  className={
                    highlighted || isOnFocusedRing || hovered ? '' : 'dark:fill-gray-500'
                  }
                  initial={{ opacity: 0, r: 0 }}
                  animate={{
                    opacity: 1,
                    r: dotRadius,
                    scale: [0.95, 1.05, 0.95],
                  }}
                  transition={{
                    opacity: { delay: i * 0.02, duration: 0.4, ease: 'easeOut' },
                    r: { delay: i * 0.02, duration: 0.4, ease: 'easeOut' },
                    scale: {
                      duration: 3 + (i % 5) * 0.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: (i % 7) * 0.4,
                    },
                  }}
                  style={{ transformOrigin: `${skill.x}px ${skill.y}px` }}
                />

                {/* Label */}
                <motion.text
                  x={skill.x}
                  y={skill.y - (active ? 18 : 14)}
                  textAnchor="middle"
                  fontSize={active ? 14 : 11}
                  fontWeight={active ? 600 : 400}
                  fill={highlighted || isOnFocusedRing ? '#84cc16' : undefined}
                  className={
                    highlighted || isOnFocusedRing
                      ? ''
                      : 'fill-gray-600 dark:fill-gray-400'
                  }
                  initial={{ opacity: 0 }}
                  animate={{ opacity: active ? 1 : 0.8 }}
                  transition={{
                    delay: i * 0.02 + 0.2,
                    duration: 0.3,
                  }}
                >
                  {skill.name}
                </motion.text>

                {/* Years badge on hover/highlight/focus */}
                {active && skill.years && (
                  <motion.text
                    x={skill.x}
                    y={skill.y + 22}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={500}
                    className="fill-gray-500 dark:fill-gray-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {skill.years}y exp
                  </motion.text>
                )}
              </motion.g>
            );
          })}
        </svg>

        {/* Detail card overlay — absolutely positioned HTML div */}
        <AnimatePresence>
          {detailCard && (
            <motion.div
              key={detailCard.skill.id}
              className="absolute z-10 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 pointer-events-auto"
              style={{
                left: detailCard.screenX,
                top: detailCard.screenY,
                transform: 'translate(-50%, -120%)',
                minWidth: 160,
                maxWidth: 220,
              }}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 200,
              }}
            >
              {/* Dismiss button */}
              <button
                className="absolute top-1.5 right-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm leading-none"
                onClick={() => setDetailCard(null)}
                aria-label="Dismiss"
              >
                x
              </button>

              {/* Skill name */}
              <p className="text-sm font-bold text-lime-500 pr-4 leading-tight">
                {detailCard.skill.name}
              </p>

              {/* Level */}
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                {LEVEL_LABELS[detailCard.skill.level] || detailCard.skill.level}
              </p>

              {/* Years */}
              {detailCard.skill.years && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {detailCard.skill.years} year{detailCard.skill.years !== 1 ? 's' : ''} experience
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
