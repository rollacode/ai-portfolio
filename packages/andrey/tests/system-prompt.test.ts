import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSystemPrompt, clearPortfolioContentCache, loadPortfolioContent } from '../../core/src/lib/system-prompt';
const dirs: string[] = [];
function site(name: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-runtime-')); dirs.push(root);
  fs.mkdirSync(path.join(root, 'portfolio'));
  fs.writeFileSync(path.join(root, 'portfolio/config.json'), JSON.stringify({ name }));
  fs.writeFileSync(path.join(root, 'portfolio/projects.json'), JSON.stringify([{ slug: name, name, role: 'Team Lead (17 people)', description: 'Launched in Brazil', highlights: ['Delivered in 6 months'], period: '2020', stack: ['ASP.NET'], writeup: 'Full writeup retained' }]));
  return root;
}
afterEach(() => { vi.unstubAllEnvs(); clearPortfolioContentCache(); for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });
describe('prompt content isolation', () => {
  it('defaults to full data and compacts each project to exactly two nonempty lines', () => {
    const root = site('SOS');
    const full = loadPortfolioContent(root);
    const compact = loadPortfolioContent(root, { includeProjectWriteups: false, projectSummaryLines: 2 });
    expect(full).toContain('Full writeup retained'); expect(compact).not.toContain('Full writeup');
    expect(compact.split('use these slugs with show_project tool)')[1].trim().split('\n').filter(Boolean)).toHaveLength(2);
    for (const fact of ['17 people', 'Brazil', '6 months', 'ASP.NET']) expect(compact).toContain(fact);
    expect(loadPortfolioContent(root)).toBe(full);
    expect(buildSystemPrompt(p => p.portfolioContent, root)).toBe(full);
  });
  it('caches by absolute site/options, with explicit clear and development refresh', () => {
    const one = site('one'), two = site('two');
    expect(loadPortfolioContent(one)).not.toBe(loadPortfolioContent(two));
    const before = loadPortfolioContent(one);
    fs.writeFileSync(path.join(one, 'portfolio/config.json'), JSON.stringify({ name: 'changed' }));
    expect(loadPortfolioContent(one)).toBe(before);
    clearPortfolioContentCache(); expect(loadPortfolioContent(one)).toContain('changed');
    vi.stubEnv('NODE_ENV', 'development');
    fs.writeFileSync(path.join(one, 'portfolio/config.json'), JSON.stringify({ name: 'dev-refresh' }));
    expect(loadPortfolioContent(one)).toContain('dev-refresh');
  });
  it('retains the actual SOS grounding in compact Andrey content', () => {
    const compact = loadPortfolioContent(process.cwd(), { includeProjectWriteups: false, projectSummaryLines: 2 });
    const sos = compact.split('## SOS Portal')[1].split('\n\n')[0];
    for (const fact of ['Team Lead (17 people)', 'Brazil', '6 months', 'ASP.NET']) expect(sos).toContain(fact);
  });
});
