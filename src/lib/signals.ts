/**
 * Document-level evidence.
 *
 * Per-sentence detectors alone cannot tell you much: a single sentence rarely
 * carries enough information, and averaging four weak per-sentence scores
 * dilutes strong evidence into a mediocre number. Most of the reliable signal
 * in AI detection is a *rate* measured across a whole document — how often a
 * stock phrase appears per thousand words, how uniform the sentence lengths
 * are, how much concrete detail there is.
 *
 * So each signal here is normalised to 0–1 and given a signed weight in
 * log-odds. Positive weights are evidence of machine authorship, negative
 * weights are evidence of a human. They are then *summed*, not averaged, so
 * independent pieces of evidence accumulate instead of cancelling out.
 *
 * Two quite different kinds of AI text exist and both have to be caught:
 *
 *   - Essay-bot prose: stock vocabulary, very uniform sentence lengths, no
 *     contractions, no concrete detail. Caught by `lexicon`, `stockPhrases`,
 *     `uniformRhythm`, `midLength`.
 *   - Conversational prose from newer models: deliberately varied sentence
 *     lengths, contractions, short pivot paragraphs, heavy em-dash use and
 *     rhetorical scaffolding ("Let's start with…", "But here's the thing",
 *     "So where does this leave us?"). Caught by `scaffolding`, `antithesis`,
 *     `emDashes`, `pivotParagraphs`.
 *
 * Human writers do use scaffolding and em-dashes, so those signals never
 * convict on their own: `firstPerson` and `concreteness` push back hard in the
 * other direction, which is what separates a chatty human blog post from
 * chatty model output.
 */
import { segment, words, type Sentence } from './text';

export interface Signal {
  id: string;
  /** Short label, for the UI. */
  name: string;
  /** Plain-language description of what was measured. */
  detail: string;
  /** Normalised strength of this signal, 0–1. */
  value: number;
  /** Signed log-odds contribution: positive means AI, negative means human. */
  logOdds: number;
}

/** Strongly AI-skewed vocabulary: uncommon in human prose at any density. */
export const LEXICON_STRONG =
  /\b(delve[sd]?|delving|tapestry|multifaceted|myriad|plethora|pivotal|intricate|holistic|paradigm|synerg(y|ies)|ever-evolving|cutting-edge|game-?changer|meticulous(ly)?|unwavering|beacon|treasure trove|underscor(e|es|ed|ing)|showcas(e|es|ed|ing))\b/gi;

/**
 * Ordinary English words that models reach for far more often than people do.
 * Any one of these is unremarkable; a high rate across a document is not.
 */
export const LEXICON_COMMON =
  /\b(crucial|vital|essential|significant(ly)?|substantial(ly)?|considerabl[ey]|comprehensive|robust|seamless(ly)?|leverag(e|es|ed|ing)|foster(s|ed|ing)?|facilitat(e|es|ed|ing)|enhanc(e|es|ed|ing)|streamlin(e|es|ed|ing)|empower(s|ed|ing)?|harness(es|ed|ing)?|unlock(s|ed|ing)?|elevat(e|es|ed|ing)|resonat(e|es|ed|ing)|compelling|invaluable|transformative|interconnected|constitutes?|encompass(es|ed|ing)?|integral|unprecedented|notably|moreover|furthermore|additionally|consequently|ultimately|thereby|profound(ly)?|nuanced|realm|landscape|navigat(e|es|ed|ing))\b/gi;

/** Multi-word tics of instruction-tuned prose. */
export const STOCK_PHRASES =
  /(\bit is (important|worth|crucial|essential) to (note|mention|recognis|recogniz|understand|consider)|\bplays? an? (crucial|vital|pivotal|significant|key|important|major) (role|part)\b|\bin (conclusion|summary)\b|\bto summari[sz]e\b|\ba wide (range|variety) of\b|\ba (deeper|comprehensive|nuanced) understanding\b|\bnot only\b[^.!?]{3,70}\bbut also\b|\bcan be attributed to\b|\bserves? as a\b|\bstands? as a\b|\bhighlights? the (importance|need|significance)\b|\bin today'?s\b|\bin the modern era\b|\bwhen it comes to\b|\bat the end of the day\b|\bit'?s worth noting\b|\bone of the (most|primary|key|main)\b|\bplays? a (key|major) part\b|\bthe (importance|significance) of\b[^.!?]{0,40}\bcannot be (overstated|understated)\b)/gi;

/** Appeals to evidence that name no source: "studies have shown", "experts say". */
export const UNSOURCED =
  /\b((some |recent |several |numerous |many )?(studies|research|researchers|evidence|data|surveys|reports|analyses)\s+(have |has )?(shown?|found|suggests?|indicates?|demonstrates?|documented|identified|reveals?)|experts (say|argue|believe|suggest)|it (is|has been) (widely )?(believed|argued|suggested|recognised|recognized|acknowledged))\b/gi;

/**
 * Conversational scaffolding: the moves newer models use to stage an argument.
 * Humans use these too, which is why the weight is moderate and `firstPerson`
 * and `concreteness` are allowed to outvote it.
 */
export const SCAFFOLDING =
  /(\blet'?s\b|\bhere'?s\b|\bthat'?s where\b|\bwhat'?s (new|more|less|interesting)\b|\bthe (honest|short|simple|real) answer\b|\bbut here'?s\b|\bso where does\b|\bthen there'?s\b|\bso what actually\b|\bwhat (this|that) means\b|\bthe (result|catch|problem|question|upshot)\?|\bbut let'?s be clear\b|\blet me be clear\b|\bto be fair\b|\bthink about it\b|\bconsider this\b)/gi;

/** "Not just X, but Y" and "It isn't X. It's Y" — a very model-ish reversal. */
export const ANTITHESIS =
  /(\bnot (just|only|merely|simply|about)\b[^.!?]{0,70}\bbut\b|\b(isn'?t|aren'?t|wasn'?t|weren'?t|is not|are not)\b[^.!?]{0,60}[.!?]\s+(what|it'?s|that'?s|the)\b|—\s*it'?s\b|\bnot\b[^.!?]{0,30},\s*but\b)/gi;

/** Three-item lists: "manufacturing, installation, and maintenance". */
export const TRIAD = /\b[\p{L}]+, [\p{L} ]{2,30}, and [\p{L}]+/gu;

export const CONTRACTION = /\b\p{L}+['’](s|t|re|ve|ll|d|m)\b/giu;
export const FIRST_PERSON = /\b(i|i'm|i've|i'd|i'll|my|me|mine|myself)\b/gi;
export const NUMERAL = /\b\d[\d,.]*(%|st|nd|rd|th)?\b/g;
export const HEDGE =
  /\b(may|might|could|often|generally|typically|frequently|largely|somewhat|relatively|appears? to|tends? to|suggests?|potentially|arguably|in many cases|to some extent)\b/gi;

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;

/** Map a measured rate onto 0–1: `lo` and below is nothing, `hi` and above is full. */
export const ramp = (x: number, lo: number, hi: number) => clamp01((x - lo) / (hi - lo));

function coefficientOfVariation(xs: number[]): number {
  if (xs.length < 3) return 0.55; // not enough to judge; assume human-ish
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  if (mean === 0) return 0.55;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Capitalised words that are not sentence-initial — a rough proper-noun count.
 * Specific names are one of the clearest marks of a human writing about
 * something real, so this feeds `concreteness`.
 */
function properNouns(sentences: Sentence[]): number {
  let n = 0;
  for (const s of sentences) {
    const tokens = s.text.trim().split(/\s+/).slice(1);
    for (const t of tokens) if (/^[A-Z][a-z]{2,}/.test(t)) n += 1;
  }
  return n;
}

export interface DocumentEvidence {
  signals: Signal[];
  /** Summed log-odds across every signal, before the short-text discount. */
  logOdds: number;
  /** 0–1 confidence from document length alone; scales `logOdds` down for short input. */
  confidence: number;
  words: number;
}

/** Base rate: with no evidence either way, assume text is human. */
const PRIOR_LOG_ODDS = -1.9;

/** Smallest denominator used for a per-thousand-word rate. */
const RATE_FLOOR_WORDS = 150;

export function documentEvidence(text: string): DocumentEvidence {
  const seg = segment(text);
  const { sentences, paragraphs } = seg;
  const n = words(text).length;
  /**
   * Rate per thousand words, with a floor on the denominator. Without it a
   * ten-word paste containing one ordinary word like "significant" measures as
   * 100 per thousand and maxes out the vocabulary signal. Short input should
   * read as "no evidence", not as overwhelming evidence.
   */
  const per1k = (c: number) => (1000 * c) / Math.max(n, RATE_FLOOR_WORDS);

  const lengths = sentences.map((s) => s.words).filter((w) => w > 0);
  const paragraphLengths = paragraphs.map((ids) =>
    ids.reduce((a, i) => a + (sentences[i]?.words ?? 0), 0),
  );
  const cv = coefficientOfVariation(lengths);
  const midBand =
    lengths.length === 0
      ? 0
      : lengths.filter((l) => l >= 12 && l <= 28).length / lengths.length;
  // Floored denominator, for the same reason as `per1k`: in a one-paragraph
  // paste the pivot *fraction* is 100% and means nothing.
  const pivot =
    paragraphs.filter((ids) => ids.length === 1 && (sentences[ids[0] ?? 0]?.words ?? 0) <= 16)
      .length / Math.max(paragraphs.length, 5);
  const questions = sentences.filter((s) => /\?/.test(s.text)).length;
  const concrete = properNouns(sentences) + count(text, NUMERAL);

  const define = (
    id: string,
    name: string,
    detail: string,
    value: number,
    weight: number,
  ): Signal => ({ id, name, detail, value: clamp01(value), logOdds: clamp01(value) * weight });

  const signals: Signal[] = [
    define(
      'lexicon',
      'AI vocabulary',
      'Words and phrases that language models reach for far more often than people do.',
      0.6 * ramp(per1k(count(text, LEXICON_STRONG)), 0.5, 8) +
        0.4 * ramp(per1k(count(text, LEXICON_COMMON)), 8, 30),
      2.6,
    ),
    define(
      'stockPhrases',
      'Stock phrasing',
      'Set phrases typical of chatbot output, such as "it is important to note".',
      ramp(per1k(count(text, STOCK_PHRASES)), 0.5, 6),
      1.9,
    ),
    define(
      'uniformRhythm',
      'Even rhythm',
      'Sentence lengths that vary less than human writing usually does.',
      ramp(0.56 - cv, 0, 0.26),
      2.2,
    ),
    define(
      'midLength',
      'Mid-length bunching',
      'Most sentences sitting in the 12–28 word band models favour, with few very short or very long ones.',
      ramp(midBand, 0.6, 0.86),
      1.5,
    ),
    define(
      'evenParagraphs',
      'Even paragraphs',
      'Paragraphs of unusually similar length.',
      ramp(0.3 - coefficientOfVariation(paragraphLengths), 0, 0.25),
      0.8,
    ),
    define(
      'triads',
      'Three-item lists',
      'Frequent "A, B, and C" lists.',
      ramp(per1k(count(text, TRIAD)), 3, 11),
      0.9,
    ),
    define(
      'scaffolding',
      'Staged delivery',
      'Rhetorical staging such as "Let\'s start with", "Here\'s the thing" or "So where does this leave us?".',
      ramp(per1k(count(text, SCAFFOLDING)), 2.5, 13),
      3.0,
    ),
    define(
      'pivotParagraphs',
      'Pivot paragraphs',
      'Short one-sentence paragraphs used to turn the argument, a habit of chat-style prose.',
      ramp(pivot, 0.12, 0.4),
      1.3,
    ),
    define(
      'unsourced',
      'Unsourced appeals',
      'Claims credited to "studies" or "experts" with no source named.',
      ramp(per1k(count(text, UNSOURCED)), 0.8, 5),
      1.4,
    ),
    define(
      'antithesis',
      'Reversals',
      'The "not just X, but Y" and "it isn\'t X — it\'s Y" construction.',
      0.7 * ramp(per1k(count(text, ANTITHESIS)), 0.8, 6) + 0.3 * ramp(per1k(questions), 1.5, 8),
      1.2,
    ),
    define(
      'emDashes',
      'Em-dash habit',
      'Heavy use of em-dashes for asides.',
      ramp(per1k(count(text, /—|\s--\s/g)), 5, 15),
      1.5,
    ),
    define(
      'hedging',
      'Hedged claims',
      'Dense qualifiers — "may", "often", "tends to" — that avoid committing.',
      ramp(per1k(count(text, HEDGE)), 9, 24),
      0.8,
    ),
    // Human-side evidence, weighted negative.
    define(
      'firstPerson',
      'First person',
      'The writer referring to themselves, which model prose rarely does unprompted.',
      ramp(per1k(count(text, FIRST_PERSON)), 2, 22),
      -2.6,
    ),
    define(
      'concreteness',
      'Concrete detail',
      'Specific names, dates and numbers — the texture of someone writing about something real.',
      ramp(per1k(concrete), 10, 50),
      -2.3,
    ),
    define(
      'contractions',
      'Contractions',
      'Contracted forms such as "don\'t" and "it\'s".',
      ramp(per1k(count(text, CONTRACTION)), 3, 25),
      -0.6,
    ),
    define(
      'variedRhythm',
      'Varied rhythm',
      'A wide spread of sentence lengths, including very short and very long ones.',
      ramp(cv - 0.58, 0, 0.22),
      -1.2,
    ),
  ];

  const logOdds = PRIOR_LOG_ODDS + signals.reduce((a, s) => a + s.logOdds, 0);
  // Rates measured over a few sentences are noise. Discount the whole body of
  // evidence toward the prior until there is enough text to measure.
  const confidence = clamp01((n - 40) / 260);
  return { signals, logOdds, confidence, words: n };
}

/**
 * The most certainty this tool is willing to express, in log-odds: about 97%
 * either way. These are pattern heuristics, not a trained model, so a verdict
 * of 100 would be a lie however much evidence has piled up.
 */
export const MAX_LOG_ODDS = 3.6;

/** Document log-odds after the short-text discount and the certainty ceiling. */
export function discountedLogOdds(e: DocumentEvidence): number {
  const discounted = PRIOR_LOG_ODDS + (e.logOdds - PRIOR_LOG_ODDS) * e.confidence;
  return Math.max(-MAX_LOG_ODDS, Math.min(MAX_LOG_ODDS, discounted));
}

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
