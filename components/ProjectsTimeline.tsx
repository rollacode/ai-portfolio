'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import projectsData from '@/data/projects.json';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Project {
  slug: string;
  name: string;
  stack: string[];
  period: string;
  screenshots: string[];
  description: string;
  highlights: string[];
  links: Record<string, string>;
}

interface ProjectsTimelineAction {
  type: 'scroll_to_project' | 'highlight_project';
  slug: string;
}

interface ProjectsTimelineProps {
  currentAction?: ProjectsTimelineAction | null;
  onActionConsumed?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const HIGHLIGHT_DURATION_MS = 3000;

// Sort projects by period (newest first) — parse start year from period string
const projects = (projectsData as Project[]).sort((a, b) => {
  const yearA = parseInt(a.period.match(/\d{4}/)?.[0] ?? '0', 10);
  const yearB = parseInt(b.period.match(/\d{4}/)?.[0] ?? '0', 10);
  return yearB - yearA;
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function extractYear(period: string): string {
  const match = period.match(/(\d{4})/);
  return match ? match[1] : '';
}

function shouldShowYear(index: number): boolean {
  if (index === 0) return true;
  return extractYear(projects[index].period) !== extractYear(projects[index - 1].period);
}

/* ------------------------------------------------------------------ */
/*  Timeline dot                                                       */
/* ------------------------------------------------------------------ */

function TimelineDot({ isHighlighted }: { isHighlighted: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      <AnimatePresence>
        {isHighlighted && (
          <motion.div
            className="absolute w-8 h-8 rounded-full border-2 border-lime-400"
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      {isHighlighted && (
        <motion.div
          className="absolute w-5 h-5 rounded-full bg-lime-500/40 blur-sm"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      <motion.div
        className={`relative z-10 w-3.5 h-3.5 rounded-full border-2 transition-colors duration-300 ${
          isHighlighted
            ? 'bg-lime-400 border-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.6)]'
            : 'bg-gray-400 border-gray-400 dark:bg-neutral-600 dark:border-neutral-500'
        }`}
        animate={isHighlighted ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={isHighlighted ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } : {}}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Project card in the timeline                                       */
/* ------------------------------------------------------------------ */

function ProjectTimelineCard({
  project,
  index,
  isHighlighted,
}: {
  project: Project;
  index: number;
  isHighlighted: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, y: 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        delay: index * 0.08,
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`
        relative rounded-xl p-5 transition-all duration-500
        bg-gray-50/70 dark:bg-white/[0.05]
        border
        ${isHighlighted
          ? 'border-lime-500/40 shadow-[0_0_24px_rgba(132,204,22,0.15)]'
          : 'border-gray-200/60 dark:border-white/[0.08] hover:border-gray-300/70 dark:hover:border-white/[0.12]'
        }
      `}
    >
      {/* Highlight pulse overlay */}
      <AnimatePresence>
        {isHighlighted && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-lime-400/50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {project.name}
            </h3>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
              {project.period}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mb-4">
        {project.description}
      </p>

      {/* Highlights */}
      {project.highlights.length > 0 && (
        <div className="mb-4">
          <ul className="space-y-1.5">
            {project.highlights.map((item) => (
              <li
                key={item}
                className="flex items-start text-sm text-gray-600 dark:text-gray-400"
              >
                <span className="mr-2 mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-lime-500/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stack tags */}
      {project.stack.length > 0 && (
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
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main ProjectsTimeline component                                    */
/* ------------------------------------------------------------------ */

export default function ProjectsTimeline({
  currentAction,
  onActionConsumed,
}: ProjectsTimelineProps) {
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);
  const entryRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setEntryRef = useCallback(
    (slug: string) => (el: HTMLDivElement | null) => {
      if (el) {
        entryRefs.current.set(slug, el);
      }
    },
    [],
  );

  /* Handle agent actions ------------------------------------------- */
  useEffect(() => {
    if (!currentAction) return;

    const { type, slug } = currentAction;

    if (type === 'scroll_to_project' && slug) {
      const el = entryRefs.current.get(slug);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      onActionConsumed?.();
    }

    if (type === 'highlight_project' && slug) {
      const el = entryRefs.current.get(slug);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      setHighlightedSlug(slug);

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }

      highlightTimerRef.current = setTimeout(() => {
        setHighlightedSlug(null);
        onActionConsumed?.();
        highlightTimerRef.current = null;
      }, HIGHLIGHT_DURATION_MS);
    }
  }, [currentAction, onActionConsumed]);

  /* Cleanup ------------------------------------------------------- */
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative py-2">
      {/* Subtitle */}
      <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">
        {projects.length} projects
      </p>

      {/* Timeline entries */}
      <div className="relative">
        {/* The vertical timeline line */}
        <div className="absolute left-[7px] top-0 bottom-0 w-0.5">
          <div className="absolute inset-0 bg-gradient-to-b from-lime-500/50 via-lime-500/20 to-gray-600/20 dark:from-lime-500/40 dark:via-lime-500/15 dark:to-gray-700/20 rounded-full" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-lime-400/30 to-transparent rounded-full blur-[2px]"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Entries */}
        <div className="space-y-6">
          {projects.map((project, index) => {
            const isHighlighted = highlightedSlug === project.slug;
            const showYear = shouldShowYear(index);
            const year = extractYear(project.period);

            return (
              <div key={project.slug}>
                {/* Year marker */}
                {showYear && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.06 }}
                    className="flex items-center gap-3 mb-4 pl-7"
                  >
                    <span className="text-sm font-bold text-lime-500 tabular-nums">
                      {year}
                    </span>
                    <div className="flex-1 h-px bg-lime-500/20" />
                  </motion.div>
                )}

                <div
                  ref={setEntryRef(project.slug)}
                  className="relative flex gap-5 pl-0"
                >
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 w-[15px] relative z-10 pt-6">
                    <TimelineDot isHighlighted={isHighlighted} />
                  </div>

                  {/* Card */}
                  <div className="flex-1 min-w-0">
                    <ProjectTimelineCard
                      project={project}
                      index={index}
                      isHighlighted={isHighlighted}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Terminal dot */}
        <div className="absolute left-[5px] bottom-0 w-[5px] h-[5px] rounded-full bg-gray-500/40 dark:bg-gray-600/40" />
      </div>
    </div>
  );
}
