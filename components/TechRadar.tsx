'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
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

type Ring = 'primary' | 'strong' | 'ai' | 'working';

interface TechRadarProps {
  highlightedSkill?: string | null;
  focusCategory?: string | null;
  onActionConsumed?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const RINGS: { key: Ring; label: string; radius: number }[] = [
  { key: 'primary', label: 'Expert', radius: 90 },
  { key: 'strong', label: 'Strong', radius: 170 },
  { key: 'ai', label: 'AI / LLM', radius: 250 },
  { key: 'working', label: 'Working Knowledge', radius: 330 },
];

const VIEW_SIZE = 750;
const CENTER = VIEW_SIZE / 2;
const DOT_RADIUS = 5;
const DOT_RADIUS_HOVER = 8;
const DOT_RADIUS_FOCUSED = 6;

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

interface PlacedSkill extends Skill {
  x: number;
  y: number;
  ring: Ring;
}

function placeSkills(): PlacedSkill[] {
  const placed: PlacedSkill[] = [];

  RINGS.forEach((ring, ringIdx) => {
    const skills = (skillsData as Record<Ring, Skill[]>)[ring.key] || [];
    const count = skills.length;
    if (count === 0) return;

    const innerR = ringIdx === 0 ? 30 : RINGS[ringIdx - 1].radius + 10;
    const outerR = ring.radius - 5;
    const midR = (innerR + outerR) / 2;

    const rng = seededRandom(ringIdx * 1000 + 42);

    skills.forEach((skill, i) => {
      const baseAngle = (2 * Math.PI * i) / count;
      // Small deterministic offset to avoid rigid look
      const angleOffset = (rng() - 0.5) * (0.6 / count) * Math.PI;
      const radiusOffset = (rng() - 0.5) * (outerR - innerR) * 0.5;

      const angle = baseAngle + angleOffset - Math.PI / 2; // start from top
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
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placedSkills = useMemo(() => placeSkills(), []);

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

  return (
    <div className="w-full aspect-square max-w-[700px] mx-auto">
      <svg
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
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
              strokeWidth={isFocusedRing ? 2 : 1}
              animate={{
                opacity: focusedRing
                  ? isFocusedRing ? 1 : 0.3
                  : 1 - i * 0.15,
              }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          );
        })}

        {/* Cross-hair lines for visual structure */}
        <motion.line
          x1={CENTER}
          y1={CENTER - RINGS[3].radius}
          x2={CENTER}
          y2={CENTER + RINGS[3].radius}
          className="stroke-gray-200 dark:stroke-white/10"
          strokeWidth={0.5}
          animate={{ opacity: focusedRing ? 0.2 : 1 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
        <motion.line
          x1={CENTER - RINGS[3].radius}
          y1={CENTER}
          x2={CENTER + RINGS[3].radius}
          y2={CENTER}
          className="stroke-gray-200 dark:stroke-white/10"
          strokeWidth={0.5}
          animate={{ opacity: focusedRing ? 0.2 : 1 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />

        {/* Ring labels */}
        {RINGS.map((ring) => {
          const isFocusedLabel = focusedRing === ring.key;
          return (
            <motion.text
              key={`label-${ring.key}`}
              x={CENTER + 6}
              y={CENTER - ring.radius + 14}
              className={
                isFocusedLabel
                  ? ''
                  : 'fill-gray-400 dark:fill-gray-500'
              }
              fill={isFocusedLabel ? '#84cc16' : undefined}
              fontSize={isFocusedLabel ? 12 : 10}
              fontWeight={isFocusedLabel ? 700 : 500}
              animate={{
                opacity: focusedRing
                  ? isFocusedLabel ? 1 : 0.2
                  : 1,
              }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              {ring.label}
            </motion.text>
          );
        })}

        {/* Skill dots + labels */}
        {placedSkills.map((skill, i) => {
          const highlighted = isHighlighted(skill.name);
          const hovered = isHovered(skill.id);
          const isOnFocusedRing = focusedRing !== null && skill.ring === focusedRing;
          const isDimmedByFocus = focusedRing !== null && skill.ring !== focusedRing;
          const active = highlighted || hovered || isOnFocusedRing;

          // Determine dot radius
          const dotRadius = highlighted || hovered
            ? DOT_RADIUS_HOVER
            : isOnFocusedRing
              ? DOT_RADIUS_FOCUSED
              : DOT_RADIUS;

          // Determine dot opacity
          const dotOpacity = isDimmedByFocus ? 0.15 : 1;

          return (
            <motion.g
              key={skill.id}
              onMouseEnter={() => setHoveredSkill(skill.id)}
              onMouseLeave={() => setHoveredSkill(null)}
              className="cursor-pointer"
              animate={{ opacity: dotOpacity }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              {/* Highlight glow ring */}
              {highlighted && (
                <motion.circle
                  cx={skill.x}
                  cy={skill.y}
                  r={14}
                  fill="none"
                  stroke="#84cc16"
                  strokeWidth={2}
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}

              {/* Dot */}
              <motion.circle
                cx={skill.x}
                cy={skill.y}
                fill={highlighted || isOnFocusedRing ? '#84cc16' : hovered ? '#84cc16' : '#9ca3af'}
                className={highlighted || isOnFocusedRing || hovered ? '' : 'dark:fill-gray-500'}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1, r: dotRadius }}
                transition={{
                  delay: i * 0.02,
                  duration: 0.4,
                  ease: 'easeOut',
                }}
              />

              {/* Label — always visible but more prominent on hover/highlight/focus */}
              <motion.text
                x={skill.x}
                y={skill.y - (active ? 14 : 10)}
                textAnchor="middle"
                fontSize={active ? 11 : 8}
                fontWeight={active ? 600 : 400}
                fill={highlighted || isOnFocusedRing ? '#84cc16' : undefined}
                className={
                  highlighted || isOnFocusedRing
                    ? ''
                    : 'fill-gray-600 dark:fill-gray-400'
                }
                initial={{ opacity: 0 }}
                animate={{ opacity: active ? 1 : 0.7 }}
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
                  y={skill.y + 18}
                  textAnchor="middle"
                  fontSize={9}
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
    </div>
  );
}
