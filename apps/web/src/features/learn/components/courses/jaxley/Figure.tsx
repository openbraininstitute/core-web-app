'use client';

/**
 * The NEURON and Jaxley course's figure. Two canvases, each carried from
 * slide to slide: what any simulator has to do (Solve), and fitting a model
 * to a recording (Fit). Between them, the code — each cell as it ran, with
 * NEURON 9.0.2 and Jaxley 0.14, and what it printed — NEURON's channels in
 * NMODL and Jaxley's in Python, NEURON's circuits across processors, a sweep
 * run as one computation, the Jaxley paper's numbers, the two side by side,
 * and where each runs on the Open Brain Platform.
 */

import { Fragment, type ReactNode } from 'react';

import { CodeBlock, Highlighted, INK, OutputView, Panel, parseOutput } from '../ui/Code';
import { CELLS } from './cells';
import FitFigure, { isFitStep } from './Fit';
import { SWEEP, TRUTH } from './landscape';
import SolveFigure, { isSolveStep } from './Solve';

import type { Cell } from '../ui/Runnable';

export const JAXLEY_STEPS = [
  'cell',
  'split',
  'spread',
  'stiff',
  'matrix',
  'neuron',
  'nmodl',
  'circuits',
  'search',
  'jaxley',
  'same',
  'channel',
  'gradient',
  'descent',
  'fit',
  'sweep',
  'scale',
  'compare',
  'platform',
] as const;
export type JaxleyStep = (typeof JAXLEY_STEPS)[number];

const SERIF = "Georgia, 'Times New Roman', serif";
const Note = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span
    className={`text-[12.5px] text-slate-400 italic ${className}`}
    style={{ fontFamily: SERIF }}
  >
    {children}
  </span>
);

/** A cell as it ran: its code, and what it printed. */
function Ran({ cell, by }: { cell: Cell; by: string }) {
  const out = parseOutput(cell.output);
  return (
    <Panel label={cell.label} right={<span style={{ color: INK.faint }}>{by}</span>} small>
      <div className={cell.side ? 'md:grid md:grid-cols-[1.3fr_1fr]' : ''}>
        <pre className="overflow-x-auto px-4 py-3">
          <Highlighted code={cell.code} lit={cell.lit} />
        </pre>
        <OutputView text={out.text} plots={out.plots} error={cell.error} beside={cell.side} />
      </div>
    </Panel>
  );
}

const NMODL = `NEURON {
    SUFFIX kdr
    USEION k READ ek WRITE ik
    RANGE gbar
}
PARAMETER { gbar = 0.036 (S/cm2) }
ASSIGNED { v (mV)  ek (mV)  ik (mA/cm2)  a (/ms)  b (/ms) }
STATE { n }

BREAKPOINT {
    SOLVE gates METHOD cnexp
    ik = gbar * n^4 * (v - ek)
}
INITIAL { rates(v)  n = a / (a + b) }
DERIVATIVE gates {
    rates(v)
    n' = a * (1 - n) - b * n
}
PROCEDURE rates(v (mV)) {
    a = 0.01 * (v + 55) / (1 - exp(-(v + 55) / 10))
    b = 0.125 * exp(-(v + 65) / 80)
}`;

const COMPILED = `Mod files: "kdr.mod"
 -> NMODL ../kdr.mod
Translating kdr.mod into arm64/kdr.cpp
 -> Compiling arm64/kdr.cpp
 => LINKING shared library "arm64/libnrnmech.dylib"
Successfully created arm64/special`;

const CHANNEL = `class Kdr(Channel):
    def __init__(self, name=None):
        self.current_is_in_mA_per_cm2 = True
        super().__init__(name)
        self.channel_params = {"Kdr_gbar": 0.036, "Kdr_ek": -77.0}
        self.channel_states = {"Kdr_n": 0.3}
        self.current_name = "i_K"

    def update_states(self, states, dt, v, params):
        a, b = rates(v)
        n = solve_gate_exponential(states["Kdr_n"], dt, a, b)
        return {"Kdr_n": n}

    def compute_current(self, states, v, params):
        n = states["Kdr_n"]
        return params["Kdr_gbar"] * n**4 * (v - params["Kdr_ek"])

    def init_state(self, states, v, params, delta_t):
        a, b = rates(v)
        return {"Kdr_n": a / (a + b)}

def rates(v):
    a = 0.01 * (v + 55) / (1 - jnp.exp(-(v + 55) / 10))
    b = 0.125 * jnp.exp(-(v + 65) / 80)
    return a, b`;

/** NMODL's file, and what compiling it says; then the line that puts it in a cell. */
function Nmodl() {
  return (
    <div className="grid w-full max-w-5xl items-start gap-5 md:grid-cols-[1.25fr_1fr]">
      <CodeBlock code={NMODL} lang="nmodl" label="kdr.mod" small lit={[2, 3, 12, 17]} />
      <div className="flex flex-col gap-3">
        <Panel label="terminal" small>
          <pre className="overflow-x-auto px-4 py-3">
            <Highlighted code="$ nrnivmodl" lang="shell" />
            <div style={{ color: INK.dim }}>
              <Highlighted code={COMPILED} lang="text" />
            </div>
          </pre>
        </Panel>
        <CodeBlock code={'soma.insert("kdr")   # then, in Python'} small />
        <Note className="px-1">
          Checked: inserted in a cell, it gives the same voltages as NEURON&apos;s own hh potassium
          channel.
        </Note>
      </div>
    </div>
  );
}

/** A circuit's cells shared out between processors, which swap spikes; and how the platform starts one. */
function Circuits() {
  const ranks = [0, 1, 2, 3];
  const glyph = (x: number, y: number, k: number) => (
    <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
      <path
        d={`M0 -9 L-7 6 L7 6 Z`}
        className={k % 3 === 0 ? 'fill-sky-500' : 'fill-slate-400'}
        opacity="0.85"
      />
      <path
        d="M0 -9 L0 -24 M0 -18 L-7 -26 M0 -18 L7 -26 M-5 6 L-11 14 M5 6 L11 14"
        className="stroke-slate-400"
        strokeWidth="1.3"
      />
    </g>
  );
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-4">
      <svg
        viewBox="0 0 760 210"
        className="w-full text-slate-300"
        role="img"
        aria-label="A circuit's neurons shared out between four processors, each simulating its own, swapping spikes between them."
      >
        <defs>
          <marker
            id="jx-head"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 z" fill="currentColor" opacity="0.6" />
          </marker>
        </defs>
        {ranks.map((r) => {
          const x = 20 + r * 190;
          return (
            <g key={r}>
              <rect
                x={x}
                y={20}
                width={150}
                height={130}
                rx={12}
                className="fill-slate-900 stroke-slate-700"
                strokeWidth="1.2"
              />
              <text
                x={x + 75}
                y={42}
                textAnchor="middle"
                className="fill-slate-300"
                fontSize="12.5"
                fontFamily={SERIF}
                fontStyle="italic"
              >
                processor {r + 1}
              </text>
              {[0, 1, 2, 3, 4, 5].map((k) =>
                glyph(x + 30 + (k % 3) * 45, 88 + Math.floor(k / 3) * 44, k + r)
              )}
            </g>
          );
        })}
        {[0, 1, 2].map((r) => (
          <g key={r}>
            <line
              x1={175 + r * 190}
              y1={70}
              x2={205 + r * 190}
              y2={70}
              stroke="currentColor"
              strokeOpacity="0.6"
              strokeDasharray="3 3"
              markerEnd="url(#jx-head)"
            />
            <line
              x1={205 + r * 190}
              y1={100}
              x2={175 + r * 190}
              y2={100}
              stroke="currentColor"
              strokeOpacity="0.6"
              strokeDasharray="3 3"
              markerEnd="url(#jx-head)"
            />
          </g>
        ))}
        <text
          x={380}
          y={185}
          textAnchor="middle"
          className="fill-slate-400"
          fontSize="13"
          fontFamily={SERIF}
          fontStyle="italic"
        >
          each processor simulates its own cells; between them, only spikes are sent, at regular
          intervals
        </text>
      </svg>
      <CodeBlock
        lang="shell"
        small
        label="how the platform starts a simulation"
        className="w-full"
        code="$ mpirun -np 4 special -mpi -python $NEURODAMUS_PYTHON/init.py --configFile=simulation_config.json"
      />
    </div>
  );
}

/** NMODL and Python, the same channel each way. */
function Channel() {
  return (
    <div className="flex w-full max-w-6xl flex-col items-center gap-3">
      <div className="grid w-full items-start gap-4 md:grid-cols-[1fr_1.15fr]">
        <CodeBlock
          code={NMODL}
          lang="nmodl"
          label="kdr.mod — for NEURON"
          small
          lit={[6, 8, 12, 17]}
        />
        <CodeBlock code={CHANNEL} label="kdr.py — for Jaxley" small lit={[5, 6, 11, 16]} />
      </div>
      <Note className="text-center">
        Imports left out. Checked: in the same cell, the two give the same voltages, to within a
        ten-billionth of a millivolt.
      </Note>
    </div>
  );
}

/** Thirty of the sweep's voltages, each a pair of conductances: sodium across, potassium up. */
function SweepGrid() {
  const [cols, rows] = [SWEEP.gNa.length, SWEEP.gK.length];
  const [cw, ch, left, top] = [92, 56, 46, 14];
  const isTruth = (c: number, r: number) =>
    Math.abs(SWEEP.gNa[c] - TRUTH[0]) < 1e-6 && Math.abs(SWEEP.gK[r] - TRUTH[1]) < 1e-6;
  const W = left + cols * cw + 8;
  const H = top + rows * ch + 40;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full text-slate-300"
      role="img"
      aria-label="Thirty of the sweep's simulated voltages in a grid, sodium conductance increasing across and potassium up: too little sodium and the cell stays quiet; more, and it spikes."
    >
      {SWEEP.traces.map((row, r) =>
        row.map((trace, c) => {
          const x0 = left + c * cw + 6;
          const y0 = top + (rows - 1 - r) * ch + 4;
          const [w, h] = [cw - 12, ch - 12];
          const pts = trace
            .map(
              (v, i) =>
                `${(x0 + (i / (trace.length - 1)) * w).toFixed(1)},${(y0 + h - ((v + 80) / 130) * h).toFixed(1)}`
            )
            .join(' ');
          const lit = isTruth(c, r);
          return (
            <Fragment key={`${r}-${c}`}>
              <rect
                x={x0 - 3}
                y={y0 - 2}
                width={w + 6}
                height={h + 4}
                rx={5}
                className={
                  lit ? 'fill-amber-500/10 stroke-amber-500' : 'fill-slate-900/40 stroke-slate-800'
                }
                strokeWidth="1"
              />
              <polyline
                points={pts}
                fill="none"
                className={lit ? 'stroke-amber-500' : 'stroke-slate-300'}
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </Fragment>
          );
        })
      )}
      {SWEEP.gNa.map((g, c) => (
        <text
          key={g}
          x={left + c * cw + cw / 2}
          y={top + rows * ch + 12}
          textAnchor="middle"
          className="fill-slate-400"
          fontSize="11"
          fontFamily={SERIF}
        >
          {g.toFixed(3)}
        </text>
      ))}
      {SWEEP.gK.map((g, r) => (
        <text
          key={g}
          x={left - 6}
          y={top + (rows - 1 - r) * ch + ch / 2}
          textAnchor="end"
          className="fill-slate-400"
          fontSize="11"
          fontFamily={SERIF}
        >
          {g.toFixed(3)}
        </text>
      ))}
      <text
        x={left + (cols * cw) / 2}
        y={H - 6}
        textAnchor="middle"
        className="fill-slate-400"
        fontSize="12"
        fontFamily={SERIF}
        fontStyle="italic"
      >
        sodium conductance across, potassium up (S/cm²)
      </text>
    </svg>
  );
}

/** The Jaxley paper's numbers: how far gradients go. */
function Scale() {
  const items = [
    [
      '3.2 million',
      'parameters',
      'Every conductance in a network of 2,000 reconstructed neurons and a million synapses: its gradient took 144 s on one GPU. Nudging each parameter in turn instead would take over two years.',
    ],
    [
      '19',
      'parameters',
      "A layer 5 pyramidal cell's channels: gradient descent needed almost ten times fewer simulations than a genetic algorithm.",
    ],
    [
      '1,390',
      'parameters',
      "Its channel densities branch by branch: gradient descent fitted them within 100 iterations; after 500, a genetic algorithm's loss was still a hundred times higher.",
    ],
    [
      '100,000',
      'parameters',
      'A network of detailed neurons, trained like a deep network to recognise handwritten digits.',
    ],
  ];
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-3">
      <div className="grid w-full gap-3 sm:grid-cols-2">
        {items.map(([n, unit, body]) => (
          <div key={n} className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[24px] font-semibold text-slate-100 tabular-nums">{n}</span>
              <span className="text-[13px] text-slate-400">{unit}</span>
            </div>
            <div className="mt-1 text-[13px] leading-snug text-slate-400">{body}</div>
          </div>
        ))}
      </div>
      <Note className="text-center">
        Deistler et al., Jaxley: differentiable simulation enables large-scale training of detailed
        biophysical models of neural dynamics. Nature Methods, 2025.
      </Note>
    </div>
  );
}

/** The two side by side. */
function Compare() {
  const rows: [string, string, string][] = [
    ['Written in', 'C and C++, driven from Python', 'Python, on JAX'],
    ['Channels', 'NMODL files, compiled', 'Python classes'],
    ['Runs on', 'CPUs; its CoreNEURON engine, GPUs too', 'CPUs, GPUs and TPUs'],
    ['Many at once', 'many processors, over MPI', 'many simulations as one, with vmap'],
    ['Gradients', 'not built in', 'by backpropagation'],
    ['Fitting', "searches, such as BluePyOpt's", 'gradient descent, or searches'],
    ['Time step', 'fixed, or adaptive (CVODE)', 'fixed'],
    ['Since', 'the 1980s: most published detailed models', 'published in 2025'],
  ];
  return (
    <div className="w-full max-w-4xl overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="w-[22%] py-2 pr-4 font-normal" />
            <th className="py-2 pr-4 text-[15px] font-semibold text-slate-100">NEURON</th>
            <th className="py-2 text-[15px] font-semibold text-sky-400">Jaxley</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([what, n, j]) => (
            <tr key={what} className="border-b border-slate-800">
              <td className="py-2 pr-4 text-slate-400 italic" style={{ fontFamily: SERIF }}>
                {what}
              </td>
              <td className="py-2 pr-4 text-slate-200">{n}</td>
              <td className="py-2 text-slate-200">{j}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Where each runs on the platform. */
function Platform() {
  const chip = (text: string, lit = false) => (
    <span
      className={`rounded-lg border px-3 py-1.5 text-[14px] ${
        lit
          ? 'border-sky-500 bg-sky-500/10 font-medium text-slate-100'
          : 'border-slate-700 bg-slate-900/40 text-slate-200'
      }`}
    >
      {text}
    </span>
  );
  const to = <span className="text-[15px] text-slate-500">→</span>;
  const rows: { title: string; chain: ReactNode; detail: string; faint?: boolean }[] = [
    {
      title: 'Simulating single neurons, synaptomes and circuits',
      chain: (
        <>
          {chip('Simulate workflows')} {to} {chip('neurodamus')} {to} {chip('NEURON', true)}
        </>
      ),
      detail:
        "neurodamus sets the simulation up from the circuit's files, and runs NEURON across processors",
    },
    {
      title: 'Fitting e-models to recordings',
      chain: (
        <>
          {chip('BluePyEModel')} {to} {chip('BluePyOpt')} {to} {chip('NEURON', true)}
        </>
      ),
      detail: 'evolutionary searches, each candidate e-model simulated in NEURON',
    },
    {
      title: 'Jaxley',
      chain: chip('notebooks'),
      detail: "not part of the platform's workflows: being tried out in notebooks",
      faint: true,
    },
  ];
  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      {rows.map((r) => (
        <div
          key={r.title}
          className={`rounded-xl border px-5 py-4 ${r.faint ? 'border-dashed border-slate-700' : 'border-slate-800 bg-slate-900/30'}`}
        >
          <div className="text-[15px] font-semibold text-slate-100">{r.title}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">{r.chain}</div>
          <Note className="mt-2 block">{r.detail}</Note>
        </div>
      ))}
    </div>
  );
}

export default function JaxleyFigure({ step, back = false }: { step: JaxleyStep; back?: boolean }) {
  if (isSolveStep(step)) return <SolveFigure step={step} back={back} />;
  if (isFitStep(step)) return <FitFigure step={step} back={back} />;
  let body: ReactNode = null;
  if (step === 'neuron')
    body = (
      <div className="w-full max-w-5xl">
        <Ran cell={CELLS.neuron} by="ran with NEURON 9.0.2" />
      </div>
    );
  else if (step === 'nmodl') body = <Nmodl />;
  else if (step === 'circuits') body = <Circuits />;
  else if (step === 'jaxley')
    body = (
      <div className="w-full max-w-5xl">
        <Ran cell={CELLS.jaxley} by="ran with Jaxley 0.14" />
      </div>
    );
  else if (step === 'same')
    body = (
      <div className="w-full max-w-5xl">
        <Ran cell={CELLS.same} by="ran with NEURON 9.0.2 and Jaxley 0.14" />
      </div>
    );
  else if (step === 'channel') body = <Channel />;
  else if (step === 'fit')
    body = (
      <div className="w-full max-w-5xl">
        <Ran cell={CELLS.fit} by="ran with Jaxley 0.14" />
      </div>
    );
  else if (step === 'sweep')
    body = (
      <div className="grid w-full max-w-6xl items-center gap-5 md:grid-cols-[1.25fr_1fr]">
        <Ran cell={CELLS.sweep} by="ran with Jaxley 0.14" />
        <SweepGrid />
      </div>
    );
  else if (step === 'scale') body = <Scale />;
  else if (step === 'compare') body = <Compare />;
  else if (step === 'platform') body = <Platform />;
  return (
    <div
      key={step}
      className={`flex w-full flex-1 items-start justify-center pt-1 ${back ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}
    >
      {body}
    </div>
  );
}
