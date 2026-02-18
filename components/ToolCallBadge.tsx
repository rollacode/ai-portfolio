'use client';

import { motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ToolCallBadgeProps {
  name: string;
  arguments: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format a single argument value for display. */
function formatValue(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return entries.map(([k, v]) => `${k}=${formatValue(v)}`).join(', ');
  }
  return String(value);
}

/** Build the preview string for a tool call, e.g. `show_project("trax-retail")`. */
function buildPreview(name: string, args: Record<string, unknown>): string {
  const entries = Object.entries(args);
  if (entries.length === 0) return `${name}()`;

  // If there's a single string arg, show it directly: tool("value")
  if (entries.length === 1 && typeof entries[0][1] === 'string') {
    return `${name}("${entries[0][1]}")`;
  }

  const inner = entries
    .map(([k, v]) => `${k}=${formatValue(v)}`)
    .join(', ');

  return `${name}(${inner})`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ToolCallBadge({ name, arguments: args }: ToolCallBadgeProps) {
  const preview = buildPreview(name, args);

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="my-1 inline-flex max-w-full items-center gap-1.5 rounded-full
                 bg-gray-100 dark:bg-gray-800/60 px-3 py-1
                 text-xs text-gray-600 dark:text-gray-400
                 ring-1 ring-gray-200/60 dark:ring-gray-700/50"
    >
      {/* Lightning bolt icon */}
      <svg
        className="h-3 w-3 flex-shrink-0 text-amber-500"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M9.5 1L4 9h4l-1.5 6L13 7H9l.5-6z" />
      </svg>

      <code className="truncate font-mono">{preview}</code>
    </motion.span>
  );
}
