'use client';

import { Component, useMemo, useCallback, useState, useEffect, useRef, useLayoutEffect, type ReactNode } from 'react';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from 'framer-motion';
import { useConversationContext } from '../../context/ConversationContext';
import type { PanelIdentity } from '../../lib/conversation-events';
import { brandSpring, reducedMotionCrossfade, DURATION_MS } from '../../lib/motion';
import type { PanelState, PanelAction } from '../../lib/tool-handler';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import ProjectCard from './ProjectCard';
import type { HighlightField } from './ProjectCard';
import SkillsGrid from './SkillsGrid';
import ContactCard from './ContactCard';
import Timeline from './Timeline';
import ProjectsTimeline from './ProjectsTimeline';
import Gallery from './Gallery';
import ResumePanel from './ResumePanel';
import TechRadar from './TechRadar';
import QuickFacts from './QuickFacts';
import Recommendations from './Recommendations';
import SnakeGame from '../games/SnakeGame';
import Game2048 from '../games/Game2048';
import InsightPanel from './InsightPanel';
import JobMatchPanel from './JobMatchPanel';
import SpotlightPanel from './SpotlightPanel';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ContentPanelProps {
  panelState: PanelState;
  currentAction: PanelAction | null;
  onActionConsumed: () => void;
  onAnimationComplete: (identity?: PanelIdentity) => void;
  onClose: () => void;
  onNavigate?: (panelState: Partial<PanelState>) => void;
  onPrefillChat?: (text: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Panel title helper                                                 */
/* ------------------------------------------------------------------ */

function panelTitle(type: PanelState['type'], state?: PanelState): string {
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
    case 'tech-radar':
      return 'Tech Radar';
    case 'quick-facts':
      return 'Quick Facts';
    case 'recommendations':
      return 'Recommendations';
    case 'game': {
      const game = state?.game;
      if (game === 'snake') return 'Snake';
      if (game === '2048') return '2048';
      return 'Game';
    }
    case 'insight':
      return state?.insightTitle || 'Insight';
    case 'job-match':
      return 'Job Match';
    case 'spotlight':
      return 'Spotlight';
    default:
      return '';
  }
}

/* ------------------------------------------------------------------ */
/*  Spring animation config                                            */
/* ------------------------------------------------------------------ */

const pendingPanels: Record<string, NonNullable<PanelState['type']>> = {
  show_project: 'project', show_projects: 'projects', show_skills: 'skills', show_contact: 'contact',
  show_timeline: 'timeline', show_gallery: 'gallery', compare_projects: 'comparison',
  show_resume: 'resume', show_tech_radar: 'tech-radar', show_quick_facts: 'quick-facts',
  show_recommendations: 'recommendations', play_game: 'game', show_insight: 'insight',
  match_job: 'job-match', show_spotlight: 'spotlight',
};

class PanelRecovery extends Component<{ children: ReactNode; onReturn: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="space-y-3 rounded-xl border border-gray-300 p-5 dark:border-gray-700"><h3 className="font-semibold">This panel could not be displayed</h3><p className="text-sm">Try opening it again, or return to projects.</p><button type="button" className="underline" onClick={() => this.setState({ failed: false })}>Try again</button><button type="button" className="ml-4 underline" onClick={this.props.onReturn}>Show projects</button></div>;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ContentPanel({
  panelState,
  currentAction,
  onActionConsumed,
  onAnimationComplete,
  onClose,
  onNavigate,
  onPrefillChat,
}: ContentPanelProps) {
  const context = useConversationContext();
  const still = useReducedMotion();
  const provisionalType = context.enabled && context.pendingTool && context.pendingTool.generation >= (context.panelIdentity?.generation ?? 0) && pendingPanels[context.pendingTool.name] === context.pendingTool.panelType ? pendingPanels[context.pendingTool.name] : undefined;
  const provisional = !!provisionalType;
  const { slug, slug2, category } = panelState;
  const type = provisionalType || panelState.type;
  const open = panelState.open || provisional;
  const scrollRef = useRef<HTMLDivElement>(null);
  const returnContext = useRef<{ state: PanelState; top: number; focusId: string } | null>(null);
  const restoreSource = useRef(false);
  const lastPanel = useRef('');
  const externalFocus = useRef<HTMLElement | null>(null);
  const latestIdentity = useRef(context.panelIdentity);
  const readinessCallback = useRef(onAnimationComplete);
  readinessCallback.current = onAnimationComplete;
  const readyKey = useRef('');
  const galleryReturn = useRef<{ slug: string; index: number; top: number } | null>(null);
  latestIdentity.current = context.panelIdentity;
  const identityKey = context.enabled ? JSON.stringify([context.panelIdentity, type, slug]) : type + ':' + slug;
  const returnToProjects = useCallback(() => {
    if (returnContext.current) {
      restoreSource.current = true;
      onNavigate?.({ ...returnContext.current.state, slug: returnContext.current.state.slug });
    } else onNavigate?.({ open: true, type: 'projects', slug: undefined, filter: undefined, skillId: undefined });
  }, [onNavigate]);
  const openProject = useCallback((projectSlug: string) => {
    returnContext.current = { state: { ...panelState }, top: scrollRef.current?.scrollTop || 0, focusId: type === 'projects' ? 'project-source-' + projectSlug : (document.activeElement as HTMLElement)?.id || '' };
    onNavigate?.({ open: true, type: 'project', slug: projectSlug });
  }, [onNavigate, panelState, type]);

  useLayoutEffect(() => {
    const key = type + ':' + slug;
    if (lastPanel.current === key) return;
    lastPanel.current = key;
    if (restoreSource.current && returnContext.current && type === returnContext.current.state.type) {
      if (scrollRef.current) scrollRef.current.scrollTop = returnContext.current.top;
      document.getElementById(returnContext.current.focusId)?.focus({ preventScroll: true });
      restoreSource.current = false;
    } else if (type === 'project' && galleryReturn.current && galleryReturn.current.slug === slug) {
      if (scrollRef.current) scrollRef.current.scrollTop = galleryReturn.current.top;
      document.getElementById('project-screenshot-' + slug + '-' + galleryReturn.current.index)?.focus({ preventScroll: true });
      galleryReturn.current = null;
    } else if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [type, slug]);
  useEffect(() => {
    if (!open) return;
    externalFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => { externalFocus.current?.focus({ preventScroll: true }); };
  }, [open]);
  useEffect(() => {
    if (!open || provisional || !context.enabled) return;
    const identity = context.panelIdentity;
    if (!identity || identity.type !== type || (identity.slug || '') !== (slug || '')) return;
    const timer = setTimeout(() => {
      const current = latestIdentity.current;
      const key = JSON.stringify(identity);
      if (current?.generation === identity.generation && current.type === identity.type && current.slug === identity.slug && readyKey.current !== key) {
        readyKey.current = key;
        readinessCallback.current(identity);
      }
    }, still ? 0 : DURATION_MS.morphLand + DURATION_MS.settle);
    return () => clearTimeout(timer);
  }, [open, provisional, context.enabled, identityKey, type, slug, still]);

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

  const highlightedSkillForRadar = useMemo(() => {
    if (!currentAction) return null;
    if (type === 'tech-radar' && currentAction.type === 'highlight_skill') {
      return currentAction.name;
    }
    return null;
  }, [currentAction, type]);

  const radarFocusCategory = useMemo(() => {
    if (type !== 'tech-radar' || !currentAction) return null;
    if (currentAction.type === 'focus_radar_section') return currentAction.category;
    return null;
  }, [type, currentAction]);

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
  useEffect(() => {
    if (type === 'gallery' && focusScreenshotIndex != null) {
      setGalleryFocusIndex(focusScreenshotIndex);
    }
  }, [type, focusScreenshotIndex]);

  /* Recommendation highlight ---------------------------------------- */
  const highlightedRecommendation = useMemo(() => {
    if (!currentAction) return null;
    if (type === 'recommendations' && currentAction.type === 'highlight_recommendation') {
      return currentAction.name;
    }
    return null;
  }, [currentAction, type]);

  // Discard actions that don't match the current panel type so the queue
  // doesn't get stuck waiting for onActionConsumed that never fires.
  useEffect(() => {
    if (!currentAction) return;
    const actionMatchesPanel =
      timelineAction !== null ||
      projectsTimelineAction !== null ||
      highlightedSkill !== null ||
      highlightedSkillForRadar !== null ||
      radarFocusCategory !== null ||
      projectHighlightField !== null ||
      focusScreenshotIndex !== null ||
      highlightedRecommendation !== null;
    if (!actionMatchesPanel) {
      onActionConsumed();
    }
  }, [currentAction, timelineAction, projectsTimelineAction, highlightedSkill, highlightedSkillForRadar, radarFocusCategory, projectHighlightField, focusScreenshotIndex, highlightedRecommendation, onActionConsumed]);

  const handleGalleryFocusConsumed = useCallback(() => {
    setGalleryFocusIndex(null);
    onActionConsumed();
  }, [onActionConsumed]);

  const handleSkillHighlightConsumed = useCallback(() => {
    onActionConsumed();
  }, [onActionConsumed]);

  /* Open gallery when a screenshot is clicked in ProjectCard -------- */
  const handleScreenshotClick = useCallback((projectSlug: string, index: number) => {
    galleryReturn.current = { slug: projectSlug, index, top: scrollRef.current?.scrollTop || 0 };
    onNavigate?.({ open: true, type: 'gallery', slug: projectSlug });
    setGalleryFocusIndex(index);
  }, [onNavigate]);

  /* Render panel content ------------------------------------------- */
  function renderContent() {
    if (provisional) return <div role="status" aria-live="polite" className="rounded-[14px_22px_14px_22px] border border-gray-200 p-6 dark:border-gray-800"><p className="font-medium">{context.requestStatus === 'error' || context.requestStatus === 'complete' ? 'This panel could not be loaded.' : 'Loading ' + panelTitle(type).toLowerCase() + '…'}</p><p className="mt-2 text-sm text-gray-500">You can keep reading the conversation.</p><button type="button" onClick={returnToProjects} className="mt-4 underline">Show projects</button></div>;
    switch (type) {
      case 'project':
        return slug ? (
          <ProjectCard
            slug={slug}
            highlightField={projectHighlightField}
            onScreenshotClick={handleScreenshotClick}
          />
        ) : <p role="status">Choose a project. <button type="button" className="underline" onClick={returnToProjects}>Show projects</button></p>;

      case 'projects':
        return (
          <ProjectsTimeline
            currentAction={projectsTimelineAction}
            onActionConsumed={onActionConsumed}
            onProjectOpen={openProject}
            onClearFilter={() => onNavigate?.({ open: true, type: 'projects', filter: undefined, skillId: undefined })}
            filter={panelState.filter}
            skillId={panelState.skillId}
          />
        );

      case 'skills':
        return (
          <SkillsGrid
            onProjectOpen={openProject}
            category={category}
            highlightedSkill={highlightedSkill}
            onHighlightConsumed={handleSkillHighlightConsumed}
            onSkillClick={(name) => onPrefillChat?.(`Tell me about ${name} `)}
          />
        );

      case 'contact':
        return <ContactCard />;

      case 'timeline':
        return (
          <Timeline
            onProjectOpen={openProject}
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
            onClose={handleGalleryClose}
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
                onScreenshotClick={handleScreenshotClick}
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
                  onScreenshotClick={handleScreenshotClick}
                />
              </div>
            )}
          </div>
        );

      case 'tech-radar':
        return (
          <TechRadar
            onProjectOpen={openProject}
            highlightedSkill={highlightedSkillForRadar}
            focusCategory={radarFocusCategory}
            onActionConsumed={onActionConsumed}
          />
        );

      case 'resume':
        return <ResumePanel />;

      case 'quick-facts':
        return <QuickFacts />;

      case 'spotlight':
        return <SpotlightPanel />;

      case 'recommendations':
        return (
          <Recommendations
            highlightedName={highlightedRecommendation}
            onActionConsumed={onActionConsumed}
          />
        );

      case 'insight':
        return (
          <InsightPanel
            topic={panelState.insightTopic || ''}
            intent={panelState.insightIntent || ''}
            visitorContext={panelState.insightVisitorContext}
            language={panelState.insightLanguage || 'en'}
            onNavigate={onNavigate}
          />
        );

      case 'job-match':
        return (
          <JobMatchPanel
            role={panelState.jobRole || ''}
            company={panelState.jobCompany || ''}
            description={panelState.jobDescription || ''}
            onNavigate={onNavigate}
          />
        );

      case 'game': {
        const game = panelState?.game;
        if (game === 'snake') return <SnakeGame />;
        if (game === '2048') return <Game2048 />;
        return null;
      }

      default:
        return null;
    }
  }

  /* Gallery renders as a fullscreen modal, not inside the panel ----- */
  const handleGalleryClose = useCallback(() => {
    if (slug) {
      onNavigate?.({ open: true, type: 'project', slug });
    } else {
      onClose();
    }
  }, [slug, onNavigate, onClose]);

  if (type === 'gallery' && open && !provisional) {
    return (
      <AnimatePresence>
        {slug && (
          <Gallery
            slug={slug}
            focusIndex={galleryFocusIndex}
            onFocusConsumed={handleGalleryFocusConsumed}
            onClose={handleGalleryClose}
          />
        )}
      </AnimatePresence>
    );
  }

  /* Animation direction based on viewport size ---------------------- */
  // Desktop: slide in from the left.  Mobile: slide up from the bottom.
  const panelInitial = isDesktop
    ? (context.enabled ? { opacity: 0 } : { x: '-100%', opacity: 0 })
    : (context.enabled ? { opacity: 0 } : { y: '100%', opacity: 0 });

  const panelAnimate = isDesktop
    ? { x: 0, opacity: 1 }
    : { y: 0, opacity: 1 };

  const panelExit = isDesktop
    ? (context.enabled ? { opacity: 0 } : { x: '-100%', opacity: 0 })
    : (context.enabled ? { opacity: 0 } : { y: '100%', opacity: 0 });

  return (
    <LayoutGroup id="portfolio-panel">
      {/* Panel */}
      <AnimatePresence>
        {open && type && (
          <motion.div
            key={context.enabled ? 'living-panel' : type}
            initial={still ? false : panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={still ? reducedMotionCrossfade : brandSpring}
            onAnimationComplete={(definition) => {
              if (typeof definition === 'object' && definition !== null) {
                const def = definition as Record<string, unknown>;
                if (
                  ('x' in def && (def.x === 0 || def.x === '0%')) ||
                  ('y' in def && (def.y === 0 || def.y === '0%'))
                ) {
                  if (!context.enabled) onAnimationComplete();
                }
              }
            }}
            role="region"
            aria-label={panelTitle(type, panelState)}
            data-print-content
            className={
              isDesktop
                ? 'fixed left-0 top-0 h-full w-[calc(100vw-500px)] bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 shadow-2xl z-40'
                : 'fixed inset-0 w-screen bg-white dark:bg-black z-50'
            }
          >
            {/* Separate scroll container so transform from Framer Motion doesn't kill scroll */}
            <motion.div ref={scrollRef} layoutScroll data-panel-scroll className={`h-full ${type === 'tech-radar' ? 'flex flex-col' : 'overflow-y-auto'}`}>
            <div className={`${type === 'tech-radar' ? 'flex flex-col flex-1 min-h-0' : ''} p-4 md:p-6`}>
              {/* Header (hidden when printing) */}
              <div className="flex justify-between items-center mb-4 md:mb-6 print:hidden shrink-0">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  {panelTitle(type, panelState)}
                </h2>
              </div>

              {context.enabled && <div className="mb-4 flex gap-4 text-sm"><button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500 dark:border-gray-700">Close panel</button>{type === 'project' && <button type="button" onClick={returnToProjects} className="underline">Back to {returnContext.current ? panelTitle(returnContext.current.state.type).toLowerCase() : 'projects'}</button>}</div>}
              {/* Content */}
              <div className={type === 'tech-radar' ? 'flex-1 min-h-0' : ''}><PanelRecovery key={identityKey} onReturn={returnToProjects}>{renderContent()}</PanelRecovery></div>

              {/* Extra space so last content can scroll to center of viewport */}
              {type !== 'tech-radar' && <div className="h-[50vh]" />}
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
