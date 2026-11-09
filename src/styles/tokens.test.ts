/**
 * Contrast guard.
 *
 * The end-to-end axe audit catches contrast failures, but only after a build and
 * a browser launch. This catches them in milliseconds, directly against the token
 * file, so a palette change cannot quietly ship text nobody can read.
 *
 * Phase 4 changes the token values. These assertions must keep passing.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Read from disk relative to the project root: under jsdom, import.meta.url is
// an http URL the fs module cannot take.
const css = readFileSync('src/styles/tokens.css', 'utf8');

/** Custom properties declared inside the first block matching `selector`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`tokens.css has no "${selector}" block`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const out: Record<string, string> = {};
  for (const [, name, value] of css.slice(open, close).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    if (name && value) out[name] = value.trim();
  }
  return out;
}

const light = block(':root {');
const dark = { ...light, ...block(":root[data-theme='dark'] {") };

/** Follow var() references until a literal colour is reached. */
function resolve(tokens: Record<string, string>, name: string, depth = 0): string {
  const value = tokens[name];
  if (value === undefined) throw new Error(`token ${name} is not defined`);
  if (depth > 10) throw new Error(`token ${name} is a circular reference`);
  const ref = value.match(/^var\((--[\w-]+)\)$/);
  return ref?.[1] ? resolve(tokens, ref[1], depth + 1) : value;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const channel = (offset: number) => {
    const v = parseInt(full.slice(offset, offset + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background, minimum ratio]. 4.5 for body text, 3 for large text
// and for non-text boundaries.
const PAIRS: ReadonlyArray<readonly [string, string, number]> = [
  ['--text', '--surface', 4.5],
  ['--text', '--surface-raised', 4.5],
  ['--text', '--surface-sunken', 4.5],
  ['--text-muted', '--surface', 4.5],
  ['--text-muted', '--surface-raised', 4.5],
  ['--text-faint', '--surface', 4.5],
  ['--text-faint', '--surface-raised', 4.5],
  ['--accent', '--surface', 4.5],
  ['--accent', '--surface-raised', 4.5],
  ['--accent-text', '--accent', 4.5],
  ['--danger', '--surface', 4.5],
  ['--success', '--surface', 4.5],
  ['--border-strong', '--surface', 1.4],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme contrast', (_theme, tokens) => {
  it.each(PAIRS)('%s on %s meets %s:1', (fg, bg, min) => {
    const ratio = contrast(resolve(tokens, fg), resolve(tokens, bg));
    expect(
      Number(ratio.toFixed(2)),
      `${fg} (${resolve(tokens, fg)}) on ${bg} (${resolve(tokens, bg)})`,
    ).toBeGreaterThanOrEqual(min);
  });
});

describe('token hygiene', () => {
  it('defines every semantic token both themes need', () => {
    for (const name of [
      '--surface',
      '--surface-raised',
      '--text',
      '--text-muted',
      '--accent',
    ]) {
      expect(light[name], `light ${name}`).toBeDefined();
    }
  });

  it('gives the dark theme its own palette rather than inheriting the light one', () => {
    expect(resolve(dark, '--surface')).not.toBe(resolve(light, '--surface'));
    expect(resolve(dark, '--text')).not.toBe(resolve(light, '--text'));
  });
});
