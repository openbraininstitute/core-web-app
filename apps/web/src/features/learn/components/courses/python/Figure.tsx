'use client';

/**
 * The Python course's figure: on each slide, a cell of code you can edit and
 * run in the browser, with what it printed — beside it, where it helps, a
 * small picture of the idea; and, at the end, a notebook.
 */

import { useContext } from 'react';

import { Embedded } from '../../embedded';
import { Highlighted, OutputView, parseOutput } from '../ui/Code';
import Runnable from '../ui/Runnable';
import { CELLS } from './cells';

import type { ReactNode } from 'react';

export const PYTHON_STEPS = [
  'hello',
  'variables',
  'numbers',
  'strings',
  'lists',
  'loops',
  'conditions',
  'functions',
  'dicts',
  'packages',
  'numpy',
  'simulate',
  'errors',
  'notebooks',
] as const;
export type PythonStep = (typeof PYTHON_STEPS)[number];

/** A box with a value in it, in the theme's ink — for the pictures beside the code. */
function Box({ children, lit = false }: { children: ReactNode; lit?: boolean }) {
  return (
    <span
      className={`inline-flex min-w-[3.2rem] items-center justify-center rounded-md border px-2 py-1.5 font-mono text-[13px] ${
        lit ? 'border-sky-500/70 bg-sky-500/10 text-slate-100' : 'border-slate-700 text-slate-200'
      }`}
    >
      {children}
    </span>
  );
}

/** The italic serif the figures name things in. */
const Note = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span
    className={`font-serif text-[12.5px] text-slate-400 italic ${className}`}
    style={{ fontFamily: 'Georgia, serif' }}
  >
    {children}
  </span>
);

/** Beside the code: names and the values they stand for. */
function Names() {
  return (
    <div className="flex flex-col gap-3">
      {[
        ['resting', '-65', 'was -70'],
        ['threshold', '-55', ''],
      ].map(([name, value, was]) => (
        <div key={name} className="flex items-center gap-3">
          <span className="w-20 text-right font-mono text-[13px] text-sky-400">{name}</span>
          <span className="text-slate-500">→</span>
          <Box lit>{value}</Box>
          {was && <Note>{was}</Note>}
        </div>
      ))}
      <Note className="mt-1">a name points at a value</Note>
    </div>
  );
}

/** Beside the code: a list's boxes, each with its place counted from the front and from the back. */
function Indexed() {
  const values = ['12.5', '30.1', '47.9', '71.2'];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex gap-1.5">
        {values.map((_, k) => (
          <span key={k} className="w-[3.4rem] text-center font-mono text-[11px] text-sky-400">
            {k}
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        {values.map((v, k) => (
          <span key={v} className="w-[3.4rem]">
            <Box lit={k === 0 || k === values.length - 1}>{v}</Box>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        {values.map((_, k) => (
          <span key={k} className="w-[3.4rem] text-center font-mono text-[11px] text-slate-500">
            {k - values.length}
          </span>
        ))}
      </div>
      <Note className="mt-2">spikes[0] is the first; spikes[-1] the last</Note>
    </div>
  );
}

/** Beside the code: the loop going round its items, one at a time. */
function Round() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1.5">
        {['12.5', '30.1', '47.9', '71.2', '95.0'].map((v, k) => (
          <Box key={v} lit={k === 2}>
            {v}
          </Box>
        ))}
      </div>
      <svg viewBox="0 0 300 40" className="w-[300px] text-slate-500" aria-hidden="true">
        <path
          d="M20 8 C 20 34, 280 34, 280 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M14 14 L20 6 L26 14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <Note>t takes each value in turn; the indented lines run for each</Note>
    </div>
  );
}

/** Beside the code: the choice, made in order. */
function Choice() {
  const rows = [
    ['v >= threshold', 'spike!'],
    ['elif v > threshold - 5', 'close to threshold'],
    ['else', 'quiet'],
  ];
  return (
    <div className="flex flex-col gap-2">
      {rows.map(([test, then], k) => (
        <div key={test} className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-slate-500">{k + 1}</span>
          <Box>{test}</Box>
          <span className="text-slate-500">→</span>
          <Note>{then}</Note>
        </div>
      ))}
      <Note className="mt-1">the first true test wins; the rest are skipped</Note>
    </div>
  );
}

/** Beside the code: a function as a machine — what goes in, what comes out. */
function Machine() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1.5">
        <Box>5</Box>
        <Box>140</Box>
      </div>
      <span className="text-slate-500">↓</span>
      <span className="rounded-lg border border-sky-500/70 bg-sky-500/10 px-4 py-2 font-mono text-[13px] text-slate-100">
        nernst(c_out, c_in)
      </span>
      <span className="text-slate-500">↓</span>
      <Box lit>-89.0</Box>
      <Note className="mt-1">inputs in, one result back</Note>
    </div>
  );
}

/** Beside the code: a dictionary as a little table of keys and values. */
function Table() {
  return (
    <div className="flex flex-col gap-1.5">
      {[
        ['kind', 'Martinotti cell'],
        ['layer', '5'],
        ['etype', 'bAC'],
        ['marker', 'SST'],
      ].map(([key, value], k) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-16 text-right font-mono text-[13px] text-sky-400">
            &quot;{key}&quot;
          </span>
          <span className="text-slate-500">→</span>
          <Box lit={k === 3}>{value}</Box>
        </div>
      ))}
      <Note className="mt-1">look a value up by its key</Note>
    </div>
  );
}

/** Beside the code: one line of NumPy, working on every element at once. */
function Arrays() {
  const t = [0, 20, 40, 60, 80];
  const v = ['-55.0', '-64.5', '-68.0', '-69.3', '-69.7'];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1.5">
        {t.map((x) => (
          <Box key={x}>{x}</Box>
        ))}
      </div>
      <span className="font-mono text-[12px] text-slate-400">-70 + 15 * np.exp(-t / 20)</span>
      <div className="flex gap-1.5">
        {v.map((x) => (
          <Box key={x} lit>
            {x}
          </Box>
        ))}
      </div>
      <Note className="mt-1">no loop: the arithmetic applies to each element</Note>
    </div>
  );
}

const BESIDE: Partial<Record<PythonStep, () => ReactNode>> = {
  variables: Names,
  lists: Indexed,
  loops: Round,
  conditions: Choice,
  functions: Machine,
  dicts: Table,
  numpy: Arrays,
};

/** A notebook, as Jupyter shows one: notes, and code cells numbered in the order they ran, each with its output under it. */
function Notebook() {
  const lif = parseOutput(CELLS.simulate.output);
  const cell = (n: number, code: string, out?: ReactNode) => (
    <div className="flex gap-3">
      <span className="w-9 shrink-0 pt-2.5 text-right font-mono text-[11px] text-slate-500">
        [{n}]:
      </span>
      <div
        className="min-w-0 flex-1 overflow-hidden rounded-lg"
        style={{ background: 'var(--screen)' }}
      >
        <pre className="overflow-x-auto px-4 py-2.5 font-mono text-[13px] leading-[1.6]">
          <Highlighted code={code} />
        </pre>
        {out}
      </div>
    </div>
  );
  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-2 text-[11px] text-slate-500">
        <span className="font-mono">spiking.ipynb</span>
        <span className="ml-auto font-mono">Python 3 · idle</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="pl-12">
          <div className="text-[15px] font-semibold text-slate-100">
            A leaky integrate-and-fire neuron
          </div>
          <div className="text-[13px] text-slate-400">
            Notes go between the cells. Run the cells in order; change one and run it again.
          </div>
        </div>
        {cell(
          1,
          'import numpy as np\nimport matplotlib.pyplot as plt\nfrom lif import simulate   # the loop from before, as a function'
        )}
        {cell(
          2,
          't, v = simulate(drive=18.0)\nplt.plot(t, v)\nplt.show()',
          <OutputView text={lif.text} plots={lif.plots} />
        )}
      </div>
    </div>
  );
}

export default function PythonFigure({ step, back = false }: { step: PythonStep; back?: boolean }) {
  const Beside = BESIDE[step];
  // outside a course, as on the Learn page's card, it fills the box it is given, edge to edge
  const embedded = useContext(Embedded);
  return (
    <div
      key={step}
      className={
        embedded
          ? 'flex w-full flex-1 items-stretch'
          : `flex w-full flex-1 items-start justify-center pt-1 ${back ? 'animate-slide-in-left' : 'animate-slide-in-right'}`
      }
    >
      {step === 'notebooks' ? (
        <Notebook />
      ) : (
        <div
          className={`grid w-full items-center gap-8 ${
            Beside
              ? `${embedded ? '' : 'max-w-5xl '}md:grid-cols-[3fr_2fr]`
              : embedded
                ? ''
                : CELLS[step].side
                  ? 'max-w-5xl'
                  : // as wide as the slides with a picture beside, the cell in its left part: so
                    // its left edge is the words' above it, as on those slides, not centred
                    'max-w-5xl md:grid-cols-[3fr_2fr]'
          }`}
        >
          <Runnable cell={CELLS[step]} />
          {Beside && (
            <div className="flex justify-center">
              <Beside />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
