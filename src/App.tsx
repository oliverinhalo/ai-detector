import { useCallback, useRef, useState } from 'react';
import { ThemeToggle } from './components/ThemeToggle';
import { Report } from './components/Report';
import { analyze, type Analysis } from './lib/analyze';
import { ACCEPT, ReadError, readFile } from './lib/readFile';
import { SAMPLE_DOCUMENT } from './lib/samples';
import { settingsStore } from './lib/settings';

type Phase =
  | { kind: 'idle' }
  | { kind: 'reading'; name: string }
  | { kind: 'analyzing'; name: string; done: number; total: number }
  | { kind: 'done'; name: string; analysis: Analysis }
  | { kind: 'error'; message: string };

export function App() {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [paste, setPaste] = useState('');
  const [sensitivity, setSensitivity] = useState(() => settingsStore.load().value.sensitivity);
  const [dragging, setDragging] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async (text: string, name: string) => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setPhase({ kind: 'analyzing', name, done: 0, total: 1 });
    try {
      const analysis = await analyze(text, {
        signal: ctl.signal,
        onProgress: (done, total) => setPhase({ kind: 'analyzing', name, done, total }),
      });
      if (analysis.results.length === 0) {
        setPhase({ kind: 'error', message: 'No sentences were found in that text.' });
        return;
      }
      setPhase({ kind: 'done', name, analysis });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') setPhase({ kind: 'idle' });
      else
        setPhase({
          kind: 'error',
          message: 'The analysis failed unexpectedly. Try a smaller file or paste the text.',
        });
    }
  }, []);

  const onFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setPhase({ kind: 'reading', name: file.name });
      try {
        const { text, name } = await readFile(file);
        await run(text, name);
      } catch (e) {
        setPhase({
          kind: 'error',
          message:
            e instanceof ReadError ? e.message : 'That file could not be read. Is it damaged?',
        });
      }
    },
    [run],
  );

  const changeSensitivity = (n: number) => {
    setSensitivity(n);
    settingsStore.save({ sensitivity: n });
  };

  const busy = phase.kind === 'reading' || phase.kind === 'analyzing';

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-4 sm:px-6">
        <header className="flex items-center justify-between gap-4 py-6">
          <span className="font-mono text-sm tracking-tight text-[var(--text-muted)]">
            ai-detector
          </span>
          <ThemeToggle />
        </header>

        <main id="main" className="flex-1 pb-8">
          <h1 className="text-[length:var(--t-3xl)] leading-tight font-semibold tracking-tight text-balance">
            See which sentences read as <span className="hl hl-2">AI-written</span>.
          </h1>
          <p className="mt-4 max-w-prose text-[length:var(--t-lg)] text-[var(--text-muted)] text-pretty">
            Drop in an essay or report of any length. Seventeen signals weigh it up and every
            sentence is scored, right here in your browser. Your document is never uploaded.
          </p>

          <section
            aria-labelledby="input-h"
            className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-sm)]"
          >
            <h2 id="input-h" className="sr-only">
              Add a document
            </h2>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void onFile(e.dataTransfer.files[0]);
              }}
              className={`flex flex-col items-center gap-3 rounded-[var(--radius)] border-2 border-dashed p-6 text-center ${
                dragging
                  ? 'border-[var(--accent)] bg-[var(--surface-sunken)]'
                  : 'border-[var(--border-strong)]'
              }`}
            >
              <p className="text-[var(--text-muted)]">
                Drop a file here — .docx, .odt, .txt, .md, .html, .rtf up to 100 MB
              </p>
              <input
                ref={fileRef}
                id="file"
                type="file"
                accept={ACCEPT}
                className="sr-only"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  void onFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  Choose a file
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => void run(SAMPLE_DOCUMENT, 'Sample document')}
                >
                  Try a sample
                </button>
              </div>
            </div>

            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (paste.trim()) void run(paste, 'Pasted text');
              }}
            >
              <label htmlFor="paste" className="text-sm font-semibold">
                Or paste text
              </label>
              <textarea
                id="paste"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                rows={5}
                placeholder="Paste your essay here…"
                className="mt-1 block w-full rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] p-3 text-[var(--text)]"
              />
              <button
                type="submit"
                className="btn btn-primary mt-3"
                disabled={busy || paste.trim().length === 0}
              >
                Analyse text
              </button>
            </form>
          </section>

          <div aria-live="polite">
            {phase.kind === 'reading' && (
              <p className="mt-6 text-[var(--text-muted)]">Reading {phase.name}…</p>
            )}
            {phase.kind === 'analyzing' && (
              <div className="mt-6">
                <p className="text-[var(--text-muted)]">
                  Analysing {phase.name}: section {Math.min(phase.done + 1, phase.total)} of{' '}
                  {phase.total}
                </p>
                <progress
                  className="mt-2 w-full"
                  max={phase.total}
                  value={phase.done}
                  aria-label="Analysis progress"
                />
                <button
                  type="button"
                  className="btn mt-2"
                  onClick={() => abortRef.current?.abort()}
                >
                  Cancel
                </button>
              </div>
            )}
            {phase.kind === 'error' && (
              <p
                role="alert"
                className="mt-6 rounded-[var(--radius)] border border-[var(--danger)] p-4 text-[var(--text)]"
              >
                <strong className="text-[var(--danger)]">Couldn’t analyse that.</strong>{' '}
                {phase.message}
              </p>
            )}
          </div>

          {phase.kind === 'done' && (
            <Report
              analysis={phase.analysis}
              name={phase.name}
              sensitivity={sensitivity}
              onSensitivity={changeSensitivity}
            />
          )}

          <section aria-labelledby="honest-h" className="mt-12 max-w-prose">
            <h2 id="honest-h" className="text-[length:var(--t-lg)] font-semibold">
              Read this before you trust a number
            </h2>
            <p className="mt-2 text-[var(--text-muted)]">
              No AI detector is accurate enough to be proof — not this one, not Turnitin, not
              GPTZero. All of them flag human writing, especially formal prose and writing by
              non-native English speakers. This tool looks for patterns (even sentence rhythm,
              stock phrases, chatbot staging, no personal voice); it is not a trained model and
              it cannot promise that Turnitin or any other checker will agree with it.{' '}
              <strong>A low score is not a clearance.</strong> On passages written after it was
              tuned, it missed roughly three in five AI texts that deliberately imitate personal
              human writing — first-person narration, contractions, specific figures. It is good
              at catching chatbot register and bad at catching a chatbot told to sound like you.
              Use it to spot passages worth rewriting in your own voice, not as a verdict.
            </p>
          </section>
        </main>

        <footer className="border-t border-[var(--border)] py-6 text-sm text-[var(--text-muted)]">
          <p>
            Runs entirely in your browser and keeps working if you go offline while this tab is
            open. Nothing you add is sent anywhere.{' '}
            <a
              className="underline decoration-[var(--border-strong)] underline-offset-2 hover:text-[var(--text)]"
              href="https://github.com/oliverinhalo/ai-detector"
            >
              Source
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}
