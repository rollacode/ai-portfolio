'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePortfolioData } from '../../context/PortfolioDataContext';
import type { Spotlight } from '../../types/portfolio';

// The Domios brand spring: mass 1, stiffness 420, damping 22.
const give = { type: 'spring' as const, stiffness: 420, damping: 22, mass: 1 };
const settle = { type: 'spring' as const, stiffness: 220, damping: 26 };

const THRESHOLD = 'M8 8H32C46 8 56 18 56 32S46 56 32 56H24L40 40V24H24V40L8 56Z';

function Reveal({ index, children, className }: { index: number; children: React.ReactNode; className?: string }) {
  const still = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={still ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...settle, delay: still ? 0 : 0.08 + index * 0.07 }}
    >
      {children}
    </motion.div>
  );
}

function LiquidLink({ href, primary, children }: { href: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ y: -2, scaleX: 1.035, scaleY: 1.02 }}
      whileTap={{ scaleX: 0.965, scaleY: 0.95 }}
      transition={give}
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

function Trailer({ video, name }: { video: NonNullable<Spotlight['video']>; name: string }) {
  const still = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    // A silent trailer starts on its own; with reduced motion it waits for the visitor.
    if (!still) void ref.current?.play().catch(() => {});
  }, [still]);
  return (
    <div className="relative overflow-hidden border border-gray-200 bg-gray-950 shadow-[0_20px_70px_rgba(11,16,22,0.18)] dark:border-gray-800 rounded-[18px_24px_18px_24px]">
      <video
        ref={ref}
        className="block aspect-video w-full object-cover"
        poster={video.poster}
        muted
        loop
        playsInline
        controls={playing || !!still}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        aria-label={`${name} trailer`}
      >
        <source src={video.mp4} type="video/mp4" />
        {video.webm && <source src={video.webm} type="video/webm" />}
      </video>
    </div>
  );
}

export default function SpotlightPanel() {
  const { config } = usePortfolioData();
  const spotlight = config.spotlight;
  if (!spotlight) return null;
  const { name, tagline, summary, video, proof, differences, capabilities, openSource, links } = spotlight;
  let step = 0;

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-10">
      <Reveal index={step++} className="flex items-center gap-4">
        <motion.svg
          viewBox="0 0 64 64"
          className="h-14 w-14 shrink-0 text-lime-600 dark:text-lime-400"
          aria-hidden="true"
          initial={{ scale: 0.6, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ scaleX: 1.08, scaleY: 0.94 }}
          whileTap={{ scaleX: 0.92, scaleY: 1.06 }}
          transition={give}
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
          <Trailer video={video} name={name} />
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
                whileHover={{ y: -3 }}
                transition={give}
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
