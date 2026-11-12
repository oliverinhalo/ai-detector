/**
 * Long-document regression tests.
 *
 * The benchmark corpora are short passages (70–110 words). Real use is a whole
 * essay, where the document-level rates actually have something to measure and
 * where the highlighting has to point at the right paragraphs. These documents
 * cover that, including the case the highlighting exists for: a human essay
 * with AI paragraphs pasted into the middle.
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

/** The app's default sensitivity: at or above this a sentence is highlighted. */
const DEFAULT_SENSITIVITY = 0.6;

describe('full AI documents', () => {
  it.each(ai)('%s scores as likely AI', async (file) => {
    const a = await analyze(read(file));
    expect(a.score).toBeGreaterThanOrEqual(70);
    expect(a.label).toBe('Likely AI');
  });

  it.each(ai)('%s has most of its sentences highlighted', async (file) => {
    const a = await analyze(read(file));
    const flagged = a.results.filter((r) => r.probability >= DEFAULT_SENSITIVITY).length;
    expect(flagged / a.results.length).toBeGreaterThan(0.5);
  });
});

describe('full human documents', () => {
  it.each(human)('%s is never called Likely AI', async (file) => {
    const a = await analyze(read(file));
    expect(a.label).not.toBe('Likely AI');
    expect(a.score).toBeLessThan(40);
  });

  it.each(human)('%s highlights nothing at the default sensitivity', async (file) => {
    const a = await analyze(read(file));
    const flagged = a.results.filter((r) => r.probability >= DEFAULT_SENSITIVITY);
    expect(flagged.map((r) => r.text)).toEqual([]);
  });
});

describe('separation on long documents', () => {
  it('leaves a wide margin between AI and human documents', async () => {
    const aiScores = await Promise.all(ai.map(async (f) => (await analyze(read(f))).score));
    const humanScores = await Promise.all(
      human.map(async (f) => (await analyze(read(f))).score),
    );
    expect(Math.min(...aiScores) - Math.max(...humanScores)).toBeGreaterThan(30);
  });

  it('catches conversational AI, where rhythm and voice are no help at all', async () => {
    // Varied sentence lengths and contractions throughout: the signals that
    // catch essay-bot prose all read this as human. It is caught document-wide
    // by its staging. Regressing this is the original bug.
    const a = await analyze(read('ai-conversational-remote-work.txt'));
    expect(a.score).toBeGreaterThanOrEqual(70);
    const staging = a.signals.find((s) => s.id === 'scaffolding');
    expect(staging?.logOdds).toBeGreaterThan(1.5);
  });

  it('does not convict a human blogger who writes with the same staging', async () => {
    const a = await analyze(read('human-blog-sourdough.txt'));
    // The staging signal does fire — the human evidence outvotes it.
    const staging = a.signals.find((s) => s.id === 'scaffolding');
    expect(staging?.logOdds).toBeGreaterThan(0.5);
    expect(a.score).toBeLessThan(40);
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
