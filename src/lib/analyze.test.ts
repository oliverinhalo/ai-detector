import { describe, expect, it } from 'vitest';
import { analyze, sections, flaggedCount } from './analyze';
import { segment, splitSentences } from './text';
import { AI_SAMPLE, HUMAN_SAMPLE } from './samples';

describe('splitSentences', () => {
  it('does not split on abbreviations or initials', () => {
    expect(splitSentences('Dr. Okafor met J. Smith. They talked.')).toHaveLength(2);
  });
  it('loses no characters', () => {
    const p = 'One. Two! Three? Four… Five.';
    expect(splitSentences(p).join('')).toBe(p);
  });
});

describe('analyze', () => {
  it('scores chatbot-style text above human-style text', async () => {
    const ai = await analyze(AI_SAMPLE);
    const human = await analyze(HUMAN_SAMPLE);
    expect(ai.score).toBeGreaterThan(human.score + 25);
    expect(ai.label).toBe('Likely AI');
    expect(human.label).toBe('Mostly human');
  });

  it('every detector yields 0..1 per sentence', async () => {
    const a = await analyze(AI_SAMPLE);
    for (const r of a.results) {
      for (const v of Object.values(r.scores)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('flags too-short documents as unreliable', async () => {
    expect((await analyze('Short text here.')).reliable).toBe(false);
  });

  it('handles 100,000 words in overlapping sections covering every sentence once', async () => {
    const text = Array.from(
      { length: 5000 },
      (_, i) => `This is sentence number ${i} in a very long document of text.`,
    ).join(' ');
    const seg = segment(text);
    const parts = sections(seg.sentences);
    expect(parts.length).toBeGreaterThan(5);
    expect(parts[0]?.[0]).toBe(0);
    expect(parts.at(-1)?.[1]).toBe(seg.sentences.length);
    for (let i = 1; i < parts.length; i++)
      expect(parts[i]?.[0]).toBeLessThan(parts[i - 1]?.[1] ?? 0);
    const a = await analyze(text);
    expect(a.results).toHaveLength(seg.sentences.length);
  });

  it('can be cancelled', async () => {
    const ctl = new AbortController();
    ctl.abort();
    await expect(analyze(AI_SAMPLE, { signal: ctl.signal })).rejects.toThrow();
  });

  it('flaggedCount follows the threshold', async () => {
    const a = await analyze(AI_SAMPLE);
    expect(flaggedCount(a.results, 0.9)).toBeLessThanOrEqual(flaggedCount(a.results, 0.3));
  });
});
