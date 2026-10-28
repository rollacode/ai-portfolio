'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePortfolioData } from '../../context/PortfolioDataContext';
import { useConversationContext } from '../../context/ConversationContext';
import { brandSpring, liquidSettle, hoverSwell, press, reducedMotionCrossfade } from '../../lib/motion';
import ProjectLoop from './ProjectLoop';
import type { Spotlight } from '../../types/portfolio';

const THRESHOLD = 'M8 8H32C46 8 56 18 56 32S46 56 32 56H24L40 40V24H24V40L8 56Z';

function Reveal({ index, children, className }: { index: number; children: React.ReactNode; className?: string }) {
  const still = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={still ? reducedMotionCrossfade : liquidSettle}
    >
      {children}
    </motion.div>
  );
}

function LiquidLink({ href, primary, children }: { href: string; primary?: boolean; children: React.ReactNode }) {
  const still = useReducedMotion();
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={still ? {} : { y: -2, transition: hoverSwell }}
      whileTap={still ? {} : { scale: 0.98, transition: press }}
      transition={hoverSwell}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] border px-4 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-500 ${
        primary
          ? 'border-lime-600 bg-lime-600 text-white dark:border-lime-400 dark:bg-lime-400 dark:text-black'
          : 'border-gray-300 bg-white text-gray-900 hover:border-lime-500/60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
      }`}
    >
      {children}
    </motion.a>
  );
}

function Trailer({ video, name, loop }: { video: NonNullable<Spotlight['video']>; name: string; loop?: Spotlight['loop'] }) {
  const { enabled, panelIdentity } = useConversationContext();
  const still = useReducedMotion();
  const give = brandSpring;
  const ref = useRef<HTMLVideoElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!expanded || !element) return;
    element.focus();
    void element.play().catch(() => { /* Native controls remain available. */ });
    const visibility = () => { if (document.visibilityState !== 'visible') element.pause(); };
    document.addEventListener('visibilitychange', visibility);
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) element.pause(); });
    observer.observe(element);
    return () => { element.pause(); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, [expanded]);
  const close = () => { setExpanded(false); setFailed(false); requestAnimationFrame(() => opener.current?.focus({ preventScroll: true })); };
  return (
    <div className="space-y-3">
      {!expanded ? <div className="relative">
        <ProjectLoop active={!panelIdentity || panelIdentity.type === 'spotlight'} media={enabled ? loop : undefined} fallback={video.poster} alt={name + ' product demonstration'} />
        {/* The trailer invitation rests on the loop itself: a quiet glass pill, the play mark swelling on hover. */}
        <motion.button ref={opener} type="button" onClick={() => setExpanded(true)}
          whileHover={still ? undefined : { y: -2 }} whileTap={still ? undefined : { scaleX: 0.965, scaleY: 0.95 }} transition={give}
          className="group/trailer absolute bottom-4 left-4 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/45 py-1.5 pl-1.5 pr-4 text-sm font-medium text-white backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-400">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-400 text-black transition-transform duration-[380ms] [transition-timing-function:cubic-bezier(.3,1.6,.4,1)] group-hover/trailer:scale-110">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="ml-0.5 h-3 w-3"><path d="M4.5 2.8v10.4L13 8z" fill="currentColor" /></svg>
          </span>
          Watch the trailer
        </motion.button>
      </div> : <div className="space-y-3" onKeyDown={e => { if (e.key === 'Escape') close(); }}>
        <video ref={ref} tabIndex={0} controls playsInline preload="none" poster={video.poster} aria-label={name + ' full trailer'} className="aspect-video w-full rounded-[14px_22px_14px_22px] bg-black" onError={() => setFailed(true)}>
          {/* The smaller WebM first; Safari falls back to the MP4. */}
          {video.webm && <source src={video.webm} type="video/webm" />}
          <source src={video.mp4} type="video/mp4" />
        </video>
        {failed && <p role="status">The trailer is unavailable. You can return to the preview.</p>}
        <button type="button" onClick={close} className="group/back -ml-2 inline-flex min-h-8 items-center gap-1.5 rounded-full px-2 text-xs text-gray-500 transition-colors hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500 dark:hover:text-gray-100"><svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-[380ms] [transition-timing-function:cubic-bezier(.3,1.6,.4,1)] group-hover/back:-translate-x-0.5"><path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>Back to the preview</button>
      </div>}
    </div>
  );
}

export default function SpotlightPanel() {
  const { config } = usePortfolioData();
  const still = useReducedMotion();
  const spotlight = config.spotlight;
  if (!spotlight) return <p role="status">No spotlight is available. Explore the projects instead.</p>;
  const { name, tagline, summary, video, loop, proof, differences, capabilities, openSource, links } = spotlight;
  let step = 0;

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-10">
      <Reveal index={step++} className="flex items-center gap-4">
        <motion.svg
          viewBox="0 0 64 64"
          className="h-14 w-14 shrink-0 text-lime-600 dark:text-lime-400"
          aria-hidden="true"
          initial={false}
          animate={{ scale: 1 }}
          whileHover={still ? {} : { scale: 1.03, transition: hoverSwell }}
          whileTap={still ? {} : { scale: 0.98, transition: press }}
          transition={hoverSwell}
        >
          <path d={THRESHOLD} fill="currentColor" fillRule="evenodd" />
        </motion.svg>
        <div className="min-w-0">
          <h2 className="text-4xl font-medium tracking-[-0.045em] text-gray-950 dark:text-gray-50 md:text-5xl">{name}</h2>
          <p className="mt-1 text-lg tracking-tight text-lime-600 dark:text-lime-400">{tagline}</p>
        </div>
      </Reveal>

      {video && (
        <Reveal index={step++}>
          <Trailer video={video} name={name} loop={loop} />
        </Reveal>
      )}

      <Reveal index={step++}>
        <p className="max-w-2xl text-[17px] leading-relaxed text-gray-600 dark:text-gray-400">{summary}</p>
      </Reveal>

      {proof && (
        <Reveal index={step++}>
          <figure className="relative pl-6">
            <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-gradient-to-b from-lime-400 to-lime-600" aria-hidden="true" />
            <blockquote className="text-2xl font-medium leading-snug tracking-[-0.03em] text-gray-950 dark:text-gray-50 md:text-[28px]">{proof.title}</blockquote>
            <figcaption className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{proof.body}</figcaption>
          </figure>
        </Reveal>
      )}

      {differences.length > 0 && (
        <Reveal index={step++} className="space-y-4">
          <h3 className="text-2xl font-medium tracking-[-0.03em] text-gray-950 dark:text-gray-50">What makes it different</h3>
          <ul className="space-y-3">
            {differences.map((item) => (
              <li key={item.title} className="border-l-2 border-lime-500/60 pl-4">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{item.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {capabilities.length > 0 && (
        <Reveal index={step++} className="space-y-4">
          <h3 className="text-2xl font-medium tracking-[-0.03em] text-gray-950 dark:text-gray-50">What it can do today</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {capabilities.map((item) => (
              <motion.div
                key={item.title}
                whileHover={still ? {} : { y: -3, transition: hoverSwell }}
                transition={hoverSwell}
                className="rounded-[14px_18px_14px_18px] border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <p className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </Reveal>
      )}

      <Reveal index={step++}>
        <div className="rounded-[18px_24px_18px_24px] border border-lime-500/40 bg-lime-500/10 p-6">
          {openSource && <p className="text-[15px] leading-relaxed text-gray-800 dark:text-gray-200">{openSource}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            {links.download && <LiquidLink href={links.download} primary>Download {name}</LiquidLink>}
            {links.source && <LiquidLink href={links.source}>Read the source</LiquidLink>}
            <LiquidLink href={links.website}>{links.website.replace(/^https?:\/\//, '')}</LiquidLink>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
