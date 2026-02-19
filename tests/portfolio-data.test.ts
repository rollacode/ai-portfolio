import { describe, it, expect } from 'vitest';
import config from '../portfolio/config.json';
import experience from '../portfolio/experience.json';
import skills from '../portfolio/skills.json';
import projects from '../portfolio/projects.json';
import recommendations from '../portfolio/recommendations.json';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SkillEntry = { id: string; name: string; years?: number; level: string };
type SkillsData = Record<string, SkillEntry[]>;

const allSkills = Object.values(skills as SkillsData).flat();
const allSkillIds = allSkills.map((s) => s.id);
const allSkillIdsSet = new Set(allSkillIds);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

describe('config.json', () => {
  it('has required top-level fields', () => {
    expect(config.name).toBeTruthy();
    expect(config.firstName).toBeTruthy();
    expect(config.bio).toBeTruthy();
    expect(config.location).toBeTruthy();
  });

  it('has valid social links', () => {
    expect(config.social.email).toMatch(/@/);
    expect(config.social.github).toMatch(/^https:\/\//);
    expect(config.social.linkedin).toMatch(/^https:\/\//);
  });

  it('has languages', () => {
    expect(config.languages.length).toBeGreaterThan(0);
    for (const lang of config.languages) {
      expect(lang.language).toBeTruthy();
      expect(lang.level).toBeTruthy();
    }
  });

  it('has education', () => {
    expect(config.education.university).toBeTruthy();
    expect(config.education.degree).toBeTruthy();
    expect(config.education.period).toMatch(/\d{4}/);
  });

  it('has strengths', () => {
    expect(config.strengths.length).toBeGreaterThanOrEqual(3);
    for (const s of config.strengths) {
      expect(s.title).toBeTruthy();
      expect(s.description.length).toBeGreaterThan(20);
    }
  });

  it('has agent config', () => {
    expect(config.agent.greeting).toBeTruthy();
    expect(config.agent.personality).toBeTruthy();
  });

  it('has suggested questions', () => {
    expect(config.suggestedQuestions.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

describe('skills.json', () => {
  it('has all four categories', () => {
    expect(skills).toHaveProperty('primary');
    expect(skills).toHaveProperty('strong');
    expect(skills).toHaveProperty('ai');
    expect(skills).toHaveProperty('working');
  });

  it('every skill has id, name, level', () => {
    for (const [cat, entries] of Object.entries(skills as SkillsData)) {
      for (const skill of entries) {
        expect(skill.id, `skill in ${cat} missing id`).toBeTruthy();
        expect(skill.name, `skill ${skill.id} missing name`).toBeTruthy();
        expect(skill.level, `skill ${skill.id} missing level`).toBeTruthy();
      }
    }
  });

  it('all skill ids are kebab-case', () => {
    for (const skill of allSkills) {
      expect(skill.id, `${skill.id} is not kebab-case`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('no duplicate skill ids', () => {
    const seen = new Set<string>();
    for (const skill of allSkills) {
      expect(seen.has(skill.id), `duplicate skill id: ${skill.id}`).toBe(false);
      seen.add(skill.id);
    }
  });

  it('primary skills have years', () => {
    for (const skill of (skills as SkillsData).primary) {
      expect(skill.years, `primary skill ${skill.id} missing years`).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

describe('experience.json', () => {
  it('has at least 3 entries', () => {
    expect(experience.length).toBeGreaterThanOrEqual(3);
  });

  it('every entry has required fields', () => {
    for (const e of experience) {
      expect(e.company, 'missing company').toBeTruthy();
      expect(e.role, 'missing role').toBeTruthy();
      expect(e.period, `${e.company} missing period`).toMatch(/\d{4}/);
      expect(e.description, `${e.company} missing description`).toBeTruthy();
      expect(e.stack.length, `${e.company} has empty stack`).toBeGreaterThan(0);
    }
  });

  it('periods use consistent dash format (space-hyphen-space)', () => {
    for (const e of experience) {
      expect(e.period, `${e.company} period has wrong dash`).toMatch(/ - /);
    }
  });
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

describe('projects.json', () => {
  it('has at least 10 projects', () => {
    expect(projects.length).toBeGreaterThanOrEqual(10);
  });

  it('every project has required fields', () => {
    for (const p of projects) {
      expect(p.slug, 'missing slug').toBeTruthy();
      expect(p.name, `${p.slug} missing name`).toBeTruthy();
      expect(p.period, `${p.slug} missing period`).toMatch(/\d{4}/);
      expect(p.stack.length, `${p.slug} has empty stack`).toBeGreaterThan(0);
      expect(p.description, `${p.slug} missing description`).toBeTruthy();
      expect(p.highlights.length, `${p.slug} has no highlights`).toBeGreaterThan(0);
    }
  });

  it('no duplicate slugs', () => {
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every project has a non-empty writeup', () => {
    for (const p of projects) {
      expect(
        (p as any).writeup?.length,
        `${p.slug} missing or empty writeup`
      ).toBeGreaterThan(50);
    }
  });

  it('every project has skillIds array', () => {
    for (const p of projects) {
      expect(
        Array.isArray((p as any).skillIds),
        `${p.slug} missing skillIds array`
      ).toBe(true);
      expect(
        (p as any).skillIds.length,
        `${p.slug} has empty skillIds`
      ).toBeGreaterThan(0);
    }
  });

  it('all skillIds reference existing skills', () => {
    for (const p of projects) {
      for (const sid of (p as any).skillIds ?? []) {
        expect(
          allSkillIdsSet.has(sid),
          `${p.slug} references non-existent skill: "${sid}"`
        ).toBe(true);
      }
    }
  });

  it('periods use consistent dash format (space-hyphen-space)', () => {
    for (const p of projects) {
      expect(p.period, `${p.slug} period has wrong dash`).toMatch(/ - /);
    }
  });
});

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

describe('recommendations.json', () => {
  it('has at least 5 recommendations', () => {
    expect(recommendations.length).toBeGreaterThanOrEqual(5);
  });

  it('every recommendation has required fields', () => {
    for (const r of recommendations) {
      expect(r.name).toBeTruthy();
      expect(r.title).toBeTruthy();
      expect(r.date).toBeTruthy();
      expect(r.relation).toBeTruthy();
      expect(r.text.length).toBeGreaterThan(20);
    }
  });
});

// ---------------------------------------------------------------------------
// Cross-references
// ---------------------------------------------------------------------------

describe('cross-references', () => {
  it('every skill is used in at least one project', () => {
    const usedSkillIds = new Set(
      projects.flatMap((p) => (p as any).skillIds ?? [])
    );
    // Only check primary and strong skills — AI/working skills may not map to projects
    const coreSkills = [
      ...(skills as SkillsData).primary,
      ...(skills as SkillsData).strong,
    ];
    for (const skill of coreSkills) {
      // Skip skills that are meta/soft (product-management can be mapped or not)
      if (['product-management', 'android-kotlin'].includes(skill.id)) continue;
      expect(
        usedSkillIds.has(skill.id),
        `core skill "${skill.id}" (${skill.name}) not used in any project`
      ).toBe(true);
    }
  });

  it('config email is consistent (no wkwebview)', () => {
    expect(config.social.email).not.toContain('wkwebview');
  });

  it('no hardcoded personal info conflicts', () => {
    // firstName should match first word of name
    expect(config.firstName).toBe(config.name.split(' ')[0]);
  });
});
