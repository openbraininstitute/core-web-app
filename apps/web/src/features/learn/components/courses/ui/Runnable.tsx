'use client';

/**
 * A code cell you can run: its code, editable, coloured as you type; Run (or
 * Ctrl/⌘+Enter) runs it in the browser's own Python, and Reset puts the
 * original back. Before anything is run, it shows what running it gives.
 */

import { useRef, useState } from 'react';

import { Highlighted, INK, OutputView, Panel, type Plot, parseOutput } from './Code';
import { pythonLoaded, runPython } from './python';

export interface Cell {
  code: string;
  /** What it prints, as run when the course was made — plots as `__plot__` lines. */
  output: string;
  /** And the traceback, for a cell that is meant to fail. */
  error?: string;
  /** Lines to light, 1-based: what is new in it. */
  lit?: number[];
  /** Its file name, on the panel's top bar. */
  label?: string;
  /** Its output beside the code rather than under it, on a wide enough screen: for a long cell that plots. */
  side?: boolean;
}

export default function Runnable({
  cell,
  side = cell.side ?? false,
}: {
  cell: Cell;
  side?: boolean;
}) {
  const [code, setCode] = useState(cell.code);
  const [result, setResult] = useState<{
    text: string;
    plots: Plot[];
    error: string | null;
  } | null>(null);
  const [busy, setBusy] = useState<'' | 'loading' | 'running'>('');
  const area = useRef<HTMLTextAreaElement | null>(null);
  const edited = code !== cell.code;
  const shown = result ?? { ...parseOutput(cell.output), error: cell.error ?? null };

  const run = async () => {
    if (busy) return;
    setBusy(pythonLoaded() ? 'running' : 'loading');
    // whatever happens, the cell can be run again
    try {
      const r = await runPython(code);
      setResult({ ...parseOutput(r.out), error: r.error });
    } finally {
      setBusy('');
    }
  };
  const reset = () => {
    setCode(cell.code);
    setResult(null);
  };

  const button =
    'rounded-md px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors disabled:cursor-wait disabled:opacity-60';
  return (
    <Panel
      label={cell.label ?? 'python'}
      right={
        <span className="flex items-center gap-2">
          {edited && (
            <button type="button" onClick={reset} className={button} style={{ color: INK.dim }}>
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={run}
            disabled={!!busy}
            className={button}
            style={{ background: 'rgba(125, 211, 252, 0.16)', color: INK.keyword }}
            title="Run this code in your browser (Ctrl+Enter)"
          >
            {busy === 'loading' ? 'Loading Python…' : busy === 'running' ? 'Running…' : 'Run ▸'}
          </button>
        </span>
      }
    >
      <div className={side ? 'md:grid md:grid-cols-[1.1fr_1fr]' : ''}>
        <div className="relative overflow-x-auto">
          <pre aria-hidden="true" className="pointer-events-none min-w-max px-4 py-3">
            <Highlighted code={code} lit={edited ? [] : cell.lit} />
          </pre>
          <textarea
            ref={area}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                run();
              } else if (e.key === 'Tab' && !e.shiftKey) {
                // four spaces, as Python wants, rather than leaving the box
                e.preventDefault();
                const el = e.currentTarget;
                const [a, b] = [el.selectionStart, el.selectionEnd];
                setCode(code.slice(0, a) + '    ' + code.slice(b));
                requestAnimationFrame(() => area.current?.setSelectionRange(a + 4, a + 4));
              }
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
            aria-label="Python code: edit it, then press Run or Ctrl+Enter"
            className="absolute inset-0 h-full w-full resize-none overflow-hidden bg-transparent px-4 py-3 whitespace-pre text-transparent outline-none"
            style={{ font: 'inherit', lineHeight: 'inherit', caretColor: INK.keyword }}
          />
        </div>
        <OutputView text={shown.text} plots={shown.plots} error={shown.error} beside={side} />
      </div>
    </Panel>
  );
}
