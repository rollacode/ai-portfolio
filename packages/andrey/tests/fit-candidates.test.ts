import { describe, it, expect, vi } from 'vitest';
import { candidateSources, scoreBoard, type FitBoard } from '@ai-portfolio/core/lib/evidence/fit';

const skills = { id: 'skills', name: 'Portfolio skills', terms: ['Python', 'Kafka?'], text: '{}' };
const sos = { id: 'sos-portal', project: 'sos-portal', name: 'SOS Portal', terms: ['ASP.NET'], text: 'SOS Portal\nTeam Lead (17 people)\n2020' };
const rekap = { id: 'rekap', project: 'rekap', name: 'REKAP', terms: ['Python', 'Redis'], text: 'REKAP\nProduct Developer\n2025' };
const probabilities = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 1 };

describe('fit board candidates', () => {
  it('adds led projects for a leadership requirement even when extraction picked the skills list', () => {
    expect(candidateSources('lead two engineers', skills, [skills, rekap, sos]).map((s) => s.id)).toEqual(['skills', 'sos-portal']);
  });

  it('adds projects whose stack names the requirement', () => {
    expect(candidateSources('Redis', skills, [skills, sos, rekap]).map((s) => s.id)).toEqual(['skills', 'rekap']);
  });

  it('scores every candidate in one Jev call and keeps one pair per candidate', async () => {
    const board: FitBoard = { requestId: 'r', role: 'Engineer', company: '', description: 'lead two engineers', evidence: [skills, sos, rekap], pairs: [], available: false,
      requirements: [{ id: 'r1', text: 'lead two engineers', start: 0, end: 18, sourceId: 'skills' }] } as FitBoard;
    const ask = vi.fn().mockImplementation(async ({ questions }) => ({ available: true, answers: Object.fromEntries(Object.keys(questions).map((name) => [name, { type: 'score', score: name === 'r1' ? 0.2 : 3.9, probabilities }])) }));
    const scored = await scoreBoard(board, ask, 'key');
    expect(ask).toHaveBeenCalledTimes(1);
    expect(scored.available).toBe(true);
    expect(scored.pairs.map((p) => [p.requirementId, p.sourceId])).toEqual([['r1', 'skills'], ['r1', 'sos-portal']]);
  });
});
