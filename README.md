# AI Detector

Upload an essay or report of any length and see which sentences read as AI-written, scored privately in your browser.

**[Open the app →](https://ai-detector-5ir.pages.dev)**

No account. No tracking. Nothing leaves your browser.

---

## What it does

Drop in a .docx, .odt, .txt, .md, .html or .rtf file (up to 100 MB) or paste text. Four detectors score every sentence, combine into an overall 0–100 score, and highlight the sentences that read as machine-written, in three strengths. Click a highlight to see why; press `n` / `p` to jump between them; slide the sensitivity to taste.

## Why it exists

Students want to check their own work before submitting, without uploading private coursework to a stranger's server. This runs entirely on your device.

**Be honest about the limits.** No AI detector is proof, and none can promise that Turnitin or any other checker will agree. This one is a set of pattern heuristics, not a trained model. Use it to find passages worth rewriting in your own voice.

## Running it locally

```bash
npm install
npm run dev
```

| Command             | What it does                       |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Development server                 |
| `npm run build`     | Production build into `dist/`      |
| `npm test`          | Unit tests                         |
| `npm run test:e2e`  | End-to-end and accessibility tests |
| `npm run typecheck` | Type checking                      |
| `npm run lint`      | Lint                               |
| `npm run budget`    | Bundle size budget                 |

## How it works

Text is split into paragraphs and sentences, then into overlapping ~1,500-word sections (150-word overlap) analysed one at a time so the page never freezes. Four detectors score each sentence from 0 to 1: **Rhythm** (uneven vs uniform sentence lengths), **Stock phrasing** (chatbot transitions and filler), **Formal register** (dense abstract vocabulary) and **Personal voice** (contractions, first person, repeated openers). A weighted blend, smoothed across neighbouring sentences, gives the per-sentence probability. DOCX/ODT are read with a small built-in zip reader and the browser's `DecompressionStream`; no dependencies.

Everything runs client-side. State is persisted to `localStorage` through a
versioned store that migrates old data and recovers from corrupt data rather
than failing — see `src/lib/storage.ts`.

## Roadmap

- An optional in-browser ML detector (transformers.js) as a fifth opinion.
- Export the highlighted report.
- PDF input.

## Licence

MIT — see [LICENSE](./LICENSE).

---

Built by the [weekly app factory](https://github.com/oliverinhalo/Claude).
