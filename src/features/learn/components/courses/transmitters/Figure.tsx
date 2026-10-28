'use client';

/**
 * The neurotransmitters course's figure. Most slides show a synapse at work,
 * slowed down: a spike reaches the terminal, calcium flows in, a vesicle
 * empties its transmitter into the cleft and the receptors it binds open — or,
 * metabotropic, set a G-protein off to open a channel nearby — letting ions
 * through, while the voltage they make is traced beside it, from a small
 * simulation of the membrane. The neuromodulators' slides show where in the
 * brain each comes from, and how it changes a neuron's spikes for the same
 * input. The rest show reversal potentials, potentials adding up, shunting,
 * NMDA receptors' magnesium block, neuropeptides' dense-core vesicles,
 * endocannabinoids travelling backwards, nitric oxide spreading, the
 * transmitter cleared away, a summary, and synapses as the platform's models
 * describe them. Each slide's section is named at the figure's top right, and
 * its cycle waits for the slide's words to type.
 */

import { useRef } from 'react';

import {
  clamp01,
  lerp,
  mix,
  type RGB,
  rgba,
  smooth,
} from '@/features/learn/components/heuristics/shared';
import { mulberry32 } from '@/features/learn/lib/basics/morphologies';

import { arrow, type Look, mathWords, words } from '../ui/canvas';
import StepCanvas, { type Frame } from '../ui/StepCanvas';

export const TRANSMITTER_STEPS = [
  'intro',
  'release',
  'receptors',
  'reversal',
  'summation',
  'modulation',
  'glutamate',
  'nmda',
  'gaba',
  'shunting',
  'gabab',
  'glycine',
  'acetylcholine',
  'muscarinic',
  'diffuse',
  'dopamine',
  'noradrenaline',
  'serotonin',
  'histamine',
  'purines',
  'peptides',
  'endocannabinoids',
  'nitric',
  'clearing',
  'summary',
  'models',
] as const;
export type TransmitterStep = (typeof TRANSMITTER_STEPS)[number];
type Step = TransmitterStep;

/** The course's sections, each named from its first step on. */
const SECTIONS: [Step, string][] = [
  ['intro', '1  How transmitters work'],
  ['glutamate', '2  Glutamate, GABA and glycine'],
  ['acetylcholine', '3  Acetylcholine'],
  ['diffuse', '4  The monoamines'],
  ['purines', '5  More transmitters'],
  ['clearing', '6  Ending the signal, and modelling it'],
];
const sectionOf = (step: Step) =>
  SECTIONS.filter(
    ([first]) => TRANSMITTER_STEPS.indexOf(step) >= TRANSMITTER_STEPS.indexOf(first)
  ).at(-1)?.[1] ?? '';

/** The pictures, and which each step shows. */
const SCENES = [
  'synapse',
  'receptors',
  'reversal',
  'summation',
  'modulator',
  'nmda',
  'shunting',
  'diffuse',
  'peptides',
  'endocannabinoids',
  'nitric',
  'clearing',
  'summary',
  'models',
] as const;
type Scene = (typeof SCENES)[number];
const SCENE_OF: Record<Step, Scene> = {
  intro: 'synapse',
  release: 'synapse',
  receptors: 'receptors',
  reversal: 'reversal',
  summation: 'summation',
  modulation: 'modulator',
  glutamate: 'synapse',
  nmda: 'nmda',
  gaba: 'synapse',
  shunting: 'shunting',
  gabab: 'synapse',
  glycine: 'synapse',
  acetylcholine: 'synapse',
  muscarinic: 'modulator',
  diffuse: 'diffuse',
  dopamine: 'modulator',
  noradrenaline: 'modulator',
  serotonin: 'modulator',
  histamine: 'modulator',
  purines: 'modulator',
  peptides: 'peptides',
  endocannabinoids: 'endocannabinoids',
  nitric: 'nitric',
  clearing: 'clearing',
  summary: 'summary',
  models: 'models',
};

/* --------------------------------------------------------------- colours */

/** Each transmitter's colour, the same wherever it is drawn. */
const ANY: RGB = [100, 116, 139];
const GLU: RGB = [22, 163, 74];
const GABA: RGB = [37, 99, 235];
const GLY: RGB = [14, 165, 233];
const ACH: RGB = [217, 119, 6];
const DA: RGB = [220, 38, 38];
const NORAD: RGB = [192, 38, 211];
const HT: RGB = [13, 148, 136];
const HA: RGB = [101, 163, 13];
const ADO: RGB = [71, 85, 105];
const CAFFEINE: RGB = [146, 64, 14];
const PEPTIDE: RGB = [225, 29, 72];
const ECB: RGB = [202, 138, 4];
const NO: RGB = [100, 116, 139];
const SPIKE: RGB = [250, 204, 21];
const WARM: RGB = [217, 119, 6];
const WHITE: RGB = [255, 255, 255];

/** The ions, in their own colours, as the physics course draws them, and their charge. */
type IonKind = 'Na' | 'K' | 'Cl' | 'Ca' | 'Mg';
const IONS: Record<IonKind, { name: string; colour: RGB; sign: number }> = {
  Na: { name: 'Na^{+}', colour: [234, 88, 12], sign: 1 },
  K: { name: 'K^{+}', colour: [124, 58, 237], sign: 1 },
  Cl: { name: 'Cl^{−}', colour: [13, 148, 136], sign: -1 },
  Ca: { name: 'Ca^{2+}', colour: [219, 39, 119], sign: 1 },
  Mg: { name: 'Mg^{2+}', colour: [100, 116, 139], sign: 1 },
};

/* ----------------------------------------------------------------- poses */

/** A synapse as the synapse slides draw it: its transmitter, its receptors and their ions, and the voltage they make. */
interface Syn {
  /** The transmitter's colour; and where the synapse sits, design px from the middle. */
  hue: RGB;
  at: number;
  /** Its receptors: ion channels themselves, or a metabotropic receptor, its G-protein and the channel it opens. */
  iono: number;
  metabo: number;
  /** The ions they pass: sodium, calcium and chloride in, potassium out. */
  na: number;
  ca: number;
  cl: number;
  k: number;
  /** The conductance: its peak, in the membrane's own leak; reversal potential, mV; rise and decay, ms; and its delay after binding, ms. */
  g: number;
  E: number;
  rise: number;
  decay: number;
  delay: number;
  /** The cell's resting potential, and whether it fires past threshold (1) or not (0). */
  rest: number;
  spikes: number;
  /** The trace: how much it shows, how many ms it spans, and the voltages at its foot and top. */
  trace: number;
  span: number;
  lo: number;
  hi: number;
  /** Calcium flowing into the terminal, picked out. */
  calcium: number;
}
/** A fast excitatory synapse, as glutamate's AMPA receptors make one, and what each synapse slide changes of it. */
const FAST: Syn = {
  hue: ANY,
  at: -250,
  iono: 1,
  metabo: 0,
  na: 1,
  ca: 0,
  cl: 0,
  k: 0.4,
  g: 1,
  E: 0,
  rise: 0.2,
  decay: 1.7,
  delay: 0,
  rest: -70,
  spikes: 0,
  trace: 1,
  span: 50,
  lo: -74,
  hi: -60,
  calcium: 0,
};
const SYN: Partial<Record<Step, Partial<Syn>>> = {
  intro: { at: -150, trace: 0 },
  release: { at: -150, trace: 0, calcium: 1 },
  glutamate: { hue: GLU },
  gaba: { hue: GABA, na: 0, k: 0, cl: 1, g: 2.2, E: -80, decay: 8, span: 80, lo: -82, hi: -64 },
  gabab: {
    hue: GABA,
    iono: 0,
    metabo: 1,
    na: 0,
    k: 1,
    g: 0.45,
    E: -97,
    delay: 15,
    rise: 40,
    decay: 260,
    span: 800,
    lo: -99,
    hi: -64,
  },
  glycine: {
    hue: GLY,
    na: 0,
    k: 0,
    cl: 1,
    g: 2.5,
    E: -80,
    rise: 0.5,
    decay: 6,
    span: 80,
    lo: -82,
    hi: -64,
  },
  acetylcholine: {
    hue: ACH,
    g: 18,
    rise: 0.2,
    decay: 1,
    rest: -90,
    spikes: 1,
    span: 30,
    lo: -95,
    hi: 35,
  },
};

/** A neuron's leak and adaptation, as a modulator changes them: its resting potential shifted (mV), its leak scaled, its adaptation scaled. */
interface Cell {
  dEL: number;
  gl: number;
  b: number;
}
interface Row extends Cell {
  show: number;
  hue: RGB;
}
/** The modulator slides: how much each system shows on the brain — acetylcholine, dopamine, noradrenaline, serotonin, histamine — and adenosine everywhere; and the two rows of spikes beneath the unmodulated one. */
interface Mod {
  sys: number[];
  adenosine: number;
  rows: [Row, Row];
}
const BARE: Row = { show: 0, hue: ANY, dEL: 0, gl: 1, b: 1 };
const QUIET: Mod = { sys: [0.5, 0.5, 0.5, 0.5, 0.5], adenosine: 0, rows: [BARE, BARE] };
const only = (i: number) => [0, 1, 2, 3, 4].map((j) => (i === j ? 1 : 0.1));
const MOD: Partial<Record<Step, Mod>> = {
  modulation: {
    sys: [0.6, 0.6, 0.6, 0.6, 0.6],
    adenosine: 0,
    rows: [
      { show: 1, hue: [194, 65, 12], dEL: 2, gl: 0.9, b: 0.7 },
      { show: 1, hue: [71, 85, 105], dEL: -2, gl: 1.15, b: 1 },
    ],
  },
  muscarinic: {
    sys: only(0),
    adenosine: 0,
    rows: [{ show: 1, hue: ACH, dEL: 1, gl: 0.95, b: 0.45 }, BARE],
  },
  dopamine: {
    sys: only(1),
    adenosine: 0,
    rows: [
      { show: 1, hue: DA, dEL: 2.5, gl: 0.9, b: 0.8 },
      { show: 1, hue: [153, 27, 27], dEL: -2, gl: 1.1, b: 1 },
    ],
  },
  noradrenaline: {
    sys: only(2),
    adenosine: 0,
    rows: [{ show: 1, hue: NORAD, dEL: 0, gl: 1, b: 0.45 }, BARE],
  },
  serotonin: {
    sys: only(3),
    adenosine: 0,
    rows: [
      { show: 1, hue: HT, dEL: -2.5, gl: 1.15, b: 1 },
      { show: 1, hue: [17, 94, 89], dEL: 3, gl: 0.85, b: 0.8 },
    ],
  },
  histamine: {
    sys: only(4),
    adenosine: 0,
    rows: [{ show: 1, hue: HA, dEL: 3, gl: 0.85, b: 1 }, BARE],
  },
  purines: {
    sys: [0.08, 0.08, 0.08, 0.08, 0.08],
    adenosine: 1,
    rows: [
      { show: 1, hue: ADO, dEL: -2.5, gl: 1.15, b: 1 },
      { show: 1, hue: CAFFEINE, dEL: 0, gl: 1, b: 1 },
    ],
  },
};

interface Pose {
  /** How much each picture shows, and each step's own words. */
  show: Record<Scene, number>;
  own: Record<Step, number>;
  syn: Syn;
  mod: Mod;
}
/** The step a picture easing between two is nearer. */
const nearest = (P: Pose) =>
  TRANSMITTER_STEPS.reduce((best, s) => (P.own[s] > P.own[best] ? s : best));
const poseFor = (step: Step): Pose => ({
  show: Object.fromEntries(SCENES.map((s) => [s, SCENE_OF[step] === s ? 1 : 0])) as Record<
    Scene,
    number
  >,
  own: Object.fromEntries(TRANSMITTER_STEPS.map((s) => [s, s === step ? 1 : 0])) as Record<
    Step,
    number
  >,
  syn: { ...FAST, ...SYN[step] },
  mod: MOD[step] ?? QUIET,
});

/** A synapse's cycle, ms, and where in it: the spike reaches the terminal, the transmitter reaches the receptors and leaves them, and the trace is drawn to its end. An ion takes `TRAVEL` of it to pass a channel. */
const PERIOD = 4400;
const C_SPIKE = 0.08;
const C_BIND = 0.13;
const C_UNBIND = 0.38;
const C_PEN = 0.86;
const TRAVEL = 0.12;

/** What a picture is drawn with: the canvas, the look, the figure's size and middle, and its scales and clocks. */
interface G {
  ctx: CanvasRenderingContext2D;
  L: Look;
  w: number;
  h: number;
  cx: number;
  cy: number;
  /** px per design px — 1 on a wide figure, less on a narrow one; and the same for words, which shrink less. */
  u: number;
  ts: number;
  /** Where the slide's cycle is, 0 to 1, and how far its traces are drawn; ms since its words typed out, for what plays once; and ms since the page opened, for what drifts. */
  c: number;
  pen: number;
  t: number;
  now: number;
}
type Draw = (g: G, a: number, P: Pose) => void;

/* ---------------------------------------------------------------- pieces */

/** A disc in a colour, with a charge's sign on it if it has one. */
function disc(g: G, x: number, y: number, r: number, colour: RGB, sign: number, a: number) {
  if (a < 0.01) return;
  const { ctx } = g;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = rgba(colour, 0.95);
  ctx.fill();
  if (sign && r >= 3.5) {
    const s = r * 0.48;
    ctx.strokeStyle = rgba(WHITE, 0.95);
    ctx.lineWidth = Math.max(1.1, r * 0.2);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    if (sign > 0) {
      ctx.moveTo(x, y - s);
      ctx.lineTo(x, y + s);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
const ion = (g: G, x: number, y: number, kind: IonKind, a: number, r = 6.5 * g.u) =>
  disc(g, x, y, r, IONS[kind].colour, IONS[kind].sign, a);
/** A transmitter molecule: a small dot in its colour. */
function molecule(g: G, x: number, y: number, r: number, hue: RGB, a: number) {
  if (a < 0.01) return;
  const { ctx, L } = g;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = rgba(hue, 0.9);
  ctx.fill();
  ctx.strokeStyle = rgba(mix(hue, L.ink, 0.4), 0.7);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Words in the figures' italic serif, haloed in the page's colour, with subscripts after `_` and superscripts after `^`. */
const say = (
  g: G,
  text: string,
  x: number,
  y: number,
  a: number,
  size = 13,
  align: CanvasTextAlign = 'center',
  c?: RGB
) => mathWords(g.ctx, text, x, y, c ?? g.L.ink, a, size * g.ts, align, g.L.page);

function line(
  g: G,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  a: number,
  colour?: RGB,
  width = 2,
  dash = 0
) {
  if (a < 0.01) return;
  const { ctx } = g;
  ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(colour ?? g.L.ink, 0.85);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.setLineDash(dash ? [dash, dash] : []);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function curve(g: G, pts: [number, number][], a: number, colour: RGB, width = 2.2, dash = 0) {
  if (a < 0.01 || pts.length < 2) return;
  const { ctx } = g;
  ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(colour, 0.95);
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash(dash ? [dash, dash] : []);
  ctx.beginPath();
  pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

/** A soft glow round (x, y). */
function glow(g: G, x: number, y: number, r: number, colour: RGB, a: number) {
  if (a < 0.01) return;
  const { ctx } = g;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, rgba(colour, 0.34 * a));
  grad.addColorStop(1, rgba(colour, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** A label and a thin line to what it names. */
function tag(g: G, text: string, x: number, y: number, tx: number, ty: number, a: number, c?: RGB) {
  line(g, x - 6 * g.u, y, tx, ty, 0.35 * a, g.L.ink, 1);
  say(g, text, x, y, 0.9 * a, 13, 'left', c);
}

/** Where a repeating motion is, 0 to 1, every `period` ms; how much something shows that fades in and out at a span's ends; and how much shows between two points of a cycle, easing in and out over `edge`. */
const cycle = (t: number, period: number, offset = 0) =>
  ((((t + offset) % period) + period) % period) / period;
const ends = (q: number) => clamp01(Math.min(6 * q, 6 * (1 - q)));
const bump = (c: number, from: number, to: number, edge = 0.02) =>
  clamp01((c - from + edge) / edge) * clamp01((to + edge - c) / edge);
/** A slow wander, px: two sines out of step. */
const drift = (now: number, p: number, q: number, size: number) =>
  size * (0.65 * Math.sin(now / 1900 + p) + 0.35 * Math.sin(now / 730 + q));

/** A strip of membrane across, at scale `k`: two layers of lipids, heads out, broken where proteins pass through it. */
function membrane(g: G, y: number, x0: number, x1: number, a: number, gaps: number[], k: number) {
  if (a < 0.01) return;
  const { ctx, L } = g;
  ctx.globalAlpha = a;
  const heads = new Path2D();
  const tails = new Path2D();
  for (let x = x0; x < x1; x += 9 * k) {
    if (gaps.some((gx) => Math.abs(gx - x) < 17 * k)) continue;
    for (const side of [-1, 1]) {
      heads.moveTo(x + 3.6 * k, y + side * 10 * k);
      heads.arc(x, y + side * 10 * k, 3.6 * k, 0, Math.PI * 2);
      tails.moveTo(x, y + side * 6.4 * k);
      tails.lineTo(x, y + side * 1.2 * k);
    }
  }
  ctx.strokeStyle = rgba(L.ink, 0.25);
  ctx.lineWidth = 1;
  ctx.stroke(tails);
  ctx.fillStyle = rgba(mix(L.page, [148, 163, 184], 0.85), 0.95);
  ctx.fill(heads);
  ctx.globalAlpha = 1;
}

/** A receptor or channel through the membrane at (x, y): two halves round a pore, apart as it opens; a receptor's binding sites on top, filled while its transmitter is bound. */
function channel(
  g: G,
  x: number,
  y: number,
  k: number,
  hue: RGB,
  open: number,
  a: number,
  bound = -1
) {
  if (a < 0.01) return;
  const { ctx, L } = g;
  ctx.globalAlpha = a;
  for (const side of [-1, 1]) {
    const sx = x + side * (7 + 4 * open) * k;
    ctx.beginPath();
    ctx.roundRect(sx - 6 * k, y - 21 * k, 12 * k, 42 * k, 5 * k);
    ctx.fillStyle = rgba(mix(mix(L.page, L.ink, 0.2), hue, 0.25), 0.98);
    ctx.fill();
    ctx.strokeStyle = rgba(L.ink, 0.5);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    if (bound >= 0) {
      ctx.beginPath();
      ctx.arc(sx, y - 21 * k, 4.2 * k, Math.PI, 0);
      ctx.fillStyle = rgba(mix(L.page, hue, 0.2 + 0.7 * bound), 1);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** A metabotropic receptor at (x, y): a bundle of seven helices across the membrane, its binding pocket on top. */
function gpcr(
  g: G,
  x: number,
  y: number,
  k: number,
  hue: RGB,
  a: number,
  lit: number,
  flip = false
) {
  if (a < 0.01) return;
  const { ctx, L } = g;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(x - 17 * k, y - 21 * k, 34 * k, 42 * k, 8 * k);
  ctx.fillStyle = rgba(mix(mix(L.page, L.ink, 0.18), hue, 0.25 + 0.35 * lit), 0.98);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.5);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.strokeStyle = rgba(L.page, 0.7);
  for (let i = 1; i < 4; i++) {
    const sx = x - 17 * k + (i * 34 * k) / 4;
    ctx.beginPath();
    ctx.moveTo(sx, y - 15 * k);
    ctx.lineTo(sx, y + 15 * k);
    ctx.stroke();
  }
  const top = flip ? y + 21 * k : y - 21 * k;
  ctx.beginPath();
  ctx.arc(x, top, 5 * k, flip ? 0 : Math.PI, flip ? Math.PI : 0);
  ctx.fillStyle = rgba(mix(L.page, hue, 0.2 + 0.7 * lit), 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.5);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/* ----------------------------------------------------------- simulations */

/** The membrane under a synapse: its time constant (ms), resting potential and threshold (mV), and the samples each trace is drawn from. */
const TAU_M = 20;
const REST = -70;
const THRESHOLD = -55;
const SAMPLES = 480;
/** How open an NMDA receptor's pore is at a voltage, its magnesium block as the platform's synapse models have it. */
const mgGate = (v: number) => 1 / (1 + Math.exp(-0.07207477 * v) / 2.5522415);
/** A conductance rising and decaying with two time constants, peaking at 1, as the platform's synapse models make it. */
function dual(rise: number, decay: number) {
  const peak = ((rise * decay) / (decay - rise)) * Math.log(decay / rise);
  const norm = Math.exp(-peak / decay) - Math.exp(-peak / rise);
  return (t: number) => (t < 0 ? 0 : (Math.exp(-t / decay) - Math.exp(-t / rise)) / norm);
}
interface Input {
  at: number;
  g: number;
  E: number;
  rise: number;
  decay: number;
  mg?: boolean;
}
interface Run {
  /** The voltage at each sample; the receptors' conductance, before any block; the current they have passed so far; and how much of the current they would pass unblocked they did. */
  v: Float32Array;
  open: Float32Array;
  cum: Float32Array;
  share: number;
  peak: number;
}
/** A patch of membrane over `span` ms, from rest — or held depolarised by `hold` mV — given its inputs' conductances; spiking past threshold if asked. */
function simulate(
  inputs: Input[],
  span: number,
  o: { rest?: number; hold?: number; spikes?: boolean } = {}
): Run {
  const { rest = REST, hold = 0, spikes = false } = o;
  const dt = span / SAMPLES;
  const shapes = inputs.map((s) => dual(s.rise, s.decay));
  const v = new Float32Array(SAMPLES + 1);
  const open = new Float32Array(SAMPLES + 1);
  const cum = new Float32Array(SAMPLES + 1);
  let V = rest + hold;
  let refractory = 0;
  let unblocked = 0;
  let peak = 0;
  for (let k = 0; k <= SAMPLES; k++) {
    const t = k * dt;
    let G = 1;
    let drive = rest + hold;
    let gOpen = 0;
    let gPass = 0;
    inputs.forEach((s, i) => {
      const gi = s.g * shapes[i](t - s.at);
      const gated = s.mg ? gi * mgGate(V) : gi;
      G += gated;
      drive += gated * s.E;
      gOpen += gi;
      gPass += gated;
    });
    const vInf = drive / G;
    V = vInf + (V - vInf) * Math.exp((-dt * G) / TAU_M);
    if (refractory > 0) {
      refractory -= dt;
      V = Math.min(V, rest - 4);
    }
    v[k] = V;
    if (spikes && V >= THRESHOLD && refractory <= 0) {
      v[k] = 30;
      V = rest - 6;
      refractory = 3;
    }
    open[k] = gOpen;
    cum[k] = (k ? cum[k - 1] : 0) + gPass * dt;
    unblocked += gOpen * dt;
    peak = Math.max(peak, gOpen);
  }
  return { v, open, cum, share: unblocked > 0 ? cum[SAMPLES] / unblocked : 0, peak };
}

/** What has been worked out already, by what it was worked out from: the simulations, while a slide holds still. */
const memo = new Map<string, unknown>();
function remember<T>(key: string, make: () => T): T {
  let found = memo.get(key) as T | undefined;
  if (found === undefined) {
    if (memo.size > 240) memo.clear();
    found = make();
    memo.set(key, found);
  }
  return found;
}
const keyOf = (...xs: (number | boolean | undefined)[]) =>
  xs.map((x) => (typeof x === 'number' ? x.toFixed(3) : String(x))).join(',');

/** The membrane under a synapse over its trace's span, its transmitter bound when the cycle reaches `C_BIND`. */
function synRun(S: Syn, o: { mg?: boolean; hold?: number } = {}) {
  const at = (C_BIND / C_PEN) * S.span + S.delay;
  const spikes = S.spikes > 0.5;
  return remember(keyOf(S.g, S.E, S.rise, S.decay, at, S.span, S.rest, spikes, o.mg, o.hold), () =>
    simulate([{ at, g: S.g, E: S.E, rise: S.rise, decay: S.decay, mg: o.mg }], S.span, {
      rest: S.rest,
      hold: o.hold,
      spikes,
    })
  );
}
/** How open the receptors are at a point of the cycle, 0 to 1. */
const openAt = (run: Run, c: number) =>
  run.peak > 0 ? run.open[Math.round(clamp01(c / C_PEN) * SAMPLES)] / run.peak : 0;
/** When, as points of the cycle, `m` ions pass, spread as the current is — each set `offset` of a step later. */
function passing(run: Run, m: number, offset: number) {
  const out: number[] = [];
  const total = run.cum[SAMPLES];
  if (total <= 0 || m <= 0) return out;
  let k = 0;
  for (let j = 0; j < m; j++) {
    const want = ((j + 0.5 + offset) / (m + 1)) * total;
    while (k < SAMPLES && run.cum[k] < want) k++;
    out.push((k / SAMPLES) * C_PEN);
  }
  return out;
}

/** A neuron given the same step of current from 100 to 900 ms, as a modulator leaves it: its voltage each ms, a spike drawn to +30 mV. */
function respond(c: Cell) {
  return remember(`cell:${keyOf(c.dEL, c.gl, c.b)}`, () => {
    const v = new Float32Array(1001);
    const EL = REST + c.dEL;
    let V = EL;
    let w = 0;
    let fired = false;
    for (let k = 0; k <= 2000; k++) {
      const t = k * 0.5;
      const I = t >= 100 && t < 900 ? 27 : 0;
      V += (0.5 / 20) * (-c.gl * (V - EL) + I - w);
      w -= (0.5 / 300) * w;
      if (V >= -50) {
        V = -60;
        w += 4 * c.b;
        fired = true;
      }
      if (k % 2 === 0) {
        v[k / 2] = fired ? 30 : V;
        fired = false;
      }
    }
    return v;
  });
}

/* ----------------------------------------------------------------- plots */

interface Plot {
  l: number;
  t: number;
  r: number;
  b: number;
  lo: number;
  hi: number;
  span: number;
}
const yOf = (p: Plot, v: number) => lerp(p.b, p.t, (v - p.lo) / (p.hi - p.lo));
/**
 * A voltage plot's frame: its axes and times, the resting potential, threshold, and a reversal potential — on it, or,
 * off it, pointed to. `named` gives the numbers to write, where they differ from where the lines are drawn: a slide's
 * own, while the plot eases from another's.
 */
function frame(
  g: G,
  p: Plot,
  a: number,
  o: {
    rest?: number;
    threshold?: boolean;
    E?: number;
    hue?: RGB;
    named?: { rest: number; E: number; span: number };
  }
) {
  if (a < 0.01) return;
  const { u, L } = g;
  line(g, p.l, p.t - 6 * u, p.l, p.b, 0.5 * a, L.ink, 1.2);
  line(g, p.l, p.b, p.r, p.b, 0.5 * a, L.ink, 1.2);
  say(g, '0', p.l, p.b + 14 * u, 0.6 * a, 11.5);
  say(g, `${Math.round(o.named?.span ?? p.span)} ms`, p.r, p.b + 14 * u, 0.6 * a, 11.5, 'right');
  const level = (v: number, text: string, colour: RGB, dash: number) => {
    if (v < p.lo || v > p.hi) return;
    const y = yOf(p, v);
    line(g, p.l, y, p.r, y, 0.45 * a, colour, 1.1, dash);
    say(g, text, p.l - 8 * u, y, 0.7 * a, 11.5, 'right', colour);
  };
  if (o.rest !== undefined)
    level(o.rest, `rest, ${Math.round(o.named?.rest ?? o.rest)} mV`, L.ink, 0);
  if (o.threshold) level(THRESHOLD, `threshold, ${THRESHOLD}`, L.ink, 4);
  if (o.E !== undefined && o.hue) {
    const text = `E ≈ ${Math.round(o.named?.E ?? o.E)} mV`;
    if (o.E >= p.lo && o.E <= p.hi) {
      const y = yOf(p, o.E);
      line(g, p.l, y, p.r, y, 0.6 * a, o.hue, 1.2, 5);
      say(g, text, p.r, y - 10 * u, 0.85 * a, 12, 'right', o.hue);
    } else {
      const up = o.E > p.hi;
      const [y0, y1] = up ? [p.t + 22 * u, p.t - 4 * u] : [p.b - 22 * u, p.b + 2 * u];
      arrow(g.ctx, p.r - 6 * u, y0, p.r - 6 * u, y1, o.hue, 0.7 * a, 1.6, 7);
      say(g, `towards ${text}`, p.r - 14 * u, (y0 + y1) / 2, 0.85 * a, 12, 'right', o.hue);
    }
  }
}
/** A voltage trace, drawn `pen` of the way along: clipped to its plot, so a spike runs off its top. */
function trace(
  g: G,
  p: Plot,
  v: Float32Array,
  pen: number,
  colour: RGB,
  a: number,
  width = 2.4,
  dash = 0
) {
  if (a < 0.01) return;
  const n = v.length - 1;
  const upto = Math.round(clamp01(pen) * n);
  const pts: [number, number][] = [];
  for (let k = 0; k <= upto; k++) pts.push([lerp(p.l, p.r, k / n), yOf(p, v[k])]);
  const { ctx } = g;
  ctx.save();
  ctx.beginPath();
  ctx.rect(p.l, p.t - 12 * g.u, p.r - p.l + 4, p.b - p.t + 14 * g.u);
  ctx.clip();
  curve(g, pts, a, colour, width, dash);
  ctx.restore();
}

/* -------------------------------------------------------------- synapses */

/** Where a synapse's parts sit: its active zone's middle at (x, y0), drawn `k` px per design px, the postsynaptic membrane's middle at `post`. */
interface Site {
  x: number;
  y0: number;
  k: number;
  post: number;
}
const siteOf = (g: G, x: number, y0: number, s: number): Site => ({
  x,
  y0,
  k: g.u * s,
  post: y0 + 50 * g.u * s,
});
/** The ionotropic receptors' places, the metabotropic receptor's and the channel it opens, design px from the middle. */
const IONO = [-64, 0, 64];
const METABO = -46;
const EFFECTOR = 64;
/** The presynaptic terminal's vesicles, design px from the active zone's middle; the docked one last. */
const VESICLES: [number, number][] = [
  [-100, -62],
  [-62, -92],
  [-22, -62],
  [24, -100],
  [62, -64],
  [104, -52],
  [-58, -32],
  [44, -30],
  [-12, -118],
];

/** The presynaptic terminal's outline: the axon arriving from above, the bouton, and its active zone flat against the cleft. */
function boutonPath(x: number, y0: number, k: number) {
  const p = new Path2D();
  p.moveTo(x - 95 * k, y0);
  p.lineTo(x + 95 * k, y0);
  p.bezierCurveTo(x + 135 * k, y0, x + 150 * k, y0 - 35 * k, x + 150 * k, y0 - 70 * k);
  p.bezierCurveTo(x + 150 * k, y0 - 115 * k, x + 90 * k, y0 - 140 * k, x + 10 * k, y0 - 146 * k);
  p.bezierCurveTo(x - 2 * k, y0 - 170 * k, x - 12 * k, y0 - 200 * k, x - 14 * k, y0 - 215 * k);
  p.lineTo(x - 46 * k, y0 - 215 * k);
  p.bezierCurveTo(x - 44 * k, y0 - 200 * k, x - 52 * k, y0 - 170 * k, x - 66 * k, y0 - 144 * k);
  p.bezierCurveTo(x - 115 * k, y0 - 135 * k, x - 150 * k, y0 - 108 * k, x - 150 * k, y0 - 70 * k);
  p.bezierCurveTo(x - 150 * k, y0 - 35 * k, x - 135 * k, y0, x - 95 * k, y0);
  p.closePath();
  return p;
}
/** A vesicle: a small sphere of membrane, full of a transmitter. */
function vesicle(g: G, x: number, y: number, r: number, hue: RGB, a: number, dense = 0) {
  if (a < 0.01) return;
  const { ctx, L } = g;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = rgba(mix(L.page, hue, 0.08 + 0.5 * dense), 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.45);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (dense) {
    disc(g, x, y, r * 0.55, hue, 0, a * 0.9);
    return;
  }
  for (let i = 0; i < 5; i++) {
    const th = (i * 2 * Math.PI) / 5 + 0.4;
    molecule(g, x + 0.45 * r * Math.cos(th), y + 0.45 * r * Math.sin(th), r * 0.2, hue, a);
  }
}
/** The presynaptic terminal: its outline, its vesicles, and its calcium channels on the active zone. */
function bouton(g: G, st: Site, hue: RGB, a: number, o: { docked?: number; tint?: number } = {}) {
  const { ctx, L } = g;
  const { x, y0, k } = st;
  ctx.globalAlpha = a;
  const path = boutonPath(x, y0, k);
  ctx.fillStyle = rgba(mix(L.page, mix(L.ink, hue, o.tint ?? 0), 0.06), 1);
  ctx.fill(path);
  ctx.strokeStyle = rgba(L.ink, 0.45);
  ctx.lineWidth = 1.5;
  ctx.stroke(path);
  ctx.globalAlpha = 1;
  VESICLES.forEach(([dx, dy]) => vesicle(g, x + dx * k, y0 + dy * k, 12 * k, hue, a));
  vesicle(g, x, y0 - 14 * k, 12 * k, hue, a * (o.docked ?? 1));
  // calcium channels either side of where vesicles dock
  for (const side of [-1, 1]) {
    ctx.globalAlpha = a;
    ctx.fillStyle = rgba(mix(L.page, L.ink, 0.3), 1);
    for (const half of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(x + side * 62 * k + half * 4 * k - 2.5 * k, y0 - 8 * k, 5 * k, 16 * k, 2 * k);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/** Where the i-th molecule of a release from (x, y0) is at cycle point c, released at c0: into the cleft, to a receptor's binding site if `to` gives one, and away. */
function released(
  st: Site,
  i: number,
  c: number,
  c0: number,
  now: number,
  to?: [number, number]
): [number, number, number] {
  const { x, y0, k } = st;
  const rnd = mulberry32(101 + i * 7);
  const [r1, r2, r3, r4] = [rnd(), rnd(), rnd(), rnd()];
  const start = c0 + 0.004 + 0.016 * r4;
  if (c < start) return [x, y0, 0];
  const q = smooth(clamp01((c - start) / 0.04));
  const [tx, ty] = to ?? [x + (r1 - 0.5) * 2 * (60 + 120 * r3) * k, y0 + (7 + r2 * 24) * k];
  const wander = to ? 0 : 1;
  const px = lerp(x + (r1 - 0.5) * 8 * k, tx, q) + wander * drift(now, r1 * 6, r2 * 6, 3 * k);
  const py = lerp(y0 + 2 * k, ty, q) + wander * drift(now, r3 * 6, r4 * 6, 2 * k);
  const fade = to
    ? 1 - clamp01((c - C_UNBIND) / 0.1)
    : 1 - clamp01((c - c0 - 0.22 - 0.12 * r2) / 0.14);
  return [
    px,
    py - (to ? 14 * k * clamp01((c - C_UNBIND) / 0.1) : 0),
    Math.min(1, (c - start) * 60) * fade,
  ];
}

/** The spike arriving down the axon, and the terminal's flash as it gets there. */
function spikeIn(g: G, st: Site, a: number, at = C_SPIKE) {
  const { x, y0, k } = st;
  const c = g.c;
  if (c > at + 0.06) return;
  const p = clamp01(c / at);
  const pts: [number, number][] = [
    [x - 30 * k, y0 - 215 * k],
    [x - 30 * k, y0 - 150 * k],
    [x, y0 - 50 * k],
  ];
  const [px, py] =
    p < 0.6
      ? pts[0].map((v, i) => lerp(v, pts[1][i], p / 0.6))
      : pts[1].map((v, i) => lerp(v, pts[2][i], (p - 0.6) / 0.4));
  glow(g, px, py, 24 * k, SPIKE, a * clamp01(c / 0.008) * (c < at ? 1 : 0));
  glow(g, x, y0 - 60 * k, 130 * k, SPIKE, a * 0.8 * bump(c, at - 0.005, at + 0.03));
}

/** Calcium flowing into the terminal through its channels as the spike arrives. */
function calciumIn(g: G, st: Site, a: number, at = C_SPIKE) {
  const { x, y0, k } = st;
  for (const side of [-1, 1])
    for (const j of [0, 1]) {
      const q = (g.c - (at - 0.01 + j * 0.015)) / 0.06;
      if (q < 0 || q > 1) continue;
      ion(
        g,
        x + side * 62 * k + (j ? 3 : -3) * k,
        lerp(y0 + 20 * k, y0 - 34 * k, q),
        'Ca',
        a * ends(q),
        5.5 * k
      );
    }
}

/** How a synapse is drawn beyond its spec: magnesium in its receptors' pores (1) or driven out into the cleft (-1); the cell inside depolarised; how far its membrane runs, design px; and whether its release is left to the slide. */
interface SynLook {
  mg?: number;
  warm?: number;
  width?: number;
  released?: boolean;
}
/** A synapse at work over one cycle: the spike arriving, calcium in, a vesicle emptying, the transmitter binding, the receptors opening and ions passing. */
function synapse(g: G, st: Site, S: Syn, run: Run, a: number, o: SynLook = {}) {
  if (a < 0.01) return;
  const { ctx, L, c, now } = g;
  const { x, y0, k, post } = st;
  const half = (o.width ?? 240) * k;
  if (o.warm) {
    ctx.globalAlpha = a * o.warm;
    const grad = ctx.createLinearGradient(0, post, 0, post + 110 * k);
    grad.addColorStop(0, rgba(WARM, 0.16));
    grad.addColorStop(1, rgba(WARM, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(x - half, post + 12 * k, 2 * half, 100 * k);
    ctx.globalAlpha = 1;
  }
  const irs = IONO.map((d) => x + d * k);
  const [mx, ex] = [x + METABO * k, x + EFFECTOR * k];
  const gaps = [...(S.iono > 0.02 ? irs : []), ...(S.metabo > 0.02 ? [mx, ex] : [])];
  membrane(g, post, x - half, x + half, a, gaps, k);
  // the postsynaptic density, under the receptors
  ctx.globalAlpha = a * 0.5;
  ctx.fillStyle = rgba(mix(L.page, L.ink, 0.12), 1);
  ctx.beginPath();
  ctx.roundRect(x - 100 * k, post + 15 * k, 200 * k, 6 * k, 3 * k);
  ctx.fill();
  ctx.globalAlpha = 1;
  const open = openAt(run, c);
  const bound = bump(c, C_BIND, C_UNBIND, 0.03);
  if (S.iono > 0.02) irs.forEach((rx) => channel(g, rx, post, k, S.hue, open, a * S.iono, bound));
  // magnesium in the pores, or pushed out of them
  if (o.mg)
    irs.forEach((rx, i) => {
      const out = o.mg! < 0;
      ion(
        g,
        rx + (out ? drift(now, i, i * 2, 5 * k) : 0),
        out ? post - 46 * k + drift(now, i * 3, i, 4 * k) : post - 3 * k,
        'Mg',
        a * S.iono,
        5.5 * k
      );
    });
  if (S.metabo > 0.02) {
    const m = a * S.metabo;
    gpcr(g, mx, post, k, S.hue, m, bound);
    channel(g, ex, post, k, IONS.K.colour, open, m);
    // the G-protein: its α subunit staying, its βγ going along the membrane to the channel, and back
    const go =
      smooth(clamp01((c - C_BIND - 0.03) / 0.09)) * (1 - smooth(clamp01((c - 0.78) / 0.12)));
    const gy = post + 30 * k;
    glow(g, mx + 2 * k, gy, 20 * k, S.hue, m * bound);
    disc(g, mx + 4 * k, gy, 8.5 * k, mix(S.hue, L.ink, 0.25), 0, m);
    const bx = lerp(mx + 14 * k, ex - 14 * k, go);
    disc(g, bx, gy + 2 * k, 6.5 * k, mix(L.page, L.ink, 0.45), 0, m);
    disc(g, bx + 7 * k, gy - 5 * k, 4.5 * k, mix(L.page, L.ink, 0.6), 0, m);
  }
  const docked = 1 - clamp01((c - C_SPIKE) / 0.015) + clamp01((c - 0.8) / 0.12);
  bouton(g, st, S.hue, a, { docked: clamp01(docked) });
  // the vesicle fused: its membrane opened into the cleft
  const fused = bump(c, C_SPIKE + 0.005, C_SPIKE + 0.1, 0.03);
  if (fused > 0.01) {
    ctx.globalAlpha = a * fused;
    ctx.strokeStyle = rgba(L.ink, 0.45);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y0, 11 * k, Math.PI, 0);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  calciumIn(g, st, a * (0.4 + 0.6 * S.calcium));
  // the transmitter: two molecules to each receptor's binding sites, the rest about the cleft
  const sites: [number, number][] =
    S.metabo > 0.5
      ? [
          [mx - 2 * k, post - 25 * k],
          [mx + 3 * k, post - 27 * k],
        ]
      : irs.flatMap((rx) =>
          [-1, 1].map((side): [number, number] => [rx + side * (7 + 4 * open) * k, post - 26 * k])
        );
  if (o.released !== false)
    for (let i = 0; i < 26; i++) {
      const [px, py, al] = released(st, i, c, C_SPIKE, now, sites[i]);
      molecule(g, px, py, 3.4 * k, S.hue, a * al);
    }
  // the ions through the open channels: in, down; potassium out, up
  const through = S.metabo > 0.5 ? [ex] : irs;
  const kinds: [IonKind, number, number][] = [
    ['Na', S.na, 1],
    ['Ca', S.ca, 1],
    ['Cl', S.cl, 1],
    ['K', S.k, -1],
  ];
  kinds.forEach(([kind, weight, dir], s) => {
    if (weight < 0.05) return;
    const times = passing(run, Math.round(9 * weight * Math.min(1, run.share * 4)), s / 4);
    times.forEach((tc, j) => {
      const q = (c - tc) / TRAVEL;
      if (q < 0 || q > 1) return;
      const rnd = mulberry32(31 * s + j);
      const rx = through[(j + s) % through.length];
      const off = (rnd() - 0.5) * 34 * k * smooth(clamp01((q - 0.4) / 0.6));
      const yy =
        dir > 0 ? lerp(post - 26 * k, post + 64 * k, q) : lerp(post + 24 * k, post - 52 * k, q);
      ion(g, rx + off, yy, kind, a * Math.min(1, 8 * q, 4 * (1 - q)), 6.2 * k);
    });
  });
  spikeIn(g, st, a);
}

/* ----------------------------------------------------------------- brain */

type P2 = [number, number];
/** A brain cut down its middle, seen from the left, its front at the left: outlines as points 1 wide. */
const CEREBRUM: P2[] = [
  [0.03, 0.43],
  [0.06, 0.26],
  [0.15, 0.12],
  [0.3, 0.04],
  [0.49, 0.01],
  [0.67, 0.04],
  [0.82, 0.13],
  [0.93, 0.28],
  [0.97, 0.43],
  [0.94, 0.53],
  [0.84, 0.57],
  [0.72, 0.55],
  [0.62, 0.55],
  [0.52, 0.6],
  [0.41, 0.62],
  [0.29, 0.6],
  [0.16, 0.56],
  [0.07, 0.51],
];
const CEREBELLUM: P2[] = [
  [0.67, 0.6],
  [0.77, 0.57],
  [0.89, 0.58],
  [0.97, 0.66],
  [0.94, 0.76],
  [0.83, 0.8],
  [0.72, 0.77],
  [0.66, 0.69],
];
const BRAINSTEM: P2[] = [
  [0.55, 0.56],
  [0.65, 0.56],
  [0.67, 0.65],
  [0.66, 0.77],
  [0.65, 0.97],
  [0.58, 0.97],
  [0.57, 0.85],
  [0.52, 0.76],
  [0.52, 0.66],
];
/** Folds: a few sulci, the corpus callosum, and the cerebellum's folia. */
const SULCI: P2[][] = [
  [
    [0.22, 0.12],
    [0.26, 0.24],
    [0.2, 0.32],
  ],
  [
    [0.38, 0.05],
    [0.37, 0.16],
    [0.31, 0.22],
  ],
  [
    [0.55, 0.03],
    [0.52, 0.14],
    [0.56, 0.22],
  ],
  [
    [0.7, 0.07],
    [0.67, 0.17],
    [0.73, 0.24],
  ],
  [
    [0.84, 0.17],
    [0.8, 0.27],
    [0.86, 0.36],
  ],
  [
    [0.1, 0.36],
    [0.17, 0.42],
    [0.15, 0.5],
  ],
  [
    [0.22, 0.4],
    [0.33, 0.25],
    [0.53, 0.2],
    [0.72, 0.27],
  ],
  [
    [0.74, 0.62],
    [0.83, 0.64],
    [0.91, 0.69],
  ],
  [
    [0.72, 0.7],
    [0.82, 0.72],
    [0.9, 0.75],
  ],
];
const CALLOSUM: P2[] = [
  [0.3, 0.4],
  [0.4, 0.31],
  [0.55, 0.29],
  [0.67, 0.33],
  [0.71, 0.4],
];
/** A smooth curve through points, closed or open, in a box `s` across at (x, y). */
function through(pts: P2[], x: number, y: number, s: number, closed: boolean) {
  const p = new Path2D();
  const n = pts.length;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  p.moveTo(x + pts[0][0] * s, y + pts[0][1] * s);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    p.bezierCurveTo(
      x + (p1[0] + (p2[0] - p0[0]) / 6) * s,
      y + (p1[1] + (p2[1] - p0[1]) / 6) * s,
      x + (p2[0] - (p3[0] - p1[0]) / 6) * s,
      y + (p2[1] - (p3[1] - p1[1]) / 6) * s,
      x + p2[0] * s,
      y + p2[1] * s
    );
  }
  if (closed) p.closePath();
  return p;
}

/** Where the modulators' axons reach: the cortex all round, and deeper places. */
const CORTEX: P2[] = [
  [0.1, 0.3],
  [0.2, 0.15],
  [0.37, 0.07],
  [0.55, 0.06],
  [0.72, 0.1],
  [0.86, 0.22],
  [0.92, 0.4],
];
const STRIATUM: P2 = [0.42, 0.43];
const ACCUMBENS: P2 = [0.36, 0.5];
const THALAMUS: P2 = [0.53, 0.44];
const HIPPOCAMPUS: P2 = [0.66, 0.47];
const CEREBELLAR: P2 = [0.84, 0.69];
const SPINAL: P2 = [0.615, 0.96];
/** The modulatory systems: each transmitter, the nucleus that makes it, and where its axons go. */
const SYSTEMS: {
  name: string;
  where: string;
  at: P2;
  hue: RGB;
  targets: P2[];
  column?: boolean;
}[] = [
  {
    name: 'acetylcholine',
    where: 'basal forebrain',
    at: [0.35, 0.565],
    hue: ACH,
    targets: [...CORTEX, HIPPOCAMPUS],
  },
  {
    name: 'dopamine',
    where: 'substantia nigra and ventral tegmental area',
    at: [0.565, 0.605],
    hue: DA,
    targets: [STRIATUM, ACCUMBENS, CORTEX[0], CORTEX[1]],
  },
  {
    name: 'noradrenaline',
    where: 'locus coeruleus',
    at: [0.635, 0.69],
    hue: NORAD,
    targets: [...CORTEX, THALAMUS, HIPPOCAMPUS, CEREBELLAR, SPINAL],
  },
  {
    name: 'serotonin',
    where: 'raphe nuclei',
    at: [0.6, 0.66],
    hue: HT,
    targets: [...CORTEX, STRIATUM, THALAMUS, HIPPOCAMPUS, CEREBELLAR, SPINAL],
    column: true,
  },
  {
    name: 'histamine',
    where: 'tuberomammillary nucleus',
    at: [0.49, 0.59],
    hue: HA,
    targets: [...CORTEX, THALAMUS],
  },
];
/** An axon's path from a nucleus to where it goes: a curve up over the brain's middle, or down the brainstem. */
function pathOf(from: P2, to: P2): [P2, P2, P2] {
  const below = to[1] > from[1] + 0.05;
  const mid: P2 = below
    ? [(from[0] + to[0]) / 2 - 0.02, (from[1] + to[1]) / 2]
    : [
        (from[0] + to[0]) / 2 + (to[0] - from[0]) * 0.1,
        Math.min(from[1], to[1]) - 0.06 - 0.15 * Math.abs(to[0] - from[0]),
      ];
  return [from, mid, to];
}
const onPath = ([p0, p1, p2]: [P2, P2, P2], t: number): P2 => [
  (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
  (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
];
/** Places inside the cerebrum, for adenosine building up everywhere. */
const SCATTER: P2[] = (() => {
  const rnd = mulberry32(17);
  const out: P2[] = [];
  const inside = (x: number, y: number) => ((x - 0.5) / 0.44) ** 2 + ((y - 0.3) / 0.28) ** 2 < 1;
  while (out.length < 46) {
    const [x, y] = [rnd(), rnd() * 0.6];
    if (inside(x, y)) out.push([x, y]);
  }
  return out;
})();

/** The brain, `s` across at (x, y): its modulatory systems by how much each `shows`, their axons carrying pulses out; adenosine, if asked, everywhere. */
function brain(g: G, x: number, y: number, s: number, a: number, shows: number[], adenosine = 0) {
  const { ctx, L, u, now } = g;
  ctx.globalAlpha = a;
  for (const [shape, tone] of [
    [BRAINSTEM, 0.1],
    [CEREBELLUM, 0.12],
    [CEREBRUM, 0.07],
  ] as const) {
    const path = through(shape, x, y, s, true);
    ctx.fillStyle = rgba(mix(L.page, L.ink, tone), 1);
    ctx.fill(path);
    ctx.strokeStyle = rgba(L.ink, 0.35);
    ctx.lineWidth = 1.3;
    ctx.stroke(path);
  }
  ctx.strokeStyle = rgba(L.ink, 0.13);
  ctx.lineWidth = 1.2;
  for (const sulcus of SULCI) ctx.stroke(through(sulcus, x, y, s, false));
  ctx.strokeStyle = rgba(mix(L.page, L.ink, 0.2), 1);
  ctx.lineWidth = 6 * (s / 330);
  ctx.lineCap = 'round';
  ctx.stroke(through(CALLOSUM, x, y, s, false));
  ctx.globalAlpha = 1;
  const at = (p: P2): P2 => [x + p[0] * s, y + p[1] * s];
  SCATTER.forEach((p, i) => {
    const [px, py] = at(p);
    molecule(g, px, py, 2.6 * u, ADO, a * adenosine * (0.55 + 0.45 * Math.sin(now / 900 + i)));
  });
  SYSTEMS.forEach((sys, i) => {
    const w = a * shows[i];
    if (w < 0.02) return;
    sys.targets.forEach((target, j) => {
      const path = pathOf(sys.at, target);
      const pts: P2[] = [];
      for (let t = 0; t <= 1; t += 0.05) pts.push(at(onPath(path, t)));
      curve(g, pts, 0.32 * w, sys.hue, 1.3);
      for (const m of [0, 0.5]) {
        const t = (now / 2600 + j * 0.29 + m) % 1;
        const [px, py] = at(onPath(path, t));
        disc(g, px, py, 2.6 * u, sys.hue, 0, w * Math.sin(Math.PI * t));
      }
    });
    const nuclei: P2[] = sys.column
      ? [0, 1, 2, 3].map((j): P2 => [sys.at[0], sys.at[1] + j * 0.07])
      : [sys.at];
    nuclei.forEach((p) => {
      const [px, py] = at(p);
      glow(g, px, py, 16 * u, sys.hue, w);
      disc(g, px, py, 5 * u, sys.hue, 0, w);
    });
  });
}

/* -------------------------------------------------------------- pictures */

/** The synapse slides' synapse: where it sits. */
const mainSite = (g: G, P: Pose) => siteOf(g, g.cx + P.syn.at * g.u, 160 * g.u, 0.9);
/** Their trace's plot. */
const mainPlot = (g: G, S: Syn): Plot => ({
  l: g.cx + 120 * g.u,
  t: 62 * g.u,
  r: g.cx + 470 * g.u,
  b: g.h - 66 * g.u,
  lo: S.lo,
  hi: S.hi,
  span: S.span,
});

const synapseScene: Draw = (g, a, P) => {
  const S = P.syn;
  const run = synRun(S);
  synapse(g, mainSite(g, P), S, run, a);
  if (S.trace < 0.01) return;
  const p = mainPlot(g, S);
  const named = { ...FAST, ...SYN[nearest(P)] };
  frame(g, p, a * S.trace, { rest: S.rest, threshold: S.spikes > 0.5, E: S.E, hue: S.hue, named });
  trace(g, p, run.v, g.pen, S.hue, a * S.trace);
};

/** The receptors slide's two synapses: one whose receptors are channels, one whose receptor opens a channel through a G-protein. */
const IONOTROPIC: Syn = { ...FAST, span: 400, lo: -78, hi: -60 };
const METABOTROPIC: Syn = { ...FAST, ...SYN.gabab, hue: ANY, span: 400, lo: -78, hi: -60 };
const FAST_C: RGB = [71, 85, 105];
const SLOW_C: RGB = [147, 51, 234];
const pairSites = (g: G): [Site, Site] => [
  siteOf(g, g.cx - 320 * g.u, 162 * g.u, 0.62),
  siteOf(g, g.cx - 64 * g.u, 162 * g.u, 0.62),
];
const pairPlot = (g: G, lo: number, hi: number, span: number): Plot => ({
  l: g.cx + 150 * g.u,
  t: 62 * g.u,
  r: g.cx + 470 * g.u,
  b: g.h - 66 * g.u,
  lo,
  hi,
  span,
});
const receptorsScene: Draw = (g, a) => {
  const [left, right] = pairSites(g);
  const fast = synRun(IONOTROPIC);
  const slow = synRun(METABOTROPIC);
  synapse(g, left, IONOTROPIC, fast, a, { width: 200 });
  synapse(g, right, METABOTROPIC, slow, a, { width: 200 });
  const p = pairPlot(g, -80, -60, 400);
  frame(g, p, a, { rest: REST });
  trace(g, p, fast.v, g.pen, FAST_C, a);
  trace(g, p, slow.v, g.pen, SLOW_C, a);
  const { u } = g;
  say(g, 'ionotropic', left.x, left.post + 58 * u, a, 15);
  say(g, 'the receptor is a channel', left.x, left.post + 78 * u, 0.8 * a, 12.5);
  say(g, 'metabotropic', right.x, right.post + 58 * u, a, 15);
  say(g, 'a G-protein opens a channel nearby', right.x, right.post + 78 * u, 0.8 * a, 12.5);
  say(g, 'fast', p.l + 50 * u, yOf(p, -63), a, 13, 'left', FAST_C);
  say(g, 'slow', p.l + 150 * u, yOf(p, -74.5), a, 13, 'left', SLOW_C);
};

const reversalScene: Draw = (g, a) => {
  const { ctx, cx, u, L } = g;
  const ax = cx - 80 * u;
  const [top, bottom] = [24 * u, g.h - 18 * u];
  const at = (v: number) => lerp(bottom, top, (v + 100) / 170);
  // above threshold, a receptor excites; below it, it inhibits
  ctx.globalAlpha = a;
  ctx.fillStyle = rgba(mix(L.page, GLU, 0.07), 1);
  ctx.fillRect(ax - 170 * u, top, 170 * u, at(THRESHOLD) - top);
  ctx.fillStyle = rgba(mix(L.page, GABA, 0.07), 1);
  ctx.fillRect(ax - 170 * u, at(THRESHOLD), 170 * u, bottom - at(THRESHOLD));
  ctx.globalAlpha = 1;
  say(g, 'reversing up here,', ax - 160 * u, top + 16 * u, 0.85 * a, 13, 'left', GLU);
  say(g, 'a receptor excites', ax - 160 * u, top + 34 * u, 0.85 * a, 13, 'left', GLU);
  say(g, 'down here, it inhibits', ax - 160 * u, bottom - 14 * u, 0.85 * a, 13, 'left', GABA);
  line(g, ax, top, ax, bottom, 0.6 * a, L.ink, 1.4);
  const marks: [number, string, RGB][] = [
    [60, "+60 mV: sodium's own reversal potential", IONS.Na.colour],
    [0, '0 mV: AMPA, NMDA and nicotinic receptors', GLU],
    [THRESHOLD, '−55 mV: threshold', L.ink],
    [REST, '−70 mV: rest', L.ink],
    [-80, '−80 mV: GABA_A and glycine receptors, Cl^{−}', GABA],
    [-97, "−97 mV: GABA_B's potassium channels, K^{+}", IONS.K.colour],
  ];
  marks.forEach(([v, text, colour]) => {
    const y = at(v);
    line(g, ax - 6 * u, y, ax + 6 * u, y, a, colour, 2);
    say(
      g,
      text,
      ax + 16 * u,
      y + (v === REST ? -7 : v === -80 ? 7 : 0) * u,
      0.9 * a,
      13,
      'left',
      colour
    );
  });
  line(g, ax - 170 * u, at(THRESHOLD), ax, at(THRESHOLD), 0.5 * a, L.ink, 1.1, 4);
  // the voltage, pulled up towards 0 mV by an excitatory receptor, then down towards −80 mV by an inhibitory one
  const up = bump(g.c, 0.12, 0.34, 0.08);
  const down = bump(g.c, 0.56, 0.78, 0.08);
  const v = REST + 9 * up - 5 * down;
  if (up > 0.02) arrow(ctx, ax - 22 * u, at(v), ax - 22 * u, at(0), GLU, a * up, 2.2, 9);
  if (down > 0.02) arrow(ctx, ax - 22 * u, at(v), ax - 22 * u, at(-80), GABA, a * down, 2.2, 9);
  glow(g, ax, at(v), 18 * u, up > down ? GLU : GABA, a * Math.max(up, down));
  disc(g, ax, at(v), 6.5 * u, L.ink, 0, a);
  say(g, 'the voltage', ax - 34 * u, at(v), 0.8 * a, 12.5, 'right');
  mathWords(ctx, 'I = g (V − E)', cx + 330 * u, g.cy, L.ink, a, 24 * g.ts, 'center', L.page);
  say(g, "each receptor's current", cx + 330 * u, g.cy + 28 * u, 0.75 * a, 12.5);
};

/** The summation slide's inputs: four EPSPs in quick succession, and an IPSP among them. */
const EPSPS: Input[] = [10, 18, 26, 34].map((at) => ({ at, g: 1.25, E: 0, rise: 0.2, decay: 1.7 }));
const IPSP: Input = { at: 20, g: 3.5, E: -80, rise: 0.2, decay: 8 };
const summationScene: Draw = (g, a) => {
  const { u, cx } = g;
  const runs = [
    remember('sum:e', () => simulate(EPSPS, 80, { spikes: true })),
    remember('sum:ei', () => simulate([...EPSPS, IPSP], 80, { spikes: true })),
  ];
  const titles = ['EPSPs adding up past threshold: a spike', 'with an IPSP among them: no spike'];
  runs.forEach((run, i) => {
    const p: Plot = {
      l: cx + (i ? 110 : -420) * u,
      t: 70 * u,
      r: cx + (i ? 470 : -60) * u,
      b: g.h - 84 * u,
      lo: -74,
      hi: -22,
      span: 80,
    };
    frame(g, p, a, { rest: REST, threshold: true });
    trace(g, p, run.v, g.pen, g.L.ink, a);
    say(g, titles[i], (p.l + p.r) / 2, 40 * u, a, 13.5);
    const ty = g.h - 40 * u;
    const marks: [number, RGB][] = [
      ...EPSPS.map((e): [number, RGB] => [e.at, GLU]),
      ...(i ? [[IPSP.at, GABA] as [number, RGB]] : []),
    ];
    marks.forEach(([at, hue]) => {
      const x = lerp(p.l, p.r, at / 80);
      line(g, x, ty - 8 * u, x, ty + 8 * u, a * (g.pen * 80 >= at ? 1 : 0.25), hue, 2.4);
    });
    say(g, 'EPSPs', p.l - 8 * u, ty, 0.7 * a, 12, 'right', GLU);
    if (i) say(g, 'IPSP', lerp(p.l, p.r, IPSP.at / 80), ty + 18 * u, 0.85 * a, 12, 'center', GABA);
    if (!i && g.pen > 0.48)
      say(g, 'a spike', lerp(p.l, p.r, 0.48), p.t + 4 * u, 0.85 * a, 12.5, 'left');
  });
};

/** The modulator slides' rows of spikes: their tops and height, design px. */
const ROWS = [86, 172, 258];
const ROW_H = 54;
const modulatorScene: Draw = (g, a, P) => {
  const { u, cx, L } = g;
  const M = P.mod;
  brain(g, cx - 470 * u, 18 * u, 300 * u, a, M.sys, M.adenosine);
  // the brain's one system picked out, named
  SYSTEMS.forEach((sys, i) => {
    const w = a * clamp01((M.sys[i] - 0.75) * 4);
    if (w < 0.02) return;
    const [nx, ny] = [cx - 470 * u + sys.at[0] * 300 * u, 18 * u + sys.at[1] * 300 * u];
    const [lx, ly] = [cx - 470 * u + 0.04 * 300 * u, g.h - 12 * u];
    line(g, nx, ny + 6 * u, nx - 20 * u, ly - 12 * u, 0.4 * w, sys.hue, 1);
    say(g, `${sys.name}: from the ${sys.where}`, lx, ly, w, 13, 'left', sys.hue);
  });
  // the same input, every time
  const [l, r] = [cx - 70 * u, cx + 470 * u];
  const tAt = (t: number) => lerp(l, r, t / 1000);
  const iy = 44 * u;
  curve(
    g,
    [
      [l, iy],
      [tAt(100), iy],
      [tAt(100), iy - 12 * u],
      [tAt(900), iy - 12 * u],
      [tAt(900), iy],
      [r, iy],
    ],
    0.7 * a,
    L.ink,
    1.6
  );
  say(g, 'the same input current, each time', l, iy - 24 * u, 0.7 * a, 12.5, 'left');
  const rows: (Row & { show: number })[] = [
    { ...BARE, show: 1, hue: mix(L.page, L.ink, 0.55) },
    ...M.rows,
  ];
  rows.forEach((row, i) => {
    const w = a * row.show;
    if (w < 0.02) return;
    const top = ROWS[i] * u;
    const v = respond(row);
    const upto = Math.round(g.pen * 1000);
    const pts: [number, number][] = [];
    let spikes = 0;
    for (let k = 0; k <= upto; k++) {
      pts.push([tAt(k), lerp(top + ROW_H * u, top, (v[k] + 75) / 105)]);
      if (v[k] >= 29) spikes++;
    }
    curve(g, pts, w, row.hue, 1.5);
    say(g, `${spikes} spike${spikes === 1 ? '' : 's'}`, r, top - 6 * u, w, 12.5, 'right', row.hue);
    if (!i) say(g, 'without', l, top - 6 * u, 0.85 * w, 12.5, 'left', row.hue);
  });
};

/** The NMDA slide: the same synapse at rest, magnesium in its receptors, and depolarised, magnesium driven out. */
const NMDA: Syn = {
  ...FAST,
  hue: GLU,
  na: 1,
  ca: 0.7,
  k: 0.3,
  g: 3,
  rise: 0.29,
  decay: 43,
  span: 300,
};
const nmdaScene: Draw = (g, a) => {
  const { u } = g;
  const [left, right] = pairSites(g);
  const atRest = synRun(NMDA, { mg: true });
  const raised = synRun(NMDA, { mg: true, hold: 30 });
  synapse(g, left, NMDA, atRest, a, { mg: 1, width: 200 });
  synapse(g, right, NMDA, raised, a, { mg: -1, warm: 1, width: 200 });
  const p = pairPlot(g, -74, -22, 300);
  frame(g, p, a, { rest: REST });
  trace(g, p, atRest.v, g.pen, ANY, a);
  trace(g, p, raised.v, g.pen, GLU, a);
  say(g, 'at rest', left.x, left.post + 58 * u, a, 15);
  say(g, 'magnesium plugs the pore', left.x, left.post + 78 * u, 0.8 * a, 12.5);
  say(g, 'depolarised', right.x, right.post + 58 * u, a, 15);
  say(g, 'magnesium is driven out', right.x, right.post + 78 * u, 0.8 * a, 12.5);
  say(g, 'at rest: next to nothing', p.l + 40 * u, yOf(p, -66), 0.9 * a, 12.5, 'left', ANY);
  say(g, 'depolarised: a large, slow EPSP', p.l + 40 * u, yOf(p, -26), 0.9 * a, 12.5, 'left', GLU);
};

/** The shunting slide's inputs: an EPSP, and GABA_A receptors reversing near rest. */
const SHUNT_E: Input = { at: 12, g: 1.4, E: 0, rise: 0.2, decay: 1.7 };
const SHUNT_I: Input = { at: 8, g: 10, E: -71, rise: 0.2, decay: 8 };
const shuntingScene: Draw = (g, a) => {
  const { ctx, cx, cy, u, L, c } = g;
  // a dendrite, an excitatory synapse and an inhibitory one beside it
  const [x0, x1, y] = [cx - 470 * u, cx - 70 * u, cy + 40 * u];
  const [xe, xi] = [cx - 390 * u, cx - 200 * u];
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(x0, y - 18 * u, x1 - x0, 36 * u, 18 * u);
  ctx.fillStyle = rgba(mix(L.page, L.ink, 0.06), 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.4);
  ctx.lineWidth = 1.3;
  ctx.stroke();
  for (const [bx, hue] of [
    [xe, GLU],
    [xi, GABA],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(bx, y - 40 * u, 30 * u, 22 * u, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(mix(L.page, hue, 0.15), 1);
    ctx.fill();
    ctx.strokeStyle = rgba(mix(L.ink, hue, 0.5), 0.6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  say(g, 'excitatory synapse', xe, y - 76 * u, 0.85 * a, 12.5, 'center', GLU);
  say(g, 'inhibitory synapse: GABA_A', xi, y - 76 * u, 0.85 * a, 12.5, 'center', GABA);
  // positive charge in at the excitatory synapse, out again through the open GABA_A channels
  for (let j = 0; j < 7; j++) {
    const q = (c - 0.12 - j * 0.025) / 0.3;
    if (q < 0 || q > 1) continue;
    const [px, py] =
      q < 0.25
        ? [xe, lerp(y - 30 * u, y, q / 0.25)]
        : q < 0.7
          ? [lerp(xe, xi, (q - 0.25) / 0.45), y]
          : [xi, lerp(y, y - 34 * u, (q - 0.7) / 0.3)];
    disc(g, px, py, 6 * u, [214, 50, 58], 1, a * ends(q));
  }
  say(g, 'current in…', xe - 36 * u, y + 34 * u, 0.75 * a, 12.5, 'center', GLU);
  say(g, '…and straight out again', xi + 40 * u, y + 34 * u, 0.75 * a, 12.5, 'center', GABA);
  const p: Plot = {
    l: cx + 40 * u,
    t: 56 * u,
    r: cx + 470 * u,
    b: g.h - 66 * u,
    lo: -72,
    hi: -61,
    span: 60,
  };
  const alone = remember('sh:e', () => simulate([SHUNT_E], 60));
  const shunt = remember('sh:i', () => simulate([SHUNT_I], 60));
  const both = remember('sh:ei', () => simulate([SHUNT_E, SHUNT_I], 60));
  frame(g, p, a, { rest: REST });
  trace(g, p, alone.v, g.pen, GLU, a * 0.7, 2, 5);
  trace(g, p, shunt.v, g.pen, GABA, a, 2);
  trace(g, p, both.v, g.pen, GLU, a, 2.6);
  const key: [string, RGB, number, number][] = [
    ['an EPSP alone', GLU, 5, 2],
    ['the EPSP with GABA_A open: smaller', GLU, 0, 2.6],
    ['GABA_A alone: the voltage barely moves', GABA, 0, 2],
  ];
  key.forEach(([text, hue, dash, width], i) => {
    const ky = g.h - (64 - 20 * i) * u;
    const kx = x0 + 10 * u;
    line(g, kx, ky, kx + 26 * u, ky, a, hue, width, dash);
    say(g, text, kx + 34 * u, ky, 0.9 * a, 12.5, 'left', hue);
  });
};

const diffuseScene: Draw = (g, a) => {
  const { u, cx, now } = g;
  // each system picked out in turn
  const turn = (now / 2800) % 5;
  const shows = SYSTEMS.map((_, i) => {
    const d = Math.min(Math.abs(turn - i), 5 - Math.abs(turn - i));
    return 0.3 + 0.7 * clamp01(1.3 - 1.6 * d);
  });
  brain(g, cx - 470 * u, 8 * u, 330 * u, a, shows);
  SYSTEMS.forEach((sys, i) => {
    const y = 60 * u + i * 52 * u;
    const lx = cx - 40 * u;
    const w = a * (0.4 + 0.6 * clamp01((shows[i] - 0.3) / 0.7));
    glow(g, lx, y, 16 * u, sys.hue, w);
    disc(g, lx, y, 6 * u, sys.hue, 0, w);
    say(g, sys.name, lx + 18 * u, y - 8 * u, w, 15, 'left', sys.hue);
    say(g, `from the ${sys.where}`, lx + 18 * u, y + 11 * u, 0.85 * w, 12.5, 'left');
  });
};

const peptidesScene: Draw = (g, a) => {
  const { ctx, u, L, c, now } = g;
  const st = siteOf(g, g.cx - 200 * u, 150 * u, 1);
  const { x, y0, k, post } = st;
  const far = [x - 230 * k, x + 230 * k];
  const near = [x - 34 * k, x + 34 * k];
  membrane(g, post, x - 300 * k, x + 300 * k, a, [...near, ...far], k);
  // one spike, then a burst: the burst's dense-core vesicle empties its peptides, which spread far
  const spikes = [0.06, ...[0, 1, 2, 3, 4, 5].map((j) => 0.44 + j * 0.018)];
  const reached = bump(c, 0.74, 0.97, 0.05);
  near.forEach((rx) =>
    channel(g, rx, post, k, ANY, 0.4 * (bump(c, 0.1, 0.2) + bump(c, 0.47, 0.58)), a, 0)
  );
  far.forEach((rx) => gpcr(g, rx, post, k, PEPTIDE, a, reached));
  far.forEach((rx) => glow(g, rx, post, 40 * k, PEPTIDE, a * reached));
  bouton(g, st, ANY, a);
  const [dx, dy] = [x + 98 * k, y0 - 84 * k];
  const fuse = smooth(clamp01((c - 0.47) / 0.07));
  const dense: [number, number][] = [
    [x - 104 * k, y0 - 96 * k],
    [x + 40 * k, y0 - 124 * k],
  ];
  dense.forEach(([vx, vy]) => vesicle(g, vx, vy, 18 * k, PEPTIDE, a, 1));
  const [fx, fy] = [lerp(dx, x + 124 * k, fuse), lerp(dy, y0 - 18 * k, fuse)];
  vesicle(
    g,
    fx,
    fy,
    18 * k,
    PEPTIDE,
    a * (1 - clamp01((c - 0.55) / 0.03)) + a * clamp01((c - 0.9) / 0.08),
    1
  );
  // the fast transmitter after each spike, near the synapse
  for (const c0 of [0.06, 0.44])
    for (let i = 0; i < 14; i++) {
      const [px, py, al] = released(st, i + 40, c, c0, now);
      molecule(g, px, py, 3.2 * k, ANY, a * al * (c0 === 0.44 ? 1 : clamp01(1 - (c - 0.3) * 5)));
    }
  // the peptides, out of the terminal's side and far along the membrane
  for (let i = 0; i < 18; i++) {
    const rnd = mulberry32(300 + i);
    const [r1, r2] = [rnd(), rnd()];
    const q = clamp01((c - 0.56) / 0.3);
    if (q <= 0) continue;
    const side = i % 2 ? 1 : -1;
    const [tx, ty] = [far[side > 0 ? 1 : 0] + (r1 - 0.5) * 90 * k, post - (16 + 22 * r2) * k];
    const px = lerp(x + 124 * k, tx, smooth(q)) + drift(now, r1 * 9, r2 * 9, 3 * k);
    const py = lerp(y0 + 4 * k, ty, smooth(q)) - 26 * k * Math.sin(Math.PI * q);
    molecule(g, px, py, 4 * k, PEPTIDE, a * Math.min(1, q * 8) * (1 - clamp01((c - 0.93) / 0.06)));
  }
  spikes.forEach((at) => spikeIn(g, st, a, at));
  // the spikes, as a timeline
  const [l, r, ty] = [g.cx + 150 * u, g.cx + 470 * u, 70 * u];
  line(g, l, ty, r, ty, 0.4 * a, L.ink, 1.2);
  spikes.forEach((at) => line(g, lerp(l, r, at), ty - 14 * u, lerp(l, r, at), ty, a, L.ink, 2));
  line(g, lerp(l, r, c), ty - 20 * u, lerp(l, r, c), ty + 6 * u, 0.6 * a, WARM, 1.5);
  say(g, 'one spike', lerp(l, r, 0.06), ty + 18 * u, 0.85 * a, 12.5);
  say(g, 'a burst', lerp(l, r, 0.49), ty + 18 * u, 0.85 * a, 12.5);
  const tl = g.cx + 150 * u;
  say(g, 'small vesicles: a fast transmitter,', tl, 140 * u, 0.9 * a, 13, 'left');
  say(g, 'released by every spike', tl, 158 * u, 0.9 * a, 13, 'left');
  say(g, 'dense-core vesicles: neuropeptides,', tl, 196 * u, 0.9 * a, 13, 'left', PEPTIDE);
  say(g, 'released by bursts, spreading far', tl, 214 * u, 0.9 * a, 13, 'left', PEPTIDE);
  say(g, 'to metabotropic receptors', tl, 232 * u, 0.9 * a, 13, 'left', PEPTIDE);
  ctx.globalAlpha = 1;
};

const endocannabinoidScene: Draw = (g, a) => {
  const { u, L, c, now } = g;
  const st = siteOf(g, g.cx - 200 * u, 150 * u, 1);
  const { x, y0, k, post } = st;
  const S: Syn = { ...FAST, hue: GLU };
  const run = synRun(S);
  // the postsynaptic cell, strongly excited
  const warm = bump(c, 0.12, 0.46, 0.06);
  synapse(g, st, S, run, a, { warm });
  // CB1 receptors on the terminal, the endocannabinoids made below crossing back up to them
  const cb1 = [x - 114 * k, x + 114 * k];
  const lit = bump(c, 0.4, 0.8, 0.05);
  cb1.forEach((rx) => gpcr(g, rx, y0 - 8 * k, k * 0.8, ECB, a, lit, true));
  for (let i = 0; i < 10; i++) {
    const rnd = mulberry32(500 + i);
    const [r1, r2] = [rnd(), rnd()];
    const q = clamp01((c - 0.22 - 0.012 * i) / 0.16);
    if (q <= 0) continue;
    const fromX = x + (i % 2 ? 1 : -1) * (40 + 70 * r1) * k;
    const toX = cb1[i % 2] + (r2 - 0.5) * 16 * k;
    const px = lerp(fromX, toX, smooth(q)) + drift(now, r1 * 7, r2 * 7, 2 * k);
    const py = lerp(post - 12 * k, y0 + 22 * k, smooth(q));
    molecule(g, px, py, 3.6 * k, ECB, a * Math.min(1, q * 6) * (1 - clamp01((c - 0.6) / 0.1)));
  }
  // the next spike's release, smaller
  for (let i = 0; i < 7; i++) {
    const [px, py, al] = released(st, i + 60, c, 0.56, now);
    molecule(g, px, py, 3.4 * k, GLU, a * al);
  }
  spikeIn(g, st, a, 0.56);
  // what happens, step by step
  const tl = g.cx + 140 * u;
  const steps: [string, number, number][] = [
    ['1  a spike releases glutamate', 0.04, 0.2],
    ['2  the postsynaptic cell is strongly excited', 0.12, 0.3],
    ['3  it makes endocannabinoids from its membrane', 0.22, 0.38],
    ['4  they cross back to CB1 receptors on the terminal', 0.3, 0.48],
    ['5  which cut its next release', 0.5, 0.8],
  ];
  steps.forEach(([text, from, to], i) => {
    const on = bump(c, from, to, 0.03);
    say(
      g,
      text,
      tl,
      70 * u + i * 34 * u,
      a * (0.4 + 0.6 * on),
      13,
      'left',
      i >= 2 && i <= 3 ? ECB : L.ink
    );
  });
};

const nitricScene: Draw = (g, a) => {
  const { ctx, cx, cy, u, L, c, now } = g;
  const [sx, sy] = [cx - 250 * u, cy + 6 * u];
  // a blood vessel below, widening as nitric oxide reaches it
  const widen = bump(c, 0.34, 0.9, 0.12);
  const [vy, vr] = [g.h - 40 * u, (15 + 4 * widen) * u];
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(cx - 470 * u, vy - vr, 600 * u, 2 * vr, vr);
  ctx.fillStyle = rgba(mix(L.page, [220, 38, 38], 0.1), 1);
  ctx.fill();
  ctx.strokeStyle = rgba(mix(L.ink, [220, 38, 38], 0.5), 0.5);
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 9; i++) {
    const bx = cx - 470 * u + ((i * 70 + now * 0.05) % 600) * u;
    disc(g, bx, vy, 6 * u, [220, 38, 38], 0, 0.7 * a);
  }
  // the neuron making it, the terminal on its dendrite, a neighbour
  const cell = (x: number, y: number, r: number) => {
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(mix(L.page, L.ink, 0.07), 1);
    ctx.fill();
    ctx.strokeStyle = rgba(L.ink, 0.45);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  line(g, sx, sy - 40 * u, sx + 30 * u, sy - 120 * u, a, mix(L.page, L.ink, 0.45), 9);
  cell(sx, sy, 42 * u);
  cell(sx + 260 * u, sy - 50 * u, 30 * u);
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.ellipse(sx + 44 * u, sy - 140 * u, 30 * u, 20 * u, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = rgba(mix(L.page, L.ink, 0.07), 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.45);
  ctx.stroke();
  ctx.globalAlpha = 1;
  glow(g, sx, sy, 50 * u, NO, a * 0.7);
  // the gas, spreading out through every membrane
  for (const c0 of [0.1, 0.45])
    for (let i = 0; i < 44; i++) {
      const q = (c - c0) / 0.5;
      if (q < 0 || q > 1) continue;
      const th = (i / 44) * Math.PI * 2 + c0 * 3;
      const r = (40 + 240 * q) * u;
      molecule(
        g,
        sx + r * Math.cos(th),
        sy + r * Math.sin(th) * 0.8,
        2.8 * u,
        NO,
        a * (1 - q) * Math.min(1, q * 10)
      );
    }
  const tl = cx + 150 * u;
  say(g, 'made on demand, by nitric oxide synthase', sx, sy + 62 * u, 0.85 * a, 12.5);
  say(g, 'a terminal', sx + 86 * u, sy - 160 * u, 0.75 * a, 12.5, 'left');
  say(g, 'a neighbouring neuron', sx + 260 * u, sy - 96 * u, 0.75 * a, 12.5);
  say(g, 'a blood vessel, widening', cx + 140 * u, vy, 0.85 * a, 12.5, 'left', [185, 28, 28]);
  say(g, 'a gas: no vesicles, no receptors', tl, 60 * u, 0.9 * a, 13.5, 'left');
  say(g, 'it passes through membranes,', tl, 92 * u, 0.85 * a, 13, 'left');
  say(g, 'every way at once', tl, 110 * u, 0.85 * a, 13, 'left');
  say(g, 'inside cells, it makes cGMP', tl, 142 * u, 0.85 * a, 13, 'left');
};

const clearingScene: Draw = (g, a) => {
  const { ctx, u, L, c, now } = g;
  const st = siteOf(g, g.cx - 180 * u, 160 * u, 0.9);
  const { x, y0, k, post } = st;
  const S: Syn = { ...FAST, hue: ANY };
  const run = synRun(S);
  // an astrocyte's process, wrapped round the synapse
  ctx.globalAlpha = a;
  const glia = new Path2D();
  glia.ellipse(x + 232 * k, y0 + 10 * k, 52 * k, 74 * k, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(mix(L.page, [132, 204, 22], 0.13), 1);
  ctx.fill(glia);
  ctx.strokeStyle = rgba(mix(L.ink, [101, 163, 13], 0.5), 0.55);
  ctx.lineWidth = 1.3;
  ctx.stroke(glia);
  ctx.globalAlpha = 1;
  synapse(g, st, S, run, a, { width: 170, released: false });
  // where each molecule goes: back into the terminal, into the astrocyte, or cut by an enzyme
  const pump: [number, number] = [x - 82 * k, y0 + 4 * k];
  const enzyme: [number, number] = [x + 26 * k, y0 + 26 * k];
  const into: [number, number] = [x + 186 * k, y0 + 14 * k];
  disc(g, pump[0], pump[1] - 4 * k, 7 * k, mix(L.page, L.ink, 0.45), 0, a);
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.arc(enzyme[0], enzyme[1], 9 * k, 0.5, Math.PI * 2 - 0.5);
  ctx.lineTo(enzyme[0], enzyme[1]);
  ctx.closePath();
  ctx.fillStyle = rgba(mix(L.page, [202, 138, 4], 0.6), 1);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 18; i++) {
    const [px, py, al] = released(st, i + 80, Math.min(c, 0.24), C_SPIKE, now);
    if (al < 0.01) continue;
    const fate = i % 3;
    const q = smooth(clamp01((c - 0.2 - 0.01 * i) / 0.22));
    const [tx, ty] = fate === 0 ? pump : fate === 1 ? enzyme : into;
    let [mx, my] = [lerp(px, tx, q), lerp(py, ty, q)];
    let fade = al;
    if (fate === 0) {
      my -= 40 * k * clamp01((c - 0.44) / 0.12);
      fade *= 1 - clamp01((c - 0.5) / 0.08);
    } else if (fate === 2) {
      mx += 30 * k * clamp01((c - 0.44) / 0.12);
      fade *= 1 - clamp01((c - 0.54) / 0.08);
    }
    if (fate === 1 && c > 0.44) {
      // split in two, the halves drifting off
      const s = clamp01((c - 0.44) / 0.14);
      for (const side of [-1, 1])
        molecule(
          g,
          mx + side * 14 * k * s,
          my + 6 * k * s,
          2.3 * k,
          ANY,
          a * al * (1 - clamp01((c - 0.6) / 0.08))
        );
      continue;
    }
    molecule(g, mx, my, 3.4 * k, ANY, a * fade);
  }
  const tl = g.cx + 140 * u;
  say(g, 'transporters pump it back', tl, 70 * u, 0.9 * a, 13.5, 'left');
  say(g, 'into the terminal: dopamine, serotonin…', tl, 88 * u, 0.75 * a, 12.5, 'left');
  say(g, 'enzymes break it down:', tl, 132 * u, 0.9 * a, 13.5, 'left');
  say(g, 'acetylcholinesterase, acetylcholine', tl, 150 * u, 0.75 * a, 12.5, 'left');
  say(g, 'glia take it up:', tl, 194 * u, 0.9 * a, 13.5, 'left', [77, 124, 15]);
  say(g, 'astrocytes, most of the glutamate', tl, 212 * u, 0.75 * a, 12.5, 'left', [77, 124, 15]);
  tag(g, 'transporter', x - 220 * k, y0 - 36 * k, pump[0] - 8 * k, pump[1] - 6 * k, a);
  tag(g, 'enzyme', x + 40 * k, post + 50 * k, enzyme[0], enzyme[1] + 10 * k, a);
  say(g, 'astrocyte', x + 232 * k, y0 + 98 * k, 0.8 * a, 12.5, 'center', [77, 124, 15]);
};

/** The summary: each transmitter, its main receptors, its electrical effect, and what it is thought to do. */
const TABLE: [string, RGB, string, string, string][] = [
  [
    'glutamate',
    GLU,
    'AMPA, NMDA, kainate; mGluRs',
    'Na^{+} and Ca^{2+} in: excites',
    'most fast signalling; learning',
  ],
  ['GABA', GABA, 'GABA_A; GABA_B', 'Cl^{−} in, K^{+} out: inhibits', 'balance, timing, rhythms'],
  ['glycine', GLY, 'glycine receptors', 'Cl^{−} in: inhibits', 'spinal reflexes, brainstem'],
  [
    'acetylcholine',
    ACH,
    'nicotinic; muscarinic',
    'excites muscle; modulates',
    'movement; attention, memory',
  ],
  ['dopamine', DA, 'D1-like; D2-like', 'modulates: D1 up, D2 down', 'reward, motivation, movement'],
  [
    'noradrenaline',
    NORAD,
    'α and β receptors',
    'modulates: mostly up',
    'arousal, attention, stress',
  ],
  [
    'serotonin',
    HT,
    'fourteen 5-HT receptors',
    'either way; 5-HT3 a channel',
    'mood, sleep, appetite',
  ],
  ['histamine', HA, 'H1 to H4', 'modulates: up', 'wakefulness'],
  ['ATP, adenosine', ADO, 'P2X, P2Y; A1, A2A', 'ATP excites; adenosine inhibits', 'sleep pressure'],
  ['neuropeptides', PEPTIDE, 'many, metabotropic', 'slow modulation', 'pain, hunger, bonds, sleep'],
  ['endocannabinoids', ECB, 'CB1', 'backwards: cut release', 'tuning synapses, appetite, pain'],
  [
    'nitric oxide',
    NO,
    'guanylyl cyclase, inside cells',
    'spreads as a gas: cGMP',
    'plasticity, blood flow',
  ],
];
const summaryScene: Draw = (g, a) => {
  const { u, cx, L } = g;
  const cols = [cx - 480 * u, cx - 320 * u, cx - 90 * u, cx + 180 * u];
  const heads = ['transmitter', 'main receptors', 'electrical effect', 'thought to'];
  const top = 48 * u;
  const step = (g.h - top - 18 * u) / (TABLE.length + 1);
  heads.forEach((h, i) => say(g, h, cols[i], top, 0.6 * a, 12, 'left'));
  line(g, cols[0], top + step * 0.55, cx + 480 * u, top + step * 0.55, 0.25 * a, L.ink, 1);
  TABLE.forEach(([name, hue, receptors, effect, does], i) => {
    const y = top + step * (i + 1);
    const on = a * clamp01((g.t - 150 * i) / 450);
    disc(g, cols[0] - 10 * u, y, 4 * u, hue, 0, on);
    say(g, name, cols[0], y, on, 13, 'left', hue);
    say(g, receptors, cols[1], y, 0.85 * on, 12.5, 'left');
    say(g, effect, cols[2], y, 0.85 * on, 12.5, 'left');
    say(g, does, cols[3], y, 0.85 * on, 12.5, 'left');
  });
};

/** The platform's synapse models, as their NEURON mechanisms set them. */
const MODELS: {
  name: string;
  rise: number;
  decay: number;
  E: number;
  span: number;
  hue: RGB;
  note: string;
}[] = [
  { name: 'AMPA', rise: 0.2, decay: 1.7, E: 0, span: 20, hue: GLU, note: '' },
  { name: 'NMDA', rise: 0.29, decay: 43, E: 0, span: 200, hue: GLU, note: '× its magnesium block' },
  { name: 'GABA_A', rise: 0.2, decay: 8, E: -80, span: 50, hue: GABA, note: '' },
  { name: 'GABA_B', rise: 3.5, decay: 260.9, E: -97, span: 1000, hue: GABA, note: '' },
];
const modelsScene: Draw = (g, a) => {
  const { u, cx, L } = g;
  const width = 214 * u;
  const gap = 28 * u;
  const x0 = cx - (2 * width + 1.5 * gap);
  MODELS.forEach((m, i) => {
    const l = x0 + i * (width + gap);
    const [t, b] = [110 * u, 244 * u];
    const shape = dual(m.rise, m.decay);
    const pts: [number, number][] = [];
    for (let k = 0; k <= Math.round(clamp01(g.t / 2400) * 200); k++)
      pts.push([lerp(l, l + width, k / 200), lerp(b, t, shape((k / 200) * m.span))]);
    line(g, l, b, l + width, b, 0.5 * a, L.ink, 1.1);
    line(g, l, t - 4 * u, l, b, 0.5 * a, L.ink, 1.1);
    curve(g, pts, a, m.hue, 2.4);
    say(g, m.name, l, 46 * u, a, 17, 'left', m.hue);
    say(g, `rises in ${m.rise} ms, decays in ${m.decay} ms`, l, 70 * u, 0.85 * a, 12, 'left');
    say(g, `reverses at ${m.E} mV ${m.note}`, l, 88 * u, 0.85 * a, 12, 'left');
    say(g, '0', l, b + 14 * u, 0.6 * a, 11.5);
    say(g, `${m.span} ms`, l + width, b + 14 * u, 0.6 * a, 11.5, 'right');
    say(g, 'g', l - 8 * u, t, 0.6 * a, 12, 'right');
  });
  mathWords(g.ctx, 'I = g(t) (V − E)', cx, g.h - 54 * u, L.ink, a, 22 * g.ts, 'center', L.page);
  say(
    g,
    'plus release that fails at random, and synapses that depress and facilitate with use',
    cx,
    g.h - 24 * u,
    0.75 * a,
    12.5
  );
};

const DRAW: Record<Scene, Draw> = {
  synapse: synapseScene,
  receptors: receptorsScene,
  reversal: reversalScene,
  summation: summationScene,
  modulator: modulatorScene,
  nmda: nmdaScene,
  shunting: shuntingScene,
  diffuse: diffuseScene,
  peptides: peptidesScene,
  endocannabinoids: endocannabinoidScene,
  nitric: nitricScene,
  clearing: clearingScene,
  summary: summaryScene,
  models: modelsScene,
};

/* ----------------------------------------------------------------- words */

/** A synapse slide's names: the transmitter in the cleft, the receptors, the ions passing, the cell, and the trace. */
function synapseWords(
  g: G,
  a: number,
  P: Pose,
  o: { transmitter: string; receptors: string; ions: string; cell?: string; title: string }
) {
  const { x, y0, k, post } = mainSite(g, P);
  const hue = P.syn.hue;
  say(g, o.transmitter, x + 160 * k, y0 + 22 * k, a, 14, 'left', hue);
  say(g, o.receptors, x, post + 84 * k, 0.9 * a, 13);
  say(g, o.ions, x + 104 * k, post + 40 * k, 0.85 * a, 12.5, 'left');
  say(
    g,
    o.cell ?? 'inside the postsynaptic neuron',
    x - 236 * k,
    post + 40 * k,
    0.6 * a,
    12,
    'left'
  );
  const p = mainPlot(g, P.syn);
  say(g, o.title, p.l, p.t - 34 * g.u, a, 14, 'left', hue);
}
/** A modulator slide's rows of spikes, named. */
function rowWords(g: G, a: number, P: Pose, names: string[]) {
  names.forEach((name, i) => {
    const row = P.mod.rows[i];
    say(g, name, g.cx - 70 * g.u, (ROWS[i + 1] - 6) * g.u, a * row.show, 12.5, 'left', row.hue);
  });
}

const WORDS: Partial<Record<Step, (g: G, a: number, P: Pose) => void>> = {
  intro: (g, a, P) => {
    const { x, y0, k, post } = mainSite(g, P);
    const lx = x + 252 * k;
    tag(g, "the presynaptic neuron's terminal", lx, y0 - 118 * k, x + 128 * k, y0 - 104 * k, a);
    tag(g, 'vesicles, full of transmitter', lx, y0 - 76 * k, x + 76 * k, y0 - 66 * k, a);
    tag(g, 'the synaptic cleft: about 20 nm', lx, y0 + 22 * k, x + 150 * k, y0 + 22 * k, a);
    tag(g, 'receptors', lx, post, x + 84 * k, post, a);
    tag(g, 'the postsynaptic neuron', lx, post + 56 * k, x + 140 * k, post + 40 * k, a);
  },
  release: (g, a, P) => {
    const { x, y0, k } = mainSite(g, P);
    const lx = x + 252 * k;
    const steps: [string, number, number][] = [
      ['1  a spike arrives', 0, C_SPIKE],
      ['2  calcium flows in', C_SPIKE - 0.01, C_SPIKE + 0.05],
      ['3  a vesicle fuses with the membrane', C_SPIKE, C_SPIKE + 0.05],
      ['4  its transmitter crosses the cleft', C_SPIKE + 0.01, C_BIND + 0.02],
      ['5  and binds receptors, which open', C_BIND, C_UNBIND],
    ];
    steps.forEach(([text, from, to], i) => {
      const on = bump(g.c, from, to, 0.02);
      say(
        g,
        text,
        lx,
        y0 - 110 * k + i * 36 * k,
        a * (0.4 + 0.6 * on),
        14,
        'left',
        i === 1 ? IONS.Ca.colour : undefined
      );
    });
  },
  glutamate: (g, a, P) =>
    synapseWords(g, a, P, {
      transmitter: 'glutamate',
      receptors: 'AMPA receptors',
      ions: 'Na^{+} in, K^{+} out',
      title: 'a fast EPSP',
    }),
  gaba: (g, a, P) =>
    synapseWords(g, a, P, {
      transmitter: 'GABA',
      receptors: 'GABA_A receptors',
      ions: 'Cl^{−} in',
      title: 'an IPSP',
    }),
  gabab: (g, a, P) => {
    const { x, k, post } = mainSite(g, P);
    synapseWords(g, a, P, {
      transmitter: 'GABA',
      receptors: '',
      ions: 'K^{+} out',
      title: 'a slow IPSP',
    });
    say(g, 'GABA_B receptor', x + METABO * k - 10 * k, post + 64 * k, 0.9 * a, 12.5, 'right');
    say(g, 'G-protein', x + 8 * k, post + 64 * k, 0.75 * a, 12.5);
    say(
      g,
      'potassium channel',
      x + EFFECTOR * k + 10 * k,
      post + 64 * k,
      0.9 * a,
      12.5,
      'left',
      IONS.K.colour
    );
  },
  glycine: (g, a, P) =>
    synapseWords(g, a, P, {
      transmitter: 'glycine',
      receptors: 'glycine receptors',
      ions: 'Cl^{−} in',
      title: 'an IPSP',
    }),
  acetylcholine: (g, a, P) =>
    synapseWords(g, a, P, {
      transmitter: 'acetylcholine',
      receptors: 'nicotinic receptors',
      ions: 'Na^{+} in, K^{+} out',
      cell: 'inside the muscle fibre',
      title: 'an end-plate potential, then the fibre fires',
    }),
  modulation: (g, a, P) =>
    rowWords(g, a, P, ['with a modulator that excites', 'with one that inhibits']),
  muscarinic: (g, a, P) =>
    rowWords(g, a, P, ['with acetylcholine at M1 receptors: the M-current closes']),
  dopamine: (g, a, P) =>
    rowWords(g, a, P, ['with dopamine at D1 receptors', 'with dopamine at D2 receptors']),
  noradrenaline: (g, a, P) =>
    rowWords(g, a, P, ['with noradrenaline at β receptors: less adaptation']),
  serotonin: (g, a, P) =>
    rowWords(g, a, P, ['with serotonin at 5-HT1A receptors', 'with serotonin at 5-HT2A receptors']),
  histamine: (g, a, P) => rowWords(g, a, P, ['with histamine at H1 receptors']),
  purines: (g, a, P) => {
    rowWords(g, a, P, ['with adenosine at A1 receptors', 'with caffeine blocking them']);
    say(
      g,
      'adenosine, building up everywhere while we are awake',
      g.cx - 470 * g.u + 12 * g.u,
      g.h - 12 * g.u,
      a,
      13,
      'left',
      ADO
    );
  },
};

const LABELS: Record<Step, string> = {
  intro:
    "A synapse: the presynaptic neuron's terminal full of vesicles of transmitter, the narrow synaptic cleft, and receptors in the postsynaptic neuron's membrane.",
  release:
    'A spike arrives at the terminal; calcium flows in through channels; a vesicle fuses with the membrane and empties its transmitter into the cleft, which binds the receptors and opens them.',
  receptors:
    'Two synapses: at one, the receptors are channels that open at once, and the voltage jumps quickly; at the other, a receptor sets off a G-protein, which opens a potassium channel nearby, and the voltage changes slowly.',
  reversal:
    "A voltage scale with each receptor's reversal potential: AMPA, NMDA and nicotinic receptors at 0 mV, above threshold, so excitatory; GABA_A and glycine at −80 mV and GABA_B at −97 mV, below it, so inhibitory. The voltage is pulled towards each in turn.",
  summation:
    'Two traces: four EPSPs in quick succession add up past threshold and the neuron spikes; with an IPSP among them, it stays below threshold.',
  modulation:
    'A brain with its modulatory systems, and three trains of spikes for the same input: without a modulator, with one that excites, giving more spikes, and with one that inhibits, giving fewer.',
  glutamate:
    'A glutamate synapse: glutamate opens AMPA receptors, sodium flows in and potassium out, and the voltage rises in a fast EPSP.',
  nmda: 'Two NMDA synapses: at rest, magnesium plugs the receptors and little happens; depolarised, magnesium is driven out, sodium and calcium flow in, and a large, slow EPSP follows.',
  gaba: 'A GABA synapse: GABA opens GABA_A receptors, chloride flows in, and the voltage dips towards −80 mV in an IPSP.',
  shunting:
    'A dendrite with an excitatory synapse and an inhibitory one beside it; the current coming in leaks straight out through the open GABA_A channels, and the EPSP shrinks, though GABA_A alone barely moves the voltage.',
  gabab:
    'A GABA_B receptor sets off a G-protein, whose subunits travel along the membrane to a potassium channel and open it; potassium flows out, and the voltage dips slowly over hundreds of milliseconds.',
  glycine:
    'A glycine synapse: glycine opens its receptors, chloride flows in, and the voltage dips in an IPSP.',
  acetylcholine:
    'A neuromuscular junction: acetylcholine opens nicotinic receptors, sodium flows in, and a large end-plate potential fires the muscle fibre.',
  muscarinic:
    "The brain with the basal forebrain's acetylcholine reaching across the cortex; with acetylcholine acting at M1 receptors, the same input gives more spikes.",
  diffuse:
    'A brain cut down the middle, its modulatory systems picked out in turn: acetylcholine from the basal forebrain, dopamine from the substantia nigra and ventral tegmental area, noradrenaline from the locus coeruleus, serotonin from the raphe nuclei, histamine from the tuberomammillary nucleus, each reaching wide areas.',
  dopamine:
    "The brain with dopamine's pathways to the striatum and prefrontal cortex; with dopamine at D1 receptors, the same input gives more spikes; at D2 receptors, fewer.",
  noradrenaline:
    "The brain with the locus coeruleus's noradrenaline reaching everywhere; with noradrenaline at β receptors, the neuron adapts less and keeps firing.",
  serotonin:
    "The brain with the raphe nuclei's serotonin reaching everywhere; with serotonin at 5-HT1A receptors, the same input gives fewer spikes; at 5-HT2A receptors, more.",
  histamine:
    "The brain with the tuberomammillary nucleus's histamine reaching the cortex; with histamine at H1 receptors, the same input gives more spikes.",
  purines:
    'The brain with adenosine building up everywhere; with adenosine at A1 receptors, the same input gives fewer spikes; with caffeine blocking them, as many as without.',
  peptides:
    "A terminal with small vesicles and large dense-core vesicles: a single spike releases only the small vesicles' fast transmitter; a burst also empties a dense-core vesicle, whose neuropeptides spread far to metabotropic receptors.",
  endocannabinoids:
    'A glutamate synapse: the strongly excited postsynaptic cell makes endocannabinoids, which cross back to CB1 receptors on the terminal, and its next release is smaller.',
  nitric:
    'A neuron making nitric oxide, which spreads through every membrane in all directions, reaching a terminal, a neighbouring neuron and a blood vessel, which widens.',
  clearing:
    'Transmitter in the cleft cleared three ways: pumped back into the terminal by transporters, broken down by an enzyme, and taken up by an astrocyte.',
  summary:
    'A table of the transmitters: glutamate, GABA, glycine, acetylcholine, dopamine, noradrenaline, serotonin, histamine, ATP and adenosine, neuropeptides, endocannabinoids and nitric oxide, with their receptors, electrical effects and what each is thought to do.',
  models:
    "The platform's synapse models: AMPA, NMDA, GABA_A and GABA_B conductances over time, with their rise and decay times and reversal potentials, and the current each makes, g(t) (V − E).",
};

export default function TransmittersFigure({
  step,
  back = false,
}: {
  step: TransmitterStep;
  back?: boolean;
}) {
  // the cycle waits for the slide's words: its clock is held while they type, unless the slide was come back to
  const held = useRef({ step: '', at: 0, back: false });
  return (
    <StepCanvas
      step={step}
      back={back}
      label={LABELS[step]}
      done={PERIOD}
      pose={(st) => poseFor(st)}
      draw={(f: Frame<TransmitterStep>, P: Pose) => {
        const h = held.current;
        if (h.step !== f.step) Object.assign(h, { step: f.step, at: 0, back: f.t >= PERIOD });
        if (!h.back && Number.isFinite(f.t) && document.querySelector('main .typing-caret'))
          h.at = f.t;
        const c = f.still ? 0.5 : cycle(f.t - h.at, PERIOD);
        const g: G = {
          ctx: f.ctx,
          L: f.look,
          w: f.w,
          h: f.h,
          cx: f.w / 2,
          cy: f.h / 2,
          u: Math.min(1, f.w / 980),
          ts: Math.max(0.72, Math.min(1, f.w / 980)),
          c,
          pen: f.still ? 1 : clamp01(c / C_PEN),
          t: Number.isFinite(f.t) ? f.t - h.at : 1e9,
          now: f.still ? 0 : f.now,
        };
        for (const scene of SCENES) if (P.show[scene] > 0.01) DRAW[scene](g, P.show[scene], P);
        for (const s of TRANSMITTER_STEPS)
          if (P.own[s] > 0.5) WORDS[s]?.(g, clamp01(2 * P.own[s] - 1), P);
        words(f.ctx, sectionOf(f.step), f.w - 14, 16, f.look.ink, 0.45, 12, 'right');
      }}
    />
  );
}
