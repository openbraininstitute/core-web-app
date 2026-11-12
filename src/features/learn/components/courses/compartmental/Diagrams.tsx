/**
 * The compartmental modeling course's diagrams, drawn as SVG. How the current between compartments is worked out: the
 * axial resistance between two compartments' middles, from the cytoplasm's resistivity, their distance apart and
 * their cross-section; the current Ohm's law drives through it; and where those currents go in a compartment's
 * equation. Then stepping an equation through time: forward Euler, along the slope at the start of each step; the
 * same with too long a step, overshooting further each time; and backward Euler, along the slope at the end of each
 * step, settling however long the step.
 */

import type { ReactNode } from 'react';

export const DIAGRAM_STEPS = [
  'resistance',
  'axial',
  'sum',
  'forward',
  'overshoot',
  'backward',
] as const;
export type DiagramStep = (typeof DIAGRAM_STEPS)[number];
export const isDiagramStep = (s: string): s is DiagramStep =>
  DIAGRAM_STEPS.includes(s as DiagramStep);

const SERIF = "Georgia, 'Times New Roman', serif";
const AMBER = '#d97706';
const FORWARD = '#d6323a';
const BACKWARD = '#0d9488';

const Words = ({
  x,
  y,
  children,
  anchor = 'middle',
  size = 14,
  colour,
  italic = true,
}: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: 'start' | 'middle' | 'end';
  size?: number;
  colour?: string;
  italic?: boolean;
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
  >
    {children}
  </text>
);

/** A compartment, end on: a cylinder lying along the dendrite, `tint` from 0 (rest) to 1 (warmer). */
function Compartment({
  x0,
  x1,
  y,
  r,
  tint = 0,
}: {
  x0: number;
  x1: number;
  y: number;
  r: number;
  tint?: number;
}) {
  return (
    <g>
      <path
        d={`M${x0} ${y - r} L${x1} ${y - r} A${r * 0.35} ${r} 0 0 1 ${x1} ${y + r} L${x0} ${y + r} A${r * 0.35} ${r} 0 0 1 ${x0} ${y - r} Z`}
        className="fill-slate-800/60 stroke-slate-500"
        strokeWidth="1.3"
      />
      {tint > 0 && (
        <path
          d={`M${x0} ${y - r} L${x1} ${y - r} A${r * 0.35} ${r} 0 0 1 ${x1} ${y + r} L${x0} ${y + r} A${r * 0.35} ${r} 0 0 1 ${x0} ${y - r} Z`}
          fill={AMBER}
          opacity={0.28 * tint}
        />
      )}
      <ellipse
        cx={x0}
        cy={y}
        rx={r * 0.35}
        ry={r}
        className="fill-none stroke-slate-500"
        strokeWidth="1"
      />
    </g>
  );
}

/** A resistor's zigzag along the dendrite's line, from one compartment's middle to the next's. */
function Resistor({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const lead = (x1 - x0) * 0.3;
  const n = 8;
  const step = (x1 - x0 - 2 * lead) / n;
  const zig = Array.from(
    { length: n + 1 },
    (_, k) => `${x0 + lead + k * step},${y + (k % 2 ? -7 : 7) * (k % n ? 1 : 0)}`
  );
  return (
    <polyline
      points={[`${x0},${y}`, `${x0 + lead},${y}`, ...zig, `${x1 - lead},${y}`, `${x1},${y}`].join(
        ' '
      )}
      className="fill-none stroke-slate-200"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  );
}

/** A double-headed measure between two points, its name beside it. */
function Measure({
  x0,
  y0,
  x1,
  y1,
  name,
}: {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  name: string;
}) {
  const vertical = x0 === x1;
  return (
    <g>
      <line
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        className="stroke-slate-400"
        strokeWidth="1.2"
        markerStart="url(#cm-head)"
        markerEnd="url(#cm-head)"
      />
      <Words
        x={vertical ? x0 + 12 : (x0 + x1) / 2}
        y={vertical ? (y0 + y1) / 2 + 5 : y0 + 20}
        anchor={vertical ? 'start' : 'middle'}
      >
        {name}
      </Words>
    </g>
  );
}

const Defs = () => (
  <defs>
    <marker
      id="cm-head"
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <path d="M0 0 L10 5 L0 10 z" className="fill-slate-400" />
    </marker>
    <marker
      id="cm-current"
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="8"
      markerHeight="8"
      orient="auto"
    >
      <path d="M0 0 L10 5 L0 10 z" fill={AMBER} />
    </marker>
  </defs>
);

/** Two compartments, the axial resistance between their middles, and how it is worked out. */
function Resistance() {
  return (
    <svg
      viewBox="0 0 760 270"
      className="w-full"
      role="img"
      aria-label="Two compartments side by side, a resistor between their middles: R equals the resistivity times their distance apart, over their cross-section; for 55 micrometre compartments 1 micrometre across, about 70 megaohms."
    >
      <Defs />
      <Compartment x0={110} x1={350} y={96} r={24} />
      <Compartment x0={350} x1={590} y={96} r={24} />
      <Resistor x0={230} x1={470} y={96} />
      {[230, 470].map((x) => (
        <circle key={x} cx={x} cy={96} r={4.5} className="fill-slate-200" />
      ))}
      <Measure
        x0={230}
        y0={140}
        x1={470}
        y1={140}
        name="l: from one compartment's middle to the next's"
      />
      <Measure x0={618} y0={72} x1={618} y1={120} name="d" />
      <Words x={380} y={208} size={17} italic={false}>
        R = Rᵢ × l / A, where A = π (d/2)², the cross-section
      </Words>
      <Words x={380} y={240}>
        Rᵢ ≈ 100 Ω·cm = 10⁶ Ω·µm. For l = 55 µm and d = 1 µm: R = 10⁶ × 55 / 0.79 ≈ 70 MΩ
      </Words>
      <Words x={380} y={30}>
        the cytoplasm between two compartments' middles is a resistor: longer, or thinner, and it
        resists more
      </Words>
    </svg>
  );
}

/** The same two, at different voltages, and the current between them. */
function Axial() {
  return (
    <svg
      viewBox="0 0 760 270"
      className="w-full"
      role="img"
      aria-label="Two compartments, the left at −55 millivolts and the right at −65: a current flows from left to right, the 10 millivolts between them over 70 megaohms, about 0.14 nanoamps."
    >
      <Defs />
      <Compartment x0={110} x1={350} y={110} r={24} tint={1} />
      <Compartment x0={350} x1={590} y={110} r={24} tint={0.25} />
      <line
        x1={250}
        y1={110}
        x2={452}
        y2={110}
        stroke={AMBER}
        strokeWidth="3"
        markerEnd="url(#cm-current)"
      />
      <Words x={350} y={98} colour={AMBER}>
        I
      </Words>
      <Words x={230} y={62} size={15}>
        V₁ = −55 mV
      </Words>
      <Words x={470} y={62} size={15}>
        V₂ = −65 mV
      </Words>
      <Words x={380} y={196} size={17} italic={false}>
        I = (V₁ − V₂) / R = 10 mV / 70 MΩ ≈ 0.14 nA
      </Words>
      <Words x={380} y={228}>
        Ohm's law, as through a channel, but along the cytoplasm: from the higher voltage to the
        lower
      </Words>
    </svg>
  );
}

/** A compartment between two neighbours, the currents into and out of it, and its equation. */
function Sum() {
  const term = (x: number, top: string, bottom: string, colour?: string) => (
    <g>
      <Words x={x} y={214} size={17} italic={false} colour={colour}>
        {top}
      </Words>
      <Words x={x} y={240} size={12.5} colour={colour}>
        {bottom}
      </Words>
    </g>
  );
  return (
    <svg
      viewBox="0 0 760 270"
      className="w-full"
      role="img"
      aria-label="A compartment between two neighbours, current flowing into it from each, out through its channels and in from an electrode; its equation adds them up to give how fast its voltage changes."
    >
      <Defs />
      <Compartment x0={60} x1={270} y={78} r={22} tint={0.6} />
      <Compartment x0={270} x1={490} y={78} r={22} tint={0.3} />
      <Compartment x0={490} x1={700} y={78} r={22} tint={0.1} />
      <line
        x1={185}
        y1={78}
        x2={330}
        y2={78}
        stroke={AMBER}
        strokeWidth="2.6"
        markerEnd="url(#cm-current)"
      />
      <line
        x1={590}
        y1={78}
        x2={430}
        y2={78}
        stroke={AMBER}
        strokeWidth="2.6"
        markerEnd="url(#cm-current)"
        opacity="0.55"
      />
      <line
        x1={380}
        y1={104}
        x2={380}
        y2={140}
        className="stroke-sky-400"
        strokeWidth="2.4"
        markerEnd="url(#cm-head)"
      />
      <Words x={380} y={30}>
        each compartment: its neighbours' currents, its channels', and any electrode's, add up
      </Words>
      <Words x={392} y={136} anchor="start" size={12.5}>
        through its channels
      </Words>
      <Words x={380} y={178} size={17} italic={false}>
        C × dV/dt =
      </Words>
      {term(118, '(V₀ − V) / R₀', 'from one neighbour', AMBER)}
      {term(268, '+ (V₂ − V) / R₂', 'from the other', AMBER)}
      {term(440, '− Σ g × (V − E)', 'through its channels')}
      {term(620, '+ I_injected', 'from an electrode')}
    </svg>
  );
}

/** An equation stepped through time: dV/dt = −V/τ, V starting at 1, and the true curve under the steps. */
function Euler({ step }: { step: 'forward' | 'overshoot' | 'backward' }) {
  const [W, H] = [760, 290];
  const pad = { l: 56, r: 24, t: 54, b: 44 };
  const dt = step === 'forward' ? 0.5 : 2.5;
  const count = step === 'forward' ? 10 : 4;
  const span = step === 'forward' ? 4.5 : 8;
  const ratio = step === 'backward' ? 1 / (1 + dt) : 1 - dt;
  const points = Array.from({ length: count }, (_, k) => [k * dt, ratio ** k] as const).filter(
    ([t]) => t <= span
  );
  const [lo, hi] = step === 'overshoot' ? [-3.6, 3.6] : [-0.12, 1.08];
  const X = (t: number) => pad.l + (t / span) * (W - pad.l - pad.r);
  const Y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);
  const truth = Array.from({ length: 161 }, (_, i) => {
    const t = (i / 160) * span;
    return `${X(t).toFixed(1)},${Y(Math.exp(-t)).toFixed(1)}`;
  }).join(' ');
  const colour = step === 'backward' ? BACKWARD : FORWARD;
  const name = {
    forward: 'forward Euler, steps of τ/2: along the slope at the start of each step',
    overshoot: 'forward Euler, steps of 2.5 τ: each step overshoots, further each time',
    backward: 'backward Euler, steps of 2.5 τ: along the slope at the end of each step',
  }[step];
  const rule =
    step === 'backward'
      ? 'V(t + Δt) = V(t) + Δt × dV/dt at t + Δt'
      : 'V(t + Δt) = V(t) + Δt × dV/dt at t';
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`${name}, against the true curve`}
    >
      <line
        x1={pad.l}
        y1={Y(0)}
        x2={W - pad.r}
        y2={Y(0)}
        className="stroke-slate-600"
        strokeDasharray="4 4"
      />
      <line x1={pad.l} y1={pad.t - 8} x2={pad.l} y2={H - pad.b} className="stroke-slate-600" />
      <Words x={W - pad.r} y={Y(0) + 20} anchor="end" size={12.5}>
        where it settles
      </Words>
      <Words x={(pad.l + W - pad.r) / 2} y={H - 10} size={12.5}>
        time, in time constants τ
      </Words>
      <polyline points={truth} className="fill-none stroke-slate-400" strokeWidth="2" />
      <Words
        x={X(Math.min(span, 1.6)) + 8}
        y={Y(Math.exp(-Math.min(span, 1.6))) - 10}
        anchor="start"
        size={12.5}
      >
        the true curve
      </Words>
      {points.slice(1).map(([t, v], k) => {
        const [t0, v0] = points[k];
        return (
          <line
            key={t}
            x1={X(t0)}
            y1={Y(v0)}
            x2={X(Math.min(t, span))}
            y2={Y(v)}
            stroke={colour}
            strokeWidth="2"
            strokeDasharray={step === 'backward' ? undefined : '6 4'}
          />
        );
      })}
      {points.map(([t, v]) => (
        <circle key={t} cx={X(t)} cy={Y(v)} r={5} fill={colour} />
      ))}
      <Words x={pad.l + 10} y={26} anchor="start" size={15} colour={colour}>
        {name}
      </Words>
      <Words x={W - pad.r} y={48} anchor="end" size={14} italic={false}>
        {rule}
      </Words>
    </svg>
  );
}

export default function Diagram({ step }: { step: DiagramStep }) {
  if (step === 'resistance') return <Resistance />;
  if (step === 'axial') return <Axial />;
  if (step === 'sum') return <Sum />;
  return <Euler step={step} />;
}
