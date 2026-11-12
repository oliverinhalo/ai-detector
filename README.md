# AI Detector

Upload an essay or report of any length and see which sentences read as AI-written, scored privately in your browser.

**[Open the app →](https://ai-detector-5ir.pages.dev)**

No account. No tracking. Nothing leaves your browser.

---

## What it does

Drop in a .docx, .odt, .txt, .md, .html or .rtf file (up to 100 MB) or paste text. Five detectors score every sentence, combine into an overall 0–100 score, and highlight the sentences that read as machine-written, in three strengths. Click a highlight to see why; press `n` / `p` to jump between them; slide the sensitivity to taste.

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
| `npm run eval`      | Benchmark the detectors            |
| `npm run budget`    | Bundle size budget                 |

## How it works

Scoring happens at two levels, because they answer different questions.

**The overall score comes from the whole document.** Most of the reliable signal is a _rate_ measured across a text, not anything one sentence can tell you. `src/lib/signals.ts` measures seventeen of them — stock vocabulary, sentence-length variation, rhetorical staging, coaching register, explainer exhortations, em-dash habit, unsourced appeals to "studies", and on the other side first-person reference, contractions and concrete detail. Each is normalised to 0–1 and given a signed weight in log-odds, then **summed, not averaged**, so independent evidence accumulates instead of diluting.

This matters because there is more than one kind of AI text. Essay-bot prose has stock vocabulary and very even sentence lengths. Chat-style prose varies its sentence lengths deliberately, uses contractions, and stages itself with "Let's start with…" and "So where does this leave us?". Modelling only the first is how a fully AI-written page can score in single digits.

**Two rules stop it libelling careful writers.** Uniform rhythm, even paragraphs and dense hedging are _style_ signals that legal drafting, committee minutes and scientific prose share with chatbots. Those are capped unless something corroborates them — stock vocabulary, staging, coaching register: things a person does not produce by accident. The same gate applies to the per-sentence detectors, which are mostly style and would otherwise carry a lease agreement to the same score as a chatbot.

**The highlights come from each sentence**, smoothed across neighbours. The document verdict then shifts each sentence by a _bounded and deliberately asymmetric_ amount: a machine-written document lifts its sentences into view, while a human-reading document is not allowed to bury a few paragraphs pasted in from a chatbot — the case someone checking their own work actually has.

**It abstains.** When neither side produces real evidence — a flat incident report, a technical note — the verdict is "No clear signal" rather than "Mostly human". An absence of evidence of a machine is not evidence of a person, and a confident clearance is how AI text passes.

Short input reads as _no_ evidence rather than overwhelming evidence: rates use a floored denominator, and the whole body of evidence is discounted until there is enough text to measure. The verdict is capped near 97% either way.

Text is split into paragraphs and sentences, then into overlapping ~1,500-word sections (150-word overlap) analysed one at a time so the page never freezes. DOCX/ODT are read with a small built-in zip reader and the browser's `DecompressionStream`; no dependencies.

Everything runs client-side. State is persisted to `localStorage` through a
versioned store that migrates old data and recovers from corrupt data rather
than failing — see `src/lib/storage.ts`.

## Roadmap

- An optional in-browser ML detector (transformers.js), which is what would catch AI that imitates personal human writing.
- Export the highlighted report.
- PDF input.

## Licence

MIT — see [LICENSE](./LICENSE).

---

Built by the [weekly app factory](https://github.com/oliverinhalo/Claude).

## Accuracy: what has and has not been measured

Run `npm run eval`. There are two corpora and the difference between them is the whole point.

`eval/corpus.ts` (39 passages) was used while fitting the detectors — including its "blind" split, which stopped being blind the moment it was used to diagnose a failure. The tool scores **AUC 1.000** on it. That number is an upper bound and should not be quoted as accuracy.

`eval/validation.ts` (12 passages) was written afterwards and is not used to tune anything. That is the honest estimate:

|                                     | fitted corpus | held-out  |
| ----------------------------------- | ------------- | --------- |
| AUC                                 | 1.000         | **0.786** |
| Human passages labelled "Likely AI" | 0 / 27        | 0 / 7     |
| AI passages missed as human         | 0 / 19        | **3 / 5** |

Both corpora are hand-written for this project, so neither is evidence about real-world text.

**What it catches.** Chatbot-register prose — listicles, coaching answers, staged explainers, essay-bot output — scores 70–99 whether or not it varies its sentence lengths. Human writing is not falsely accused in either corpus, including the hard cases: legal drafting, committee minutes, academic abstracts, and informal blogging that uses the same staging a chat model does.

**What it misses.** AI that deliberately writes like a person: first-person narration with real figures, or an imitation of an informal blog. Those scored 7 and 14 out of 100 in the held-out set. The markers the tool reads as human — "I", contractions, specific numbers — are exactly what a model produces when asked to sound human, so surface heuristics have little left to go on. Flat, impersonal prose (technical notes, incident reports) carries almost no signal either way, and the tool now says so instead of clearing it.

This is a limit of the approach, not a tuning gap. A trained model is the roadmap item that would move it.

**So: a low score is not a clearance.** It means this tool found no evidence, which is a much weaker statement. Never treat the score as a verdict.
