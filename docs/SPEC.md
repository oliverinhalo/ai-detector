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
app exists to avoid). "Multiple detectors" is met by an in-browser ensemble of five independent
detectors that must agree.

## Core loop

1. Land: a sample document is one click away; drop zone and paste box are visible.
2. Drop/choose a file (.docx .odt .txt .md .html) or paste text.
3. Document is read, split into paragraphs and sentences, then into overlapping sections.
4. Progress shown while sections are analysed (cancellable).
5. Overall AI score + label + confidence, per-detector breakdown.
6. Document shown with AI-like sentences highlighted at three strengths.
7. Click a sentence for the reasons; `n`/`p` jump between flagged sentences.
8. Sensitivity control changes the flag threshold live.

## Out of scope

Accounts, server calls, paid APIs, PDF parsing, OCR, editing/rewriting text, "humanizing" text,
comparing against Turnitin, storing documents, plagiarism matching, multi-file batches.

## Acceptance criteria

1. Pasting text of ≥ 50 words and pressing Analyse shows a score from 0–100 and a label.
2. Obviously AI-styled sample text scores higher than obviously human sample text (unit test).
3. Each detector returns a 0–1 score per sentence; the ensemble is their weighted combination.
4. A .docx file is parsed to text (unit test builds a real zip); a corrupt docx shows an error, not a crash.
5. A 100,000-word document is analysed in sections of ≤ 1,500 words with 150-word overlap, with progress,
   without freezing the page (UI yields between sections); every sentence is covered exactly once in output.
6. Sentences with score ≥ threshold are rendered in `<mark>` with a strength class and an accessible label.
7. Sensitivity slider changes the number of highlights without re-analysis.
8. Documents under 150 words show a "too short to judge" warning.
9. Files over 100 MB, empty files and unsupported types show specific errors.
10. Keyboard: the whole loop works without a mouse; `n`/`p` move between flagged sentences.
11. No network requests carry document text (nothing is sent anywhere).
12. Settings (sensitivity) persist; corrupt storage falls back to defaults.

## Data model

Documents are never stored. Only `{ version, sensitivity }` is persisted under `ai-detector:state`.
Absent or corrupt → default sensitivity 0.6.

## States

- Empty: sample button + dropzone + paste box; explains what it does in one screen.
- Error: specific message per cause (type, size, corrupt, empty), with the fix.
- Slow: determinate progress "section 12 of 70", Cancel button.
- Offline: nothing needs the network after load; says "works offline".
