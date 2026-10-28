import { describe, it, expect } from 'vitest';
import fixture from '../fixtures/claim-calibration.json';
import { CALIBRATION } from '../../core/src/lib/evidence/receipts';
describe('frozen claim calibration', () => {
  it('has 30 fixed labels and a 20/10 split before tuning', () => {
    expect(fixture.cases).toHaveLength(30);
    for (const label of ['supported','unsupported','interpretive']) expect(fixture.cases.filter(c=>c.label===label)).toHaveLength(10);
    expect(fixture.cases.filter(c=>c.split==='development')).toHaveLength(20);
    expect(fixture.cases.filter(c=>c.split==='held-out')).toHaveLength(10);
    expect(new Set(fixture.cases.map(c=>c.id)).size).toBe(30);
    for(const c of fixture.cases) expect(c.sourceIds.every(id=>fixture.evidence.some(e=>e.id===id))).toBe(true);
  });
  it('records the explicitly reviewed v1 pilot threshold', () => { expect(CALIBRATION.enabled).toBe(true); expect(CALIBRATION.supported).toBe(0.7); expect(CALIBRATION.version).toBe(fixture.version); });
});
