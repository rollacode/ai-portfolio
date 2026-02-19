'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import allProjects from '@/portfolio/projects.json';

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
          ? 'ring-2 ring-lime-400/80 shadow-[0_0_16px_rgba(132,204,22,0.35)] animate-pulse'
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

  const hasHighlights = project.highlights.length > 0;
  const hasLinks = Object.keys(project.links).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-5 rounded-xl bg-gray-50 dark:bg-neutral-900 p-5 shadow-sm"
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
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
  );
}

export type { HighlightField };
