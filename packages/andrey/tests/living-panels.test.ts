// @vitest-environment jsdom
import { act, createElement as h, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import ContentPanel from '../../core/src/components/panels/ContentPanel';
import ProjectCard from '../../core/src/components/panels/ProjectCard';
import SkillsGrid from '../../core/src/components/panels/SkillsGrid';
import TechRadar from '../../core/src/components/panels/TechRadar';
import SpotlightPanel from '../../core/src/components/panels/SpotlightPanel';
import { PortfolioDataProvider } from '../../core/src/context/PortfolioDataContext';
import { ConversationProvider, type ConversationContextValue } from '../../core/src/context/ConversationContext';
import type { PortfolioData } from '../../core/src/types/portfolio';
import type { PanelState } from '../../core/src/lib/tool-handler';
import config from '../portfolio/config.json';
import projects from '../portfolio/projects.json';
import skills from '../portfolio/skills.json';
import experience from '../portfolio/experience.json';
import recommendations from '../portfolio/recommendations.json';
import anyaConfig from '../../anya/portfolio/config.json';
import anyaProjects from '../../anya/portfolio/projects.json';
import anyaSkills from '../../anya/portfolio/skills.json';
import anyaExperience from '../../anya/portfolio/experience.json';
import anyaRecommendations from '../../anya/portfolio/recommendations.json';

const data = { config, projects, skills, experience, recommendations } as unknown as PortfolioData;
const anya = { config: anyaConfig, projects: anyaProjects, skills: anyaSkills, experience: anyaExperience, recommendations: anyaRecommendations } as unknown as PortfolioData;
let root: Root;
let mount: HTMLDivElement;
let callbacks: Array<() => void>;
let reduced = false;
const wrap = (child: React.ReactNode, context: ConversationContextValue = { enabled: true }, portfolio = data) =>
  h(PortfolioDataProvider, { data: portfolio, children: h(ConversationProvider, { value: context, children: child }) });
const ready = vi.fn();
const base = { currentAction: null, onActionConsumed: vi.fn(), onAnimationComplete: ready, onClose: vi.fn() };
function panel(state: PanelState, context: ConversationContextValue) {
  act(() => root.render(wrap(h(ContentPanel, { ...base, panelState: state }), context)));
}
const findButton = (text: string) => Array.from(mount.querySelectorAll('button')).find(button => button.textContent?.includes(text))!;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  callbacks = []; reduced = false;
  window.matchMedia = vi.fn((query: string) => ({
    get matches() { return query.includes('reduce') ? reduced : query.includes('768'); },
    addEventListener: (_: string, cb: () => void) => callbacks.push(cb), removeEventListener() {},
    addListener: (cb: () => void) => callbacks.push(cb), removeListener() {},
  })) as any;
  globalThis.IntersectionObserver = class { observe() {} disconnect() {} } as any;
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.useFakeTimers();
  ready.mockClear();
  base.onActionConsumed.mockClear();
  mount = document.createElement('div'); document.body.append(mount); root = createRoot(mount);
});
afterEach(() => { act(() => root.unmount()); mount.remove(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe('living panel continuity and queue readiness', () => {
  it('provisional tool name shows intended loading shell and cannot report ready or missing project', () => {
    panel({ open: false, type: null }, { enabled: true, requestStatus: 'loading', pendingTool: { id: 'p', name: 'show_project', panelType: 'project', generation: 1 } });
    expect(mount.textContent).toContain('Opening project');
    expect(mount.textContent).not.toContain('unavailable');
    act(() => vi.advanceTimersByTime(1000));
    expect(ready).not.toHaveBeenCalled();
  });
  it('ignores unknown or stale provisional tools', () => {
    panel({ open: false, type: null }, { enabled: true, pendingTool: { id: 'p', name: 'unknown', panelType: 'project', generation: 1 } });
    expect(mount.querySelector('[data-panel-scroll]')).toBeNull();
    panel({ open: true, type: 'skills' }, { enabled: true, panelIdentity: { type: 'skills', generation: 3 }, pendingTool: { id: 'p', name: 'show_project', panelType: 'project', generation: 1 } });
    expect(mount.textContent).not.toContain('Opening project');
  });
  it('replacing A with B cancels A readiness and keeps only the current hero', () => {
    panel({ open: true, type: 'project', slug: 'domios' }, { enabled: true, panelIdentity: { type: 'project', slug: 'domios', generation: 1 } });
    act(() => vi.advanceTimersByTime(200));
    panel({ open: true, type: 'project', slug: 'sos-portal' }, { enabled: true, panelIdentity: { type: 'project', slug: 'sos-portal', generation: 2 } });
    act(() => vi.advanceTimersByTime(900));
    expect(ready).toHaveBeenCalledExactlyOnceWith({ type: 'project', slug: 'sos-portal', generation: 2 });
    expect(mount.querySelectorAll('[data-project-slug] h1')).toHaveLength(1);
    expect(mount.textContent).not.toContain('Domios');
  });
  it('readiness survives a semantically identical provider object and fires once', () => {
    const state: PanelState = { open: true, type: 'project', slug: 'domios' };
    panel(state, { enabled: true, panelIdentity: { type: 'project', slug: 'domios', generation: 8 } });
    act(() => vi.advanceTimersByTime(100));
    panel(state, { enabled: true, panelIdentity: { type: 'project', slug: 'domios', generation: 8 } });
    act(() => vi.advanceTimersByTime(900));
    expect(ready).toHaveBeenCalledExactlyOnceWith({ type: 'project', slug: 'domios', generation: 8 });
  });
  it('returns to the exact source card, scroll position and focus after detail', () => {
    function Host() {
      const [state, setState] = useState<PanelState>({ open: true, type: 'projects' });
      return wrap(h(ContentPanel, { ...base, panelState: state, onNavigate: next => setState(current => ({ ...current, ...next })) }));
    }
    act(() => root.render(h(Host)));
    const scroll = mount.querySelector<HTMLElement>('[data-panel-scroll]')!;
    scroll.scrollTop = 411;
    const source = mount.querySelector<HTMLButtonElement>('#project-source-domios')!;
    source.focus();
    act(() => source.click());
    expect(scroll.scrollTop).toBe(0);
    expect(mount.textContent).toContain('Back to projects');
    act(() => findButton('Back to projects').click());
    expect(mount.querySelector('[data-panel-scroll]')).toBe(scroll);
    expect(scroll.scrollTop).toBe(411);
    expect(document.activeElement?.id).toBe('project-source-domios');
  });
  it('skill-project return restores the selected relationship, scroll and link focus', () => {
    function Host() {
      const [state, setState] = useState<PanelState>({ open: true, type: 'skills' });
      return wrap(h(ContentPanel, { ...base, panelState: state, onNavigate: next => setState(current => ({ ...current, ...next })) }));
    }
    act(() => root.render(h(Host)));
    const skill = skills.primary[0];
    act(() => mount.querySelector<HTMLButtonElement>('#skill-source-' + skill.id)!.focus());
    const link = mount.querySelector<HTMLButtonElement>('[data-related-skill]')!;
    const id = link.id;
    const scroll = mount.querySelector<HTMLElement>('[data-panel-scroll]')!;
    scroll.scrollTop = 176;
    act(() => { link.focus(); link.click(); });
    act(() => findButton('Back to skills').click());
    expect(scroll.scrollTop).toBe(176);
    expect(document.activeElement?.id).toBe(id);
    expect(mount.textContent).toContain(skill.name + ' in practice');
  });
  it('returns keyboard focus to the same media surface when that opened the project', () => {
    function Host() {
      const [state, setState] = useState<PanelState>({ open: true, type: 'projects' });
      return wrap(h(ContentPanel, { ...base, panelState: state, onNavigate: next => setState(current => ({ ...current, ...next })) }));
    }
    act(() => root.render(h(Host)));
    const surface = mount.querySelector<HTMLElement>('#project-media-source-domios')!;
    act(() => { surface.focus(); surface.click(); });
    act(() => findButton('Back to projects').click());
    expect(document.activeElement?.id).toBe('project-media-source-domios');
  });
  it('timeline returns to the same expanded role connection and focused project', () => {
    function Host() {
      const [state, setState] = useState<PanelState>({ open: true, type: 'timeline' });
      return wrap(h(ContentPanel, { ...base, panelState: state, onNavigate: next => setState(current => ({ ...current, ...next })) }));
    }
    act(() => root.render(h(Host)));
    act(() => findButton('Projects using this stack').click());
    const link = mount.querySelector<HTMLButtonElement>('[data-related-company]')!;
    expect(link).not.toBeNull();
    const id = link.id;
    act(() => { link.focus(); link.click(); });
    act(() => findButton('Back to timeline').click());
    expect(document.activeElement?.id).toBe(id);
    expect(findButton('Projects using this stack').getAttribute('aria-expanded')).toBe('true');
  });
  it('radar returns with its selected project link and filter intact', () => {
    function Host() {
      const [state, setState] = useState<PanelState>({ open: true, type: 'tech-radar' });
      return wrap(h(ContentPanel, { ...base, panelState: state, onNavigate: next => setState(current => ({ ...current, ...next })) }));
    }
    act(() => root.render(h(Host)));
    const select = mount.querySelector('select')!;
    act(() => { select.value = 'primary'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    const skillButton = mount.querySelector<HTMLButtonElement>('[aria-label="Select a skill"] button')!;
    act(() => skillButton.focus());
    const link = mount.querySelector<HTMLButtonElement>('[data-related-skill]')!;
    const id = link.id;
    act(() => { link.focus(); link.click(); });
    act(() => findButton('Back to tech radar').click());
    expect(mount.querySelector('select')?.value).toBe('primary');
    expect(document.activeElement?.id).toBe(id);
  });
  it('routes a project screenshot action to its gallery and acknowledges it once', () => {
    const navigate = vi.fn();
    act(() => root.render(wrap(h(ContentPanel, { ...base, panelState: { open: true, type: 'project', slug: 'domios' }, onNavigate: navigate, currentAction: { type: 'focus_screenshot', slug: 'domios', index: 1 } }))));
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ open: true, type: 'gallery', slug: 'domios' });
    expect(base.onActionConsumed).toHaveBeenCalledTimes(1);
  });
  it('a visitor opening gallery does not consume an unrelated queued action', () => {
    function Host() {
      const [state, setState] = useState<PanelState>({ open: true, type: 'project', slug: 'domios' });
      return wrap(h(ContentPanel, { ...base, panelState: state, onNavigate: next => setState(current => ({ ...current, ...next })) }));
    }
    act(() => root.render(h(Host)));
    act(() => mount.querySelector<HTMLButtonElement>('#project-screenshot-domios-0')!.click());
    act(() => vi.advanceTimersByTime(1600));
    expect(base.onActionConsumed).not.toHaveBeenCalled();
  });
  it('missing validated project gives recovery text and does not violate hook order on replacement', () => {
    act(() => root.render(wrap(h(ProjectCard, { slug: 'missing' }))));
    expect(mount.textContent).toContain('Project unavailable');
    act(() => root.render(wrap(h(ProjectCard, { slug: 'domios' }))));
    expect(mount.textContent).toContain('Domios');
  });
  it('all matching projects derive from skillIds, with keyboard focus and phone-native buttons', () => {
    act(() => root.render(wrap(h(SkillsGrid, {}))));
    const skill = skills.primary[0];
    const button = mount.querySelector<HTMLButtonElement>('#skill-source-' + skill.id)!;
    act(() => button.focus());
    expect(button.getAttribute('aria-pressed')).toBe('true');
    for (const project of projects.filter(project => project.skillIds.includes(skill.id))) expect(mount.textContent).toContain(project.name);
    act(() => findButton('Clear selection').click());
    expect(mount.textContent).toContain('Select a skill');
  });
  it('radar exposes an accessible empty filter and clear action', () => {
    act(() => root.render(wrap(h(TechRadar, { focusCategory: 'missing' }))));
    expect(mount.textContent).toContain('No skills in this group');
    act(() => findButton('Show all skills').click());
    expect(mount.textContent).toContain(skills.primary[0].name);
  });
  it('Spotlight does not mount full trailer until explicit click and returns focus', async () => {
    act(() => root.render(wrap(h(SpotlightPanel))));
    expect(mount.querySelector('video')).toBeNull();
    act(() => findButton('Watch full trailer').click());
    expect(mount.querySelector('video')?.controls).toBe(true);
    expect(mount.querySelector('video')?.loop).toBe(false);
    act(() => findButton('Return to preview').click());
    act(() => vi.advanceTimersByTime(32));
    expect(document.activeElement?.textContent).toBe('Watch full trailer');
  });
  it('keeps no-argument readiness for the default path, including same-type project replacement', () => {
    panel({ open: true, type: 'project', slug: 'domios' }, { enabled: false });
    act(() => vi.advanceTimersByTime(900));
    expect(ready).toHaveBeenCalledExactlyOnceWith();
    ready.mockClear();
    panel({ open: true, type: 'project', slug: 'sos-portal' }, { enabled: false });
    act(() => vi.advanceTimersByTime(900));
    expect(ready).toHaveBeenCalledExactlyOnceWith();
  });
  it('Anya default provider retains existing project and skill surfaces without Andrey media', () => {
    act(() => root.render(wrap(h(ProjectCard, { slug: anya.projects[0].slug }), { enabled: false }, anya)));
    expect(mount.textContent).toContain(anya.projects[0].name);
    expect(mount.querySelector('[data-loop-state]')).toBeNull();
    act(() => root.render(wrap(h(SkillsGrid, {}), { enabled: false }, anya)));
    expect(mount.textContent).toContain(anya.skills.primary[0].name);
    expect(mount.textContent).not.toContain('Explore the project connections');
  });
});
