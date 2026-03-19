import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleToolCall, type PanelState, type PanelAction, type ToolResult } from '../lib/tool-handler';

// ---------------------------------------------------------------------------
// Mock browser globals used by tool-handler (getVisitorId, fetch)
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Mock window so getVisitorId() doesn't bail with ''
  vi.stubGlobal('window', globalThis);

  // Mock sessionStorage
  const store: Record<string, string> = {};
  vi.stubGlobal('sessionStorage', {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
  });

  // Mock crypto.randomUUID
  vi.stubGlobal('crypto', {
    ...globalThis.crypto,
    randomUUID: vi.fn(() => 'test-uuid-1234'),
  });

  // Mock fetch (used by remember_visitor)
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('ok'))));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Layer 1 — Panel tools
// ---------------------------------------------------------------------------

describe('handleToolCall — Layer 1 (Panel tools)', () => {
  it('show_project: opens project panel with slug', () => {
    const result = handleToolCall('show_project', { slug: 'portfolio' });
    expect(result.panelState).toEqual({
      open: true,
      type: 'project',
      slug: 'portfolio',
    });
    expect(result.action).toBeUndefined();
  });

  it('show_projects: opens projects panel with filter and skillId', () => {
    const result = handleToolCall('show_projects', { filter: 'frontend', skillId: 'react' });
    expect(result.panelState).toEqual({
      open: true,
      type: 'projects',
      filter: 'frontend',
      skillId: 'react',
    });
  });

  it('show_projects: opens projects panel with no filter', () => {
    const result = handleToolCall('show_projects', {});
    expect(result.panelState).toEqual({
      open: true,
      type: 'projects',
      filter: undefined,
      skillId: undefined,
    });
  });

  it('show_resume: opens resume panel', () => {
    const result = handleToolCall('show_resume', {});
    expect(result.panelState).toEqual({ open: true, type: 'resume' });
  });

  it('show_skills: opens skills panel with category', () => {
    const result = handleToolCall('show_skills', { category: 'ai' });
    expect(result.panelState).toEqual({
      open: true,
      type: 'skills',
      category: 'ai',
    });
  });

  it('show_skills: defaults category to "all" when not provided', () => {
    const result = handleToolCall('show_skills', {});
    expect(result.panelState?.category).toBe('all');
  });

  it('show_contact: opens contact panel', () => {
    const result = handleToolCall('show_contact', {});
    expect(result.panelState).toEqual({ open: true, type: 'contact' });
  });

  it('show_timeline: opens timeline panel', () => {
    const result = handleToolCall('show_timeline', {});
    expect(result.panelState).toEqual({ open: true, type: 'timeline' });
  });

  it('show_gallery: opens gallery panel with slug', () => {
    const result = handleToolCall('show_gallery', { slug: 'demo-app' });
    expect(result.panelState).toEqual({
      open: true,
      type: 'gallery',
      slug: 'demo-app',
    });
  });

  it('show_tech_radar: opens tech-radar panel', () => {
    const result = handleToolCall('show_tech_radar', {});
    expect(result.panelState).toEqual({ open: true, type: 'tech-radar' });
  });

  it('show_quick_facts: opens quick-facts panel', () => {
    const result = handleToolCall('show_quick_facts', {});
    expect(result.panelState).toEqual({ open: true, type: 'quick-facts' });
  });

  it('show_recommendations: opens recommendations panel', () => {
    const result = handleToolCall('show_recommendations', {});
    expect(result.panelState).toEqual({ open: true, type: 'recommendations' });
  });

  it('play_game: opens game panel with game name', () => {
    const result = handleToolCall('play_game', { game: 'snake' });
    expect(result.panelState).toEqual({
      open: true,
      type: 'game',
      game: 'snake',
    });
  });

  it('hide_panel: closes panel', () => {
    const result = handleToolCall('hide_panel', {});
    expect(result.panelState).toEqual({ open: false, type: null });
  });

  it('compare_projects: opens comparison panel with two slugs', () => {
    const result = handleToolCall('compare_projects', { slug1: 'project-a', slug2: 'project-b' });
    expect(result.panelState).toEqual({
      open: true,
      type: 'comparison',
      slug: 'project-a',
      slug2: 'project-b',
    });
  });

  it('focus_radar_section: opens tech-radar panel AND dispatches action', () => {
    const result = handleToolCall('focus_radar_section', { category: 'frameworks' });
    expect(result.panelState).toEqual({ open: true, type: 'tech-radar' });
    expect(result.action).toEqual({ type: 'focus_radar_section', category: 'frameworks' });
  });
});

// ---------------------------------------------------------------------------
// Layer 2 — Action tools
// ---------------------------------------------------------------------------

describe('handleToolCall — Layer 2 (Action tools)', () => {
  it('scroll_timeline_to: opens timeline and returns scroll action', () => {
    const result = handleToolCall('scroll_timeline_to', { company: 'Google' });
    expect(result.panelState).toEqual({ open: true, type: 'timeline' });
    expect(result.action).toEqual({ type: 'scroll_timeline_to', company: 'Google' });
  });

  it('highlight_period: opens timeline and returns highlight action', () => {
    const result = handleToolCall('highlight_period', { company: 'Meta', years: '2020-2023' });
    expect(result.panelState).toEqual({ open: true, type: 'timeline' });
    expect(result.action).toEqual({
      type: 'highlight_period',
      company: 'Meta',
      years: '2020-2023',
    });
  });

  it('highlight_period: handles missing years', () => {
    const result = handleToolCall('highlight_period', { company: 'Startup' });
    expect(result.action).toEqual({
      type: 'highlight_period',
      company: 'Startup',
      years: undefined,
    });
  });

  it('focus_screenshot: opens gallery and returns focus action', () => {
    const result = handleToolCall('focus_screenshot', { slug: 'demo', index: 2 });
    expect(result.panelState).toEqual({ open: true, type: 'gallery', slug: 'demo' });
    expect(result.action).toEqual({ type: 'focus_screenshot', slug: 'demo', index: 2 });
  });

  it('highlight_skill: opens skills panel and returns highlight action', () => {
    const result = handleToolCall('highlight_skill', { name: 'TypeScript' });
    expect(result.panelState).toEqual({ open: true, type: 'skills' });
    expect(result.action).toEqual({ type: 'highlight_skill', name: 'TypeScript' });
  });

  it('highlight_project_detail: opens project panel and returns highlight action', () => {
    const result = handleToolCall('highlight_project_detail', { slug: 'my-app', field: 'stack' });
    expect(result.panelState).toEqual({ open: true, type: 'project', slug: 'my-app' });
    expect(result.action).toEqual({
      type: 'highlight_project_detail',
      slug: 'my-app',
      field: 'stack',
    });
  });

  it('scroll_to_project: opens projects panel and returns scroll action', () => {
    const result = handleToolCall('scroll_to_project', { slug: 'chat-app' });
    expect(result.panelState).toEqual({ open: true, type: 'projects' });
    expect(result.action).toEqual({ type: 'scroll_to_project', slug: 'chat-app' });
  });

  it('highlight_project: opens projects panel and returns highlight action', () => {
    const result = handleToolCall('highlight_project', { slug: 'dashboard' });
    expect(result.panelState).toEqual({ open: true, type: 'projects' });
    expect(result.action).toEqual({ type: 'highlight_project', slug: 'dashboard' });
  });

  it('highlight_recommendation: opens recommendations panel and returns action', () => {
    const result = handleToolCall('highlight_recommendation', { name: 'Jane Doe' });
    expect(result.panelState).toEqual({ open: true, type: 'recommendations' });
    expect(result.action).toEqual({ type: 'highlight_recommendation', name: 'Jane Doe' });
  });
});

// ---------------------------------------------------------------------------
// Layer 4 — Side-effect tools
// ---------------------------------------------------------------------------

describe('handleToolCall — Layer 4 (Side-effect tools)', () => {
  it('set_theme: returns theme action with no panel state', () => {
    const result = handleToolCall('set_theme', { theme: 'dark' });
    expect(result.panelState).toBeUndefined();
    expect(result.action).toEqual({ type: 'set_theme', theme: 'dark' });
  });

  it('set_theme: handles light theme', () => {
    const result = handleToolCall('set_theme', { theme: 'light' });
    expect(result.action).toEqual({ type: 'set_theme', theme: 'light' });
  });
});

// ---------------------------------------------------------------------------
// Layer 3 — Data tools (side-effects)
// ---------------------------------------------------------------------------

describe('handleToolCall — Layer 3 (Data tools)', () => {
  it('remember_visitor: fires fetch POST and returns empty result', () => {
    const result = handleToolCall('remember_visitor', { name: 'John', company: 'Acme' });

    expect(result).toEqual({});
    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/visitor');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(body.name).toBe('John');
    expect(body.company).toBe('Acme');
    expect(body.visitorId).toBe('test-uuid-1234');
  });

  it('remember_visitor: uses existing session visitorId', () => {
    // Pre-populate sessionStorage
    (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('existing-id');

    handleToolCall('remember_visitor', { name: 'Alice' });

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.visitorId).toBe('existing-id');
  });
});

// ---------------------------------------------------------------------------
// Unknown / edge cases
// ---------------------------------------------------------------------------

describe('handleToolCall — unknown and edge cases', () => {
  it('returns empty object for unknown tool names', () => {
    const result = handleToolCall('nonexistent_tool', { foo: 'bar' });
    expect(result).toEqual({});
  });

  it('returns empty object for empty string tool name', () => {
    const result = handleToolCall('', {});
    expect(result).toEqual({});
  });

  it('handles missing args gracefully (slug is undefined)', () => {
    const result = handleToolCall('show_project', {});
    expect(result.panelState).toEqual({
      open: true,
      type: 'project',
      slug: undefined,
    });
  });

  it('handles null values in args', () => {
    const result = handleToolCall('show_gallery', { slug: null });
    expect(result.panelState?.slug).toBeNull();
  });

  it('all panel tools set open: true', () => {
    const panelTools = [
      ['show_project', { slug: 'x' }],
      ['show_projects', {}],
      ['show_resume', {}],
      ['show_skills', {}],
      ['show_contact', {}],
      ['show_timeline', {}],
      ['show_gallery', { slug: 'x' }],
      ['show_tech_radar', {}],
      ['show_quick_facts', {}],
      ['show_recommendations', {}],
      ['play_game', { game: 'x' }],
      ['compare_projects', { slug1: 'a', slug2: 'b' }],
    ] as const;

    for (const [name, args] of panelTools) {
      const result = handleToolCall(name, args as Record<string, unknown>);
      expect(result.panelState?.open, `${name} should open panel`).toBe(true);
    }
  });

  it('hide_panel is the only tool that sets open: false', () => {
    const result = handleToolCall('hide_panel', {});
    expect(result.panelState?.open).toBe(false);
    expect(result.panelState?.type).toBeNull();
  });

  it('action tools always include both panelState and action', () => {
    const actionTools = [
      ['scroll_timeline_to', { company: 'x' }],
      ['highlight_period', { company: 'x' }],
      ['focus_screenshot', { slug: 'x', index: 0 }],
      ['highlight_skill', { name: 'x' }],
      ['highlight_project_detail', { slug: 'x', field: 'y' }],
      ['scroll_to_project', { slug: 'x' }],
      ['highlight_project', { slug: 'x' }],
      ['highlight_recommendation', { name: 'x' }],
    ] as const;

    for (const [name, args] of actionTools) {
      const result = handleToolCall(name, args as Record<string, unknown>);
      expect(result.panelState, `${name} missing panelState`).toBeDefined();
      expect(result.action, `${name} missing action`).toBeDefined();
    }
  });
});
