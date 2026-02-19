'use client';

import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Friendly label mapping                                             */
/* ------------------------------------------------------------------ */

function friendlyLabel(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'show_project':
      return `opening ${args.slug || 'project'}`;
    case 'show_projects':
      return 'opening all projects';
    case 'show_skills':
      return args.category && args.category !== 'all'
        ? `opening ${args.category} skills`
        : 'opening skills';
    case 'show_contact':
      return 'opening contacts';
    case 'show_timeline':
      return 'opening timeline';
    case 'show_gallery':
      return `opening ${args.slug || 'gallery'}`;
    case 'show_resume':
      return 'opening resume';
    case 'hide_panel':
      return 'closing panel';
    case 'scroll_timeline_to':
      return `scrolling to ${args.company}`;
    case 'highlight_period':
      return `highlighting ${args.company}`;
    case 'focus_screenshot':
      return 'focusing screenshot';
    case 'highlight_skill':
      return `highlighting ${args.name}`;
    case 'highlight_project_detail':
      return `highlighting ${args.field}`;
    case 'highlight_project':
      return `highlighting ${args.slug}`;
    case 'scroll_to_project':
      return `scrolling to ${args.slug}`;
    case 'compare_projects':
      return `comparing ${args.slug1} & ${args.slug2}`;
    case 'remember_visitor': {
      const parts: string[] = [];
      if (args.name) parts.push(`name: ${args.name}`);
      if (args.company) parts.push(`from ${args.company}`);
      if (args.role) parts.push(`role: ${args.role}`);
      if (args.interest) parts.push(String(args.interest));
      if (args.email) parts.push(`email: ${args.email}`);
      if (args.telegram) parts.push(`tg: ${args.telegram}`);
      if (args.phone) parts.push(`phone: ${args.phone}`);
      return parts.length ? `noting ${parts.join(', ')}` : 'noting';
    }
    default:
      return name.replace(/_/g, ' ');
  }
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface TypingIndicatorProps {
  currentTools?: Array<{ name: string; arguments: Record<string, unknown> }>;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TypingIndicator({ currentTools = [] }: TypingIndicatorProps) {
  const labels = currentTools.map((tc) => friendlyLabel(tc.name, tc.arguments));
  const text = labels.length > 0 ? labels.join(', ') : 'Thinking';

  return (
    <div className="px-1 py-0">
      <AnimatePresence mode="wait">
        <motion.p
          key={text}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="text-[11px] italic text-transparent bg-clip-text bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400 dark:from-neutral-600 dark:via-neutral-400 dark:to-neutral-600 animate-shimmer bg-[length:200%_100%]"
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
