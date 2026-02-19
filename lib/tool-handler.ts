// Maps tool calls from the AI agent to UI state changes.
// Layer 1 tools produce PanelState (open/close panels).
// Layer 2 tools produce PanelAction (interact within open panels).

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type PanelState = {
  open: boolean;
  type: 'project' | 'projects' | 'skills' | 'contact' | 'timeline' | 'gallery' | 'comparison' | 'resume' | null;
  slug?: string;
  slug2?: string;
  category?: string;
};

export type PanelAction =
  | { type: 'scroll_timeline_to'; company: string }
  | { type: 'highlight_period'; company: string; years?: string }
  | { type: 'focus_screenshot'; slug: string; index: number }
  | { type: 'highlight_skill'; name: string }
  | { type: 'highlight_project_detail'; slug: string; field: string }
  | { type: 'scroll_to_project'; slug: string }
  | { type: 'highlight_project'; slug: string };

export type ToolResult = {
  panelState?: Partial<PanelState>;
  action?: PanelAction;
};

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

export function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): ToolResult {
  switch (name) {
    // -------------------------------------------------------------------------
    // Layer 1 — Panel tools
    // -------------------------------------------------------------------------
    case 'show_project':
      return {
        panelState: {
          open: true,
          type: 'project',
          slug: args.slug as string,
        },
      };

    case 'show_projects':
      return {
        panelState: { open: true, type: 'projects' },
      };

    case 'show_resume':
      return {
        panelState: { open: true, type: 'resume' },
      };

    case 'show_skills':
      return {
        panelState: {
          open: true,
          type: 'skills',
          category: (args.category as string) ?? 'all',
        },
      };

    case 'show_contact':
      return {
        panelState: { open: true, type: 'contact' },
      };

    case 'show_timeline':
      return {
        panelState: { open: true, type: 'timeline' },
      };

    case 'show_gallery':
      return {
        panelState: {
          open: true,
          type: 'gallery',
          slug: args.slug as string,
        },
      };

    case 'hide_panel':
      return {
        panelState: { open: false, type: null },
      };

    case 'compare_projects':
      return {
        panelState: {
          open: true,
          type: 'comparison',
          slug: args.slug1 as string,
          slug2: args.slug2 as string,
        },
      };

    // -------------------------------------------------------------------------
    // Layer 2 — Action tools
    // -------------------------------------------------------------------------
    case 'scroll_timeline_to':
      return {
        action: {
          type: 'scroll_timeline_to',
          company: args.company as string,
        },
      };

    case 'highlight_period':
      return {
        action: {
          type: 'highlight_period',
          company: args.company as string,
          years: args.years as string | undefined,
        },
      };

    case 'focus_screenshot':
      return {
        action: {
          type: 'focus_screenshot',
          slug: args.slug as string,
          index: args.index as number,
        },
      };

    case 'highlight_skill':
      return {
        action: {
          type: 'highlight_skill',
          name: args.name as string,
        },
      };

    case 'highlight_project_detail':
      return {
        action: {
          type: 'highlight_project_detail',
          slug: args.slug as string,
          field: args.field as string,
        },
      };

    case 'scroll_to_project':
      return {
        action: {
          type: 'scroll_to_project',
          slug: args.slug as string,
        },
      };

    case 'highlight_project':
      return {
        action: {
          type: 'highlight_project',
          slug: args.slug as string,
        },
      };

    // -------------------------------------------------------------------------
    // Layer 3 — Data tools (side-effects, no UI change)
    // -------------------------------------------------------------------------
    case 'remember_visitor':
      // Fire-and-forget POST to save visitor info
      fetch('/api/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      }).catch((err) => console.error('[remember_visitor] failed:', err));
      return {};

    default:
      return {};
  }
}
