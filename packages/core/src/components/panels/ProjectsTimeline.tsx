'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePortfolioData } from '../../context/PortfolioDataContext';
import { useConversationContext } from '../../context/ConversationContext';
import { brandSpring, liquidSettle, reducedMotionCrossfade } from '../../lib/motion';
import type { ProjectLoopMedia } from '../../types/portfolio';
import ProjectLoop from './ProjectLoop';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Project {
  slug: string;
  name: string;
  role?: string;
  stack: string[];
  period: string;
  screenshots: string[];
  loop?: ProjectLoopMedia;
  description: string;
  highlights: string[];
  links: Record<string, string>;
  skillIds?: string[];
}

interface ProjectsTimelineAction {
  type: 'scroll_to_project' | 'highlight_project';
  slug: string;
}

interface ProjectsTimelineProps {
  currentAction?: ProjectsTimelineAction | null;
  onActionConsumed?: () => void;
  filter?: string;
  skillId?: string;
  onProjectOpen?: (slug: string) => void;
  onClearFilter?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const HIGHLIGHT_DURATION_MS = 3000;

const THEME_SKILL_IDS: Record<string, string[]> = {
  ai: ['langchain-langgraph', 'llm-agents', 'ai-agent-orchestration', 'whisper-openai', 'rag-vector-search', 'computer-vision-opencv'],
  mobile: ['swift-ios', 'swiftui', 'react-native', 'objective-c', 'arkit-scenekit'],
  web: ['react-typescript', 'python-django-fastapi', 'vue-js', 'aspnet-csharp'],
  ar: ['arkit-scenekit', 'computer-vision-opencv', 'unity3d-csharp'],
};

// Projects where Andrey held leadership roles (Team Lead, Tech Lead, PM, Co-Founder)
const LEADERSHIP_SLUGS = new Set([
  'domios',
  'sos-portal',      // Team Lead, 17 people
  'performica',      // Product Manager, 7 engineers
  'rekap',           // Senior Engineer, AI architecture lead
  'cops-inc',        // Co-Founder
  'bugsee',          // Lead iOS Developer
  'minnow',          // Lead iOS + backend
  'dishero',         // Lead iOS Developer
  'binaura',         // Solo founder
]);

const FILTER_LABELS: Record<string, string> = {
  ai: 'AI projects',
  mobile: 'Mobile projects',
  web: 'Web projects',
  ar: 'AR projects',
  leadership: 'Leadership roles',
};

// Sort helper — moved inside component as useMemo since data comes from context
function sortProjectsByPeriod(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const yearA = parseInt(a.period.match(/\d{4}/)?.[0] ?? '0', 10);
    const yearB = parseInt(b.period.match(/\d{4}/)?.[0] ?? '0', 10);
    return yearB - yearA;
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function extractYear(period: string): string {
  const match = period.match(/(\d{4})/);
  return match ? match[1] : '';
}

function shouldShowYear(list: Project[], index: number): boolean {
  if (index === 0) return true;
  return extractYear(list[index].period) !== extractYear(list[index - 1].period);
}

/* ------------------------------------------------------------------ */
/*  Timeline dot                                                       */
/* ------------------------------------------------------------------ */

function TimelineDot({ isHighlighted }: { isHighlighted: boolean }) {
  return <span className={'block h-3.5 w-3.5 rounded-full border-2 ' + (isHighlighted ? 'border-lime-500 bg-lime-500' : 'border-gray-400 bg-gray-400 dark:bg-neutral-600')} />;
}

/* ------------------------------------------------------------------ */
/*  Project card in the timeline                                       */
/* ------------------------------------------------------------------ */

function ProjectTimelineCard({
  project,
  index,
  isHighlighted,
  onProjectOpen,
}: {
  onProjectOpen?: (slug: string) => void;
  project: Project;
  index: number;
  isHighlighted: boolean;
}) {
  const { enabled, panelIdentity } = useConversationContext();
  const still = useReducedMotion();
  if (enabled) return <CompactProjectCard project={project} isHighlighted={isHighlighted} onProjectOpen={onProjectOpen} still={!!still} active={!panelIdentity || panelIdentity.type === 'projects'} />;
  return (
    <motion.div
      initial={false}
      transition={still ? reducedMotionCrossfade : liquidSettle}
      className={`
        relative rounded-xl p-5 transition-all duration-500
        bg-gray-100/80 dark:bg-white/[0.06]
        border
        ${isHighlighted
          ? 'border-lime-500/40 shadow-[0_0_24px_rgba(132,204,22,0.15)]'
          : 'border-gray-200/60 dark:border-white/[0.08] hover:border-gray-300/70 dark:hover:border-white/[0.12]'
        }
      `}
    >
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <motion.h3 layoutId={enabled && !still ? 'project-title-' + project.slug : undefined} transition={brandSpring} className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {enabled && onProjectOpen ? <button id={'project-source-' + project.slug} type="button" className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-500" onClick={() => onProjectOpen(project.slug)}>{project.name}<span className="sr-only"> open project</span></button> : project.name}
            </motion.h3>
            {project.role && (
              <p className="text-xs font-medium text-lime-600 dark:text-lime-400 mt-0.5">
                {project.role}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
              {project.period}
            </p>
          </div>
        </div>
      </div>

      {enabled && (project.loop || project.screenshots[0]) && (
        <div className="mb-4">
          {project.loop ? <ProjectLoop active={!panelIdentity || panelIdentity.type === 'projects'} surfaceId={'project-media-source-' + project.slug} media={project.loop} fallback={project.screenshots[0] ? '/screenshots/' + project.screenshots[0] : undefined}
            layoutId={!still ? 'project-media-' + project.slug : undefined} alt={project.name + ' product preview'} onOpen={() => onProjectOpen?.(project.slug)} /> :
            <motion.div layoutId={!still ? 'project-media-' + project.slug : undefined} transition={brandSpring} className="aspect-video overflow-hidden rounded-[18px_24px_18px_24px] bg-gray-100 dark:bg-neutral-900">
              <button type="button" id={'project-media-source-' + project.slug} aria-label={'Open ' + project.name} className="h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500" onClick={() => onProjectOpen?.(project.slug)}>
                <img src={'/screenshots/' + project.screenshots[0]} alt={project.name + ' product preview'} width={1280} height={720} loading="lazy" className="h-full w-full object-cover" />
              </button>
            </motion.div>}
        </div>
      )}
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

const LIST_HIGHLIGHTS = 3;
const LIST_STACK = 5;

/** The list card for sites with the conversation layer: media beside a short read, the whole card opens the project. */
function CompactProjectCard({ project, isHighlighted, onProjectOpen, still, active }: {
  project: Project;
  isHighlighted: boolean;
  onProjectOpen?: (slug: string) => void;
  still: boolean;
  active: boolean;
}) {
  const media = project.loop || project.screenshots[0];
  const extraStack = project.stack.length - LIST_STACK;
  return (
    <div
      className={`group relative grid gap-5 rounded-[14px_18px_14px_18px] border p-4 transition-[border-color,box-shadow] duration-[380ms] [transition-timing-function:cubic-bezier(.16,1,.3,1)] md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] ${
        isHighlighted
          ? 'border-lime-500/45 shadow-[0_18px_40px_-26px_rgba(88,166,255,0.7)]'
          : 'border-gray-200/70 hover:border-lime-500/35 dark:border-white/[0.08] dark:hover:border-lime-400/30'
      }`}
    >
      {media && (
        // Above the card-wide open target, so the loop keeps its own hover pause.
        <div className="relative z-[1] self-start">
          {project.loop ? (
            <ProjectLoop active={active} surfaceId={'project-media-source-' + project.slug} media={project.loop}
              fallback={project.screenshots[0] ? '/screenshots/' + project.screenshots[0] : undefined}
              layoutId={!still ? 'project-media-' + project.slug : undefined} alt={project.name + ' product preview'} onOpen={() => onProjectOpen?.(project.slug)} />
          ) : (
            <motion.div layoutId={!still ? 'project-media-' + project.slug : undefined} transition={brandSpring} className="aspect-video overflow-hidden rounded-[12px_16px_12px_16px] bg-gray-100 dark:bg-neutral-900">
              <button type="button" id={'project-media-source-' + project.slug} aria-label={'Open ' + project.name} className="h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500" onClick={() => onProjectOpen?.(project.slug)}>
                <img src={'/screenshots/' + project.screenshots[0]} alt={project.name + ' product preview'} width={1280} height={720} loading="lazy" className="h-full w-full object-cover transition-transform duration-[520ms] [transition-timing-function:cubic-bezier(.3,1.6,.4,1)] group-hover:scale-[1.02]" />
              </button>
            </motion.div>
          )}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <motion.h3 layoutId={!still ? 'project-title-' + project.slug : undefined} transition={brandSpring} className="text-base font-semibold leading-snug tracking-[-0.015em] text-gray-900 dark:text-white">
            {onProjectOpen ? (
              <button id={'project-source-' + project.slug} type="button" className="text-left after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-500" onClick={() => onProjectOpen(project.slug)}>
                {project.name}<span className="sr-only"> open project</span>
              </button>
            ) : project.name}
          </motion.h3>
          <span className="flex-shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-500">{project.period}</span>
        </div>
        {project.role && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{project.role}</p>}
        <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{project.description}</p>
        {project.highlights.length > 0 && (
          <ul className="mt-3 space-y-1">
            {project.highlights.slice(0, LIST_HIGHLIGHTS).map((item) => (
              <li key={item} className="flex items-start gap-2 text-[13px] leading-snug text-gray-600 dark:text-gray-400">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-lime-500/80" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
        {project.stack.length > 0 && (
          <div className="relative z-[1] mt-3 flex flex-wrap gap-1.5">
            {project.stack.slice(0, LIST_STACK).map((tech) => (
              <span key={tech} className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600 dark:border-white/10 dark:text-gray-400">{tech}</span>
            ))}
            {extraStack > 0 && <span className="px-1 py-0.5 text-[11px] text-gray-500">+{extraStack}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main ProjectsTimeline component                                    */
/* ------------------------------------------------------------------ */

export default function ProjectsTimeline({
  currentAction,
  onActionConsumed,
  filter,
  skillId,
  onProjectOpen,
  onClearFilter,
}: ProjectsTimelineProps) {
  const still = useReducedMotion();
  const { enabled } = useConversationContext();
  const { projects: projectsData } = usePortfolioData();
  const allProjects = useMemo(() => sortProjectsByPeriod(projectsData as unknown as Project[]), [projectsData]);
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);
  const entryRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  /* Filter projects based on theme or specific skillId ------------- */
  const filteredProjects = useMemo(() => {
    let result = allProjects;

    // Filter by theme or leadership
    if (filter && filter !== 'all') {
      if (filter === 'leadership') {
        result = result.filter((p) => LEADERSHIP_SLUGS.has(p.slug));
      } else {
        const relevantSkills = new Set(THEME_SKILL_IDS[filter] || []);
        result = result.filter((p) =>
          p.skillIds?.some((sid) => relevantSkills.has(sid)),
        );
      }
    }

    // Filter by specific skillId
    if (skillId) {
      result = result.filter((p) => p.skillIds?.includes(skillId));
    }

    return result;
  }, [filter, skillId, allProjects]);
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
        el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
      }
      onActionConsumed?.();
    }

    if (type === 'highlight_project' && slug) {
      const el = entryRefs.current.get(slug);
      if (el) {
        el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
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

  const isFiltered = (filter && filter !== 'all') || !!skillId;

  /* Build filter label for indicator ------------------------------- */
  const filterLabel = useMemo(() => {
    const parts: string[] = [];
    if (filter && filter !== 'all' && FILTER_LABELS[filter]) {
      parts.push(FILTER_LABELS[filter]);
    }
    if (skillId) {
      parts.push(skillId);
    }
    return parts.join(enabled ? ', ' : ' · ');
  }, [filter, skillId]);

  return (
    <div className="relative py-2">
      {/* Filter indicator */}
      {isFiltered && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-500/10 border border-lime-500/20 px-3 py-1 text-xs font-medium text-lime-600 dark:text-lime-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {filterLabel}
          </span>
        </motion.div>
      )}

      {/* Subtitle */}
      <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">
        {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
        {isFiltered && ` (of ${allProjects.length} total)`}
      </p>

      {/* Empty state */}
      {filteredProjects.length === 0 && (
        <motion.p
          initial={false}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-400 dark:text-gray-500 text-center py-12"
        >
          No matching projects found. <button type="button" className="underline" onClick={onClearFilter}>Show all projects</button>
        </motion.p>
      )}

      {/* Timeline entries */}
      {filteredProjects.length > 0 && (
        <div className="relative">
          {/* The vertical timeline line */}
          <div className="absolute left-[7px] top-0 bottom-0 w-0.5">
            <div className="absolute inset-0 bg-gradient-to-b from-lime-500/50 via-lime-500/20 to-gray-600/20 dark:from-lime-500/40 dark:via-lime-500/15 dark:to-gray-700/20 rounded-full" />

          </div>

          {/* Entries */}
          <div className="space-y-6">
            {filteredProjects.map((project, index) => {
              const isHighlighted = highlightedSlug === project.slug;
              const showYear = shouldShowYear(filteredProjects, index);
              const year = extractYear(project.period);

              return (
                <div key={project.slug}>
                  {/* Year marker */}
                  {showYear && (
                    <motion.div
                      initial={false}
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
                        onProjectOpen={onProjectOpen}
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
      )}
    </div>
  );
}
