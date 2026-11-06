'use client';

/**
 * The platform course's figure: the Open Brain Platform drawn, not shown —
 * a sketch of its window, which stays put from slide to slide while its
 * content changes, for its sections; and diagrams for what lies behind them:
 * labs and projects, credits, public and private data, models built up in
 * layers, a run from its form to its results, the assistant and MCP, and the
 * services underneath. Section names, data types and workflows are the
 * platform's own, as of October 2026.
 */

import { Fragment, type ReactNode } from 'react';

import { CodeBlock } from '../ui/Code';

export const PLATFORM_STEPS = [
  'what',
  'account',
  'credits',
  'layout',
  'home',
  'data',
  'public',
  'item',
  'models',
  'workflows',
  'run',
  'results',
  'notebooks',
  'assistant',
  'mcp',
  'backend',
  'journey',
] as const;
export type PlatformStep = (typeof PLATFORM_STEPS)[number];

const SERIF = "Georgia, 'Times New Roman', serif";
const Note = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`text-[14px] text-slate-400 italic ${className}`} style={{ fontFamily: SERIF }}>
    {children}
  </span>
);
const Box = ({
  children,
  className = '',
  lit = false,
}: {
  children: ReactNode;
  className?: string;
  lit?: boolean;
}) => (
  <div
    className={`rounded-xl border px-5 py-4 ${lit ? 'border-sky-500 bg-sky-500/10' : 'border-slate-800 bg-slate-900/40'} ${className}`}
  >
    {children}
  </div>
);
const Title = ({ children }: { children: ReactNode }) => (
  <div className="text-[16px] font-semibold text-slate-100">{children}</div>
);
const Body = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`mt-1 text-[14.5px] leading-snug text-slate-400 ${className}`}>{children}</div>
);
const Arrow = ({ down = false }: { down?: boolean }) => (
  <span
    aria-hidden="true"
    className={`self-center justify-self-center text-[20px] text-slate-500 ${down ? 'rotate-90 md:rotate-0' : ''}`}
  >
    →
  </span>
);
/** A numbered marker, pointing out a part of the window. */
const Mark = ({ n }: { n: number }) => (
  <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-amber-500 text-[12.5px] font-semibold text-white">
    {n}
  </span>
);
/** A line of grey, standing for text the sketch leaves out. */
const Skeleton = ({ w = '100%' }: { w?: string }) => (
  <div className="h-2 rounded-full bg-slate-800" style={{ width: w }} />
);

/* ---------------------------------------------------------------- the window */

const TABS = ['Home', 'Data', 'Workflows', 'Notebooks', 'Reports'] as const;
type Tab = (typeof TABS)[number];

/** The platform's window: the lab and project, the sections, the credits, help and the assistant across the top. */
function AppFrame({
  active,
  marks = false,
  assistant = null,
  children,
}: {
  active: Tab | null;
  marks?: boolean;
  assistant?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-5xl overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-800 px-3 py-2">
        <span className="flex items-center gap-1.5">
          <span className="rounded-full border border-slate-700 px-2.5 py-0.5 text-[13px] text-slate-300">
            you · Your lab · Project 1
          </span>
          {marks && <Mark n={1} />}
        </span>
        <nav className="flex items-center gap-3 text-[14px]">
          {TABS.map((t) => (
            <span
              key={t}
              className={
                t === active
                  ? 'border-b-2 border-sky-500 pb-0.5 font-semibold text-sky-400'
                  : 'pb-0.5 text-slate-400'
              }
            >
              {t}
            </span>
          ))}
          {marks && <Mark n={2} />}
        </nav>
        <span className="ml-auto flex items-center gap-3 text-[13.5px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="rounded-full border border-slate-700 px-2 py-0.5">⛁ credits</span>
            {marks && <Mark n={3} />}
          </span>
          <span className="hidden sm:inline">Help</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 ${assistant ? 'bg-sky-500 text-white' : 'border border-slate-700'}`}
            >
              ✦ OBI Assistant
            </span>
            {marks && <Mark n={4} />}
          </span>
        </span>
      </div>
      <div className="flex min-h-[340px]">
        <div className="min-w-0 flex-1 p-4">{children}</div>
        {assistant && (
          <div className="hidden w-[320px] shrink-0 border-l border-slate-800 bg-slate-900/40 p-3 md:block">
            {assistant}
          </div>
        )}
      </div>
    </div>
  );
}

/** A section's own menu, down its left side. */
function SideMenu({ items, on }: { items: string[]; on: string }) {
  return (
    <div className="hidden w-[170px] shrink-0 flex-col gap-1 border-r border-slate-800 pr-3 text-[14px] sm:flex">
      {items.map((x) => (
        <span
          key={x}
          className={
            x === on
              ? 'rounded-md bg-sky-500/10 px-2 py-1 font-medium text-sky-400'
              : 'px-2 py-1 text-slate-400'
          }
        >
          {x}
        </span>
      ))}
    </div>
  );
}

function Home({ marks = false }: { marks?: boolean }) {
  return (
    <div className="flex gap-4">
      <SideMenu
        items={['Get started', 'Quick access', 'Tutorials', 'Activities']}
        on="Get started"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="text-[15.5px] font-semibold text-slate-100">Get started</div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((k) => (
            <div key={k} className="flex flex-col gap-2 rounded-lg border border-slate-800 p-3">
              <div className="h-12 rounded-md bg-slate-800/70" />
              <Skeleton w="80%" />
              <Skeleton w="55%" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-500/40 bg-sky-500/5 p-3">
          <span className="text-[14px] font-medium text-slate-200">OBI Assistant · AI-powered</span>
          <span className="flex gap-2">
            {['Try in OBI Assistant', 'Try in OBI Assistant'].map((x, k) => (
              <span
                key={k}
                className="rounded-md border border-sky-500/60 px-2 py-0.5 text-[13px] text-sky-400"
              >
                {x}
              </span>
            ))}
          </span>
        </div>
        {marks && (
          <div className="grid gap-x-6 gap-y-1.5 pt-1 text-[14px] text-slate-400 sm:grid-cols-2">
            {[
              'your lab and project: switch, invite, manage',
              'the sections',
              "the project's credits",
              'the OBI Assistant, in a panel on the right',
            ].map((x, k) => (
              <span key={x} className="flex items-center gap-2">
                <Mark n={k + 1} />
                {x}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const DATA_TYPES: [string, string[]][] = [
  [
    'Experimental',
    [
      'Morphology',
      'Single cell electrophysiology',
      'Ion channel electrophysiology',
      'Neuron density',
      'Bouton density',
      'Synapse per connection',
      'EM mesh',
    ],
  ],
  [
    'Model',
    ['Ion channel model', 'Synthesized morphology', 'E-model', 'ME-model', 'Synaptome', 'Circuit'],
  ],
  [
    'Simulations',
    [
      'Ion channel',
      'Single neuron',
      'Synaptome',
      'Paired neurons',
      'Small microcircuit',
      'Microcircuit',
      'Whole brain circuit',
    ],
  ],
];

function Data() {
  const tree: [number, string, boolean][] = [
    [0, 'Cerebrum', true],
    [1, 'Cerebral cortex', true],
    [2, 'Isocortex', false],
    [2, 'Hippocampal formation', false],
    [2, 'Olfactory areas', false],
    [1, 'Cerebral nuclei', false],
  ];
  return (
    <div className="flex gap-4">
      <div className="hidden w-[190px] shrink-0 flex-col gap-1 border-r border-slate-800 pr-3 text-[14px] sm:flex">
        <span className="pb-1 text-[12.5px] tracking-wide text-slate-500 uppercase">
          Brain region
        </span>
        {tree.map(([depth, name, open]) => (
          <span key={name} className="text-slate-300" style={{ paddingLeft: depth * 12 }}>
            {open ? '▾' : '▸'} {name}
          </span>
        ))}
        <span className="mt-2 flex gap-2 text-[13px] text-sky-400">
          <span>Atlas</span>·<span>3D Visualizer</span>
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-4 text-[14px]">
          <span className="border-b-2 border-sky-500 pb-0.5 font-semibold text-sky-400">
            Public
          </span>
          <span className="pb-0.5 text-slate-400">Project</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {DATA_TYPES.map(([group, types]) => (
            <div key={group} className="flex flex-col gap-1.5">
              <span className="text-[14px] font-semibold text-slate-200">{group}</span>
              {types.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-slate-800 px-2 py-0.5 text-[13.5px] text-slate-300"
                >
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A pyramidal cell, drawn simply, for an item's page. */
function Neuron() {
  return (
    <svg viewBox="0 0 120 170" className="h-[230px] w-auto text-slate-300" aria-hidden="true">
      <g stroke="currentColor" strokeLinecap="round" fill="none">
        <path
          d="M60 104 L60 30 M60 58 L40 40 M60 46 L80 28 M60 30 L48 10 M60 30 L72 8 M40 40 L28 30 M80 28 L94 20"
          strokeWidth="2"
        />
        <path
          d="M56 110 L34 128 L22 132 M34 128 L30 146 M64 110 L86 126 L98 128 M86 126 L90 144 M60 114 L60 160"
          strokeWidth="1.6"
        />
      </g>
      <path d="M60 98 L52 112 L68 112 Z" className="fill-slate-300" />
    </svg>
  );
}

function Item() {
  const tabs = ['Overview', '3D view', 'Analysis', 'Related publications', 'Related artifacts'];
  const fields: [string, string][] = [
    ['Species', 'Rattus norvegicus'],
    ['M-type', 'L5_TPC:A'],
    ['Brain region', 'somatosensory cortex, layer 5'],
    ['Files', 'swc · asc · h5'],
    ['Visibility', 'Public'],
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[15.5px] font-semibold text-slate-100">A morphology&apos;s page</span>
        <span className="flex gap-2 text-[13px]">
          <span className="rounded-md border border-slate-700 px-2 py-0.5 text-slate-300">
            Download
          </span>
          <span className="rounded-md border border-slate-700 px-2 py-0.5 text-slate-300">
            Copy ID
          </span>
        </span>
      </div>
      <div className="flex flex-wrap gap-3 border-b border-slate-800 text-[14px]">
        {tabs.map((t, k) => (
          <span
            key={t}
            className={
              k === 0
                ? 'border-b-2 border-sky-500 pb-1 font-semibold text-sky-400'
                : 'pb-1 text-slate-400'
            }
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-[14px]">
          {fields.map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <span className="w-28 shrink-0 text-slate-500">{k}</span>
              <span className="text-slate-200">{v}</span>
            </div>
          ))}
        </div>
        <Neuron />
      </div>
    </div>
  );
}

const WORKFLOWS: [string, string[]][] = [
  [
    'Build',
    [
      'Ion channel',
      'Single neuron',
      'Synaptome',
      'Electron microscopy circuit',
      'Circuit synaptic physiology',
    ],
  ],
  [
    'Simulate',
    [
      'Ion channel',
      'Single neuron',
      'Synaptome',
      'Paired neurons',
      'Small microcircuit',
      'Microcircuit',
      'Whole brain',
    ],
  ],
  ['Extract', ['Intracellular e-features']],
  ['Process data', ['EM mesh skeletonization']],
  ['Optimize', ['E-model optimization']],
];

function Workflows() {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {WORKFLOWS.map(([group, items]) => (
        <div key={group} className="flex flex-col gap-1.5">
          <span className="text-[14px] font-semibold text-slate-200">{group}</span>
          {items.map((t) => (
            <span
              key={t}
              className="rounded-md border border-slate-800 bg-slate-900/40 px-2 py-1 text-[13.5px] text-slate-300"
            >
              {t}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Results() {
  const rows = [
    ['Current steps, L5 pyramidal cell', 'Simulate', 'Single neuron', 'Done', 'View results'],
    ['Ten synapse placements', 'Build', 'Synaptome', 'Done', 'View results'],
    [
      'A small microcircuit, 1 s',
      'Simulate',
      'Small microcircuit',
      'Running',
      'View configuration',
    ],
  ];
  return (
    <div className="flex gap-4">
      <SideMenu
        items={['Get started', 'Quick access', 'Tutorials', 'Activities']}
        on="Activities"
      />
      <div className="min-w-0 flex-1 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              {['Name', 'Category', 'Type', 'Status', ''].map((h) => (
                <th key={h} className="py-1.5 pr-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, cat, type, status, act]) => (
              <tr key={name} className="border-b border-slate-800/60">
                <td className="py-2 pr-3 text-slate-200">{name}</td>
                <td className="py-2 pr-3 text-slate-400">{cat}</td>
                <td className="py-2 pr-3 text-slate-400">{type}</td>
                <td className="py-2 pr-3">
                  <span className={status === 'Done' ? 'text-teal-500' : 'text-amber-500'}>
                    {status}
                  </span>
                </td>
                <td className="py-2 text-sky-400">{act}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Note className="mt-3 block">
          An illustration: the runs are made up, the columns are the platform&apos;s.
        </Note>
      </div>
    </div>
  );
}

const NOTEBOOKS: [string, string][] = [
  ['Search and download morphologies', 'cellular'],
  ['Current clamp efeature extraction', 'cellular'],
  ['Display single cell simulation results', 'cellular'],
  ['Display circuit composition', 'circuit'],
  ['Connectivity matrix extraction', 'circuit'],
  ['Load circuit simulation campaign results', 'circuit'],
];

function Notebooks() {
  return (
    <div className="flex gap-4">
      <SideMenu items={['Notebooks', 'Results']} on="Notebooks" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-4 text-[14px]">
            <span className="border-b-2 border-sky-500 pb-0.5 font-semibold text-sky-400">
              Public
            </span>
            <span className="pb-0.5 text-slate-400">Project</span>
          </span>
          <span className="flex gap-2 text-[13px]">
            <span className="rounded-md border border-slate-700 px-2 py-0.5 text-slate-300">
              Upload notebook
            </span>
            <span className="rounded-md bg-sky-500 px-2 py-0.5 text-white">Open JupyterHub</span>
          </span>
        </div>
        {NOTEBOOKS.map(([name, scale]) => (
          <div
            key={name}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-1.5"
          >
            <span className="min-w-0 truncate text-[14px] text-slate-200">{name}</span>
            <span className="flex shrink-0 items-center gap-3 text-[13px]">
              <span className="hidden text-slate-500 sm:inline">{scale}</span>
              <span className="text-sky-400">Run notebook</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The assistant's panel: its header, its own greeting, and a question someone might ask. */
function AssistantPanel() {
  return (
    <div className="flex h-full flex-col gap-3 text-[14px]">
      <div className="flex items-center justify-between text-slate-400">
        <span className="font-semibold text-slate-200">OBI Assistant</span>
        <span className="flex gap-2 text-[12.5px]">
          <span>New chat</span>
          <span>History</span>
          <span>Settings</span>
        </span>
      </div>
      <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-slate-300">
        I&apos;m here to help you search the literature, explore our database, and set up your own
        simulations.
      </div>
      <div className="self-end rounded-lg bg-sky-500 px-3 py-2 text-white">
        Which morphologies of layer 5 pyramidal cells are there for rat? Plot one.
      </div>
      <div className="mt-auto rounded-lg border border-slate-700 px-3 py-2 text-slate-500">
        Ask anything…
      </div>
    </div>
  );
}

function Assistant() {
  const can = [
    'search the database, across about 30 kinds of data',
    'search and read the literature',
    'measure morphologies, recordings and circuits',
    'plot morphologies and voltage traces',
    'run Python in a sandbox of your own',
    "fill in a workflow's form",
    'link you to the right page',
  ];
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[15.5px] font-semibold text-slate-100">What it can do</div>
      <ul className="flex flex-col gap-1 text-[14px] text-slate-300">
        {can.map((x) => (
          <li key={x} className="flex gap-2">
            <span className="text-sky-400">✦</span>
            {x}
          </li>
        ))}
      </ul>
      <Note className="mt-1">
        30 messages every 24 hours are free; after that, a credit each. Its settings can ask before
        it runs code.
      </Note>
      <div className="mt-1 md:hidden">
        <AssistantPanel />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- the diagrams */

/** What the platform holds, and what you do with it: a loop. */
function What() {
  const steps = [
    ['Data', 'curated data from labs: shapes, recordings, densities, connections'],
    ['Build', 'models made from the data: channels, neurons, circuits'],
    ['Simulate', 'the models run in the cloud, from a cell to a whole brain'],
    ['Analyse', 'notebooks, and an AI assistant, to make sense of the results'],
  ];
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-3">
      <div className="grid w-full gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {steps.map(([name, what], k) => (
          <Fragment key={name}>
            {k > 0 && <Arrow down />}
            <Box lit={k === 0}>
              <Title>{name}</Title>
              <Body>{what}</Body>
            </Box>
          </Fragment>
        ))}
      </div>
      <Note>and back again: every result is data too, with a record of how it was made</Note>
    </div>
  );
}

function Account() {
  const projects = [
    ['Project 1', 'Administrator: you · Members: two others'],
    ['Teaching', 'Administrator: a colleague · Members: a class'],
  ];
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-2">
      <Box className="w-full max-w-sm text-center">
        <Title>You</Title>
        <Body>one account, one login</Body>
      </Box>
      <span className="text-slate-500">↓</span>
      <Box lit className="w-full max-w-md text-center">
        <Title>Your virtual lab</Title>
        <Body>its administrators, whom you invite; and its credits</Body>
      </Box>
      <span className="text-slate-500">↓</span>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        {projects.map(([name, who]) => (
          <Box key={name}>
            <Title>{name}</Title>
            <Body>{who}</Body>
            <Body className="text-slate-500">
              its data, models, simulations and notebooks; its share of the credits
            </Body>
          </Box>
        ))}
      </div>
    </div>
  );
}

function Credits() {
  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <Box>
          <Title>Bought</Title>
          <Body>by card, or with a promo code, by the lab</Body>
        </Box>
        <Arrow down />
        <Box lit>
          <Title>The lab&apos;s credits</Title>
          <Body>transferred to its projects as they need them</Body>
        </Box>
        <Arrow down />
        <Box>
          <Title>A project&apos;s credits</Title>
          <Body>shown at the top of the window, and spent by its work</Body>
        </Box>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Box>
          <Title>Costs credits</Title>
          <Body>
            launching a workflow — building a model, running a simulation, extracting features ·
            running notebooks · storing data · the assistant, after its free messages
          </Body>
        </Box>
        <Box>
          <Title>Free</Title>
          <Body>
            browsing the data · generating a workflow&apos;s campaign, before it is launched · the
            help pages · 30 assistant messages a day
          </Body>
        </Box>
      </div>
      <Note className="text-center">
        Before anything is launched, its estimated cost is shown, to confirm.
      </Note>
    </div>
  );
}

function Public() {
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-4">
      <div className="relative flex w-full max-w-2xl flex-col items-center rounded-2xl border border-slate-700 px-5 pt-4 pb-5">
        <Title>Public data: everyone sees it</Title>
        <Body className="text-center">
          shared by the community and by OBI, curated and standardized
        </Body>
        <div className="mt-4 grid w-full gap-3 sm:grid-cols-2">
          <Box lit>
            <Title>Project 1&apos;s own data</Title>
            <Body>private: only its members see it — uploads, models, simulations</Body>
          </Box>
          <Box>
            <Title>Another project&apos;s</Title>
            <Body>private to its members</Body>
          </Box>
        </div>
      </div>
      <div className="grid w-full max-w-2xl gap-x-6 gap-y-1 text-[14.5px] text-slate-300 sm:grid-cols-2">
        <span>
          <span className="text-slate-500">With no project open:</span> public data only
        </span>
        <span>
          <span className="text-slate-500">Inside Project 1:</span> public data, and Project
          1&apos;s
        </span>
      </div>
    </div>
  );
}

function Models() {
  const scales = ['Pair', 'Small microcircuit', 'Microcircuit', 'Region', 'System', 'Whole brain'];
  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        <div className="flex flex-col gap-2">
          <Box>
            <Title>Morphology</Title>
            <Body>the cell&apos;s shape: its m-type</Body>
          </Box>
          <Box>
            <Title>E-model</Title>
            <Body>its electrical behaviour, its channels: its e-type</Body>
          </Box>
        </div>
        <Arrow down />
        <Box lit className="flex flex-col justify-center">
          <Title>ME-model</Title>
          <Body>the two together: a neuron to simulate</Body>
        </Box>
        <Arrow down />
        <Box className="flex flex-col justify-center">
          <Title>Synaptome</Title>
          <Body>an ME-model with synapses placed on it</Body>
        </Box>
        <Arrow down />
        <Box className="flex flex-col justify-center">
          <Title>Circuit</Title>
          <Body>many neurons, connected</Body>
        </Box>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Note>circuits, by size:</Note>
        {scales.map((s) => (
          <span
            key={s}
            className="rounded-full border border-slate-700 px-2.5 py-0.5 text-[13.5px] text-slate-300"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function Run() {
  return (
    <div className="grid w-full max-w-5xl items-stretch gap-3 md:grid-cols-[1.3fr_auto_1fr_auto_1fr]">
      <Box>
        <Title>1 · Configure</Title>
        <div className="mt-2 flex flex-col gap-1.5 text-[14px]">
          {['Setup', 'Stimuli & Recordings', 'Targets', 'Manipulations'].map((g) => (
            <div
              key={g}
              className="flex items-center justify-between gap-2 rounded-md border border-slate-800 px-2 py-1"
            >
              <span className="text-slate-300">{g}</span>
              {g === 'Stimuli & Recordings' ? (
                <span className="font-mono text-[13px] text-sky-400">
                  amplitude: 0.1, 0.2, 0.3 nA
                </span>
              ) : (
                <Skeleton w="30%" />
              )}
            </div>
          ))}
        </div>
        <Body>a list of values wherever you want to scan</Body>
      </Box>
      <Arrow down />
      <Box>
        <Title>2 · Generate</Title>
        <div className="mt-2 flex flex-col gap-1.5 font-mono text-[13px] text-slate-300">
          {['0.1 nA', '0.2 nA', '0.3 nA'].map((a) => (
            <span key={a} className="rounded-md border border-slate-800 px-2 py-1">
              simulation · {a}
            </span>
          ))}
        </div>
        <Body>the campaign: one simulation per combination. Free.</Body>
      </Box>
      <Arrow down />
      <Box lit>
        <Title>3 · Launch</Title>
        <div className="mt-2 rounded-md border border-slate-700 px-2 py-1.5 text-[13.5px] text-slate-300">
          Estimated cost breakdown
          <div className="mt-1.5 flex flex-col gap-1">
            <Skeleton w="70%" />
            <Skeleton w="50%" />
          </div>
        </div>
        <Body>runs in the cloud, for the project&apos;s credits</Body>
      </Box>
    </div>
  );
}

function Mcp() {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-3">
      <CodeBlock
        lang="shell"
        small
        label="terminal: adding the platform to Claude Code"
        code={
          '$ claude mcp add --transport http --client-id obi-mcp --callback-port 8080 \\\n' +
          '    obi https://cell-a.openbraininstitute.org/api/agent-ts/mcp'
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Box>
          <Title>Log in</Title>
          <Body>/mcp in Claude Code opens the platform&apos;s login in your browser</Body>
        </Box>
        <Box>
          <Title>Your latest project</Title>
          <Body>work goes to the lab and project you last opened, unless you name others</Body>
        </Box>
        <Box>
          <Title>The same tools</Title>
          <Body>search the data, run Python and shell in a sandbox, move files in and out</Body>
        </Box>
      </div>
      <Note className="text-center">Claude Desktop, Cursor and Kiro connect the same way.</Note>
    </div>
  );
}

function Backend() {
  const services = [
    ['EntityCore', 'the database: every item and file, who can see it, and what it was made from'],
    ['obi-one', 'the workflows: turns a form into a campaign, works out its cost, and launches it'],
    [
      'Compute cells',
      'computers in the cloud that run the jobs: NEURON, or Brian2 for point neurons',
    ],
    ['JupyterHub', 'runs the notebooks, beside the data'],
    ['OBI Assistant', 'an AI agent with tools for all of the above; also reachable over MCP'],
  ];
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-2">
      <Box lit className="w-full max-w-md text-center">
        <Title>The web app, in your browser</Title>
      </Box>
      <span className="text-slate-500">↓</span>
      <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map(([name, what]) => (
          <Box key={name}>
            <Title>{name}</Title>
            <Body>{what}</Body>
          </Box>
        ))}
        <Box className="border-dashed bg-transparent">
          <Title>Your own code</Title>
          <Body>entitysdk talks to EntityCore directly, from a notebook or your laptop</Body>
        </Box>
      </div>
    </div>
  );
}

function Journey() {
  const steps = [
    ['Find', 'Data → a morphology, and an e-model for the same kind of cell'],
    ['Build', 'Workflows → Build → Single neuron: the two make an ME-model'],
    ['Simulate', 'Workflows → Simulate → Single neuron: a current step, generated, then launched'],
    ['Read', 'Activities, or Data → Simulations: the voltage it recorded'],
    ['Analyse', 'a notebook, or the assistant: spike counts, rates, comparisons'],
  ];
  return (
    <ol className="flex w-full max-w-3xl flex-col gap-2">
      {steps.map(([name, what], k) => (
        <li
          key={name}
          className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5"
        >
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[14px] font-semibold text-white">
            {k + 1}
          </span>
          <span className="flex flex-col">
            <span className="text-[15.5px] font-semibold text-slate-100">{name}</span>
            <span className="text-[14.5px] text-slate-400">{what}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The steps drawn as the window, and which section each has open. */
const IN_WINDOW: Partial<Record<PlatformStep, Tab>> = {
  layout: 'Home',
  home: 'Home',
  data: 'Data',
  item: 'Data',
  workflows: 'Workflows',
  results: 'Home',
  notebooks: 'Notebooks',
  assistant: 'Home',
};

export default function PlatformFigure({
  step,
  back = false,
}: {
  step: PlatformStep;
  back?: boolean;
}) {
  const tab = IN_WINDOW[step];
  if (tab) {
    const content =
      step === 'layout' ? (
        <Home marks />
      ) : step === 'home' ? (
        <Home />
      ) : step === 'data' ? (
        <Data />
      ) : step === 'item' ? (
        <Item />
      ) : step === 'workflows' ? (
        <Workflows />
      ) : step === 'results' ? (
        <Results />
      ) : step === 'notebooks' ? (
        <Notebooks />
      ) : (
        <Assistant />
      );
    return (
      <div className="flex w-full flex-1 items-center justify-center">
        <AppFrame
          active={tab}
          marks={step === 'layout'}
          assistant={step === 'assistant' ? <AssistantPanel /> : null}
        >
          <div key={step} className={back ? 'animate-slide-in-left' : 'animate-slide-in-right'}>
            {content}
          </div>
        </AppFrame>
      </div>
    );
  }
  const body =
    step === 'what' ? (
      <What />
    ) : step === 'account' ? (
      <Account />
    ) : step === 'credits' ? (
      <Credits />
    ) : step === 'public' ? (
      <Public />
    ) : step === 'models' ? (
      <Models />
    ) : step === 'run' ? (
      <Run />
    ) : step === 'mcp' ? (
      <Mcp />
    ) : step === 'backend' ? (
      <Backend />
    ) : (
      <Journey />
    );
  return (
    <div
      key={step}
      className={`flex w-full flex-1 items-center justify-center ${back ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}
    >
      {body}
    </div>
  );
}
