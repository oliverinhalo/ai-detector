/** Turn an uploaded file into plain text, entirely in the browser. */

export const MAX_BYTES = 100 * 1024 * 1024;
export const ACCEPT = '.docx,.odt,.txt,.md,.markdown,.html,.htm,.rtf,text/plain';

export class ReadError extends Error {}

/** Minimal ZIP reader: finds one entry by name via the central directory. */
export async function unzipEntry(buf: ArrayBuffer, name: string): Promise<Uint8Array> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0)
    throw new ReadError(
      'This file is not a valid Word/OpenDocument file (it is not a zip archive).',
    );
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (p + 46 > bytes.length || view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const csize = view.getUint32(p + 20, true);
    const nlen = view.getUint16(p + 28, true);
    const elen = view.getUint16(p + 30, true);
    const clen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const entry = dec.decode(bytes.subarray(p + 46, p + 46 + nlen));
    if (entry === name) {
      const lnlen = view.getUint16(local + 26, true);
      const lelen = view.getUint16(local + 28, true);
      const start = local + 30 + lnlen + lelen;
      const data = bytes.subarray(start, start + csize);
      if (method === 0) return data;
      if (method !== 8)
        throw new ReadError('This file uses an unsupported compression method.');
      const stream = new Blob([data as BlobPart])
        .stream()
        .pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    p += 46 + nlen + elen + clen;
  }
  throw new ReadError(
    `The document is missing its content (${name}). Is it a real file of this type?`,
  );
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code =
        e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Word: paragraphs are <w:p>, text runs are <w:t>, breaks are <w:br/> and <w:tab/>. */
export function docxXmlToText(xml: string): string {
  return xml
    .split('</w:p>')
    .map((para) => {
      let out = '';
      for (const m of para.matchAll(
        /<w:t\b[^>]*>([^<]*)<\/w:t>|<w:(tab)\b[^>]*\/>|<w:(br|cr)\b[^>]*\/>/g,
      )) {
        if (m[1] !== undefined) out += decodeEntities(m[1]);
        else if (m[2]) out += ' ';
        else out += '\n';
      }
      return out;
    })
    .join('\n');
}

export function odtXmlToText(xml: string): string {
  return decodeEntities(
    xml
      .replace(/<text:tab\/>/g, ' ')
      .replace(/<text:line-break\/>/g, '\n')
      .replace(/<\/text:(p|h)>/g, '\n')
      .replace(/<[^>]+>/g, ''),
  );
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<\/(p|div|h[1-6]|li|tr|br)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  );
}

export function markdownToText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>]+/g, '');
}

export function rtfToText(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\'([0-9a-f]{2})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\{\\\*[^{}]*\}/g, '')
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '');
}

export interface ReadResult {
  text: string;
  name: string;
}

export async function readFile(file: File): Promise<ReadResult> {
  if (file.size === 0) throw new ReadError('That file is empty.');
  if (file.size > MAX_BYTES) {
    throw new ReadError(
      `That file is ${(file.size / 1048576).toFixed(0)} MB. The limit is 100 MB.`,
    );
  }
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  let text: string;
  if (ext === 'docx') {
    const xml = new TextDecoder().decode(
      await unzipEntry(await file.arrayBuffer(), 'word/document.xml'),
    );
    text = docxXmlToText(xml);
  } else if (ext === 'odt') {
    const xml = new TextDecoder().decode(
      await unzipEntry(await file.arrayBuffer(), 'content.xml'),
    );
    text = odtXmlToText(xml);
  } else if (ext === 'html' || ext === 'htm') text = htmlToText(await file.text());
  else if (ext === 'md' || ext === 'markdown') text = markdownToText(await file.text());
  else if (ext === 'rtf') text = rtfToText(await file.text());
  else if (ext === 'txt' || file.type === 'text/plain') text = await file.text();
  else if (ext === 'pdf' || ext === 'doc') {
    throw new ReadError(
      ext === 'pdf'
        ? 'PDFs are not supported. Export the document as .docx or paste the text.'
        : 'Old .doc files are not supported. Save as .docx and try again.',
    );
  } else {
    throw new ReadError(
      `“.${ext}” files are not supported. Try .docx, .odt, .txt, .md, .html or .rtf.`,
    );
  }
  if (text.trim().length === 0) throw new ReadError('No readable text was found in that file.');
  return { text, name: file.name };
}
