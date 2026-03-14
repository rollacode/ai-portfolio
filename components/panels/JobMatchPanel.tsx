'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useJobMatchStream } from '@/hooks/useJobMatchStream';
import type { PanelState } from '@/lib/tool-handler';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface JobMatchPanelProps {
  role: string;
  company: string;
  description: string;
  language?: string;
  onNavigate?: (panelState: Partial<PanelState>) => void;
}

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const sectionVariants = (delay = 0) => ({
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, delay } },
});

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 dark:bg-white/10 ${className}`} />
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-[100px] w-[100px] rounded-full shrink-0" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-6 w-20 rounded-full" />)}
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Match ring                                                         */
/* ------------------------------------------------------------------ */

function MatchRing({ percent, boosted }: { percent: number; boosted?: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const baseOffset = circ - (percent / 100) * circ;
  const boostExtra = boosted ? boosted - percent : 0;
  const boostArc = (boostExtra / 100) * circ;
  const boostStart = (percent / 100) * circ;
  const color = percent >= 85 ? '#84cc16' : percent >= 70 ? '#eab308' : '#f97316';

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* Track */}
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke="currentColor"
          className="text-gray-200 dark:text-white/10"
          strokeWidth="6"
        />
        {/* Base match arc */}
        <motion.circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ}
          animate={{ strokeDashoffset: baseOffset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          transform="rotate(-90 50 50)"
        />
        {/* AI boost arc — continues where base ends, different color */}
        {boosted && boostExtra > 0 && (
          <motion.circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="#84cc16"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${boostArc} ${circ - boostArc}`}
            strokeDashoffset={circ}
            animate={{ strokeDashoffset: circ - boostStart }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 1.3 }}
            transform="rotate(-90 50 50)"
            opacity={0.5}
          />
        )}
        {/* Center text */}
        <text
          x="50" y={boosted ? "44" : "50"}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-gray-900 dark:fill-gray-50 font-semibold"
          style={{ fontSize: '17px' }}
        >
          {percent}%
        </text>
        {boosted && boostExtra > 0 && (
          <text
            x="50" y="59"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-lime-600 dark:fill-lime-400 font-medium"
            style={{ fontSize: '10px' }}
          >
            +{boostExtra}% AI
          </text>
        )}
      </svg>
      <div className="text-center leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
          match
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Streaming cursor                                                   */
/* ------------------------------------------------------------------ */

function StreamCursor() {
  return (
    <motion.span
      className="inline-block w-1.5 h-3.5 bg-lime-500 ml-0.5 align-middle"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.6, repeat: Infinity }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function JobMatchPanel({
  role,
  company,
  description,
  language,
  onNavigate,
}: JobMatchPanelProps) {
  const data = useJobMatchStream({ role, company, description, language });

  if (!data.hasParsedContent && data.isLoading) {
    return <SkeletonLoader />;
  }

  if (data.error) {
    return (
      <p className="text-sm text-red-500 dark:text-red-400">{data.error}</p>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      <div className="space-y-5">
        {/* Header: role + company + ring */}
        {(data.role || data.matchPercent) && (
          <motion.div
            key="header"
            variants={sectionVariants()}
            initial="hidden"
            animate="show"
            className="flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50 leading-tight">
                {data.role || role}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                {data.company || company}
              </p>
            </div>
            {data.matchPercent != null && (
              <MatchRing percent={data.matchPercent} boosted={data.boostedPercent ?? undefined} />
            )}
          </motion.div>
        )}

        {/* Summary */}
        {data.summary && (
          <motion.p
            key="summary"
            variants={sectionVariants(0.05)}
            initial="hidden"
            animate="show"
            className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
          >
            {data.summary}
            {data.streamingSection === 'summary' && <StreamCursor />}
          </motion.p>
        )}

        {/* Matched skills */}
        {data.matchedSkills.length > 0 && (
          <motion.div
            key="skills"
            variants={sectionVariants(0.1)}
            initial="hidden"
            animate="show"
          >
            <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              Matched Skills
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {data.matchedSkills.map((s) => (
                <span
                  key={s.name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-lime-500/10 text-lime-700 dark:text-lime-400 border border-lime-500/20"
                >
                  {s.name}
                  {s.years && (
                    <span className="text-[10px] text-lime-600/60 dark:text-lime-400/50">
                      {s.years}y
                    </span>
                  )}
                </span>
              ))}
              {data.streamingSection === 'skills' && <StreamCursor />}
            </div>
          </motion.div>
        )}

        {/* Relevant experience */}
        {data.relevantExperience.length > 0 && (
          <motion.div
            key="experience"
            variants={sectionVariants(0.15)}
            initial="hidden"
            animate="show"
          >
            <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              Relevant Experience
            </h3>
            <div className="space-y-2">
              {data.relevantExperience.map((e) => (
                <div
                  key={e.company}
                  className="rounded-lg bg-gray-100/80 dark:bg-white/[0.06] p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {e.company}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
                      {e.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {e.relevance}
                  </p>
                </div>
              ))}
              {data.streamingSection === 'experience' && <StreamCursor />}
            </div>
          </motion.div>
        )}

        {/* Relevant projects */}
        {data.relevantProjects.length > 0 && (
          <motion.div
            key="projects"
            variants={sectionVariants(0.2)}
            initial="hidden"
            animate="show"
          >
            <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              Relevant Projects
            </h3>
            <div className="space-y-2">
              {data.relevantProjects.map((p) => (
                <button
                  key={p.slug}
                  onClick={() =>
                    onNavigate?.({ open: true, type: 'project', slug: p.slug })
                  }
                  className="w-full text-left rounded-lg bg-gray-100/80 dark:bg-white/[0.06] p-3 hover:bg-gray-200/70 dark:hover:bg-white/[0.1] transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {p.name}
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                    {p.relevance}
                  </p>
                </button>
              ))}
              {data.streamingSection === 'projects' && <StreamCursor />}
            </div>
          </motion.div>
        )}

        {/* Social proof */}
        {data.socialProof.length > 0 && (
          <motion.div
            key="social-proof"
            variants={sectionVariants(0.25)}
            initial="hidden"
            animate="show"
          >
            <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              What Colleagues Say
            </h3>
            <div className="space-y-2">
              {data.socialProof.map((sp) => (
                <div
                  key={sp.author}
                  className="rounded-lg bg-gray-100/80 dark:bg-white/[0.06] p-3 border-l-2 border-lime-500/40"
                >
                  <p className="text-xs text-gray-600 dark:text-gray-300 italic leading-relaxed">
                    &ldquo;{sp.quote}&rdquo;
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                    {sp.author} &middot; {sp.context}
                  </p>
                </div>
              ))}
              {data.streamingSection === 'social_proof' && <StreamCursor />}
            </div>
          </motion.div>
        )}

        {/* Gaps */}
        {data.gaps.length > 0 && (
          <motion.div
            key="gaps"
            variants={sectionVariants(0.3)}
            initial="hidden"
            animate="show"
          >
            <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              Notes
            </h3>
            <ul className="space-y-1.5">
              {data.gaps.map((g, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300"
                >
                  <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-lime-500" />
                  {g}
                </li>
              ))}
              {data.streamingSection === 'gaps' && <StreamCursor />}
            </ul>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}
