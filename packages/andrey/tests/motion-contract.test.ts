// @vitest-environment jsdom
import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { brandSpring, liquidSettle, hoverSwell, press, reducedMotionCrossfade, DURATION_MS } from '../../core/src/lib/motion';
import ProjectCard, { sourcedMetrics } from '../../core/src/components/panels/ProjectCard';
import { PortfolioDataProvider } from '../../core/src/context/PortfolioDataContext';
import { ConversationProvider } from '../../core/src/context/ConversationContext';
import type { PortfolioData, Project } from '../../core/src/types/portfolio';
import config from '../portfolio/config.json';
import projects from '../portfolio/projects.json';
import skills from '../portfolio/skills.json';
import experience from '../portfolio/experience.json';
import recommendations from '../portfolio/recommendations.json';

vi.mock('framer-motion', async importOriginal => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});
describe('shared motion and honest data contract', () => {
  it('consumes the single physical handoff and settle contract', () => {
    expect(brandSpring).toEqual({ type: 'spring', stiffness: 420, damping: 22, mass: 1 });
    expect(liquidSettle).toEqual({ duration: .38, ease: [.16, 1, .3, 1] });
    expect(hoverSwell.duration).toBe(.38);
    expect(press.duration).toBe(.28);
    expect(reducedMotionCrossfade.duration).toBeLessThanOrEqual(.15);
    expect(DURATION_MS.readingHold).toBeGreaterThanOrEqual(1500);
    expect(DURATION_MS.detailStagger).toBe(60);
  });
  it('only delivered pilot slugs reference real committed assets', () => {
    const loops = (projects as Project[]).filter(project => project.loop);
    expect(loops.map(project => project.slug).sort()).toEqual(['ai-portfolio', 'domios', 'sos-portal']);
    for (const project of loops) {
      expect(project.loop).toEqual({
        mp4: '/loops/' + project.slug + '/loop.mp4',
        webm: '/loops/' + project.slug + '/loop.webm',
        poster: '/loops/' + project.slug + '/poster.webp',
      });
      for (const file of Object.values(project.loop!)) {
        expect(fs.statSync(path.join(process.cwd(), 'public', file)).size).toBeGreaterThan(1000);
      }
    }
    expect(config.spotlight.loop).toEqual(loops.find(project => project.slug === 'domios')!.loop);
  });
  it('does not convert years, versions or game titles into invented metrics', () => {
    expect(sourcedMetrics(['Snake, 2048, iOS 19', 'In 2026', 'No numeric facts'])).toEqual([]);
    expect(sourcedMetrics(projects.find(project => project.slug === 'domios')!.highlights)).toEqual([]);
    expect(sourcedMetrics(projects.find(project => project.slug === 'sos-portal')!.highlights).map(metric => metric.value)).toEqual([17, 6]);
    expect(sourcedMetrics(projects.find(project => project.slug === 'ai-portfolio')!.highlights).map(metric => metric.value)).toEqual([22, 4]);
  });
  it('every displayed metric retains its exact source highlight', () => {
    for (const project of projects) for (const metric of sourcedMetrics(project.highlights)) {
      expect(project.highlights).toContain(metric.source);
      expect(metric.source).toContain(String(metric.value));
    }
  });
  it('reduced motion shows final facts and a still without any video source immediately', () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as any;
    globalThis.IntersectionObserver = class { observe() {} disconnect() {} } as any;
    const mount = document.createElement('div');
    document.body.append(mount);
    const root = createRoot(mount);
    const data = { config, projects, skills, experience, recommendations } as unknown as PortfolioData;
    act(() => root.render(h(PortfolioDataProvider, { data, children: h(ConversationProvider, { value: { enabled: true }, children: h(ProjectCard, { slug: 'sos-portal' }) }) })));
    const facts = mount.querySelector('[aria-label="Project at a glance"]')!;
    expect(facts.textContent).toContain('17');
    expect(facts.textContent).toContain('6');
    expect(mount.querySelector('video')).toBeNull();
    expect(mount.querySelector('source')).toBeNull();
    expect(mount.querySelector('[data-loop-state] img')?.getAttribute('src')).toBe('/loops/sos-portal/poster.webp');
    act(() => root.unmount()); mount.remove();
  });
});
