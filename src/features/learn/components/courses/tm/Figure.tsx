'use client';

/**
 * The Tsodyks–Markram course's figure, drawn as SVG from the model itself. A train of spikes and the responses it
 * makes: changing from spike to spike, depressing at one synapse and facilitating at another. The model's two
 * variables through the train — R, the resources available, used up by each spike and recovering with D; and u, the
 * fraction used, rising with each spike and fading with F — and the responses, u × R; its rules; a depressing synapse
 * and a facilitating one, with their numbers. Then release made stochastic: one trial's release sites, and many
 * trials' responses about the deterministic model's. Last, the Blue Brain Project's synapses: their types, their
 * receptors' kinetics, multivesicular release, and how many vesicles it takes to vary as much as the recordings.
 */

import type { ReactNode } from 'react';

import { mulberry32 } from '@/features/learn/lib/basics/morphologies';

export const TM_STEPS = [
  'train',
  'kinds',
  'resources',
  'use',
  'facilitation',
  'rules',
  'depressing',
  'facilitating',
  'stochastic',
  'trials',
  'bbp',
  'conductance',
  'mvr',
  'cv',
] as const;
export type TmStep = (typeof TM_STEPS)[number];

const SERIF = "Georgia, 'Times New Roman', serif";
const DEPRESS = '#0284c7';
const FACIL = '#d97706';
const RELEASE = '#16a34a';

/** A synapse's dynamics: U, the fraction a first spike uses; D, recovery from depression, ms; F, facilitation's decay, ms. */
interface Dynamics {
  U: number;
  D: number;
  F: number;
}
/** Rounded from the depressing and facilitating classes the Blue Brain Project's models use (after Gupta et al. 2000). */
const DEPRESSING: Dynamics = { U: 0.5, D: 670, F: 17 };
const FACILITATING: Dynamics = { U: 0.09, D: 140, F: 670 };

/** Eight spikes at 20 Hz, and the time drawn, ms. */
const SPIKES = Array.from({ length: 8 }, (_, k) => 50 + 50 * k);
const END = 520;
const X = (t: number) => 64 + (t / END) * 666;

/** The deterministic model through the spikes: at each, u as it uses, R before it does, and the response, u × R. */
function run(p: Dynamics) {
  let [u, R, last] = [0, 1, Number.NaN];
  return SPIKES.map((t) => {
    if (Number.isFinite(last)) {
      u *= Math.exp(-(t - last) / p.F);
      R = 1 - (1 - R) * Math.exp(-(t - last) / p.D);
    }
    u += p.U * (1 - u);
    const before = R;
    R *= 1 - u;
    last = t;
    return { t, u, R: before, amp: u * before };
  });
}

/** R and u at `t`, between and across the spikes, from the model run through them. */
function stateAt(p: Dynamics, t: number) {
  const done = run(p).filter((s) => s.t <= t);
  if (!done.length) return { R: 1, u: 0 };
  const s = done[done.length - 1];
  const dt = t - s.t;
  return { R: 1 - (1 - s.R * (1 - s.u)) * Math.exp(-dt / p.D), u: s.u * Math.exp(-dt / p.F) };
}

/** A postsynaptic potential's shape, its peak 1: up in a few ms, down over tens. */
const PSP = (() => {
  const [rise, fall] = [1.5, 25];
  const peak = ((rise * fall) / (fall - rise)) * Math.log(fall / rise);
  const at = (s: number) => (s <= 0 ? 0 : Math.exp(-s / fall) - Math.exp(-s / rise));
  return (s: number) => at(s) / at(peak);
})();

const Words = ({
  x,
  y,
  children,
  anchor = 'middle',
  size = 13.5,
  colour,
  italic = true,
  opacity,
}: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: 'start' | 'middle' | 'end';
  size?: number;
  colour?: string;
  italic?: boolean;
  opacity?: number;
}) => (
  <text
    x={x}
    y={y}
    textAnchor={anchor}
    fontSize={size}
    fontFamily={SERIF}
    fontStyle={italic ? 'italic' : 'normal'}
    className={colour ? undefined : 'fill-slate-300'}
    fill={colour}
    opacity={opacity}
  >
    {children}
  </text>
);

/** The spikes, a tick each, along the top. */
const Spikes = ({ y }: { y: number }) => (
  <g>
    {SPIKES.map((t) => (
      <line
        key={t}
        x1={X(t)}
        y1={y}
        x2={X(t)}
        y2={y + 16}
        className="stroke-slate-300"
        strokeWidth="2"
      />
    ))}
    <Words x={X(0) - 10} y={y + 13} anchor="end" size={12}>
      spikes
    </Words>
  </g>
);

/** The postsynaptic potential a row of responses makes, between `base` and `base − h`, its tallest response at the top. */
function Trace({
  base,
  h,
  amps,
  colour,
  dashed = false,
  opacity = 1,
}: {
  base: number;
  h: number;
  amps: number[];
  colour: string;
  dashed?: boolean;
  opacity?: number;
}) {
  const v = (t: number) => SPIKES.reduce((sum, s, k) => sum + amps[k] * PSP(t - s), 0);
  const samples = Array.from({ length: 521 }, (_, i) => (i / 520) * END);
  const most = Math.max(...samples.map(v)) || 1;
  const points = samples.map((t) => `${X(t).toFixed(1)},${(base - (v(t) / most) * h).toFixed(1)}`);
  return (
    <polyline
      points={points.join(' ')}
      fill="none"
      stroke={colour}
      strokeWidth="2"
      strokeDasharray={dashed ? '5 4' : undefined}
      opacity={opacity}
    />
  );
}

/** A curve of R or u through the train, between `base` (0) and `base − h` (1). */
function Variable({
  p,
  base,
  h,
  which,
  colour,
}: {
  p: Dynamics;
  base: number;
  h: number;
  which: 'R' | 'u';
  colour: string;
}) {
  const points: string[] = [];
  for (let i = 0; i <= 1040; i++) {
    const t = (i / 1040) * END;
    // just after each spike, once it has used its share, as well as just before
    const value = stateAt(p, t)[which];
    points.push(`${X(t).toFixed(1)},${(base - value * h).toFixed(1)}`);
  }
  return <polyline points={points.join(' ')} fill="none" stroke={colour} strokeWidth="2.2" />;
}

/** Each spike's response, u × R, as a bar under it, between `base` and `base − h`, scaled to `top`. */
const Bars = ({
  amps,
  base,
  h,
  colour,
  top = 1,
}: {
  amps: number[];
  base: number;
  h: number;
  colour: string;
  top?: number;
}) => (
  <g>
    {amps.map((a, k) => (
      <rect
        key={SPIKES[k]}
        x={X(SPIKES[k]) - 6}
        y={base - (a / top) * h}
        width={12}
        height={(a / top) * h}
        rx={2}
        fill={colour}
        opacity={0.85}
      />
    ))}
  </g>
);

const Frame = ({
  label,
  children,
  height = 300,
}: {
  label: string;
  children: ReactNode;
  height?: number;
}) => (
  <svg viewBox={`0 0 760 ${height}`} className="w-full" role="img" aria-label={label}>
    {children}
  </svg>
);

/** The train, and one synapse's responses to it, smaller each time, against what an unchanging synapse would make. */
function Train() {
  const amps = run(DEPRESSING).map((s) => s.amp);
  return (
    <Frame label="Eight spikes, and the potential they make at a synapse: each response smaller than the last, where an unchanging synapse would give the same each time.">
      <Spikes y={30} />
      <Trace
        base={250}
        h={170}
        amps={SPIKES.map(() => amps[0])}
        colour="#94a3b8"
        dashed
        opacity={0.6}
      />
      <Trace base={250} h={170} amps={amps} colour={DEPRESS} />
      <Words x={X(470)} y={112} anchor="end" size={12.5} opacity={0.8}>
        were it unchanging
      </Words>
      <Words x={X(300)} y={286} size={13.5} colour={DEPRESS}>
        the same spike, a different response each time
      </Words>
    </Frame>
  );
}

/** A depressing synapse and a facilitating one, under the same train; `lit` picks one out. */
function Kinds({ lit }: { lit?: 'depressing' | 'facilitating' }) {
  const rows = [
    { name: 'depressing', p: DEPRESSING, colour: DEPRESS, base: 150 },
    { name: 'facilitating', p: FACILITATING, colour: FACIL, base: 270 },
  ] as const;
  return (
    <Frame label="The same spikes at two synapses: at a depressing one, each response smaller than the last; at a facilitating one, each larger.">
      <Spikes y={18} />
      {rows.map(({ name, p, colour, base }) => {
        const faint = lit && lit !== name ? 0.25 : 1;
        return (
          <g key={name} opacity={faint}>
            <Trace base={base} h={88} amps={run(p).map((s) => s.amp)} colour={colour} />
            <Words x={X(0) - 10} y={base - 40} anchor="end" size={13} colour={colour}>
              {name}
            </Words>
            {lit === name && (
              <Words x={730} y={base - 70} anchor="end" size={13.5} italic={false} colour={colour}>
                {`U = ${p.U} · D = ${p.D} ms · F = ${p.F} ms`}
              </Words>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

/** R through the train at the depressing synapse — and, with `bars`, each response, U × R, under it. */
function Resources({ bars }: { bars: boolean }) {
  const steps = run(DEPRESSING);
  return (
    <Frame label="R, the resources available, falling at each spike and recovering between them; under it, each response, the fraction used times R.">
      <Spikes y={18} />
      <line
        x1={X(0)}
        y1={70}
        x2={X(END)}
        y2={70}
        className="stroke-slate-700"
        strokeDasharray="3 4"
      />
      <Variable p={DEPRESSING} base={180} h={110} which="R" colour={DEPRESS} />
      <Words x={X(0) - 10} y={76} anchor="end" size={12}>
        1
      </Words>
      <Words x={X(0) - 10} y={184} anchor="end" size={12}>
        0
      </Words>
      <Words x={X(60)} y={62} anchor="start" size={13} colour={DEPRESS}>
        R: the fraction of resources available, used by each spike
      </Words>
      <Words x={X(455)} y={118} anchor="start" size={12.5} colour={DEPRESS}>
        recovering, with D
      </Words>
      {bars && (
        <g>
          <Bars
            amps={steps.map((s) => s.amp)}
            base={286}
            h={74}
            colour={DEPRESS}
            top={steps[0].amp}
          />
          <Words x={X(0) - 10} y={262} anchor="end" size={12}>
            response
          </Words>
          <Words x={X(130)} y={212} anchor="start" size={13} colour={DEPRESS}>
            each response: U × R
          </Words>
        </g>
      )}
    </Frame>
  );
}

/** u and R through the train at the facilitating synapse, and each response, u × R. */
function Facilitation() {
  const steps = run(FACILITATING);
  return (
    <Frame label="At a facilitating synapse: u, the fraction used, rising with each spike and fading between them; R, hardly used; and each response, u times R, growing.">
      <Spikes y={18} />
      <Variable p={FACILITATING} base={180} h={110} which="R" colour="#94a3b8" />
      <Variable p={FACILITATING} base={180} h={110} which="u" colour={FACIL} />
      <Words x={X(0) - 10} y={76} anchor="end" size={12}>
        1
      </Words>
      <Words x={X(0) - 10} y={184} anchor="end" size={12}>
        0
      </Words>
      <Words x={X(445)} y={64} anchor="start" size={12.5}>
        R
      </Words>
      <Words x={X(445)} y={128} anchor="start" size={13} colour={FACIL}>
        u: rising with each spike, fading with F
      </Words>
      <Bars
        amps={steps.map((s) => s.amp)}
        base={286}
        h={74}
        colour={FACIL}
        top={Math.max(...steps.map((s) => s.amp))}
      />
      <Words x={X(0) - 10} y={262} anchor="end" size={12}>
        response
      </Words>
      <Words x={X(60)} y={214} anchor="start" size={13} colour={FACIL}>
        each response: u × R
      </Words>
    </Frame>
  );
}

/** The model's rules, and its three numbers. */
function Rules() {
  const row = (when: string, what: ReactNode) => (
    <div className="grid gap-1 border-b border-slate-800 py-3 md:grid-cols-[10rem_1fr]">
      <div className="text-[13.5px] text-slate-400 italic" style={{ fontFamily: SERIF }}>
        {when}
      </div>
      <div className="text-[15px] text-slate-100">{what}</div>
    </div>
  );
  const chip = (name: string, meaning: string) => (
    <div className="rounded-lg border border-slate-700 px-3 py-2">
      <div className="text-[15px] font-semibold text-slate-100">{name}</div>
      <div className="text-[12.5px] text-slate-400">{meaning}</div>
    </div>
  );
  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <div>
        {row('at each spike', <>u ← u + U (1 − u); the response ∝ u × R; then R ← R (1 − u)</>)}
        {row(
          'between spikes',
          <>R recovers towards 1, with time constant D; u fades towards 0, with time constant F</>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {chip('U', 'the fraction of the resources a first spike uses')}
        {chip('D', 'how slowly used resources recover, ms')}
        {chip('F', 'how slowly facilitation fades, ms')}
      </div>
    </div>
  );
}

/** A stochastic synapse of five release sites through the train, trial by trial, each site released or not by chance. */
const SITES = 5;
function trial(p: Dynamics, seed: number) {
  const rnd = mulberry32(seed);
  const available = Array.from({ length: SITES }, () => true);
  let [u, last] = [0, Number.NaN];
  return SPIKES.map((t) => {
    if (Number.isFinite(last)) {
      u *= Math.exp(-(t - last) / p.F);
      const back = 1 - Math.exp(-(t - last) / p.D);
      for (let k = 0; k < SITES; k++) if (!available[k] && rnd() < back) available[k] = true;
    }
    u += p.U * (1 - u);
    const was = [...available];
    const released = was.map((free) => free && rnd() < u);
    released.forEach((r, k) => {
      if (r) available[k] = false;
    });
    last = t;
    return { was, released, count: released.filter(Boolean).length };
  });
}

/** One trial: each site at each spike — released, there but not released, or used and not yet back — and the count. */
function Stochastic() {
  const one = trial(DEPRESSING, 7);
  const y = (k: number) => 64 + k * 26;
  return (
    <Frame label="One trial at a stochastic depressing synapse of five release sites: at each spike, each available site released or not by chance, released sites unavailable until they recover; under them, how many released.">
      <Spikes y={14} />
      {one.map(({ was, released }, s) =>
        was.map((free, k) => (
          <circle
            key={`${s}-${k}`}
            cx={X(SPIKES[s])}
            cy={y(k)}
            r={7}
            fill={released[k] ? RELEASE : 'none'}
            stroke={free ? RELEASE : '#64748b'}
            strokeWidth="1.6"
            opacity={free ? 1 : 0.45}
          />
        ))
      )}
      <Words x={X(0) - 10} y={y(2) + 5} anchor="end" size={12}>
        sites
      </Words>
      <Bars amps={one.map((s) => s.count)} base={290} h={70} colour={RELEASE} top={SITES} />
      <Words x={X(0) - 10} y={272} anchor="end" size={12}>
        released
      </Words>
      <g>
        <circle cx={500} cy={206} r={6} fill={RELEASE} />
        <Words x={512} y={210} anchor="start" size={12.5}>
          released
        </Words>
        <circle cx={590} cy={206} r={6} fill="none" stroke={RELEASE} strokeWidth="1.6" />
        <Words x={602} y={210} anchor="start" size={12.5}>
          there
        </Words>
        <circle
          cx={655}
          cy={206}
          r={6}
          fill="none"
          stroke="#64748b"
          strokeWidth="1.6"
          opacity={0.45}
        />
        <Words x={667} y={210} anchor="start" size={12.5}>
          recovering
        </Words>
      </g>
    </Frame>
  );
}

/** Forty trials' counts at each spike, their mean, and the deterministic model's prediction. */
function Trials() {
  const trials = Array.from({ length: 40 }, (_, k) => trial(DEPRESSING, 100 + k));
  const mean = SPIKES.map(
    (_, s) => trials.reduce((sum, tr) => sum + tr[s].count, 0) / trials.length
  );
  const predicted = run(DEPRESSING).map((s) => SITES * s.amp);
  const Y = (n: number) => 270 - (n / SITES) * 220;
  const jitter = mulberry32(3);
  const line = (values: number[]) => values.map((v, s) => `${X(SPIKES[s])},${Y(v)}`).join(' ');
  return (
    <Frame label="Forty trials' release counts at each spike, scattered; their mean, and the deterministic model's prediction, close together.">
      {trials.map((tr, k) =>
        tr.map(({ count }, s) => (
          <circle
            key={`${k}-${s}`}
            cx={X(SPIKES[s]) + (jitter() - 0.5) * 22}
            cy={Y(count) + (jitter() - 0.5) * 6}
            r={2.6}
            fill={RELEASE}
            opacity={0.35}
          />
        ))
      )}
      <polyline points={line(mean)} fill="none" stroke={RELEASE} strokeWidth="2.4" />
      <polyline
        points={line(predicted)}
        fill="none"
        className="stroke-slate-200"
        strokeWidth="1.8"
        strokeDasharray="6 4"
      />
      {[0, SITES].map((n) => (
        <Words key={n} x={X(0) - 10} y={Y(n) + 4} anchor="end" size={12}>
          {String(n)}
        </Words>
      ))}
      <Words x={X(0) - 10} y={Y(2.5) + 4} anchor="end" size={12}>
        released
      </Words>
      <Words x={730} y={36} anchor="end" size={13} colour={RELEASE}>
        forty trials, and their mean
      </Words>
      <Words x={730} y={56} anchor="end" size={13}>
        dashed: the deterministic model
      </Words>
      <Words x={X(250)} y={294} size={12.5}>
        failures: trials where a spike released nothing
      </Words>
    </Frame>
  );
}

/** The synapse types the models assign, and the two whose numbers this course uses. */
function Types() {
  const rows: [string, string, string, string][] = [
    [
      'E1',
      'facilitating',
      'U ≈ 0.09, D ≈ 140 ms, F ≈ 670 ms',
      'pyramidal cells onto some interneurons',
    ],
    ['E2', 'depressing', 'U ≈ 0.5, D ≈ 670 ms, F ≈ 17 ms', 'pyramidal cells onto pyramidal cells'],
    ['E3', 'pseudo-linear', 'in between', ''],
    [
      'I1, I2, I3',
      'facilitating, depressing, pseudo-linear',
      'their own',
      'inhibitory connections',
    ],
  ];
  return (
    <div className="flex w-full max-w-4xl flex-col gap-2">
      <table className="w-full border-collapse text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-slate-700 text-slate-400">
            <th className="py-2 pr-4 font-normal">type</th>
            <th className="py-2 pr-4 font-normal">dynamics</th>
            <th className="py-2 pr-4 font-normal">U, D, F</th>
            <th className="py-2 font-normal">for example</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([type, dynamics, numbers, example]) => (
            <tr key={type} className="border-b border-slate-800">
              <td className="py-2 pr-4 font-semibold text-slate-100">{type}</td>
              <td className="py-2 pr-4 text-slate-200">{dynamics}</td>
              <td className="py-2 pr-4 text-slate-200">{numbers}</td>
              <td className="py-2 text-slate-400 italic" style={{ fontFamily: SERIF }}>
                {example}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <span className="text-[12.5px] text-slate-400 italic" style={{ fontFamily: SERIF }}>
        The classes are Gupta, Wang and Markram&apos;s (2000); the numbers, rounded, are those of
        Markram et al. (2015). Each connection&apos;s values are drawn around its type&apos;s.
      </span>
    </div>
  );
}

/** AMPA and NMDA conductances after one release, and NMDA's magnesium block against the membrane potential. */
function Conductance() {
  const shape = (rise: number, fall: number) => {
    const peak = ((rise * fall) / (fall - rise)) * Math.log(fall / rise);
    const at = (s: number) => Math.exp(-s / fall) - Math.exp(-s / rise);
    return (s: number) => (s <= 0 ? 0 : at(s) / at(peak));
  };
  const [ampa, nmda] = [shape(0.2, 1.7), shape(0.29, 43)];
  const T = (t: number) => 60 + (t / 100) * 400;
  const G = (g: number) => 250 - g * 170;
  const curve = (f: (s: number) => number) =>
    Array.from({ length: 401 }, (_, i) => {
      const t = (i / 400) * 100;
      return `${T(t).toFixed(1)},${G(f(t)).toFixed(1)}`;
    }).join(' ');
  // NMDA's magnesium block, as the models have it (Jahr and Stevens), at 1 mM magnesium
  const block = (v: number) => 1 / (1 + Math.exp(-0.062 * v) * (1 / 3.57));
  const V = (v: number) => 530 + ((v + 100) / 140) * 200;
  const B = (b: number) => 250 - b * 170;
  const blockCurve = Array.from({ length: 141 }, (_, i) => {
    const v = -100 + i;
    return `${V(v).toFixed(1)},${B(block(v)).toFixed(1)}`;
  }).join(' ');
  return (
    <Frame label="After one release, the AMPA conductance rising in a fraction of a millisecond and gone in a few, the NMDA one lasting tens; and NMDA's magnesium block, lifting as the membrane potential rises.">
      <line x1={T(0)} y1={250} x2={T(100)} y2={250} className="stroke-slate-600" />
      <polyline points={curve(ampa)} fill="none" stroke={DEPRESS} strokeWidth="2.2" />
      <polyline points={curve(nmda)} fill="none" stroke={FACIL} strokeWidth="2.2" />
      <Words x={T(6)} y={74} anchor="start" size={13} colour={DEPRESS}>
        AMPA: rise 0.2 ms, decay 1.7 ms
      </Words>
      <Words x={T(30)} y={150} anchor="start" size={13} colour={FACIL}>
        NMDA: rise 0.29 ms, decay 43 ms
      </Words>
      <Words x={T(50)} y={276} size={12.5}>
        time after a release, 0 to 100 ms
      </Words>
      <line x1={V(-100)} y1={250} x2={V(40)} y2={250} className="stroke-slate-600" />
      <polyline
        points={blockCurve}
        fill="none"
        stroke={FACIL}
        strokeWidth="2.2"
        strokeDasharray="5 3"
      />
      <Words x={V(-30)} y={276} size={12.5}>
        membrane potential, −100 to +40 mV
      </Words>
      <Words x={V(-100)} y={56} anchor="start" size={13} colour={FACIL}>
        NMDA unblocked by magnesium
      </Words>
      <Words x={V(-100)} y={74} anchor="start" size={12.5}>
        barely at rest, more as the potential rises
      </Words>
    </Frame>
  );
}

/** One vesicle per contact, as in 2015, against a pool of them, as since 2019; a spike releasing some. */
function Mvr() {
  const contact = (cx: number, cy: number, n: number, released: number[]) => (
    <g key={`${cx}-${cy}`}>
      <rect
        x={cx - 34}
        y={cy - 22}
        width={68}
        height={44}
        rx={14}
        className="fill-slate-800/60 stroke-slate-600"
        strokeWidth="1.2"
      />
      {Array.from({ length: n }, (_, k) => {
        const x = cx + (k - (n - 1) / 2) * 17;
        const out = released.includes(k);
        return (
          <circle
            key={k}
            cx={x}
            cy={cy}
            r={6.5}
            fill={out ? RELEASE : 'none'}
            stroke={RELEASE}
            strokeWidth="1.6"
          />
        );
      })}
    </g>
  );
  return (
    <Frame label="Five contacts with one vesicle each, against five with a pool of three each; at a spike, some vesicles released in each.">
      <Words x={190} y={40} size={14} italic={false}>
        2015: one vesicle per contact
      </Words>
      <Words x={570} y={40} size={14} italic={false}>
        since 2019: a pool, N_RRP, per contact
      </Words>
      {[0, 1, 2, 3, 4].map((k) => contact(190, 80 + k * 46, 1, k % 2 ? [] : [0]))}
      {[0, 1, 2, 3, 4].map((k) => contact(570, 80 + k * 46, 3, [[0, 2], [1], [], [0, 1], [2]][k]))}
      <Words x={380} y={300} size={12.5}>
        filled: released by this spike, each with probability u
      </Words>
    </Frame>
  );
}

/** How variable the first response is, against the pool's size: five contacts, u = 0.5. */
function Cv() {
  const n = [1, 2, 3, 4, 5, 6];
  const cv = (k: number) => Math.sqrt((1 - 0.5) / (5 * k * 0.5));
  const P = (k: number) => 110 + ((k - 1) / 5) * 540;
  const Q = (c: number) => 260 - (c / 0.5) * 200;
  return (
    <Frame label="How variable the first response is from trial to trial, its coefficient of variation, falling as each contact's pool of vesicles grows.">
      <line x1={P(1)} y1={260} x2={P(6)} y2={260} className="stroke-slate-600" />
      <polyline
        points={n.map((k) => `${P(k)},${Q(cv(k))}`).join(' ')}
        fill="none"
        stroke={RELEASE}
        strokeWidth="2"
      />
      {n.map((k) => (
        <g key={k}>
          <circle cx={P(k)} cy={Q(cv(k))} r={5} fill={RELEASE} />
          <Words x={P(k)} y={282} size={12.5} italic={false}>
            {String(k)}
          </Words>
          <Words x={P(k)} y={Q(cv(k)) - 12} size={12}>
            {cv(k).toFixed(2)}
          </Words>
        </g>
      ))}
      <Words x={380} y={300} size={12.5}>
        vesicles in each contact&apos;s pool, N_RRP: five contacts, each vesicle released with
        probability 0.5
      </Words>
      <Words x={P(6)} y={44} anchor="end" size={13.5} colour={RELEASE}>
        the first response&apos;s coefficient of variation: the more vesicles, the less it varies
      </Words>
    </Frame>
  );
}

export default function TmFigure({ step, back = false }: { step: TmStep; back?: boolean }) {
  let body: ReactNode;
  if (step === 'train') body = <Train />;
  else if (step === 'kinds') body = <Kinds />;
  else if (step === 'resources') body = <Resources bars={false} />;
  else if (step === 'use') body = <Resources bars />;
  else if (step === 'facilitation') body = <Facilitation />;
  else if (step === 'rules') body = <Rules />;
  else if (step === 'depressing') body = <Kinds lit="depressing" />;
  else if (step === 'facilitating') body = <Kinds lit="facilitating" />;
  else if (step === 'stochastic') body = <Stochastic />;
  else if (step === 'trials') body = <Trials />;
  else if (step === 'bbp') body = <Types />;
  else if (step === 'conductance') body = <Conductance />;
  else if (step === 'mvr') body = <Mvr />;
  else body = <Cv />;
  return (
    <div
      key={step}
      className={`flex w-full flex-1 items-start justify-center pt-1 ${back ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}
    >
      <div className="flex w-full max-w-4xl justify-center">{body}</div>
    </div>
  );
}
