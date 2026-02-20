'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  useInsightStream,
  type MetricsData,
  type ProjectRef,
  type QuoteData,
} from '@/hooks/useInsightStream';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface InsightPanelProps {
  topic: string;
  intent: string;
  visitorContext?: string;
  language?: string;
  onNavigate?: (panelState: Record<string, unknown>) => void;
}

/* ------------------------------------------------------------------ */
/*  Animation config                                                   */
/* ------------------------------------------------------------------ */

const spring = { type: 'spring' as const, damping: 25, stiffness: 200 };

function sectionVariants(index: number) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { ...spring, delay: index * 0.1 },
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                    */
/* ------------------------------------------------------------------ */

function Skeleton({ language = 'en' }: { language?: string }) {
  return (
    <div className="space-y-5">
      {/* Headline shimmer */}
      <div className="space-y-2 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-white/[0.08] rounded-lg w-4/5" />
      </div>

      {/* Metrics shimmer — 3 cards */}
      <div className="flex gap-3 animate-pulse" style={{ animationDelay: '150ms' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-xl px-4 py-4 bg-gray-100 dark:bg-white/[0.04]"
          >
            <div className="h-2 bg-gray-200 dark:bg-white/[0.08] rounded w-8 mx-auto mb-2" />
            <div className="h-5 bg-gray-200 dark:bg-white/[0.08] rounded w-10 mx-auto mb-1.5" />
            <div className="h-2 bg-gray-200 dark:bg-white/[0.08] rounded w-12 mx-auto" />
          </div>
        ))}
      </div>

      {/* Narrative shimmer — multiple text lines */}
      <div className="space-y-2.5 animate-pulse" style={{ animationDelay: '300ms' }}>
        <div className="h-3.5 bg-gray-200 dark:bg-white/[0.08] rounded w-full" />
        <div className="h-3.5 bg-gray-200 dark:bg-white/[0.08] rounded w-[95%]" />
        <div className="h-3.5 bg-gray-200 dark:bg-white/[0.08] rounded w-[88%]" />
        <div className="h-3.5 bg-gray-200 dark:bg-white/[0.08] rounded w-full" />
        <div className="h-3.5 bg-gray-200 dark:bg-white/[0.08] rounded w-[72%]" />
      </div>

      {/* Projects shimmer — 2 cards */}
      <div className="space-y-2 animate-pulse" style={{ animationDelay: '450ms' }}>
        <div className="h-2.5 bg-gray-200 dark:bg-white/[0.08] rounded w-24 mb-3" />
        <div className="flex gap-2">
          <div className="h-14 bg-gray-100 dark:bg-white/[0.04] rounded-xl w-44" />
          <div className="h-14 bg-gray-100 dark:bg-white/[0.04] rounded-xl w-36" />
        </div>
      </div>

      {/* Connections shimmer — 2 items */}
      <div className="space-y-2 animate-pulse" style={{ animationDelay: '600ms' }}>
        <div className="h-2.5 bg-gray-200 dark:bg-white/[0.08] rounded w-20 mb-3" />
        <div className="h-12 bg-gray-100 dark:bg-white/[0.04] rounded-xl w-full" />
        <div className="h-12 bg-gray-100 dark:bg-white/[0.04] rounded-xl w-full" />
      </div>

      {/* Thinking indicator */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {language === 'ru' ? '\u0410\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u044E \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E\u2026' : 'Analyzing portfolio data\u2026'}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Streaming cursor                                                   */
/* ------------------------------------------------------------------ */

function StreamingCursor() {
  return (
    <span className="inline-block w-0.5 h-4 bg-lime-500 ml-0.5 animate-pulse align-text-bottom" />
  );
}

/* ------------------------------------------------------------------ */
/*  Section components                                                 */
/* ------------------------------------------------------------------ */

function HeadlineSection({
  content,
  isStreaming,
  index,
}: {
  content: string;
  isStreaming: boolean;
  index: number;
}) {
  return (
    <motion.div {...sectionVariants(index)}>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
        {content}
        {isStreaming && <StreamingCursor />}
      </h2>
    </motion.div>
  );
}

function MetricsSection({ data, index }: { data: MetricsData; index: number }) {
  const badges = [
    { label: 'Years', value: String(data.years), icon: '>' },
    { label: 'Projects', value: String(data.projects), icon: '///' },
    { label: 'Level', value: data.level, icon: '::' },
  ];

  return (
    <motion.div {...sectionVariants(index)} className="flex gap-3">
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="flex-1 bg-gray-50/70 dark:bg-white/[0.05] rounded-xl px-4 py-3 text-center"
        >
          <span className="block text-[10px] font-mono text-neutral-400 dark:text-neutral-500 mb-1 select-none">
            {badge.icon}
          </span>
          <span className="block text-lg font-mono font-bold text-gray-900 dark:text-white leading-none">
            {badge.value}
          </span>
          <span className="block mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            {badge.label}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

function NarrativeSection({
  content,
  isStreaming,
  index,
}: {
  content: string;
  isStreaming: boolean;
  index: number;
}) {
  return (
    <motion.div {...sectionVariants(index)}>
      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
        {content}
        {isStreaming && <StreamingCursor />}
      </p>
    </motion.div>
  );
}

function ProjectsSection({ data, index }: { data: ProjectRef[]; index: number }) {
  return (
    <motion.div {...sectionVariants(index)}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Related Projects
      </h3>
      <div className="flex flex-wrap gap-2">
        {data.map((project) => (
          <div
            key={project.slug}
            className="bg-gray-50/70 dark:bg-white/[0.05] rounded-xl px-4 py-3
                       border border-transparent hover:border-gray-200 dark:hover:border-neutral-700
                       transition-colors cursor-default"
          >
            <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              {project.name}
            </span>
            <span className="block mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {project.relevance}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function QuotesSection({ data, index }: { data: QuoteData[]; index: number }) {
  return (
    <motion.div {...sectionVariants(index)} className="space-y-3">
      {data.map((quote, i) => (
        <blockquote
          key={i}
          className="border-l-2 border-lime-500 pl-4 py-1"
        >
          <p className="text-sm italic text-gray-700 dark:text-gray-300 leading-relaxed">
            &ldquo;{quote.text}&rdquo;
          </p>
          <footer className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            &mdash; {quote.author}
            {quote.title && (
              <span className="text-neutral-400 dark:text-neutral-500">, {quote.title}</span>
            )}
          </footer>
        </blockquote>
      ))}
      <p className="mt-4 text-[11px] text-neutral-400 dark:text-neutral-500">
        All recommendations are from{' '}
        <a
          href="https://www.linkedin.com/in/wkwebview/details/recommendations/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-lime-500 transition-colors"
        >
          Andrey&apos;s LinkedIn profile
        </a>
      </p>
    </motion.div>
  );
}

function ConnectionsSection({ data, index }: { data: string[]; index: number }) {
  return (
    <motion.div {...sectionVariants(index)}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Connections
      </h3>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 bg-gray-50/70 dark:bg-white/[0.05] rounded-xl px-4 py-3"
          >
            <svg
              className="h-4 w-4 flex-shrink-0 mt-0.5 text-lime-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {item}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function InsightPanel({
  topic,
  intent,
  visitorContext,
  language = 'en',
  onNavigate,
}: InsightPanelProps) {
  const {
    headline,
    metrics,
    narrative,
    projects,
    quotes,
    connections,
    isLoading,
    error,
    streamingSection,
    hasParsedContent,
  } = useInsightStream({ topic, intent, visitorContext, language });

  let sectionIndex = 0;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
          Try asking again or rephrase your question.
        </p>
      </div>
    );
  }

  if (isLoading && !hasParsedContent) {
    return <Skeleton language={language} />;
  }

  return (
    <div className="space-y-5">
      <AnimatePresence mode="popLayout">
        {headline !== null && (
          <HeadlineSection
            key="headline"
            content={headline}
            isStreaming={streamingSection === 'headline'}
            index={sectionIndex++}
          />
        )}

        {metrics && (
          <MetricsSection
            key="metrics"
            data={metrics}
            index={sectionIndex++}
          />
        )}

        {narrative && (
          <NarrativeSection
            key="narrative"
            content={narrative}
            isStreaming={streamingSection === 'narrative'}
            index={sectionIndex++}
          />
        )}

        {projects && projects.length > 0 && (
          <ProjectsSection
            key="projects"
            data={projects}
            index={sectionIndex++}
          />
        )}

        {quotes && quotes.length > 0 && (
          <QuotesSection
            key="quotes"
            data={quotes}
            index={sectionIndex++}
          />
        )}

        {connections && connections.length > 0 && (
          <ConnectionsSection
            key="connections"
            data={connections}
            index={sectionIndex++}
          />
        )}
      </AnimatePresence>

      {/* Loading indicator while streaming */}
      {isLoading && hasParsedContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 pt-1"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime-500 animate-pulse" />
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {language === 'ru' ? '\u0413\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u044E \u0438\u043D\u0441\u0430\u0439\u0442\u2026' : 'Generating insight\u2026'}
          </span>
        </motion.div>
      )}

      {/* View full resume link */}
      {!isLoading && hasParsedContent && onNavigate && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.3 }}
          className="pt-4 border-t border-gray-200 dark:border-white/[0.08]"
        >
          <button
            onClick={() => onNavigate({ open: true, type: 'resume' })}
            className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-lime-500 dark:hover:text-lime-500 transition-colors group"
          >
            <span>{language === 'ru' ? '\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u043F\u043E\u043B\u043D\u043E\u0435 \u0440\u0435\u0437\u044E\u043C\u0435' : 'View full resume'}</span>
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>
      )}
    </div>
  );
}
