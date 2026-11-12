# Calibration corpus

Hand-built documents used to calibrate and regression-test the detectors. The
point of keeping them in the repository is that any change to `signals.ts` or
`detectors.ts` has to keep every one of them on the right side of the line —
see `src/lib/corpus.test.ts`.

The AI samples deliberately cover **two** quite different kinds of model
output, because they need completely different signals to catch:

| File                                | Kind                                                             |
| ----------------------------------- | ---------------------------------------------------------------- |
| `ai-essay-economics.txt`            | Essay-bot: stock vocabulary, very even sentence lengths          |
| `ai-essay-social-media.txt`         | Essay-bot, heavier stock phrasing and unsourced appeals          |
| `ai-explainer-water-cycle.txt`      | Essay-bot explainer                                              |
| `ai-conversational-remote-work.txt` | Newer chat style: varied rhythm, contractions, heavy scaffolding |

The human samples are chosen as the hardest false positives rather than easy
wins — formal academic prose with no contractions and no first person, and a
chatty blog post that uses the same "Here's the thing" / "Let's talk about"
staging that chat models do:

| File                                 | Why it is here                                            |
| ------------------------------------ | --------------------------------------------------------- |
| `human-academic-enclosure.txt`       | Formal, impersonal, abstract — the classic false positive |
| `human-victorian-science.txt`        | Long, formal, no contractions                             |
| `human-essay-versailles.txt`         | Polished argumentative student essay                      |
| `human-journalism-outage.txt`        | Reported news, dense with names and numbers               |
| `human-blog-irrigation.txt`          | Informal first-person blog                                |
| `human-blog-sourdough.txt`           | Informal blog using the _same_ staging as chat models     |
| `mixed-essay-with-ai-paragraphs.txt` | Human essay with AI paragraphs pasted into the middle     |

The samples are written for this repository, not copied from anywhere, so the
corpus is small — ten documents will not settle questions a proper labelled
dataset would. Treat the thresholds as calibrated against known failure shapes,
not as measured accuracy.
