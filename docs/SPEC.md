# AI Detector — spec

**AI Detector** helps **a student checking their own work before submitting it** see **which
sentences read as AI-written** in **under a minute**, without **pasting private coursework into a
site that uploads it to a server**.

Brief: console queue item `q_uhflkdi4` / issue #7. Must-haves: (1) detect AI, (2) allow large
documents, (3) highlight AI lines.

## Honest limits (shown in the product)

No detector — including Turnitin, GPTZero or this one — is reliable enough to be a verdict, and all
produce false positives (notably on formal and non-native English). The brief asks that a pass here
implies a pass at Turnitin; that cannot be promised, because Turnitin is proprietary. The app says so.
Paid detector APIs are excluded (free tiers only; and uploading a student's essay is the thing this
app exists to avoid). "Multiple detectors" is met by an in-browser ensemble: fourteen document-level
signals accumulated in log-odds, plus five per-sentence detectors for the highlighting. The verdict is
capped at roughly 97% either way, because pattern heuristics cannot honestly express more certainty
than that.

## Core loop

1. Land: a sample document is one click away; drop zone and paste box are visible.
2. Drop/choose a file (.docx .odt .txt .md .html) or paste text.
3. Document is read, split into paragraphs and sentences, then into overlapping sections.
4. Progress shown while sections are analysed (cancellable).
5. Overall AI score + label + confidence, and which signals drove it, in which direction.
6. Document shown with AI-like sentences highlighted at three strengths.
7. Click a sentence for the reasons; `n`/`p` jump between flagged sentences.
8. Sensitivity control changes the flag threshold live.

## Out of scope

Accounts, server calls, paid APIs, PDF parsing, OCR, editing/rewriting text, "humanizing" text,
comparing against Turnitin, storing documents, plagiarism matching, multi-file batches.

## Acceptance criteria

1. Pasting text of ≥ 50 words and pressing Analyse shows a score from 0–100 and a label.
2. Obviously AI-styled sample text scores higher than obviously human sample text (unit test).
3. Each detector returns a 0–1 score per sentence, and each document-level signal a 0–1 value with a
   signed log-odds weight; evidence is summed rather than averaged, so independent signals accumulate.
4. Both kinds of AI prose score as Likely AI: essay-bot output (stock vocabulary, even rhythm) and
   newer chat-style output (varied rhythm, contractions, rhetorical staging). Regression-tested against
   the corpus in `src/lib/corpus/`.
5. Human writing that shares surface features with either — formal academic prose, or a conversational
   blog using the same staging — stays below the "Mixed" threshold and highlights nothing by default.
6. A human document with AI paragraphs pasted into it highlights those paragraphs: a confident
   document-level verdict may lift sentences into view, but may not bury them.
7. Short input reads as "no evidence", not as overwhelming evidence: rates use a floored denominator
   and the whole body of evidence is discounted toward "human" until there is enough text to measure.
8. A .docx file is parsed to text (unit test builds a real zip); a corrupt docx shows an error, not a crash.
9. A 100,000-word document is analysed in sections of ≤ 1,500 words with 150-word overlap, with progress,
   without freezing the page (UI yields between sections); every sentence is covered exactly once in output.
10. Sentences with score ≥ threshold are rendered in `<mark>` with a strength class and an accessible label.
11. Sensitivity slider changes the number of highlights without re-analysis.
12. Documents under 150 words show a "too short to judge" warning.
13. Files over 100 MB, empty files and unsupported types show specific errors.
14. Keyboard: the whole loop works without a mouse; `n`/`p` move between flagged sentences.
15. No network requests carry document text (nothing is sent anywhere).
16. Settings (sensitivity) persist; corrupt storage falls back to defaults.

## Data model

Documents are never stored. Only `{ version, sensitivity }` is persisted under `ai-detector:state`.
Absent or corrupt → default sensitivity 0.6.

## States

- Empty: sample button + dropzone + paste box; explains what it does in one screen.
- Error: specific message per cause (type, size, corrupt, empty), with the fix.
- Slow: determinate progress "section 12 of 70", Cancel button.
- Offline: nothing needs the network after load; says "works offline".
