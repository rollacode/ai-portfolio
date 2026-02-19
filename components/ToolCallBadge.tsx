'use client';

/* ------------------------------------------------------------------ */
/*  Human-readable tool call labels                                    */
/*  Displayed as a single comma-separated meta line after a message.   */
/* ------------------------------------------------------------------ */

interface ToolCallBadgeProps {
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>;
}

/* ------------------------------------------------------------------ */
/*  Friendly label mapping                                             */
/* ------------------------------------------------------------------ */

function friendlyLabel(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'show_project':
      return `opened ${args.slug || 'project'}`;
    case 'show_projects':
      return 'opened all projects';
    case 'show_skills':
      return args.category && args.category !== 'all'
        ? `opened ${args.category} skills`
        : 'opened skills';
    case 'show_contact':
      return 'opened contacts';
    case 'show_timeline':
      return 'opened timeline';
    case 'show_gallery':
      return `opened ${args.slug || 'gallery'}`;
    case 'hide_panel':
      return 'closed panel';
    case 'scroll_timeline_to':
      return `scrolled to ${args.company}`;
    case 'highlight_period':
      return `highlighted ${args.company}`;
    case 'focus_screenshot':
      return 'focused screenshot';
    case 'highlight_skill':
      return `highlighted ${args.name}`;
    case 'highlight_project_detail':
      return `highlighted ${args.field}`;
    case 'highlight_project':
      return `highlighted ${args.slug}`;
    case 'scroll_to_project':
      return `scrolled to ${args.slug}`;
    case 'compare_projects':
      return `compared ${args.slug1} & ${args.slug2}`;
    case 'play_game':
      return `opened ${args.game} game`;
    case 'remember_visitor': {
      const parts: string[] = [];
      if (args.name) parts.push(`your name is ${args.name}`);
      if (args.company) parts.push(`you're from ${args.company}`);
      if (args.role) parts.push(`you're ${args.role}`);
      if (args.interest) parts.push(`interested in ${args.interest}`);
      if (args.email) parts.push(`email: ${args.email}`);
      if (args.telegram) parts.push(`telegram: ${args.telegram}`);
      if (args.phone) parts.push(`phone: ${args.phone}`);
      if (args.linkedin) parts.push(`linkedin: ${args.linkedin}`);
      if (args.notes) parts.push(String(args.notes));
      return parts.length ? `noted that ${parts.join(', ')}` : 'noted';
    }
    default:
      return name.replace(/_/g, ' ');
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ToolCallBadge({ toolCalls }: ToolCallBadgeProps) {
  if (!toolCalls.length) return null;

  const labels = toolCalls.map((tc) => friendlyLabel(tc.name, tc.arguments));
  const text = labels.join(', ');

  return (
    <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-600 italic">
      I did: {text}
    </p>
  );
}
