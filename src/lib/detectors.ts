/**
 * Four independent detectors. Each scores every sentence 0 (reads human) to 1
 * (reads machine-written) from a different signal, so that one detector's blind
 * spot is another's catch. They are heuristics, not a trained model — the UI says so.
 */
import { WORD_RE, type Sentence } from './text';

export type DetectorId = 'rhythm' | 'phrasing' | 'register' | 'voice';

export interface DetectorInfo {
  id: DetectorId;
  name: string;
  weight: number;
  blurb: string;
}

export const DETECTORS: readonly DetectorInfo[] = [
  {
    id: 'rhythm',
    name: 'Rhythm',
    weight: 0.3,
    blurb: 'Sentence lengths that are unusually even',
  },
  {
    id: 'phrasing',
    name: 'Stock phrasing',
    weight: 0.3,
    blurb: 'Transitions and filler typical of chatbots',
  },
  { id: 'register', name: 'Formal register', weight: 0.15, blurb: 'Dense abstract vocabulary' },
  {
    id: 'voice',
    name: 'Personal voice',
    weight: 0.25,
    blurb: 'No contractions, no first person, repeated openers',
  },
];

export type Scores = Record<DetectorId, number>;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const STOCK_PHRASES: readonly RegExp[] = [
  /\b(delve|delves|delving)\b/i,
  /\b(tapestry|testament|multifaceted|myriad|plethora|landscape of|realm of)\b/i,
  /\bit is (important|worth|crucial|essential) to (note|mention|recognize|understand|consider)\b/i,
  /\bplays? an? (crucial|vital|pivotal|significant|key|important) role\b/i,
  /\b(in conclusion|in summary|to summarize|overall,)/i,
  /\b(moreover|furthermore|additionally|consequently|nevertheless|notably)\b/i,
  /\b(leverag(e|es|ing)|harness(es|ing)?|foster(s|ing)?|underscor(e|es|ing)|showcas(e|es|ing))\b/i,
  /\b(ever-evolving|rapidly evolving|fast-paced|in today's|in the modern era|in an era)\b/i,
  /\b(a wide range of|a variety of|a deeper understanding|comprehensive understanding)\b/i,
  /\b(not only .{3,60} but also)\b/i,
  /\b(streamlin(e|es|ing)|robust|seamless(ly)?|holistic|paradigm|synerg(y|ies)|pivotal|intricate)\b/i,
  /\b(can be attributed to|contributes? to|serves? as a|stands? as a)\b/i,
  /\bhighlights? the (importance|need|significance)\b/i,
];

const TRANSITION_OPENERS = new Set([
  'moreover',
  'furthermore',
  'additionally',
  'consequently',
  'however',
  'therefore',
  'thus',
  'overall',
  'ultimately',
  'similarly',
  'notably',
  'importantly',
  'in',
  'while',
  'by',
  'as',
]);

const FIRST_PERSON = /\b(i|i'm|i've|i'd|i'll|my|me|mine|we|our|us|myself)\b/i;
const CONTRACTION = /\b\p{L}+['’](s|t|re|ve|ll|d|m)\b/iu;
const FORMAL_SUFFIX =
  /(tion|tions|ment|ments|ity|ities|ive|ous|ize|ise|ance|ence|ical|ally|ness)$/;

function sentenceWords(s: Sentence): string[] {
  return s.text.toLowerCase().match(WORD_RE) ?? [];
}

/** Coefficient of variation of sentence length in a ±4 window around each sentence. */
function rhythm(sentences: Sentence[]): number[] {
  return sentences.map((_, i) => {
    const from = Math.max(0, i - 4);
    const to = Math.min(sentences.length, i + 5);
    const lens = sentences.slice(from, to).map((s) => s.words);
    if (lens.length < 4) return 0.4;
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    if (mean === 0) return 0.4;
    const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
    const cv = Math.sqrt(variance) / mean;
    // Human prose: cv ≈ 0.55+. Chatbot prose: cv ≈ 0.2–0.35.
    const evenness = clamp01((0.58 - cv) / 0.33);
    // Mid-length sentences (14–30 words) are where models sit.
    const own = sentences[i]?.words ?? 0;
    const midBias = own >= 14 && own <= 32 ? 0.15 : own < 7 ? -0.2 : 0;
    return clamp01(evenness * 0.85 + midBias);
  });
}

function phrasing(sentences: Sentence[]): number[] {
  return sentences.map((s) => {
    let hits = 0;
    for (const re of STOCK_PHRASES) if (re.test(s.text)) hits += 1;
    return hits === 0 ? 0 : hits === 1 ? 0.62 : 0.92;
  });
}

function register(sentences: Sentence[]): number[] {
  return sentences.map((s) => {
    const ws = sentenceWords(s);
    if (ws.length < 5) return 0.3;
    const long = ws.filter((w) => w.length >= 7 && FORMAL_SUFFIX.test(w)).length;
    const ratio = long / ws.length;
    return clamp01((ratio - 0.07) / 0.14);
  });
}

function voice(sentences: Sentence[]): number[] {
  return sentences.map((s, i) => {
    const from = Math.max(0, i - 4);
    const to = Math.min(sentences.length, i + 5);
    const win = sentences.slice(from, to);
    const noContraction = win.some((w) => CONTRACTION.test(w.text)) ? 0 : 1;
    const noPerson = win.some((w) => FIRST_PERSON.test(w.text)) ? 0 : 1;
    const noInformal = win.some((w) => /[!?]|\.{3}|\(|—|;/.test(w.text)) ? 0.4 : 1;
    const first = sentenceWords(s)[0] ?? '';
    const prev = sentenceWords(sentences[i - 1] ?? s)[0];
    const prev2 = sentenceWords(sentences[i - 2] ?? s)[0];
    const repeatedOpener = i > 0 && (first === prev || first === prev2) ? 1 : 0;
    const transition = TRANSITION_OPENERS.has(first) ? 0.6 : 0;
    const own = Math.max(repeatedOpener, transition);
    return clamp01(0.3 * noContraction + 0.3 * noPerson + 0.15 * noInformal + 0.25 * own);
  });
}

/** Run every detector over a run of sentences (a section of the document). */
export function runDetectors(sentences: Sentence[]): Scores[] {
  const r = rhythm(sentences);
  const p = phrasing(sentences);
  const g = register(sentences);
  const v = voice(sentences);
  return sentences.map((_, i) => ({
    rhythm: r[i] ?? 0,
    phrasing: p[i] ?? 0,
    register: g[i] ?? 0,
    voice: v[i] ?? 0,
  }));
}

/** Plain-language reasons a sentence was flagged, strongest first. */
export function explain(scores: Scores): string[] {
  const notes: Record<DetectorId, string> = {
    rhythm: 'Sentence lengths around it are unusually uniform.',
    phrasing: 'Uses stock phrasing common in chatbot output.',
    register: 'Dense with abstract, formal vocabulary.',
    voice: 'No personal voice nearby: no contractions or first person.',
  };
  return (Object.keys(scores) as DetectorId[])
    .filter((k) => scores[k] >= 0.5)
    .sort((a, b) => scores[b] - scores[a])
    .map((k) => notes[k]);
}
