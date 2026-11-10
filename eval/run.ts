/* eslint-disable no-console -- CLI report script */
import { analyze } from '../src/lib/analyze';
import { CORPUS } from './corpus';

/** AUC by pairwise comparison. */
function auc(pos: number[], neg: number[]): number {
  let w = 0;
  for (const p of pos) for (const n of neg) w += p > n ? 1 : p === n ? 0.5 : 0;
  return w / (pos.length * neg.length);
}

const rows = [];
for (const p of CORPUS) {
  const a = await analyze(p.text);
  rows.push({ p, score: a.score, label: a.label });
}
for (const split of ['tune', 'holdout', 'blind', 'all'] as const) {
  const r = rows.filter((x) => split === 'all' || x.p.split === split);
  const ai = r.filter((x) => x.p.label === 'ai').map((x) => x.score);
  const hu = r.filter((x) => x.p.label === 'human').map((x) => x.score);
  const fp = rows.filter(
    (x) =>
      (split === 'all' || x.p.split === split) &&
      x.p.label === 'human' &&
      x.label === 'Likely AI',
  ).length;
  const fn = ai.filter((s) => s < 35).length;
  const acc = (ai.filter((s) => s >= 50).length + hu.filter((s) => s < 50).length) / r.length;
  console.log(
    `${split.padEnd(8)} n=${r.length} AUC=${auc(ai, hu).toFixed(3)} acc@50=${acc.toFixed(2)} humanFlaggedLikelyAI=${fp}/${hu.length} aiMissedAsHuman=${fn}/${ai.length}`,
  );
}
if (process.argv.includes('-v'))
  for (const x of rows)
    console.log(x.p.label.padEnd(6), String(x.score).padStart(3), x.label.padEnd(12), x.p.id);
