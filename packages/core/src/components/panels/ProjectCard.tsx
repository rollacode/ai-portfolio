'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion, animate } from 'framer-motion';
import { usePortfolioData } from '../../context/PortfolioDataContext';
import { useConversationContext } from '../../context/ConversationContext';
import { brandSpring, liquidSettle, reducedMotionCrossfade, DURATION_MS } from '../../lib/motion';
import type { ProjectLoopMedia } from '../../types/portfolio';
import ProjectLoop from './ProjectLoop';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProjectData {
  slug: string;
  name: string;
  role?: string;
  stack: string[];
  period: string;
  screenshots: string[];
  description: string;
  highlights: string[];
  links: Record<string, string>;
  writeup?: string;
  loop?: ProjectLoopMedia;
}

type HighlightField = 'stack' | 'highlights' | 'description' | 'links' | null;

interface ProjectCardProps {
  slug: string;
  project?: ProjectData;
  highlightField?: HighlightField;
  onScreenshotClick?: (slug: string, index: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const HIGHLIGHT_DURATION_MS = 2000;

const linkLabels: Record<string, string> = {
  appStore: 'App Store',
  playStore: 'Play Store',
  website: 'Website',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Wrapper that adds a temporary pulsing glow when `active` is true. */
function HighlightSection({
  active,
  children,
  className = '',
}: {
  active: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg transition-all duration-[380ms] motion-reduce:duration-0 ${
        active
          ? 'ring-2 ring-lime-400/80 shadow-[0_0_16px_rgba(132,204,22,0.35)]'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screenshots masonry grid                                           */
/* ------------------------------------------------------------------ */

export function sourcedMetrics(highlights: string[]): Array<{ value: number; suffix: string; label: string; source: string }> {
  const metrics: Array<{ value: number; suffix: string; label: string; source: string }> = [];
  for (const source of highlights) {
    const team = source.match(/Team of (\d+)/);
    if (team) metrics.push({ value: Number(team[1]), suffix: '', label: 'team members', source });
    for (const match of source.matchAll(/(\d+)(\+?) (function-calling tools|layers|months|engineers)\b/g)) {
      metrics.push({ value: Number(match[1]), suffix: match[2], label: match[3], source });
    }
  }
  return metrics.slice(0, 3);
}

function Metric({ metric }: { metric: ReturnType<typeof sourcedMetrics>[number] }) {
  const still = useReducedMotion();
  const [count, setCount] = useState(still ? metric.value : 0);
  useEffect(() => {
    if (still) { setCount(metric.value); return; }
    const controls = animate(0, metric.value, { ...liquidSettle, delay: DURATION_MS.morphLand / 1000, onUpdate: value => setCount(Math.round(value)) });
    return () => controls.stop();
  }, [metric.value, still]);
  return <div aria-label={metric.source} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"><span aria-hidden="true"><span className="block text-2xl font-semibold tabular-nums">{still ? metric.value : count}{metric.suffix}</span><span className="text-xs text-gray-500">{metric.label}</span></span></div>;
}

const MAX_VISIBLE = 4;

function ScreenshotStrip({
  slug,
  screenshots,
  onScreenshotClick,
}: {
  slug: string;
  screenshots: string[];
  onScreenshotClick?: (slug: string, index: number) => void;
}) {
  if (screenshots.length === 0) return null;

  const visible = screenshots.slice(0, MAX_VISIBLE);
  const overflow = screenshots.length - MAX_VISIBLE;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
      {visible.map((src, idx) => {
        const imgSrc = `/screenshots/${src}`;
        const isLast = idx === visible.length - 1 && overflow > 0;

        return (
          <button
            key={src}
            id={'project-screenshot-' + slug + '-' + idx}
            aria-label={'Open screenshot ' + (idx + 1)}
            onClick={() => onScreenshotClick?.(slug, idx)}
            className="relative shrink-0 w-20 h-20 overflow-hidden rounded-lg
                       bg-gray-100 dark:bg-white/[0.04]
                       ring-1 ring-gray-200/60 dark:ring-white/[0.06]
                       hover:ring-lime-500/50 transition-all cursor-pointer group"
          >
            <Image
              src={imgSrc}
              alt=""
              width={160}
              height={160}
              sizes="80px"
              className="w-full h-full object-cover group-hover:scale-[1.03] motion-reduce:transform-none transition-transform duration-[380ms] motion-reduce:duration-0"
              loading="lazy"
            />
            {isLast && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-semibold">
                +{overflow}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Simple writeup renderer                                            */
/* ------------------------------------------------------------------ */

function WriteupBlock({ text }: { text: string }) {
  const blocks = useMemo(() => {
    return text.split(/\n\n+/).map((block, i) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Header lines (# or ## or ###)
      if (/^#{1,3}\s/.test(trimmed)) {
        const content = trimmed.replace(/^#{1,3}\s+/, '');
        return (
          <p key={i} className="font-semibold text-sm text-gray-900 dark:text-white mt-3 first:mt-0">
            {content}
          </p>
        );
      }

      // Bullet list (lines starting with -)
      const lines = trimmed.split('\n');
      if (lines.every((l) => l.trim().startsWith('- '))) {
        return (
          <ul key={i} className="space-y-0.5">
            {lines.map((line, j) => (
              <li key={j} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                <span className="mr-2 mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
                {line.replace(/^-\s+/, '')}
              </li>
            ))}
          </ul>
        );
      }

      // Bold lines (**text**)
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-semibold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  }, [text]);

  return <div className="space-y-2">{blocks}</div>;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProjectCard({
  slug,
  project: projectProp,
  highlightField: highlightFieldProp = null,
  onScreenshotClick,
}: ProjectCardProps) {
  const { projects } = usePortfolioData();
  const { enabled } = useConversationContext();
  const still = useReducedMotion();
  const [writeupExpanded, setWriteupExpanded] = useState(false);
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    setWriteupExpanded(false);
    setLanded(!enabled || !!still);
    if (enabled && !still) {
      const timer = setTimeout(() => setLanded(true), DURATION_MS.morphLand);
      return () => clearTimeout(timer);
    }
  }, [slug, enabled, still]);
  /* Resolve project data ------------------------------------------- */
  const project: ProjectData | undefined =
    projectProp ?? (projects as unknown as ProjectData[]).find((p) => p.slug === slug);

  /* Highlight field auto-dismiss ----------------------------------- */
  const [activeHighlight, setActiveHighlight] = useState<HighlightField>(highlightFieldProp);

  useEffect(() => {
    setActiveHighlight(highlightFieldProp);
    if (highlightFieldProp) {
      const timer = setTimeout(() => setActiveHighlight(null), HIGHLIGHT_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [highlightFieldProp]);

  /* Loading state -------------------------------------------------- */
  if (!project) {
    return (
      <div role="status" className="space-y-4 p-4"><h3 className="font-semibold">Project unavailable</h3><p>Return to projects to choose another project.</p></div>
    );
  }

  const metrics = enabled ? sourcedMetrics(project.highlights) : [];
  const hasHighlights = project.highlights.length > 0;
  const hasLinks = Object.keys(project.links).length > 0;
  const hasWriteup = !!(project as ProjectData & { writeup?: string }).writeup;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      transition={still ? reducedMotionCrossfade : liquidSettle}
      className="space-y-5 rounded-xl bg-gray-50 dark:bg-neutral-900 p-5 shadow-sm"
    >
      {/* Header ---------------------------------------------------- */}
      <div>
        <motion.h2 layoutId={enabled && !still ? 'project-title-' + slug : undefined} transition={brandSpring} className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</motion.h2>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {project.period}
          </p>
          {project.role && (
            <span className="text-xs font-medium text-lime-600 dark:text-lime-400">
              {project.role}
            </span>
          )}
        </div>
      </div>

      {enabled && (project.loop || project.screenshots[0]) && (
        <motion.div layoutId={!still ? 'project-media-' + slug : undefined} transition={brandSpring} className="overflow-hidden rounded-[14px_22px_14px_22px]">
          {project.loop && landed ? <ProjectLoop media={project.loop} fallback={project.screenshots[0] ? '/screenshots/' + project.screenshots[0] : undefined} alt={project.name + ' product preview'} active={landed} /> : (
            <div className="aspect-video overflow-hidden">
              <motion.img src={'/screenshots/' + project.screenshots[0]} alt={project.name + ' product preview'} width={1280} height={720} className="h-full w-full object-contain"
                initial={still ? false : { scale: 1 }} animate={{ scale: still || project.loop ? 1 : 1.04 }}
                transition={still ? { duration: 0 } : { duration: 6, delay: (DURATION_MS.morphLand + DURATION_MS.settle + DURATION_MS.readingHold) / 1000, ease: 'linear' }} />
            </div>
          )}
        </motion.div>
      )}

      <motion.div className="space-y-5" initial={enabled && !still ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={still ? { duration: 0 } : { ...liquidSettle, delay: enabled ? DURATION_MS.morphLand / 1000 : 0 }}>
      {metrics.length >= 2 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Sourced project facts">{metrics.map(metric => <Metric key={metric.source + metric.label} metric={metric} />)}</div>}
      {/* Screenshots ----------------------------------------------- */}
      {project.screenshots.length > 0 && (
        <ScreenshotStrip
          slug={project.slug}
          screenshots={project.screenshots}
          onScreenshotClick={onScreenshotClick}
        />
      )}

      {/* Description ----------------------------------------------- */}
      <HighlightSection active={activeHighlight === 'description'}>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {project.description}
        </p>
      </HighlightSection>

      {/* Tech stack ------------------------------------------------ */}
      <HighlightSection active={activeHighlight === 'stack'}>
        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
            Stack
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full bg-lime-500/10 px-2.5 py-0.5 text-xs font-medium text-lime-600 dark:text-lime-400"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </HighlightSection>

      {/* Highlights ------------------------------------------------ */}
      {hasHighlights && (
        <HighlightSection active={activeHighlight === 'highlights'}>
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
              Highlights
            </h3>
            <ul className="space-y-1">
              {project.highlights.map((item) => (
                <li
                  key={item}
                  className="flex items-start text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="mr-2 mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-lime-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </HighlightSection>
      )}

      {/* Writeup --------------------------------------------------- */}
      {hasWriteup && (
        <div>
          <button
            aria-expanded={writeupExpanded}
            onClick={() => setWriteupExpanded(!writeupExpanded)}
            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-lime-500 dark:hover:text-lime-400 transition-colors"
          >
            {writeupExpanded ? 'Hide writeup' : 'Read full writeup'}
          </button>
          {writeupExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-white/[0.06]">
              <WriteupBlock text={(project as ProjectData & { writeup?: string }).writeup!} />
            </div>
          )}
        </div>
      )}

      {/* Links ----------------------------------------------------- */}
      {hasLinks && (
        <HighlightSection active={activeHighlight === 'links'}>
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
              Links
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(project.links).map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-lime-500 px-3 py-1 text-xs font-medium text-gray-900
                             transition-colors hover:bg-lime-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
                >
                  {linkLabels[key] ?? key}
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </HighlightSection>
      )}
      </motion.div>
    </motion.div>
  );
}

export type { HighlightField };
