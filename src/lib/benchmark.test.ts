import { describe, expect, it } from 'vitest';
import { analyze } from './analyze';
import { CORPUS } from '../../eval/corpus';

function auc(pos: number[], neg: number[]): number {
  let w = 0;
  for (const p of pos) for (const n of neg) w += p > n ? 1 : p === n ? 0.5 : 0;
  return w / (pos.length * neg.length);
}

const scored = await Promise.all(CORPUS.map(async (p) => ({ p, a: await analyze(p.text) })));

describe('labelled benchmark (hand-written corpus; regression floor, not proof of accuracy)', () => {
  it('never labels a human passage "Likely AI" — a false accusation is the costly error', () => {
    const bad = scored.filter((x) => x.p.label === 'human' && x.a.label === 'Likely AI');
    expect(bad.map((x) => x.p.id)).toEqual([]);
  });

  it('keeps AUC high on every split', () => {
    for (const [split, floor] of [
      ['tune', 0.95],
      ['holdout', 0.9],
      ['blind', 0.8],
    ] as const) {
      const r = scored.filter((x) => x.p.split === split);
      const a = auc(
        r.filter((x) => x.p.label === 'ai').map((x) => x.a.score),
        r.filter((x) => x.p.label === 'human').map((x) => x.a.score),
      );
      expect(a, split).toBeGreaterThanOrEqual(floor);
    }
  });

  it('caps formal, phrase-free prose at Mixed and says why', () => {
    const legal = scored.find((x) => x.p.id === 'hb-5');
    expect(legal?.a.styleOnly).toBe(true);
    expect(legal?.a.label).toBe('Mixed');
  });
});
