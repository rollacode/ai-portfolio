import { describe, it, expect } from 'vitest';
import config from '../portfolio/config.json';
import { getToolsWithContext } from '../lib/tools';
import { handleToolCall } from '../lib/tool-handler';

const names = (tools: ReturnType<typeof getToolsWithContext>) => tools.map((tool) => tool.function.name);

describe('spotlight', () => {
  it('is offered only to a site that has a spotlight', () => {
    expect(names(getToolsWithContext([], [], [], []))).not.toContain('show_spotlight');
    const offered = getToolsWithContext([], [], [], [], 'Domios').find((tool) => tool.function.name === 'show_spotlight');
    expect(offered?.function.description).toContain('Domios');
  });

  it('opens the spotlight panel', () => {
    expect(handleToolCall('show_spotlight', {}).panelState).toEqual({ open: true, type: 'spotlight' });
  });

  it('gives the panel everything it shows', () => {
    const spotlight = config.spotlight;
    expect(spotlight.name).toBe('Domios');
    expect(spotlight.video.mp4).toMatch(/^(https:\/\/|\/loops\/)/);
    expect(spotlight.links.source).toMatch(/^https:\/\/github\.com\//);
    expect(spotlight.differences.length).toBeGreaterThan(0);
    expect(spotlight.capabilities.length).toBeGreaterThan(0);
  });
});
