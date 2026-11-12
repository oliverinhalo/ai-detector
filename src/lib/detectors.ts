/**
 * Five independent detectors. Each scores every sentence 0 (reads human) to 1
 * (reads machine-written) from a different signal, so that one detector's blind
 * spot is another's catch. They are heuristics, not a trained model — the UI says so.
 */
import { WORD_RE, type Sentence } from './text';

export type DetectorId = 'rhythm' | 'phrasing' | 'register' | 'voice' | 'specificity';

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
    weight: 0.22,
    blurb: 'Sentence lengths that are unusually even',
  },
  {
    id: 'phrasing',
    name: 'Stock phrasing',
    weight: 0.3,
    blurb: 'Transitions and filler typical of chatbots',
  },
  { id: 'register', name: 'Formal register', weight: 0.1, blurb: 'Dense abstract vocabulary' },
  {
    id: 'voice',
    name: 'Personal voice',
    weight: 0.18,
    blurb: 'No contractions, no first person, repeated openers',
  },
  {
    id: 'specificity',
    name: 'Specificity',
    weight: 0.2,
    blurb: 'Generic wording: no figures, names, quotations or concrete detail',
  },
];

export type Scores = Record<DetectorId, number>;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const STOCK_PHRASES: readonly RegExp[] = [
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
  /\b(captivating|breathtaking|unforgettable|transformative|invaluable|unprecedented|profound(ly)?)\b/i,
  /\b(nestled|embark(s|ed|ing)? on|navigat(e|es|ing) (the )?(complex|challeng)|a testament)/i,
  /\b(valuable insights?|diverse perspectives?|essential skills?|long-term (growth|success)|lasting (memories|impact))\b/i,
  /\b(on (the )?one hand|on the other hand|that said,|whether you(['’]re| are)\b)/i,
  /\b(here(['’]s| is) (the )?(thing|secret|deal|truth)|let(['’]s| us) be real|take a deep breath|don(['’]t|t) worry if)\b/i,
  /\b(well on your way|a (rewarding|fulfilling|meaningful) (part|journey|experience)|every (mistake|challenge) is (a|an) (chance|opportunity))\b/i,
  /\b(empowers?|elevate|unlock(s|ing)?|discover the|ultimate (solution|guide)|the power of)\b/i,
  /\b(by (prioritizing|adopting|establishing|fostering|embracing)|ensur(e|es|ing) that)\b/i,
  /\b(a (comprehensive|holistic|balanced|collaborative|multifaceted) (approach|framework|strategy))\b/i,
  /\b(significant (challenges?|implications?|advancements?|impact)|key (innovations?|factors?|takeaways?))\b/i,
];

/**
 * The coaching register of a chatbot answering "how do I get better at X":
 * imperative advice, reassurance, and relentless second person. Humans write
 * how-to prose too, so the second-person term alone is weak and only the
 * advice and reassurance phrasings carry real weight.
 */
export const ADVICE =
  /\b(the key is|remember that|focus on|start by|try to|make sure( to| you)?|be sure to|keep in mind|consider \w+ing|aim to|don'?t be afraid)\b/gi;
export const REASSURANCE =
  /(you'?re not alone|completely normal|don'?t worry|it'?s (okay|ok|fine) to|you'?ve got this|no need to|rest assured|the good news is|you'?re well on your way|that'?s perfectly)/gi;
export const SECOND_PERSON = /\b(you|your|you're|you'll|you've|yours|yourself)\b/gi;

/**
 * The uplift register of model fiction: abstract consolation, the gentle
 * reminder, the deep breath, the embrace of whatever the future held.
 */
export const UPLIFT =
  /\b(quiet promise|everything felt possible|gentle reminder|ready to embrace|whatever the future|deep breath|newfound|sense of (purpose|wonder|belonging|possibility)|a reminder that|the warmth of|bathed in|a testament to|journey of|embrace (the|whatever)|yearning)\b/gi;

/**
 * The closing exhortation of an explainer: "continued investment will be
 * essential to sustaining this momentum", "understanding this process is
 * essential". Also the encyclopedic opener, "X is the process by which Y".
 */
export const ESSENTIAL_CLOSING =
  /\b((will be|is|are|remains?|proves?) (essential|crucial|vital|key|critical|important|fundamental) (to|for|in)\b|challenges remain|understanding (this|these|the) \w+ is|continued \w+ (and|will)|contributing to \w+)/gi;
export const DEFINITIONAL =
  /\b(is the process by which|refers to the|is defined as|can be described as|is a (process|system|method|technique|phenomenon) (that|by which|in which))\b/gi;

/**
 * Register patterns, checked per sentence as well as document-wide. A sentence
 * of chatbot coaching or model uplift carries no stock phrase from the list
 * above, which is how a whole page of it used to read as human.
 */
const REGISTER_PHRASES: readonly RegExp[] = [
  ADVICE,
  REASSURANCE,
  UPLIFT,
  ESSENTIAL_CLOSING,
  DEFINITIONAL,
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
    for (const re of STOCK_PHRASES)
      if (new RegExp(re.source, re.flags.replace('g', '')).test(s.text)) hits += 1;
    for (const re of REGISTER_PHRASES)
      if (new RegExp(re.source, re.flags.replace('g', '')).test(s.text)) hits += 1;
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

const MID_CAPITAL = /(?<=[a-z,;:] )[A-Z][a-z]{2,}/;
const DIGIT = /\d/;
const QUOTE = /["“”]/;

/**
 * Generic text carries no checkable detail. Figures, mid-sentence proper nouns and
 * quotations are evidence of a specific, situated writer; chatbot prose avoids them.
 * Returns high (machine-like) when a ±2 window has none of that.
 */
function specificity(sentences: Sentence[]): number[] {
  const own = sentences.map((s) => {
    let e = 0;
    if (DIGIT.test(s.text)) e += 0.5;
    if (MID_CAPITAL.test(s.text)) e += 0.4;
    if (QUOTE.test(s.text)) e += 0.5;
    return Math.min(1, e);
  });
  return sentences.map((_, i) => {
    const from = Math.max(0, i - 2);
    const to = Math.min(sentences.length, i + 3);
    const win = own.slice(from, to);
    const best = Math.max(...win);
    const mean = win.reduce((a, b) => a + b, 0) / win.length;
    return clamp01(1 - (0.6 * best + 0.4 * Math.min(1, mean * 2.5)));
  });
}

/** Run every detector over a run of sentences (a section of the document). */
export function runDetectors(sentences: Sentence[]): Scores[] {
  const r = rhythm(sentences);
  const p = phrasing(sentences);
  const g = register(sentences);
  const v = voice(sentences);
  const sp = specificity(sentences);
  return sentences.map((_, i) => ({
    rhythm: r[i] ?? 0,
    phrasing: p[i] ?? 0,
    register: g[i] ?? 0,
    voice: v[i] ?? 0,
    specificity: sp[i] ?? 0,
  }));
}

/** Plain-language reasons a sentence was flagged, strongest first. */
export function explain(scores: Scores): string[] {
  const notes: Record<DetectorId, string> = {
    rhythm: 'Sentence lengths around it are unusually uniform.',
    phrasing: 'Uses stock phrasing common in chatbot output.',
    register: 'Dense with abstract, formal vocabulary.',
    voice: 'No personal voice nearby: no contractions or first person.',
    specificity: 'Generic: no figures, names or quotations nearby.',
  };
  return (Object.keys(scores) as DetectorId[])
    .filter((k) => scores[k] >= 0.5)
    .sort((a, b) => scores[b] - scores[a])
    .map((k) => notes[k]);
}
