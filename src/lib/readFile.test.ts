// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { docxXmlToText, readFile, ReadError, unzipEntry } from './readFile';

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

/** Build a real single-entry zip (deflate). */
function zip(name: string, content: string): Uint8Array {
  const raw = Buffer.from(content);
  const data = deflateRawSync(raw);
  const nm = Buffer.from(name);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(crc32(raw), 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(raw.length, 22);
  local.writeUInt16LE(nm.length, 26);
  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(8, 10);
  cd.writeUInt32LE(crc32(raw), 16);
  cd.writeUInt32LE(data.length, 20);
  cd.writeUInt32LE(raw.length, 24);
  cd.writeUInt16LE(nm.length, 28);
  cd.writeUInt32LE(0, 42);
  const cdOffset = local.length + nm.length + data.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cd.length + nm.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  return new Uint8Array(Buffer.concat([local, nm, data, cd, nm, eocd]));
}

const DOC = `<w:document><w:body><w:p><w:r><w:t>First paragraph &amp; more.</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">Second </w:t></w:r><w:r><w:t>one.</w:t></w:r></w:p></w:body></w:document>`;

describe('docx', () => {
  it('extracts paragraphs from word/document.xml', () => {
    expect(docxXmlToText(DOC).trim().split('\n')).toEqual([
      'First paragraph & more.',
      'Second one.',
    ]);
  });

  it('reads a real zip archive', async () => {
    const z = zip('word/document.xml', DOC);
    const out = new TextDecoder().decode(
      await unzipEntry(z.buffer as ArrayBuffer, 'word/document.xml'),
    );
    expect(out).toBe(DOC);
  });

  it('readFile parses a .docx File', async () => {
    const file = new File([zip('word/document.xml', DOC) as BlobPart], 'essay.docx');
    expect((await readFile(file)).text).toContain('Second one.');
  });

  it('rejects a corrupt docx with a ReadError, not a crash', async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4, 5])], 'bad.docx');
    await expect(readFile(file)).rejects.toBeInstanceOf(ReadError);
  });
});

describe('readFile errors', () => {
  it('rejects empty, unsupported and pdf', async () => {
    await expect(readFile(new File([], 'a.txt'))).rejects.toThrow(/empty/);
    await expect(readFile(new File(['x'], 'a.xyz'))).rejects.toThrow(/not supported/);
    await expect(readFile(new File(['x'], 'a.pdf'))).rejects.toThrow(/PDF/);
  });
  it('reads txt', async () => {
    expect((await readFile(new File(['hello there'], 'a.txt'))).text).toBe('hello there');
  });
});
