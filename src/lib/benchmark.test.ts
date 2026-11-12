/**
 * Benchmark regression floors.
 *
 * Two corpora, and the difference between them matters:
 *
 *   - `eval/corpus.ts` was used while fitting the detectors. Its `blind` split
 *     stopped being blind the moment it was used to diagnose a failure. Scores
 *     here are an upper bound, not an estimate of accuracy.
 *   - `eval/validation.ts` was written after the last tuning change and is not
 *     used to adjust anything. It is the honest estimate, and its floor is set
 *     accordingly — far below the fitted corpus, because that is the truth.
 *
 * The floors sit a little under what the detectors currently achieve, so this
 * catches regressions without failing on noise. Raising a floor is fine.
 * Lowering one is a decision to ship a worse detector and should be argued for
 * in the commit that does it.
 */
import { describe, expect, it } from 'vitest';
import { analyze, type Analysis } from './analyze';
import { CORPUS, type Passage } from '../../eval/corpus';
import { VALIDATION } from '../../eval/validation';

function auc(pos: number[], neg: number[]): number {
  let w = 0;
  for (const p of pos) for (const n of neg) w += p > n ? 1 : p === n ? 0.5 : 0;
  return w / (pos.length * neg.length);
}

const scored = await Promise.all(CORPUS.map(async (p) => ({ p, a: await analyze(p.text) })));
const held = await Promise.all(
  VALIDATION.map(async (p) => ({ p: p as Omit<Passage, 'split'>, a: await analyze(p.text) })),
);
const scoresFor = (rows: { p: { label: string }; a: Analysis }[], label: string) =>
  rows.filter((x) => x.p.label === label).map((x) => x.a.score);

describe('benchmark: false accusations', () => {
  it('never labels a human passage "Likely AI" — a false accusation is the costly error', () => {
    const bad = [...scored, ...held].filter(
      (x) => x.p.label === 'human' && x.a.label === 'Likely AI',
    );
    expect(bad.map((x) => x.p.id)).toEqual([]);
  });

  it('does not convict formal, phrase-free human prose on its rhythm alone', () => {
    // Legal drafting and committee minutes are uniform, impersonal and hedged —
    // everything the style signals look for, and no evidence of a machine.
    for (const id of ['hb-5', 'h-formal-human-1', 'v-human-flat-report']) {
      const row = [...scored, ...held].find((x) => x.p.id === id);
      expect(row, id).toBeDefined();
      expect(row?.a.label, id).not.toBe('Likely AI');
      expect(row?.a.score, id).toBeLessThan(50);
    }
  });
});

describe('benchmark: fitted corpus (upper bound, not accuracy)', () => {
  it.each([
    ['tune', 0.95],
    ['holdout', 0.95],
    ['blind', 0.95],
  ])('keeps AUC at or above the floor on the %s split', (split, floor) => {
    const r = scored.filter((x) => x.p.split === split);
    expect(auc(scoresFor(r, 'ai'), scoresFor(r, 'human'))).toBeGreaterThanOrEqual(floor);
  });

  it('misses no AI passage as human', () => {
    const missed = scored.filter((x) => x.p.label === 'ai' && x.a.score < 35);
    expect(missed.map((x) => x.p.id)).toEqual([]);
  });
});

describe('benchmark: held-out validation (the honest estimate)', () => {
  it('keeps AUC above the held-out floor', () => {
    // 0.786 at the time of writing. Well short of the fitted corpus's 1.000,
    // which is the point of measuring it separately.
    expect(auc(scoresFor(held, 'ai'), scoresFor(held, 'human'))).toBeGreaterThanOrEqual(0.72);
  });

  it('flags no held-out human passage', () => {
    const flagged = held.filter((x) => x.p.label === 'human' && x.a.score >= 50);
    expect(flagged.map((x) => x.p.id)).toEqual([]);
  });
});

describe('regression: the bug that prompted this', () => {
  it('catches chatbot-register AI that varies its sentence lengths', () => {
    // A fully AI-written page in the conversational register used to score in
    // the single digits with nothing highlighted, because every detector was
    // modelled on essay-bot prose. Both of these are that register.
    for (const id of ['ab-3', 'v-ai-listicle']) {
      const row = [...scored, ...held].find((x) => x.p.id === id);
      expect(row?.a.score, id).toBeGreaterThanOrEqual(40);
    }
  });

  it('says so instead of clearing text it cannot judge', async () => {
    // Flat, impersonal prose carries almost no surface signal either way.
    // "Mostly human" would be a false clearance; the honest answer is a shrug.
    const flat = await analyze(
      'The caching layer operates on a least-recently-used eviction policy with a ' +
        'configurable maximum size. When a request arrives, the system first checks ' +
        'whether a valid entry exists for the given key. If the entry is present and ' +
        'has not expired, it is returned immediately, avoiding an upstream call.',
    );
    expect(flat.inconclusive).toBe(true);
    expect(flat.label).toBe('No clear signal');
  });
});
