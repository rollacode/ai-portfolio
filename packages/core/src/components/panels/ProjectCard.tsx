'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion, animate } from 'framer-motion';
import { usePortfolioData } from '../../context/PortfolioDataContext';
import { useConversationContext } from '../../context/ConversationContext';
import { brandSpring, liquidSettle, hoverSwell, press, reducedMotionCrossfade, DURATION_MS, morphSpring } from '../../lib/motion';
import type { ProjectLoopMedia } from '../../types/portfolio';
import ProjectLoop from './ProjectLoop';
import DeviceStrip from './DeviceStrip';

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
  phones?: string[];
  phoneFrame?: boolean;
}

type HighlightField = 'stack' | 'highlights' | 'description' | 'links' | null;

interface ProjectCardProps {
  slug: string;
  immersive?: boolean;
  onClose?: () => void;
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

/** Wrapper that adds a temporary focus ring when `active` is true. */
function HighlightSection({
  active,
  children,
  className = '',
}: {
  active: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const still = useReducedMotion();
  return (
    <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: still ? { duration: 0 } : liquidSettle } }}
      className={`rounded-lg transition-all duration-[380ms] motion-reduce:duration-0 ${
        active
          ? 'ring-2 ring-lime-400/80'
          : ''
      } ${className}`}
    >
      {children}
    </motion.div>
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

function DetailClose({ onClose }: { onClose: () => void }) {
  const still = useReducedMotion();
  return <motion.button type="button" aria-label="Close panel" onClick={onClose}
    whileHover={still ? {} : { scale: 1.03, transition: hoverSwell }} whileTap={still ? {} : { scale: .97, transition: press }}
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-900/10 text-gray-500 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 dark:border-gray-100/10 dark:hover:bg-gray-900">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
  </motion.button>;
}

function LivingProjectDetail({ project, highlightField, onScreenshotClick, onClose, active }: {
  project: ProjectData; highlightField: HighlightField; onScreenshotClick?: (slug: string, index: number) => void; onClose?: () => void; active: boolean;
}) {
  const still = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [landed, setLanded] = useState(!!still);
  const metrics = sourcedMetrics(project.highlights);
  useEffect(() => {
    if (still) { setLanded(true); return; }
    const timer = setTimeout(() => setLanded(true), DURATION_MS.morphLand);
    return () => clearTimeout(timer);
  }, [project.slug, still]);
  const linked = Object.entries(project.links);
  const primaryLink = project.links.appStore ? 'appStore' : project.links.website ? 'website' : linked[0]?.[0];
  const phoneScreens = (project.phones ?? []).map(src => ({ src, index: project.screenshots.indexOf(src) })).filter(screen => screen.index >= 0);
  const filmstrip = project.screenshots.map((src, index) => ({ src, index })).filter(item => project.loop || phoneScreens.length > 0 || item.index !== 0);
  const arrival = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: still ? { duration: 0 } : liquidSettle } };
  const [title, ...rest] = project.name.split(' - ');
  const subtitle = rest.join(' - ');
  return <article data-project-slug={project.slug} className="space-y-6 pb-8">
    <header className="relative">
      <div className="flex items-start justify-between gap-4">
        {/* Who and when, as one quiet pill, the way domios.dev introduces itself. */}
        <p className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-gray-900/10 bg-white/60 px-3 py-1.5 font-mono text-[10px] tracking-[0.06em] text-gray-500 backdrop-blur dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime-500" aria-hidden="true" />
          <span className="truncate">{project.period}</span>
          {project.role && <><span className="h-3 w-px shrink-0 bg-gray-900/10 dark:bg-white/10" aria-hidden="true" /><span className="truncate text-gray-700 dark:text-gray-300">{project.role}</span></>}
        </p>
        {onClose && <DetailClose onClose={onClose} />}
      </div>
      <motion.h1 layoutId={!still ? 'project-title-' + project.slug : undefined} transition={morphSpring} className="mt-5 text-[clamp(30px,3.6vw,46px)] font-medium leading-[1.08] tracking-[-0.045em] text-gray-950 [text-wrap:balance] dark:text-gray-50">
        {title}{subtitle && <span className="block text-lime-600 dark:text-lime-400">{subtitle}</span>}
      </motion.h1>
    </header>

    {/* The media stands on a stage: the Domios dot field with a soft accent light, so the work is presented, not pasted. */}
    <div className="relative -mx-2 overflow-hidden rounded-[22px_28px_22px_28px] px-2 py-2 md:-mx-4 md:px-4 md:py-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,rgba(127,140,155,0.28)_1px,transparent_1.4px)] [background-size:18px_18px] [mask-image:radial-gradient(60%_70%_at_50%_50%,#000,transparent_78%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-500/10 blur-3xl" />
      <div className="relative">
    {phoneScreens.length > 0 ? <DeviceStrip screens={phoneScreens} framed={project.phoneFrame !== false} label={project.name + ' screens'} onOpen={index => onScreenshotClick?.(project.slug, index)} /> :
    project.loop ? <div className="mx-auto max-w-2xl shadow-[0_30px_60px_-30px_rgba(11,16,22,0.55)] rounded-[18px_24px_18px_24px]"><ProjectLoop media={project.loop} layoutId={!still ? 'project-media-' + project.slug : undefined} alt={project.name + ' product preview'} active={active && landed} /></div> :
      project.screenshots[0] && <motion.div layoutId={!still ? 'project-media-' + project.slug : undefined} transition={morphSpring} className="aspect-video overflow-hidden rounded-[18px_24px_18px_24px] bg-gray-100 dark:bg-gray-900">
        <button id={'project-screenshot-' + project.slug + '-0'} type="button" aria-label="Open project screenshots" onClick={() => onScreenshotClick?.(project.slug, 0)} className="relative block h-full w-full overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500">
          {/* Any aspect ratio fits whole: a phone screen sits contained over a soft, blurred wash of itself instead of being cropped. */}
          <img src={'/screenshots/' + project.screenshots[0]} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
          <motion.img src={'/screenshots/' + project.screenshots[0]} alt={project.name + ' product preview'} width={1280} height={720} className="relative h-full w-full object-contain p-4 drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)]" initial={still ? false : { scale: 1 }} animate={{ scale: 1.03 }} transition={still ? { duration: 0 } : { duration: 6, delay: (DURATION_MS.morphLand + DURATION_MS.settle + DURATION_MS.readingHold) / 1000, ease: 'linear' }} />
        </button>
      </motion.div>}
      </div>
    </div>

    <motion.div data-project-body className="space-y-7" initial={still ? false : 'hidden'} animate="visible" variants={{
      hidden: { opacity: 0 }, visible: { opacity: 1, transition: still ? { duration: 0 } : { ...liquidSettle, delay: DURATION_MS.morphLand / 1000, delayChildren: DURATION_MS.morphLand / 1000, staggerChildren: DURATION_MS.detailStagger / 1000 } }
    }}>
      {filmstrip.length > 0 && <motion.div variants={arrival} className="space-y-2">
        <div aria-label="Project screenshots" className="flex snap-x gap-3 overflow-x-auto pb-1">
          {filmstrip.map(({ src, index }) => <motion.button key={src} id={'project-screenshot-' + project.slug + '-' + index} type="button" aria-label={'Open screenshot ' + (index + 1)}
            onClick={() => onScreenshotClick?.(project.slug, index)} whileHover={still ? {} : { scale: 1.03, transition: hoverSwell }} whileTap={still ? {} : { scale: .98, transition: press }}
            className="h-28 shrink-0 snap-start overflow-hidden rounded-[10px_14px_10px_14px] border border-gray-900/10 bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 dark:border-gray-100/10 dark:bg-gray-900">
            {/* Each frame keeps its own shape: phone screens stay tall, desktop screens stay wide. */}
            <img src={'/screenshots/' + src} alt="" loading="lazy" className="h-full w-auto max-w-[14rem] object-contain" />
          </motion.button>)}
        </div>
        <button type="button" onClick={() => onScreenshotClick?.(project.slug, 0)} className="text-xs text-gray-500 transition-colors hover:text-lime-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500 dark:hover:text-lime-400">View all {project.screenshots.length} screenshots</button>
      </motion.div>}

      <HighlightSection active={highlightField === 'description'}><p className="text-[15px] leading-7 text-gray-700 dark:text-gray-300">{project.description}</p></HighlightSection>
      {metrics.length >= 2 && <motion.div variants={arrival} className="grid grid-cols-2 gap-4 sm:grid-cols-3" aria-label="Project at a glance">{metrics.map(metric => <Metric key={metric.source + metric.label} metric={metric} />)}</motion.div>}

      {project.stack.length > 0 && <HighlightSection active={highlightField === 'stack'}>
        <h2 className="mb-3 text-xs font-medium text-gray-500">Built with</h2>
        <div className="flex flex-wrap gap-2">{project.stack.map(tech => <span key={tech} className="rounded-full border border-gray-900/10 px-3 py-1.5 text-xs text-gray-600 transition-colors duration-[380ms] motion-reduce:duration-0 hover:border-lime-500/30 hover:text-lime-600 dark:border-gray-100/10 dark:text-gray-400 dark:hover:text-lime-400">{tech}</span>)}</div>
      </HighlightSection>}

      {project.highlights.length > 0 && <HighlightSection active={highlightField === 'highlights'}>
        <h2 className="mb-3 text-xs font-medium text-gray-500">Highlights</h2>
        <motion.ul variants={{ visible: { transition: still ? {} : { staggerChildren: DURATION_MS.detailStagger / 1000 } } }} className="space-y-3">
          {project.highlights.map(item => <motion.li key={item} variants={arrival} className="flex items-start gap-3 text-sm leading-6 text-gray-700 dark:text-gray-300"><span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" /><span>{item}</span></motion.li>)}
        </motion.ul>
      </HighlightSection>}

      {project.writeup && <motion.section variants={arrival} className="border-y border-gray-900/10 dark:border-gray-100/10">
        <button type="button" aria-expanded={expanded} aria-controls={'project-story-' + project.slug} onClick={() => setExpanded(!expanded)} className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-gray-800 transition-colors hover:text-lime-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500 dark:text-gray-200 dark:hover:text-lime-400">
          <span>{expanded ? 'Hide full writeup' : 'Read full writeup'}</span><span aria-hidden="true" className="text-lg font-normal text-gray-500">{expanded ? '−' : '+'}</span>
        </button>
        <AnimatePresence initial={false}>{expanded && <motion.div id={'project-story-' + project.slug} initial={still ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={still ? { duration: 0 } : liquidSettle} className="overflow-hidden"><div className="pb-6 pt-1"><WriteupBlock text={project.writeup} /></div></motion.div>}</AnimatePresence>
      </motion.section>}

      {linked.length > 0 && <HighlightSection active={highlightField === 'links'}>
        <div className="flex flex-wrap gap-3">{linked.map(([key, url]) => <motion.a key={key} href={url} target="_blank" rel="noopener noreferrer" whileHover={still ? {} : { scale: 1.02, transition: hoverSwell }} whileTap={still ? {} : { scale: .98, transition: press }}
          className={'inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px_14px_10px_14px] border px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 ' + (key === primaryLink ? 'border-gray-900/10 bg-gray-900 text-gray-50 dark:border-gray-100/10 dark:bg-gray-100 dark:text-gray-950' : 'border-gray-900/10 text-gray-600 hover:border-lime-500/30 dark:border-gray-100/10 dark:text-gray-400')}>
          {key === 'appStore' ? <svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="1.5" width="10" height="17" rx="2.5" /><path d="M8 15.5h4" /></svg> : <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 3h8v8M13 3 3 13" /></svg>}
          {linkLabels[key] || (key === 'github' ? 'GitHub' : key)}
        </motion.a>)}</div>
      </HighlightSection>}
    </motion.div>
  </article>;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProjectCard({
  slug,
  immersive = true,
  onClose,
  project: projectProp,
  highlightField: highlightFieldProp = null,
  onScreenshotClick,
}: ProjectCardProps) {
  const { projects } = usePortfolioData();
  const { enabled: optedIn, panelIdentity } = useConversationContext();
  const enabled = optedIn && immersive;
  const still = useReducedMotion();
  const [writeupExpanded, setWriteupExpanded] = useState(false);
  useEffect(() => { setWriteupExpanded(false); }, [slug]);
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

  if (enabled) return <LivingProjectDetail key={slug} project={project} highlightField={activeHighlight} onScreenshotClick={onScreenshotClick} onClose={onClose} active={!panelIdentity || panelIdentity.type === 'project' && panelIdentity.slug === slug} />;

  const hasHighlights = project.highlights.length > 0;
  const hasLinks = Object.keys(project.links).length > 0;
  const hasWriteup = !!(project as ProjectData & { writeup?: string }).writeup;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      transition={still ? reducedMotionCrossfade : liquidSettle}
      data-project-slug={slug}
      className="space-y-5 rounded-xl bg-gray-50 dark:bg-neutral-900 p-5 shadow-sm"
    >
      {/* Header ---------------------------------------------------- */}
      <div>
        <motion.h2 layoutId={enabled && !still ? 'project-title-' + slug : undefined} transition={morphSpring} className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</motion.h2>
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

      <motion.div data-project-body className="space-y-5" initial={enabled && !still ? 'hidden' : false} animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: still ? { duration: 0 } : { ...liquidSettle, delay: enabled ? DURATION_MS.morphLand / 1000 : 0, staggerChildren: enabled ? DURATION_MS.detailStagger / 1000 : 0, delayChildren: enabled ? DURATION_MS.morphLand / 1000 : 0 } } }}>
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
