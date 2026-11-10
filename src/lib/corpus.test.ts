/**
 * Calibration regression tests.
 *
 * These lock in the behaviour the detectors exist for: machine-written text
 * scores high, human text scores low, and a human document with AI paragraphs
 * pasted into it highlights those paragraphs. Bands are deliberately wide —
 * they are there to catch a regression, not to pin exact numbers.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyze, peakRegion } from './analyze';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'corpus');
const read = (name: string) => readFileSync(join(DIR, name), 'utf8');
const files = readdirSync(DIR).filter((f) => f.endsWith('.txt'));
const ai = files.filter((f) => f.startsWith('ai-'));
const human = files.filter((f) => f.startsWith('human-'));

/**
 * Anything at or above this reads as machine-written to the app's default
 * sensitivity, and anything below is left unhighlighted.
 */
const DEFAULT_SENSITIVITY = 0.6;

describe('AI samples', () => {
  it.each(ai)('%s scores as likely AI', async (file) => {
    const a = await analyze(read(file));
    expect(a.score).toBeGreaterThanOrEqual(70);
    expect(a.label).toBe('Likely AI');
  });

  it.each(ai)('%s has most of its sentences highlighted', async (file) => {
    const a = await analyze(read(file));
    const flagged = a.results.filter((r) => r.probability >= DEFAULT_SENSITIVITY).length;
    // The whole document is machine-written, so the highlights should say so.
    expect(flagged / a.results.length).toBeGreaterThan(0.5);
  });
});

describe('human samples', () => {
  it.each(human)('%s scores as mostly human', async (file) => {
    const a = await analyze(read(file));
    expect(a.score).toBeLessThan(35);
    expect(a.label).toBe('Mostly human');
  });

  it.each(human)('%s highlights nothing at the default sensitivity', async (file) => {
    const a = await analyze(read(file));
    const flagged = a.results.filter((r) => r.probability >= DEFAULT_SENSITIVITY);
    expect(flagged.map((r) => r.text)).toEqual([]);
  });
});

describe('separation', () => {
  it('leaves a wide margin between the AI and human samples', async () => {
    const aiScores = await Promise.all(ai.map(async (f) => (await analyze(read(f))).score));
    const humanScores = await Promise.all(
      human.map(async (f) => (await analyze(read(f))).score),
    );
    expect(Math.min(...aiScores) - Math.max(...humanScores)).toBeGreaterThan(30);
  });

  it('catches conversational AI, not just essay-bot prose', async () => {
    // This sample has varied sentence lengths and uses contractions, so the
    // rhythm and voice signals are no help at all: it is caught document-wide
    // by its rhetorical staging. Regressing this puts us back where a fully
    // AI-written page scored single digits.
    const a = await analyze(read('ai-conversational-remote-work.txt'));
    expect(a.score).toBeGreaterThanOrEqual(70);
    const scaffolding = a.signals.find((s) => s.id === 'scaffolding');
    expect(scaffolding?.logOdds).toBeGreaterThan(1.5);
  });

  it('does not convict a human blogger who writes with the same staging', async () => {
    const a = await analyze(read('human-blog-sourdough.txt'));
    // The scaffolding signal does fire — it is the human evidence that outvotes it.
    const scaffolding = a.signals.find((s) => s.id === 'scaffolding');
    expect(scaffolding?.logOdds).toBeGreaterThan(0.5);
    expect(a.score).toBeLessThan(35);
  });
});

describe('mixed documents', () => {
  it('highlights AI paragraphs pasted into a human essay', async () => {
    const a = await analyze(read('mixed-essay-with-ai-paragraphs.txt'));
    const flagged = a.results.filter((r) => r.probability >= DEFAULT_SENSITIVITY);
    expect(flagged.length).toBeGreaterThan(0);
    // Localised, not smeared across the whole document.
    expect(flagged.length).toBeLessThan(a.results.length / 2);
    // The worst passage reads far worse than the document as a whole.
    expect(peakRegion(a.results)).toBeGreaterThan(a.score / 100 + 0.2);
  });
});

describe('short input', () => {
  it('does not reach a confident verdict on a single sentence', async () => {
    const a = await analyze('It is important to note that this plays a crucial role.');
    expect(a.reliable).toBe(false);
    expect(a.score).toBeLessThan(60);
  });

  it('grows more confident as the same style continues', async () => {
    const one =
      'Moreover, this multifaceted paradigm underscores a pivotal and holistic shift.';
    const short = await analyze(one);
    const long = await analyze(Array.from({ length: 12 }, () => one).join(' '));
    expect(long.score).toBeGreaterThan(short.score);
  });
});
