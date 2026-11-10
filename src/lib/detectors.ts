/**
 * Per-sentence detectors.
 *
 * These decide *which sentences get highlighted*, not the overall score — the
 * overall score comes from document-level evidence in `signals.ts`, which is
 * far more reliable than anything a single sentence can tell you.
 *
 * Each detector scores a sentence from 0 (reads human) to 1 (reads
 * machine-written) from a different signal, so one detector's blind spot is
 * another's catch. They are heuristics, not a trained model — the UI says so.
 */
import {
  ANTITHESIS,
  CONTRACTION,
  FIRST_PERSON,
  HEDGE,
  LEXICON_COMMON,
  LEXICON_STRONG,
  NUMERAL,
  SCAFFOLDING,
  STOCK_PHRASES,
  TRIAD,
  UNSOURCED,
  clamp01,
  count,
  ramp,
} from './signals';
import { WORD_RE, type Sentence } from './text';

export type DetectorId = 'rhythm' | 'phrasing' | 'register' | 'voice' | 'scaffolding';

export interface DetectorInfo {
  id: DetectorId;
  name: string;
  weight: number;
  blurb: string;
}

export const DETECTORS: readonly DetectorInfo[] = [
  {
    id: 'phrasing',
    name: 'Stock phrasing',
    weight: 0.3,
    blurb: 'Vocabulary and set phrases typical of chatbots',
  },
  {
    id: 'scaffolding',
    name: 'Staged delivery',
    weight: 0.25,
    blurb: 'Rhetorical staging and "not just X, but Y" reversals',
  },
  {
    id: 'rhythm',
    name: 'Rhythm',
    weight: 0.17,
    blurb: 'Sentence lengths that are unusually even',
  },
  {
    id: 'voice',
    name: 'Personal voice',
    weight: 0.16,
    blurb: 'No contractions, no first person, no concrete detail',
  },
  { id: 'register', name: 'Formal register', weight: 0.12, blurb: 'Dense abstract vocabulary' },
];

export type Scores = Record<DetectorId, number>;

const FORMAL_SUFFIX =
  /(tion|tions|ment|ments|ity|ities|ive|ous|ize|ise|ance|ence|ical|ally|ness)$/;

function sentenceWords(s: Sentence): string[] {
  return s.text.toLowerCase().match(WORD_RE) ?? [];
}

/** Capitalised words that are not sentence-initial, plus numerals: concrete detail. */
function concreteHits(s: Sentence): number {
  const tokens = s.text.trim().split(/\s+/).slice(1);
  let n = count(s.text, NUMERAL);
  for (const t of tokens) if (/^[A-Z][a-z]{2,}/.test(t)) n += 1;
  return n;
}

/**
 * Coefficient of variation of sentence length in a ±4 window. Uniform lengths
 * read as machine-written; this is deliberately a *local* measure, so a
 * uniform passage inside otherwise varied prose still shows up.
 */
function rhythm(sentences: Sentence[]): number[] {
  return sentences.map((_, i) => {
    const from = Math.max(0, i - 4);
    const to = Math.min(sentences.length, i + 5);
    const lens = sentences.slice(from, to).map((s) => s.words);
    if (lens.length < 4) return 0.35;
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    if (mean === 0) return 0.35;
    const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
    const cv = Math.sqrt(variance) / mean;
    // Human prose: cv ≈ 0.55+. Chatbot prose: cv ≈ 0.2–0.35.
    const evenness = ramp(0.58 - cv, 0, 0.33);
    // Mid-length sentences (14–32 words) are where models sit.
    const own = sentences[i]?.words ?? 0;
    const midBias = own >= 14 && own <= 32 ? 0.15 : own < 7 ? -0.2 : 0;
    return clamp01(evenness * 0.85 + midBias);
  });
}

/**
 * Stock vocabulary and set phrases. Scored by density rather than as a flat
 * hit/no-hit, so a sentence packed with them outranks one that merely contains
 * a single ordinary word like "significant".
 */
function phrasing(sentences: Sentence[]): number[] {
  return sentences.map((s) => {
    const n = Math.max(6, sentenceWords(s).length);
    const strong = count(s.text, LEXICON_STRONG);
    const common = count(s.text, LEXICON_COMMON);
    const stock = count(s.text, STOCK_PHRASES);
    const extra = count(s.text, TRIAD) + count(s.text, UNSOURCED);
    // Weighted hits per word, so long and short sentences compare fairly.
    const density = (2.4 * strong + 1 * common + 2.2 * stock + 1.2 * extra) / n;
    return ramp(density, 0.012, 0.13);
  });
}

/** Abstract, nominalised vocabulary and hedging. */
function register(sentences: Sentence[]): number[] {
  return sentences.map((s) => {
    const ws = sentenceWords(s);
    if (ws.length < 5) return 0.25;
    const long = ws.filter((w) => w.length >= 7 && FORMAL_SUFFIX.test(w)).length;
    const abstraction = ramp(long / ws.length, 0.07, 0.21);
    const hedged = ramp(count(s.text, HEDGE) / ws.length, 0.02, 0.1);
    return clamp01(abstraction * 0.75 + hedged * 0.25);
  });
}

/**
 * Absence of a person behind the prose. Measured as *rates* across a window,
 * not as "does any nearby sentence contain a contraction" — a single
 * contraction in nine sentences says very little, and treating it as proof of
 * humanity was why chat-style AI text used to slip through.
 */
function voice(sentences: Sentence[]): number[] {
  return sentences.map((s, i) => {
    const from = Math.max(0, i - 4);
    const to = Math.min(sentences.length, i + 5);
    const win = sentences.slice(from, to);
    const winWords = Math.max(
      20,
      win.reduce((a, w) => a + w.words, 0),
    );
    const rate = (re: RegExp) => win.reduce((a, w) => a + count(w.text, re), 0) / winWords;

    // Each term is 1 when the human marker is absent, 0 when it is common.
    const impersonal = 1 - ramp(rate(FIRST_PERSON), 0.002, 0.025);
    const uncontracted = 1 - ramp(rate(CONTRACTION), 0.003, 0.03);
    const abstract =
      1 - ramp(win.reduce((a, w) => a + concreteHits(w), 0) / winWords, 0.01, 0.06);

    const first = sentenceWords(s)[0] ?? '';
    const prev = sentenceWords(sentences[i - 1] ?? s)[0];
    const prev2 = sentenceWords(sentences[i - 2] ?? s)[0];
    const repeatedOpener = i > 0 && (first === prev || first === prev2) ? 1 : 0;

    return clamp01(
      0.3 * impersonal + 0.25 * uncontracted + 0.3 * abstract + 0.15 * repeatedOpener,
    );
  });
}

/** Rhetorical staging and antithesis — the fingerprint of chat-style models. */
function scaffolding(sentences: Sentence[]): number[] {
  return sentences.map((s, i) => {
    const hits = count(s.text, SCAFFOLDING) + count(s.text, ANTITHESIS);
    const own = hits === 0 ? 0 : hits === 1 ? 0.7 : 1;
    // A very short sentence or a bare question used as a pivot.
    const pivot = (s.words <= 16 && /\?/.test(s.text)) || s.words <= 8 ? 0.35 : 0;
    const neighbour = i > 0 && count(sentences[i - 1]?.text ?? '', SCAFFOLDING) > 0 ? 0.2 : 0;
    const emDash = /—|\s--\s/.test(s.text) ? 0.25 : 0;
    return clamp01(Math.max(own, pivot) + neighbour * 0.5 + emDash);
  });
}

/** Run every detector over a run of sentences (a section of the document). */
export function runDetectors(sentences: Sentence[]): Scores[] {
  const r = rhythm(sentences);
  const p = phrasing(sentences);
  const g = register(sentences);
  const v = voice(sentences);
  const c = scaffolding(sentences);
  return sentences.map((_, i) => ({
    rhythm: r[i] ?? 0,
    phrasing: p[i] ?? 0,
    register: g[i] ?? 0,
    voice: v[i] ?? 0,
    scaffolding: c[i] ?? 0,
  }));
}

/** Plain-language reasons a sentence was flagged, strongest first. */
export function explain(scores: Scores): string[] {
  const notes: Record<DetectorId, string> = {
    rhythm: 'Sentence lengths around it are unusually uniform.',
    phrasing: 'Uses vocabulary and set phrases common in chatbot output.',
    register: 'Dense with abstract, formal vocabulary.',
    voice: 'No personal voice nearby: no contractions, first person or concrete detail.',
    scaffolding: 'Rhetorical staging of the kind chat models use to organise an argument.',
  };
  return (Object.keys(scores) as DetectorId[])
    .filter((k) => scores[k] >= 0.5)
    .sort((a, b) => scores[b] - scores[a])
    .map((k) => notes[k]);
}
