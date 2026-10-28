import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildSystemPromptText } from '../prompts/system';
import projects from '../portfolio/projects.json';

const calls = vi.hoisted(() => ({ build: vi.fn(), load: vi.fn() }));
vi.mock('@ai-portfolio/core/lib/system-prompt', async (importOriginal) => {
  const real = await importOriginal<typeof import('@ai-portfolio/core/lib/system-prompt')>();
  return {
    ...real,
    // Local dependency adapter: prove wrapper forwarding, not core formatting.
    buildSystemPrompt: calls.build.mockImplementation((builder, basePath, options) =>
      builder({ name: 'Andrey Kovalev', firstName: 'Andrey', personality: '', greetingHint: '',
        portfolioContent: JSON.stringify({ basePath, options }) })),
    loadPortfolioContent: calls.load.mockImplementation(real.loadPortfolioContent),
  };
});
import { buildSystemPrompt, loadPortfolioContent } from '../lib/system-prompt';

const params = { name: 'Andrey Kovalev', firstName: 'Andrey', personality: '', greetingHint: '', portfolioContent: 'SOURCE CONTENT' };
const policy = buildSystemPromptText(params);

describe('Andrey wrapper contract (local dependency adapter)', () => {
  it('opts chat alone into the frozen compact content contract', () => {
    buildSystemPrompt();
    expect(calls.build).toHaveBeenLastCalledWith(buildSystemPromptText, undefined, {
      includeProjectWriteups: false, projectSummaryLines: 2,
    });
  });

  it('leaves non-chat full loading unchanged, including SOS narrative', () => {
    const content = loadPortfolioContent();
    expect(calls.load).toHaveBeenLastCalledWith();
    expect(content).toContain(projects.find(p => p.slug === 'sos-portal')!.writeup);
    for (const project of projects) {
      if (project.writeup) expect(content).toContain(project.writeup);
    }
  });

  it('forwards an explicit portfolio base path with the chat diet options', () => {
    const basePath = path.resolve('../andrey');
    buildSystemPrompt(basePath);
    expect(calls.build).toHaveBeenLastCalledWith(buildSystemPromptText, basePath, {
      includeProjectWriteups: false, projectSummaryLines: 2,
    });
  });

  it('does not feed visitor or classifier state into the cached prefix', () => {
    const buildWithIgnoredHint = buildSystemPrompt as (basePath?: string, ...args: unknown[]) => string;
    const first = buildWithIgnoredHint(undefined, { visitorType: 'recruiter', language: 'ru', leadScore: 4 });
    const second = buildWithIgnoredHint(undefined, { visitorType: 'developer', language: 'en', leadScore: 0 });
    expect(first).toBe(second);
    expect(calls.build.mock.calls.every(call => call.length === 3)).toBe(true);
    expect(first).not.toContain('leadScore');
  });
});

describe('ordered conversation policy (static supporting evidence)', () => {
  it('prioritizes full-JD matching and distinguishes deferred board commentary', () => {
    expect(policy).toContain('match_job is the FIRST action');
    expect(policy).toContain('ONLY panel tool');
    expect(policy).toContain('FULL description as provided');
    expect(policy).toContain('Otherwise preserve the legacy flow');
    expect(policy).toContain('Never claim a computed fit before that result exists');
  });

  it('keeps spotlight-first and simple panel routing coherent', () => {
    expect(policy).toContain('show_spotlight() FIRST');
    expect(policy).toContain('show_projects({filter: "leadership"}), not timeline');
    for (const tool of ['show_project', 'show_skills', 'show_contact', 'show_resume', 'show_recommendations', 'play_game', 'set_theme', 'start_showtime']) {
      expect(policy).toContain(tool);
    }
    expect(policy).not.toContain('ALWAYS USE TOOLS');
    expect(policy).not.toContain('HIGHLIGHT EVERYTHING');
  });

  it('uses the optional hint only as advisory context, with grounded fallback', () => {
    expect(policy).toContain('advisory only');
    expect(policy).toContain('If absent, unavailable or late, use conversation history directly');
    expect(policy).toContain('only later unsent rounds');
    expect(policy).toContain('never to certify facts');
    expect(policy).toContain('never for contact details');
    expect(policy).toContain('do not routinely ask for identity');
    expect(policy).toContain('cross-machine shared memory is roadmap');
  });

  it('keeps lean-source deep dives honest and preserves supplied content verbatim', () => {
    expect(policy).toContain('open the complete project panel');
    expect(policy).toContain('Do not imply you read omitted details');
    expect(policy).toContain('Welcome suitable consulting, contract and full-time employment enquiries');
    expect(policy.endsWith('SOURCE CONTENT')).toBe(true);
  });

  it('makes the observed tool repairs explicit without changing the independent oracle', () => {
    expect(policy).toContain('ENTIRE ORIGINAL MESSAGE VERBATIM');
    expect(policy).toContain('drop the request suffix');
    expect(policy).toContain('OWN role');
    expect(policy).toContain('without match_job');
    expect(policy).toContain('ALWAYS follow with highlight_skill');
    expect(policy).toContain('experience WORKING AT A COMPANY -> show_timeline()');
    expect(policy).toContain('scroll_timeline_to({company: "Trax Retail"})');
  });

  it('anchors leadership and deep dives in checked source facts with explicit uncertainty', () => {
    const sos = projects.find(p => p.slug === 'sos-portal')!;
    const performica = projects.find(p => p.slug === 'performica')!;
    expect(sos.role).toContain('17 people');
    expect(performica.writeup).toContain('Out of 7 engineers');
    expect(sos.writeup).toContain('Binah (video consultation platform)');
    expect(policy).toContain('BOTH SOS Portal (Team Lead, 17 people) and Performica');
    expect(policy).toContain('team of 7 engineers');
    expect(policy).toContain('unverified in the portfolio');
    expect(policy).toContain('project panel retains the FULL writeup');
    expect(policy).toContain('Binah, the video consultation platform');
    expect(policy).toContain('never say the full portfolio lacks architecture notes');
  });
});

describe('real core compact-content integration', () => {
  it('omits writeups and retains two grounded project lines while full load stays full', async () => {
    const core = await vi.importActual<typeof import('@ai-portfolio/core/lib/system-prompt')>('@ai-portfolio/core/lib/system-prompt');
    const options = { includeProjectWriteups: false, projectSummaryLines: 2 };
    const compact = core.loadPortfolioContent(undefined, options);
    const full = core.loadPortfolioContent();
    const chat = core.buildSystemPrompt(buildSystemPromptText, undefined, options);
    expect(chat.endsWith(compact)).toBe(true);
    const index = compact.split('# Projects Index')[1].split('\n\n---')[0];
    const sections = index.split(/\n## /).slice(1);
    expect(sections).toHaveLength(projects.length);
    projects.forEach((project, i) => {
      const lines = sections[i].trim().split('\n').filter(Boolean);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain(project.slug);
      expect(lines[0]).toContain(project.name);
      expect(lines[1]).toContain(project.role);
      expect(lines[1]).toContain(project.description);
      for (const stack of project.stack) expect(lines[1]).toContain(stack);
      if (project.writeup) {
        expect(compact).not.toContain(project.writeup);
        expect(full).toContain(project.writeup);
      }
    });
    expect(index).toContain('17');
    expect(index).toContain('6 months');
    expect(index).toContain('ASP.NET');
    expect(compact.length).toBeLessThan(full.length);
  });

  it('keeps Anya and ordinary builder defaults full after compact Andrey loading', async () => {
    const core = await vi.importActual<typeof import('@ai-portfolio/core/lib/system-prompt')>('@ai-portfolio/core/lib/system-prompt');
    core.loadPortfolioContent(undefined, { includeProjectWriteups: false, projectSummaryLines: 2 });
    for (const base of [process.cwd(), path.resolve('../anya')]) {
      expect(core.buildSystemPrompt(p => p.portfolioContent, base)).toBe(core.loadPortfolioContent(base));
    }
  });
});
