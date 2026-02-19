'use client';

import { useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanelState, PanelAction } from '@/lib/tool-handler';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import ProjectCard from './ProjectCard';
import type { HighlightField } from './ProjectCard';
import SkillsGrid from './SkillsGrid';
import ContactCard from './ContactCard';
import Timeline from './Timeline';
import ProjectsTimeline from './ProjectsTimeline';
import Gallery from './Gallery';
import ResumePanel from './ResumePanel';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ContentPanelProps {
  panelState: PanelState;
  currentAction: PanelAction | null;
  onActionConsumed: () => void;
  onAnimationComplete: () => void;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Panel title helper                                                 */
/* ------------------------------------------------------------------ */

function panelTitle(type: PanelState['type']): string {
  switch (type) {
    case 'project':
      return 'Project';
    case 'projects':
      return 'Projects';
    case 'skills':
      return 'Skills';
    case 'contact':
      return 'Contact';
    case 'timeline':
      return 'Timeline';
    case 'gallery':
      return 'Gallery';
    case 'comparison':
      return 'Comparison';
    case 'resume':
      return 'Resume';
    default:
      return '';
  }
}

/* ------------------------------------------------------------------ */
/*  Spring animation config                                            */
/* ------------------------------------------------------------------ */

const slideTransition = {
  type: 'spring' as const,
  damping: 25,
  stiffness: 200,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ContentPanel({
  panelState,
  currentAction,
  onActionConsumed,
  onAnimationComplete,
  onClose,
}: ContentPanelProps) {
  const { open, type, slug, slug2, category } = panelState;

  const isDesktop = useMediaQuery('(min-width: 768px)');

  /* Gallery focus state (routed from focus_screenshot action) ------- */
  const [galleryFocusIndex, setGalleryFocusIndex] = useState<number | null>(null);

  /* Route action to the correct child ------------------------------ */
  const timelineAction = useMemo(() => {
    if (!currentAction) return null;
    if (
      type === 'timeline' &&
      (currentAction.type === 'scroll_timeline_to' || currentAction.type === 'highlight_period')
    ) {
      return currentAction as { type: 'scroll_timeline_to'; company: string } | { type: 'highlight_period'; company: string; years?: string };
    }
    return null;
  }, [currentAction, type]);

  const projectsTimelineAction = useMemo(() => {
    if (!currentAction) return null;
    if (
      type === 'projects' &&
      (currentAction.type === 'scroll_to_project' || currentAction.type === 'highlight_project')
    ) {
      return currentAction as { type: 'scroll_to_project'; slug: string } | { type: 'highlight_project'; slug: string };
    }
    return null;
  }, [currentAction, type]);

  const highlightedSkill = useMemo(() => {
    if (!currentAction) return null;
    if (type === 'skills' && currentAction.type === 'highlight_skill') {
      return currentAction.name;
    }
    return null;
  }, [currentAction, type]);

  const projectHighlightField: HighlightField = useMemo(() => {
    if (!currentAction) return null;
    if (
      (type === 'project' || type === 'comparison') &&
      currentAction.type === 'highlight_project_detail'
    ) {
      return currentAction.field as HighlightField;
    }
    return null;
  }, [currentAction, type]);

  /* Handle focus_screenshot for ProjectCard or Gallery ------------- */
  const focusScreenshotIndex = useMemo(() => {
    if (!currentAction) return null;
    if (currentAction.type === 'focus_screenshot') {
      return currentAction.index;
    }
    return null;
  }, [currentAction]);

  // When focus_screenshot arrives for gallery, route it
  useMemo(() => {
    if (type === 'gallery' && focusScreenshotIndex != null) {
      setGalleryFocusIndex(focusScreenshotIndex);
    }
  }, [type, focusScreenshotIndex]);

  const handleGalleryFocusConsumed = useCallback(() => {
    setGalleryFocusIndex(null);
    onActionConsumed();
  }, [onActionConsumed]);

  const handleSkillHighlightConsumed = useCallback(() => {
    onActionConsumed();
  }, [onActionConsumed]);

  /* Render panel content ------------------------------------------- */
  function renderContent() {
    switch (type) {
      case 'project':
        return slug ? (
          <ProjectCard
            slug={slug}
            highlightField={projectHighlightField}
          />
        ) : null;

      case 'projects':
        return (
          <ProjectsTimeline
            currentAction={projectsTimelineAction}
            onActionConsumed={onActionConsumed}
          />
        );

      case 'skills':
        return (
          <SkillsGrid
            category={category}
            highlightedSkill={highlightedSkill}
            onHighlightConsumed={handleSkillHighlightConsumed}
          />
        );

      case 'contact':
        return <ContactCard />;

      case 'timeline':
        return (
          <Timeline
            currentAction={timelineAction}
            onActionConsumed={onActionConsumed}
          />
        );

      case 'gallery':
        return slug ? (
          <Gallery
            slug={slug}
            focusIndex={galleryFocusIndex}
            onFocusConsumed={handleGalleryFocusConsumed}
            onClose={onClose}
          />
        ) : null;

      case 'comparison':
        return (
          <div className="space-y-6">
            {slug && (
              <ProjectCard
                slug={slug}
                highlightField={
                  projectHighlightField && currentAction?.type === 'highlight_project_detail' && (currentAction as { slug: string }).slug === slug
                    ? projectHighlightField
                    : null
                }
              />
            )}
            {slug2 && (
              <div>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
                <ProjectCard
                  slug={slug2}
                  highlightField={
                    projectHighlightField && currentAction?.type === 'highlight_project_detail' && (currentAction as { slug: string }).slug === slug2
                      ? projectHighlightField
                      : null
                  }
                />
              </div>
            )}
          </div>
        );

      case 'resume':
        return <ResumePanel />;

      default:
        return null;
    }
  }

  /* Gallery renders as a fullscreen modal, not inside the panel ----- */
  if (type === 'gallery' && open) {
    return (
      <AnimatePresence>
        {slug && (
          <Gallery
            slug={slug}
            focusIndex={galleryFocusIndex}
            onFocusConsumed={handleGalleryFocusConsumed}
            onClose={onClose}
          />
        )}
      </AnimatePresence>
    );
  }

  /* Animation direction based on viewport size ---------------------- */
  // Desktop: slide in from the left.  Mobile: slide up from the bottom.
  const panelInitial = isDesktop
    ? { x: '-100%', opacity: 0 }
    : { y: '100%', opacity: 0 };

  const panelAnimate = isDesktop
    ? { x: 0, opacity: 1 }
    : { y: 0, opacity: 1 };

  const panelExit = isDesktop
    ? { x: '-100%', opacity: 0 }
    : { y: '100%', opacity: 0 };

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && type && (
          <motion.div
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={slideTransition}
            onAnimationComplete={(definition) => {
              if (typeof definition === 'object' && definition !== null) {
                const def = definition as Record<string, unknown>;
                if (
                  ('x' in def && (def.x === 0 || def.x === '0%')) ||
                  ('y' in def && (def.y === 0 || def.y === '0%'))
                ) {
                  onAnimationComplete();
                }
              }
            }}
            className={
              isDesktop
                ? // Desktop: left sidebar
                   'fixed left-0 top-0 h-full w-[calc(100vw-500px)] bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 shadow-2xl overflow-y-auto z-40'
                : // Mobile: full-screen sheet from bottom
                  'fixed inset-0 w-screen h-screen bg-white dark:bg-black overflow-y-auto z-50'
            }
          >
            <div className="p-4 md:p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  {panelTitle(type)}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-3 md:p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                  aria-label="Close panel"
                >
                  <svg className="w-7 h-7 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              {/* Content */}
              <div>{renderContent()}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
