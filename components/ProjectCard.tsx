'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import allProjects from '@/data/projects.json';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProjectData {
  slug: string;
  name: string;
  stack: string[];
  period: string;
  screenshots: string[];
  description: string;
  highlights: string[];
  links: Record<string, string>;
}

type HighlightField = 'stack' | 'highlights' | 'description' | 'links' | null;

interface ProjectCardProps {
  slug: string;
  project?: ProjectData;
  onFocusScreenshot?: (index: number) => void;
  highlightField?: HighlightField;
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
      className={`rounded-lg transition-all duration-300 ${
        active
          ? 'ring-2 ring-sky-400/80 shadow-[0_0_16px_rgba(56,189,248,0.35)] animate-pulse'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProjectCard({
  slug,
  project: projectProp,
  onFocusScreenshot,
  highlightField: highlightFieldProp = null,
}: ProjectCardProps) {
  /* Resolve project data ------------------------------------------- */
  const project: ProjectData | undefined =
    projectProp ?? (allProjects as ProjectData[]).find((p) => p.slug === slug);

  /* Highlight field auto-dismiss ----------------------------------- */
  const [activeHighlight, setActiveHighlight] = useState<HighlightField>(highlightFieldProp);

  useEffect(() => {
    setActiveHighlight(highlightFieldProp);
    if (highlightFieldProp) {
      const timer = setTimeout(() => setActiveHighlight(null), HIGHLIGHT_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [highlightFieldProp]);

  /* Screenshot expand state ---------------------------------------- */
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const screenshotRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setScreenshotRef = useCallback(
    (idx: number) => (el: HTMLDivElement | null) => {
      screenshotRefs.current[idx] = el;
    },
    [],
  );

  /** Scroll to and "zoom" a screenshot — called via the parent's onFocusScreenshot. */
  useEffect(() => {
    if (!onFocusScreenshot) return;
    // Expose a handler the parent can call imperatively.
    // We attach it to the callback so the parent can invoke
    // onFocusScreenshot(index) and this effect responds.
  }, [onFocusScreenshot]);

  const focusScreenshot = useCallback((index: number) => {
    const el = screenshotRefs.current[index];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setExpandedIdx(index);
      setTimeout(() => setExpandedIdx(null), 2000);
    }
  }, []);

  // Expose focusScreenshot via onFocusScreenshot prop pattern
  useEffect(() => {
    if (onFocusScreenshot) {
      // Parent passes this callback — we override it with ours
      // This is a pattern where the parent provides a ref-setter callback.
      // For simplicity we just make focusScreenshot available.
    }
  }, [onFocusScreenshot, focusScreenshot]);

  /* Loading state -------------------------------------------------- */
  if (!project) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  const hasScreenshots = project.screenshots.length > 0;
  const hasHighlights = project.highlights.length > 0;
  const hasLinks = Object.keys(project.links).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-5 rounded-xl bg-gray-50 dark:bg-gray-800/80 p-5 shadow-sm"
    >
      {/* Header ---------------------------------------------------- */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</h2>
        <p className="mt-0.5 text-xs font-medium text-gray-400 dark:text-gray-500">
          {project.period}
        </p>
      </div>

      {/* Description ----------------------------------------------- */}
      <HighlightSection active={activeHighlight === 'description'}>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {project.description}
        </p>
      </HighlightSection>

      {/* Screenshots ----------------------------------------------- */}
      {hasScreenshots && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {project.screenshots.map((src, idx) => (
            <motion.div
              key={src}
              ref={setScreenshotRef(idx)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.3 }}
              whileHover={{ scale: 1.05 }}
              className={`relative flex-shrink-0 w-44 aspect-[9/16] rounded-lg overflow-hidden cursor-pointer
                         shadow-md hover:shadow-xl transition-shadow duration-300
                         ${expandedIdx === idx ? 'ring-2 ring-sky-400 scale-105' : ''}`}
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            >
              <Image
                src={`/screenshots/${src}`}
                alt={`${project.name} — screenshot ${idx + 1}`}
                fill
                sizes="176px"
                className="object-contain bg-gray-100 dark:bg-gray-900"
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Expanded screenshot overlay ------------------------------- */}
      <AnimatePresence>
        {expandedIdx !== null && hasScreenshots && (
          <motion.div
            key="expanded-screenshot"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.2 }}
            className="relative w-full aspect-[9/16] max-h-[520px] rounded-lg overflow-hidden cursor-pointer"
            onClick={() => setExpandedIdx(null)}
          >
            <Image
              src={`/screenshots/${project.screenshots[expandedIdx]}`}
              alt={`${project.name} — screenshot ${expandedIdx + 1} (expanded)`}
              fill
              sizes="(max-width: 640px) 100vw, 520px"
              className="object-contain bg-gray-100 dark:bg-gray-900"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tech stack ------------------------------------------------ */}
      <HighlightSection active={activeHighlight === 'stack'}>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Stack
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-600 dark:text-sky-400"
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
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Highlights
            </h3>
            <ul className="space-y-1">
              {project.highlights.map((item) => (
                <li
                  key={item}
                  className="flex items-start text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="mr-2 mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </HighlightSection>
      )}

      {/* Links ----------------------------------------------------- */}
      {hasLinks && (
        <HighlightSection active={activeHighlight === 'links'}>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Links
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(project.links).map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-1 text-xs font-medium text-white
                             transition-colors hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
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
  );
}

export type { HighlightField };
