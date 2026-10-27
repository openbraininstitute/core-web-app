'use client';

/**
 * The simulation and validation course's figure, after the Chinese summer school's Day 5 talk
 * (Simulations and validation, from its slide 12 on): large-scale biophysically detailed models,
 * why to build them, and how their activity is compared with real recordings - spikes over trials,
 * single neurons, pairs and populations, and the recording techniques each comparison rests on.
 * Drawn, not pictured: rasters, histograms and diagrams in SVG and boxes, from seeded random
 * spikes, so every slide draws the same.
 */

import Image from 'next/image';

import type { ReactNode } from 'react';

export const VALIDATION_STEPS = [
  'scales',
  'nbs1',
  'why',
  'topics',
  'compare',
  'facts',
  'space',
  'sources',
  'code',
  'trials',
  'means',
  'first',
  'funnel',
  'decode',
  'resolution',
  'single',
  'pairs',
  'population',
  'pca',
  'shared',
  'extracellular',
  'calcium',
  'voltage',
  'patch',
  'dendrite',
  'lfp',
  'csd',
  'eeg',
  'techniques',
  'difficult',
  'future',
  'examples',
] as const;
export type ValidationStep = (typeof VALIDATION_STEPS)[number];

/* ----------------------------------------------------------------------- data */

/** A seeded random number generator (mulberry32): the same spikes every time. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Spike times in [0, 1) s at `rate` Hz, Poisson, with no spike before `latency`. */
function train(rand: () => number, rate: number, latency = 0) {
  const out: number[] = [];
  let t = latency;
  for (;;) {
    t += -Math.log(1 - rand()) / rate;
    if (t >= 1) return out;
    out.push(t);
  }
}

/** Eight trials of one neuron: its rates vary from trial to trial, as a real one's do. */
function trials(seed: number, rate: number, spread: number, latency = 0.05, n = 8) {
  const rand = rng(seed);
  return Array.from({ length: n }, () =>
    train(rand, Math.max(1, rate + (rand() - 0.5) * 2 * spread), latency * (0.5 + rand()))
  );
}

const DATA = trials(7, 6, 3);
const MODEL = trials(11, 5.5, 1.2);
const MODEL_EARLY = trials(13, 6, 3, 0.005);

/** To a hundredth: Math.log, sin and cos can differ in their last bits between the server and
 * the browser, and the SVG they draw must hydrate the same. */
const r2 = (x: number) => Math.round(x * 100) / 100;

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);

/* ---------------------------------------------------------------- the pieces */

const SERIF = "Georgia, 'Times New Roman', serif";
const Note = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`text-[14px] text-slate-400 italic ${className}`} style={{ fontFamily: SERIF }}>
    {children}
  </span>
);
const Box = ({
  children,
  className = '',
  tone = 'plain',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'plain' | 'lit' | 'good' | 'bad';
}) => (
  <div
    className={`rounded-xl border px-4 py-3 ${
      tone === 'lit'
        ? 'border-sky-500 bg-sky-500/10'
        : tone === 'good'
          ? 'border-emerald-500/60 bg-emerald-500/10'
          : tone === 'bad'
            ? 'border-rose-500/60 bg-rose-500/10'
            : 'border-slate-800 bg-slate-900/40'
    } ${className}`}
  >
    {children}
  </div>
);
const Title = ({ children }: { children: ReactNode }) => (
  <div className="text-[15px] font-semibold text-slate-100">{children}</div>
);
const Body = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`mt-1 text-[13.5px] leading-snug text-slate-400 ${className}`}>{children}</div>
);
const Arrow = () => (
  <span aria-hidden="true" className="self-center text-[20px] text-slate-500">
    →
  </span>
);
const Tick = ({ ok }: { ok: boolean }) => (
  <span className={ok ? 'font-bold text-emerald-500' : 'font-bold text-rose-500'}>
    {ok ? '✓' : '✗'}
  </span>
);

/** A raster: one row per trial (or neuron), a tick per spike, over one second. */
function Raster({
  rows,
  width = 260,
  row = 12,
  tone = 'sky',
  label,
}: {
  rows: number[][];
  width?: number;
  row?: number;
  tone?: 'sky' | 'amber';
  label?: string;
}) {
  const h = rows.length * row;
  return (
    <figure className="flex flex-col gap-1">
      {label && <Note>{label}</Note>}
      <svg width={width} height={h + 14} role="img" aria-label={label ?? 'spike raster'}>
        {rows.map((spikes, i) =>
          spikes.map((t) => (
            <line
              key={`${i}-${t}`}
              x1={r2(t * width)}
              x2={r2(t * width)}
              y1={i * row + 2}
              y2={i * row + row - 2}
              strokeWidth={1.5}
              className={tone === 'sky' ? 'stroke-sky-500' : 'stroke-amber-500'}
            />
          ))
        )}
        <line x1={0} x2={width} y1={h + 4} y2={h + 4} className="stroke-slate-700" />
        <text x={width} y={h + 13} textAnchor="end" className="fill-slate-500 text-[10px]">
          1 s
        </text>
      </svg>
    </figure>
  );
}

/** A histogram of `values` between `lo` and `hi`, in `bins` bars. */
function Hist({
  values,
  lo,
  hi,
  bins = 10,
  width = 200,
  height = 70,
  tone = 'sky',
  label,
}: {
  values: number[];
  lo: number;
  hi: number;
  bins?: number;
  width?: number;
  height?: number;
  tone?: 'sky' | 'amber';
  label?: string;
}) {
  const counts = Array.from({ length: bins }, () => 0);
  for (const v of values) {
    const k = Math.floor(((v - lo) / (hi - lo)) * bins);
    if (k >= 0 && k < bins) counts[k] += 1;
  }
  const top = Math.max(1, ...counts);
  const bw = width / bins;
  return (
    <figure className="flex flex-col gap-1">
      <svg width={width} height={height + 14} role="img" aria-label={label ?? 'histogram'}>
        {counts.map((c, k) => (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: the bins are fixed
            key={k}
            x={k * bw + 1}
            width={bw - 2}
            y={height - (c / top) * height}
            height={(c / top) * height}
            rx={2}
            className={tone === 'sky' ? 'fill-sky-500/70' : 'fill-amber-500/70'}
          />
        ))}
        <line x1={0} x2={width} y1={height} y2={height} className="stroke-slate-700" />
        <text x={0} y={height + 12} className="fill-slate-500 text-[10px]">
          {lo}
        </text>
        <text x={width} y={height + 12} textAnchor="end" className="fill-slate-500 text-[10px]">
          {hi}
        </text>
      </svg>
      {label && <Note className="text-[12.5px]">{label}</Note>}
    </figure>
  );
}

/** Chips, a few lit. */
const Chips = ({ items, lit = [] }: { items: string[]; lit?: string[] }) => (
  <div className="flex max-w-3xl flex-wrap justify-center gap-2">
    {items.map((x) => (
      <span
        key={x}
        className={`rounded-full border px-3 py-1 text-[13.5px] ${
          lit.includes(x)
            ? 'border-sky-500 bg-sky-500/10 text-slate-100'
            : 'border-slate-800 bg-slate-900/40 text-slate-300'
        }`}
      >
        {x}
      </span>
    ))}
  </div>
);

/* ------------------------------------------------------------------ the steps */

function Scales() {
  // the talk's general multi-scale models, each as it was rendered
  const rungs = [
    ['Thalamus', 'thalamus', 'Iavarone et al., 2023 · Cell Reports'],
    ['Hippocampus CA1', 'hippocampus', 'Romani et al., 2024 · PLOS Comp. Biol.'],
    ['Somatosensory cortex', 'nbs1', 'Reimann et al., 2024 · Isbister et al., 2024 · eLife'],
    ['Whole mouse brain', 'whole-brain', 'in progress'],
  ];
  return (
    <div className="grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
      {rungs.map(([t, name, ref], i) => (
        <Box key={t} tone={i === 2 ? 'lit' : 'plain'} className="flex flex-col items-center">
          <Image
            src={`${MEDIA_ROOT}/${name}.webp`}
            alt={t}
            width={SIZES[name][0]}
            height={SIZES[name][1]}
            className="h-[120px] w-auto object-contain"
          />
          <Title>{t}</Title>
          <Note className="mt-1 block text-center text-[12px]">{ref}</Note>
        </Box>
      ))}
    </div>
  );
}

function Nbs1() {
  const layers = ['L1', 'L2/3', 'L4', 'L5', 'L6'];
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg width={300} height={200} role="img" aria-label="a slab of cortex in layers">
        {layers.map((l, i) => (
          <g key={l}>
            <rect
              x={40}
              y={10 + i * 36}
              width={240}
              height={34}
              rx={4}
              className={i % 2 ? 'fill-sky-500/10' : 'fill-sky-500/20'}
            />
            <text x={30} y={32 + i * 36} textAnchor="end" className="fill-slate-400 text-[11px]">
              {l}
            </text>
          </g>
        ))}
        {Array.from({ length: 160 }, (_, k) => {
          const r = rng(k + 99);
          const layer = Math.min(4, Math.floor(r() * 5.2));
          return (
            <circle
              // biome-ignore lint/suspicious/noArrayIndexKey: drawn once
              key={k}
              cx={46 + r() * 228}
              cy={14 + layer * 36 + r() * 26}
              r={1.6}
              className={r() < 0.8 ? 'fill-rose-500/80' : 'fill-sky-500'}
            />
          );
        })}
      </svg>
      <div className="flex max-w-xs flex-col gap-2">
        <Box>
          <Title>Rat non-barrel somatosensory cortex</Title>
          <Body>
            Its neurons placed in an atlas, layer by layer, each a morphology of its own type.
          </Body>
        </Box>
        <Box>
          <Title>Connected, synapse by synapse</Title>
          <Body>
            Wired from where axons and dendrites meet, then simulated and compared with data.
          </Body>
        </Box>
        <Note>Reimann et al., 2025 · Isbister et al., 2026 (eLife)</Note>
      </div>
    </div>
  );
}

function Why() {
  const kinds = [
    ['Integrate and relate', 'data from many experiments, in one place'],
    ['Infer', 'what cannot be measured, from what can'],
    ['Constrain', 'which explanations are possible'],
    ['Explain', 'how structure gives rise to function'],
    ['Ground truth', 'for the methods that analyse data'],
    ['Identify knowledge gaps', 'where data is missing'],
    ['Predict', 'what an experiment will find'],
    ['Change any parameter', 'beyond what a lab could change'],
    ['Measure any signal', 'from every neuron at once'],
  ];
  return (
    <div className="grid max-w-3xl grid-cols-3 gap-2">
      {kinds.map(([t, b]) => (
        <Box key={t}>
          <Title>{t}</Title>
          <Body>{b}</Body>
        </Box>
      ))}
    </div>
  );
}

const TOPICS = [
  'Plasticity',
  'Spike sorting',
  'Cell assemblies',
  'LFP, EEG, CSD',
  'NGV, metabolism',
  'Structure-function',
  'Dendritic processing',
  'Efficiency & reliability',
  'Optogenetic stimulation',
  'Higher order inhibition / disinhibition',
  'Units of information representation',
];

function Compare() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <div className="flex flex-col gap-3">
        <Raster rows={MODEL} tone="sky" label="model data" />
        <Raster rows={DATA} tone="amber" label="real data" />
      </div>
      <Arrow />
      <Box tone="lit" className="w-[170px]">
        <Title>The same analyses</Title>
        <Body>firing rates · spike timing · correlations</Body>
      </Box>
      <Arrow />
      <div className="flex flex-col gap-2 text-[14px] text-slate-300">
        <span>
          <Tick ok /> this one agrees
        </span>
        <span>
          <Tick ok={false} /> this one does not
        </span>
        <span>
          <span className="font-bold text-amber-500">!</span> but the data may be biased too
        </span>
      </div>
    </div>
  );
}

function Facts() {
  return (
    <div className="grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-3">
      <Note className="text-center">Facts, from reality</Note>
      <span />
      <Note className="text-center">The model</Note>
      <Box>
        <Title>Connectivity</Title>
      </Box>
      <Arrow />
      <Box tone="lit">
        <Title>Put directly into the model</Title>
      </Box>
      <Box>
        <Title>Unknown parameters</Title>
      </Box>
      <Arrow />
      <Box tone="lit">
        <Title>Optimised to match data</Title>
      </Box>
      <Box>
        <Title>Firing rates, behaviour</Title>
      </Box>
      <Arrow />
      <Box tone="good">
        <Title>Validated after optimisation</Title>
        <Body>on data the optimisation never saw</Body>
      </Box>
      <Box>
        <Title>?</Title>
        <Body>data with no counterpart in the model</Body>
      </Box>
      <span />
      <span />
    </div>
  );
}

function Space() {
  const powers = ['10³', '10⁶', '10⁹', '10¹²', '10¹⁵'];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-end gap-3">
        {powers.map((p, i) => (
          <div key={p} className="flex flex-col items-center gap-1">
            <div className="rounded-md bg-sky-500/30" style={{ width: 36, height: 20 + i * 32 }} />
            <span className="text-[14px] text-slate-300">{p}</span>
          </div>
        ))}
      </div>
      <Note>combinations of ion channel, synapse and connection parameters: not tractable</Note>
      <Box tone="lit" className="max-w-md text-center">
        <Title>So the components must be valid too</Title>
        <Body>
          each neuron, synapse and pathway checked against data before the whole circuit is
        </Body>
      </Box>
    </div>
  );
}

function Sources() {
  const cols: [string, string[]][] = [
    ['Species', ['Rat', 'Mouse']],
    ['Brain region', ['Somatosensory cortex', 'Visual cortex', 'Barrel cortex']],
    ['Experiment', ['In vitro', 'In vivo', 'Electron microscopy']],
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {cols.map(([t, xs]) => (
        <Box key={t} className="w-[190px]">
          <Title>{t}</Title>
          <div className="mt-2 flex flex-col gap-1">
            {xs.map((x) => (
              <span
                key={x}
                className="rounded-md bg-slate-900/60 px-2 py-1 text-[13px] text-slate-300"
              >
                {x}
              </span>
            ))}
          </div>
        </Box>
      ))}
      <Arrow />
      <Box tone="lit" className="w-[170px]">
        <Title>One model</Title>
        <Body>as data is sparse, combined from many sources</Body>
      </Box>
    </div>
  );
}

function Code() {
  // a membrane potential with its spikes, and the spike train it is reduced to
  const spikes = DATA[1];
  const w = 520;
  const pts: string[] = [];
  for (let k = 0; k <= 400; k++) {
    const t = k / 400;
    const near = spikes.find((s) => t >= s && t < s + 0.006);
    const v = near ? 10 : -65 + 6 * Math.sin(t * 40) + 3 * Math.sin(t * 97);
    pts.push(`${r2(t * w)},${r2(90 - (v + 70) * 1.1)}`);
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <Note>membrane potential (v) over time</Note>
      <svg width={w} height={100} role="img" aria-label="a membrane potential with spikes">
        <polyline points={pts.join(' ')} fill="none" strokeWidth={1.3} className="stroke-sky-500" />
      </svg>
      <span className="text-[18px] text-slate-500">↓</span>
      <Note>the spike train: only the times of the spikes</Note>
      <svg width={w} height={24} role="img" aria-label="a spike train">
        {spikes.map((t) => (
          <line
            key={t}
            x1={r2(t * w)}
            x2={r2(t * w)}
            y1={2}
            y2={22}
            strokeWidth={2}
            className="stroke-amber-500"
          />
        ))}
      </svg>
      <Body>What are the rules of communication between neurons?</Body>
    </div>
  );
}

function Trials() {
  const rates = (rows: number[][]) => rows.map((r) => r.length);
  return (
    <div className="flex flex-wrap items-start justify-center gap-8">
      {[['Data', DATA, 'amber'] as const, ['Model', MODEL, 'sky'] as const].map(
        ([name, rows, tone]) => (
          <div key={name} className="flex flex-col gap-2">
            <Title>{name}</Title>
            <div className="flex items-start gap-3">
              <Raster rows={rows} tone={tone} row={14} label="eight trials" />
              <div className="flex flex-col pt-[20px] text-[11px] leading-[14px] text-slate-400">
                {rates(rows).map((r, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: one per trial
                  <span key={i}>{r} Hz</span>
                ))}
              </div>
            </div>
            <Body>
              mean {mean(rates(rows)).toFixed(1)} Hz · from trial to trial{' '}
              {Math.min(...rates(rows))} to {Math.max(...rates(rows))} Hz
            </Body>
          </div>
        )
      )}
      <Box className="max-w-[220px]">
        <Title>Compare distributions</Title>
        <Body>
          The brain is never the same twice: compare the model with the data statistically, the mean
          and the spread, Gaussian, log-normal, gamma or Poisson.
        </Body>
      </Box>
    </div>
  );
}

function Means({ question }: { question: string }) {
  const rows = [4, 6, 3, 5, 7, 4, 6, 5, 3, 6];
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="grid grid-cols-[auto_auto_auto] gap-x-4 gap-y-1 text-[14px] text-slate-300">
        <span className="text-slate-500">neuron</span>
        <span className="text-slate-500">model / data, Hz</span>
        <span />
        {rows.map((r, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: one per neuron
          <span key={i} className="contents">
            <span>{i + 1}</span>
            <span>
              {r} / {r}
            </span>
            <Tick ok />
          </span>
        ))}
      </div>
      <Box tone="lit" className="max-w-xs">
        <Title>{question}</Title>
        <Body>
          Every mean firing rate matches. But many different models match the means, and they cannot
          all be right.
        </Body>
      </Box>
    </div>
  );
}

function First() {
  const firsts = (rows: number[][]) => rows.map((r) => r[0] ?? 1);
  return (
    <div className="flex flex-wrap items-start justify-center gap-8">
      {[['Data', DATA, 'amber'] as const, ['Model', MODEL_EARLY, 'sky'] as const].map(
        ([name, rows, tone]) => (
          <div key={name} className="flex flex-col gap-2">
            <Title>{name}</Title>
            <Raster rows={rows} tone={tone} row={14} />
            <Hist
              values={firsts(rows)}
              lo={0}
              hi={0.5}
              tone={tone}
              label="time of the first spike, s"
            />
            <Body>mean {mean(firsts(rows)).toFixed(2)} s</Body>
          </div>
        )
      )}
      <Box tone="bad" className="max-w-[220px]">
        <Title>The rates agree; the timing does not</Title>
        <Body>This model's first spikes come far too early after the stimulus.</Body>
      </Box>
    </div>
  );
}

function Funnel() {
  const stages = [
    ['All models', 100],
    ['+ mean firing rate', 30],
    ['+ first spike times', 15],
    ['+ firing rate distributions', 2],
  ] as const;
  return (
    <div className="flex flex-wrap items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-1">
        {stages.map(([t, p]) => (
          <div key={t} className="flex items-center gap-3">
            <div
              className="flex h-[34px] items-center justify-center rounded-md bg-sky-500/30 text-[13px] text-slate-100"
              style={{ width: 80 + p * 3.2 }}
            >
              {p}%
            </div>
            <span className="w-[190px] text-[13.5px] text-slate-300">{t}</span>
          </div>
        ))}
      </div>
      <div className="flex max-w-xs flex-col gap-2">
        <Box tone="bad">
          <Title>Neuron 3</Title>
          <Body>rate distribution far too narrow</Body>
        </Box>
        <Box tone="bad">
          <Title>Neuron 8</Title>
          <Body>first spike far too early</Body>
        </Box>
        <Note>the differences show where the model can be improved</Note>
      </div>
    </div>
  );
}

function Decode() {
  const rand = rng(5);
  const g = (m: number) =>
    Array.from({ length: 80 }, () => m + (rand() + rand() + rand() - 1.5) * 4);
  return (
    <div className="flex flex-wrap items-center justify-center gap-8">
      <div className="flex flex-col gap-1">
        <Title>Encoding</Title>
        <Body>neuron 1's firing rate depends on the stimulus</Body>
        <div className="mt-2 flex gap-4">
          <Hist values={g(6)} lo={0} hi={20} bins={16} tone="sky" label="apple trials, Hz" />
          <Hist values={g(13)} lo={0} hi={20} bins={16} tone="amber" label="orange trials, Hz" />
        </div>
      </div>
      <Arrow />
      <Box tone="lit" className="max-w-[240px]">
        <Title>Decoding</Title>
        <Body>
          Neuron 2 guesses the stimulus from neuron 1's rate. The less the distributions overlap,
          the more often it guesses right.
        </Body>
      </Box>
    </div>
  );
}

function Resolution() {
  return (
    <div className="grid max-w-3xl grid-cols-2 gap-4">
      <Box>
        <Title>Temporal resolution</Title>
        <div className="mt-2 flex flex-col gap-2">
          <Raster rows={[DATA[1]]} width={300} label="fast: Δt = 2 ms" />
          <svg width={300} height={30} role="img" aria-label="the same spikes in 100 ms bins">
            {Array.from({ length: 10 }, (_, k) => {
              const c = DATA[1].filter((t) => t >= k / 10 && t < (k + 1) / 10).length;
              return (
                <rect
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed bins
                  key={k}
                  x={k * 30 + 1}
                  width={28}
                  y={28 - c * 9}
                  height={c * 9}
                  className="fill-sky-500/60"
                />
              );
            })}
          </svg>
          <Note>slow: Δt = 100 ms</Note>
        </div>
      </Box>
      <Box>
        <Title>Spatial resolution</Title>
        <div className="mt-2 flex flex-col gap-2 text-[13.5px] text-slate-300">
          <span>Each neuron: under-sampled</span>
          <span>Several neurons, combined or averaged: still under-sampled</span>
          <span>Averaged over many neurons: no single cell left</span>
        </div>
        <Note className="mt-3 block">every technique trades one against the other</Note>
      </Box>
    </div>
  );
}

function Single() {
  const all = DATA.flat();
  const isis = DATA.flatMap((r) => r.slice(1).map((t, i) => t - r[i]));
  return (
    <div className="flex flex-wrap justify-center gap-6">
      <Hist
        values={DATA.map((r) => r.length)}
        lo={0}
        hi={12}
        bins={12}
        tone="amber"
        label="firing rate, Hz"
      />
      <Hist
        values={DATA.map((r) => r[0] ?? 1)}
        lo={0}
        hi={0.5}
        tone="amber"
        label="first spike time, s"
      />
      <Hist
        values={isis}
        lo={0}
        hi={0.4}
        bins={12}
        tone="amber"
        label="inter-spike interval, s (bursts at left)"
      />
      <Hist
        values={all}
        lo={0}
        hi={1}
        bins={20}
        tone="amber"
        label="peri-stimulus time histogram"
      />
    </div>
  );
}

function Pairs() {
  const rand = rng(21);
  const pts = Array.from({ length: 8 }, () => {
    const a = 2 + rand() * 6;
    return [a, a + (rand() - 0.5) * 3] as const;
  });
  return (
    <div className="flex flex-wrap items-center justify-center gap-8">
      <svg width={180} height={180} role="img" aria-label="neuron A's rate against neuron B's">
        <rect x={20} y={0} width={160} height={160} className="fill-slate-900/40" />
        {pts.map(([a, b]) => (
          <circle key={`${a}`} cx={20 + a * 16} cy={160 - b * 16} r={4} className="fill-sky-500" />
        ))}
        <line x1={20} y1={160} x2={180} y2={0} strokeDasharray="4 4" className="stroke-slate-600" />
        <text x={100} y={176} textAnchor="middle" className="fill-slate-500 text-[10px]">
          neuron A, Hz
        </text>
      </svg>
      <div className="flex max-w-xs flex-col gap-2">
        <Box>
          <Title>Pairwise rate correlation: r = 0.77</Title>
          <Body>trial by trial, do two neurons fire more together?</Body>
        </Box>
        <Box>
          <Title>First-spike and spike-time differences</Title>
          <Body>every spike against every spike, within 250 ms: how precisely are they timed?</Body>
        </Box>
      </div>
    </div>
  );
}

function Population() {
  const rand = rng(31);
  const rates = Array.from({ length: 20 }, () => Math.round(3 + rand() * 14));
  const rows = rates.map((r) => train(rand, r, 0.02));
  return (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <Raster rows={rows} row={7} label="20 neurons, one trial" />
      <div className="grid grid-cols-2 gap-4">
        <Hist values={rates} lo={0} hi={20} bins={10} label="mean firing rates, Hz" />
        <Hist
          values={rows.map((r) => r[0] ?? 1)}
          lo={0}
          hi={0.5}
          label="mean first-spike times, s"
        />
        <Hist
          values={rows.flatMap((r) => r.slice(1).map((t, i) => (t - r[i]) * 1000))}
          lo={0}
          hi={500}
          bins={12}
          label="inter-spike intervals, ms"
        />
        <Hist values={rows.flat()} lo={0} hi={1} bins={20} label="population PSTH" />
      </div>
    </div>
  );
}

function Pca() {
  const path = (seed: number) => {
    const rand = rng(seed);
    let x = 90;
    let y = 90;
    const pts: string[] = [];
    for (let k = 0; k < 30; k++) {
      const a = (k / 30) * Math.PI * 1.6 + seed;
      x += Math.cos(a) * 6 + (rand() - 0.5) * 4;
      y += Math.sin(a) * 6 + (rand() - 0.5) * 4;
      pts.push(`${r2(x)},${r2(y)}`);
    }
    return pts.join(' ');
  };
  return (
    <div className="flex flex-wrap items-center justify-center gap-8">
      <div className="flex flex-col gap-2 text-[13px] text-slate-300">
        <Box>
          <Title>20 neurons, one number each</Title>
          <Body>a trial's firing rates: 7, 11, 10, 6, …, 11, 16</Body>
        </Box>
        <Box>
          <Title>Or per time bin</Title>
          <Body>bin 1: 2, 1, 0, 1, … · bin 2: 2, 2, 1, 0, … · bin 10: …</Body>
        </Box>
      </div>
      <Arrow />
      <svg
        width={200}
        height={200}
        role="img"
        aria-label="trajectories in the first two principal components"
      >
        <line x1={20} y1={180} x2={190} y2={180} className="stroke-slate-700" />
        <line x1={20} y1={180} x2={20} y2={10} className="stroke-slate-700" />
        <text x={190} y={194} textAnchor="end" className="fill-slate-500 text-[10px]">
          PC1
        </text>
        <text x={4} y={14} className="fill-slate-500 text-[10px]">
          PC2
        </text>
        <polyline points={path(1)} fill="none" strokeWidth={2} className="stroke-sky-500" />
        <polyline points={path(4)} fill="none" strokeWidth={2} className="stroke-amber-500" />
      </svg>
    </div>
  );
}

function Shared() {
  return (
    <div className="grid max-w-3xl grid-cols-2 gap-4">
      <Box>
        <Title>The real brain</Title>
        <Body>the somatic voltage of one or two cells at a time</Body>
        <div className="mt-3">
          <Raster rows={DATA.slice(0, 2)} tone="amber" width={280} />
        </div>
      </Box>
      <Box tone="lit">
        <Title>The model</Title>
        <Body>the somatic voltage of every neuron</Body>
        <div className="mt-3">
          <Raster rows={[...MODEL, ...DATA, ...MODEL].slice(0, 14)} width={280} row={6} />
        </div>
      </Box>
      <Note className="col-span-2 text-center">
        how do neurons respond together? Their shared variability is what single recordings miss
      </Note>
    </div>
  );
}

type Technique = {
  name: string;
  how: string;
  validates: string[];
  caveats: string[];
};

const TECHNIQUES: Record<string, Technique> = {
  extracellular: {
    name: 'Extracellular recording',
    how: 'Electrodes in the tissue pick up spikes from the neurons around them; spike sorting assigns them to units, the rest is multi-unit activity.',
    validates: ['firing rates and spike timing of many units at once'],
    caveats: [
      'spike sorting is biased towards large, active neurons',
      'units can be merged or split',
    ],
  },
  calcium: {
    name: 'Calcium imaging',
    how: 'A gene, brought in by a harmless virus, makes neurons glow when calcium flows in as they spike; a microscope records which fired.',
    validates: [
      'stimulus and task modulation',
      'population sparsity',
      'single cell types, in lines where only one type glows',
    ],
    caveats: [
      'calcium and indicator decay more slowly than spikes',
      'not a true measure of rates or spike times',
      'the microscope scans one point at a time',
    ],
  },
  voltage: {
    name: 'Voltage imaging',
    how: 'A molecule in the membrane changes its brightness with the voltage across it, recorded at millisecond resolution.',
    validates: ['spikes and subthreshold fluctuations', 'shared fluctuations across neurons'],
    caveats: ['hard to calibrate in mV', 'a small field of view'],
  },
  patch: {
    name: 'Whole-cell patch at the soma',
    how: 'A pipette sealed onto the soma measures the membrane potential and currents directly.',
    validates: [
      'true firing rates and spike timing',
      'resting potential, input resistance, f–I curve, spike shape',
      'subthreshold fluctuations and E/I balance',
    ],
    caveats: [
      'one or two cells at a time',
      'the pipette affects the neuron',
      'in vivo, short and biased towards large healthy cells',
    ],
  },
  dendrite: {
    name: 'Dendritic patch',
    how: 'A patch on the dendrite itself records the part of the computation the soma never sees: local dendritic spikes.',
    validates: [
      'dendritic excitability',
      'attenuation along the trunk',
      'coincidence windows for input',
    ],
    caveats: [
      'technically challenging, mostly in vitro',
      'small datasets, biased towards thick layer 5 apical trunks',
    ],
  },
  lfp: {
    name: 'Local field potential (LFP)',
    how: 'The low-frequency extracellular potential, below 300 Hz: largely summed synaptic currents.',
    validates: ['frequency spectrum', 'laminar profile', 'phase relationships'],
    caveats: [
      'some components depend on larger-scale interactions',
      'so it needs larger models and more computation',
    ],
  },
  csd: {
    name: 'Current source density (CSD)',
    how: 'The second spatial derivative of the laminar LFP: where current enters (sinks) and leaves (sources), in depth and time.',
    validates: ['laminar connectivity and input timing'],
    caveats: [
      'amplifies the LFP’s noise',
      'assumes homogeneous conductivity',
      'sinks are ambiguous between input and return currents',
    ],
  },
  eeg: {
    name: 'Electroencephalogram (EEG)',
    how: 'Scalp potentials generated by large, synchronous cortical events.',
    validates: [
      'whole-brain, non-invasive, and available in humans',
      'links models to clinical and cognitive neuroscience',
    ],
    caveats: [
      'heavily smoothed by skull and scalp',
      'only large synchronous sources contribute',
      'the inverse problem is ill-posed',
    ],
  },
};

function TechniqueCard({ t }: { t: Technique }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <Box tone="lit">
        <Title>{t.name}</Title>
        <Body>{t.how}</Body>
      </Box>
      <div className="grid grid-cols-2 gap-3">
        <Box tone="good">
          <Title>Model validation</Title>
          <ul className="mt-1 list-disc pl-4 text-[13.5px] leading-snug text-slate-400">
            {t.validates.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </Box>
        <Box tone="bad">
          <Title>Caveats</Title>
          <ul className="mt-1 list-disc pl-4 text-[13.5px] leading-snug text-slate-400">
            {t.caveats.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </Box>
      </div>
    </div>
  );
}

function Techniques() {
  const rows = [
    ['Calcium imaging', '10²–10⁴ cells', '~100 ms', 'sub-cellular', 'surgery + indicator'],
    ['Voltage imaging', '10¹–10² cells', '<1 ms', 'sub-cellular', 'surgery + indicator'],
    ['LFP', 'population', '<1 ms', '0.1–1 mm', 'penetrating probe'],
    ['CSD', 'population', '<1 ms', '~0.1 mm depth', 'penetrating probe'],
    ['EEG', 'whole brain', '<1 ms', 'cm', 'none'],
    ['Intracellular, soma', '1–2 cells', '<0.1 ms', 'one cell', 'highly invasive'],
    ['Intracellular, dendrite', '1 cell', '<0.1 ms', 'one compartment', 'highly invasive'],
  ];
  return (
    <div className="flex flex-col items-center gap-3">
      <table className="text-left text-[13.5px] text-slate-300">
        <thead className="text-slate-500">
          <tr>
            {['Modality', 'Neurons', 'Time', 'Space', 'Invasiveness'].map((h) => (
              <th key={h} className="px-3 py-1 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-t border-slate-800">
              {r.map((c, i) => (
                <td
                  key={c}
                  className={`px-3 py-1.5 ${i === 0 ? 'font-semibold text-slate-100' : ''}`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Note>each one's blind spot is another one's strength</Note>
    </div>
  );
}

function Future() {
  return (
    <div className="grid max-w-3xl grid-cols-2 gap-4">
      <Box tone="lit">
        <Title>Anatomy, from electron microscopy</Title>
        <div className="mt-2">
          <Chips items={['Morphologies', 'Placement', 'Connectivity']} lit={['Connectivity']} />
        </div>
      </Box>
      <Box>
        <Title>Physiology, still to add</Title>
        <div className="mt-2">
          <Chips items={['Neuronal', 'Synaptic', 'Missing synaptic input', 'Emergent activity']} />
        </div>
      </Box>
    </div>
  );
}

function Examples() {
  const models = [
    [
      'Allen V1',
      'Billeh et al., 2020',
      '~230,000 neurons of mouse V1, point and biophysically detailed',
      'firing rates class by class; orientation tuning once direction-dependent wiring was added',
    ],
    [
      'Mouse M1',
      'Dura-Bernal et al., 2023',
      '>10,000 neurons across the depth of primary motor cortex',
      'rates and LFP by type and layer in two behavioural states; two real manipulations reproduced',
    ],
    [
      'Human L2/3',
      'Yao et al., 2022',
      '1,000 neurons of human cortical layer 2/3',
      'firing within 1–2 SD of human recordings; silencing SST cells doubles pyramidal firing',
    ],
  ];
  return (
    <div className="grid max-w-4xl grid-cols-3 gap-3">
      {models.map(([t, ref, what, ok]) => (
        <Box key={t}>
          <Title>{t}</Title>
          <Note className="text-[12px]">{ref}</Note>
          <Body>{what}</Body>
          <Body className="mt-2">
            <Tick ok /> {ok}
          </Body>
        </Box>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- the talk's media */

const MEDIA_ROOT = '/static/learn/validation';
/** Each picture's size, so it is laid out before it loads. */
const SIZES: Record<string, [number, number]> = {
  'allen-v1': [1400, 1207],
  bb5: [1400, 1050],
  csd: [1021, 1400],
  dendrite: [1400, 1285],
  eeg: [1400, 932],
  hippocampus: [1349, 1400],
  microns: [1400, 769],
  'nbs1-overview': [1400, 1288],
  nbs1: [1400, 1303],
  raster: [1272, 1400],
  'spike-sorting': [1385, 1400],
  thalamus: [1400, 905],
  'whole-brain': [1400, 787],
};

type Medium = { name: string; caption: string; video?: boolean };

/** The pictures and animations from the talk's slides, beside each step's drawing. */
const MEDIA: Partial<Record<ValidationStep, Medium[]>> = {
  nbs1: [
    {
      name: 'nbs1-overview',
      caption: 'The nbS1 model, built and validated · Reimann et al., 2025; Isbister et al., 2026',
    },
  ],
  sources: [{ name: 'bb5', caption: 'Blue Brain 5, the supercomputer the models were built on' }],
  code: [{ name: 'raster', caption: 'Spikes of 30,000 nbS1 neurons, simulated on the platform' }],
  extracellular: [
    { name: 'spike-sorting', caption: 'Spike sorting · Magland et al., eLife, 2025' },
  ],
  calcium: [{ name: 'calcium', caption: 'Neurons lighting up as they spike', video: true }],
  dendrite: [
    {
      name: 'dendrite',
      caption: 'Dendritic and somatic recordings · Ledergerber & Larkum, 2012, PLoS ONE (CC BY)',
    },
  ],
  csd: [{ name: 'csd', caption: 'Laminar current source density after a sound' }],
  eeg: [{ name: 'eeg', caption: 'An EEG cap: electrodes on the scalp' }],
  future: [
    {
      name: 'microns',
      caption: 'MICrONS: a cubic millimetre of mouse visual cortex · Nature, 2025',
    },
  ],
  difficult: [
    {
      name: 'collaboration',
      caption: 'Collaboration: the data comes from labs all over the world',
      video: true,
    },
  ],
  examples: [{ name: 'allen-v1', caption: 'Allen V1 · Billeh et al., 2020, Neuron' }],
};

/** A picture or a looping animation from the talk, with its caption and credit. */
function Media({ m, className = '' }: { m: Medium; className?: string }) {
  return (
    <figure className={`flex flex-col items-center gap-1.5 ${className}`}>
      {m.video ? (
        <video
          src={`${MEDIA_ROOT}/${m.name}.mp4`}
          autoPlay
          loop
          muted
          playsInline
          aria-label={m.caption}
          className="max-h-[300px] w-auto max-w-full rounded-lg"
        />
      ) : (
        <Image
          src={`${MEDIA_ROOT}/${m.name}.webp`}
          alt={m.caption}
          width={SIZES[m.name][0]}
          height={SIZES[m.name][1]}
          className="h-auto max-h-[300px] w-auto max-w-full rounded-lg object-contain"
        />
      )}
      <figcaption className="max-w-[360px] text-center">
        <Note className="text-[12px]">{m.caption}</Note>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------- the figure */

export default function ValidationFigure({
  step,
  back = false,
}: {
  step: ValidationStep;
  back?: boolean;
}) {
  const body =
    step === 'scales' ? (
      <Scales />
    ) : step === 'nbs1' ? (
      <Nbs1 />
    ) : step === 'why' ? (
      <Why />
    ) : step === 'topics' ? (
      <Chips items={TOPICS} lit={['Spike sorting', 'LFP, EEG, CSD', 'Plasticity']} />
    ) : step === 'compare' ? (
      <Compare />
    ) : step === 'facts' ? (
      <Facts />
    ) : step === 'space' ? (
      <Space />
    ) : step === 'sources' ? (
      <Sources />
    ) : step === 'code' ? (
      <Code />
    ) : step === 'trials' ? (
      <Trials />
    ) : step === 'means' ? (
      <Means question="Is this a good model?" />
    ) : step === 'first' ? (
      <First />
    ) : step === 'funnel' ? (
      <Funnel />
    ) : step === 'decode' ? (
      <Decode />
    ) : step === 'resolution' ? (
      <Resolution />
    ) : step === 'single' ? (
      <Single />
    ) : step === 'pairs' ? (
      <Pairs />
    ) : step === 'population' ? (
      <Population />
    ) : step === 'pca' ? (
      <Pca />
    ) : step === 'shared' ? (
      <Shared />
    ) : step === 'techniques' ? (
      <Techniques />
    ) : step === 'difficult' ? (
      <Chips
        items={[
          'Mixing data from species & brain regions',
          'Data formats',
          'Time consuming',
          'Model vs data brain state',
          'Experimental conditions / paradigms',
          'Data sources',
        ]}
      />
    ) : step === 'future' ? (
      <Future />
    ) : step === 'examples' ? (
      <Examples />
    ) : TECHNIQUES[step] ? (
      <TechniqueCard t={TECHNIQUES[step]} />
    ) : null;
  const media = MEDIA[step];
  return (
    <div
      key={step}
      className={`flex w-full flex-1 flex-wrap items-center justify-center gap-6 py-4 ${back ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}
    >
      {body}
      {media?.map((m) => (
        <Media key={m.name} m={m} />
      ))}
    </div>
  );
}
