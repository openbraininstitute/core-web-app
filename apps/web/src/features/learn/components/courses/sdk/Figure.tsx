'use client';

/**
 * The entitysdk course's figure: what EntityCore holds, as a map of its
 * entities; then, slide by slide, the code — each cell as run on the Open
 * Brain Platform against production EntityCore, with what it printed (it needs
 * a login, so it can't run in the browser); and the few things to remember.
 */

import { CodeBlock, Highlighted, OutputView, Panel, parseOutput } from '../ui/Code';
import { CELLS } from './cells';

import type { ReactNode } from 'react';

export const SDK_STEPS = [
  'entities',
  'install',
  'connect',
  'search',
  'filters',
  'lazy',
  'fields',
  'get',
  'download',
  'analyse',
  'memodel',
  'recording',
  'trace',
  'register',
  'gotchas',
] as const;
export type SdkStep = (typeof SDK_STEPS)[number];

const SERIF = "Georgia, 'Times New Roman', serif";
const Note = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span
    className={`text-[12.5px] text-slate-400 italic ${className}`}
    style={{ fontFamily: SERIF }}
  >
    {children}
  </span>
);

/** A cell as it ran: its code, and what it printed — captured from the platform. */
function Ran({ step }: { step: SdkStep }) {
  const cell = CELLS[step];
  const out = parseOutput(cell.output);
  return (
    <Panel
      label={cell.label}
      right={<span style={{ color: '#64748b' }}>ran on the Open Brain Platform</span>}
    >
      <div className={cell.side ? 'md:grid md:grid-cols-[1.15fr_1fr]' : ''}>
        <pre className="overflow-x-auto px-4 py-3">
          <Highlighted code={cell.code} lit={cell.lit} />
        </pre>
        <OutputView text={out.text} plots={out.plots} error={cell.error} beside={cell.side} />
      </div>
    </Panel>
  );
}

/**
 * The map: the kinds of entity this course uses, and how they point to each
 * other — a morphology to its subject and region, an ME-model to its
 * morphology and e-model, a simulation to its circuit and results — each with
 * its files, its assets.
 */
function Entities() {
  type Node = { id: string; x: number; y: number; files?: string; lit?: boolean };
  const nodes: Node[] = [
    { id: 'Species', x: 90, y: 40 },
    { id: 'Subject', x: 90, y: 120 },
    { id: 'BrainRegion', x: 90, y: 210 },
    { id: 'CellMorphology', x: 300, y: 120, files: 'swc · asc · h5', lit: true },
    { id: 'ElectricalCellRecording', x: 300, y: 230, files: 'nwb', lit: true },
    { id: 'EModel', x: 510, y: 40, files: 'hoc · mod' },
    { id: 'MEModel', x: 510, y: 140, lit: true },
    { id: 'Circuit', x: 710, y: 140, files: 'SONATA' },
    { id: 'Simulation', x: 710, y: 40, files: 'config' },
    { id: 'SimulationResult', x: 710, y: 230, files: 'spikes · traces' },
  ];
  const edges: [string, string][] = [
    ['Subject', 'Species'],
    ['CellMorphology', 'Subject'],
    ['CellMorphology', 'BrainRegion'],
    ['ElectricalCellRecording', 'Subject'],
    ['ElectricalCellRecording', 'BrainRegion'],
    ['MEModel', 'CellMorphology'],
    ['MEModel', 'EModel'],
    ['Circuit', 'MEModel'],
    ['Simulation', 'Circuit'],
    ['SimulationResult', 'Simulation'],
  ];
  const at = (id: string) => nodes.find((n) => n.id === id) ?? nodes[0];
  return (
    <svg
      viewBox="0 0 810 290"
      className="w-full max-w-4xl text-slate-300"
      role="img"
      aria-label="A map of EntityCore's entities: species, subject and brain region; morphologies and recordings; e-models and ME-models; circuits, simulations and their results — each pointing to the ones it was made from, each carrying files."
    >
      <defs>
        <marker
          id="sdk-head"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" opacity="0.5" />
        </marker>
      </defs>
      {edges.map(([a, b]) => {
        const [p, q] = [at(a), at(b)];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const shrink = (k: number) => [p.x + (dx * k) / len, p.y + (dy * k) / len];
        const [x1, y1] = shrink(60);
        const [x2, y2] = shrink(len - 64);
        return (
          <line
            key={a + b}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="1.2"
            markerEnd="url(#sdk-head)"
          />
        );
      })}
      {nodes.map((n) => (
        <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
          <rect
            x="-86"
            y="-17"
            width="172"
            height="34"
            rx="8"
            className={n.lit ? 'fill-sky-500/10 stroke-sky-500' : 'fill-slate-900 stroke-slate-700'}
            strokeWidth="1.2"
          />
          <text textAnchor="middle" y="4.5" className="fill-slate-100 font-mono" fontSize="11.5">
            {n.id}
          </text>
          {n.files && (
            <text
              textAnchor="middle"
              y="31"
              className="fill-slate-400"
              fontSize="11"
              fontStyle="italic"
              fontFamily={SERIF}
            >
              files: {n.files}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** The three things a client needs: who you are, which platform, which project. */
function Connect() {
  const parts = [
    ['token', 'who you are', 'obi_auth logs you in'],
    ['environment', 'which platform', 'production, or staging for testing'],
    ['project', 'which lab and project', "public data, plus your project's own"],
  ];
  return (
    <div className="flex flex-col gap-3">
      {parts.map(([name, what, how]) => (
        <div key={name} className="flex items-baseline gap-3">
          <span className="w-24 shrink-0 text-right font-mono text-[13px] text-sky-400">
            {name}
          </span>
          <span className="flex flex-col">
            <span className="text-[14px] text-slate-200">{what}</span>
            <Note>{how}</Note>
          </span>
        </div>
      ))}
    </div>
  );
}

/** What to remember, each with what showed it in this course. */
function Gotchas() {
  const items = [
    [
      'Searches are lazy',
      'Nothing is fetched until you use the results — .all(), .first(), .one() or a loop — and each can be used once.',
    ],
    [
      '.one() means exactly one',
      'Two recordings share the name C060116A6-SR-C1: adding the e-type to the query made it one.',
    ],
    [
      'Filters follow the entity',
      'Morphologies filter on subject__species__name, ME-models on species__name. An unknown filter is refused, with the list of the allowed ones.',
    ],
    [
      "Public, or your project's",
      "Without a project you see public data only; with one, public data and your project's own.",
    ],
    [
      'Production and staging are separate',
      'Each has its own login, its own ids and its own data.',
    ],
    [
      'What you add starts private',
      'A registered entity belongs to your project until it is made public.',
    ],
  ];
  return (
    <div className="grid w-full max-w-4xl gap-3 sm:grid-cols-2">
      {items.map(([title, body]) => (
        <div key={title} className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
          <div className="text-[14px] font-semibold text-slate-100">{title}</div>
          <div className="mt-1 text-[13px] leading-snug text-slate-400">{body}</div>
        </div>
      ))}
    </div>
  );
}

const CONNECT = `from obi_auth import get_token
from obi_notebook import get_projects
from entitysdk import Client, models

token = get_token(environment="production", auth_mode="daf")   # log in
project = get_projects.get_projects(token)                      # pick a project
client = Client(
    environment="production",
    project_context=project,
    token_manager=token,
)`;

export default function SdkFigure({ step, back = false }: { step: SdkStep; back?: boolean }) {
  let body: ReactNode;
  if (step === 'entities') body = <Entities />;
  else if (step === 'gotchas') body = <Gotchas />;
  else if (step === 'install')
    body = (
      // in a column as wide as the words' above, the code at its left, level with them
      <div className="flex w-full max-w-5xl flex-col gap-3 md:pr-[40%]">
        <CodeBlock
          lang="shell"
          label="terminal"
          code={'$ pip install entitysdk\n$ pip install obi-auth obi-notebook'}
        />
        <Note className="text-center">
          Python 3.11 or newer. The platform&apos;s own notebooks have all three installed already.
        </Note>
      </div>
    );
  else if (step === 'connect')
    body = (
      <div className="grid w-full max-w-5xl items-center gap-8 md:grid-cols-[3fr_2fr]">
        <CodeBlock label="connect.py" code={CONNECT} lit={[5, 6, 7, 8, 9, 10, 11]} />
        <div className="flex justify-center">
          <Connect />
        </div>
      </div>
    );
  else
    body = (
      <div className={`w-full max-w-5xl ${CELLS[step].side ? '' : 'md:pr-[40%]'}`}>
        <Ran step={step} />
      </div>
    );
  return (
    <div
      key={step}
      className={`flex w-full flex-1 items-start justify-center pt-1 ${back ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}
    >
      {body}
    </div>
  );
}
