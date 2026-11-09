/** Text segmentation. Everything works on offsets so highlights map back exactly. */

export interface Sentence {
  /** Global index across the document. */
  id: number;
  paragraph: number;
  text: string;
  words: number;
}

const ABBREVIATIONS = new Set([
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'sr',
  'jr',
  'st',
  'vs',
  'etc',
  'eg',
  'ie',
  'fig',
  'al',
  'no',
  'inc',
  'ltd',
  'co',
]);

export const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu;

export function words(text: string): string[] {
  return (text.toLowerCase().match(WORD_RE) ?? []) as string[];
}

export function countWords(text: string): number {
  return (text.match(WORD_RE) ?? []).length;
}

/** Split one paragraph into sentences without losing a character of it. */
export function splitSentences(paragraph: string): string[] {
  const out: string[] = [];
  const re = /[.!?…]+["'”’)\]]*\s+|\n+/gu;
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(paragraph)) !== null) {
    const end = m.index + m[0].length;
    const chunk = paragraph.slice(start, end);
    const before = paragraph
      .slice(start, m.index)
      .match(/([\p{L}.]+)$/u)?.[1]
      ?.toLowerCase()
      .replace(/\./g, '');
    const next = paragraph[end] ?? '';
    const isAbbrev = m[0].startsWith('.') && before !== undefined && ABBREVIATIONS.has(before);
    const isInitial = m[0].startsWith('.') && before !== undefined && before.length === 1;
    const lowerNext = next !== '' && next === next.toLowerCase() && next !== next.toUpperCase();
    if (isAbbrev || isInitial || (lowerNext && !m[0].includes('\n'))) continue;
    out.push(chunk);
    start = end;
  }
  if (start < paragraph.length) out.push(paragraph.slice(start));
  return out.filter((s) => s.trim().length > 0);
}

export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{1,}/)
    .map((p) => p.replace(/[ \t]+/g, ' ').trim())
    .filter((p) => p.length > 0);
}

export interface Segmented {
  paragraphs: number[][]; // sentence ids per paragraph
  sentences: Sentence[];
}

export function segment(text: string): Segmented {
  const sentences: Sentence[] = [];
  const paragraphs: number[][] = [];
  splitParagraphs(text).forEach((p, pi) => {
    const ids: number[] = [];
    for (const s of splitSentences(p)) {
      const id = sentences.length;
      sentences.push({ id, paragraph: pi, text: s, words: countWords(s) });
      ids.push(id);
    }
    if (ids.length > 0) paragraphs.push(ids);
  });
  return { paragraphs, sentences };
}
