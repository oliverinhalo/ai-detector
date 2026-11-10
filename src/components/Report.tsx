import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Analysis, flaggedCount } from '../lib/analyze';
import { DETECTORS, explain } from '../lib/detectors';

interface Props {
  analysis: Analysis;
  name: string;
  sensitivity: number;
  onSensitivity: (n: number) => void;
}

const strength = (p: number, threshold: number): 0 | 1 | 2 | 3 => {
  if (p < threshold) return 0;
  if (p >= Math.max(0.9, threshold + 0.2)) return 3;
  if (p >= Math.max(0.75, threshold + 0.1)) return 2;
  return 1;
};
const STRENGTH_LABEL = ['', 'possibly AI', 'likely AI', 'very likely AI'] as const;

export function Report({ analysis, name, sensitivity, onSensitivity }: Props) {
  const { results, paragraphs } = analysis;
  const [selected, setSelected] = useState<number | null>(null);
  const flagged = useMemo(
    () => results.filter((r) => r.probability >= sensitivity).map((r) => r.id),
    [results, sensitivity],
  );
  const count = flaggedCount(results, sensitivity);
  const refs = useRef(new Map<number, HTMLElement>());

  const jump = useCallback(
    (dir: 1 | -1) => {
      if (flagged.length === 0) return;
      const cur = selected === null ? -1 : flagged.findIndex((id) => id >= selected);
      let idx: number;
      if (selected === null) idx = dir === 1 ? 0 : flagged.length - 1;
      else if (dir === 1) idx = flagged[cur] === selected ? cur + 1 : cur;
      else idx = (cur === -1 ? flagged.length : cur) - 1;
      idx = (idx + flagged.length) % flagged.length;
      const id = flagged[idx];
      if (id === undefined) return;
      setSelected(id);
      const el = refs.current.get(id);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: 'center' });
    },
    [flagged, selected],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n') jump(1);
      else if (e.key === 'p') jump(-1);
      else if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump]);

  const sel = selected === null ? null : results[selected];
  const tone = analysis.score >= 60 ? 3 : analysis.score >= 35 ? 2 : 1;

  return (
    <section aria-labelledby="report-h" className="mt-8">
      <h2 id="report-h" className="sr-only">
        Results for {name}
      </h2>

      {!analysis.reliable && (
        <p
          role="status"
          className="mb-4 rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface-sunken)] p-3 text-sm"
        >
          <strong>Too short to judge reliably.</strong> Detectors need roughly 150 words or
          more; treat this score as a guess.
        </p>
      )}

      {analysis.styleOnly && (
        <p
          role="status"
          className="mb-4 rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface-sunken)] p-3 text-sm"
        >
          <strong>Style signals only.</strong> This reads formal and even, but none of the stock
          phrasing chatbots lean on turned up. Careful human writing (legal, scientific,
          minutes) looks like this too, so it is shown as Mixed, not Likely AI.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-sm)] sm:min-w-52">
          <p className="text-sm text-[var(--text-muted)]">AI score</p>
          <p
            className="tnum mt-1 text-6xl leading-none font-semibold tracking-tight"
            data-testid="score"
          >
            {analysis.score}
            <span className="text-2xl text-[var(--text-faint)]">/100</span>
          </p>
          <p
            className="mt-3 inline-block rounded-full px-3 py-1 text-sm font-medium"
            style={{ background: `var(--hl-${tone})`, color: 'var(--hl-ink)' }}
            data-testid="label"
          >
            {analysis.label}
          </p>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {analysis.words.toLocaleString()} words · {analysis.sections} section
            {analysis.sections === 1 ? '' : 's'}
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-sm)]">
          <h3 className="text-sm font-semibold">Five detectors, averaged</h3>
          <ul className="mt-3 space-y-2">
            {DETECTORS.map((d) => {
              const v = analysis.detectorMeans[d.id];
              return (
                <li
                  key={d.id}
                  className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm"
                >
                  <span title={d.blurb}>{d.name}</span>
                  <span
                    className="h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full bg-[var(--accent)]"
                      style={{ width: `${Math.round(v * 100)}%` }}
                    />
                  </span>
                  <span className="tnum text-right text-[var(--text-muted)]">
                    {Math.round(v * 100)}%
                  </span>
                </li>
              );
            })}
          </ul>
          <label className="mt-4 block text-sm">
            <span className="font-semibold">Sensitivity</span>{' '}
            <span className="text-[var(--text-muted)]">
              — highlighting sentences at {Math.round(sensitivity * 100)}% or more
            </span>
            <input
              type="range"
              min={30}
              max={90}
              step={5}
              value={Math.round(sensitivity * 100)}
              onChange={(e) => onSensitivity(Number(e.target.value) / 100)}
              className="mt-1 block w-full accent-[var(--accent)]"
            />
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm">
          <strong className="tnum">{count}</strong> of {results.length.toLocaleString()}{' '}
          sentences highlighted
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => jump(-1)} disabled={count === 0} className="btn">
            Previous <kbd>p</kbd>
          </button>
          <button type="button" onClick={() => jump(1)} disabled={count === 0} className="btn">
            Next <kbd>n</kbd>
          </button>
        </div>
      </div>

      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Key: <mark className="hl hl-1">possibly</mark> <mark className="hl hl-2">likely</mark>{' '}
        <mark className="hl hl-3">very likely</mark>. Select a highlight to see why.
      </p>

      <article
        aria-label="Document with highlights"
        className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-5 font-[family-name:var(--font-serif)] text-[length:var(--t-lg)] leading-8 shadow-[var(--shadow-sm)] sm:p-8"
      >
        {paragraphs.map((ids, pi) => (
          <p key={pi} className="doc-p mb-5 last:mb-0">
            {ids.map((id) => {
              const r = results[id];
              if (!r) return null;
              const s = strength(r.probability, sensitivity);
              if (s === 0) return <span key={id}>{r.text}</span>;
              return (
                <mark
                  key={id}
                  ref={(el) => {
                    if (el) refs.current.set(id, el);
                    else refs.current.delete(id);
                  }}
                  tabIndex={-1}
                  onClick={() => setSelected(id)}
                  className={`hl hl-${s}${selected === id ? ' hl-selected' : ''}`}
                  data-strength={s}
                >
                  <span className="sr-only">[{STRENGTH_LABEL[s]}: </span>
                  {r.text}
                  <span className="sr-only">]</span>
                </mark>
              );
            })}
          </p>
        ))}
      </article>

      {sel && (
        <aside
          aria-label="Why this sentence was flagged"
          className="sticky bottom-3 mt-4 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow)]"
        >
          <p className="text-sm font-semibold">
            Sentence {sel.id + 1} ·{' '}
            <span className="tnum">{Math.round(sel.probability * 100)}%</span> AI-like
          </p>
          {explain(sel.scores).length === 0 ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              No single detector stood out; this reads as human.
            </p>
          ) : (
            <ul className="mt-1 list-disc pl-5 text-sm text-[var(--text-muted)]">
              {explain(sel.scores).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </section>
  );
}
