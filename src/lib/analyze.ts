import { DETECTORS, runDetectors, type Scores } from './detectors';
import {
  discountedLogOdds,
  documentEvidence,
  sigmoid,
  type DocumentEvidence,
  type Signal,
} from './signals';
import { countWords, segment, type Segmented, type Sentence } from './text';

export const SECTION_WORDS = 1500;
export const OVERLAP_WORDS = 150;
export const MIN_RELIABLE_WORDS = 150;

/**
 * How far the document verdict may move an individual sentence, in log-odds.
 *
 * Bounded, and deliberately asymmetric. Unbounded, a confident document
 * verdict pins every sentence to 0 or 1 and the highlighting stops saying
 * anything about *where* in the text the evidence is. Asymmetric, because the
 * point of the highlights is to find passages worth rewriting: a document that
 * reads as machine-written should lift its sentences into view, but a document
 * that reads as human must not be allowed to bury a handful of pasted-in AI
 * paragraphs — which is exactly the case someone checking their own work has.
 */
const DOC_LIFT_MAX = 1.6;
const DOC_DAMP_MAX = 0.8;
/** Per-sentence evidence: a blend of this much is neutral, and this is its gain. */
const SENTENCE_NEUTRAL = 0.3;
const SENTENCE_GAIN = 8;

const EMPTY_SCORES: Scores = {
  rhythm: 0,
  phrasing: 0,
  register: 0,
  voice: 0,
  scaffolding: 0,
};

export interface SentenceResult extends Sentence {
  scores: Scores;
  /** Ensemble probability that the sentence is AI-written, 0–1. */
  probability: number;
}

export interface Analysis {
  results: SentenceResult[];
  paragraphs: number[][];
  words: number;
  sections: number;
  /** Overall 0–100 score. */
  score: number;
  label: 'Mostly human' | 'Mixed' | 'Likely AI';
  reliable: boolean;
  detectorMeans: Scores;
  /** Document-level evidence, strongest first — what actually drove the score. */
  signals: Signal[];
  evidence: DocumentEvidence;
}

/**
 * Split sentences into overlapping sections of roughly `size` words, each overlapping
 * the previous by `overlap` words. Returns [start, end) index pairs over sentences.
 */
export function sections(
  sentences: Sentence[],
  size = SECTION_WORDS,
  overlap = OVERLAP_WORDS,
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let start = 0;
  while (start < sentences.length) {
    let end = start;
    let w = 0;
    while (end < sentences.length && (w < size || end === start)) {
      w += sentences[end]?.words ?? 0;
      end += 1;
    }
    out.push([start, end]);
    if (end >= sentences.length) break;
    let back = end;
    let ow = 0;
    while (back > start + 1 && ow < overlap) {
      back -= 1;
      ow += sentences[back]?.words ?? 0;
    }
    start = back;
  }
  return out;
}

function combine(scores: Scores): number {
  let raw = 0;
  for (const d of DETECTORS) raw += scores[d.id] * d.weight;
  return raw;
}

export interface AnalyzeOptions {
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

const yieldToBrowser = () => new Promise<void>((r) => setTimeout(r, 0));

export async function analyze(text: string, options: AnalyzeOptions = {}): Promise<Analysis> {
  const seg: Segmented = segment(text);
  const { sentences } = seg;
  const parts = sections(sentences);

  // Document-level evidence first: rates measured across the whole text are the
  // reliable part of the verdict, and they set the baseline every sentence is
  // judged against.
  const evidence = documentEvidence(text);
  const docLogOdds = discountedLogOdds(evidence);

  interface Acc {
    sum: number;
    seen: number;
    det: Scores;
  }
  const acc: Acc[] = sentences.map(() => ({
    sum: 0,
    seen: 0,
    det: { ...EMPTY_SCORES },
  }));

  for (let i = 0; i < parts.length; i++) {
    if (options.signal?.aborted) throw new DOMException('Analysis cancelled', 'AbortError');
    const [a, b] = parts[i] ?? [0, 0];
    const scores = runDetectors(sentences.slice(a, b));
    scores.forEach((s, k) => {
      const cell = acc[a + k];
      if (!cell) return;
      cell.sum += combine(s);
      cell.seen += 1;
      for (const d of DETECTORS) cell.det[d.id] += s[d.id];
    });
    options.onProgress?.(i + 1, parts.length);
    await yieldToBrowser();
  }

  // Raw per-sentence blend, then smooth with neighbours so highlights form phrases of
  // evidence rather than isolated flickers.
  const raw = acc.map((c) => c.sum / Math.max(1, c.seen));
  const results: SentenceResult[] = sentences.map((s, i) => {
    const own = raw[i] ?? 0;
    const prev = raw[i - 1] ?? own;
    const next = raw[i + 1] ?? own;
    const blended = own * 0.6 + prev * 0.2 + next * 0.2;
    const cell = acc[i];
    const n = Math.max(1, cell?.seen ?? 1);
    const scores: Scores = { ...EMPTY_SCORES };
    for (const d of DETECTORS) scores[d.id] = (cell?.det[d.id] ?? 0) / n;
    // Sum the two bodies of evidence in log-odds rather than averaging them, so
    // a document that reads as machine-written lifts its own sentences instead
    // of each sentence having to prove the case alone.
    const docTerm = Math.max(-DOC_DAMP_MAX, Math.min(DOC_LIFT_MAX, docLogOdds));
    const logOdds = docTerm + (blended - SENTENCE_NEUTRAL) * SENTENCE_GAIN;
    const tooShort = s.words < 5;
    return { ...s, scores, probability: tooShort ? 0 : sigmoid(logOdds) };
  });

  const total = results.reduce((a, r) => a + r.words, 0) || 1;
  const sentenceMean = results.reduce((a, r) => a + r.probability * r.words, 0) / total;
  const peak = peakRegion(results);
  // The document verdict leads, the spread of sentence scores adjusts it, and
  // the worst passage gets a say so that a part-AI document is not averaged
  // back down to "human".
  const score = Math.round(
    100 * (0.62 * sigmoid(docLogOdds) + 0.23 * sentenceMean + 0.15 * peak),
  );
  const detectorMeans: Scores = { ...EMPTY_SCORES };
  for (const d of DETECTORS) {
    detectorMeans[d.id] = results.reduce((a, r) => a + r.scores[d.id] * r.words, 0) / total;
  }
  return {
    results,
    paragraphs: seg.paragraphs,
    words: countWords(text),
    sections: parts.length,
    score,
    label: score >= 60 ? 'Likely AI' : score >= 35 ? 'Mixed' : 'Mostly human',
    reliable: total >= MIN_RELIABLE_WORDS,
    detectorMeans,
    signals: [...evidence.signals].sort((a, b) => Math.abs(b.logOdds) - Math.abs(a.logOdds)),
    evidence,
  };
}

/**
 * Mean probability of the most machine-looking contiguous run of at least
 * `minWords` words. A document with one strongly AI-reading section is more
 * suspicious than one with none, even when the rest of it drags the average
 * down, so this feeds the headline score alongside the document-wide verdict.
 */
export function peakRegion(results: SentenceResult[], minWords = 120): number {
  const total = results.reduce((a, r) => a + r.words, 0);
  if (total === 0) return 0;
  if (total <= minWords) {
    return results.reduce((a, r) => a + r.probability * r.words, 0) / total;
  }
  let best = 0;
  for (let i = 0; i < results.length; i++) {
    let w = 0;
    let sum = 0;
    for (let j = i; j < results.length; j++) {
      const r = results[j];
      if (!r) break;
      w += r.words;
      sum += r.probability * r.words;
      if (w >= minWords) {
        best = Math.max(best, sum / w);
        break;
      }
    }
  }
  return best;
}

/** Number of sentences at or above the threshold. */
export function flaggedCount(results: SentenceResult[], threshold: number): number {
  return results.filter((r) => r.probability >= threshold).length;
}
