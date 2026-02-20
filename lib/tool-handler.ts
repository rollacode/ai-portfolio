// Maps tool calls from the AI agent to UI state changes.
// Layer 1 tools produce PanelState (open/close panels).
// Layer 2 tools produce PanelAction (interact within open panels).

// -----------------------------------------------------------------------------
// Visitor ID — persists per browser session so all remember_visitor calls merge
// -----------------------------------------------------------------------------

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('visitorId');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('visitorId', id);
  }
  return id;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type PanelState = {
  open: boolean;
  type: 'project' | 'projects' | 'skills' | 'contact' | 'timeline' | 'gallery' | 'comparison' | 'resume' | 'tech-radar' | 'recommendations' | 'quick-facts' | 'game' | 'insight' | null;
  slug?: string;
  slug2?: string;
  category?: string;
  filter?: string;
  skillId?: string;
  game?: string;
  insightTitle?: string;
  insightTopic?: string;
  insightIntent?: string;
  insightVisitorContext?: string;
  insightLanguage?: string;
};

export type PanelAction =
  | { type: 'scroll_timeline_to'; company: string }
  | { type: 'highlight_period'; company: string; years?: string }
  | { type: 'focus_screenshot'; slug: string; index: number }
  | { type: 'highlight_skill'; name: string }
  | { type: 'highlight_project_detail'; slug: string; field: string }
  | { type: 'scroll_to_project'; slug: string }
  | { type: 'highlight_project'; slug: string }
  | { type: 'highlight_recommendation'; name: string }
  | { type: 'focus_radar_section'; category: string }
  | { type: 'set_theme'; theme: string };

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
        panelState: {
          open: true,
          type: 'projects',
          filter: args.filter as string | undefined,
          skillId: args.skillId as string | undefined,
        },
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

    case 'show_tech_radar':
      return {
        panelState: { open: true, type: 'tech-radar' },
      };

    case 'focus_radar_section':
      return {
        panelState: { open: true, type: 'tech-radar' },
        action: { type: 'focus_radar_section', category: args.category as string },
      };

    case 'show_quick_facts':
      return {
        panelState: { open: true, type: 'quick-facts' },
      };

    case 'show_recommendations':
      return {
        panelState: { open: true, type: 'recommendations' },
      };

    case 'play_game':
      return {
        panelState: { open: true, type: 'game', game: args.game as string },
      };

    case 'show_insight':
      return {
        panelState: {
          open: true,
          type: 'insight',
          insightTitle: args.title as string,
          insightTopic: args.topic as string,
          insightIntent: args.intent as string,
          insightVisitorContext: (args.visitor_context as string) || undefined,
          insightLanguage: (args.language as string) || 'en',
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
        panelState: { open: true, type: 'timeline' },
        action: {
          type: 'scroll_timeline_to',
          company: args.company as string,
        },
      };

    case 'highlight_period':
      return {
        panelState: { open: true, type: 'timeline' },
        action: {
          type: 'highlight_period',
          company: args.company as string,
          years: args.years as string | undefined,
        },
      };

    case 'focus_screenshot':
      return {
        panelState: { open: true, type: 'gallery', slug: args.slug as string },
        action: {
          type: 'focus_screenshot',
          slug: args.slug as string,
          index: args.index as number,
        },
      };

    case 'highlight_skill':
      return {
        panelState: { open: true, type: 'skills' },
        action: {
          type: 'highlight_skill',
          name: args.name as string,
        },
      };

    case 'highlight_project_detail':
      return {
        panelState: { open: true, type: 'project', slug: args.slug as string },
        action: {
          type: 'highlight_project_detail',
          slug: args.slug as string,
          field: args.field as string,
        },
      };

    case 'scroll_to_project':
      return {
        panelState: { open: true, type: 'projects' },
        action: {
          type: 'scroll_to_project',
          slug: args.slug as string,
        },
      };

    case 'highlight_project':
      return {
        panelState: { open: true, type: 'projects' },
        action: {
          type: 'highlight_project',
          slug: args.slug as string,
        },
      };

    case 'highlight_recommendation':
      return {
        panelState: { open: true, type: 'recommendations' },
        action: {
          type: 'highlight_recommendation',
          name: args.name as string,
        },
      };

    // -------------------------------------------------------------------------
    // Layer 4 — Side-effect tools (modify UI outside panels)
    // -------------------------------------------------------------------------
    case 'set_theme':
      return { action: { type: 'set_theme', theme: args.theme as string } };

    // -------------------------------------------------------------------------
    // Layer 3 — Data tools (side-effects, no UI change)
    // -------------------------------------------------------------------------
    case 'remember_visitor':
      // Fire-and-forget POST to save visitor info with visitorId for merging
      fetch('/api/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...args, visitorId: getVisitorId() }),
      }).catch((err) => console.error('[remember_visitor] failed:', err));
      return {};

    default:
      return {};
  }
}
