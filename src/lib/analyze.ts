import { DETECTORS, runDetectors, type Scores } from './detectors';
import { countWords, segment, type Segmented, type Sentence } from './text';

export const SECTION_WORDS = 1500;
export const OVERLAP_WORDS = 150;
export const MIN_RELIABLE_WORDS = 150;

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
  /** True when a high score rests on style signals alone (no stock phrasing); formal human writing does this. */
  styleOnly: boolean;
  detectorMeans: Scores;
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

const logistic = (p: number) => 1 / (1 + Math.exp(-9 * (p - 0.46)));

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
  interface Acc {
    sum: number;
    seen: number;
    det: Scores;
  }
  const acc: Acc[] = sentences.map(() => ({
    sum: 0,
    seen: 0,
    det: { rhythm: 0, phrasing: 0, register: 0, voice: 0, specificity: 0 },
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
    const scores: Scores = {
      rhythm: (cell?.det.rhythm ?? 0) / n,
      phrasing: (cell?.det.phrasing ?? 0) / n,
      register: (cell?.det.register ?? 0) / n,
      voice: (cell?.det.voice ?? 0) / n,
      specificity: (cell?.det.specificity ?? 0) / n,
    };
    const tooShort = s.words < 5;
    return { ...s, scores, probability: tooShort ? 0 : logistic(blended) };
  });

  const total = results.reduce((a, r) => a + r.words, 0) || 1;
  const weighted = results.reduce((a, r) => a + r.probability * r.words, 0) / total;
  const score = Math.round(weighted * 100);
  const detectorMeans: Scores = {
    rhythm: 0,
    phrasing: 0,
    register: 0,
    voice: 0,
    specificity: 0,
  };
  for (const d of DETECTORS) {
    detectorMeans[d.id] = results.reduce((a, r) => a + r.scores[d.id] * r.words, 0) / total;
  }
  // Rhythm, voice and register are style signals that careful human writers (legal,
  // scientific, committee prose) share with chatbots. Without any stock phrasing to
  // corroborate, refuse to call it "Likely AI" — a false accusation is the costly error.
  const styleOnly = score >= 60 && detectorMeans.phrasing < 0.15;
  return {
    results,
    paragraphs: seg.paragraphs,
    words: countWords(text),
    sections: parts.length,
    score,
    styleOnly,
    label: score >= 60 && !styleOnly ? 'Likely AI' : score >= 35 ? 'Mixed' : 'Mostly human',
    reliable: total >= MIN_RELIABLE_WORDS,
    detectorMeans,
  };
}

/** Number of sentences at or above the threshold. */
export function flaggedCount(results: SentenceResult[], threshold: number): number {
  return results.filter((r) => r.probability >= threshold).length;
}
