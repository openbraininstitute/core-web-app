'use client';

/**
 * The physics course's figure: a piece of dendrite close in, as the
 * brain-modeling path draws one — its membrane, the ions either side, the
 * charge lining it and the channels through it — built up a slide at a time:
 * charge, voltage and a voltmeter; the membrane as a capacitor, and how few
 * ions its voltage takes; current through channels; diffusion, and the
 * voltage that stops it — close in on one channel, where its field lies and
 * why the crossings balance; each ion's equilibrium; the driving force; rest; the
 * membrane as a circuit and its charging; the dendrite as a cable and how far
 * a voltage spreads; voltage-gated channels, a spike, and the one equation
 * behind all of it. Plots and diagrams sit in a panel under the dendrite.
 */

import {
  clamp01,
  lerp,
  mix,
  phase,
  type RGB,
  rgba,
  smooth,
} from '@/features/learn/components/heuristics/shared';
import { mulberry32 } from '@/features/learn/lib/basics/morphologies';

import { arrow, type Look, mathWidth, mathWords, type Room, SERIF, words } from '../ui/canvas';
import StepCanvas, { type Frame } from '../ui/StepCanvas';
import {
  CABLE,
  E,
  FEW,
  G_REST,
  gateAt,
  HH,
  IONS,
  type Ion,
  KT,
  LAMBDA,
  PATCH,
  rcVoltage,
  SPIKE,
  TAU,
  UNMATCHED,
  V_REST,
} from './model';

export const PHYSICS_STEPS = [
  'zoom',
  'charge',
  'separate',
  'capacitor',
  'few',
  'neutral',
  'current',
  'conductance',
  'diffusion',
  'nernst',
  'field',
  'crossing',
  'reversal',
  'driving',
  'rest',
  'circuit',
  'rc',
  'cable',
  'length',
  'gated',
  'spike',
  'equation',
] as const;
export type PhysicsStep = (typeof PHYSICS_STEPS)[number];

/** Charge, told by colour alone, as on the brain-modeling path: positive red, negative blue. */
const POSITIVE: RGB = [214, 50, 58];
const NEGATIVE: RGB = [38, 98, 214];
const WHITE: RGB = [255, 255, 255];
/** Each ion's own colour, where they are told apart: on the voltage axis, and in the circuit. */
const OWN: Record<Ion, RGB> = { K: [124, 58, 237], Na: [234, 88, 12], Cl: [13, 148, 136] };
/** The voltage, where it is drawn: warm. */
const VOLT: RGB = [217, 119, 6];
/** An ion's radius, px, as first set down; and how far from a membrane's middle its lining sits. */
const ION_R = 5.4;
const LINING_AT = 14;
const LINING_EVERY = 46;
const CHANNEL_EVERY = 118;
/** Which ion each channel along the top membrane lets through, in turn: potassium's the most. */
const CHANNEL_KINDS: Ion[] = ['K', 'K', 'Na', 'K', 'Cl', 'K', 'K', 'Na'];
/** How many of each ion wander in each 1000 px of dendrite: inside, and outside — as many negative as positive in each,
 * for the fluids are neutral. Outside, the other negative ions are bicarbonate and the like. */
const CROWD: { ion: Ion | 'A'; sign: number; inside: number; outside: number }[] = [
  { ion: 'K', sign: 1, inside: 14, outside: 2 },
  { ion: 'Na', sign: 1, inside: 2, outside: 16 },
  { ion: 'Cl', sign: -1, inside: 2, outside: 12 },
  { ion: 'A', sign: -1, inside: 14, outside: 6 },
];

interface Pose {
  /** The dendrite: its middle and half its height, px; and its piece of membrane drawn as lipids (1) or lines (0). */
  cy: number;
  half: number;
  lipids: number;
  skin: number;
  ions: number;
  names: number;
  key: number;
  demo: number;
  /** The charge lining the membrane, and whether the inside is negative (0) or positive (1); the pull across it. */
  charge: number;
  flip: number;
  pull: number;
  meter: number;
  volts: number;
  cap: number;
  few: number;
  neutral: number;
  /** The channels in the top membrane: shown, open, potassium's alone; and how often ions cross, and which way. */
  chan: number;
  open: number;
  kOnly: number;
  flowK: number;
  flowNa: number;
  balance: number;
  /** The panel under the dendrite: its top; and each thing it can show. */
  panelTop: number;
  settle: number;
  axis: number;
  driving: number;
  weights: number;
  circuit: number;
  rc: number;
  cable: number;
  space: number;
  gates: number;
  spike: number;
  equation: number;
  /** Where the panel's moving cursor is, ms — and how much of the slide's own labels show. */
  cursor: number;
  label: number;
  /** The close-up of one potassium channel: how far the view has dived into it; its field slide's and its crossing
   * slide's own parts; and the ions other than potassium in it. */
  close: number;
  field: number;
  crossing: number;
  others: number;
}

/** Where the dendrite and the panel go: the dendrite alone in the middle; above a panel; or thin, as a cable. */
function layout(R: Room, mode: 'full' | 'panel' | 'cable' | 'gone') {
  const H = R.foot - R.top;
  if (mode === 'full')
    return { cy: R.top + H * 0.52, half: Math.max(52, Math.min(86, 0.17 * H)), panelTop: R.foot };
  if (mode === 'cable') return { cy: R.top + H * 0.22, half: 16, panelTop: R.top + H * 0.42 };
  const half = Math.max(40, Math.min(66, 0.11 * H));
  return { cy: R.top + Math.max(half + 46, H * 0.25), half, panelTop: R.top + H * 0.5 };
}

const blank = (R: Room): Pose => ({
  ...layout(R, 'full'),
  lipids: 1,
  skin: 1,
  ions: 1,
  names: 0,
  key: 0,
  demo: 0,
  charge: 0,
  flip: 0,
  pull: 0,
  meter: 0,
  volts: 0,
  cap: 0,
  few: 0,
  neutral: 0,
  chan: 0,
  open: 0,
  kOnly: 0,
  flowK: 0,
  flowNa: 0,
  balance: 0,
  settle: 0,
  axis: 0,
  driving: 0,
  weights: 0,
  circuit: 0,
  rc: 0,
  cable: 0,
  space: 0,
  gates: 0,
  spike: 0,
  equation: 0,
  cursor: 0,
  label: 0,
  close: 0,
  field: 0,
  crossing: 0,
  others: 1,
});

/** How much charge lines the membrane for a voltage: none at 0 mV, all of it at ±90. */
const liningFor = (mv: number) => clamp01(Math.abs(mv) / 90);

/** The time the RC slide's step of current runs, ms; and how long the slide takes to play it, ms per ms. */
const RC_ON = 20;
const RC_DUR = 120;
const RC_SPAN = 200;
const SPIKE_PLAY = 220;

function poseFor(step: PhysicsStep, t: number, R: Room): Pose {
  const P = blank(R);
  const still = !Number.isFinite(t);
  const shown = (from: number, dur = 600) => phase(t, from, dur);
  P.label = shown(300);
  const at = (mode: Parameters<typeof layout>[1]) => Object.assign(P, layout(R, mode));
  switch (step) {
    case 'zoom':
      P.names = shown(400);
      break;
    case 'charge':
      P.key = shown(200);
      P.demo = shown(500);
      break;
    case 'separate':
      P.charge = shown(300, 1600);
      P.pull = P.charge;
      P.meter = shown(200);
      P.volts = -70 * P.charge;
      break;
    case 'capacitor':
      P.charge = 0.78;
      P.meter = 1;
      P.volts = -70;
      P.cap = shown(300);
      break;
    case 'few':
      P.charge = 0.78;
      P.meter = 1;
      P.volts = -70;
      P.few = shown(300);
      break;
    case 'neutral':
      at('panel');
      P.charge = 0.78;
      P.volts = -70;
      P.neutral = shown(300);
      break;
    case 'current':
      P.charge = 0.78;
      P.volts = -70;
      P.chan = shown(100);
      P.open = 0.4;
      P.flowK = 0.5;
      P.flowNa = 0.5;
      break;
    case 'conductance':
      P.charge = 0.78;
      P.volts = -70;
      P.chan = 1;
      P.open = lerp(0.4, 1, shown(600, 1400));
      P.flowK = lerp(0.5, 1.5, shown(600, 1400));
      P.flowNa = P.flowK;
      break;
    case 'diffusion':
      P.chan = 1;
      P.open = 1;
      P.kOnly = 1;
      P.flowK = 1.4;
      P.balance = shown(400) * 0.5;
      break;
    case 'nernst': {
      at('panel');
      P.chan = 1;
      P.open = 1;
      P.kOnly = 1;
      P.meter = 1;
      P.settle = shown(100);
      // the voltage builds from nothing towards potassium's own as it leaves, until the two pushes balance
      const run = still ? 1e6 : Math.max(0, t - 500);
      P.cursor = run;
      P.volts = E.K * (1 - Math.exp(-run / 1600));
      P.charge = liningFor(P.volts);
      P.flowK = 1.4 * clamp01((P.volts - E.K) / -E.K);
      P.balance = 1;
      break;
    }
    case 'field':
      at('panel');
      P.close = shown(0, 1500);
      P.chan = 1;
      P.open = 1;
      P.kOnly = 1;
      P.volts = E.K;
      P.charge = liningFor(E.K);
      P.field = shown(1200);
      break;
    case 'crossing': {
      at('panel');
      P.close = 1;
      P.chan = 1;
      P.open = 1;
      P.kOnly = 1;
      P.others = 0;
      P.crossing = shown(400);
      // the voltage builds again from nothing, as potassium leaves, until as many ions cross in as out
      const run = still ? 1e6 : Math.max(0, t - 1200);
      P.cursor = run;
      P.volts = builtVolts(run);
      P.charge = liningFor(P.volts);
      break;
    }
    case 'reversal':
      at('panel');
      P.charge = liningFor(V_REST);
      P.volts = V_REST;
      P.axis = shown(200);
      break;
    case 'driving':
      at('panel');
      P.charge = liningFor(V_REST);
      P.volts = V_REST;
      P.axis = 1;
      P.driving = shown(300);
      break;
    case 'rest':
      at('panel');
      P.charge = liningFor(V_REST);
      P.volts = V_REST;
      P.meter = 1;
      P.axis = 1;
      P.weights = shown(300);
      break;
    case 'circuit':
      at('panel');
      P.charge = liningFor(V_REST);
      P.volts = V_REST;
      P.chan = 1;
      P.open = 0.5;
      P.circuit = shown(200);
      break;
    case 'rc': {
      at('panel');
      P.rc = shown(200);
      P.meter = 1;
      // the step of current, played at 1 ms of it every 20 ms of the slide, round and round
      const ms = (Math.max(0, t - 600) / 20) % (RC_SPAN + 40);
      P.cursor = still ? RC_SPAN : Math.min(RC_SPAN, ms);
      P.volts = V_REST + rcVoltage(P.cursor - RC_ON, RC_DUR);
      P.charge = liningFor(P.volts);
      break;
    }
    case 'cable':
      at('cable');
      P.lipids = 0;
      P.ions = 0;
      P.cable = shown(300);
      break;
    case 'length':
      at('cable');
      P.lipids = 0;
      P.ions = 0;
      P.cable = 1;
      P.space = shown(300);
      break;
    case 'gated':
      at('panel');
      P.chan = 1;
      P.open = 0.3;
      P.charge = liningFor(HH.rest);
      P.volts = HH.rest;
      P.gates = shown(200);
      break;
    case 'spike': {
      at('panel');
      P.chan = 1;
      P.spike = shown(200);
      P.meter = 1;
      const ms = (Math.max(0, t - 600) / SPIKE_PLAY) % 34;
      P.cursor = still ? 30 : Math.min(30, ms);
      const k = Math.min(SPIKE.t.length - 1, Math.round(P.cursor / 0.05));
      P.volts = SPIKE.v[k];
      P.charge = liningFor(P.volts);
      P.flip = P.volts > 0 ? 1 : 0;
      P.open = clamp01(SPIKE.gNa[k] / 20 + SPIKE.gK[k] / 20);
      P.flowNa = clamp01(SPIKE.gNa[k] / 25) * 3;
      P.flowK = clamp01(SPIKE.gK[k] / 25) * 3;
      break;
    }
    case 'equation':
      at('gone');
      P.skin = 0.3;
      P.ions = 0;
      P.equation = shown(200);
      break;
  }
  return P;
}

/* ---------------------------------------------------------------- the dendrite */

interface Scene {
  ctx: CanvasRenderingContext2D;
  P: Pose;
  L: Look;
  R: Room;
  x0: number;
  x1: number;
  w: number;
  now: number;
}

const ionColour = (sign: number) => (sign > 0 ? POSITIVE : NEGATIVE);

function dot(s: Scene, x: number, y: number, sign: number, alpha: number, z: number) {
  if (alpha < 0.01) return;
  const { ctx } = s;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, ION_R * z, 0, Math.PI * 2);
  ctx.fillStyle = rgba(ionColour(sign), 0.92);
  ctx.fill();
  if (z > 0.7) {
    ctx.fillStyle = rgba(WHITE, 0.95);
    ctx.font = `bold ${Math.round(ION_R * 1.7 * z)}px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sign > 0 ? '+' : '−', x, y + 0.5 * z);
  }
  ctx.globalAlpha = 1;
}

/** The channels' places along the top membrane, and whose each is. */
function channelsOf(s: Scene, z: number) {
  const out: { x: number; kind: Ion }[] = [];
  for (let j = 0, x = s.x0 + 30 * z; x < s.x1 - 12 * z; j++, x += CHANNEL_EVERY * z)
    out.push({ x, kind: CHANNEL_KINDS[j % CHANNEL_KINDS.length] });
  return out;
}

/** The potassium channel the Nernst slide watches, a little left of the middle — the one the close-up dives into. */
const watched = (s: Scene, channels: { x: number; kind: Ion }[]) =>
  channels.find((k) => k.kind === 'K' && k.x > s.x0 + (s.x1 - s.x0) * 0.38) ?? channels[0];

/** The fluid inside the dendrite: the page, faintly pink. */
const insideOf = (L: Look) => mix(L.page, [228, 86, 110], L.dark ? 0.12 : 0.07);

/** The dendrite: its inside, its membranes, its channels, the ions round it and the charge lining it. */
function drawDendrite(s: Scene) {
  const { ctx, P, L, x0, x1 } = s;
  const z = P.half / 53;
  const span = x1 - x0;
  const membranes = [P.cy - P.half, P.cy + P.half];
  ctx.globalAlpha = P.skin;
  ctx.fillStyle = rgba(insideOf(L), 1);
  ctx.fillRect(x0, P.cy - P.half, span, 2 * P.half);
  ctx.globalAlpha = 1;
  const channels = P.chan > 0.01 ? channelsOf(s, z) : [];
  const opening = (c: { kind: Ion }) => P.chan * P.open * (P.kOnly > 0.5 && c.kind !== 'K' ? 0 : 1);
  // the membranes: two layers of lipid, heads out and tails in, giving way where a channel opens — or, thin, lines
  if (P.lipids > 0.5) {
    const heads = new Path2D();
    const tails = new Path2D();
    for (const [m, y] of membranes.entries()) {
      for (let x = x0 + 3 * z; x < x1; x += 6.5 * z) {
        if (m === 0 && channels.some((c) => Math.abs(c.x - x) < 15 * z && opening(c) > 0.5))
          continue;
        for (const side of [-1, 1]) {
          heads.moveTo(x + 2.6 * z, y + side * 7 * z);
          heads.arc(x, y + side * 7 * z, 2.6 * z, 0, Math.PI * 2);
          for (const dx of [-z, z]) {
            tails.moveTo(x + dx, y + side * 4.6 * z);
            tails.lineTo(x + dx, y + side * 0.8 * z);
          }
        }
      }
    }
    ctx.globalAlpha = P.skin;
    ctx.strokeStyle = rgba(L.ink, 0.22);
    ctx.lineWidth = 0.8 * z;
    ctx.stroke(tails);
    ctx.fillStyle = rgba(mix([228, 86, 110], WHITE, L.dark ? 0.1 : 0.35), 0.9);
    ctx.fill(heads);
  } else {
    ctx.globalAlpha = P.skin;
    ctx.strokeStyle = rgba(mix([228, 86, 110], L.ink, 0.3), 0.8);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (const y of membranes) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // each channel: two halves of a protein across the membrane, a pore between them
  for (const c of channels) {
    const a = P.chan * (P.kOnly > 0.5 && c.kind !== 'K' ? 0.35 : 1);
    const gap = lerp(2.5, 7.5, opening(c));
    ctx.globalAlpha = a;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(c.x + (side * gap - 5) * z, membranes[0] - 15 * z, 10 * z, 30 * z, 4.5 * z);
      ctx.fillStyle = rgba(mix(L.ink, WHITE, L.dark ? 0.3 : 0.78), 0.95);
      ctx.fill();
      ctx.strokeStyle = rgba(c.kind === 'K' && P.kOnly > 0.5 ? OWN.K : L.ink, 0.5);
      ctx.lineWidth = 1.1 * z;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // the ions, wandering where they are: inside, and outside above and below
  const above = [s.R.top + 8, membranes[0] - 24 * z];
  const below = [membranes[1] + 24 * z, Math.min(s.R.foot - 8, P.panelTop - 10)];
  const rooms = [[membranes[0] + 24 * z, membranes[1] - 24 * z], above, below];
  const roomy = [above, below].map(([a, b]) => Math.max(0, b - a));
  const share = roomy.map((h) => h / Math.max(1, roomy[0] + roomy[1]));
  const rnd = mulberry32(31);
  const now = s.now;
  if (P.ions > 0.01) {
    for (const { sign, inside, outside } of CROWD) {
      for (const [where, per] of [
        [0, inside],
        [1, outside * share[0]],
        [2, outside * share[1]],
      ] as const) {
        const [ya, yb] = rooms[where];
        const count = Math.round((per * span) / 1000);
        for (let j = 0; j < count; j++) {
          const [bx, by, p1, p2, p3, p4] = [
            rnd(),
            rnd(),
            rnd() * 6.3,
            rnd() * 6.3,
            rnd() * 6.3,
            rnd() * 6.3,
          ];
          if (yb - ya < 8 * z) continue;
          const x =
            x0 +
            ((bx * span +
              9 * z * Math.sin(now / 1700 + p1) +
              5 * z * Math.sin(now / 610 + p2) +
              span) %
              span);
          const y =
            ya +
            4 * z +
            by * (yb - ya - 8 * z) +
            5 * z * Math.sin(now / 1300 + p3) +
            3 * z * Math.sin(now / 530 + p4);
          dot(s, x, Math.max(ya, Math.min(yb, y)), sign, P.ions, z);
        }
      }
    }
  }
  // the charge lining each membrane: pairs across it, as many as the voltage asks for — the inside's side
  // negative, or, the voltage gone positive, the other way round; and the pull between each pair
  const rank = mulberry32(77);
  const pairs: { x: number; m: number }[] = [];
  for (const [m] of membranes.entries())
    for (let x = x0 + 9 * z; x < x1; x += LINING_EVERY * z) {
      const r = rank();
      if (r < P.charge && !channels.some((c) => m === 0 && Math.abs(c.x - x) < 18 * z))
        pairs.push({ x, m });
    }
  for (const { x, m } of pairs) {
    const y = membranes[m];
    const out = m ? 1 : -1;
    const wiggle = 2 * z * Math.sin(now / 900 + x * 0.05);
    const ins = { x: x + wiggle, y: y - out * LINING_AT * z };
    const outs = { x: x - wiggle, y: y + out * LINING_AT * z };
    if (P.pull > 0.01) {
      ctx.save();
      ctx.globalAlpha = P.pull * 0.8;
      ctx.strokeStyle = rgba(L.ink, 0.55);
      ctx.setLineDash([2.5 * z, 2.5 * z]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ins.x, ins.y);
      ctx.lineTo(outs.x, outs.y);
      ctx.stroke();
      ctx.restore();
    }
    const insideSign = P.flip > 0.5 ? 1 : -1;
    dot(s, ins.x, ins.y, insideSign, 1, z);
    dot(s, outs.x, outs.y, -insideSign, 1, z);
  }
  // and ions crossing by the channels: potassium out, sodium in — as often as the pose says
  for (const c of channels) {
    const flow =
      c.kind === 'K' ? P.flowK : c.kind === 'Na' ? P.flowNa : P.kOnly > 0.5 ? 0 : P.flowNa * 0.3;
    if (flow < 0.01 || opening(c) < 0.3) continue;
    const every = 2600 / flow;
    const shift = (c.x * 7.3) % every;
    const u = ((now + shift) % every) / 1100;
    if (u > 1) continue;
    const outward =
      c.kind === 'K' || (c.kind === 'Cl' && Math.floor((now + shift) / every) % 2 === 0);
    const [ya, yb] = outward
      ? [membranes[0] + 30 * z, membranes[0] - 34 * z]
      : [membranes[0] - 34 * z, membranes[0] + 30 * z];
    const e = smooth(u);
    dot(
      s,
      c.x + 2 * z * Math.sin(u * 9),
      lerp(ya, yb, e),
      c.kind === 'Cl' ? -1 : 1,
      Math.min(1, u * 6, (1 - u) * 4),
      z
    );
  }
  // potassium's two pushes, at a channel: out, down its gradient; in, pulled by the voltage it leaves behind
  if (P.balance > 0.01) {
    const c = watched(s, channels);
    if (c) {
      const y = membranes[0];
      const diffuse = 46 * z;
      const pull = diffuse * clamp01(P.volts / E.K) * (P.settle > 0 ? 1 : 0);
      arrow(
        ctx,
        c.x - 22 * z,
        y + 18 * z,
        c.x - 22 * z,
        y + 18 * z - diffuse,
        OWN.K,
        P.balance,
        2.4,
        9
      );
      const narrow = s.w < 640;
      words(
        ctx,
        narrow ? 'out' : 'out, down its gradient',
        c.x - 30 * z,
        y - 30 * z,
        OWN.K,
        P.balance,
        12,
        'right',
        L.page
      );
      if (pull > 2) {
        arrow(
          ctx,
          c.x + 22 * z,
          y - 30 * z,
          c.x + 22 * z,
          y - 30 * z + pull,
          NEGATIVE,
          P.balance,
          2.4,
          9
        );
        words(
          ctx,
          narrow ? 'in' : 'in, pulled by the voltage',
          c.x + 30 * z,
          y - 30 * z,
          NEGATIVE,
          P.balance,
          12,
          'left',
          L.page
        );
      }
    }
  }
}

/* ---------------------------------------------------------------- the labels */

/** A soft plate of the page's colour behind some words, so that the ions wandering behind don't crowd them. */
function plate(s: Scene, x: number, y: number, w: number, h: number, alpha: number) {
  if (alpha < 0.01) return;
  const { ctx, L } = s;
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = rgba(L.page, 1);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = rgba(L.ink, 0.12);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawLabels(s: Scene, step: PhysicsStep) {
  const { ctx, P, L, w } = s;
  const z = P.half / 53;
  const top = P.cy - P.half;
  const bottom = P.cy + P.half;
  const ink = L.ink;
  // which is which
  if (P.names > 0.01) {
    words(ctx, 'outside the cell', 14, top - 32 * z, ink, 0.8 * P.names, 12.5, 'left', L.page);
    words(ctx, 'inside the dendrite', 14, P.cy, ink, 0.8 * P.names, 12.5, 'left', L.page);
    words(
      ctx,
      'the cell membrane',
      w - 14,
      top - 30 * z,
      ink,
      0.8 * P.names,
      12.5,
      'right',
      L.page
    );
  }
  // the key: what carries each charge
  if (P.key > 0.01) {
    const kx = w - 300;
    const ky = s.R.top + 22;
    const rows: [number, string, string][] = [
      [1, 'Positive ions', 'K⁺ potassium, Na⁺ sodium'],
      [-1, 'Negative ions and molecules', 'Cl⁻ chloride, A⁻ proteins'],
    ];
    rows.forEach(([sign, title, kinds], k) => {
      const y = ky + k * 40;
      dot(s, kx, y, sign, P.key, 1.2);
      words(ctx, title, kx + 16, y - 6, ink, 0.9 * P.key, 12.5, 'left', L.page);
      words(ctx, kinds, kx + 16, y + 9, ink, 0.65 * P.key, 11.5, 'left', L.page);
    });
  }
  // like charges push apart, unlike pull together
  if (P.demo > 0.01) {
    const y = s.R.top + 40;
    const pair = (cx: number, a: number, b: number, apart: boolean, name: string) => {
      dot(s, cx - 16, y, a, P.demo, 1.3);
      dot(s, cx + 16, y, b, P.demo, 1.3);
      const d = apart ? 1 : -1;
      arrow(
        ctx,
        cx - 26 * (apart ? 1 : 0.2) - (apart ? 0 : 8),
        y,
        cx - 26 - d * 18,
        y,
        L.ink,
        0.7 * P.demo,
        1.6,
        6
      );
      arrow(
        ctx,
        cx + 26 * (apart ? 1 : 0.2) + (apart ? 0 : 8),
        y,
        cx + 26 + d * 18,
        y,
        L.ink,
        0.7 * P.demo,
        1.6,
        6
      );
      words(ctx, name, cx, y + 24, ink, 0.75 * P.demo, 11.5, 'center', L.page);
    };
    pair(90, 1, 1, true, 'alike: they push apart');
    pair(260, -1, -1, true, 'alike: they push apart');
    pair(430, 1, -1, false, 'opposite: they pull together');
  }
  // the capacitor: two conductors, an insulator between
  if (P.cap > 0.01) {
    const x = w * 0.6;
    const items: [number, string, RGB][] = [
      [top - 30 * z, 'conductor: the salty fluid outside', POSITIVE],
      [top, 'insulator: the membrane, about 5 nm of lipid', ink],
      [top + 30 * z, 'conductor: the salty fluid inside', NEGATIVE],
    ];
    plate(s, x - 26, top - 30 * z - 16, 330, 60 * z + 32, P.cap);
    for (const [y, name, colour] of items) {
      ctx.globalAlpha = P.cap;
      ctx.strokeStyle = rgba(colour, 0.8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 16, y);
      ctx.lineTo(x - 6, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      words(ctx, name, x, y, ink, 0.95 * P.cap, 13, 'left');
    }
    words(
      ctx,
      'Q = C · V',
      w * 0.62,
      bottom + 30 * z,
      VOLT,
      P.cap,
      16,
      'left',
      L.page,
      'italic 600'
    );
    words(
      ctx,
      'about 1 µF of capacitance per cm² of membrane',
      w * 0.62 + 90,
      bottom + 30 * z,
      ink,
      0.7 * P.cap,
      12,
      'left',
      L.page
    );
  }
  // how few ions
  if (P.few > 0.01) {
    const x = 14;
    const y = bottom + 34 * z;
    plate(s, x - 10, y - 16, 600, 76, P.few);
    const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');
    words(
      ctx,
      `−70 mV across 1 µm² of membrane: about ${fmt(Math.round(FEW.ions / 100) * 100)} ions' worth of charge`,
      x,
      y,
      ink,
      P.few,
      13.5,
      'left',
      L.page,
      'italic 600'
    );
    words(
      ctx,
      `1 µm³ of the dendrite's inside: about ${fmt(Math.round(FEW.potassium / 1e6) * 1e6)} potassium ions`,
      x,
      y + 22,
      ink,
      0.85 * P.few,
      13,
      'left',
      L.page
    );
    words(
      ctx,
      `the voltage takes only about 1 ion in every ${fmt(Math.round(FEW.ratio / 1000) * 1000)}`,
      x,
      y + 44,
      VOLT,
      P.few,
      13,
      'left',
      L.page,
      'italic 600'
    );
  }
  // each slide's own line
  const lines: Partial<Record<PhysicsStep, string>> = {
    separate: 'charge separated across the membrane: a voltage',
    current: 'current: charge on the move, through the channels',
    conductance: 'more channels open, more current: I = g · V',
    diffusion: `potassium leaks out, down its gradient: ${IONS.K.in} mM inside, ${IONS.K.out} mM outside`,
  };
  const line = lines[step];
  if (line)
    words(ctx, line, 14, bottom + 30 * z, ink, 0.9 * P.label, 13, 'left', L.page, 'italic 600');
}

/** The voltmeter: an electrode inside, one outside, and its reading. */
function drawMeter(s: Scene) {
  const { ctx, P, L, w } = s;
  if (P.meter < 0.01) return;
  const z = P.half / 53;
  const top = P.cy - P.half;
  const bx = w - 132;
  const by = top - 66 * z - 12;
  ctx.globalAlpha = P.meter;
  // its two leads: one through the membrane into the dendrite, one in the fluid outside
  ctx.strokeStyle = rgba(L.ink, 0.6);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(bx + 30, by + 30);
  ctx.lineTo(bx + 30, P.cy);
  ctx.moveTo(bx + 90, by + 30);
  ctx.lineTo(bx + 90, top - 30 * z);
  ctx.stroke();
  for (const [x, y] of [
    [bx + 30, P.cy],
    [bx + 90, top - 30 * z],
  ])
    ctx.fillRect(x - 2, y - 2, 4, 4);
  ctx.fillStyle = rgba(L.page, 0.92);
  ctx.strokeStyle = rgba(L.ink, 0.7);
  ctx.beginPath();
  ctx.roundRect(bx, by, 120, 30, 6);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
  const v = Math.round(P.volts);
  words(
    ctx,
    `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} mV`,
    bx + 60,
    by + 15,
    VOLT,
    P.meter,
    15,
    'center',
    null,
    '600'
  );
  words(ctx, 'inside', bx + 30, P.cy + 12, L.ink, 0.6 * P.meter, 10.5, 'center', L.page);
  words(ctx, 'outside', bx + 90, top - 30 * z + 12, L.ink, 0.6 * P.meter, 10.5, 'center', L.page);
}

/* ---------------------------------------------------------------- the panel */

/** A plot's frame in the panel: its box, x and y ranges, and ticks; with what maps a value onto it. */
function plotBox(
  s: Scene,
  box: { x: number; y: number; w: number; h: number },
  xs: [number, number],
  ys: [number, number],
  alpha: number,
  xlabel: string,
  ylabel: string,
  xticks: number[],
  yticks: number[]
) {
  const { ctx, L } = s;
  const px = (v: number) => box.x + ((v - xs[0]) / (xs[1] - xs[0])) * box.w;
  const py = (v: number) => box.y + box.h - ((v - ys[0]) / (ys[1] - ys[0])) * box.h;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = rgba(L.ink, 0.25);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const v of yticks) {
    ctx.moveTo(box.x, py(v));
    ctx.lineTo(box.x + box.w, py(v));
  }
  ctx.stroke();
  ctx.strokeStyle = rgba(L.ink, 0.6);
  ctx.beginPath();
  ctx.moveTo(box.x, box.y);
  ctx.lineTo(box.x, box.y + box.h);
  ctx.lineTo(box.x + box.w, box.y + box.h);
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (const v of yticks)
    words(ctx, String(v), box.x - 6, py(v), L.ink, 0.6 * alpha, 10.5, 'right');
  for (const v of xticks)
    words(ctx, String(v), px(v), box.y + box.h + 11, L.ink, 0.6 * alpha, 10.5, 'center');
  words(ctx, xlabel, box.x + box.w / 2, box.y + box.h + 26, L.ink, 0.7 * alpha, 11.5, 'center');
  words(ctx, ylabel, box.x, box.y - 12, L.ink, 0.7 * alpha, 11.5, 'left');
  return { px, py };
}

function line(
  s: Scene,
  pts: [number, number][],
  colour: RGB,
  alpha: number,
  width = 2,
  dash: number[] = []
) {
  const { ctx } = s;
  if (alpha < 0.01 || pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = rgba(colour, 1);
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.setLineDash(dash);
  ctx.beginPath();
  pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

function drawPanel(s: Scene) {
  const { ctx, P, L, w } = s;
  const narrow = w < 640;
  const box = narrow
    ? { x: 46, y: P.panelTop + 22, w: w - 62, h: s.R.foot - P.panelTop - 70 }
    : { x: 70, y: P.panelTop + 22, w: w - 140, h: s.R.foot - P.panelTop - 70 };
  if (box.h < 40) return;
  const ink = L.ink;

  // the voltage settling where potassium's two pushes balance
  if (P.settle > 0.01) {
    const { px, py } = plotBox(
      s,
      box,
      [0, 8000],
      [-100, 10],
      P.settle,
      'time (ms, sped up)',
      'voltage (mV)',
      [],
      [-90, -60, -30, 0]
    );
    line(
      s,
      [
        [px(0), py(E.K)],
        [px(8000), py(E.K)],
      ],
      OWN.K,
      P.settle,
      1.5,
      [5, 4]
    );
    words(
      ctx,
      `potassium's equilibrium: ${E.K.toFixed(0)} mV`,
      px(8000),
      py(E.K) - 10,
      OWN.K,
      P.settle,
      12,
      'right'
    );
    const pts: [number, number][] = [];
    for (let k = 0; k <= Math.min(P.cursor, 8000); k += 40)
      pts.push([px(k), py(E.K * (1 - Math.exp(-k / 1600)))]);
    line(s, pts, VOLT, P.settle, 2.2);
  }

  // the voltage axis: each ion's equilibrium on it, and the voltage now
  if (P.axis > 0.01) {
    const y = box.y + Math.min(box.h * 0.42, 110);
    const xv = (v: number) => box.x + ((v + 110) / 200) * box.w;
    ctx.globalAlpha = P.axis;
    ctx.strokeStyle = rgba(ink, 0.6);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(xv(-110), y);
    ctx.lineTo(xv(90), y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (let v = -100; v <= 80; v += 20) {
      ctx.globalAlpha = P.axis;
      ctx.beginPath();
      ctx.moveTo(xv(v), y - 4);
      ctx.lineTo(xv(v), y + 4);
      ctx.stroke();
      ctx.globalAlpha = 1;
      words(ctx, String(v), xv(v), y + 16, ink, 0.55 * P.axis, 11, 'center');
    }
    words(ctx, 'mV', xv(90) + 10, y, ink, 0.55 * P.axis, 11.5, 'left');
    const names: Record<Ion, [string, number]> = {
      K: ['potassium', 62],
      Cl: ['chloride', 32],
      Na: ['sodium', 40],
    };
    (Object.keys(E) as Ion[]).forEach((ion) => {
      const x = xv(E[ion]);
      const [name, lift] = names[ion];
      ctx.globalAlpha = P.axis;
      ctx.strokeStyle = rgba(OWN[ion], 0.9);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y - lift + 9);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      const v = `${E[ion] > 0 ? '+' : '−'}${Math.abs(E[ion]).toFixed(0)} mV`;
      const short = { K: 'K⁺', Cl: 'Cl⁻', Na: 'Na⁺' }[ion];
      words(
        ctx,
        narrow ? `${short} ${v}` : `${name}: ${v}`,
        x,
        y - lift,
        OWN[ion],
        P.axis,
        narrow ? 12.5 : 13.5,
        'center',
        L.page,
        'italic 600'
      );
      // its conductance at rest, as a weight hanging on the axis
      if (P.weights > 0.01) {
        const r = 7 + 20 * Math.sqrt(G_REST[ion]);
        ctx.globalAlpha = P.weights;
        ctx.strokeStyle = rgba(OWN[ion], 0.7);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + 26);
        ctx.lineTo(x, y + 44);
        ctx.stroke();
        ctx.fillStyle = rgba(OWN[ion], 0.28);
        ctx.beginPath();
        ctx.arc(x, y + 44 + r, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        words(
          ctx,
          `g ${G_REST[ion] === 1 ? '1' : G_REST[ion].toFixed(2)}`,
          x,
          y + 44 + r,
          ink,
          P.weights,
          12,
          'center'
        );
      }
    });
    // the voltage now, under the axis; the driving force on each ion its distance from that ion's equilibrium
    const xn = xv(P.volts);
    ctx.globalAlpha = P.axis;
    ctx.fillStyle = rgba(VOLT, 1);
    ctx.beginPath();
    ctx.moveTo(xn, y + 2);
    ctx.lineTo(xn - 8, y + 15);
    ctx.lineTo(xn + 8, y + 15);
    ctx.fill();
    ctx.globalAlpha = 1;
    const note =
      P.weights > 0.5
        ? narrow
          ? 'rest'
          : 'rest, the weighted average'
        : narrow
          ? 'now'
          : 'the voltage now';
    words(
      ctx,
      `${note}: ${Math.round(P.volts)} mV`,
      xn + 14,
      y + 30,
      VOLT,
      P.axis,
      13.5,
      'left',
      L.page,
      'italic 600'
    );
    if (P.driving > 0.01) {
      (Object.keys(E) as Ion[]).forEach((ion, k) => {
        const yy = y + 58 + k * 22;
        arrow(ctx, xn, yy, xv(E[ion]), yy, OWN[ion], P.driving, 2, 8);
        const into = ion === 'Cl' ? E[ion] < P.volts : E[ion] > P.volts;
        const name = ion === 'Cl' ? 'chloride' : ion === 'K' ? 'potassium' : 'sodium';
        const label = `${name} flows ${into ? 'in' : 'out'}`;
        const right = Math.max(xn, xv(E[ion]));
        ctx.font = `italic 12.5px ${SERIF}`;
        const fits = right + 10 + ctx.measureText(label).width < w - 4;
        const left = Math.min(xn, xv(E[ion]));
        words(
          ctx,
          label,
          fits ? right + 10 : left - 10,
          yy,
          OWN[ion],
          P.driving,
          12.5,
          fits ? 'left' : 'right',
          L.page
        );
      });
    }
  }

  // each fluid's charge, positive and negative: equal
  if (P.neutral > 0.01) drawNeutral(s, box);

  // the patch as a circuit: the capacitor beside the channels, each a conductance and a battery
  if (P.circuit > 0.01) drawCircuit(s, box);

  // charging the patch: a step of current, and the voltage rising towards I·R — 63% of the way after τ
  if (P.rc > 0.01) {
    const strip = { ...box, h: box.h * 0.18 };
    const plot = { ...box, y: box.y + box.h * 0.3, h: box.h * 0.7 };
    const a = P.rc;
    const { px: sx, py: sy } = plotBox(
      s,
      strip,
      [0, RC_SPAN],
      [0, PATCH.i],
      a,
      '',
      'current (nA)',
      [],
      []
    );
    line(
      s,
      [
        [sx(0), sy(0)],
        [sx(RC_ON), sy(0)],
        [sx(RC_ON), sy(PATCH.i)],
        [sx(RC_ON + RC_DUR), sy(PATCH.i)],
        [sx(RC_ON + RC_DUR), sy(0)],
        [sx(RC_SPAN), sy(0)],
      ],
      ink,
      a,
      1.6
    );
    const top = PATCH.i * PATCH.r;
    const { px, py } = plotBox(
      s,
      plot,
      [0, RC_SPAN],
      [V_REST - 1, V_REST + top + 2],
      a,
      'time (ms)',
      'voltage (mV)',
      [0, 50, 100, 150, 200],
      [Math.round(V_REST), Math.round(V_REST + top)]
    );
    const pts: [number, number][] = [];
    for (let k = 0; k <= P.cursor; k += 1)
      pts.push([px(k), py(V_REST + rcVoltage(k - RC_ON, RC_DUR))]);
    line(s, pts, VOLT, a, 2.2);
    const tauX = px(RC_ON + TAU);
    line(
      s,
      [
        [tauX, py(V_REST)],
        [tauX, py(V_REST + top * (1 - Math.exp(-1)))],
      ],
      ink,
      a * 0.6,
      1,
      [3, 3]
    );
    words(
      ctx,
      `τ = R·C = ${TAU} ms: 63% of the way`,
      tauX + 6,
      py(V_REST + top * 0.4),
      ink,
      0.8 * a,
      12,
      'left',
      L.page
    );
    words(
      ctx,
      `R ${PATCH.r} MΩ · C ${PATCH.c} pF`,
      plot.x + plot.w,
      plot.y - 12,
      ink,
      0.6 * a,
      11.5,
      'right'
    );
  }

  // the dendrite as a cable: compartments in a row, current running along it and leaking out as it goes
  if (P.cable > 0.01) drawCable(s, box);
  if (P.cable * (1 - P.space) > 0.01) drawChain(s, box, P.cable * (1 - P.space));

  // the gates: how open each would end up, held at each voltage
  if (P.gates > 0.01) {
    const { px, py } = plotBox(
      s,
      box,
      [-100, 40],
      [0, 1],
      P.gates,
      'voltage (mV)',
      'open (fraction)',
      [-100, -80, -60, -40, -20, 0, 20, 40],
      [0, 0.5, 1]
    );
    const curves: [keyof ReturnType<typeof gateAt>, RGB, string, number][] = narrow
      ? [
          ['m', OWN.Na, "sodium's open (m)", -36],
          ['h', mix(OWN.Na, ink, 0.45), 'then shut (h)', -78],
          ['n', OWN.K, "potassium's (n)", 12],
        ]
      : [
          ['m', OWN.Na, "sodium's channels open (m)", -36],
          ['h', mix(OWN.Na, ink, 0.45), 'and then shut (h)', -78],
          ['n', OWN.K, "potassium's open, more slowly (n)", 12],
        ];
    curves.forEach(([g, colour, name, at]) => {
      const pts: [number, number][] = [];
      for (let v = -100; v <= 40; v += 2) pts.push([px(v), py(gateAt(v)[g])]);
      line(s, pts, colour, P.gates, 2);
      const y = py(gateAt(at)[g]) + (g === 'n' ? 14 : -10);
      const flip = narrow && g === 'n';
      words(
        ctx,
        name,
        px(at) + (flip ? -8 : 8),
        y,
        colour,
        P.gates,
        12.5,
        flip ? 'right' : 'left',
        L.page,
        'italic 600'
      );
    });
    line(
      s,
      [
        [px(HH.rest), py(0)],
        [px(HH.rest), py(1)],
      ],
      VOLT,
      P.gates * 0.7,
      1,
      [3, 3]
    );
    words(ctx, 'rest', px(HH.rest), py(1) - 10, VOLT, P.gates, 11.5, 'center');
  }

  // a spike: the voltage, and the sodium and potassium conductances under it, a cursor running along
  if (P.spike > 0.01) {
    const a = P.spike;
    const vbox = { ...box, h: box.h * 0.6 };
    const gbox = { ...box, y: box.y + box.h * 0.72, h: box.h * 0.28 };
    const { px, py } = plotBox(
      s,
      vbox,
      [0, 30],
      [-85, 50],
      a,
      '',
      'voltage (mV)',
      [],
      [-65, 0, 40]
    );
    const upTo = Math.round(P.cursor / 0.05);
    line(
      s,
      SPIKE.t.slice(0, upTo + 1).map((t, k) => [px(t), py(SPIKE.v[k])] as [number, number]),
      VOLT,
      a,
      2.2
    );
    const g = plotBox(
      s,
      gbox,
      [0, 30],
      [0, 40],
      a,
      'time (ms)',
      'conductance (mS/cm²)',
      [0, 5, 10, 15, 20, 25, 30],
      [0, 40]
    );
    line(
      s,
      SPIKE.t.slice(0, upTo + 1).map((t, k) => [g.px(t), g.py(SPIKE.gNa[k])] as [number, number]),
      OWN.Na,
      a,
      1.8
    );
    line(
      s,
      SPIKE.t.slice(0, upTo + 1).map((t, k) => [g.px(t), g.py(SPIKE.gK[k])] as [number, number]),
      OWN.K,
      a,
      1.8
    );
    words(ctx, 'sodium in', g.px(7.6), g.py(32), OWN.Na, a, 12, 'left', L.page, 'italic 600');
    words(ctx, 'potassium out', g.px(10), g.py(18), OWN.K, a, 12, 'left', L.page, 'italic 600');
    words(ctx, 'a kick of current', px(5), py(-75), ink, 0.6 * a, 11.5, 'left');
  }

  // the equation behind it all
  if (P.equation > 0.01) drawEquation(s);
}

/** Each fluid's charge as two bars, positive and negative, the same length: inside, potassium's matched mostly by
 * proteins and other large molecules that can't leave; outside, sodium's mostly by chloride. Only the thin layers of
 * charge lining the membrane are left unmatched — and why: unmatched, the potassium inside would make hundreds of volts. */
function drawNeutral(s: Scene, box: { x: number; y: number; w: number; h: number }) {
  const { ctx, P, L, w } = s;
  const a = P.neutral;
  const narrow = w < 640;
  const inside = IONS.K.in + IONS.Na.in;
  const outside = IONS.K.out + IONS.Na.out;
  const groups: [string, number, string[]][] = [
    [
      'inside the dendrite',
      inside,
      [
        `K⁺ ${IONS.K.in}, Na⁺ ${IONS.Na.in}`,
        `${narrow ? 'proteins etc.' : 'proteins and other large molecules'} ${inside - IONS.Cl.in}, Cl⁻ ${IONS.Cl.in}`,
      ],
    ],
    [
      'outside the cell',
      outside,
      [
        `Na⁺ ${IONS.Na.out}, K⁺ ${IONS.K.out}`,
        `Cl⁻ ${IONS.Cl.out}, ${narrow ? 'others' : 'bicarbonate and others'} ${outside - IONS.Cl.out}`,
      ],
    ],
  ];
  const per = Math.min(300, box.w * (narrow ? 0.3 : 0.36)) / Math.max(inside, outside);
  // on a narrow screen, tighter, and only the voltage it would take, for the words above say the rest
  const [row, group] = narrow ? [17, 56] : [19, 66];
  let y = box.y + 6;
  for (const [name, total, kinds] of groups) {
    words(ctx, `${name}: ${total} mM of each`, box.x, y, L.ink, 0.85 * a, 12.5);
    kinds.forEach((kind, k) => {
      const yy = y + 20 + row * k;
      const sign = k ? -1 : 1;
      dot(s, box.x + 6, yy, sign, a, 1);
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = rgba(ionColour(sign), 1);
      ctx.beginPath();
      ctx.roundRect(box.x + 18, yy - 6, total * per, 12, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
      words(ctx, kind, box.x + 28 + total * per, yy, L.ink, 0.75 * a, 12);
    });
    y += group;
  }
  const volts = `${Math.round(UNMATCHED / 50) * 50} V`;
  const said = narrow
    ? [`unmatched, its potassium would make ${volts}`]
    : [
        `unmatched, the potassium in a ${CABLE.d} µm dendrite would put ${volts} across its membrane`,
        'so ions move to cancel any surplus, within about a nanosecond',
      ];
  said.forEach((line, k) =>
    words(
      ctx,
      line,
      box.x,
      y + 8 + 18 * k,
      k ? L.ink : VOLT,
      (k ? 0.8 : 1) * a,
      12.5,
      'left',
      L.page,
      k ? 'italic' : 'italic 600'
    )
  );
  // the one place charge goes unmatched: the thin layers lining the membrane
  const z = P.half / 53;
  const thin = narrow
    ? 'unmatched: only the thin layers at the membrane'
    : 'unmatched: only the thin layers of charge lining the membrane';
  tag(s, thin, w - 14, P.cy - P.half - 30 * z, L.ink, 0.9 * a, 12.5, 'right');
}

/** The circuit: two rails — outside, inside — and between them the membrane's capacitance and each ion's branch. */
function drawCircuit(s: Scene, box: { x: number; y: number; w: number; h: number }) {
  const { ctx, P, L } = s;
  const a = P.circuit;
  const ink = L.ink;
  const [yTop, yBot] = [box.y + 20, box.y + box.h - 16];
  const xs = [0.12, 0.33, 0.52, 0.71, 0.9].map((f) => box.x + f * box.w);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(ink, 0.8);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(xs[0], yTop);
  ctx.lineTo(xs[4], yTop);
  ctx.moveTo(xs[0], yBot);
  ctx.lineTo(xs[4], yBot);
  ctx.stroke();
  const mid = (yTop + yBot) / 2;
  // the capacitor: two plates
  ctx.beginPath();
  ctx.moveTo(xs[0], yTop);
  ctx.lineTo(xs[0], mid - 6);
  ctx.moveTo(xs[0] - 16, mid - 6);
  ctx.lineTo(xs[0] + 16, mid - 6);
  ctx.moveTo(xs[0] - 16, mid + 6);
  ctx.lineTo(xs[0] + 16, mid + 6);
  ctx.moveTo(xs[0], mid + 6);
  ctx.lineTo(xs[0], yBot);
  ctx.stroke();
  // each ion's branch: a resistor (its conductance), and a battery (its equilibrium potential)
  const branch = (x: number, colour: RGB) => {
    ctx.strokeStyle = rgba(colour, 0.95);
    ctx.beginPath();
    ctx.moveTo(x, yTop);
    ctx.lineTo(x, mid - 34);
    for (let k = 0; k < 6; k++) ctx.lineTo(x + (k % 2 ? -7 : 7), mid - 30 + k * 6);
    ctx.lineTo(x, mid + 6);
    ctx.lineTo(x, mid + 12);
    ctx.moveTo(x - 14, mid + 12);
    ctx.lineTo(x + 14, mid + 12);
    ctx.moveTo(x - 7, mid + 18);
    ctx.lineTo(x + 7, mid + 18);
    ctx.moveTo(x, mid + 18);
    ctx.lineTo(x, yBot);
    ctx.stroke();
  };
  branch(xs[1], OWN.K);
  branch(xs[2], OWN.Na);
  branch(xs[3], OWN.Cl);
  // an electrode's current, injected
  ctx.strokeStyle = rgba(VOLT, 0.95);
  ctx.beginPath();
  ctx.moveTo(xs[4], yTop);
  ctx.lineTo(xs[4], mid - 14);
  ctx.moveTo(xs[4] + 14, mid);
  ctx.arc(xs[4], mid, 14, 0, Math.PI * 2);
  ctx.moveTo(xs[4], mid + 14);
  ctx.lineTo(xs[4], yBot);
  ctx.stroke();
  ctx.restore();
  arrow(ctx, xs[4], mid + 8, xs[4], mid - 8, VOLT, a, 1.6, 6);
  words(ctx, 'outside', box.x, yTop, ink, 0.7 * a, 12, 'right');
  words(ctx, 'inside', box.x, yBot, ink, 0.7 * a, 12, 'right');
  // on a narrow screen, the branches too close for their equilibria: those are on the slides before
  const narrow = s.w < 640;
  const label = (x: number, colour: RGB, top: string, bottom: string) => {
    mathWords(
      ctx,
      top,
      x + (narrow ? 10 : 18),
      mid - 18,
      colour,
      a,
      15,
      'left',
      L.page,
      'italic 600'
    );
    if (!narrow) mathWords(ctx, bottom, x + 18, mid + 16, colour, 0.85 * a, 12.5, 'left', L.page);
  };
  label(xs[0], ink, 'C', 'the membrane');
  label(xs[1], OWN.K, 'g_K', `E_K ${E.K.toFixed(0)} mV`);
  label(xs[2], OWN.Na, 'g_{Na}', `E_{Na} +${E.Na.toFixed(0)} mV`);
  label(xs[3], OWN.Cl, 'g_{Cl}', `E_{Cl} ${E.Cl.toFixed(0)} mV`);
  label(xs[4], VOLT, 'I', 'an electrode');
}

/** The cable: a row of compartments, current running along it from an electrode at its left and leaking out. */
function drawCable(s: Scene, box: { x: number; y: number; w: number; h: number }) {
  const { ctx, P, L, x0, x1 } = s;
  const a = P.cable;
  const top = P.cy - P.half;
  const bottom = P.cy + P.half;
  const start = Math.max(x0, 60);
  const end = Math.min(x1, s.w + 40);
  const reach = 2.6 * LAMBDA; // µm shown along it
  const xOf = (um: number) => start + (um / reach) * (end - start);
  // its voltage along it, as colour: warm where it is raised, fading with distance
  for (let x = start; x < end; x += 3) {
    const um = ((x - start) / (end - start)) * reach;
    const lift = Math.exp(-um / LAMBDA);
    ctx.globalAlpha = a * (0.15 + 0.85 * P.space) * lift;
    ctx.fillStyle = rgba(VOLT, 0.55);
    ctx.fillRect(x, top + 1, 3, bottom - top - 2);
  }
  ctx.globalAlpha = 1;
  // compartments
  ctx.globalAlpha = a * 0.55;
  ctx.strokeStyle = rgba(L.ink, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  const each = 120;
  for (let um = each; um < reach; um += each) {
    ctx.moveTo(xOf(um), top);
    ctx.lineTo(xOf(um), bottom);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  // the electrode at its start, current along it, and out through the membrane
  arrow(ctx, start - 30, top - 36, start + 6, P.cy - 4, VOLT, a, 1.8, 7);
  words(ctx, 'an electrode', start - 34, top - 44, VOLT, a, 12, 'left', L.page, 'italic 600');
  for (let um = 60; um < reach; um += each) {
    const lift = Math.exp(-um / LAMBDA);
    const x = xOf(um);
    arrow(
      ctx,
      x - 18 * lift,
      P.cy,
      x + 18 * lift,
      P.cy,
      L.ink,
      a * (0.3 + 0.7 * lift),
      1.4,
      5 + 3 * lift
    );
    arrow(
      ctx,
      x,
      top - 2,
      x,
      top - 6 - 16 * lift,
      L.ink,
      a * (0.2 + 0.6 * lift),
      1.2,
      4 + 2 * lift
    );
  }
  words(
    ctx,
    'along the dendrite',
    xOf(LAMBDA * 0.25),
    bottom + 16,
    L.ink,
    0.75 * a,
    12,
    'left',
    L.page
  );
  words(
    ctx,
    'and out through the membrane',
    xOf(LAMBDA * 1.1),
    top - 26,
    L.ink,
    0.75 * a,
    12,
    'left',
    L.page
  );
  // and, its voltage plotted along it
  if (P.space > 0.01) {
    const { px, py } = plotBox(
      s,
      box,
      [0, reach],
      [0, 1.05],
      P.space,
      'distance along the dendrite (µm)',
      'voltage, of what it is at the electrode',
      [0, 500, 1000, 1500, 2000],
      [0, 0.37, 1]
    );
    const pts: [number, number][] = [];
    for (let um = 0; um <= reach; um += 10) pts.push([px(um), py(Math.exp(-um / LAMBDA))]);
    line(s, pts, VOLT, P.space, 2.2);
    line(
      s,
      [
        [px(LAMBDA), py(0)],
        [px(LAMBDA), py(Math.exp(-1))],
      ],
      L.ink,
      P.space * 0.6,
      1,
      [3, 3]
    );
    words(
      s.ctx,
      `λ ≈ ${Math.round(LAMBDA / 10) * 10} µm: 37% left`,
      px(LAMBDA) + 8,
      py(0.5),
      L.ink,
      0.85 * P.space,
      12.5,
      'left',
      L.page
    );
    if (s.w >= 640)
      mathWords(
        s.ctx,
        'for a 2 µm dendrite: λ = √(R_m · d / 4R_i)',
        px(reach),
        py(1) - 14,
        L.ink,
        0.6 * P.space,
        11.5,
        'right'
      );
  }
}

/** The cable as circuits: compartments, each the membrane's capacitor and conductance, joined through the fluid inside. */
function drawChain(s: Scene, box: { x: number; y: number; w: number; h: number }, a: number) {
  const { ctx, L } = s;
  const ink = L.ink;
  const n = 5;
  const [yTop, yBot] = [box.y + 26, box.y + Math.min(box.h - 30, 170)];
  const mid = (yTop + yBot) / 2;
  const each = box.w / n;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(ink, 0.8);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // the outside: one rail
  ctx.moveTo(box.x, yTop);
  ctx.lineTo(box.x + box.w, yTop);
  for (let k = 0; k < n; k++) {
    const x = box.x + each * (k + 0.5);
    // the membrane here: a capacitor and a conductance side by side
    for (const [dx, cap] of [
      [-14, true],
      [14, false],
    ] as const) {
      ctx.moveTo(x + dx, yTop);
      if (cap) {
        ctx.lineTo(x + dx, mid - 5);
        ctx.moveTo(x + dx - 10, mid - 5);
        ctx.lineTo(x + dx + 10, mid - 5);
        ctx.moveTo(x + dx - 10, mid + 5);
        ctx.lineTo(x + dx + 10, mid + 5);
        ctx.moveTo(x + dx, mid + 5);
      } else {
        ctx.lineTo(x + dx, mid - 18);
        for (let j = 0; j < 6; j++) ctx.lineTo(x + dx + (j % 2 ? -6 : 6), mid - 14 + j * 5);
        ctx.lineTo(x + dx, mid + 18);
      }
      ctx.lineTo(x + dx, yBot);
    }
    ctx.moveTo(x - 14, yBot);
    ctx.lineTo(x + 14, yBot);
    // and, to the next, the fluid inside: a resistor along the inside
    if (k < n - 1) {
      const [xa, xb] = [x + 14, x + each - 14];
      ctx.moveTo(xa, yBot);
      ctx.lineTo(xa + (xb - xa) * 0.3, yBot);
      for (let j = 0; j < 6; j++)
        ctx.lineTo(xa + (xb - xa) * (0.3 + 0.4 * ((j + 1) / 6)), yBot + (j % 2 ? -6 : 6));
      ctx.lineTo(xb, yBot);
    }
  }
  ctx.stroke();
  ctx.restore();
  words(ctx, 'outside', box.x - 8, yTop, ink, 0.7 * a, 12, 'right');
  words(ctx, 'inside', box.x - 8, yBot, ink, 0.7 * a, 12, 'right');
  words(
    ctx,
    "each compartment: the membrane's capacitor and conductance",
    box.x + each * 0.5 - 14,
    yTop - 14,
    ink,
    0.85 * a,
    12.5,
    'left',
    L.page
  );
  words(
    ctx,
    'joined through the fluid inside: the axial resistance',
    box.x + each * 1.5,
    yBot + 26,
    ink,
    0.85 * a,
    12.5,
    'left',
    L.page
  );
}

/** The membrane equation, its terms named under it: in one row, or on a narrow screen two. */
function drawEquation(s: Scene) {
  const { ctx, P, L, w } = s;
  const a = P.equation;
  const narrow = w < 640;
  const y = s.R.top + (s.R.foot - s.R.top) * (narrow ? 0.5 : 0.62);
  const terms: [string, RGB, string][] = [
    ['C dV/dt', VOLT, 'charging the membrane'],
    ['= − g_K (V − E_K)', OWN.K, 'potassium'],
    ['− g_{Na} (V − E_{Na})', OWN.Na, 'sodium'],
    ['− g_L (V − E_L)', OWN.Cl, 'leak'],
    ['+ I_{axial}', L.ink, 'from its neighbours'],
    ['+ I_{inj}', L.ink, 'from an electrode'],
  ];
  const rows = narrow ? [terms.slice(0, 3), terms.slice(3)] : [terms];
  const size = narrow ? 19 : 27;
  rows.forEach((row, r) => {
    const yy = y + r * 86 - (rows.length - 1) * 43;
    ctx.font = `italic 13px ${SERIF}`;
    const widths = row.map(
      ([t, , name]) => Math.max(mathWidth(ctx, t, size), ctx.measureText(name).width) + 20
    );
    const total = widths.reduce((x, y) => x + y, 0);
    const scale = Math.min(1, (w - 20) / total);
    let x = (w - total * scale) / 2;
    row.forEach(([t, colour, name], k) => {
      const cx = x + (widths[k] * scale) / 2;
      mathWords(ctx, t, cx, yy, colour, a, size * scale, 'center', L.page);
      ctx.globalAlpha = a * 0.6;
      ctx.fillStyle = rgba(colour, 1);
      ctx.fillRect(x + 10 * scale, yy + size * 0.9, widths[k] * scale - 20 * scale, 2);
      ctx.globalAlpha = 1;
      words(
        ctx,
        name,
        cx,
        yy + size * 0.9 + 16,
        L.ink,
        0.85 * a,
        13 * Math.max(0.8, scale),
        'center',
        L.page
      );
      x += widths[k] * scale;
    });
  });
  const said = narrow
    ? ['one for every compartment: dendrites, soma', 'and axon, each coupled to its neighbours']
    : ['one for every compartment: dendrites, soma and axon, each coupled to its neighbours'];
  said.forEach((line, k) =>
    words(
      ctx,
      line,
      w / 2,
      y + (narrow ? 96 : 90) + k * 18,
      L.ink,
      0.85 * a,
      narrow ? 13 : 14,
      'center',
      L.page
    )
  );
}

/* ---------------------------------------------------------------- the close-up */

/** How much closer the close-up is than the dendrite; and how big its ions are drawn, for they don't grow by all of it. */
const CLOSE_ZOOM = 4.2;
const CLOSE_ION = 1.5;
/** How long the crossing slide's voltage takes to build up again, ms; how often an ion tries each channel from inside,
 * ms; and how long the field slide's ion takes to cross, ms. */
const BUILD = 7000;
const TRY_EVERY = 450;
const PROBE = 4200;

/** The voltage on the crossing slide, `run` ms into building up again from nothing: fast at first, then settling. */
const builtVolts = (run: number) => E.K * (1 - (1 - clamp01(run / BUILD)) ** 3);

/** A voltage as the figure writes it: −89 mV. */
const mvText = (v: number) => {
  const r = Math.round(v);
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)} mV`;
};

/** The close-up of the membrane at the channel the Nernst slide watched: its scale, its middle and faces, its channels. */
function closeOf(s: Scene) {
  const { P, R, w } = s;
  const narrow = w < 640;
  const z = (P.half / 53) * CLOSE_ZOOM;
  return {
    z,
    narrow,
    ym: R.top + (R.foot - R.top) * (narrow ? 0.34 : 0.46),
    face: 9.6 * z,
    xs: narrow ? [w * 0.3] : [w * 0.3, w * 0.06],
  };
}
type Close = ReturnType<typeof closeOf>;

/** The dive from the dendrite into the close-up: the point the view centres on, how big each is drawn, and how far the
 * close-up has covered the dendrite. */
function cameraOf(s: Scene, C: Close) {
  const { P } = s;
  const from = { x: watched(s, channelsOf(s, P.half / 53))?.x ?? s.w / 2, y: P.cy - P.half };
  const to = { x: C.xs[0], y: C.ym };
  const u = P.close;
  return {
    from,
    to,
    at: { x: lerp(from.x, to.x, u), y: lerp(from.y, to.y, u) },
    dendrite: CLOSE_ZOOM ** u,
    close: CLOSE_ZOOM ** (u - 1),
    cover: smooth(clamp01((u - 0.4) / 0.45)),
  };
}
type Camera = ReturnType<typeof cameraOf>;

/** Draws what follows as the camera sees it: `k` times as big about `origin`, which lands where the view is centred. */
function aim(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  k: number,
  origin: { x: number; y: number }
) {
  ctx.translate(cam.at.x, cam.at.y);
  ctx.scale(k, k);
  ctx.translate(-origin.x, -origin.y);
}

/** Words on a plate of their own, so that the ions wandering behind don't crowd them. */
function tag(
  s: Scene,
  text: string,
  x: number,
  y: number,
  colour: RGB,
  alpha: number,
  size: number,
  align: 'left' | 'right' = 'left',
  style = 'italic'
) {
  if (alpha < 0.01) return;
  s.ctx.font = `${style} ${size}px ${SERIF}`;
  const width = s.ctx.measureText(text).width;
  const left = align === 'left' ? x : x - width;
  plate(s, left - 7, y - size * 0.6 - 5, width + 14, size * 1.2 + 10, alpha);
  words(s.ctx, text, x, y, colour, alpha, size, align, null, style);
}

/** The close-up: the fluid either side, the membrane and its channels, the charge lining it and the field within it;
 * then the slide's own — an ion pushed as it crosses, or ions trying the channels — and its labels and plate. */
function drawClose(s: Scene, C: Close, cam: Camera) {
  const { ctx, P, L, R, now } = s;
  const a = cam.cover;
  if (a < 0.01) return;
  const { z, ym, face, xs } = C;
  const r = ION_R * CLOSE_ION;
  // the fluid: outside above the membrane, inside below it, wherever the dive has got to
  ctx.globalAlpha = a;
  ctx.fillStyle = rgba(L.page, 1);
  ctx.fillRect(s.x0, R.top - 40, s.x1 - s.x0, cam.at.y - R.top + 40);
  ctx.fillStyle = rgba(insideOf(L), 1);
  ctx.fillRect(s.x0, cam.at.y, s.x1 - s.x0, R.foot + 40 - cam.at.y);
  ctx.globalAlpha = 1;
  ctx.save();
  aim(ctx, cam, cam.close, cam.to);
  // as much of the membrane as is in view, in the close-up's own terms
  const X0 = cam.to.x + (s.x0 - cam.at.x) / cam.close - 20;
  const X1 = cam.to.x + (s.x1 - cam.at.x) / cam.close + 20;
  const step = 6.5 * z;
  const first = Math.ceil((X0 - xs[0]) / step);
  const field = clamp01(P.volts / E.K);
  // the field fills the membrane between its two sheets of charge, and nowhere else
  ctx.globalAlpha = a * field * 0.12;
  ctx.fillStyle = rgba(VOLT, 1);
  ctx.fillRect(X0, ym - 7 * z, X1 - X0, 14 * z);
  // the lipids, giving way at each channel
  const heads = new Path2D();
  const tails = new Path2D();
  for (let j = first; xs[0] + j * step < X1; j++) {
    const x = xs[0] + j * step;
    if (xs.some((c) => Math.abs(c - x) < 15 * z)) continue;
    for (const side of [-1, 1]) {
      heads.moveTo(x + 2.6 * z, ym + side * 7 * z);
      heads.arc(x, ym + side * 7 * z, 2.6 * z, 0, Math.PI * 2);
      for (const dx of [-z, z]) {
        tails.moveTo(x + dx, ym + side * 4.6 * z);
        tails.lineTo(x + dx, ym + side * 0.8 * z);
      }
    }
  }
  ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(L.ink, 0.22);
  ctx.lineWidth = 0.45 * z;
  ctx.stroke(tails);
  ctx.fillStyle = rgba(mix([228, 86, 110], WHITE, L.dark ? 0.1 : 0.35), 0.9);
  ctx.fill(heads);
  // its arrows, from the positive sheet outside to the negative one inside
  for (let j = Math.floor(first / 3); xs[0] + (3 * j + 1.5) * step < X1; j++) {
    const x = xs[0] + (3 * j + 1.5) * step;
    if (xs.some((c) => Math.abs(c - x) < 20 * z)) continue;
    arrow(ctx, x, ym - 4.6 * z, x, ym + 4.6 * z, VOLT, a * field, 2.4, 8);
  }
  // the channels: two halves of a protein across the membrane, the pore open between them
  for (const c of xs) {
    for (const side of [-1, 1]) {
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.roundRect(c + (side * 7.5 - 5) * z, ym - 15 * z, 10 * z, 30 * z, 4.5 * z);
      ctx.fillStyle = rgba(mix(L.ink, WHITE, L.dark ? 0.3 : 0.78), 0.95);
      ctx.fill();
      ctx.strokeStyle = rgba(OWN.K, 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // the two sheets of charge lining it — as much as the voltage asks for — at fixed places, so that they fill in
  const lining = 40;
  for (let j = Math.floor((s.x0 - 40 - xs[0]) / lining); xs[0] + j * lining < s.x1 + 40; j++) {
    const x = xs[0] + j * lining;
    if (xs.some((c) => Math.abs(c - x) < 14 * z)) continue;
    const wiggle = 2 * Math.sin(now / 900 + x * 0.05);
    if (mulberry32(500 + j)() < P.charge) dot(s, x + wiggle, ym - face - r - 3, 1, a, CLOSE_ION);
    if (mulberry32(900 + j)() < P.charge) dot(s, x - wiggle, ym + face + r + 3, -1, a, CLOSE_ION);
  }
  // the ions wandering in the fluid either side, once the dive has all but arrived: potassium always, the rest only
  // on the field slide
  const span = s.x1 - s.x0 + 60;
  const rooms = [
    [ym + face + 2 * r + 14, R.foot - 6],
    [R.top + 6, ym - face - 2 * r - 14],
  ];
  const rnd = mulberry32(53);
  for (const { ion, sign, inside, outside } of CROWD) {
    const show = a * smooth(clamp01((P.close - 0.75) / 0.25)) * (ion === 'K' ? 1 : P.others);
    for (const [k, per] of [inside, outside].entries()) {
      const [ya, yb] = rooms[k];
      for (let j = 0, count = Math.round((per * span) / 1000); j < count; j++) {
        const [bx, by, p1, p2, p3, p4] = [
          rnd(),
          rnd(),
          rnd() * 6.3,
          rnd() * 6.3,
          rnd() * 6.3,
          rnd() * 6.3,
        ];
        if (show < 0.01 || yb - ya < 20) continue;
        const x =
          s.x0 -
          30 +
          ((bx * span + 14 * Math.sin(now / 1700 + p1) + 8 * Math.sin(now / 610 + p2) + span) %
            span);
        const y =
          ya +
          8 +
          by * (yb - ya - 16) +
          8 * Math.sin(now / 1300 + p3) +
          5 * Math.sin(now / 530 + p4);
        dot(s, x, Math.max(ya, Math.min(yb, y)), sign, show, CLOSE_ION);
      }
    }
  }
  // the field slide: one potassium ion out through the channel, pushed back — inward — only while within the membrane
  if (P.field > 0.01) {
    const c = xs[0];
    // half a crossing on, so that held still it is caught within the membrane
    const u = ((now + PROBE / 2) % PROBE) / PROBE;
    const [x, y] =
      u < 0.3
        ? [c + 40 * (1 - smooth(u / 0.3)), lerp(ym + face + 110, ym + face, smooth(u / 0.3))]
        : u < 0.72
          ? [c, lerp(ym + face, ym - face, 1 - (1 - (u - 0.3) / 0.42) ** 1.6)]
          : [
              c - 40 * smooth((u - 0.72) / 0.28),
              lerp(ym - face, ym - face - 110, smooth((u - 0.72) / 0.28)),
            ];
    const seen = a * P.field * Math.min(1, u * 12, (1 - u) * 8);
    const within = clamp01((face + 4 - Math.abs(y - ym)) / 10);
    arrow(ctx, x, y, x, y + r + 30, VOLT, seen * within, 2.6, 9);
    dot(s, x, y, 1, seen, CLOSE_ION);
  }
  // the crossing slide: ions trying each channel, from both sides
  if (P.crossing > 0.01) xs.forEach((c, k) => drawTries(s, C, c, k, a * P.crossing));
  ctx.restore();
  // the labels and the slide's own plate, once the close-up is there
  const named = a * Math.max(P.field, P.crossing);
  if (named < 0.01) return;
  const said = P.crossing > P.field;
  const outside = said ? `outside: ${IONS.K.out} mM potassium, at 0 mV` : 'outside the cell: 0 mV';
  const inside = said
    ? `inside: ${IONS.K.in} mM potassium, at ${mvText(P.volts)}`
    : `inside the dendrite: ${mvText(P.volts)}`;
  tag(s, outside, 14, ym - face - 64, L.ink, 0.9 * named, 13);
  // on a narrow screen the tally says what the voltage inside is, and the ion's push is left to the words above
  tag(s, inside, 14, ym + face + 64, L.ink, 0.9 * a * (C.narrow ? P.field : named / a), 13);
  if (!C.narrow) {
    const pushed = 'an ion is pushed only while it crosses';
    tag(s, pushed, xs[0] + 13 * z, ym - face - 36, VOLT, a * P.field, 12.5, 'left', 'italic 600');
  }
  drawProfile(s, C, a * P.field);
  drawTally(s, C, a * P.crossing);
}

/** Potassium ions trying a channel: from inside, every TRY_EVERY ms or so, each with a thermal energy of its own,
 * climbing as far as that takes it against the field — and out, if it is enough; from outside, 28 times less often,
 * always falling through. Each try's climb is the voltage when it set off. */
function drawTries(s: Scene, C: Close, c: number, seed: number, alpha: number) {
  const { P, now } = s;
  const { ym, face } = C;
  const [yIn, yOut] = [ym + face, ym - face];
  for (const inward of [false, true]) {
    const every = TRY_EVERY * (inward ? IONS.K.in / IONS.K.out : 1);
    const last = Math.floor(now / every);
    for (let j = last - (inward ? 1 : 6); j <= last; j++) {
      const rnd = mulberry32(seed * 7919 + j * 104729 + (inward ? 15485863 : 0));
      const age = now - (j + 0.7 * rnd()) * every;
      const side = rnd() < 0.5 ? -1 : 1;
      const energy = -KT * Math.log(1 - rnd());
      if (age < 0) continue;
      const climb = Math.abs(builtVolts(P.cursor - age));
      const reach = climb < 0.5 ? Infinity : energy / climb;
      // where it is: coming up to the pore, in it, and away again
      const come = 380;
      const leave = 450;
      const cross = inward
        ? 900 - 300 * clamp01(climb / -E.K)
        : reach >= 1
          ? 700 + 600 / reach
          : 1300 * Math.sqrt(reach);
      const [from, to] = inward ? [yOut, yIn] : [yIn, yOut];
      const out = inward ? 1 : -1;
      let x: number;
      let y: number;
      let fade = 1;
      if (age < come) {
        const e = smooth(age / come);
        [x, y, fade] = [lerp(c + side * 34, c, e), lerp(from - out * 52, from, e), e];
      } else if (age < come + cross) {
        const u = (age - come) / cross;
        // falling in speeds up; climbing out slows down, and short of the top comes back
        const h = inward
          ? (1 - clamp01(climb / -E.K)) * u + clamp01(climb / -E.K) * u * u
          : reach >= 1
            ? 1 - (1 - u) ** (1 + 1 / reach)
            : 4 * reach * u * (1 - u);
        [x, y] = [c + 1.5 * Math.sin(u * 11), lerp(from, to, h)];
      } else if (age < come + cross + leave) {
        const e = smooth((age - come - cross) / leave);
        const end = inward || reach >= 1 ? to : from;
        const away = inward || reach >= 1 ? out : -out;
        [x, y, fade] = [lerp(c, c - side * 30, e), lerp(end, end + away * 60, e), 1 - e];
      } else continue;
      dot(s, x, y, 1, alpha * fade, CLOSE_ION);
    }
  }
}

/** The voltage from outside to in, its rows level with the close-up's: flat in the fluid, and falling all at once
 * across the membrane — which is where its field is. */
function drawProfile(s: Scene, C: Close, alpha: number) {
  if (alpha < 0.01) return;
  const { ctx, P, L, w } = s;
  const { ym, face, narrow } = C;
  const [px0, px1] = [w * (narrow ? 0.58 : 0.6), w - 4];
  const [yA, yB] = [ym - face - 64, ym + face + 64];
  plate(s, px0, yA - 36, px1 - px0, yB - yA + 36 + (narrow ? 14 : 64), alpha);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = rgba(insideOf(L), 1);
  ctx.fillRect(px0 + 8, ym + face, px1 - px0 - 16, yB - ym - face);
  ctx.fillStyle = rgba(mix([228, 86, 110], WHITE, L.dark ? 0.1 : 0.35), 0.45);
  ctx.fillRect(px0 + 8, ym - face, px1 - px0 - 16, 2 * face);
  ctx.globalAlpha = 1;
  const [gx0, gx1] = [px0 + (narrow ? 14 : 28), px1 - (narrow ? 50 : 64)];
  const xv = (v: number) => gx0 + ((v + 100) / 100) * (gx1 - gx0);
  line(
    s,
    [
      [xv(0), yA],
      [xv(0), yB],
    ],
    L.ink,
    alpha * 0.3,
    1,
    [3, 3]
  );
  line(
    s,
    [
      [xv(0), yA],
      [xv(0), ym - face],
      [xv(P.volts), ym + face],
      [xv(P.volts), yB],
    ],
    VOLT,
    alpha,
    2.4
  );
  words(ctx, '0 mV', xv(0) + 7, yA + 12, VOLT, alpha, 12.5, 'left', L.page, 'italic 600');
  words(
    ctx,
    mvText(P.volts),
    xv(P.volts) + 7,
    yB - 12,
    VOLT,
    alpha,
    12.5,
    'left',
    L.page,
    'italic 600'
  );
  words(
    ctx,
    narrow ? 'the voltage' : 'the voltage, from outside to in',
    px0 + 14,
    yA - 18,
    L.ink,
    0.8 * alpha,
    12.5
  );
  const strength = `${Math.round(Math.abs(P.volts) / 5)} million`;
  const said = narrow
    ? [`${strength} V/m in the membrane`, 'next to none in the fluid']
    : [
        `${Math.round(Math.abs(P.volts))} mV across 5 nm: ${strength} volts per metre`,
        'and next to none in the fluid either side',
      ];
  // on a narrow screen, too long for the plate: on one of their own under it
  if (narrow) {
    ctx.font = `italic 600 12.5px ${SERIF}`;
    const width = Math.max(...said.map((t) => ctx.measureText(t).width));
    plate(s, px1 - width - 14, yB + 24, width + 14, 44, alpha);
  }
  said.forEach((line, k) =>
    words(
      ctx,
      line,
      narrow ? px1 - 7 : px0 + 14,
      yB + (narrow ? 37 : 20) + 18 * k,
      k ? L.ink : VOLT,
      (k ? 0.8 : 1) * alpha,
      12.5,
      narrow ? 'right' : 'left',
      L.page,
      k ? 'italic' : 'italic 600'
    )
  );
}

/** The tally at a channel: how many ions arrive at it from each side, what share of them get through, and so how many
 * cross — 28 times as many out as in at first, until the climb out is high enough that just 1 in 28 gets through. */
function drawTally(s: Scene, C: Close, alpha: number) {
  if (alpha < 0.01) return;
  const { ctx, P, L, w } = s;
  const { ym, face, narrow } = C;
  const ratio = IONS.K.in / IONS.K.out;
  const odds = Math.exp(Math.max(0, -P.volts) / KT);
  const fmt = (x: number) =>
    x >= 9.5 || Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1);
  // beside the close-up; or, on a narrow screen, tighter, under it — saying there what the voltage inside is
  const box = narrow
    ? { x: 8, y: ym + face + 24, w: w - 16, h: 146, head: 16, row: 21 }
    : { x: w * 0.6, y: ym - face - 100, w: w * 0.4 - 4, h: 196, head: 48, row: 24 };
  const settled = clamp01(1 - Math.abs(P.volts - E.K) / 2);
  plate(s, box.x, box.y, box.w, box.h, alpha);
  const ink = L.ink;
  const [cOut, cIn] = [box.x + box.w * 0.64, box.x + box.w * 0.87];
  const y0 = box.y + box.head;
  if (!narrow) words(ctx, 'potassium at a channel', box.x + 14, box.y + 22, ink, 0.8 * alpha, 12.5);
  else
    words(
      ctx,
      `inside at ${mvText(P.volts)}`,
      box.x + 12,
      y0,
      VOLT,
      alpha,
      12.5,
      'left',
      null,
      'italic 600'
    );
  words(ctx, 'out, uphill', cOut, y0, ink, 0.8 * alpha, 12.5, 'center');
  words(ctx, 'in, downhill', cIn, y0, ink, 0.8 * alpha, 12.5, 'center');
  const rows: [string, string, string, number][] = [
    ['arrive at it', fmt(ratio), '1', 0.85],
    ['get through', odds < 1.05 ? 'all' : `1 in ${fmt(odds)}`, 'all', 0.85],
    ['so cross', fmt(ratio / odds), '1', 1],
  ];
  rows.forEach(([name, out, into, strong], k) => {
    const y = y0 + 28 + box.row * k;
    const style = k === 2 ? 'italic 600' : 'italic';
    words(ctx, name, box.x + 14, y, ink, strong * alpha, 13, 'left', null, style);
    words(ctx, out, cOut, y, k === 2 ? VOLT : ink, alpha, 14, 'center', null, style);
    words(ctx, into, cIn, y, k === 2 ? VOLT : ink, alpha, 14, 'center', null, style);
  });
  ctx.globalAlpha = alpha * 0.4;
  ctx.fillStyle = rgba(ink, 1);
  ctx.fillRect(box.x + 14, y0 + 28 + box.row * 1.5, box.w - 28, 1);
  ctx.globalAlpha = 1;
  const foot = y0 + 28 + box.row * 2 + (narrow ? 28 : 36);
  mathWords(
    ctx,
    `balanced at E_K = (kT/e) · ln(${IONS.K.out}/${IONS.K.in}) = ${mvText(E.K)}`,
    box.x + 14,
    foot,
    VOLT,
    alpha * settled,
    13,
    'left',
    null,
    'italic 600'
  );
  words(
    ctx,
    `kT/e = ${KT.toFixed(1)} mV: the thermal jiggle, per charge`,
    box.x + 14,
    foot + 19,
    ink,
    0.75 * alpha * settled,
    12
  );
}

/* ---------------------------------------------------------------- the figure */

const LABELS: Record<PhysicsStep, string> = {
  zoom: 'A piece of dendrite close in: its membrane, a double layer of lipids, with the fluid inside it and outside, and ions in both.',
  charge:
    'The ions, positive in red and negative in blue, with a key; above, like charges pushing apart and opposite charges pulling together.',
  separate:
    'Charge builds up on either side of the membrane, negative inside and positive outside, pulled together across it; a voltmeter reads −70 mV.',
  capacitor:
    'The membrane named as a capacitor: two conductors, the fluids, with an insulator between them, the membrane; Q = C·V.',
  few: "The numbers: −70 mV across 1 µm² of membrane takes about 4,400 ions' worth of charge, out of about 84 million potassium ions in 1 µm³ inside.",
  neutral:
    "Bars of each fluid's positive and negative charge, the same length: inside, potassium matched mostly by proteins and other large molecules; outside, sodium mostly by chloride. Only the thin layers of charge lining the membrane are unmatched.",
  current: 'Channels in the membrane, ions crossing through them: current.',
  conductance: 'More of the channels open, and more ions cross: more current for the same voltage.',
  diffusion:
    'Only the potassium channels open: potassium leaks out, down its concentration gradient.',
  nernst:
    'As potassium leaves, negative charge builds up inside; the voltage pulls potassium back until the two pushes balance, at about −89 mV, plotted below.',
  field:
    "Close in on one potassium channel: the charge lines the membrane's two faces, and its field lies only within the membrane; a plot beside it shows the voltage flat in the fluid and falling from 0 to −89 mV across the membrane, and an ion crossing is pushed only while within it.",
  crossing:
    'Potassium ions try the channel from inside 28 times as often as from outside, but to leave they must climb against the field; as the voltage builds to −89 mV, fewer make the climb, until just 1 in 28 does and as many cross in as out.',
  reversal:
    "A voltage axis with each ion's equilibrium potential marked: potassium −89, chloride −64, sodium +67 mV.",
  driving:
    "Arrows from the membrane's voltage to each ion's equilibrium: how hard, and which way, each ion is driven.",
  rest: "Each ion's conductance at rest drawn as a weight on the axis; the voltage settles at their weighted average, about −72 mV.",
  circuit:
    "The membrane drawn as a circuit: a capacitor in parallel with a conductance and a battery for each ion, and an electrode's current.",
  rc: 'A step of current and the voltage rising towards its new level, 63% of the way after one time constant of 20 ms.',
  cable:
    'The dendrite drawn thin, as a cable of compartments: current from an electrode at one end runs along it and leaks out as it goes.',
  length:
    'The voltage along the dendrite, falling with distance: to 37% after one length constant, about 800 µm.',
  gated:
    "Voltage-gated channels: how open sodium's and potassium's gates would be, held at each voltage.",
  spike:
    'A spike, from the Hodgkin–Huxley model: the voltage, and the sodium then potassium conductance that make it, the charge on the membrane flipping at its peak.',
  equation:
    'The membrane equation, each term named: charging, potassium, sodium and leak currents, current from neighbours and from an electrode.',
};

export default function PhysicsFigure({
  step,
  back = false,
}: {
  step: PhysicsStep;
  back?: boolean;
}) {
  return (
    <StepCanvas
      step={step}
      back={back}
      label={LABELS[step]}
      pose={(st, t, R) => poseFor(st, t, R)}
      draw={(f: Frame<PhysicsStep>, P: Pose) => {
        const [x0, x1] = f.seen.spill ? [f.seen.x0, f.seen.x1] : [0, f.w];
        const s: Scene = { ctx: f.ctx, P, L: f.look, R: f.room, x0, x1, w: f.w, now: f.now };
        const C = closeOf(s);
        const cam = cameraOf(s, C);
        if (cam.cover < 1) {
          f.ctx.save();
          aim(f.ctx, cam, cam.dendrite, cam.from);
          drawDendrite(s);
          f.ctx.restore();
          drawMeter(s);
          drawLabels(s, f.step);
          drawPanel(s);
        }
        drawClose(s, C, cam);
      }}
    />
  );
}
