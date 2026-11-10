# AI Detector

Upload an essay or report of any length and see which sentences read as AI-written, scored privately in your browser.

**[Open the app →](https://ai-detector-5ir.pages.dev)**

No account. No tracking. Nothing leaves your browser.

---

## What it does

Drop in a .docx, .odt, .txt, .md, .html or .rtf file (up to 100 MB) or paste text. Fourteen document-level signals produce an overall 0–100 score, five per-sentence detectors highlight the passages that read as machine-written, in three strengths, and the panel shows which signals drove the verdict and which way. Click a highlight to see why; press `n` / `p` to jump between them; slide the sensitivity to taste.

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

Scoring happens at two levels, because they answer different questions.

**The overall score comes from the whole document.** Most of the reliable signal in AI detection is a _rate_ measured across a text, not anything a single sentence can tell you. `src/lib/signals.ts` measures fourteen of them — stock vocabulary density, sentence-length variation, rhetorical staging, em-dash habit, unsourced appeals to "studies", and on the other side first-person reference, contractions and concrete detail (names, dates, numbers). Each is normalised to 0–1 and given a signed weight in log-odds, then they are **summed, not averaged**, so independent evidence accumulates instead of diluting. Positive weights point to a machine, negative ones to a person.

This matters because there are two quite different kinds of AI text:

- **Essay-bot prose** — stock vocabulary, very even sentence lengths, no contractions, no concrete detail.
- **Newer chat-style prose** — deliberately varied sentence lengths, contractions, short pivot paragraphs, heavy em-dash use and staging like "Let's start with…" or "So where does this leave us?".

Catching only the first is how a fully AI-written page can score in single digits. Humans do use staging and em-dashes, so those signals never convict alone: first-person reference and concrete detail push back hard the other way, which is what separates a chatty blog post from chatty model output.

**The highlights come from each sentence.** Five detectors in `src/lib/detectors.ts` score every sentence from 0 to 1 — **Stock phrasing**, **Staged delivery**, **Rhythm**, **Personal voice** and **Formal register** — smoothed across neighbours so highlights form phrases of evidence rather than isolated flickers. The document verdict then shifts each sentence, but by a _bounded and deliberately asymmetric_ amount: a document that reads as machine-written lifts its sentences into view, while a document that reads as human is not allowed to bury a few paragraphs pasted in from a chatbot. That asymmetry is the whole point for someone checking their own work.

Short input is handled two ways: rates use a floored denominator, so one stock word in a ten-word paste is not a 100-per-thousand rate, and the whole body of evidence is discounted toward "human" until there is enough text to measure. The verdict is also capped at roughly 97% either way — these are pattern heuristics, and a score of 100 would be a lie however much evidence has piled up.

Text is split into paragraphs and sentences, then into overlapping ~1,500-word sections (150-word overlap) analysed one at a time so the page never freezes. DOCX/ODT are read with a small built-in zip reader and the browser's `DecompressionStream`; no dependencies.

### Calibration

Thresholds are calibrated against the corpus in `src/lib/corpus/`, which is committed so that `src/lib/corpus.test.ts` can hold any future change to the same standard. The human samples are chosen as the hardest false positives rather than easy wins: formal academic prose with no contractions or first person, and a blog post that uses the same staging as a chat model. It is ten hand-written documents, though — enough to catch the failure shapes above, not enough to claim a measured accuracy figure.

Everything runs client-side. State is persisted to `localStorage` through a
versioned store that migrates old data and recovers from corrupt data rather
than failing — see `src/lib/storage.ts`.

## Roadmap

- An optional in-browser ML detector (transformers.js) as another opinion.
- Export the highlighted report.
- PDF input.

## Licence

MIT — see [LICENSE](./LICENSE).

---

Built by the [weekly app factory](https://github.com/oliverinhalo/Claude).
