import { describe, it, expect } from 'vitest';
import config from '../portfolio/config.json';
import projects from '../portfolio/projects.json';
import skills from '../portfolio/skills.json';
import experience from '../portfolio/experience.json';
import recommendations from '../portfolio/recommendations.json';

describe('Portfolio data integrity', () => {
  it('config has required fields', () => {
    expect(config.name).toBeTruthy();
    expect(config.firstName).toBeTruthy();
    expect(config.title).toBeTruthy();
    expect(config.bio).toBeTruthy();
    expect(config.theme).toBeDefined();
    expect(config.agent).toBeDefined();
    expect(config.agent.greeting).toBeTruthy();
    expect(config.agent.personality).toBeTruthy();
  });

  it('projects have valid structure', () => {
    expect(Array.isArray(projects)).toBe(true);
    for (const p of projects) {
      expect(p.slug).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.role).toBeTruthy();
      expect(Array.isArray(p.stack)).toBe(true);
    }
  });

  it('skills have categories', () => {
    expect(skills.primary).toBeDefined();
    expect(skills.strong).toBeDefined();
    expect(Array.isArray(skills.primary)).toBe(true);
  });

  it('experience has entries', () => {
    expect(Array.isArray(experience)).toBe(true);
    expect(experience.length).toBeGreaterThan(0);
  });

  it('recommendations is an array', () => {
    expect(Array.isArray(recommendations)).toBe(true);
  });

  it('all project slugs are unique', () => {
    const slugs = projects.map((p: { slug: string }) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
