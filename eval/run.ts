/* eslint-disable no-console -- CLI report script */
import { analyze } from '../src/lib/analyze';
import { CORPUS } from './corpus';
import { VALIDATION } from './validation';

/** AUC by pairwise comparison. */
function auc(pos: number[], neg: number[]): number {
  if (pos.length === 0 || neg.length === 0) return Number.NaN;
  let w = 0;
  for (const p of pos) for (const n of neg) w += p > n ? 1 : p === n ? 0.5 : 0;
  return w / (pos.length * neg.length);
}

const rows = [];
for (const p of CORPUS) {
  const a = await analyze(p.text);
  rows.push({ id: p.id, label: p.label, split: p.split, score: a.score, verdict: a.label });
}
for (const p of VALIDATION) {
  const a = await analyze(p.text);
  rows.push({ id: p.id, label: p.label, split: 'held-out', score: a.score, verdict: a.label });
}

/**
 * Floors, enforced. A reporting script that cannot fail is a number nobody
 * reads — which is how the previous build shipped with AUC 0.840 and two of
 * five AI passages missed on its own blind split. These match the floors in
 * `src/lib/benchmark.test.ts`; both run in CI, so a regression has to get past
 * two gates. Lowering one is a decision to ship a worse detector.
 */
const FLOORS: Record<string, { auc: number; maxFalseAccusations: number }> = {
  tune: { auc: 0.95, maxFalseAccusations: 0 },
  holdout: { auc: 0.95, maxFalseAccusations: 0 },
  blind: { auc: 0.95, maxFalseAccusations: 0 },
  'held-out': { auc: 0.72, maxFalseAccusations: 0 },
};
const failures: string[] = [];

for (const split of ['tune', 'holdout', 'blind', 'held-out', 'all'] as const) {
  const r = rows.filter((x) => (split === 'all' ? true : x.split === split));
  const ai = r.filter((x) => x.label === 'ai').map((x) => x.score);
  const hu = r.filter((x) => x.label === 'human').map((x) => x.score);
  const fp = r.filter((x) => x.label === 'human' && x.verdict === 'Likely AI').length;
  const fn = ai.filter((s) => s < 35).length;
  const acc = (ai.filter((s) => s >= 50).length + hu.filter((s) => s < 50).length) / r.length;
  const observed = auc(ai, hu);
  console.log(
    `${split.padEnd(9)} n=${String(r.length).padStart(2)} AUC=${observed.toFixed(3)} ` +
      `acc@50=${acc.toFixed(2)} humanFlaggedLikelyAI=${fp}/${hu.length} aiMissedAsHuman=${fn}/${ai.length}`,
  );
  const floor = FLOORS[split];
  if (floor) {
    if (observed < floor.auc)
      failures.push(`${split}: AUC ${observed.toFixed(3)} is below the floor of ${floor.auc}`);
    if (fp > floor.maxFalseAccusations)
      failures.push(
        `${split}: ${fp} human passage(s) labelled "Likely AI"; the limit is ${floor.maxFalseAccusations}`,
      );
  }
}

console.log(
  '\nNote: tune/holdout/blind were all used while fitting the detectors, so only' +
    '\nthe held-out split is an honest estimate. See eval/validation.ts.',
);

if (process.argv.includes('-v'))
  for (const x of rows.sort((a, b) => b.score - a.score))
    console.log(x.label.padEnd(6), String(x.score).padStart(3), x.verdict.padEnd(16), x.id);

if (failures.length > 0) {
  console.error('\nBenchmark floors not met:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exitCode = 1;
}
