'use client';

/**
 * The electrical physics of a neuron, a second take: the basic electrical
 * physics course's own short piece of membrane, at its scale and with as many
 * ions as its slide on the ions that carry current — each kind in its own
 * colour — built up as the brain-modeling path builds its dendrite: the
 * membrane of lipids, with a lens over a few of them; the inside it keeps apart
 * from the outside; and the ions on both sides, which it stops: those that run
 * at it bounce off. Then how charges push and pull,
 * a few of the ions taken aside in pairs; an imbalance inside, and the ions
 * flowing until it is gone; and so both sides, neutral. Then potassium alone,
 * the rest greyed: at its real proportions, 28 inside to 1 outside; the
 * channels in the membrane, each for one kind of ion, opening and closing; all
 * three open, each passing its own kind of ion and turning others away; and,
 * potassium's open, one potassium ion jostled about until it finds the pore and
 * passes through; all three held open from then on, as passive channels are; all
 * the ions jostling and bumping at random;
 * and, potassium's open, now and then one through it — far more often out than
 * in, a count of each kept; the net movement out — which is diffusion; were
 * potassium uncharged, its ions spreading until the two sides were even; that
 * undone, their charge back; one potassium ion out, and the imbalance of charge
 * it leaves; and, close in, a negative ion inside drawn to the membrane opposite
 * it — then the field of each, pushing ions alike away and drawing opposite ones
 * in; and many such pairs lining the membrane, their field across it, even in
 * the channel, pushing potassium back. Then, backed out to the whole membrane:
 * potassium's concentrations, which set how fast it diffuses out, the charge
 * that builds until the field balances that, and so the field's strength —
 * both set by the reader, inside and out: the closer the two, the less of each,
 * and, more outside, both the other way round; the field as the voltage between
 * two points, the work
 * done carrying a charge from one to the other, and that in volts; the membrane
 * potential, outside to inside; and the equilibrium potential, at which the two
 * pushes balance — negative, energy given up moving in and needed moving out; no
 * net flow there, potassium's own; and away from it, a net flow, out or in.
 * What plays out once waits for the slide's words to type.
 */

import { useRef, useState } from 'react';

import {
  clamp01,
  lerp,
  mix,
  phase,
  type RGB,
  rgba,
  smooth,
} from '@/features/learn/components/heuristics/shared';
import Slider from '@/features/learn/components/ui/Slider';
import { mulberry32 } from '@/features/learn/lib/basics/morphologies';

import {
  cycle,
  disc,
  drift,
  ends,
  type G,
  IONS,
  type IonKind,
  membrane,
  NEG,
  POS,
} from '../elec/Figure';
import { IONS as CONC, E as EQUILIBRIUM, G_REST, KT, V_REST } from '../physics/model';
import { arrow, type Look, mathWidth, mathWords, SERIF } from '../ui/canvas';
import StepCanvas, { type Frame } from '../ui/StepCanvas';

/** The slides about active channels: two among the passive ones; then close in on a voltage-gated sodium channel — the
 * protein and its pore, its gate, its voltage sensors and the field that holds them in, the potential rising, activation,
 * deactivation, its second gate, inactivation, recovery and a second rise too soon; then along to a ligand-gated one —
 * its ligand, activation and deactivation, desensitization; then the states such a channel moves between, a channel
 * opening at random, and many together; and how such channels are characterized: a voltage clamp, the I–V curve it
 * gives, a passive channel's straight line, why the active one's bends, and where it crosses zero. */
const ACTIVE_STEPS = [
  'activeChannels',
  'closeUp',
  'gate',
  'sensor',
  'held',
  'rises',
  'activates',
  'deactivates',
  'secondGate',
  'inactivates',
  'recovers',
  'tooSoon',
  'ligandGated',
  'binds',
  'desensitizes',
  'channelStates',
  'chance',
  'together',
  'clamp',
  'peakIV',
  'linear',
  'bends',
  'reverses',
] as const;
/** The slides about the sodium–potassium pump, after the action potential: why it is needed; it, close in; its round;
 * the charge it moves; and the energy it uses. */
const PUMP_STEPS = ['pumpNeed', 'pump', 'pumpCycle', 'electrogenic', 'pumpEnergy'] as const;
export const PHYSICS2_STEPS = [
  'lipids',
  'membrane',
  'water',
  'charges',
  'barrier',
  'forces',
  'flow',
  'neutral',
  'potassium',
  'gradient',
  'channels',
  'gating',
  'selective',
  'diffusion',
  'passive',
  'moving',
  'random',
  'net',
  'term',
  'uncharged',
  'charged',
  'imbalance',
  'moreOut',
  'moreIn',
  'attract',
  'fieldK',
  'fieldDef',
  'fieldN',
  'across',
  'sheet',
  'pushed',
  'stronger',
  'enter',
  'balance',
  'voltage',
  'work',
  'depends',
  'rate',
  'buildup',
  'determine',
  'volts',
  'potential',
  'freeIn',
  'negative',
  'surplus',
  'potentialEnergy',
  'stored',
  'perCharge',
  'equilibrium',
  'reversal',
  'energy',
  'noNet',
  'specific',
  'differs',
  'example',
  'kinds',
  'each',
  'reversals',
  'pulls',
  'weighted',
  'nearer',
  ...ACTIVE_STEPS,
  'spikes',
  'oneSpike',
  'inputs',
  'threshold',
  'allOrNone',
  'gated',
  'upstroke',
  'peak',
  'downstroke',
  'refractory',
  'actionPotential',
  'propagate',
  ...PUMP_STEPS,
  'first',
  'inject',
  'channel',
  'opens',
  'sodium',
  'excess',
  'rise',
  'brief',
  'resist',
  'rc',
  'capacitance',
  'thickness',
  'dielectric',
  'ohm',
  'charging',
  'repel',
  'along',
  'spread',
  'leak',
  'soma',
  'decay',
  'signal',
  'synapse',
  'release',
  'bind',
  'opening',
  'inflow',
  'glutamate',
  'ampa',
  'cancel',
  'clearance',
  'unbind',
  'deactivation',
  'desensitize',
  'factors',
  'tau',
] as const;
export type Physics2Step = (typeof PHYSICS2_STEPS)[number];

/** By when everything that plays out once has played, ms: a slide come back to starts there. */
const DONE = 5500;
/** The big negative molecules inside — proteins, nucleic acids, phosphates: slate, and drawn larger. */
const LARGE: RGB = [100, 116, 139];
/**
 * A field line drawn as a lightsaber: a blade that ignites from (x0, y0) out to (x1, y1) as
 * `ignite` goes 0 to 1, a white-hot core in a coloured glow that hums (flickers a little), and a
 * pulse of light running along it towards its tip, every `period` ms, starting `offset` of the
 * way through; and at the tip, the arrowhead, glowing too. On a light page the core is the colour
 * paled rather than white, so the blade still reads.
 */
function saber(
  ctx: CanvasRenderingContext2D,
  L: Look,
  now: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colour: RGB,
  alpha: number,
  ignite: number,
  width: number,
  head: number,
  offset = 0,
  period = 1400
) {
  if (alpha < 0.01 || ignite < 0.01) return;
  const e = smooth(clamp01(ignite));
  const [ex, ey] = [lerp(x0, x1, e), lerp(y0, y1, e)];
  const angle = Math.atan2(y1 - y0, x1 - x0);
  const [ca, sa] = [Math.cos(angle), Math.sin(angle)];
  // the hum: two slow sines and a quick one, never more than a tenth either way
  const hum =
    0.92 + 0.05 * Math.sin(now * 0.011 + offset * 9) + 0.03 * Math.sin(now * 0.047 + offset * 23);
  const core = L.dark ? ([255, 255, 255] as RGB) : mix(colour, [255, 255, 255], 0.45);
  const blade = (w: number, c: RGB, a: number, blur: number) => {
    ctx.globalAlpha = a * alpha * hum;
    ctx.strokeStyle = rgba(c, 1);
    ctx.shadowColor = rgba(colour, 1);
    ctx.shadowBlur = blur;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(ex - ca * head * 0.5 * e, ey - sa * head * 0.5 * e);
    ctx.stroke();
  };
  ctx.save();
  if (L.dark) ctx.globalCompositeOperation = 'lighter';
  // the glow, wide and faint; the blade; its core
  blade(width * 4.2, colour, 0.22, width * 7);
  blade(width * 1.9, colour, 0.85, width * 4);
  blade(width * 0.7, core, 1, width * 2);
  // the pulse running along it to the tip
  const t = (((now / period + offset) % 1) + 1) % 1;
  if (e > 0.98) {
    const [px, py] = [lerp(x0, x1, t), lerp(y0, y1, t)];
    const glow = ctx.createRadialGradient(px, py, 0, px, py, width * 5);
    glow.addColorStop(0, rgba(core, 0.95));
    glow.addColorStop(0.4, rgba(colour, 0.55));
    glow.addColorStop(1, rgba(colour, 0));
    ctx.globalAlpha = alpha * Math.sin(Math.PI * t);
    ctx.shadowBlur = 0;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, width * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // the tip, once the blade has reached it
  if (e > 0.6) {
    const a = alpha * hum * clamp01((e - 0.6) / 0.4);
    const tip = (scale: number, c: RGB, op: number, blur: number) => {
      const hd = head * scale;
      ctx.globalAlpha = a * op;
      ctx.fillStyle = rgba(c, 1);
      ctx.shadowColor = rgba(colour, 1);
      ctx.shadowBlur = blur;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - hd * Math.cos(angle - 0.42), ey - hd * Math.sin(angle - 0.42));
      ctx.lineTo(ex - hd * Math.cos(angle + 0.42), ey - hd * Math.sin(angle + 0.42));
      ctx.closePath();
      ctx.fill();
    };
    tip(1.15, colour, 0.9, width * 5);
    tip(0.6, core, 1, width * 2);
  }
  ctx.restore();
}

/** The electric field across the membrane, where it is drawn: warm, as the other courses draw voltage. */
const FIELD: RGB = [217, 119, 6];
/** The lipids' heads, as the basic course's membrane draws them. */
const headOf = (L: Look) => mix(L.page, [148, 163, 184], 0.85);
/** What the ions other than potassium are greyed to, once the slides turn to potassium. */
const GREY: RGB = [150, 158, 170];

/** Potassium's concentration inside over outside: 28, as 140 mM is to 5 mM. */
const RATIO = CONC.K.in / CONC.K.out;
/** Potassium's equilibrium potential, mV — about −89, from those concentrations — at which its two pushes balance. */
const E_K = EQUILIBRIUM.K;
/** One potassium ion's charge, C; and the work, J, to carry it out across the membrane at E_K, against the field. */
const CHARGE_C = 1.602e-19;
const WORK_J = (CHARGE_C * Math.abs(E_K)) / 1000;
/** The membrane potential on the last slide, mV: less negative than E_K. */
const EXAMPLE_MV = -70;
/** A voltage as the slides write one, in mV, with a true minus sign; and an energy, in joules. */
const mV = (v: number) => `${Math.round(v) < 0 ? '−' : ''}${Math.abs(Math.round(v))} mV`;
const joules = (j: number) => `${(j / 1e-20).toFixed(2)} × 10^{−20} J`;
/** A potential with its sign, plus or minus, as the slides write a reversal potential. */
const signed = (v: number) => `${Math.round(v) < 0 ? '−' : '+'}${Math.abs(Math.round(v))}`;
/** The ions with channels of their own, in the order the last slides take them: each one's reversal potential and its
 * conductance at rest, relative to potassium's, are the physics course's — and so the resting potential, about −72 mV,
 * their average weighted by the conductances. */
const PASSING: ('K' | 'Na' | 'Cl')[] = ['K', 'Na', 'Cl'];
/** The line the reversal potentials are shown on, mV. */
const SPAN: [number, number] = [-100, 80];

type Kind = IonKind | 'A';
const SIGN: Record<Kind, number> = { Na: 1, K: 1, Ca: 1, Cl: -1, A: -1 };
/**
 * The ions: 24, as on the basic course's slide, 12 on each side and each side neutral — outside, mostly sodium and
 * chloride; inside, mostly potassium, its charge matched by large negative molecules.
 */
const SIDES: { side: number; kinds: Kind[] }[] = [
  { side: -1, kinds: ['Na', 'Cl', 'Na', 'Cl', 'K', 'Cl', 'Na', 'Cl', 'Na', 'Cl', 'Na', 'Cl'] },
  { side: 1, kinds: ['K', 'A', 'K', 'Cl', 'K', 'A', 'Na', 'A', 'K', 'Cl', 'K', 'A'] },
];
/** Each ion's place: how far along the membrane (0..1), each in a twelfth of its own; how far from it; its wander. */
const PLACES = (() => {
  const rnd = mulberry32(5);
  return SIDES.flatMap(({ side, kinds }) =>
    kinds.map((kind, j) => ({
      kind,
      side,
      along: (j + 0.15 + 0.7 * rnd()) / kinds.length,
      depth: rnd(),
      p: rnd() * 6.3,
      q: rnd() * 6.3,
    }))
  );
})();
/** The pairs taken aside to show how charges push and pull — outside ions, each pair's left then right: two sodium
 * ions; two chloride; and a chloride with a sodium — and what each shows. */
const DEMO: [number, number][] = [
  [0, 2],
  [5, 7],
  [9, 10],
];
const DEMO_SAID: [string, string, boolean][] = [
  ['two positive ions repel', '+ and + repel', false],
  ['two negative ions repel', '− and − repel', false],
  ['a negative and a positive ion attract', '− and + attract', true],
];
/** On the slide of an imbalance, where each inside ion is first put, along the membrane: the positive ones over its
 * left part and the negative over its right, each in the order they sit, so that each goes back the short way. */
const SPLIT = (() => {
  const inside = PLACES.map((c, k) => ({ c, k })).filter(({ c }) => c.side > 0);
  const at = new Map<number, number>();
  for (const sign of [1, -1]) {
    const mine = inside
      .filter(({ c }) => SIGN[c.kind] === sign)
      .sort((a, b) => a.c.along - b.c.along);
    mine.forEach(({ k }, j) =>
      at.set(k, (sign > 0 ? 0.04 : 0.6) + (0.36 * (j + 0.5)) / mine.length)
    );
  }
  return at;
})();
/** How many positive and negative charges are on a side: outside (-1), or inside (1). */
const countOf = (side: number) =>
  [1, -1].map((sign) => PLACES.filter((c) => c.side === side && SIGN[c.kind] === sign).length);

/**
 * From the slide on potassium's concentrations, the ions at their real proportions, one for every 5 mM: potassium 28
 * inside to 1 outside (140 mM to 5, as the first take has them), and the rest, grey, 60 a side in all, so that each
 * side stays neutral and as concentrated as the other — chloride standing in for all the outside's small negative ions,
 * the large molecules for the inside's. The 24 already there keep their kinds and move to places of their own among
 * them: a grid 20 along by 3 deep, dealt out at random.
 */
const PER_ION = CONC.K.out;
const DENSE: Record<number, Partial<Record<Kind, number>>> = (() => {
  const n = (mM: number) => Math.round(mM / PER_ION);
  const outside = n(CONC.Na.out) + n(CONC.K.out);
  const inside = n(CONC.Na.in) + n(CONC.K.in);
  return {
    [-1]: { Na: n(CONC.Na.out), K: n(CONC.K.out), Cl: outside },
    [1]: { K: n(CONC.K.in), Na: n(CONC.Na.in), Cl: n(CONC.Cl.in), A: inside - n(CONC.Cl.in) },
  };
})();
interface Each {
  kind: Kind;
  side: number;
  /** Which of the 24 it is, or -1 if it only joins them on the slides about potassium. */
  k: number;
  along: number;
  depth: number;
  /** Where it sits among the many. */
  dAlong: number;
  dDepth: number;
  p: number;
  q: number;
}
const ALL: Each[] = (() => {
  const rnd = mulberry32(17);
  const out: Each[] = [];
  for (const side of [-1, 1]) {
    const mine = PLACES.map((c, k) => ({ kind: c.kind, k })).filter(
      ({ k }) => PLACES[k].side === side
    );
    for (const [kind, total] of Object.entries(DENSE[side]) as [Kind, number][])
      for (let j = mine.filter((x) => x.kind === kind).length; j < total; j++)
        mine.push({ kind, k: -1 });
    const slots = mine.map((_, s) => s);
    for (let s = slots.length - 1; s > 0; s--) {
      const r = Math.floor(rnd() * (s + 1));
      [slots[s], slots[r]] = [slots[r], slots[s]];
    }
    const cols = Math.ceil(mine.length / 3);
    mine.forEach(({ kind, k }, j) => {
      const [col, row] = [slots[j] % cols, Math.floor(slots[j] / cols)];
      const c = k >= 0 ? PLACES[k] : null;
      out.push({
        kind,
        side,
        k,
        along: c?.along ?? 0,
        depth: c?.depth ?? 0,
        dAlong: (col + 0.2 + 0.6 * rnd()) / cols,
        dDepth: (row + 0.15 + 0.7 * rnd()) / 3,
        p: c?.p ?? rnd() * 6.3,
        q: c?.q ?? rnd() * 6.3,
      });
    });
  }
  return out;
})();
/** How many potassium ions there are among the many: outside, and inside. */
const POTASSIUM = [-1, 1].map(
  (side) => ALL.filter((c) => c.kind === 'K' && c.side === side).length
);
/**
 * On the slide imagining potassium uncharged, the inside's potassium ions that spread out through the open channel —
 * enough to leave the two sides about even, nearest the channel first — and where each comes to rest outside, its
 * place along and how far out, dealt out at random.
 */
const MIGRANTS = (() => {
  const near = (c: Each) => Math.abs(c.dAlong - 0.5) + 0.3 * c.dDepth;
  const inside = ALL.map((c, n) => ({ c, n }))
    .filter(({ c }) => c.kind === 'K' && c.side > 0)
    .sort((a, b) => near(a.c) - near(b.c));
  const moving = Math.floor((POTASSIUM[1] - POTASSIUM[0]) / 2);
  const rnd = mulberry32(29);
  const slots = Array.from({ length: moving }, (_, s) => s);
  for (let s = moving - 1; s > 0; s--) {
    const r = Math.floor(rnd() * (s + 1));
    [slots[s], slots[r]] = [slots[r], slots[s]];
  }
  const at = new Map<number, { order: number; dAlong: number; dDepth: number }>();
  inside
    .slice(0, moving)
    .forEach(({ n }, order) =>
      at.set(n, { order, dAlong: (slots[order] + 0.2 + 0.6 * rnd()) / moving, dDepth: rnd() })
    );
  return at;
})();
/** How often another sets off, ms. */
const MIGRATE_EVERY = 420;
/** How many have passed out through the pore, `ms` into the spreading. */
const spreadOut = (ms: number) =>
  [...MIGRANTS.values()].filter((m) => ms - m.order * MIGRATE_EVERY >= 900).length;
/** By when the last of them has come to rest outside, ms into the spreading. */
const SPREAD_DONE = (MIGRANTS.size - 1) * MIGRATE_EVERY + 2000;
/** And where each potassium ion left inside comes to settle meanwhile: spread evenly along the inside, three deep, in
 * the order they sit, so that each moves only a little way — closing the gap the others leave by the channel. */
const SETTLED = (() => {
  const left = ALL.map((c, n) => ({ c, n }))
    .filter(({ c, n }) => c.kind === 'K' && c.side > 0 && !MIGRANTS.has(n))
    .sort((a, b) => a.c.dAlong - b.c.dAlong);
  const rnd = mulberry32(31);
  const at = new Map<number, { dAlong: number; dDepth: number }>();
  left.forEach(({ n }, j) =>
    at.set(n, {
      dAlong: (j + 0.3 + 0.4 * rnd()) / left.length,
      dDepth: ((j % 3) + 0.25 + 0.5 * rnd()) / 3,
    })
  );
  return at;
})();
/** Where a spreading ion is, `s` ms after it sets off: to the channel's inner mouth, through it, and out to its place —
 * or, before it sets off, at home. */
function migrateAt(
  s: number,
  home: [number, number],
  rest: [number, number],
  cx: number,
  y: number,
  face: number,
  u: number
): [number, number] {
  const inner: [number, number] = [cx, y + face + 6 * u];
  const outer: [number, number] = [cx, y - face - 6 * u];
  const go = (a: [number, number], b: [number, number], e: number): [number, number] => [
    lerp(a[0], b[0], e),
    lerp(a[1], b[1], e),
  ];
  if (s <= 0) return home;
  if (s < 600) return go(home, inner, smooth(s / 600));
  if (s < 900) return go(inner, outer, smooth((s - 600) / 300));
  if (s < 2000) return go(outer, rest, smooth((s - 900) / 1100));
  return rest;
}

/** How many positive and negative charges each side holds among the many: outside (-1), or inside (1). */
const CHARGES = (side: number) =>
  [1, -1].map((sign) => ALL.filter((c) => c.side === side && SIGN[c.kind] === sign).length);
/** The negative ion inside drawn to the membrane once one potassium ion has left: the nearest under where that comes to
 * rest, a little way right of the channel. */
const DRAWN = ALL.reduce(
  (best, c, n) =>
    c.side > 0 && SIGN[c.kind] < 0 && Math.abs(c.dAlong - 0.575) + 0.3 * c.dDepth < best[1]
      ? ([n, Math.abs(c.dAlong - 0.575) + 0.3 * c.dDepth] as [number, number])
      : best,
  [-1, Infinity] as [number, number]
)[0];
/** Where the one potassium ion that leaves is, `s` ms after it sets off: to the channel, through it, and to rest by the
 * membrane outside, `dx` along from the pore — `lift` off it, or, at none, against it. */
function leaveAt(
  s: number,
  home: [number, number],
  cx: number,
  y: number,
  face: number,
  u: number,
  dx: number,
  lift = 0
): [number, number] {
  const go = (a: [number, number], b: [number, number], e: number): [number, number] => [
    lerp(a[0], b[0], e),
    lerp(a[1], b[1], e),
  ];
  const [inner, outer, rest]: [number, number][] = [
    [cx, y + face + 6 * u],
    [cx, y - face - 6 * u],
    [cx + dx, y - face - 9 * u - lift],
  ];
  if (s <= 0) return home;
  if (s < 800) return go(home, inner, smooth(s / 800));
  if (s < 1200) return go(inner, outer, smooth((s - 800) / 400));
  if (s < 2200) return go(outer, rest, smooth((s - 1200) / 1000));
  return rest;
}

/** How far off the membrane the potassium ion that left rests, u: close to it, not against it — until the negative ion it
 * draws to the membrane inside holds the two of them there. */
const LIFT = 10;

/** The fields' ripples: how long each takes to spread to its widest, ms; how many are on their way at once; and how far
 * out from the ion they go, u. */
const RIPPLE_MS = 3000;
const RIPPLES = 4;
const RIPPLE_REACH = 260;
/** On the potassium ion's field's slide, two potassium ions outside that come at it and are pushed back, each in turn:
 * where from, radians round it (straight up −π/2), and how far into the round each sets off, ms. */
const VISITORS: [number, number][] = [
  [-2.85, 0],
  [-1.95, 2600],
];
const VISIT_MS = 5200;
/** The pair's field, drawn by waves sweeping along its lines: how many lines shape the waves (every other one drawn),
 * fanning out from straight down by up to how far either side, radians; how many waves are on their way at once; and how
 * long each takes to sweep from the one ion to the other, ms. */
const FIELD_LINES = 13;
const FIELD_SPREAD = 0.95;
const FIELD_WAVES = 3;
const WAVE_MS = 3200;

/** A traced field line: its points, and how far along it each is. */
interface FieldLine {
  pts: [number, number][];
  at: number[];
}

/**
 * The lines of the field of a positive charge at `a` and an equal negative one at `b`, in the page's pixels: `count` of
 * them, leaving `a` (radius `ra`) at angles fanning `spread` either side of straight towards `b`, each followed along the
 * field, in short steps, until it reaches `b` (radius `rb`).
 */
function fieldLines(
  a: [number, number],
  b: [number, number],
  ra: number,
  rb: number,
  count: number,
  spread: number
): FieldLine[] {
  const field = (x: number, y: number): [number, number] => {
    let [ex, ey] = [0, 0];
    for (const [cx, cy, q] of [
      [a[0], a[1], 1],
      [b[0], b[1], -1],
    ]) {
      const [dx, dy] = [x - cx, y - cy];
      const r2 = dx * dx + dy * dy;
      const k = q / (r2 * Math.sqrt(r2));
      [ex, ey] = [ex + k * dx, ey + k * dy];
    }
    const m = Math.hypot(ex, ey) || 1;
    return [ex / m, ey / m];
  };
  const toward = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const step = Math.max(1.5, Math.hypot(b[0] - a[0], b[1] - a[1]) / 120);
  return Array.from({ length: count }, (_, i) => {
    const turn = toward + (count > 1 ? (i / (count - 1) - 0.5) * 2 * spread : 0);
    let [x, y] = [a[0] + Math.cos(turn) * (ra + 2), a[1] + Math.sin(turn) * (ra + 2)];
    const pts: [number, number][] = [[x, y]];
    const at = [0];
    for (let n = 0; n < 2000; n++) {
      // a midpoint step along the field
      const [fx, fy] = field(x, y);
      const [mx, my] = field(x + (fx * step) / 2, y + (fy * step) / 2);
      [x, y] = [x + mx * step, y + my * step];
      pts.push([x, y]);
      at.push(at[at.length - 1] + step);
      if (Math.hypot(x - b[0], y - b[1]) < rb + 2) break;
    }
    return { pts, at };
  });
}

/** And, on the negative ion's field's slide, two potassium ions inside drawn in to that, each in turn, from either side,
 * along under the membrane — clear of it, and of the words at the foot: where from, radians round it; how far into the
 * round each sets off, ms; and which way its path bends as it comes. */
const LURED: [number, number, number][] = [
  [3.0, 0, 1],
  [0.14, 2900, -1],
];
/** How far the view lowers onto the negative ion on its field's slide, u: so that what it draws in can be seen coming. */
const LOWER = 22;
/** How much closer still the view comes, right in on the potassium channel, on the slides about what happens in it. */
const ON_CHANNEL = 2;
/** How far left of the potassium channel's middle the pair beside it lines the membrane, u: all but touching the channel. */
const BESIDE = 28;
const LURE_MS = 5800;

/** The channels, where the basic course's slide puts its three: sodium's, potassium's in the middle, and chloride's. */
const CHANNELS: Kind[] = ['Na', 'K', 'Cl'];
const CHANNEL_NAMES: Record<string, [string, string]> = {
  Na: ['sodium channel', 'Na^{+} channel'],
  K: ['potassium channel', 'K^{+} channel'],
  Cl: ['chloride channel', 'Cl^{−} channel'],
};
/** The potassium ion that finds the open channel: the one inside nearest it. */
const WALKER = ALL.reduce(
  (best, c, n) =>
    c.kind === 'K' && c.side > 0 && Math.abs(c.dAlong - 0.5) + 0.3 * c.dDepth < best[1]
      ? ([n, Math.abs(c.dAlong - 0.5) + 0.3 * c.dDepth] as [number, number])
      : best,
  [-1, Infinity] as [number, number]
)[0];
/** How long its trip takes, ms, round and round. */
const WALK = 7000;
/** On the slide about what potassium's concentrations set, the order in which the potassium ions inside grey as less of
 * it is set there: dealt out at random, so that those left are spread along the inside. */
const SPARE = (() => {
  const inside = ALL.map((c, n) => ({ c, n })).filter(
    ({ c, n }) => c.kind === 'K' && c.side > 0 && n !== WALKER
  );
  const rnd = mulberry32(37);
  const order = inside.map((_, j) => j);
  for (let s = order.length - 1; s > 0; s--) {
    const r = Math.floor(rnd() * (s + 1));
    [order[s], order[r]] = [order[r], order[s]];
  }
  return new Map(inside.map(({ n }, j) => [n, order[j]]));
})();
/** And the sodium ions that take potassium's colour as more of it is set on their side than there is, each for 5 mM
 * more: outside, dealt out at random; inside, its two. */
const TO_K = (() => {
  const rnd = mulberry32(41);
  const at = new Map<number, number>();
  for (const side of [-1, 1]) {
    const sodium = ALL.map((c, n) => ({ c, n })).filter(
      ({ c }) => c.kind === 'Na' && c.side === side
    );
    const order = sodium.map((_, j) => j);
    for (let s = order.length - 1; s > 0; s--) {
      const r = Math.floor(rnd() * (s + 1));
      [order[s], order[r]] = [order[r], order[s]];
    }
    for (let j = 0; j < sodium.length; j++) at.set(sodium[j].n, order[j]);
  }
  return at;
})();
/** How far each side's potassium can be set, mM: from one ion's worth to as many as there are cations to show it, either
 * side — 150. */
const SETTABLE: [number, number] = (() => {
  const sodium = (side: number) => ALL.filter((c) => c.kind === 'Na' && c.side === side).length;
  return [PER_ION, Math.min(CONC.K.in + PER_ION * sodium(1), CONC.K.out + PER_ION * sodium(-1))];
})();
/** On the slide about the membrane as a barrier, the ions that run at it and bounce off, each in turn: a chloride
 * and a sodium ion from outside, a potassium ion from inside — each with when it sets off, ms into the round. */
const BOUNCERS: [number, number][] = [
  [3, 0],
  [6, 900],
  [20, 1800],
];
const BOUNCE = 2700;

interface Pose {
  /** How far the membrane has drawn in; the lens over a few lipids; the membrane named; the inside and outside
   * named; the ions; and their key. */
  drawn: number;
  lens: number;
  named: number;
  sides: number;
  ions: number;
  key: number;
  /** The pairs taken aside; the outside's ions dimmed; the inside's sorted apart, flowing back, and balanced again;
   * and the inside's charges counted. */
  pairs: number;
  dim: number;
  split: number;
  flowing: number;
  balanced: number;
  tally: number;
  /** All but potassium greyed; the ions at their real proportions, and potassium's counted; the channels, and
   * potassium's open; and the one potassium ion's trip out — how far into it, ms. */
  focus: number;
  crowd: number;
  counted: number;
  channels: number;
  open: number;
  walk: number;
  walkMs: number;
  /** The membrane's lipids faded to two plain lines, its two faces: from the slide about a channel open on, for less to
   * look at. */
  lines: number;
  /** The inside and the outside named large, in the middle of each — as on the slide that names them. */
  big: number;
  /** The key, in the middle of the figure (0) or docked in its top right corner (1); and ions bouncing off the
   * membrane. */
  dock: number;
  barrier: number;
  /** The channels opening and closing in turn; and each named open or closed. */
  gating: number;
  stated: number;
  /** Every ion jostling faster, bumping into the others, and now and then a potassium ion through the open channel. */
  random: number;
  /** Potassium ions through the open channel, out and in, with a count of each; and the process named: diffusion. */
  flux: number;
  term: number;
  /** The net movement out: an arrow beside the channel, and how many more have gone out than in. */
  net: number;
  /** Potassium drawn without its charge; its ions spreading out, ms in, with each side's count and why; and its
   * charge back, a ring round each as it comes. */
  bare: number;
  drainMs: number;
  spread: number;
  recharge: number;
  /** One potassium ion leaving, ms into its trip, and the imbalance of charge it leaves, counted; the view closed in on
   * the channel; and a negative ion inside drawn to the membrane opposite it, and that named. */
  alone: number;
  leaveMs: number;
  imbalance: number;
  zoom: number;
  pull: number;
  pulled: number;
  /** Closer in, on the pair; and the field of the potassium ion, then of the negative ion, with the push or pull it
   * gives the ions round it. */
  closer: number;
  /** Centred on the channel again, as close in, for the pairs lining the membrane. */
  recentre: number;
  fieldK: number;
  fieldN: number;
  /** The view lowered onto the negative ion inside, on its field's slide. */
  lower: number;
  /** The potassium ion's field defined: arrows all round it, each the force a unit positive charge would feel there,
   * and such a charge set down at one point after another. */
  probe: number;
  /** The pair's field together, across the membrane between them: little waves crossing it, outside to inside. */
  across: number;
  /** Right in on the channel, all round it greyed: on the slides about what happens in it. */
  onChannel: number;
  /** Pairs lining the membrane, many, and the field they make across it; and a potassium ion trying the channel,
   * pushed back. */
  sheet: number;
  attempt: number;
  /** More pairs, close in, between those lining the membrane by the channel — each, as it comes, a potassium ion out
   * through the pore and over to its place, a negative ion inside drawn to it — and the field across it stronger. */
  denser: number;
  /** Two points, one outside the channel and one inside, and the voltage between them; then a charge carried from
   * the one inside to the one outside, against the field, and the work that takes, counted in joules. */
  points: number;
  work: number;
  /** A potassium ion outside drawn in through the channel by the field: it is easier to pass in. */
  enter: number;
  /** The two at the channel, side by side and as strong: diffusion pushing potassium out, the field pushing it back. */
  balance: number;
  /** All the channels open, each in its own colour, passing its own kind of ion and turning away others. */
  selective: number;
  /** All three channels held open, as passive channels are, from the slide that names them on; and, on that slide,
   * what that means. */
  passive: number;
  leak: number;
  /** Every ion jostled faster, on the slide about their moving at random only: slowed again after it. */
  fast: number;
  /** The negative ion the next slides draw to the membrane, in its own colour among the greyed. */
  reveal: number;
  /** The field's lines sweeping down through the membrane: from slide 29 on, where the view backs out, not drawn. */
  waves: number;
  /** The potassium ions inside greyed, all but the one that leaves: on the slides about it and the ion it draws. */
  quiet: number;
  /** Water molecules filling both sides, neutral: on their own slide only, fading as the next begins. */
  water: number;
  /** Potassium's concentration each side, named where the sides are: on the slide about how it sets diffusion's rate. */
  conc: number;
  /** Potassium's concentration each side, mM, as drawn: 140 inside and 5 outside, but as the reader sets them on the
   * slide about what they determine (`vary` 1 — the figure without its words there, the sliders saying what is set);
   * and how much charge lines the membrane, as a share of what lines it at 140 and 5 — below none where more potassium
   * is set outside than in, lining it the other way round. */
  cin: number;
  cout: number;
  vary: number;
  charge: number;
  /** The words at the foot of the figure, shown (1) — or not, close in on the channel from the slide about voltage on,
   * where they would sit among the ions inside (0). */
  captions: number;
  /** The ions other than potassium, and potassium's own greyed as not there, shown (1) — or, on the slide where the
   * reader sets potassium's concentrations, gone (0); and there, potassium ions through the channel, out and in. */
  others: number;
  crossing: number;
  /** The membrane potential, mV: E_K but where it is shown otherwise, on the last slides. */
  vm: number;
  /** The voltage between the two points, in volts; and the charge carried the other way, outside to inside, without its
   * bar: the membrane potential. */
  units: number;
  inward: number;
  /** That charge pulled in by the field rather than carried: the energy it gives up, a glow round it and a bar filling
   * beside the channel; that energy told as negative work, and the membrane potential's value, negative; and the
   * negative charge lining the inside picked out and named, the charge carried in gone. */
  freed: number;
  signed: number;
  surplus: number;
  /** The charge carried in, gone; a positive charge at each point instead, the potential energy it has there named;
   * the one outside glowing with the energy it would give up coming in; and their difference per unit of charge, the
   * membrane potential, its badge lit. */
  hidden: number;
  levels: number;
  stored: number;
  perUnit: number;
  /** In the figure's corner, a plate naming E_K; its value; and, on a line with it, the membrane potential's. */
  plate: number;
  valued: number;
  meter: number;
  /** A potassium ion drawn in through the channel, energy given up, then one carried out, energy needed, in turn. */
  energy: number;
  /** Potassium ions through the open channel as often in as out, in turn: no net flow. */
  even: number;
  /** Potassium's concentrations picked out, and E_K in its colour: E_K is potassium's own. */
  own: number;
  /** The net flow through the channel, out or in as the membrane potential is above or below E_K; and, on the last
   * slide, what one less negative does. */
  netFlow: number;
  example: number;
  /** Each side's concentration of each ion, in its colour, where the sides are named; each channel's reversal potential
   * over it; those on a line with the membrane potential, and each one's pull on that; and the weights that make the
   * resting potential their average. */
  listed: number;
  marked: number;
  panel: number;
  weighted: number;
  /** How near the resting potential sits to each reversal potential, marked along the line; and how many of each ion's
   * channels are open, named under them. */
  nearer: number;
  /** The action potential, after rest: a plot below of the membrane potential through it, again and again, the marker
   * on the line above following it and each ion's pull swelling and shrinking with its conductance; inputs from
   * synapses, a receptor opened briefly by neurotransmitter; the threshold; voltage-gated sodium and potassium
   * channels; the spike's rise, as sodium flows in, and its fall, as potassium flows out; and the spike named. Then two
   * neurons, the spike passed from one to the other; and, first, the one alone. */
  /** Active channels, after rest: a voltage-gated channel and a ligand-gated one beside the passive ones, opening and
   * shutting. Then the view closing in on the voltage-gated one, a sodium channel: the protein and its pore named; its
   * gate opening and shutting, sodium through it while it is open; its voltage sensors, their positive charges; the
   * charge lining the membrane, the field across it, and the field's push on the sensors; the membrane potential stepped
   * up and back, again and again, a plot of it below, the sensors moving out, and with them the gate opening — activation
   * — and shutting again — deactivation; its second gate; that swinging into the pore while the potential stays up —
   * inactivation — and out again, slowly — recovery; and a second step up too soon. Then the view along the membrane to
   * the ligand-gated one, its ligand coming and going, again and again: named; activation and deactivation; and
   * desensitization. Then back, and, in the plot's place, the states such a channel moves between, the one it is in lit;
   * the channel opening at random; and many such channels together, the share of them open. */
  active: number;
  closeUp: number;
  onLigand: number;
  protein: number;
  swing: number;
  sensors: number;
  field: number;
  stepV: number;
  plot: number;
  act: number;
  deact: number;
  lid: number;
  inact: number;
  recov: number;
  twice: number;
  ligand: number;
  binding: number;
  desen: number;
  states: number;
  flicker: number;
  many: number;
  /** In front of it all, a voltage clamp's steps and the currents through the channels at each; the peak of each
   * plotted against its potential, the I–V curve; a constant conductance's straight line; the share of channels open at
   * each potential, on a plot above it, and a cursor running across both; and the reversal potential, where the curve
   * crosses zero. */
  /** The action potential's own plots, in front of the membrane: a run of spikes, then close in on one; the inputs
   * that start it; the threshold, and inputs short of it; inputs of four sizes, all or nothing; sodium's and
   * potassium's conductances and a strip of membrane with their channels; the rise, and the runaway that drives it;
   * the peak; the fall, and the dip below rest; the refractory period, a late input firing nothing; and all of it named
   * together. */
  apPanel: number;
  apZoom: number;
  apInputs: number;
  apThresh: number;
  apSizes: number;
  apGated: number;
  apUp: number;
  apPeak: number;
  apDown: number;
  apRefract: number;
  apSummary: number;
  ivPanel: number;
  ivPeaks: number;
  ivLine: number;
  ivBends: number;
  ivReverse: number;
  /** After the action potential: why the ions must be pumped back; the view closing in on the sodium–potassium pump in
   * the membrane, named; its round — three sodium ions out, two potassium ions in, one ATP; the charge it moves; and the
   * energy it uses. */
  pumpNeed: number;
  onPump: number;
  pumpNamed: number;
  pumping: number;
  netCharge: number;
  atpCost: number;
  ap: number;
  inputs: number;
  thresh: number;
  gated: number;
  upstroke: number;
  downstroke: number;
  spikeNamed: number;
  first: number;
  /** The membrane giving way to two neurons, each named; a spike running down the one's axon to the other; where they
   * meet, named a synapse; the view diving in on it, and its parts named; closer in, on the cleft and the dendrite
   * under it; the transmitter released; bound to the receptors; their channels opening; and ions flowing in through
   * them, chloride turned away. */
  scene: number;
  cells: number;
  /** Before the synapse: two ways to inject current into this neuron, an electrode at its body and an ion channel in
   * its dendrite, each named; and, close in, that channel named. Then the other neuron, and all of the synapse, come
   * in with it. */
  inject: number;
  chan: number;
  other: number;
  spike: number;
  contact: number;
  dive: number;
  parts: number;
  onCleft: number;
  release: number;
  bind: number;
  opening: number;
  inflow: number;
  /** The transmitter named glutamate, and its receptors AMPA; potassium flowing out through them as sodium flows in;
   * the view backing out a little to make room below; and there, the two currents on a line of potentials, cancelling
   * between the two reversal potentials. */
  glutamate: number;
  kout: number;
  room: number;
  currents: number;
  /** The view sliding down onto the dendrite; the negative charge lining its membrane inside, round the synapse,
   * partly neutralized, and the positive charge outside reduced; the potential there rising; the potassium ions nearest
   * pushed away from it; and those in the dendrite pushed along it, both ways. */
  low: number;
  excess: number;
  rise: number;
  repelled: number;
  axial: number;
  /** Positive charge collecting on the dendrite's membrane along it, thinning with distance; the potential at the
   * synapse on a plot below, falling fast as the charge spreads; potassium leaking out through its channels on the way,
   * the slower fall, with τ_m; the same at the soma, smaller and slower; and the rise in potential named at points along
   * the dendrite, falling off. */
  accum: number;
  quick: number;
  leaks: number;
  slow: number;
  soma: number;
  ticks: number;
  /** How fast it all happens: a plot below the synapse, its time axis `span` ms long; glutamate cleared from the cleft
   * by transporters; the AMPA receptors' current; glutamate held, and the receptors desensitized; how the decay differs
   * from synapse to synapse and with temperature; and the voltage, slower, charging the membrane. And, after the
   * glutamate is cleared: the AMPA current, decaying within a few ms; how briefly the receptors are open, the voltage rising only while they are; how fast it rises
   * through channels of less resistance and of more; one rise, its time constant τ = R × C marked where it is 63% of
   * the way up; the reversal potential it is headed for, the gap to it, and the current, the gap over the resistance,
   * falling as it closes; and the rate of rise, I / C, steep at first and then shallower. */
  kinetics: number;
  span: number;
  clear: number;
  epsc: number;
  brief: number;
  resist: number;
  rc: number;
  /** The membrane as a capacitor, on a panel below: the charge either side for 1 volt, as much as it holds per volt;
   * thinner, and more charge for the same volt; and its area, thickness and dielectric constant named, C = ε × A / d. */
  cap: number;
  thin: number;
  eps: number;
  ohm: number;
  slope: number;
  current: number;
  desens: number;
  types: number;
  volt: number;
}

/** From slide 31 on: the whole membrane, as slide 29 backed out to, lined with pairs, potassium's concentrations named
 * each side. */
const LINED: Partial<Pose> = {
  focus: 1,
  crowd: 1,
  channels: 1,
  stated: 1,
  open: 1,
  alone: 1,
  leaveMs: 1e6,
  pull: 1,
  recentre: 1,
  conc: 1,
  sheet: 1,
};
/** Potassium's concentrations, mM, as the reader sets them on the slide about what they determine, eased there; the
 * charge lining the membrane, catching up; and the first pair, the ion that left first and the one it drew, together at
 * the membrane (1) or parted, each back where it came from (0). */
export interface Concentrations {
  cin: number;
  cout: number;
  charge: number;
  lone: number;
}
const AS_IS: Concentrations = { cin: CONC.K.in, cout: CONC.K.out, charge: 1, lone: 1 };
/** About how much of the charge one pair stands for: below it, the first pair parts. */
const ONE_PAIR = 1 / 30;
/** An order for `n` places in a row by which each first few are about evenly spaced along it, its ends reached early:
 * the middle; then the quarters; then the eighths, the outermost first; and so on, halving. */
function spreadOrder(n: number) {
  const order: number[] = [];
  const taken = new Set<number>();
  for (let parts = 2; order.length < n; parts *= 2) {
    const level = Array.from({ length: parts / 2 }, (_, i) => (2 * i + 1) / parts).sort(
      (a, b) => Math.abs(b - 0.5) - Math.abs(a - 0.5) || a - b
    );
    for (const v of level) {
      const i = Math.min(n - 1, Math.floor(v * n));
      if (taken.has(i)) continue;
      taken.add(i);
      order.push(i);
    }
  }
  return order;
}
/** A potassium ion through the channel on that slide: how long since it set off, ms; which way; which side of the pore
 * it comes from; and its number. */
interface Crossing {
  age: number;
  inward: boolean;
  side: number;
  j: number;
}
/** How long between potassium ions through the channel each way there, about, at 140 and 5 mM, ms. */
const CROSSING_MS = 1800;
/** On the slide about a membrane potential away from E_K, mV, at ms into the round: at E_K; 29 mV less negative; back;
 * 29 mV more negative; and back. */
const SWING: [number, number][] = [
  [0, E_K],
  [900, E_K],
  [2000, E_K + 29],
  [3800, E_K + 29],
  [4900, E_K],
  [5600, E_K],
  [6700, E_K - 29],
  [8500, E_K - 29],
  [9600, E_K],
];
/** The channel close in, open, sodium flowing in through it: as the slide about its sodium leaves it. */
const CHANNEL_OPEN: Partial<Pose> = {
  scene: 1,
  cells: 1,
  dive: 1,
  parts: 1,
  chan: 1,
  opening: 1,
  inflow: 1,
};
/** The synapse close in, at work, its receptors opening: as the slide about that leaves it. */
const SYNAPSE_OPEN: Partial<Pose> = {
  other: 1,
  scene: 1,
  cells: 1,
  dive: 1,
  parts: 1,
  spike: 1,
  release: 1,
  bind: 1,
  opening: 1,
  inflow: 1,
};
/** The last picture of the membrane, at rest, kept under the two neurons as they come in over it. */
const AT_REST: Partial<Pose> = {
  ...LINED,
  conc: 0,
  focus: 0,
  listed: 1,
  panel: 1,
  vm: V_REST,
  weighted: 1,
  nearer: 1,
};
/** Close in on the voltage-gated sodium channel, named a protein: as the slide that closes in leaves it. */
const CLOSE_UP: Partial<Pose> = { ...AT_REST, panel: 0, active: 1, closeUp: 1, protein: 1 };
/** And its sensors, the field holding them in, and the potential stepped up, on the plot below: from activation on. */
const STEPPED: Partial<Pose> = { ...CLOSE_UP, sensors: 1, field: 1, stepV: 1, plot: 1 };
/** And everything about it but the second step too soon: as the slide about recovery leaves it. */
const SODIUM_DONE: Partial<Pose> = { ...STEPPED, act: 1, deact: 1, lid: 1, inact: 1, recov: 1 };
/** All of the active channels, behind the voltage clamp's plots: as the slide about many channels together leaves it. */
const CHARACTERIZED: Partial<Pose> = {
  ...SODIUM_DONE,
  ligand: 1,
  binding: 1,
  desen: 1,
  flicker: 1,
  many: 1,
};
/** The action potential's own plots, in front of the membrane at rest. */
const AP_PLOTS: Partial<Pose> = { ...AT_REST, panel: 0, apPanel: 1 };
/** Close in on one spike, its inputs and threshold marked, its conductances and channels shown: from the rise on. */
const AP_MECHANISM: Partial<Pose> = {
  ...AP_PLOTS,
  apZoom: 1,
  apInputs: 1,
  apThresh: 1,
  apGated: 1,
};
/** The action potential going round, its spike named: as the slide that names it leaves it. */
const SPIKING: Partial<Pose> = {
  ap: 1,
  inputs: 1,
  thresh: 1,
  gated: 1,
  upstroke: 1,
  downstroke: 1,
  spikeNamed: 1,
};
/** Close in on the pump, named: as the slide that closes in on it leaves it. */
const PUMP_CLOSE: Partial<Pose> = {
  ...AT_REST,
  panel: 0,
  gated: 1,
  pumpNeed: 1,
  onPump: 1,
  closeUp: 1,
  pumpNamed: 1,
};
/** On the last slide about potassium alone, mV, at ms into the round: up to −70 mV, held, and back down to E_K as
 * potassium flows out, held there. */
const SETTLE: [number, number][] = [
  [0, E_K],
  [700, EXAMPLE_MV],
  [2000, EXAMPLE_MV],
  [5000, E_K],
  [6500, E_K],
];
/** On the slide about the reversal potentials' pulls, the membrane potential knocked away from rest — up to −30 mV, then
 * down to −110 — each at ms into the round, and drawn back each time, falling off with this time constant, ms. */
const KICKS: [number, number][] = [
  [0, -30],
  [4200, -110],
];
const KICK_ROUND = 8400;
const KICK_TAU = 650;
function kickedAt(ms: number) {
  const s = ((ms % KICK_ROUND) + KICK_ROUND) % KICK_ROUND;
  const [at, to] = s < KICKS[1][0] ? KICKS[0] : KICKS[1];
  const since = s - at;
  // knocked there in a moment, then drawn back
  if (since < 250) return lerp(V_REST, to, smooth(since / 250));
  return V_REST + (to - V_REST) * Math.exp(-(since - 250) / KICK_TAU);
}
/** Where keyframes of [ms, value] put the value `ms` into their round — the last's ms — eased from each to the next, in
 * proportion if `log`. */
function keyed(keys: [number, number][], ms: number, log = false) {
  const round = keys[keys.length - 1][0];
  const s = ((ms % round) + round) % round;
  let j = 0;
  while (j < keys.length - 2 && s > keys[j + 1][0]) j++;
  const [[ta, va], [tb, vb]] = [keys[j], keys[j + 1]];
  const e = smooth(clamp01((s - ta) / (tb - ta)));
  return log ? Math.exp(lerp(Math.log(va), Math.log(vb), e)) : lerp(va, vb, e);
}

/**
 * The active channels' round, ms by the page's clock, slowed far down (a sodium channel opens within a fraction of a
 * millisecond of the potential rising, and inactivates within about one): the membrane potential stepped up from rest
 * for two seconds — and, on the slide about a second rise too soon, again half a second after — to this, mV; and the
 * ligand there, for a second, or, on the slide about desensitization, for three.
 */
const ACT_MS = 6000;
const V_STEPS: [number, number][] = [
  [800, 2800],
  [3300, 4300],
];
const V_STEPPED = -20;
const BOUND: [number, number][] = [[800, 1900]];
const BOUND_LONG: [number, number][] = [[800, 3800]];
/** Where something that relaxes towards 1 while it is on and back towards 0 while it is off has got, `ms` into the
 * round: from 0 at the round's start, with these time constants, ms, rising and falling. */
function relaxAt(ms: number, on: [number, number][], up: number, down: number) {
  let [x, at] = [0, 0];
  const until = (to: number, rising: boolean) => {
    x = Number(rising) + (x - Number(rising)) * Math.exp(-(to - at) / (rising ? up : down));
    at = to;
  };
  for (const [from, to] of on) {
    if (ms <= from) {
      until(ms, false);
      return x;
    }
    until(from, false);
    if (ms <= to) {
      until(ms, true);
      return x;
    }
    until(to, true);
  }
  until(ms, false);
  return x;
}
/**
 * The voltage-gated sodium channel close in, `ms` into the round, the potential stepped up once — or, `twice` of the
 * way, twice — and its second gate at work (`k`): the membrane potential, mV; how far out its voltage sensors have
 * moved, quickly; how open its gate is, following them; and how far its second gate has swung into the pore — as one
 * channel's does, all at once, soon after it opens, and out again slowly once the potential is back down. And so how
 * open its pore is.
 */
function sodiumAt(ms: number, twice = 0, k = 1) {
  const both = (up: number, down: number) =>
    lerp(relaxAt(ms, V_STEPS.slice(0, 1), up, down), relaxAt(ms, V_STEPS, up, down), twice);
  const act = both(120, 250);
  const lid = k * smooth(clamp01((both(500, 1200) - 0.3) / 0.4));
  return {
    v: lerp(V_REST, V_STEPPED, both(40, 60)),
    sensors: both(70, 140),
    act,
    lid,
    open: act * (1 - lid),
  };
}
/**
 * The ligand-gated channel close in, `ms` into the round, its ligand there briefly — or, `long` of the way, for longer —
 * and desensitizing (`k`): how far the ligand has come down into its binding sites, and gone again; how open the gate
 * is, following it; how desensitized, all at once once it has been bound a while, and back slowly once it has gone; and
 * so how open its pore is.
 */
function ligandAt(ms: number, long = 0, k = 1) {
  const both = (f: (windows: [number, number][]) => number) => lerp(f(BOUND), f(BOUND_LONG), long);
  const docked = both((windows) =>
    Math.max(
      ...windows.map(
        ([from, to]) => smooth(clamp01((ms - from) / 250)) * (1 - smooth(clamp01((ms - to) / 300)))
      )
    )
  );
  // (the gate following the ligand once it is in place)
  const later = (windows: [number, number][]) =>
    windows.map(([from, to]): [number, number] => [from + 200, to]);
  const act = both((windows) => relaxAt(ms, later(windows), 100, 200));
  const numb =
    k * smooth(clamp01((both((windows) => relaxAt(ms, later(windows), 700, 1500)) - 0.3) / 0.4));
  return { docked, act, numb, open: act * (1 - numb) };
}
/**
 * For the slides about chance: 120 sodium channels through the round's one step up, each a seeded walk between its
 * states — 0 closed, 1 open, 2 inactivated — taken every 5 ms. At rest, one rarely opens, shuts again quickly, and
 * recovers from inactivation after about 450 ms; while the potential is up, it opens after about 70 ms, shuts again after
 * about 220 open, or inactivates after about 320. The first — the one drawn close in — opens three times before it
 * inactivates, and recovers 660 ms after the step. And the share of them all open, through the round.
 */
const CHANCE_DT = 5;
const CHANCES: Uint8Array[] = Array.from({ length: 120 }, (_, n) => {
  const rnd = mulberry32(776 + n);
  const states = new Uint8Array(ACT_MS / CHANCE_DT);
  let s = 0;
  for (let i = 0; i < states.length; i++) {
    const up = i * CHANCE_DT >= V_STEPS[0][0] && i * CHANCE_DT < V_STEPS[0][1];
    let rates: [number, number][] = [];
    if (s === 0) rates = [[1, up ? 1 / 70 : 1 / 30000]];
    else if (s === 1)
      rates = up
        ? [
            [0, 1 / 220],
            [2, 1 / 320],
          ]
        : [[0, 1 / 30]];
    else if (!up) rates = [[0, 1 / 450]];
    const total = rates.reduce((sum, [, r]) => sum + r, 0);
    if (total > 0 && rnd() < 1 - Math.exp(-total * CHANCE_DT)) {
      let pick = rnd() * total;
      for (const [to, r] of rates) {
        pick -= r;
        if (pick <= 0) {
          s = to;
          break;
        }
      }
    }
    states[i] = s;
  }
  return states;
});
/** The share of them open, every 5 ms, averaged over 55 ms. */
const SHARE_OPEN = (() => {
  const raw = Array.from(
    { length: ACT_MS / CHANCE_DT },
    (_, i) => CHANCES.reduce((sum, states) => sum + Number(states[i] === 1), 0) / CHANCES.length
  );
  return raw.map((_, i) => {
    const near = raw.slice(Math.max(0, i - 5), i + 6);
    return near.reduce((sum, v) => sum + v, 0) / near.length;
  });
})();
/** The first one's changes of state: [ms, state], from the round's start. */
const CHANCE_FIRST: [number, number][] = (() => {
  const changes: [number, number][] = [[0, 0]];
  CHANCES[0].forEach((s, i) => {
    if (s !== changes[changes.length - 1][1]) changes.push([i * CHANCE_DT, s]);
  });
  return changes;
})();
/** The share of the 120 open, `ms` into the round; and one of them, the `n`th, open (1) or not (0). */
const shareOpenAt = (ms: number) =>
  SHARE_OPEN[Math.min(SHARE_OPEN.length - 1, Math.max(0, Math.floor(ms / CHANCE_DT)))];
const oneOpenAt = (n: number, ms: number) =>
  Number(
    CHANCES[n][Math.min(ACT_MS / CHANCE_DT - 1, Math.max(0, Math.floor(ms / CHANCE_DT)))] === 1
  );
/** The first one, the one drawn close in, `ms` into the round: how open its gate is and how far its second gate is in,
 * each eased over 60 ms from the state before — its gate following its sensors while it is inactivated. */
function chanceAt(ms: number) {
  let j = 0;
  while (j < CHANCE_FIRST.length - 1 && CHANCE_FIRST[j + 1][0] <= ms) j++;
  const [since, s] = CHANCE_FIRST[j];
  const was = j > 0 ? CHANCE_FIRST[j - 1][1] : 0;
  const e = smooth(clamp01((ms - since) / 60));
  const sensors = sodiumAt(ms).sensors;
  const gate = (state: number) => (state === 1 ? 1 : state === 2 ? sensors : 0);
  const act = lerp(gate(was), gate(s), e);
  const lid = lerp(Number(was === 2), Number(s === 2), e);
  return { act, lid, open: act * (1 - lid) };
}

/**
 * For the slides about a channel's current–voltage curve: Hodgkin and Huxley's sodium channels (the squid axon at
 * 6.3 °C, their rates in today's convention), with sodium's reversal potential here. Held at rest and stepped, at the
 * start of a 5 ms window, to each of seven potentials, mV: how open they are (m³h) `t` ms into a step to V; and, at each
 * potential from −90 to +100 mV, the peak of that, as a share of the most it reaches anywhere, and the peak current it
 * passes — conductance times driving force — as a share of the largest inward one.
 */
const IV_STEPS = [-60, -35, -10, 15, 40, 65, 90];
const IV_WINDOW = 5;
function sodiumRates(V: number) {
  const am = Math.abs(V + 40) < 1e-6 ? 1 : (0.1 * (V + 40)) / (1 - Math.exp(-(V + 40) / 10));
  const bm = 4 * Math.exp(-(V + 65) / 18);
  const ah = 0.07 * Math.exp(-(V + 65) / 20);
  const bh = 1 / (1 + Math.exp(-(V + 35) / 10));
  return { m: am / (am + bm), tm: 1 / (am + bm), h: ah / (ah + bh), th: 1 / (ah + bh) };
}
function openAfter(V: number, t: number) {
  const [from, to] = [sodiumRates(V_REST), sodiumRates(V)];
  const m = to.m + (from.m - to.m) * Math.exp(-t / to.tm);
  const hh = to.h + (from.h - to.h) * Math.exp(-t / to.th);
  return m * m * m * hh;
}
const IV_CURVE = (() => {
  const peak = (V: number) => {
    let best = 0;
    for (let t = 0; t <= IV_WINDOW; t += 0.02) best = Math.max(best, openAfter(V, t));
    return best;
  };
  const points = Array.from({ length: 191 }, (_, i) => ({ v: i - 90, g: peak(i - 90), i: 0 }));
  const most = Math.max(...points.map((p) => p.g));
  for (const p of points) {
    p.g /= most;
    p.i = p.g * (p.v - EQUILIBRIUM.Na);
  }
  const largest = Math.max(...points.map((p) => -p.i));
  for (const p of points) p.i /= largest;
  return { points, most, largest };
})();
/** The current `t` ms into a step to V, as a share of the largest inward peak; and its peak, on the curve. */
const currentAfter = (V: number, t: number) =>
  ((openAfter(V, t) / IV_CURVE.most) * (V - EQUILIBRIUM.Na)) / IV_CURVE.largest;
const ivAt = (V: number) => {
  const p = IV_CURVE.points;
  const j = Math.min(p.length - 2, Math.max(0, Math.floor(V + 90)));
  const f = clamp01(V + 90 - j);
  return { g: lerp(p[j].g, p[j + 1].g, f), i: lerp(p[j].i, p[j + 1].i, f) };
};
/** Each step's colour: one hue, sodium's orange, light to dark as the potential rises on a light page, and dark to light
 * on a dark one (each run checked: steps a reader can tell apart, the faintest still clear of the page). */
const stepColour = (L: Look, j: number) =>
  mix(
    L.dark ? [124, 45, 18] : [242, 155, 109],
    L.dark ? [254, 215, 170] : [106, 39, 16],
    j / (IV_STEPS.length - 1)
  );

/**
 * The sodium–potassium pump's round, ms, the same length as the active channels': its two halves open to the inside
 * (0) or to the outside (1), shut to both halfway; three sodium ions coming from inside into its middle; ATP arriving at
 * its foot, and its phosphate taken on as ADP goes; the halves turning to open outside, the sodium let go there; two
 * potassium ions coming in from outside; the phosphate let go; the halves turning back, and the potassium let go
 * inside. Each one's way, design px from the pump's middle, at ms into the round, and how much of it shows.
 */
type Way = [number, number, number][];
const PUMP_NA: Way[] = [-12, 0, 12].map((x, j) => [
  [0, x, 46],
  [650, [-2.4, 2.4, 0][j], [-2.5, -2.5, 3][j]],
  [2000, [-2.4, 2.4, 0][j], [-2.5, -2.5, 3][j]],
  [2650, x * 1.2, -46],
]);
const PUMP_K: Way[] = [-9, 9].map((x, j) => [
  [2400, x, -46],
  [3050, [-2.3, 2.3][j], 0],
  [4100, [-2.3, 2.3][j], 0],
  [4750, x * 1.3, 46],
]);
const ATP_WAY: Way = [
  [600, 30, 50],
  [1050, 17.5, 33],
];
const ADP_WAY: Way = [
  [1250, 17.5, 33],
  [1900, 32, 50],
];
const PHOSPHATE_WAY: Way = [
  [3150, 8.5, 27.5],
  [3800, -20, 48],
];
/** Where along such a way, `ms` into the round, and how much shows — fading in at its start and out at its end, unless
 * it is held (`hold`) at either. */
function pumpWay(
  way: Way,
  ms: number,
  hold: [boolean, boolean] = [false, false]
): [number, number, number] {
  const [t0, t1] = [way[0][0], way[way.length - 1][0]];
  if (ms < t0 || ms > t1) return [0, 0, 0];
  let j = 0;
  while (j < way.length - 2 && ms > way[j + 1][0]) j++;
  const [[ta, xa, ya], [tb, xb, yb]] = [way[j], way[j + 1]];
  const e = smooth(clamp01((ms - ta) / (tb - ta)));
  const shown = Math.min(
    hold[0] ? 1 : clamp01((ms - t0) / 200),
    hold[1] ? 1 : clamp01((t1 - ms) / 220)
  );
  return [lerp(xa, xb, e), lerp(ya, yb, e), shown];
}
/** How far the pump's halves have turned to open outside, `ms` into the round. */
const pumpFace = (ms: number) =>
  smooth(clamp01((ms - 1350) / 600)) * (1 - smooth(clamp01((ms - 3450) / 600)));
/** Whether its phosphate is on it. */
const phosphorylated = (ms: number) => ms >= 1250 && ms < 3150;

/**
 * For the slides about the action potential: Hodgkin and Huxley's model of a patch of membrane — its sodium,
 * potassium and leak conductances, mS/cm², the squid axon's kinetics at 6.3 °C, and the reversal potentials here, the
 * leak's set so that it rests at the resting potential — given inputs from synapses, each a brief inward current
 * (ms, and its peak, µA/cm²), stepped every 0.01 ms. Every 0.1 ms of it: the membrane potential, mV; sodium's and
 * potassium's conductances; and how far sodium's channels are from inactivated (h).
 */
const HH_G = { Na: 120, K: 36, L: 0.3 };
const potassiumRates = (V: number) => {
  const an = Math.abs(V + 55) < 1e-6 ? 0.1 : (0.01 * (V + 55)) / (1 - Math.exp(-(V + 55) / 10));
  const bn = 0.125 * Math.exp(-(V + 65) / 80);
  return { n: an / (an + bn), tn: 1 / (an + bn) };
};
const HH_REST = { ...sodiumRates(V_REST), n: potassiumRates(V_REST).n };
const HH_LEAK =
  V_REST +
  (HH_G.Na * HH_REST.m ** 3 * HH_REST.h * (V_REST - EQUILIBRIUM.Na) +
    HH_G.K * HH_REST.n ** 4 * (V_REST - EQUILIBRIUM.K)) /
    HH_G.L;
interface Run {
  v: number[];
  na: number[];
  k: number[];
  h: number[];
}
function hhRun(inputs: [number, number][], ms: number): Run {
  const dt = 0.01;
  let [V, { m, h }, { n }] = [V_REST, HH_REST, HH_REST];
  const run: Run = { v: [], na: [], k: [], h: [] };
  for (let i = 0; i <= ms / dt; i++) {
    const t = i * dt;
    let I = 0;
    for (const [t0, peak] of inputs) {
      const s = (t - t0) / 0.8;
      if (s > 0) I += peak * s * Math.exp(1 - s);
    }
    const na = sodiumRates(V);
    const kr = potassiumRates(V);
    m += (dt * (na.m - m)) / na.tm;
    h += (dt * (na.h - h)) / na.th;
    n += (dt * (kr.n - n)) / kr.tn;
    const [gNa, gK] = [HH_G.Na * m ** 3 * h, HH_G.K * n ** 4];
    V += dt * (I - gNa * (V - EQUILIBRIUM.Na) - gK * (V - EQUILIBRIUM.K) - HH_G.L * (V - HH_LEAK));
    if (i % 10 === 0) {
      run.v.push(V);
      run.na.push(gNa);
      run.k.push(gK);
      run.h.push(h);
    }
  }
  return run;
}
/** Three inputs, 3 and 2 ms apart, each a few millivolts on its own: the first two alone peak 6 mV short of threshold,
 * the third takes it past. */
const burstAt = (t0: number, peak = 5.6): [number, number][] => [
  [t0, peak],
  [t0 + 3, peak],
  [t0 + 5, peak],
];
/**
 * The runs the slides show: the one followed — three inputs taking it past threshold, a spike at about 10 ms, and three
 * more bursts of inputs, 25 ms apart, firing three spikes more; the first two inputs only, short of threshold; one
 * input of each of four sizes, the smallest firing nothing and the others a spike each, sooner the bigger; and the
 * spike, then a strong input 4 ms after it, in the refractory period, firing nothing.
 */
const AP_RUN = hhRun([...burstAt(3), ...burstAt(28), ...burstAt(53), ...burstAt(78)], 100);
const AP_SHORT = hhRun(burstAt(3).slice(0, 2), 30);
const AP_SIZES = [6, 10, 18, 36].map((peak) => hhRun([[3, peak]], 30));
const AP_LATE = hhRun([...burstAt(3), [14, 40]], 30);
/** A run's value `t` ms in, between its samples. */
const runAt = (series: number[], t: number) => {
  const j = Math.min(series.length - 2, Math.max(0, Math.floor(t / 0.1)));
  return lerp(series[j], series[j + 1], clamp01(t / 0.1 - j));
};
const AP_MOST = { Na: Math.max(...AP_RUN.na), K: Math.max(...AP_RUN.k) };

/** The membrane potential an action potential sets off from, mV. */
const THRESHOLD = -55;
/**
 * The action potential's round, ms by the page's clock, slowed far down and not to scale: three inputs from synapses,
 * the third taking the membrane past threshold; the spike, up as sodium channels open and back down past rest as they
 * shut and potassium channels open; and rest. Through it, the membrane potential, mV; and how many times its resting
 * conductance sodium's is, and potassium's.
 */
const AP_MS = 6000;
const AP_INPUTS = [600, 1400, 2000];
const AP_PEAK = 2380;
const AP_V: [number, number][] = [
  [0, V_REST],
  [600, V_REST],
  [760, V_REST + 6.5],
  [1400, V_REST + 3],
  [1560, V_REST + 11],
  [2000, V_REST + 8],
  [2160, THRESHOLD],
  [AP_PEAK, 30],
  [2900, -82],
  [4300, V_REST],
  [AP_MS, V_REST],
];
const AP_NA: [number, number][] = [
  [0, 1],
  [2160, 1],
  [2260, 40],
  [2420, 6],
  [2650, 1],
  [AP_MS, 1],
];
const AP_K: [number, number][] = [
  [0, 1],
  [2300, 1],
  [2550, 3.5],
  [3000, 3],
  [4300, 1],
  [AP_MS, 1],
];
/** How open, through the round: the voltage-gated sodium channel, opening fast past threshold and soon shut again; the
 * voltage-gated potassium channel, opening later and staying open longer; and the receptor, a moment at each input. */
const naGateAt = (ms: number) => bump(ms, 2140, 2440, 60);
const kGateAt = (ms: number) => bump(ms, 2320, 3400, 160);
const receptorAt = (ms: number) => Math.max(...AP_INPUTS.map((t0) => bump(ms, t0, t0 + 280, 60)));

/** A step's picture, `t` ms into it and `typed` ms after its words typed out. */
function poseFor(step: Physics2Step, t: number, typed: number, set: Concentrations = AS_IS): Pose {
  const P: Pose = {
    drawn: 1,
    lens: 0,
    named: 1,
    sides: 1,
    ions: 1,
    key: 1,
    pairs: 0,
    dim: 0,
    split: 0,
    flowing: 0,
    balanced: 0,
    tally: 0,
    focus: 0,
    crowd: 0,
    counted: 0,
    channels: 0,
    open: 0,
    walk: 0,
    walkMs: 0,
    big: 0,
    lines: 0,
    dock: 1,
    barrier: 0,
    gating: 0,
    stated: 0,
    random: 0,
    flux: 0,
    term: 0,
    net: 0,
    bare: 0,
    drainMs: 0,
    spread: 0,
    recharge: 0,
    alone: 0,
    leaveMs: 0,
    imbalance: 0,
    zoom: 0,
    pull: 0,
    pulled: 0,
    closer: 0,
    recentre: 0,
    fieldK: 0,
    fieldN: 0,
    lower: 0,
    probe: 0,
    across: 0,
    onChannel: 0,
    sheet: 0,
    balance: 0,
    enter: 0,
    points: 0,
    work: 0,
    attempt: 0,
    denser: 0,
    selective: 0,
    passive: 0,
    leak: 0,
    water: 0,
    fast: 0,
    reveal: 0,
    quiet: 0,
    waves: 1,
    conc: 0,
    cin: CONC.K.in,
    cout: CONC.K.out,
    vary: 0,
    charge: 1,
    others: 1,
    crossing: 0,
    captions: 1,
    vm: E_K,
    units: 0,
    inward: 0,
    freed: 0,
    signed: 0,
    surplus: 0,
    hidden: 0,
    levels: 0,
    stored: 0,
    perUnit: 0,
    plate: 0,
    valued: 0,
    meter: 0,
    energy: 0,
    even: 0,
    own: 0,
    netFlow: 0,
    example: 0,
    listed: 0,
    marked: 0,
    panel: 0,
    weighted: 0,
    nearer: 0,
    active: 0,
    closeUp: 0,
    onLigand: 0,
    protein: 0,
    swing: 0,
    sensors: 0,
    field: 0,
    stepV: 0,
    plot: 0,
    act: 0,
    deact: 0,
    lid: 0,
    inact: 0,
    recov: 0,
    twice: 0,
    ligand: 0,
    binding: 0,
    desen: 0,
    states: 0,
    flicker: 0,
    many: 0,
    apPanel: 0,
    apZoom: 0,
    apInputs: 0,
    apThresh: 0,
    apSizes: 0,
    apGated: 0,
    apUp: 0,
    apPeak: 0,
    apDown: 0,
    apRefract: 0,
    apSummary: 0,
    ivPanel: 0,
    ivPeaks: 0,
    ivLine: 0,
    ivBends: 0,
    ivReverse: 0,
    pumpNeed: 0,
    onPump: 0,
    pumpNamed: 0,
    pumping: 0,
    netCharge: 0,
    atpCost: 0,
    ap: 0,
    inputs: 0,
    thresh: 0,
    gated: 0,
    upstroke: 0,
    downstroke: 0,
    spikeNamed: 0,
    first: 0,
    scene: 0,
    cells: 0,
    inject: 0,
    chan: 0,
    other: 0,
    spike: 0,
    contact: 0,
    dive: 0,
    parts: 0,
    onCleft: 0,
    release: 0,
    bind: 0,
    opening: 0,
    inflow: 0,
    glutamate: 0,
    kout: 0,
    room: 0,
    currents: 0,
    low: 0,
    excess: 0,
    rise: 0,
    repelled: 0,
    axial: 0,
    accum: 0,
    quick: 0,
    leaks: 0,
    slow: 0,
    soma: 0,
    ticks: 0,
    kinetics: 0,
    span: 5,
    clear: 0,
    epsc: 0,
    brief: 0,
    resist: 0,
    rc: 0,
    cap: 0,
    thin: 0,
    eps: 0,
    ohm: 0,
    slope: 0,
    current: 0,
    desens: 0,
    types: 0,
    volt: 0,
  };
  switch (step) {
    case 'lipids':
      // the membrane draws in, and is named; once the words have typed, a lens opens over a few lipids
      Object.assign(P, { sides: 0, ions: 0, key: 0, big: 1 });
      P.drawn = phase(t, 0, 1400);
      P.named = phase(t, 900, 600);
      P.lens = phase(typed, 300, 700);
      break;
    case 'membrane':
      Object.assign(P, { ions: 0, key: 0, big: 1 });
      P.sides = phase(typed, 200, 600);
      break;
    case 'water':
      // the sides' names shrinking to their places as the slide opens; the water filling them once the
      // words have typed
      Object.assign(P, { ions: 0, key: 0, big: 0 });
      P.water = phase(typed, 200, 1000);
      break;
    case 'charges':
      // the key, in its corner from the start, as the words start to type; the ions once they have
      P.key = phase(t, 0, 500);
      P.ions = phase(typed, 200, 900);
      break;
    case 'barrier':
      P.barrier = phase(typed, 200, 600);
      break;
    case 'forces':
      P.sides = 0;
      P.pairs = phase(typed, 200, 900);
      break;
    case 'flow':
      // the inside's ions sorted apart at once — an imbalance — then, once the words have typed, flowing back
      P.dim = 1;
      P.split = 1 - phase(typed, 1800, 2600);
      P.flowing = phase(typed, 1800, 300) * (1 - phase(typed, 4000, 400));
      P.balanced = phase(typed, 4300, 600);
      break;
    case 'neutral':
      P.tally = phase(typed, 200, 600);
      break;
    case 'potassium':
      P.focus = phase(typed, 200, 800);
      break;
    case 'gradient':
      P.focus = 1;
      P.crowd = phase(typed, 200, 1400);
      P.counted = phase(typed, 1000, 600);
      break;
    case 'channels':
      Object.assign(P, { focus: 1, crowd: 1 });
      P.channels = phase(typed, 200, 800);
      break;
    case 'gating':
      Object.assign(P, { focus: 1, crowd: 1, channels: 1 });
      P.gating = phase(typed, 200, 500);
      P.stated = P.gating;
      break;
    case 'selective':
      // potassium's channel open as well as opening, so that it stays open into the next slide
      Object.assign(P, { focus: 1, crowd: 1, channels: 1, stated: 1, open: 1 });
      P.selective = phase(typed, 200, 500);
      break;
    case 'diffusion':
      // the membrane fading to two plain lines as the slide opens; once the words have typed, potassium's channel opening
      // and one ion through it
      Object.assign(P, { focus: 1, crowd: 1, channels: 1, stated: 1 });
      P.lines = phase(t, 0, 1400);
      P.open = phase(typed, 200, 600);
      P.walk = phase(typed, 700, 500);
      // held still, caught in the pore
      P.walkMs = Number.isFinite(typed) ? typed - 700 : 3900;
      break;
    case 'passive':
      // potassium's channel open, as left, its ion gone; once the words have typed, the other two open as well — all
      // three held open from here on, as passive channels are
      Object.assign(P, { focus: 1, crowd: 1, channels: 1, stated: 1, open: 1 });
      P.passive = phase(typed, 200, 700);
      P.leak = phase(typed, 500, 700);
      break;
    case 'moving':
      // the channels open, passive, and every ion jostling, bumping into the others
      Object.assign(P, { focus: 1, crowd: 1, channels: 1, stated: 1 });
      P.random = phase(typed, 200, 600);
      P.fast = P.random;
      break;
    case 'random':
      // still jostling; then ions through potassium's channel, out and in, counted
      Object.assign(P, { focus: 1, crowd: 1, channels: 1, stated: 1, random: 1 });
      P.open = phase(typed, 200, 600);
      P.flux = phase(typed, 600, 400);
      break;
    case 'net':
      Object.assign(P, { focus: 1, crowd: 1, channels: 1, stated: 1, random: 1, open: 1, flux: 1 });
      P.net = phase(typed, 200, 700);
      break;
    case 'term':
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        random: 1,
        open: 1,
        flux: 1,
        net: 1,
      });
      P.term = phase(typed, 200, 700);
      break;
    case 'uncharged':
      // potassium's charge gone as the words type; once they have, its ions spreading out until the sides are even
      Object.assign(P, { focus: 1, crowd: 1, channels: 1, stated: 1, random: 1, open: 1 });
      P.bare = phase(t, 0, 500);
      P.spread = phase(typed, 0, 400);
      P.drainMs = Number.isFinite(typed) ? typed - 600 : 1e6;
      break;
    case 'charged':
      // the spreading undone — run back, between the slides — and, once the words have typed, the charge back
      Object.assign(P, { focus: 1, crowd: 1, channels: 1, stated: 1, random: 1, open: 1 });
      P.bare = 1 - phase(typed, 1100, 300);
      P.recharge = phase(typed, 1100, 1400);
      break;
    case 'imbalance':
      // the potassium ions inside greying as the words type, but for the one about to leave; once they have, that one out
      // through the channel, to rest close by the membrane; then the count, and the negative ion the next slides draw
      // to the membrane in its own colour
      Object.assign(P, { focus: 1, crowd: 1, channels: 1, stated: 1, open: 1, alone: 1 });
      P.quiet = phase(t, 0, 800);
      P.leaveMs = Number.isFinite(typed) ? typed - 400 : 1e6;
      P.imbalance = phase(typed, 2400, 600);
      P.reveal = P.imbalance;
      break;
    case 'moreOut':
    case 'moreIn':
      // the one potassium ion out, at rest, and each side's charges counted, as on the slide before; and the
      // negative ion the next slides draw to the membrane, in its own colour
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        imbalance: 1,
        reveal: 1,
        quiet: 1,
      });
      break;
    case 'attract':
      // close in on the channel as the words type; then a negative ion inside drawn to the membrane opposite the ion
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        reveal: 1,
        quiet: 1,
      });
      P.zoom = phase(t, 0, 1400);
      P.pull = phase(typed, 400, 1600);
      P.pulled = phase(typed, 1400, 600);
      break;
    case 'fieldK':
      // closer in, on the pair, as the words type; then the potassium ion's field, and its push and pull round it
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        zoom: 1,
        pull: 1,
        quiet: 1,
      });
      P.closer = phase(t, 0, 1200);
      P.fieldK = phase(typed, 300, 900);
      break;
    case 'fieldDef':
      // as close in, on the pair, the potassium ion's ripples gone; once the words have typed, its field as arrows all
      // round it, and a unit positive charge set down at one point after another, the force on it shown
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        zoom: 1,
        pull: 1,
        closer: 1,
        quiet: 1,
      });
      P.probe = phase(typed, 200, 800);
      break;
    case 'fieldN':
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        zoom: 1,
        pull: 1,
        closer: 1,
        quiet: 1,
        lower: 1,
      });
      P.fieldN = phase(typed, 300, 900);
      break;
    case 'across':
      // the pair, as close in, centred on them again; once the words have typed, their field across the membrane
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        zoom: 1,
        pull: 1,
        closer: 1,
        quiet: 1,
      });
      P.across = phase(typed, 200, 900);
      break;
    case 'sheet':
      // as close in as the two fields' slides, which show ions enough: no backing out; once the words have typed,
      // pairs lining the membrane, one after another, and their field across it
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        zoom: 1,
        pull: 1,
        closer: 1,
        recentre: 1,
      });
      P.sheet = phase(typed, 200, 1800);
      break;
    case 'stronger':
      // as close in as the slide before, lined; once the words have typed, potassium ions out through the channel one
      // after another, each joining those lining the membrane, and the field across it stronger
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        zoom: 1,
        pull: 1,
        closer: 1,
        recentre: 1,
        sheet: 1,
      });
      P.denser = phase(typed, 300, 3600);
      break;
    case 'pushed':
      // the pairs and their field, as left; once the words have typed, a potassium ion trying the channel and pushed back
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        zoom: 1,
        pull: 1,
        closer: 1,
        recentre: 1,
        sheet: 1,
      });
      P.attempt = phase(typed, 200, 600);
      break;
    case 'enter':
      // the last slide's picture, without the ion trying to leave; once the words type, one outside drawn in
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        zoom: 1,
        pull: 1,
        closer: 1,
        recentre: 1,
        sheet: 1,
      });
      P.enter = phase(typed, 200, 600);
      break;
    case 'voltage':
      // the whole membrane, lined, as left; once the words have typed, two points either side of it, and the voltage
      // between them
      Object.assign(P, LINED);
      P.points = phase(typed, 200, 900);
      break;
    case 'depends':
      // the two points and the voltage between them, as left, backing out from the channel to the lined membrane
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        zoom: 1,
        pull: 1,
        closer: 1,
        recentre: 1,
        sheet: 1,
      });
      P.points = 1;
      break;
    case 'work':
      // the two points, as left; then a positive charge carried from the inside one to the outside one, and the work
      // done on it, in joules, counted as it goes
      Object.assign(P, LINED, { points: 1 });
      P.work = phase(typed, 200, 600);
      break;
    case 'volts':
      // the two points, as left; once the words have typed, a positive charge carried from the inside one to the
      // outside one, and the work done on it, in joules, counted as it goes; then the voltage between the points in
      // volts: joules of work per coulomb of charge
      Object.assign(P, LINED, { points: 1 });
      P.work = phase(typed, 200, 600);
      P.units = phase(typed, 2000, 2700);
      break;
    case 'potential':
      // as left, until the words have typed; then the work's bar going, and a charge carried the other way, from the
      // outside to the inside: the membrane potential
      Object.assign(P, LINED, { points: 1, units: 1 });
      P.work = 1 - phase(typed, 0, 500);
      P.inward = phase(typed, 300, 700);
      break;
    case 'freeIn':
      // the charge carried in from outside, as left; once the words have typed, pulled in by the field rather than
      // carried, the energy it gives up a glow round it and a bar beside the channel filling as it goes
      Object.assign(P, LINED, { points: 1, units: 1, inward: 1 });
      P.freed = phase(typed, 200, 600);
      break;
    case 'negative':
      // as left; once the words have typed, that energy told as the work done on the charge, negative, and the membrane
      // potential's value: the work per unit of charge, negative too
      Object.assign(P, LINED, { points: 1, units: 1, inward: 1, freed: 1 });
      P.signed = phase(typed, 200, 700);
      break;
    case 'surplus':
      // as left, until the words have typed; then the charge and its bar going, and the negative charge lining the
      // inside picked out and named, the membrane potential's value beside it
      Object.assign(P, LINED, { points: 1, units: 1, inward: 1, signed: 1 });
      P.freed = 1 - phase(typed, 0, 500);
      P.surplus = phase(typed, 300, 900);
      P.hidden = P.surplus;
      break;
    case 'potentialEnergy':
      // as left, until the words have typed; then the inside's negative charge let be, and a positive charge at each
      // point, the potential energy it has there named, and their difference
      Object.assign(P, LINED, { points: 1, units: 1, inward: 1, signed: 1, hidden: 1 });
      P.surplus = 1 - phase(typed, 0, 500);
      P.levels = phase(typed, 300, 700);
      break;
    case 'stored':
      // as left; once the words have typed, the charge outside glowing with the energy it would give up coming in, an
      // arrow the way it would go; the one inside without
      Object.assign(P, LINED, { points: 1, units: 1, inward: 1, signed: 1, hidden: 1, levels: 1 });
      P.stored = phase(typed, 200, 700);
      break;
    case 'perCharge':
      // as left; once the words have typed, that difference per unit of charge worked out: the membrane potential, its
      // badge lit
      Object.assign(P, LINED, {
        points: 1,
        units: 1,
        inward: 1,
        signed: 1,
        hidden: 1,
        levels: 1,
        stored: 1,
      });
      P.perUnit = phase(typed, 200, 700);
      break;
    case 'equilibrium':
      // as left, until the words have typed; then the points going, the two pushes at the channel back, balanced, and
      // the potential at which they are, named in the corner
      Object.assign(P, LINED, { hidden: 1 });
      P.points = 1 - phase(typed, 0, 500);
      P.units = P.points;
      P.inward = P.points;
      P.signed = P.points;
      P.levels = P.points;
      P.stored = P.points;
      P.perUnit = P.points;
      P.balance = phase(typed, 300, 1200);
      P.plate = phase(typed, 1000, 600);
      break;
    case 'reversal':
      Object.assign(P, LINED, { balance: 1, plate: 1 });
      P.valued = phase(typed, 200, 700);
      break;
    case 'energy':
      // the pushes giving way; once the words have typed, a potassium ion drawn in through the channel, then one carried
      // out through it, in turn, with the energy each gives up or needs
      Object.assign(P, LINED, { plate: 1, valued: 1 });
      P.energy = phase(typed, 200, 600);
      break;
    case 'noNet':
      // once the words have typed, the pushes back, balanced; the membrane potential under E_K in the corner, the two
      // marked on a line, at one place; and potassium ions through the channel, as often in as out
      Object.assign(P, LINED, { plate: 1, valued: 1 });
      P.balance = phase(typed, 200, 900);
      P.meter = phase(typed, 200, 700);
      P.even = phase(typed, 900, 600);
      break;
    case 'specific':
      Object.assign(P, LINED, { plate: 1, valued: 1, meter: 1, balance: 1 });
      P.own = phase(typed, 200, 700);
      break;
    case 'differs':
      // once the words have typed, the membrane potential above E_K, back, below it, and back, round and round — the
      // field's push going with it — and the net flow through the channel, out, none, in
      Object.assign(P, LINED, { plate: 1, valued: 1, meter: 1, balance: 1 });
      P.netFlow = phase(typed, 200, 500);
      P.vm = Number.isFinite(typed) ? keyed(SWING, Math.max(0, typed - 300)) : E_K + 29;
      break;
    case 'example':
      // as left, at E_K; once the words have typed, the membrane potential up to −70 mV — a net flow out — and back
      // down to E_K as potassium leaves, the flow stopping there; and again
      Object.assign(P, LINED, { plate: 1, valued: 1, meter: 1, balance: 1, netFlow: 1 });
      P.example = phase(typed, 200, 700);
      P.vm = Number.isFinite(typed) ? keyed(SETTLE, Math.max(0, typed - 200)) : EXAMPLE_MV;
      break;
    case 'kinds':
      // the pushes, the net flow and the potentials going, and potassium's concentrations; once the words have typed,
      // every ion back in its own colour, and their key
      Object.assign(P, LINED, { conc: 0 });
      P.focus = 1 - phase(typed, 200, 900);
      P.key = phase(typed, 500, 600);
      break;
    case 'each':
      // once the words have typed, each side's concentrations of each ion, in its colour
      Object.assign(P, LINED, { conc: 0, focus: 0 });
      P.listed = phase(typed, 200, 700);
      break;
    case 'reversals':
      // the key going; once the words have typed, each channel's reversal potential over it
      Object.assign(P, LINED, { conc: 0, focus: 0, listed: 1 });
      P.marked = phase(typed, 200, 700);
      break;
    case 'pulls':
      // once the words have typed, the reversal potentials on a line, and the membrane potential with each one's pull on
      // it — knocked away from rest, up, then down, and drawn back each time to where the pulls balance
      Object.assign(P, LINED, { conc: 0, focus: 0, listed: 1 });
      P.panel = phase(typed, 200, 700);
      P.marked = 1 - P.panel;
      P.vm = Number.isFinite(typed) ? kickedAt(Math.max(0, typed - 1200)) : V_REST;
      break;
    case 'weighted':
      // at rest, the pulls balanced; once the words have typed, each one's weight, and the average they make
      Object.assign(P, LINED, { conc: 0, focus: 0, listed: 1, panel: 1, vm: V_REST });
      P.weighted = phase(typed, 200, 700);
      break;
    case 'nearer':
      // at rest, as left; once the words have typed, how far the resting potential sits from potassium's reversal
      // potential and from sodium's, marked along the line, and how many of each one's channels are open
      Object.assign(P, LINED, {
        conc: 0,
        focus: 0,
        listed: 1,
        panel: 1,
        vm: V_REST,
        weighted: 1,
      });
      P.nearer = phase(typed, 200, 800);
      break;
    case 'activeChannels':
      // the potentials' line going as the slide opens; once the words have typed, a voltage-gated channel and a
      // ligand-gated one beside the passive ones, opening and shutting through their round
      Object.assign(P, AT_REST, { panel: 0 });
      P.active = phase(typed, 200, 800);
      break;
    case 'closeUp':
      // closing in on the voltage-gated one as the slide opens; once the words have typed, it named a protein, and
      // its pore
      Object.assign(P, AT_REST, { panel: 0, active: 1 });
      P.closeUp = phase(t, 0, 1800);
      P.protein = phase(typed, 200, 700);
      break;
    case 'gate':
      // as close in; once the words have typed, its gate opening and shutting, again and again, and named, sodium
      // passing through while it is open and turned back while it is shut
      Object.assign(P, CLOSE_UP);
      P.swing = phase(typed, 200, 600);
      break;
    case 'sensor':
      // its gate shut again; once the words have typed, its voltage sensors picked out, their charges, and named
      Object.assign(P, CLOSE_UP);
      P.sensors = phase(typed, 200, 700);
      break;
    case 'held':
      // as left; once the words have typed, the charge lining the membrane, the field across it, and its push on the
      // sensors
      Object.assign(P, CLOSE_UP, { sensors: 1 });
      P.field = phase(typed, 200, 900);
      break;
    case 'rises':
      // as left; once the words have typed, the membrane potential stepped up and back, again and again — the charge
      // lining the membrane thinning, the field and its push weakening, the sensors moving out — and a plot of it below
      Object.assign(P, CLOSE_UP, { sensors: 1, field: 1 });
      P.stepV = phase(typed, 200, 600);
      P.plot = phase(typed, 400, 700);
      break;
    case 'activates':
      // as left; once the words have typed, the gate's opening named, and on the plot, how open it is, its rise named
      Object.assign(P, STEPPED);
      P.act = phase(typed, 200, 700);
      break;
    case 'deactivates':
      // as left; once the words have typed, its shutting named, on the plot too
      Object.assign(P, STEPPED, { act: 1 });
      P.deact = phase(typed, 200, 700);
      break;
    case 'secondGate':
      // as left; once the words have typed, its second gate, hanging on its tether inside, and named
      Object.assign(P, STEPPED, { act: 1, deact: 1 });
      P.lid = phase(typed, 200, 700);
      break;
    case 'inactivates':
      // as left; once the words have typed, that gate swinging into the pore soon after it opens, while the potential
      // stays up, and on the plot, how long it is plugged
      Object.assign(P, STEPPED, { act: 1, deact: 1, lid: 1 });
      P.inact = phase(typed, 200, 900);
      break;
    case 'recovers':
      // as left; once the words have typed, its coming out again, slowly, named on the plot
      Object.assign(P, STEPPED, { act: 1, deact: 1, lid: 1, inact: 1 });
      P.recov = phase(typed, 200, 900);
      break;
    case 'tooSoon':
      // as left; once the words have typed, a second step up soon after the first: the pore still plugged
      Object.assign(P, SODIUM_DONE);
      P.twice = phase(typed, 200, 900);
      break;
    case 'ligandGated':
      // along the membrane to the ligand-gated channel as the slide opens, its ligand coming and going, again and
      // again, the plot following it; once the words have typed, it and its ligand named
      Object.assign(P, SODIUM_DONE);
      P.onLigand = phase(t, 0, 1800);
      P.ligand = phase(typed, 200, 700);
      break;
    case 'binds':
      // as left; once the words have typed, its opening and shutting named, on the plot too
      Object.assign(P, SODIUM_DONE, { onLigand: 1, ligand: 1 });
      P.binding = phase(typed, 200, 700);
      break;
    case 'desensitizes':
      // as left, the ligand staying longer; once the words have typed, it desensitizing while the ligand is still
      // bound, greying, and that named
      Object.assign(P, SODIUM_DONE, { onLigand: 1, ligand: 1, binding: 1 });
      P.desen = phase(typed, 200, 900);
      break;
    case 'channelStates':
      // back along the membrane to the sodium channel as the slide opens; once the words have typed, in the plot's
      // place, the states such a channel moves between, the one it is in lit
      Object.assign(P, SODIUM_DONE, { ligand: 1, binding: 1, desen: 1 });
      P.onLigand = 1 - phase(t, 0, 1800);
      P.states = phase(typed, 200, 800);
      break;
    case 'chance':
      // the plot back; once the words have typed, the channel opening and shutting at random, as one channel does
      Object.assign(P, SODIUM_DONE, { ligand: 1, binding: 1, desen: 1 });
      P.flicker = phase(typed, 200, 700);
      break;
    case 'together':
      // as left; once the words have typed, on the plot, the share of 120 such channels open, smooth
      Object.assign(P, SODIUM_DONE, { ligand: 1, binding: 1, desen: 1, flicker: 1 });
      P.many = phase(typed, 200, 900);
      break;
    case 'clamp':
      // in front of it all, once the words have typed: a voltage clamp's seven steps, and the current at each, one
      // after another picked out
      Object.assign(P, CHARACTERIZED);
      P.ivPanel = phase(typed, 200, 800);
      break;
    case 'peakIV':
      // as left; once the words have typed, each step's peak current, dotted, and plotted against its potential
      Object.assign(P, CHARACTERIZED, { ivPanel: 1 });
      P.ivPeaks = phase(typed, 200, 1400);
      break;
    case 'linear':
      // as left; once the words have typed, a constant conductance's straight line through the reversal potential
      Object.assign(P, CHARACTERIZED, { ivPanel: 1, ivPeaks: 1 });
      P.ivLine = phase(typed, 200, 800);
      break;
    case 'bends':
      // as left; once the words have typed, the share of channels open at each potential, on a plot above, and a cursor
      // running across both
      Object.assign(P, CHARACTERIZED, { ivPanel: 1, ivPeaks: 1, ivLine: 1 });
      P.ivBends = phase(typed, 200, 900);
      break;
    case 'reverses':
      // as left; once the words have typed, the reversal potential marked where the curve crosses zero
      Object.assign(P, CHARACTERIZED, { ivPanel: 1, ivPeaks: 1, ivLine: 1, ivBends: 1 });
      P.ivReverse = phase(typed, 200, 800);
      break;
    case 'spikes':
      // the action potential's own plots in front of the membrane: a run of spikes, again and again
      Object.assign(P, AP_PLOTS);
      break;
    case 'oneSpike':
      // closing in on the first spike as the slide opens
      Object.assign(P, AP_PLOTS);
      P.apZoom = phase(t, 0, 1600);
      break;
    case 'inputs':
      // as left; once the words have typed, the inputs that start it marked under it
      Object.assign(P, AP_PLOTS, { apZoom: 1 });
      P.apInputs = phase(typed, 200, 700);
      break;
    case 'threshold':
      // as left; once the words have typed, the threshold, and the first two inputs alone, short of it
      Object.assign(P, AP_PLOTS, { apZoom: 1, apInputs: 1 });
      P.apThresh = phase(typed, 200, 800);
      break;
    case 'allOrNone':
      // as left; once the words have typed, one input of each of four sizes, and what each does
      Object.assign(P, AP_PLOTS, { apZoom: 1, apInputs: 1, apThresh: 1 });
      P.apSizes = phase(typed, 200, 900);
      break;
    case 'gated':
      // the one run again; once the words have typed, sodium's and potassium's conductances under it, and a strip of
      // membrane with their channels, following the dot along it
      Object.assign(P, AP_PLOTS, { apZoom: 1, apInputs: 1, apThresh: 1 });
      P.apGated = phase(typed, 200, 900);
      break;
    case 'upstroke':
      // as left; once the words have typed, the rise shaded and named, and the runaway that drives it
      Object.assign(P, AP_MECHANISM);
      P.apUp = phase(typed, 200, 700);
      break;
    case 'peak':
      // as left; once the words have typed, the peak named
      Object.assign(P, AP_MECHANISM, { apUp: 1 });
      P.apPeak = phase(typed, 200, 700);
      break;
    case 'downstroke':
      // as left; once the words have typed, the fall shaded and named, and the dip below rest
      Object.assign(P, AP_MECHANISM, { apUp: 1, apPeak: 1 });
      P.apDown = phase(typed, 200, 700);
      break;
    case 'refractory':
      // as left; once the words have typed, the refractory period shaded, and a strong input in it firing nothing
      Object.assign(P, AP_MECHANISM, { apUp: 1, apPeak: 1, apDown: 1 });
      P.apRefract = phase(typed, 200, 900);
      break;
    case 'actionPotential':
      // as left, the late input gone; once the words have typed, every part of the spike named together
      Object.assign(P, AP_MECHANISM, { apUp: 1, apPeak: 1, apDown: 1 });
      P.apSummary = phase(typed, 200, 800);
      break;
    case 'propagate':
      // the membrane giving way to two neurons as the slide opens; once the words have typed, each named, and a spike
      // running down the one's axon to the other, again and again
      Object.assign(P, AT_REST, { scene: 1, other: 1 });
      P.cells = phase(typed, 0, 600);
      P.spike = phase(typed, 300, 400);
      break;
    case 'pumpNeed':
      // the membrane again, the action potential going round as before; once the words have typed, what each spike
      // moves named
      Object.assign(P, AT_REST, SPIKING);
      P.pumpNeed = phase(typed, 200, 800);
      break;
    case 'pump':
      // closing in on the pump as the slide opens; once the words have typed, it named
      Object.assign(P, AT_REST, { panel: 0, gated: 1, onPump: 1 });
      P.closeUp = phase(t, 0, 1800);
      P.pumpNamed = phase(typed, 200, 700);
      break;
    case 'pumpCycle':
      // as left; once the words have typed, its round, again and again
      Object.assign(P, PUMP_CLOSE);
      P.pumping = phase(typed, 200, 600);
      break;
    case 'electrogenic':
      // as left; once the words have typed, the charge each round carries out, counted
      Object.assign(P, PUMP_CLOSE, { pumping: 1 });
      P.netCharge = phase(typed, 200, 800);
      break;
    case 'pumpEnergy':
      // as left; once the words have typed, the ATP it uses named
      Object.assign(P, PUMP_CLOSE, { pumping: 1, netCharge: 1 });
      P.atpCost = phase(typed, 200, 800);
      break;
    case 'first':
      // the other neuron going as the slide opens, this one left
      Object.assign(P, AT_REST, { scene: 1, cells: 1 });
      P.first = phase(typed, 200, 600);
      break;
    case 'inject':
      // this neuron, as left; once the words have typed, two ways to inject current into it, an electrode at its body
      // and an ion channel in its dendrite, each named
      Object.assign(P, AT_REST, { scene: 1, cells: 1 });
      P.inject = phase(typed, 300, 900);
      break;
    case 'channel':
      // as left; once the words have typed, the electrode going and the view diving in on the channel, and it and the
      // dendrite named
      Object.assign(P, AT_REST, { scene: 1, cells: 1, inject: 1 });
      P.dive = phase(typed, 1300, 2600);
      P.parts = phase(typed, 3700, 700);
      P.chan = P.parts;
      break;
    case 'opens':
      // the view closing in on the channel as the slide opens; once the words have typed, the channel opening briefly,
      // again and again, its pore lit
      Object.assign(P, AT_REST, {
        scene: 1,
        cells: 1,
        dive: 1,
        parts: 1,
        chan: 1,
        onCleft: 1,
      });
      P.opening = phase(typed, 200, 500);
      break;
    case 'sodium':
      // as left; once the words have typed, sodium ions flowing in through it while it is open, and a chloride ion
      // turned away
      Object.assign(P, AT_REST, {
        scene: 1,
        cells: 1,
        dive: 1,
        parts: 1,
        chan: 1,
        onCleft: 1,
        opening: 1,
      });
      P.inflow = phase(typed, 200, 500);
      break;
    case 'excess':
      // the view sliding down onto the dendrite as the slide opens; once the words have typed, the negative charge
      // lining its membrane inside round the channel partly neutralized, from the channel out, and the positive charge
      // outside it drifting off
      Object.assign(P, AT_REST, CHANNEL_OPEN, { onCleft: 1 });
      P.low = phase(t, 0, 1400);
      P.excess = phase(typed, 200, 1800);
      break;
    case 'rise':
      // as left; once the words have typed, the membrane potential round the channel rising, the dendrite glowing warm
      // there
      Object.assign(P, AT_REST, CHANNEL_OPEN, { low: 1, excess: 1, onCleft: 1 });
      P.rise = phase(typed, 200, 1400);
      break;
    case 'brief':
      // back up at the channel, backed out a little to make room below; once the words have typed, a plot there: how
      // long the channel is open, shaded, and the voltage rising only while it is
      Object.assign(P, AT_REST, CHANNEL_OPEN, { room: 1, span: 15 });
      P.kinetics = phase(typed, 0, 600);
      P.brief = phase(typed, 200, 900);
      break;
    case 'resist':
      // as left, all but the voltage going; once the words have typed, how fast it rises through channels of less
      // resistance and of more
      Object.assign(P, AT_REST, CHANNEL_OPEN, { room: 1, kinetics: 1, brief: 1, span: 5 });
      P.resist = phase(typed, 200, 900);
      break;
    case 'rc':
      // as left; once the words have typed, one rise, its time constant marked where it is 63% of the way up
      Object.assign(P, AT_REST, CHANNEL_OPEN, {
        room: 1,
        kinetics: 1,
        brief: 1,
        resist: 1,
        span: 5,
      });
      P.rc = phase(typed, 200, 900);
      break;
    case 'capacitance':
      // as left; once the words have typed, the plot giving way to the membrane as a capacitor, the charge either side
      // of it for 1 volt
      Object.assign(P, AT_REST, CHANNEL_OPEN, { room: 1, brief: 1, resist: 1, rc: 1, span: 5 });
      P.kinetics = 1 - phase(typed, 200, 600);
      P.cap = phase(typed, 400, 800);
      break;
    case 'thickness':
      // as left; once the words have typed, the membrane thinner, and more charge either side for the same volt
      Object.assign(P, AT_REST, CHANNEL_OPEN, {
        room: 1,
        brief: 1,
        resist: 1,
        rc: 1,
        cap: 1,
        span: 5,
      });
      P.thin = phase(typed, 200, 1000);
      break;
    case 'dielectric':
      // as left; once the words have typed, its area, its thickness and the lipids' dielectric constant named:
      // C = ε × A / d
      Object.assign(P, AT_REST, CHANNEL_OPEN, {
        room: 1,
        brief: 1,
        resist: 1,
        rc: 1,
        cap: 1,
        thin: 1,
        span: 5,
      });
      P.eps = phase(typed, 200, 900);
      break;
    case 'ohm':
      // the capacitor giving way to the plot again, the words under it staying till the new ones come; the time
      // constant's marks going; once the words have typed, the reversal potential the rise is headed for, the gap to
      // it, and the current, the gap over the resistance, falling as it closes
      Object.assign(P, AT_REST, CHANNEL_OPEN, {
        room: 1,
        kinetics: 1,
        brief: 1,
        resist: 1,
        rc: 1,
        eps: 1,
        span: 5,
      });
      P.ohm = phase(typed, 200, 900);
      break;
    case 'charging':
      // as left, the gap and the current going; once the words have typed, the rate of rise drawn on the curve, steep at
      // first and shallower as the voltage nears the reversal potential
      Object.assign(P, AT_REST, CHANNEL_OPEN, {
        room: 1,
        kinetics: 1,
        brief: 1,
        resist: 1,
        rc: 1,
        ohm: 1,
        span: 5,
      });
      P.slope = phase(typed, 200, 900);
      break;
    case 'repel':
      // the plot going, the view back down on the dendrite, close in, as the slide opens; once the words have typed,
      // the potassium ions in the dendrite by the channel, pushed away
      Object.assign(P, AT_REST, CHANNEL_OPEN, { low: 1, excess: 1, rise: 1, onCleft: 1 });
      P.repelled = phase(typed, 200, 900);
      break;
    case 'along':
      // as left; once the words have typed, the view backing out along the dendrite as the potassium ions in it are
      // pushed along it, both ways
      Object.assign(P, AT_REST, CHANNEL_OPEN, { low: 1, excess: 1, rise: 1, repelled: 1 });
      P.onCleft = 1 - phase(typed, 0, 1400);
      P.axial = phase(typed, 200, 700);
      P.accum = phase(typed, 900, 1600);
      break;
    case 'spread':
      // the view backing out a little and up as the slide opens; once the words have typed, below it, the potential by
      // the channel over 40 ms, falling fast as the charge spreads along the dendrite
      Object.assign(P, AT_REST, CHANNEL_OPEN, {
        low: 1,
        excess: 1,
        rise: 1,
        repelled: 1,
        axial: 1,
        accum: 1,
        room: 1,
      });
      P.quick = phase(typed, 200, 900);
      break;
    case 'leak':
      // as left; once the words have typed, potassium leak channels along the dendrite, potassium leaking out through
      // them, and on the plot, the slower fall, with τ_m
      Object.assign(P, AT_REST, CHANNEL_OPEN, {
        low: 1,
        excess: 1,
        rise: 1,
        repelled: 1,
        axial: 1,
        accum: 1,
        room: 1,
        quick: 1,
      });
      P.leaks = phase(typed, 200, 800);
      P.slow = phase(typed, 600, 900);
      break;
    case 'soma':
      // as left; once the words have typed, on the plot, the same potential at the soma: smaller, and rising and falling
      // more slowly, the two alike once the charge has spread
      Object.assign(P, AT_REST, CHANNEL_OPEN, {
        low: 1,
        excess: 1,
        rise: 1,
        repelled: 1,
        axial: 1,
        accum: 1,
        room: 1,
        quick: 1,
        leaks: 1,
        slow: 1,
      });
      P.soma = phase(typed, 200, 900);
      break;
    case 'decay':
      // as left; once the words have typed, the potential named at points along the dendrite, falling off with distance
      // from the channel
      Object.assign(P, AT_REST, CHANNEL_OPEN, {
        low: 1,
        excess: 1,
        rise: 1,
        repelled: 1,
        axial: 1,
        accum: 1,
        room: 1,
        quick: 1,
        leaks: 1,
        slow: 1,
        soma: 1,
      });
      P.ticks = phase(typed, 200, 800);
      break;
    case 'signal':
      // the view backing out from the dendrite to the whole of this neuron as the slide opens, and another neuron coming
      // in beside it, named; once the words have typed, a spike running down its axon to this one, again and again
      Object.assign(P, AT_REST, { scene: 1, cells: 1, other: 1 });
      P.spike = phase(typed, 300, 400);
      break;
    case 'synapse':
      // the two neurons, as left; once the words have typed, where they meet named, then the view diving in on it —
      // the other neuron's terminal, the cleft and the shaft of this one's dendrite — and those named
      Object.assign(P, AT_REST, { scene: 1, cells: 1, other: 1 });
      P.contact = phase(typed, 200, 500);
      P.dive = phase(typed, 1300, 2600);
      P.parts = phase(typed, 3700, 700);
      break;
    case 'release':
      // close in, as left; once the words have typed, a spike arriving at the terminal, a vesicle emptying, and the
      // transmitter spreading through the cleft, again and again
      Object.assign(P, AT_REST, { scene: 1, cells: 1, other: 1, dive: 1, parts: 1 });
      P.spike = phase(typed, 200, 400);
      P.release = P.spike;
      break;
    case 'bind':
      // the view closing in on the cleft and the dendrite under it as the slide opens; once the words have typed, the
      // transmitter crossing the cleft to bind to the receptors in the dendrite's membrane, and those named
      Object.assign(P, AT_REST, {
        scene: 1,
        cells: 1,
        other: 1,
        dive: 1,
        parts: 1,
        onCleft: 1,
        spike: 1,
        release: 1,
      });
      P.bind = phase(typed, 200, 500);
      break;
    case 'opening':
      // as left; once the words have typed, the bound receptors' channels opening, their pores lit
      Object.assign(P, AT_REST, {
        scene: 1,
        cells: 1,
        other: 1,
        dive: 1,
        parts: 1,
        onCleft: 1,
        spike: 1,
        release: 1,
        bind: 1,
      });
      P.opening = phase(typed, 200, 500);
      break;
    case 'inflow':
      // as left; once the words have typed, sodium ions flowing through the open channels into the dendrite, and a
      // chloride ion turned away
      Object.assign(P, AT_REST, {
        scene: 1,
        cells: 1,
        other: 1,
        dive: 1,
        parts: 1,
        onCleft: 1,
        spike: 1,
        release: 1,
        bind: 1,
        opening: 1,
      });
      P.inflow = phase(typed, 200, 500);
      break;
    case 'glutamate':
      // as left; once the words have typed, the transmitter named glutamate, and the receptors AMPA
      Object.assign(P, AT_REST, SYNAPSE_OPEN, { onCleft: 1 });
      P.glutamate = phase(typed, 200, 700);
      break;
    case 'ampa':
      // as left; once the words have typed, potassium flowing out through the AMPA receptors as sodium flows in
      Object.assign(P, AT_REST, SYNAPSE_OPEN, { onCleft: 1, glutamate: 1 });
      P.kout = phase(typed, 200, 600);
      break;
    case 'cancel':
      // as left; once the words have typed, the view backing out, to a little further than before and up, and below it
      // the two currents on a line of potentials, pulling towards their reversal potentials and cancelling near 0 mV
      Object.assign(P, AT_REST, SYNAPSE_OPEN, { glutamate: 1, kout: 1 });
      P.room = phase(typed, 200, 1200);
      P.onCleft = 1 - P.room;
      P.currents = phase(typed, 900, 800);
      break;
    case 'clearance':
      // the line of potentials giving way to a plot; once the words have typed, transporters either side of the cleft
      // taking up the glutamate, and on the plot, how soon it is gone from the cleft
      Object.assign(P, AT_REST, SYNAPSE_OPEN, { glutamate: 1, kout: 1, room: 1, span: 5 });
      P.kinetics = phase(typed, 200, 700);
      P.clear = phase(typed, 400, 700);
      break;
    case 'unbind':
      // as left; once the words have typed, on the plot, the AMPA current, decaying within a few milliseconds
      Object.assign(P, AT_REST, SYNAPSE_OPEN, {
        glutamate: 1,
        kout: 1,
        room: 1,
        kinetics: 1,
        clear: 1,
        span: 5,
      });
      P.epsc = phase(typed, 200, 800);
      break;
    case 'deactivation':
      // back up at the synapse, the plot below as the slide about clearance left it; once the words have typed, the
      // receptors' current, falling as glutamate comes off them
      Object.assign(P, AT_REST, SYNAPSE_OPEN, {
        glutamate: 1,
        kout: 1,
        room: 1,
        kinetics: 1,
        clear: 1,
        span: 10,
      });
      P.current = phase(typed, 200, 700);
      break;
    case 'desensitize':
      // as left; once the words have typed, glutamate held in the cleft, and the AMPA receptors closing anyway
      Object.assign(P, AT_REST, SYNAPSE_OPEN, {
        glutamate: 1,
        kout: 1,
        room: 1,
        kinetics: 1,
        clear: 1,
        current: 1,
        span: 30,
      });
      P.desens = phase(typed, 200, 900);
      break;
    case 'factors':
      // as left, the glutamate gone; once the words have typed, the current's decay at three kinds of synapse
      Object.assign(P, AT_REST, SYNAPSE_OPEN, {
        glutamate: 1,
        kout: 1,
        room: 1,
        kinetics: 1,
        clear: 1,
        span: 15,
      });
      P.types = phase(typed, 200, 900);
      break;
    case 'tau':
      // as left; once the words have typed, the brief current, and the voltage it makes, far slower
      Object.assign(P, AT_REST, SYNAPSE_OPEN, {
        glutamate: 1,
        kout: 1,
        room: 1,
        kinetics: 1,
        clear: 1,
        current: 1,
        span: 80,
      });
      P.volt = phase(typed, 200, 900);
      break;
    case 'balance':
      // the last slide's picture, as it was left; then, at the channel, the two pushes on potassium side by side, as
      // long as each other: diffusion out, the field back in, and so no net flow
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        zoom: 1,
        pull: 1,
        closer: 1,
        recentre: 1,
        sheet: 1,
      });
      P.balance = phase(typed, 300, 1200);
      break;
    case 'rate':
      // backing out from the lined membrane to the whole of it as the slide opens, the pairs and their field going as the
      // view widens (still centred on the channel); once the words have typed, potassium's concentration each side, the
      // ions jostling again, and the broad arrow of diffusion out, beside the channel
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        pull: 1,
        recentre: 1,
      });
      P.zoom = 1 - phase(t, 0, 1400);
      P.closer = P.zoom;
      P.sheet = P.zoom;
      P.conc = phase(typed, 200, 600);
      P.random = phase(typed, 200, 600);
      P.net = phase(typed, 600, 700);
      P.term = P.net;
      break;
    case 'buildup':
      // the last slide's picture; once the words have typed, pairs lining the membrane one after another - the charge
      // building up - and the arrow of diffusion giving way to the two pushes at the channel, out and back in, growing
      // in together until they are as strong as each other
      Object.assign(P, {
        focus: 1,
        crowd: 1,
        channels: 1,
        stated: 1,
        open: 1,
        alone: 1,
        leaveMs: 1e6,
        pull: 1,
        recentre: 1,
        random: 1,
        conc: 1,
      });
      P.sheet = phase(typed, 200, 2400);
      P.net = 1 - phase(typed, 1600, 600);
      P.term = P.net;
      P.balance = phase(typed, 2200, 1400);
      break;
    case 'determine':
      // backing out from the channel to the whole membrane as the slide opens, lined, its field's lines sweeping
      // through it, potassium alone and still but for its ions through the channel, out and in, and no words but the
      // sliders under the figure: potassium's concentration each side as the reader sets it — how often its ions cross
      // each way following at once, the charge lining the membrane, and so the field, catching up; and, as the last of
      // it goes, the ion that left first back in through the channel, the ion it drew letting go
      Object.assign(P, LINED, { sides: 0, vary: 1, others: 0, crossing: 1 });
      P.zoom = 1 - phase(t, 0, 1400);
      P.closer = P.zoom;
      [P.cin, P.cout, P.charge] = [set.cin, set.cout, set.charge];
      P.vm = E_K * P.charge;
      P.pull = set.lone;
      P.leaveMs = 2200 * set.lone;
      break;
  }
  // the ions' key only from the slide that brings the ions to the one that turns to potassium (slides 4
  // to 9): it fades out as the slide after begins
  if (!KEYED.includes(step)) P.key = 0;
  // from slide 29 on, the field without its moving lines: they fade as that slide begins
  if (STILL_FIELD.includes(step)) P.waves = 0;
  // from the slide about passive channels on, all three held open
  if (STAYING_OPEN.includes(step)) P.passive = 1;
  // and, from the slide where more potassium collects on the membrane on, the extra pairs it brings, close in
  if (DENSER.includes(step)) P.denser = 1;
  // and, from the slide about a channel open on, the membrane two plain lines
  if (PLAIN_MEMBRANE.includes(step)) P.lines = 1;
  // and, from the slide about voltage to the last about potassium alone, close in on the channel again
  if (CLOSE_IN.includes(step)) Object.assign(P, { zoom: 1, closer: 1, captions: 0 });
  return P;
}

/** The steps close in on the channel, as slides 29 to 32 are, after the slide where the reader sets potassium's
 * concentrations backs out: slides 34 to 49. */
const CLOSE_IN: readonly Physics2Step[] = [
  'voltage',
  'work',
  'volts',
  'potential',
  'freeIn',
  'negative',
  'surplus',
  'potentialEnergy',
  'stored',
  'perCharge',
  'equilibrium',
  'reversal',
  'energy',
  'noNet',
  'specific',
  'differs',
  'example',
];

/** The steps after the one about passive channels: their channels stay open. */
const STAYING_OPEN: readonly Physics2Step[] = PHYSICS2_STEPS.slice(
  PHYSICS2_STEPS.indexOf('passive') + 1
);
/** The steps after the one about a channel open: their membrane is two plain lines. */
const PLAIN_MEMBRANE: readonly Physics2Step[] = PHYSICS2_STEPS.slice(
  PHYSICS2_STEPS.indexOf('diffusion') + 1
);
/** The steps after the one where more potassium collects on the membrane: close in, its extra pairs stay. */
const DENSER: readonly Physics2Step[] = PHYSICS2_STEPS.slice(
  PHYSICS2_STEPS.indexOf('stronger') + 1
);

/** The steps whose field is drawn without its moving lines: slide 29 on. */
const STILL_FIELD: readonly Physics2Step[] = [
  'balance',
  'voltage',
  'work',
  'depends',
  'rate',
  'buildup',
  'volts',
  'potential',
  'freeIn',
  'negative',
  'surplus',
  'potentialEnergy',
  'stored',
  'perCharge',
  'equilibrium',
  'reversal',
  'energy',
  'noNet',
  'specific',
  'differs',
  'example',
  'kinds',
  'each',
  'reversals',
  'pulls',
  'weighted',
  'nearer',
  ...ACTIVE_STEPS,
  'spikes',
  'oneSpike',
  'inputs',
  'threshold',
  'allOrNone',
  'gated',
  'upstroke',
  'peak',
  'downstroke',
  'refractory',
  'actionPotential',
  'propagate',
  ...PUMP_STEPS,
  'first',
  'inject',
  'channel',
  'opens',
  'sodium',
  'excess',
  'rise',
  'brief',
  'resist',
  'rc',
  'capacitance',
  'thickness',
  'dielectric',
  'ohm',
  'charging',
  'repel',
  'along',
  'spread',
  'leak',
  'soma',
  'decay',
  'signal',
  'synapse',
  'release',
  'bind',
  'opening',
  'inflow',
  'glutamate',
  'ampa',
  'cancel',
  'clearance',
  'unbind',
  'deactivation',
  'desensitize',
  'factors',
  'tau',
];

/** The steps that show the ions' key. */
const KEYED: readonly Physics2Step[] = [
  'charges',
  'barrier',
  'forces',
  'flow',
  'neutral',
  'potassium',
  'kinds',
  'each',
];

/** Words as the basic course sets them: italic serif, haloed in the page's colour, with `^` raising what follows. */
const say = (
  g: G,
  text: string,
  x: number,
  y: number,
  a: number,
  size = 12.5,
  align: CanvasTextAlign = 'left',
  colour?: RGB
) => mathWords(g.ctx, text, x, y, colour ?? g.L.ink, a, size * g.ts, align, g.L.page);

/** An ion's colour — greyed, but for potassium, as the slides turn to it. */
const colourOf = (kind: Kind, focus: number) => {
  const own = kind === 'A' ? LARGE : IONS[kind].colour;
  return kind === 'K' ? own : mix(own, GREY, 0.85 * focus);
};

/** A channel through the membrane, as the basic course draws one — two halves round a pore, apart when it is open —
 * edged in the colour of the ion it lets through. */
function channel(g: G, x: number, y: number, a: number, open: number, edge: RGB) {
  if (a < 0.01) return;
  const { ctx, u, L } = g;
  ctx.globalAlpha = a;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(x + side * (7 + 4 * open) * u - 6 * u, y - 19 * u, 12 * u, 38 * u, 5 * u);
    ctx.fillStyle = rgba(mix(L.page, L.ink, 0.22), 0.98);
    ctx.fill();
    ctx.strokeStyle = rgba(edge, 0.85);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * Where the one potassium ion is, `ms` into its trip: up from where it sits, jostled about — it bumps the membrane
 * beside the channel, is knocked back, tries the other side — until it finds the pore, passes through, and wanders off
 * among the few outside; and how much of it shows, fading at the trip's two ends.
 */
/**
 * At each open channel in turn, on the slide about selective channels: an ion of its own kind coming up to it and
 * passing through, the way its gradient runs — sodium and chloride in, potassium out — then an ion of another kind
 * running at it and bouncing off, a ring where it is turned away.
 */
const SELECTED: [IonKind, number, IonKind, number][] = [
  ['Na', -1, 'K', 1],
  ['K', 1, 'Na', -1],
  ['Cl', -1, 'Na', -1],
];
function drawSelective(g: G, pores: number[], y: number, face: number, alpha: number) {
  const { ctx, now, u, L } = g;
  SELECTED.forEach(([kind, from, wrong, wrongFrom], i) => {
    const s = cycle(now, 4200, -i * 1400) * 4200;
    const x = pores[i];
    const side = i % 2 ? 1 : -1;
    // its own kind, through: from its side (-1 outside, above; 1 inside, below) to the other
    if (s < 1900) {
      const [mouth, exit] = [y + from * (face + 6 * u), y - from * (face + 6 * u)];
      let [px, py] = [x, mouth];
      if (s < 700) {
        const e = smooth(s / 700);
        [px, py] = [lerp(x + side * 30 * u, x, e), lerp(y + from * (face + 46 * u), mouth, e)];
      } else if (s < 1200) py = lerp(mouth, exit, smooth((s - 700) / 500));
      else {
        const e = smooth((s - 1200) / 700);
        [px, py] = [lerp(x, x - side * 26 * u, e), lerp(exit, y - from * (face + 46 * u), e)];
      }
      disc(
        g,
        px,
        py,
        8 * u,
        IONS[kind].colour,
        IONS[kind].sign,
        alpha * Math.min(1, s / 250, (1900 - s) / 400)
      );
    }
    // another kind, turned away: up to the mouth, and back
    if (s > 2100 && s < 3500) {
      const b = s - 2100;
      const [x0, y0] = [x - side * 34 * u, y + wrongFrom * (face + 48 * u)];
      const [x1, y1] = [x - side * 4 * u, y + wrongFrom * (face + 10 * u)];
      const e = b < 650 ? (b / 650) ** 2 : 1 - smooth((b - 650) / 750);
      const seen = alpha * Math.min(1, b / 250, (1400 - b) / 350);
      disc(g, lerp(x0, x1, e), lerp(y0, y1, e), 8 * u, IONS[wrong].colour, IONS[wrong].sign, seen);
      if (b > 650 && b < 900) {
        const k = (b - 650) / 250;
        ctx.globalAlpha = 0.6 * alpha * (1 - k);
        ctx.strokeStyle = rgba(L.ink, 1);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(x1, y + wrongFrom * face, lerp(4, 15, k) * u, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  });
}

/**
 * Potassium ions wandering through the open channel at random, on the last slides: from inside, one every second or
 * so; from outside, where there are 28 times fewer, 28 times less often. Each comes up to the pore jostled about, passes
 * through, and wanders off, fading. They go by the page's clock, so that they carry on from one slide to the next.
 */
const CROSS_EVERY = 1100;
/** When the `j`th ion through, out or in, sets off, by the page's clock, ms. */
const setsOff = (j: number, inward: boolean) => {
  const every = CROSS_EVERY * (inward ? CONC.K.in / CONC.K.out : 1);
  return (j + 0.6 * mulberry32(7919 * j + (inward ? 104729 : 0) + 3)()) * every;
};
/** How many have passed through the pore, out or in, after `from` and by `to`, ms. */
function crossed(from: number, to: number, inward: boolean) {
  const every = CROSS_EVERY * (inward ? CONC.K.in / CONC.K.out : 1);
  let n = 0;
  for (
    let j = Math.max(0, Math.floor((from - 1500) / every) - 1);
    setsOff(j, inward) + 1500 <= to;
    j++
  )
    if (setsOff(j, inward) + 1500 > from) n++;
  return n;
}
/** Where the `j`th potassium ion through the open channel is, `age` ms after it sets off, and how much of it shows: from
 * `side` of the pore up to its mouth, through it, and away — out, or `inward` — jostled as it goes. */
function crosserAt(
  age: number,
  inward: boolean,
  side: number,
  j: number,
  cx: number,
  y: number,
  face: number,
  u: number
): [number, number, number] {
  // from where it starts to the mouth, through the pore, and away: inside is below, outside above
  const sign = inward ? -1 : 1;
  const [mouth, exit] = [y + sign * (face + 6 * u), y - sign * (face + 6 * u)];
  let [x, yy] = [cx, mouth];
  if (age < 900) {
    const e = smooth(age / 900);
    [x, yy] = [lerp(cx + side * 36 * u, cx, e), lerp(y + sign * (face + 48 * u), mouth, e)];
  } else if (age < 1500) yy = lerp(mouth, exit, smooth((age - 900) / 600));
  else {
    const e = smooth((age - 1500) / 900);
    [x, yy] = [lerp(cx, cx - side * 30 * u, e), lerp(exit, y - sign * (face + 50 * u), e)];
  }
  const wobble = age > 900 && age < 1500 ? 0.3 : 1;
  x += 3 * u * wobble * Math.sin(age / 90 + j);
  yy += 2.5 * u * Math.sin(age / 70 + 2 * j);
  return [x, yy, Math.min(1, age / 300, (2400 - age) / 400)];
}
function drawCrossers(g: G, cx: number, y: number, face: number, alpha: number) {
  const { u, now: ms } = g;
  for (const inward of [false, true]) {
    const every = CROSS_EVERY * (inward ? CONC.K.in / CONC.K.out : 1);
    const last = Math.floor(ms / every);
    for (let j = Math.max(0, last - 3); j <= last; j++) {
      const rnd = mulberry32(7919 * j + (inward ? 104729 : 0) + 3);
      const age = ms - setsOff(j, inward);
      // (its first draw is when it sets off, taken there)
      rnd();
      if (age < 0 || age > 2400) continue;
      const side = rnd() < 0.5 ? -1 : 1;
      const [x, yy, seen] = crosserAt(age, inward, side, j, cx, y, face, u);
      disc(g, x, yy, 8 * u, IONS.K.colour, 1, alpha * seen);
    }
  }
}
/** At the equilibrium potential, potassium ions through the open channel as often in as out: one out, one in, by turns,
 * one setting off every `EVEN_EVERY` ms by the page's clock. */
const EVEN_EVERY = 1300;
function drawEven(g: G, cx: number, y: number, face: number, alpha: number) {
  const { u, now: ms } = g;
  const last = Math.floor(ms / EVEN_EVERY);
  for (let j = Math.max(0, last - 2); j <= last; j++) {
    const age = ms - j * EVEN_EVERY;
    if (age < 0 || age > 2400) continue;
    const side = mulberry32(4241 * j + 5)() < 0.5 ? -1 : 1;
    const [x, yy, seen] = crosserAt(age, j % 2 === 1, side, j, cx, y, face, u);
    disc(g, x, yy, 8 * u, IONS.K.colour, 1, alpha * seen);
  }
}
/** On the slide about the energy in crossing, a potassium ion drawn in through the channel, then one carried out through
 * it, by turns: where the one crossing is, `s` ms into the round, which way it goes, and how much of it shows — or null,
 * between the two. */
const ENERGY_MS = 5600;
function energyAt(s: number, cx: number, y: number, face: number, u: number) {
  const go = (a: [number, number], b: [number, number], e: number): [number, number] => [
    lerp(a[0], b[0], e),
    lerp(a[1], b[1], e),
  ];
  if (s < 2600) {
    // in: down to the pore's outer mouth, through it, quickening, and on into the cell
    const [start, mouth, through, rest] = [
      [cx + 28 * u, y - face - 46 * u],
      [cx, y - face - 4 * u],
      [cx, y + face + 4 * u],
      [cx - 20 * u, y + face + 36 * u],
    ] as [number, number][];
    let at = go(through, rest, smooth(Math.min(1, (s - 1400) / 900)));
    if (s < 900) at = go(start, mouth, smooth(s / 900));
    else if (s < 1400) at = go(mouth, through, ((s - 900) / 500) ** 1.6);
    return { at, inward: true, seen: Math.min(1, s / 250, (2600 - s) / 350) };
  }
  if (s < 2800) return null;
  // out: up to the pore's inner mouth, carried through it, slowly, against the field, and away
  const r = s - 2800;
  const [start, mouth, through, rest] = [
    [cx - 28 * u, y + face + 46 * u],
    [cx, y + face + 4 * u],
    [cx, y - face - 4 * u],
    [cx + 20 * u, y - face - 36 * u],
  ] as [number, number][];
  let at = go(through, rest, smooth(Math.min(1, (r - 1700) / 700)));
  if (r < 900) at = go(start, mouth, smooth(r / 900));
  else if (r < 1700) at = go(mouth, through, (r - 900) / 800);
  return { at, inward: false, seen: Math.min(1, r / 250, (2800 - r) / 350) };
}

function walkAt(
  ms: number,
  home: [number, number],
  cx: number,
  y: number,
  u: number,
  face: number
) {
  const s = ((Math.max(0, ms) % WALK) + WALK) % WALK;
  const mouth = y + face + 9 * u;
  const keys: [number, number, number][] = [
    [0, home[0], home[1]],
    [1000, cx - 46 * u, mouth + 18 * u],
    [1350, cx - 34 * u, mouth],
    [1900, cx - 12 * u, mouth + 34 * u],
    [2600, cx + 30 * u, mouth + 4 * u],
    [3000, cx + 16 * u, mouth + 24 * u],
    [3600, cx, mouth + 6 * u],
    [4400, cx, y - face - 10 * u],
    [5500, cx + 40 * u, y - face - 56 * u],
    [6400, cx + 64 * u, y - face - 66 * u],
  ];
  let j = 0;
  while (j < keys.length - 2 && s > keys[j + 1][0]) j++;
  const [ta, xa, ya] = keys[j];
  const [tb, xb, yb] = keys[j + 1];
  const e = smooth(clamp01((s - ta) / (tb - ta)));
  // the jostling: less of it sideways in the pore
  const inPore = s > 3600 && s < 4400 ? 0.25 : 1;
  const jx = 3 * u * (Math.sin(s / 130 + 1) + 0.6 * Math.sin(s / 57)) * inPore;
  const jy = 3 * u * (Math.sin(s / 110) + 0.6 * Math.sin(s / 67 + 2));
  return {
    x: lerp(xa, xb, e) + jx,
    y: lerp(ya, yb, e) + jy,
    seen: Math.min(1, s / 300, (WALK - s) / 500),
  };
}

/** The figure for one frame — `opened` being when potassium's channel opened on the slide about its flux, by the page's
 * clock, which its count counts from. */
function drawFigure(f: Frame<Physics2Step>, P: Pose, opened: number, crossing: Crossing[] = []) {
  const { ctx, w, h, look: L } = f;
  // the basic course's scale: 1 on a wide figure, less on a narrow one — but not so little that an ion's sign is lost
  const u = Math.max(0.55, Math.min(1, w / 900));
  const g: G = {
    ctx,
    L,
    w,
    h,
    cx: w / 2,
    cy: h / 2,
    u,
    ts: Math.max(0.8, Math.min(1, w / 900)),
    t: 0,
    now: f.still ? 2000 : f.now,
    still: f.still,
  };
  const narrow = w < 640;
  if (P.scene > 0.999) {
    drawSynapse(g, P, narrow);
    return;
  }
  // the membrane where the basic course's slide has it: across the figure, a little above its middle
  const y = h / 2 - 10 * u;
  const [x0, x1] = [30 * u, w - 30 * u];
  const face = 13.6 * u;
  // the action potential's voltage-gated channels, between the passive ones, and the receptor bringing a synapse's
  // inputs, beyond them (not on a narrow screen, where there is no room); and, from the slide about active channels on,
  // theirs: the voltage-gated one where the action potential's sodium channel will be, the ligand-gated one where its
  // receptor will (on a narrow screen, where its potassium channel will)
  const gatedPores = [w / 2 - 120 * u, w / 2 + 120 * u];
  const receptorX = w / 2 + 360 * u;
  const ligandX = narrow ? gatedPores[1] : receptorX;
  // and, after the action potential, the sodium–potassium pump, between the passive sodium channel and the voltage-gated
  const pumpX = w / 2 - 180 * u;

  // close in on the potassium channel, on the slide about the attraction across the membrane: all that is drawn of
  // the membrane, its channels and its ions larger, round the channel; the words over it stay as they are
  // — and, on the slides about each ion's field, closer still, centred on the pair a little way along from it
  const pairDx = (narrow ? 44 : 70) * u;
  // — and, from the slide that closes in on an active channel, on that: the voltage-gated one, or, from the slide about
  // ligand-gated channels, the ligand-gated one, backing out a little on the way along the membrane to it; as close as
  // fits between the top of the figure and the foot — or the plot there, once there is one — the channel and its names
  // in the middle of that room (the voltage-gated one, its second gate hanging under it, 80 design px tall; the
  // ligand-gated one, its lobes over it, 98) — and closer still on a narrow screen, where the names are shorter
  const hop = 4 * P.onLigand * (1 - P.onLigand);
  const band = [34, lerp(h - 40 * u, h - 36 * u - 96 * Math.max(u, 0.85) - 10, P.plot)];
  const fits = (tall: number) =>
    Math.min(Math.max(Math.min(w / (narrow ? 150 : 230), (band[1] - band[0]) / tall), 1.8), 4.6);
  // (the pump, its foot under it and ions coming and going, 84 tall)
  const closeIn = lerp(lerp(fits(80), fits(98), P.onLigand), fits(84), P.onPump);
  const closeY = (band[0] + band[1]) / 2 + lerp(lerp(-2, 7, P.onLigand), -6, P.onPump) * closeIn;
  const closeZoom = (closeIn / u) ** (P.closeUp * (1 - 0.8 * hop));
  const onActive = lerp(lerp(gatedPores[0], ligandX, P.onLigand), pumpX, P.onPump);
  // twice as close as it was first drawn (2.4, then 1.4 times that): close enough on slides 20 to 23, with ions to spare
  const zoom =
    lerp(1, 4.8, P.zoom) * lerp(1, 1.4, P.closer) * lerp(1, ON_CHANNEL, P.onChannel) * closeZoom;
  // and on the last of them, the pairs lining the membrane, back over the channel the ion tries — or the active channel
  // drawn steadily in to the middle as the view closes in on it
  const zxBefore = w / 2 + P.closer * pairDx * (1 - P.recentre);
  const zx = onActive - ((1 - P.closeUp) * (onActive - zxBefore)) / closeZoom;
  // and, on the negative ion's field's slide, lowered onto it
  const zy = y + P.lower * LOWER * u - (P.closeUp * (closeY - y)) / zoom;
  // (and the ions, the charge lining the membrane and the names, gone by halfway in, for less to look at as it closes)
  const away = 1 - smooth(clamp01(2.2 * P.closeUp));
  const seen = (px: number, py: number): [number, number] => [
    w / 2 + zoom * (px - zx),
    y + zoom * (py - zy),
  ];
  // the potassium channel's walls on the page: how far either side of its middle they reach, and where their outer ends are
  const wallReach = (13 + 4 * P.open) * u * zoom;
  const [, wallTop] = seen(w / 2, y - 19 * u);
  // the potentials' plate in the top right corner — but, close in, where the pairs lining the membrane would be under it
  // there, in the membrane, under its outer face, the names of the pushes beside the channel lowered to make room
  // (not on a narrow screen: there the membrane beside the channel is too short for it, and it clears the pairs anyway)
  const plateInBand = !narrow && 8 + 88 * u > seen(w / 2, y - face - 17 * u)[1];
  const plateTop = plateInBand ? seen(w / 2, y - face)[1] + 10 * u : 8;
  const plateDrop = plateInBand ? 40 * u * P.plate : 0;
  ctx.save();
  if (zoom > 1.001) {
    ctx.translate(w / 2, y);
    ctx.scale(zoom, zoom);
    ctx.translate(-zx, -zy);
  }
  // where the one potassium ion that leaves and the negative ion it draws are drawn, for the words about them
  let lone: [number, number] = [0, 0];
  let drawnTo: [number, number] = [0, 0];

  // on the slide counting each side's charges, both sides shaded: what is counted
  if (P.tally > 0.01) {
    ctx.globalAlpha = P.tally;
    ctx.fillStyle = rgba(mix(L.page, L.ink, L.dark ? 0.07 : 0.045), 1);
    ctx.beginPath();
    ctx.roundRect(x0, y - face - 100 * u, x1 - x0, 96 * u, 8 * u);
    ctx.roundRect(x0, y + face + 4 * u, x1 - x0, 96 * u, 8 * u);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  const pores = CHANNELS.map((_, i) => w / 2 + (i - 1) * 240 * u);
  // the action potential's round, from the slide about spikes on, and where in it the page's clock has got
  const lt = g.still ? AP_PEAK : cycle(g.now, AP_MS) * AP_MS;
  const receptorShown = narrow ? 0 : P.inputs;
  // and the active channels', from the slide about them on
  const gt = g.still ? activeStillMs(P) : cycle(g.now, ACT_MS) * ACT_MS;
  if (P.water > 0.01) drawWater(g, y, x0, x1, face, P.water, narrow);
  // the membrane: its lipids — or, from the slide about a channel open on, faded to two plain lines, its two faces,
  // broken where the channels are, and as thin however close in
  if (P.drawn > 0.01) {
    const gaps =
      P.channels > 0.01
        ? [
            ...pores,
            ...(P.gated > 0.01 ? gatedPores : []),
            ...(receptorShown > 0.01 ? [receptorX] : []),
            ...(P.active > 0.01 ? [gatedPores[0], ligandX] : []),
            ...(P.onPump > 0.01 ? [pumpX] : []),
          ]
        : [];
    const end = lerp(x0, x1, P.drawn);
    membrane(g, y, x0, end, 1 - P.lines, gaps);
    if (P.lines > 0.01) {
      ctx.globalAlpha = P.lines;
      ctx.strokeStyle = rgba(L.ink, 0.5);
      ctx.lineWidth = 1.6 / zoom;
      ctx.beginPath();
      for (const side of [-1, 1]) {
        let from = x0;
        for (const px of [...gaps].sort((m, n) => m - n)) {
          if (px - 16 * u > from) {
            ctx.moveTo(from, y + side * face);
            ctx.lineTo(Math.min(end, px - 16 * u), y + side * face);
          }
          from = px + 16 * u;
        }
        if (end > from) {
          ctx.moveTo(from, y + side * face);
          ctx.lineTo(end, y + side * face);
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  // the channels, each edged in its ion's colour: opening and closing in turn, on the slide about their two states,
  // each open half the time — and potassium's, on the last slide, open
  // the channels, their names and the key keep their own colours on the slide about any channel, not just potassium's
  const own = P.focus * (1 - P.selective);
  const openness = CHANNELS.map((kind, i) => {
    const c = cycle(g.now, 3600, -i * 1200);
    const toggled = smooth(clamp01(c / 0.08)) * (1 - smooth(clamp01((c - 0.5) / 0.08)));
    return Math.max(kind === 'K' ? P.open : 0, P.gating * toggled, P.selective, P.passive);
  });
  CHANNELS.forEach((kind, i) =>
    channel(g, pores[i], y, P.channels * (kind === 'K' ? 1 : 0.7), openness[i], colourOf(kind, own))
  );
  // on the slides about active channels: a voltage-gated channel and a ligand-gated one, opening and shutting through
  // their round as they do close in, each named under it on the slide that brings them — and, close in, drawn again,
  // in full, over this
  if (P.active > 0.01) {
    const na = activeSodium(P, gt);
    const lg = activeLigand(P, gt);
    channel(g, gatedPores[0], y, P.active, na.open, IONS.Na.colour);
    channel(g, ligandX, y, P.active, lg.open, mix(TRANSMITTER, GREY, 0.8 * lg.numb));
    for (const [x, colour] of [
      [gatedPores[0], IONS.Na.colour],
      [ligandX, TRANSMITTER],
    ] as [number, RGB][])
      say(
        g,
        'an active channel',
        x,
        y + face + 14 * u,
        P.active * (1 - smooth(clamp01(3 * P.closeUp))),
        11,
        'center',
        mix(colour, L.ink, 0.3)
      );
  }
  // after the action potential, from the slide that closes in on it: the sodium–potassium pump, plainly, wider than a
  // channel and with no pore — drawn in full close in
  if (P.onPump > 0.01) {
    ctx.globalAlpha = P.onPump;
    ctx.beginPath();
    ctx.roundRect(pumpX - 18 * u, y - 22 * u, 36 * u, 44 * u, 9 * u);
    ctx.fillStyle = rgba(mix(L.page, L.ink, 0.22), 0.98);
    ctx.fill();
    ctx.strokeStyle = rgba(L.ink, 0.5);
    ctx.lineWidth = 1.5 / zoom;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // from the slide about active channels on: a voltage-gated sodium channel and a voltage-gated potassium channel,
  // between the passive ones, opening and shutting through the action potential's round, their ions passing while they
  // are open — sodium in, then potassium out — and each named under it
  if (P.gated > 0.01) {
    channel(g, gatedPores[0], y, P.gated, naGateAt(lt), IONS.Na.colour);
    channel(g, gatedPores[1], y, P.gated, kGateAt(lt), IONS.K.colour);
    for (const [ion, x, from, every, count, inward] of [
      ['Na', gatedPores[0], 2170, 90, 2, true],
      ['K', gatedPores[1], 2380, 260, 3, false],
    ] as [IonKind, number, number, number, number, boolean][])
      for (let j = 0; j < count; j++) {
        const sIon = (lt - (from + every * j)) / 300;
        if (sIon < 0 || sIon > 1) continue;
        const yy = y + (inward ? 1 : -1) * lerp(-44, 44, smooth(sIon)) * u;
        disc(g, x, yy, 8 * u, IONS[ion].colour, 1, P.gated * Math.min(1, 5 * sIon, 5 * (1 - sIon)));
      }
    for (const [ion, x] of [
      ['Na', gatedPores[0]],
      ['K', gatedPores[1]],
    ] as ['Na' | 'K', number][])
      say(
        g,
        `${narrow ? 'gated' : 'voltage-gated'} ${IONS[ion].name}`,
        x,
        y + face + 14 * u,
        P.gated,
        11,
        'center',
        IONS[ion].colour
      );
  }
  // and, from the slide about inputs on, beyond them, a receptor: at each of the round's inputs, neurotransmitter from
  // another neuron dropping onto it, its channel opening a moment, and a sodium ion passing in
  if (receptorShown > 0.01) {
    channel(g, receptorX, y, receptorShown, receptorAt(lt), TRANSMITTER);
    for (const t0 of AP_INPUTS) {
      const fall = clamp01((lt - (t0 - 300)) / 300);
      const shown =
        lt > t0 - 300 ? receptorShown * (1 - smooth(clamp01((lt - (t0 + 200)) / 150))) : 0;
      if (shown > 0.01) {
        ctx.globalAlpha = shown;
        ctx.fillStyle = rgba(TRANSMITTER, 0.95);
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(
            receptorX + side * 6 * u,
            lerp(y - 80 * u, y - 23 * u, smooth(fall)),
            3.2 * u,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      const sIon = (lt - (t0 + 20)) / 260;
      if (sIon > 0 && sIon < 1)
        disc(
          g,
          receptorX,
          y + lerp(-44, 44, smooth(sIon)) * u,
          8 * u,
          IONS.Na.colour,
          1,
          receptorShown * Math.min(1, 5 * sIon, 5 * (1 - sIon))
        );
    }
    say(
      g,
      'a receptor: input from a synapse',
      receptorX,
      y + face + 14 * u,
      receptorShown,
      11,
      'center',
      mix(TRANSMITTER, L.ink, 0.3)
    );
  }

  // the ions, wandering on either side: outside above the membrane, inside below it — three pairs of the outside's,
  // on the slide reminding how charges push and pull, taken aside; and the inside's, on the slide of an imbalance,
  // first sorted, positive to the left and negative to the right, then flowing back
  const c4 = cycle(g.now, 3400);
  const p4 = clamp01(c4 / 0.7);
  const pairX = (i: number) => w / 2 + (i - 1) * (narrow ? w / 3 : 290 * u);
  const pairY = y - 68 * u;
  const apart = (pull: boolean) =>
    (pull ? lerp(96, 20, p4 * p4) : lerp(26, 96, 1 - (1 - p4) * (1 - p4))) * u;
  const along = (f: number) => 40 * u + f * (w - 80 * u);
  // among the many: each at its place, wandering — and, on the last slide, jostled faster, every which way
  const jostle = (s: number, t: number) =>
    Math.sin(g.now / 97 + s * 3) + 0.6 * Math.sin(g.now / 41 + t * 5);
  const dense = (c: Each): [number, number] => [
    along(c.dAlong) + drift(g.now, c.p, c.q, 10 * u) + 5 * u * P.fast * jostle(c.p, c.q),
    y +
      c.side * (36 + 82 * c.dDepth) * u +
      drift(g.now, c.q, c.p, 6 * u) +
      4 * u * P.fast * jostle(c.q, c.p),
  ];
  const cx = w / 2;
  const walker = WALKER >= 0 && P.walk > 0.01 ? ALL[WALKER] : null;
  const trip = walker ? walkAt(P.walkMs, dense(walker), cx, y, u, face) : null;
  // the potassium ion that leaves and the negative ion it draws — where each is, so that, on the slides about their
  // fields, the ions round them can be pushed and pulled before they are drawn: by the one, then the other
  const loneHome = dense(ALL[WALKER]);
  // close by the membrane outside, not against it — until the negative ion it draws holds it there
  const offMembrane = LIFT * u * (1 - P.pull);
  const loneLeft = leaveAt(P.leaveMs, loneHome, cx, y, face, u, pairDx, offMembrane);
  const loneAt: [number, number] = [
    lerp(loneHome[0], loneLeft[0], P.alone),
    lerp(loneHome[1], loneLeft[1], P.alone),
  ];
  const drawnHome = dense(ALL[DRAWN]);
  const drawnR = (ALL[DRAWN].kind === 'A' ? 10.5 : 8) * u;
  const drawnAt: [number, number] = [
    lerp(drawnHome[0], cx + pairDx, P.pull * P.pull),
    lerp(drawnHome[1], y + face + drawnR + 1.5 * u, P.pull * P.pull),
  ];
  const fields: [[number, number], number, number][] = [
    [loneAt, 1, P.fieldK],
    [drawnAt, -1, P.fieldN],
  ];
  const pushes: { x: number; y: number; r: number; ux: number; uy: number; a: number }[] = [];
  // where the bouncing ions hit the membrane, and how long ago, as a share of the ring that spreads from it
  const bumps: [number, number, number][] = [];
  // where each ion is drawn, its size, and whether it is potassium — for the bumps between them on the last slide
  const placed: { x: number; y: number; r: number; k: boolean }[] = [];
  if (P.ions > 0.01) {
    // the greyed ones first, so that potassium sits in front of them
    for (const front of [false, true]) {
      ALL.forEach((c, n) => {
        if ((c.kind === 'K') !== front) return;
        const { k } = c;
        if (k < 0 && P.crowd < 0.01) return;
        let x = 0;
        let yy = 0;
        let home = 0;
        let a = 0.8 * P.ions;
        const sorted = k >= 0 ? SPLIT.get(k) : undefined;
        if (k >= 0) {
          home = along(c.along) + drift(g.now, c.p, c.q, 14 * u);
          x = home;
          yy = y + c.side * (42 + 52 * c.depth) * u + drift(g.now, c.q, c.p, 8 * u);
          a *= c.side < 0 ? 1 - 0.55 * P.dim : 1;
          const pair = DEMO.findIndex((d) => d.includes(k));
          if (P.pairs > 0.01) {
            if (pair >= 0) {
              const side = DEMO[pair].indexOf(k) ? 1 : -1;
              x = lerp(x, pairX(pair) + (side * apart(DEMO_SAID[pair][2])) / 2, P.pairs);
              yy = lerp(yy, pairY, P.pairs);
              a *= lerp(1, ends(c4), P.pairs);
            } else a *= lerp(1, 0.28, P.pairs);
          }
          if (sorted !== undefined && P.split > 0.001)
            x = lerp(x, along(sorted) + drift(g.now, c.p, c.q, 6 * u), P.split);
          // on the slide about the membrane as a barrier: run at it, faster and faster, and bounce back off
          const bouncer = BOUNCERS.find(([j]) => j === k);
          if (bouncer && P.barrier > 0.01) {
            const b = cycle(g.now, BOUNCE, -bouncer[1]);
            const touch = y + c.side * (face + 9 * u);
            const e = b < 0.4 ? (b / 0.4) ** 2 : b < 0.8 ? 1 - (1 - (1 - (b - 0.4) / 0.4) ** 2) : 0;
            yy = lerp(yy, lerp(yy, touch, e), P.barrier);
            if (b > 0.4 && b < 0.6) bumps.push([x, y + c.side * face, (b - 0.4) / 0.2]);
          }
        } else a *= P.crowd;
        // among the many, at its own place
        if (P.crowd > 0.001) {
          const [dx, dy] = dense(c);
          x = k >= 0 ? lerp(x, dx, P.crowd) : dx;
          yy = k >= 0 ? lerp(yy, dy, P.crowd) : dy;
        }
        // (a sodium ion in potassium's colour for every 5 mM more potassium set on its side than there is)
        const more = TO_K.get(n);
        const asK =
          more === undefined
            ? 0
            : clamp01((c.side > 0 ? P.cin - CONC.K.in : P.cout - CONC.K.out) / PER_ION - more);
        if (c.kind !== 'K') a *= lerp(lerp(1, 0.42, P.focus), 1, asK);
        // and potassium's own inside, on the slides about the one that leaves — all but that one
        let quiet = c.kind === 'K' && c.side > 0 && n !== WALKER ? P.quiet : 0;
        // — or those that would not be there, with less potassium set inside: one fewer for every 5 mM less
        const spare = SPARE.get(n);
        if (spare !== undefined && P.cin < CONC.K.in - 0.01)
          quiet = Math.max(quiet, clamp01(spare + 2 - P.cin / PER_ION));
        if (quiet > 0.001) a *= lerp(1, 0.42, quiet);
        // were potassium uncharged: spreading out through the open channel, to a place of its own outside
        const migrant = MIGRANTS.get(n);
        if (migrant && P.drainMs > 0) {
          const rest: [number, number] = [
            along(migrant.dAlong) +
              drift(g.now, c.p, c.q, 10 * u) +
              5 * u * P.fast * jostle(c.p, c.q),
            y -
              (36 + 82 * migrant.dDepth) * u +
              drift(g.now, c.q, c.p, 6 * u) +
              4 * u * P.fast * jostle(c.q, c.p),
          ];
          [x, yy] = migrateAt(
            P.drainMs - migrant.order * MIGRATE_EVERY,
            [x, yy],
            rest,
            cx,
            y,
            face,
            u
          );
        }
        // and those left inside, spreading out evenly as the others go
        const settled = SETTLED.get(n);
        if (settled && P.drainMs > 0) {
          const e = smooth(clamp01(P.drainMs / SPREAD_DONE));
          x = lerp(
            x,
            along(settled.dAlong) +
              drift(g.now, c.p, c.q, 10 * u) +
              5 * u * P.fast * jostle(c.p, c.q),
            e
          );
          yy = lerp(
            yy,
            y +
              (36 + 82 * settled.dDepth) * u +
              drift(g.now, c.q, c.p, 6 * u) +
              4 * u * P.fast * jostle(c.q, c.p),
            e
          );
        }
        // the one potassium ion on its trip out: picked out, with the way it has come behind it
        if (n === WALKER && trip) {
          x = lerp(x, trip.x, P.walk);
          yy = lerp(yy, trip.y, P.walk);
          const shown = P.walk * trip.seen;
          const trail: [number, number][] = [];
          for (let back = 1000; back >= 0; back -= 50) {
            if (P.walkMs - back < 0 || ((P.walkMs % WALK) + WALK) % WALK < back) continue;
            const p = walkAt(P.walkMs - back, dense(c), cx, y, u, face);
            trail.push([p.x, p.y]);
          }
          if (trail.length > 1) {
            ctx.save();
            ctx.globalAlpha = 0.45 * shown;
            ctx.strokeStyle = rgba(IONS.K.colour, 1);
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            trail.forEach(([tx, ty], j) => (j ? ctx.lineTo(tx, ty) : ctx.moveTo(tx, ty)));
            ctx.stroke();
            ctx.restore();
          }
          const glow = ctx.createRadialGradient(x, yy, 0, x, yy, 22 * u);
          glow.addColorStop(0, rgba(IONS.K.colour, 0.35 * shown));
          glow.addColorStop(1, rgba(IONS.K.colour, 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, yy, 22 * u, 0, Math.PI * 2);
          ctx.fill();
          a = lerp(a, 0.95 * trip.seen, P.walk);
        }
        // the one that leaves, on the slides about the imbalance it makes: out through the channel, to rest beside it
        if (n === WALKER && P.alone > 0.01) {
          const [lx, ly] = leaveAt(P.leaveMs, [x, yy], cx, y, face, u, pairDx, offMembrane);
          [x, yy] = [lerp(x, lx, P.alone), lerp(yy, ly, P.alone)];
          lone = [x, yy];
        }
        // and the negative ion inside that it draws to the membrane opposite, faster the nearer it comes — in its own
        // colour as it does
        let tint = P.focus;
        if (n === DRAWN && P.reveal > 0.001) {
          tint = P.focus * (1 - P.reveal);
          a = lerp(a, 0.9, P.reveal);
        }
        if (n === DRAWN && P.pull > 0.001) {
          const e = P.pull * P.pull;
          [x, yy] = [lerp(x, cx + pairDx, e), lerp(yy, y + face + drawnR + 1.5 * u, e)];
          tint = Math.min(tint, P.focus * (1 - P.pull));
          a = lerp(a, 0.9, P.pull);
          drawnTo = [x, yy];
        }
        // on the slides about each one's field: pushed away from it if alike, drawn towards it if opposite — the nearer,
        // the more — and shown in its own colour, so that its sign can be seen; the other of the pair, held where it is
        // across the membrane, drawn towards it too
        for (const [from, sign, amount] of fields) {
          const source = sign > 0 ? WALKER : DRAWN;
          // each shown acting on positive ions only: the potassium ion's pushing them away, the negative ion's pulling
          // them in
          if (amount < 0.01 || n === source || SIGN[c.kind] < 0) continue;
          const away = SIGN[c.kind] * sign;
          const [ddx, ddy] = [x - from[0], yy - from[1]];
          const d = Math.hypot(ddx, ddy);
          const reach = 100 * u;
          if (d < 1 || d > reach) continue;
          const strength = clamp01((reach - d) / (0.6 * reach));
          const partner = n === WALKER || n === DRAWN;
          const shift = partner ? 0 : 6 * u * strength * amount * away;
          [x, yy] = [x + (ddx / d) * shift, yy + (ddy / d) * shift];
          const r = (c.kind === 'A' ? 10.5 : 8) * u;
          pushes.push({
            x,
            y: yy,
            r,
            ux: (ddx / d) * away,
            uy: (ddy / d) * away,
            a: amount * strength,
          });
          tint = Math.min(tint, P.focus * (1 - amount * strength));
          quiet = Math.min(quiet, P.quiet * (1 - amount * strength));
          a = lerp(a, 0.9, amount * strength);
        }
        // — and, where potassium is shown alone, every other ion gone, but for the sodium ions standing in for more of
        // it and the negative ion the first potassium ion out holds at the membrane; and potassium's greyed, too
        const kept = c.kind === 'K' ? 1 - quiet : n === DRAWN ? P.pull : asK;
        a *= lerp(kept, 1, P.others);
        // potassium's sign gone while it is imagined uncharged — and, its charge back, a ring spreading round it
        const sign = c.kind === 'K' && P.bare > 0.5 ? 0 : SIGN[c.kind];
        // — and, right in on the channel, every ion round it greyed
        const colour =
          c.kind === 'K'
            ? mix(IONS.K.colour, GREY, 0.85 * Math.max(quiet, P.onChannel))
            : mix(colourOf(c.kind, Math.max(tint, P.onChannel)), IONS.K.colour, asK);
        disc(
          g,
          x,
          yy,
          (c.kind === 'A' ? 10.5 : 8) * u,
          colour,
          sign,
          a * lerp(1, 0.6, P.onChannel) * away
        );
        // (as its charge comes back only: not as the next slide, with one ion leaving, blends in)
        if (c.kind === 'K' && P.recharge > 0.01 && P.recharge < 0.99 && P.alone < 0.01) {
          ctx.globalAlpha = 0.6 * a * (1 - P.recharge);
          ctx.strokeStyle = rgba(IONS.K.colour, 1);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, yy, lerp(9, 24, P.recharge) * u, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (P.random > 0.01)
          placed.push({ x, y: yy, r: (c.kind === 'A' ? 10.5 : 8) * u, k: c.kind === 'K' });
        // flowing back, on the slide of an imbalance: which way each goes
        const way = home - x;
        if (sorted !== undefined && P.flowing > 0.01 && Math.abs(way) > 10 * u) {
          const d = Math.sign(way);
          arrow(ctx, x + d * 13 * u, yy, x + d * 30 * u, yy, L.ink, 0.55 * P.flowing, 1.6, 6);
        }
      });
    }
  }
  // many pairs lining the membrane, coming one after another out from the first — potassium outside, a negative ion
  // inside — and the field they make across it, down through the membrane and the channel alike; and a potassium ion
  // coming up into the channel, pushed back, and falling back in
  const lining = 30 * u;
  const tryMs = cycle(g.now, 3000) * 3000;
  const tryAt: [number, number] = (() => {
    const [start, mouth, high] = [
      [cx - 18 * u, y + face + 34 * u],
      [cx, y + face + 4 * u],
      [cx, y - 2 * u],
    ] as [number, number][];
    const go = (a: [number, number], b: [number, number], e: number): [number, number] => [
      lerp(a[0], b[0], e),
      lerp(a[1], b[1], e),
    ];
    if (tryMs < 900) return go(start, mouth, smooth(tryMs / 900));
    if (tryMs < 1500) return go(mouth, high, 1 - (1 - (tryMs - 900) / 600) ** 2);
    if (tryMs < 2000) return go(high, mouth, ((tryMs - 1500) / 500) ** 2);
    return go(mouth, [cx + 18 * u, y + face + 26 * u], smooth((tryMs - 2000) / 1000));
  })();
  if (P.sheet > 0.01) {
    // right of the channel, every `lining` out from the first pair; left of it, every `lining` out from one beside it,
    // all but touching it — a chloride ion inside that one, the smaller kind, to fit
    const beside = cx - BESIDE * u;
    const slots: number[] = [];
    for (let k = -14; k <= 14; k++) {
      const right = cx + pairDx + k * lining;
      // (where the first pair rests, too, once the charge lines the membrane the other way round and it has gone)
      if (
        (k !== 0 || P.charge < 0) &&
        right > cx + 26 * u &&
        right < x1 &&
        pores.every((px) => Math.abs(px - right) > 26 * u)
      )
        slots.push(right);
      const left = beside - Math.abs(k) * lining;
      if (k <= 0 && left > x0 && pores.every((px) => px === cx || Math.abs(px - left) > 26 * u))
        slots.push(left);
    }
    slots.sort((a, b) => Math.abs(a - cx - pairDx) - Math.abs(b - cx - pairDx));
    // (each one's kind as it comes in that order)
    const rank = new Map(slots.map((x, j) => [x, j]));
    // — or, where the reader sets the concentrations, spread along the whole membrane however many there are
    if (P.vary > 0.5) {
      const byX = [...slots].sort((a, b) => a - b);
      slots.splice(0, slots.length, ...spreadOrder(byX.length).map((i) => byX[i]));
    }
    // (as many as there is charge lining it — the other way round, potassium inside and chloride outside, where more
    // potassium is set outside than in)
    const present = (j: number) => clamp01(P.sheet * Math.abs(P.charge) * (slots.length + 2) - j);
    const way = P.charge < 0 ? -1 : 1;
    // (where the inside's surplus negative charge is tied to the membrane potential's sign, a glow along the inside face,
    // behind the negative ions lining it)
    if (P.surplus > 0.01) {
      const deep = 26 * u;
      const band = ctx.createLinearGradient(0, y + face, 0, y + face + deep);
      band.addColorStop(0, rgba(NEG, 0.4 * P.surplus));
      band.addColorStop(1, rgba(NEG, 0));
      ctx.fillStyle = band;
      // (along the membrane, but not across its channels)
      let from = x0;
      for (const px of [...pores].sort((p, q) => p - q)) {
        ctx.fillRect(from, y + face, Math.max(0, px - 18 * u - from), deep);
        from = Math.max(from, px + 18 * u);
      }
      ctx.fillRect(from, y + face, Math.max(0, x1 - from), deep);
    }
    slots.forEach((x, j) => {
      const shown = present(j);
      if (shown < 0.01) return;
      // greyed, right in on the channel
      const faded = 0.9 * shown * lerp(1, 0.6, P.onChannel) * away;
      disc(
        g,
        x,
        y - way * (face + 9 * u),
        8 * u,
        mix(IONS.K.colour, GREY, 0.85 * P.onChannel),
        1,
        faded
      );
      const kind = way < 0 || x === beside || !((rank.get(x) ?? j) % 3) ? 'Cl' : 'A';
      disc(
        g,
        x,
        y + way * (face + (kind === 'A' ? 12 : 10) * u),
        (kind === 'A' ? 10.5 : 8) * u,
        colourOf(kind, P.onChannel),
        -1,
        faded
      );
    });
    // and, as more potassium ions come out, more pairs between those by the channel, close in: one after another, each
    // ion up through the pore and over to its place, and a negative ion inside drawn to it as it settles
    if (P.denser * P.zoom > 0.01) {
      const extra = [
        cx + pairDx - lining / 2,
        beside - lining / 2,
        cx + pairDx + lining / 2,
        beside - 1.5 * lining,
        cx + pairDx + 1.5 * lining,
        beside - 2.5 * lining,
      ];
      const greyed = (c: RGB) => mix(c, GREY, 0.85 * P.onChannel);
      extra.forEach((ex, k) => {
        const s = clamp01(P.denser * extra.length - k);
        if (s < 0.01) return;
        const shown = 0.9 * P.zoom * lerp(1, 0.6, P.onChannel);
        // up through the pore, then over to its place by the membrane
        const [kx, ky] =
          s < 0.5
            ? [cx, lerp(y + face + 30 * u, y - face - 7 * u, smooth(s / 0.5))]
            : [
                lerp(cx, ex, smooth((s - 0.5) / 0.5)),
                lerp(y - face - 7 * u, y - face - 9 * u, smooth((s - 0.5) / 0.5)),
              ];
        disc(g, kx, ky, 8 * u, greyed(IONS.K.colour), 1, shown * Math.min(1, s * 6));
        disc(
          g,
          ex,
          y + face + 10 * u,
          8 * u,
          colourOf('Cl', P.onChannel),
          -1,
          shown * smooth((s - 0.7) / 0.3)
        );
      });
    }
    // their field: long straight lines right along the membrane — as far as the pairs line it, so all along it once they
    // all do, through the channel too — sweeping down through it, outside to inside, each a glowing crest with a fainter
    // one just behind; drawn in the zoomed frame, so as thin there as they are wide on the page
    // (all along it where the reader sets the concentrations, the pairs being spread along it however many there are)
    const lined = slots.filter((_, j) => present(j) > 0.5);
    const spread = P.vary > 0.5;
    const xl = spread ? x0 : Math.max(x0, Math.min(cx + pairDx, ...lined) - lining / 2);
    const xr = spread ? x1 : Math.min(x1, Math.max(cx + pairDx, ...lined) + lining / 2);
    ctx.save();
    ctx.strokeStyle = rgba(FIELD, 1);
    ctx.lineCap = 'round';
    // as many crests as the field is strong — three with all the charge there is, fewer with less, and thinner: each
    // at one of six evenly spaced places in the sweep, so that one, two or three are evenly spaced, each fading in or
    // out between; and up through it, inside to outside, where the charge lines it the other way
    const strength = Math.min(1, Math.abs(P.charge));
    const many = 3 * strength;
    const crests = [
      clamp01(many),
      0,
      clamp01(many - 2),
      clamp01(many - 1) - clamp01(many - 2),
      clamp01(many - 2),
      0,
    ];
    const thick = lerp(0.35, 1, strength);
    const [waveFrom, waveTo] =
      P.charge < 0 ? [y + face + u, y - face - u] : [y - face - u, y + face + u];
    for (let j = 0; j < crests.length; j++) {
      const q = cycle(g.now, WAVE_MS, -(j / crests.length) * WAVE_MS);
      const a = P.sheet * P.waves * crests[j] * Math.sin(Math.PI * q) ** 0.7;
      if (a < 0.01) continue;
      // (stronger, close in, with the more pairs lining the membrane)
      const strong = 1 + 0.7 * P.denser * P.zoom;
      for (const [back, alpha, width, glow] of [
        [0, 0.9, 2.6, 10],
        [0.035, 0.35, 1.2, 0],
      ]) {
        const at = lerp(waveFrom, waveTo, Math.max(0, q - back));
        ctx.globalAlpha = Math.min(1, alpha * a * strong);
        ctx.lineWidth = (width * u * strong * thick) / zoom;
        ctx.shadowColor = rgba(FIELD, 0.6);
        ctx.shadowBlur = glow * u * thick;
        ctx.beginPath();
        ctx.moveTo(xl, at);
        ctx.lineTo(xr, at);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // a potassium ion outside, drawn down to the channel's mouth, through it quickening, and into the cell
  const enterMs = cycle(g.now, 3200) * 3200;
  const enterAt: [number, number] = (() => {
    const [start, mouth, through, settled] = [
      [cx + 22 * u, y - face - 26 * u],
      [cx, y - face - 4 * u],
      [cx, y + face + 4 * u],
      [cx - 14 * u, y + face + 32 * u],
    ] as [number, number][];
    const go = (a: [number, number], b: [number, number], e: number): [number, number] => [
      lerp(a[0], b[0], e),
      lerp(a[1], b[1], e),
    ];
    if (enterMs < 1000) return go(start, mouth, smooth(enterMs / 1000));
    if (enterMs < 1600) return go(mouth, through, ((enterMs - 1000) / 600) ** 1.6);
    return go(through, settled, smooth(Math.min(1, (enterMs - 1600) / 1000)));
  })();
  if (P.enter > 0.01) {
    const seenAt = Math.min(1, enterMs / 250, (3200 - enterMs) / 400);
    disc(g, enterAt[0], enterAt[1], 8 * u, IONS.K.colour, 1, P.enter * seenAt);
  }
  if (P.attempt > 0.01) {
    const seenAt = Math.min(1, tryMs / 250, (3000 - tryMs) / 400);
    disc(g, tryAt[0], tryAt[1], 8 * u, IONS.K.colour, 1, P.attempt * seenAt);
  }
  // on the last two slides: wherever a potassium ion bumps into another, a ring round where they meet, as hard as they
  // press; and, on the last, at the open channel, potassium ions now and then wandering through, out and in, counted
  if (P.random > 0.01) {
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++) {
        const [m, n] = [placed[i], placed[j]];
        if (!m.k && !n.k) continue;
        const d = Math.hypot(m.x - n.x, m.y - n.y);
        const touch = m.r + n.r + 2 * u;
        if (d >= touch) continue;
        ctx.globalAlpha = 0.55 * P.random * clamp01((touch - d) / (0.6 * touch));
        ctx.strokeStyle = rgba(L.ink, 1);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc((m.x + n.x) / 2, (m.y + n.y) / 2, 0.6 * touch, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
  }
  const [out, into] =
    P.flux > 0.01 ? [crossed(opened, g.now, false), crossed(opened, g.now, true)] : [0, 0];
  if (P.flux > 0.01) drawCrossers(g, cx, y, face, P.flux);
  // and, at the equilibrium potential, as often in as out
  if (P.even > 0.01) drawEven(g, cx, y, face, P.even);
  // and, where the reader sets potassium's concentrations, its ions through the channel, out and in, as often as those
  // and the membrane potential make each way
  if (P.crossing > 0.01)
    for (const c of crossing) {
      const [x, yy, seen] = crosserAt(c.age, c.inward, c.side, c.j, cx, y, face, u);
      disc(g, x, yy, 8 * u, IONS.K.colour, 1, 0.9 * P.crossing * seen);
    }
  ctx.restore();
  // words at the foot on a plate of the page — for when the view is closed in, and the ions behind them are large
  // — the line above it, `row` 1, for a second thing to say
  const foot = (text: string, a: number, row = 0, colour: RGB = L.ink) =>
    footNote(g, text, a * P.captions, row, colour);
  if (P.flux > 0.01) {
    const count = narrow
      ? `so far: ${out} out, ${into} in`
      : `through the potassium channel so far: ${out} out, ${into} in`;
    // (gone before diffusion's words take its place)
    say(g, count, w / 2, h - 20 * u, P.flux * clamp01(1 - 2 * P.term), 13, 'center', IONS.K.colour);
  }
  // the net movement out: a broad arrow beside the channel, with how many more have gone out than in; then the
  // process named, diffusion, and what it is — once a potassium ion has left, further out, clear of it and the
  // negative ion it draws, which rest just right of the channel
  const ax = cx + (62 + 48 * P.alone) * u;
  if (P.net > 0.01) {
    arrow(ctx, ax, y + 78 * u, ax, y - 78 * u, IONS.K.colour, 0.4 * P.net, 6 * u, 18 * u);
    const net = `${narrow ? 'net' : 'net movement'}: ${out - into} out`;
    // (the count only while the ions through are counted)
    const shown = P.net * (1 - P.term) * clamp01(P.flux);
    mathWords(
      ctx,
      net,
      ax + 16 * u,
      y - 52 * u,
      IONS.K.colour,
      shown,
      15 * g.ts,
      'left',
      L.page,
      'italic 600'
    );
  }
  if (P.term > 0.01) {
    const big = 24 * g.ts;
    mathWords(
      ctx,
      'diffusion',
      ax + 16 * u,
      y - 52 * u,
      IONS.K.colour,
      P.term,
      big,
      'left',
      L.page,
      'italic 600'
    );
    const what = narrow
      ? 'from where there are many to where there are few'
      : 'diffusion: random motion carrying ions from where they are many to where they are few';
    say(g, what, w / 2, h - 20 * u, clamp01(2 * P.term - 1), 13, 'center');
  }
  if (P.spread > 0.01) {
    const why = narrow
      ? 'they would spread until both sides were even'
      : 'imagined without charge, potassium ions would keep spreading until both sides held about as many';
    say(g, why, w / 2, h - 20 * u, 0.85 * P.spread, 13, 'center');
  }
  // one ion out: how the two sides' charges now stand
  if (P.imbalance > 0.01) {
    const why = narrow
      ? 'inside a little negative, outside a little positive'
      : 'one positive charge has left the cell: the inside is now a little negative, the outside a little positive';
    say(g, why, w / 2, h - 20 * u, P.imbalance * (1 - P.zoom), 13, 'center');
  }
  // close in: the potassium ion outside, the negative ion it draws to the membrane inside, and the pull between them
  if (P.pulled > 0.01) {
    const [kx, ky] = seen(...lone);
    const [nx, ny] = seen(...drawnTo);
    const a = P.pulled;
    ctx.save();
    ctx.globalAlpha = 0.6 * a;
    ctx.strokeStyle = rgba(L.ink, 1);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const [kr, nr] = [8 * u * zoom, drawnR * zoom];
    ctx.moveTo(kx, ky + kr + 4 * u);
    ctx.lineTo(nx, ny - nr - 4 * u);
    ctx.stroke();
    ctx.restore();
    arrow(ctx, kx + kr + 10 * u, ky - 4 * u, kx + kr + 10 * u, ky + 18 * u, L.ink, 0.7 * a, 1.8, 7);
    arrow(ctx, nx + nr + 10 * u, ny + 4 * u, nx + nr + 10 * u, ny - 18 * u, L.ink, 0.7 * a, 1.8, 7);
    const ion = narrow ? 'the K^{+} that left' : 'the potassium ion that left the cell';
    const drawn = narrow
      ? 'a negative ion, drawn in'
      : 'a negative ion inside, drawn to the membrane';
    // the labels to the left of the two, clear of the arrows on their right
    mathWords(
      ctx,
      ion,
      kx - kr - 12 * u,
      ky - 6 * u,
      IONS.K.colour,
      a,
      13 * g.ts,
      'right',
      L.page,
      'italic 600'
    );
    say(g, drawn, nx - nr - 12 * u, ny + 6 * u, a, 13, 'right');
    foot(
      narrow
        ? 'opposite charges attract'
        : 'opposite charges attract each other, across the membrane',
      a
    );
  }
  // each ion's field, on its slide: ripples round it, pulse after pulse — out from the positive one, in towards the
  // negative one; potassium ions round it pushed away or drawn in; the push or pull it gives each ion round it; and what
  // it does
  fields.forEach(([at, sign, amount]) => {
    if (amount < 0.01) return;
    const [sx, sy] = seen(...at);
    const colour = sign > 0 ? IONS.K.colour : colourOf(ALL[DRAWN].kind, 0);
    const near = (sign > 0 ? 8 * u : drawnR) * zoom + 6 * u;
    const far = near + 58 * u;
    const kr = 8 * u * zoom;
    // potassium ions outside coming at the potassium ion, slowing as they near its field, and pushed back out — turned
    // aside a little, as a charge pushed off another is — each with an arrow out as it goes
    if (sign > 0)
      for (const [from, offset] of VISITORS) {
        const s = cycle(g.now, VISIT_MS, -offset);
        const r = lerp(near + 70 * u, near + 320 * u, (2 * s - 1) ** 2);
        const turn = from + 0.2 * (2 * s - 1);
        const [ca, sa] = [Math.cos(turn), Math.sin(turn)];
        const [vx, vy] = [sx + ca * r, sy + sa * r];
        disc(g, vx, vy, kr, IONS.K.colour, 1, 0.9 * amount * Math.min(1, s / 0.12, (1 - s) / 0.12));
        const pushed = s > 0.5 ? Math.sin(clamp01((s - 0.5) / 0.32) * Math.PI) : 0;
        const [start, len] = [kr + 4 * u, 34 * u];
        arrow(
          ctx,
          vx + ca * start,
          vy + sa * start,
          vx + ca * (start + len),
          vy + sa * (start + len),
          L.ink,
          0.85 * amount * pushed,
          2,
          8
        );
      }
    // potassium ions inside drawn in to the negative ion — faster the nearer they come, curving in onto it — to rest
    // against it a while, and go; each with an arrow in, towards it, until it is there
    else
      for (const [from, offset, bend] of LURED) {
        const s = cycle(g.now, LURE_MS, -offset);
        const e = clamp01(s / 0.6);
        const r = lerp(near + 300 * u, drawnR * zoom + kr + 2 * u, e * e);
        const turn = from + 0.12 * bend * (1 - e);
        const [ca, sa] = [Math.cos(turn), Math.sin(turn)];
        const [vx, vy] = [sx + ca * r, sy + sa * r];
        disc(g, vx, vy, kr, IONS.K.colour, 1, 0.9 * amount * Math.min(1, s / 0.1, (1 - s) / 0.12));
        const drawn = smooth(clamp01(e / 0.2)) * (1 - smooth(clamp01((e - 0.7) / 0.2)));
        const [start, len] = [kr + 4 * u, 34 * u];
        arrow(
          ctx,
          vx - ca * start,
          vy - sa * start,
          vx - ca * (start + len),
          vy - sa * (start + len),
          L.ink,
          0.85 * amount * drawn,
          2,
          8
        );
      }
    // each pulse a crest, glowing in the ion's colour, with a fainter trough behind it: out from the positive ion,
    // widening and fading as it goes; in towards the negative one, faint far out and sharpening as it closes in
    for (let k = 0; k < RIPPLES; k++) {
      const p = (((g.now / RIPPLE_MS + k / RIPPLES) % 1) + 1) % 1;
      const out = sign > 0 ? p : 1 - p;
      const r = near + out * RIPPLE_REACH * u;
      const a =
        sign > 0
          ? amount * smooth(clamp01(p / 0.1)) * (1 - p) ** 1.5
          : amount * smooth(clamp01(out / 0.1)) * (1 - out) ** 1.5;
      if (a < 0.01) continue;
      ctx.save();
      ctx.strokeStyle = rgba(colour, 1);
      ctx.globalAlpha = 0.85 * a;
      ctx.lineWidth = (2.6 - 1.4 * out) * u;
      ctx.shadowColor = rgba(colour, 0.7);
      ctx.shadowBlur = 12 * u;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.35 * a;
      ctx.lineWidth = 1.2 * u;
      ctx.beginPath();
      ctx.arc(sx, sy, sign > 0 ? Math.max(near, r - 9 * u) : r + 9 * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    const whose =
      sign > 0
        ? narrow
          ? "K^{+}'s field"
          : "the potassium ion's field"
        : "the negative ion's field";
    // beside the positive ion; under the negative one, which potassium ions come at from either side
    mathWords(
      ctx,
      whose,
      sign > 0 ? sx + far + 10 * u : sx,
      sign > 0 ? Math.min(sy, h - 50 * u) : sy + near + 26 * u,
      colour,
      amount,
      13 * g.ts,
      sign > 0 ? 'left' : 'center',
      L.page,
      'italic 600'
    );
    foot(
      sign > 0
        ? narrow
          ? 'positive ions pushed away'
          : 'round a positive charge the field points out: positive ions are pushed away'
        : narrow
          ? 'positive ions pulled in'
          : 'round a negative charge the field points in: positive ions are pulled in',
      amount
    );
  });
  // the field defined: arrows all round the potassium ion, each the force a unit positive charge would feel there —
  // out from it, weaker further off — and such a charge set down at one point after another, the force on it in bold
  if (P.probe > 0.01) {
    const [sx, sy] = seen(...lone);
    const kr = 8 * u * zoom;
    const r0 = kr + 30 * u;
    const force = (r: number) => Math.max(8 * u, 40 * u * (r0 / r) ** 2);
    for (let ring = 0; ring < 3; ring++) {
      const r = r0 + 50 * u * ring;
      const n = 10 + 4 * ring;
      for (let i = 0; i < n; i++) {
        const th = (i / n) * Math.PI * 2 + 0.3 * ring;
        const [ca, sa] = [Math.cos(th), Math.sin(th)];
        const [x, y] = [sx + ca * r, sy + sa * r];
        // (clear of the words at the foot; above the figure, the page shows them, as it does the ions there)
        if (y > h - 36 * u) continue;
        const half = force(r) / 2;
        arrow(
          ctx,
          x - ca * half,
          y - sa * half,
          x + ca * half,
          y + sa * half,
          FIELD,
          0.75 * P.probe,
          1.6,
          6
        );
      }
    }
    // the unit charge: at each place in turn — which way round, and how far out — a while
    const SPOTS: [number, number][] = [
      [-0.7, 1.3],
      [-2.6, 2.2],
      [0.35, 0.9],
      [-1.75, 1.7],
    ];
    const every = 1900;
    const turn = Math.floor(g.now / every);
    const [th, out] = SPOTS[((turn % SPOTS.length) + SPOTS.length) % SPOTS.length];
    const k = (g.now - turn * every) / every;
    const shown = P.probe * Math.min(1, k / 0.15, (1 - k) / 0.15);
    const r = r0 + 50 * u * (out - 1);
    const [ca, sa] = [Math.cos(th), Math.sin(th)];
    const [tx, ty] = [sx + ca * r, sy + sa * r];
    const tr = 9 * u;
    ctx.globalAlpha = shown;
    ctx.beginPath();
    ctx.arc(tx, ty, tr, 0, Math.PI * 2);
    ctx.fillStyle = rgba(L.page, 1);
    ctx.fill();
    ctx.strokeStyle = rgba(L.ink, 0.85);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx - tr * 0.5, ty);
    ctx.lineTo(tx + tr * 0.5, ty);
    ctx.moveTo(tx, ty - tr * 0.5);
    ctx.lineTo(tx, ty + tr * 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const len = Math.min(64 * u, 1.5 * force(r) + 10 * u);
    arrow(
      ctx,
      tx + ca * (tr + 3 * u),
      ty + sa * (tr + 3 * u),
      tx + ca * (tr + 3 * u + len),
      ty + sa * (tr + 3 * u + len),
      L.ink,
      0.9 * shown,
      2.4,
      9
    );
    // named on the side away from the arrow
    const away = ca > 0 ? 'right' : 'left';
    say(
      g,
      narrow ? 'unit + charge' : 'a unit positive charge',
      tx - Math.sign(ca || 1) * (tr + 6 * u),
      ty - (tr + 8 * u),
      shown,
      12.5,
      away
    );
    say(
      g,
      'force',
      tx + ca * (tr + 14 * u + len),
      ty + sa * (tr + 14 * u + len),
      shown,
      12.5,
      'center'
    );
    foot(
      narrow
        ? 'the field: the force on a unit + charge'
        : 'the electric field at a point: the force a single unit of positive charge would feel there',
      P.probe
    );
  }
  // the pair's field together: its lines traced out from the potassium ion to the negative ion — straight down between
  // them, bowing out to either side, drawn faint — and waves sweeping down along them, outside to inside, each a straight
  // line right across them, as wide as the field is where it is. And named
  if (P.across > 0.01) {
    const [ka, kb] = [seen(...lone), seen(...drawnTo)];
    const [ra, rb] = [8 * u * zoom, drawnR * zoom];
    const lines = fieldLines(ka, kb, ra, rb, FIELD_LINES, FIELD_SPREAD);
    ctx.save();
    ctx.strokeStyle = rgba(FIELD, 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // every other line, faint: enough to show the shape the waves sweep through
    ctx.globalAlpha = 0.18 * P.across;
    ctx.lineWidth = 1.2 * u;
    lines.forEach(({ pts }, i) => {
      if (i % 2) return;
      ctx.beginPath();
      pts.forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    });
    // a wave: a straight line across the field at the height `q` of the way down from the one ion to the other, as wide
    // as the field is there — from its leftmost line to its rightmost
    const [top, bottom] = [ka[1] + ra, kb[1] - rb];
    const edge = ({ pts }: FieldLine, at: number) => {
      const i = pts.findIndex(([, py]) => py >= at);
      if (i <= 0) return pts[Math.max(0, i)][0];
      const [[x0, y0], [x1, y1]] = [pts[i - 1], pts[i]];
      return lerp(x0, x1, (at - y0) / (y1 - y0 || 1));
    };
    const wave = (q: number) => {
      const at = lerp(top, bottom, q);
      const xs = lines.map((line) => edge(line, at));
      ctx.beginPath();
      ctx.moveTo(Math.min(...xs), at);
      ctx.lineTo(Math.max(...xs), at);
      ctx.stroke();
    };
    for (let j = 0; j < FIELD_WAVES; j++) {
      const q = cycle(g.now, WAVE_MS, -(j / FIELD_WAVES) * WAVE_MS);
      const a = P.across * P.waves * Math.sin(Math.PI * q) ** 0.7;
      if (a < 0.01) continue;
      // the crest, glowing; and a fainter one just behind it
      ctx.globalAlpha = 0.9 * a;
      ctx.lineWidth = 2.6 * u;
      ctx.shadowColor = rgba(FIELD, 0.6);
      ctx.shadowBlur = 10 * u;
      wave(q);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.35 * a;
      ctx.lineWidth = 1.2 * u;
      wave(Math.max(0, q - 0.035));
    }
    ctx.restore();
    // beside the widest of its lines, at the membrane
    const widest = Math.max(...lines.flatMap((line) => line.pts.map(([x]) => x)));
    mathWords(
      ctx,
      narrow ? 'the field' : 'the field across the membrane',
      widest + 28 * u,
      seen(cx, y)[1],
      FIELD,
      P.across,
      13 * g.ts,
      'left',
      L.page,
      'italic 600'
    );
  }
  if (P.attempt > 0.01) {
    const inside = clamp01((face - Math.abs(tryAt[1] - y)) / (4 * u));
    const [tx, ty] = seen(...tryAt);
    const r = 8 * u * zoom;
    arrow(ctx, tx, ty + r + 2 * u, tx, ty + r + 30 * u, FIELD, P.attempt * inside, 2.4, 9);
    mathWords(
      ctx,
      'pushed back',
      tx - r - 12 * u,
      ty,
      FIELD,
      P.attempt * inside,
      13 * g.ts,
      'right',
      L.page,
      'italic 600'
    );
  }
  // the ion drawn in: an arrow under it down into the cell while it is in the channel, and named; and what it means
  if (P.enter > 0.01) {
    const inside = clamp01((face + 6 * u - Math.abs(enterAt[1] - y)) / (6 * u));
    const [tx, ty] = seen(...enterAt);
    const r = 8 * u * zoom;
    arrow(ctx, tx, ty + r + 2 * u, tx, ty + r + 30 * u, FIELD, P.enter * inside, 2.4, 9);
    mathWords(
      ctx,
      'drawn in',
      tx + r + 12 * u,
      ty,
      FIELD,
      P.enter * inside,
      13 * g.ts,
      'left',
      L.page,
      'italic 600'
    );
    foot(
      narrow
        ? 'potassium drawn in: easier to enter'
        : 'the field draws potassium ions into the cell: more of them make it in through the channel',
      P.enter
    );
  }
  // two points, A outside and B inside, either side of the channel, a dashed line between them and the voltage
  // across it; and, on the next slide, a positive charge carried from B up to A against the field, the work it takes
  // filling a bar, in joules
  if (P.points > 0.01) {
    const [chx, chy] = seen(cx, y);
    // (close in, past the ends of the channel's walls)
    const reach = Math.max(Math.min(105 * u, h / 2 - 40 * u), chy - wallTop + 12 * u);
    const [ax, ay] = [chx, chy - reach];
    const [bx, by] = [chx, chy + reach];
    const a = P.points;
    ctx.save();
    ctx.globalAlpha = 0.75 * a;
    ctx.strokeStyle = rgba(L.ink, 1);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5 * u, 5 * u]);
    ctx.lineDashOffset = -g.now * 0.01;
    ctx.beginPath();
    ctx.moveTo(ax, ay + 8 * u);
    ctx.lineTo(bx, by - 8 * u);
    ctx.stroke();
    ctx.restore();
    for (const [px, py, name, energy] of [
      [ax, ay, narrow ? 'A' : 'A, outside', 'U_{out}'],
      [bx, by, narrow ? 'B' : 'B, inside', 'U_{in}'],
    ] as [number, number, string, string][]) {
      ctx.globalAlpha = a;
      ctx.fillStyle = rgba(L.page, 1);
      ctx.strokeStyle = rgba(L.ink, 1);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 6 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = rgba(L.ink, 1);
      ctx.beginPath();
      ctx.arc(px, py, 2.2 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      say(g, name, px + 14 * u, py, a, 13, 'left');
      // (and, where a positive charge sits at each, the potential energy it has there)
      say(
        g,
        `: ${energy}`,
        px + 14 * u + mathWidth(ctx, name, 13 * g.ts),
        py,
        a * P.levels,
        13,
        'left'
      );
    }
    // a positive charge at each point; the one outside glowing with the energy it would give up coming in, an arrow
    // the way it would go
    if (P.levels > 0.01) {
      if (P.stored > 0.01) {
        const r = (21 + 3 * Math.sin(g.now / 260)) * u;
        const glow = ctx.createRadialGradient(ax, ay, 0, ax, ay, r);
        glow.addColorStop(0, rgba(FIELD, 0.55 * a * P.stored));
        glow.addColorStop(1, rgba(FIELD, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ax, ay, r, 0, Math.PI * 2);
        ctx.fill();
        arrow(ctx, ax, ay + 11 * u, ax, ay + 27 * u, FIELD, 0.8 * a * P.stored, 2, 7);
      }
      disc(g, ax, ay, 7 * u, IONS.K.colour, 1, a * P.levels);
      disc(g, bx, by, 7 * u, IONS.K.colour, 1, a * P.levels);
    }
    // the voltage between them, a badge beside the line's middle — then what it is in volts; then, the charge carried
    // the other way, the membrane potential
    // (close in, in the membrane, clear of the channel's wall)
    const vx = chx - Math.max(40 * u, wallReach + 10 * u);
    const labels: [string, number][] = [
      [narrow ? 'voltage' : 'voltage between A and B', (1 - P.units) * (1 - P.inward)],
      [
        narrow ? `voltage: ${mV(-E_K)}` : `voltage between A and B: ${mV(-E_K)}`,
        P.units * (1 - P.inward),
      ],
      ['membrane potential', P.inward * (1 - P.signed)],
      [narrow ? `V_{m}: ${mV(E_K)}` : `membrane potential: ${mV(E_K)}`, P.inward * P.signed],
    ];
    ctx.font = `600 ${12.5 * g.ts}px ${SERIF}`;
    const bw =
      labels.reduce((sum, [label, k]) => sum + k * ctx.measureText(label).width, 0) + 22 * u;
    ctx.globalAlpha = 0.95 * a;
    ctx.fillStyle = rgba(L.page, 1);
    ctx.strokeStyle = rgba(FIELD, 1);
    ctx.lineWidth = 1.5 + 1.2 * P.perUnit;
    // (lit, where the membrane potential is worked out from the difference in potential energy)
    ctx.shadowColor = rgba(FIELD, 0.7 * P.perUnit);
    ctx.shadowBlur = 14 * u * P.perUnit;
    ctx.beginPath();
    ctx.roundRect(vx - bw, chy - 12 * u, bw, 24 * u, 12 * u);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    for (const [label, k] of labels) say(g, label, vx - bw / 2, chy, a * k, 12.5, 'center', FIELD);
    foot(
      narrow
        ? 'the field, measured: a voltage'
        : 'the field can be measured by the voltage it makes between two points',
      a * (1 - P.work) * (1 - P.units)
    );
    // in volts: the work done on the charge, in joules, over the charge, in coulombs
    const volts = (Math.abs(E_K) / 1000).toFixed(3);
    foot(
      narrow
        ? `1 V = 1 J per C: here ${volts} V`
        : `1 volt = 1 joule per coulomb: ${joules(WORK_J)} ÷ 1.60 × 10^{−19} C = ${volts} V, or ${mV(-E_K)}`,
      a * P.units * (1 - P.inward)
    );
    // a bar beside the channel filling as a charge is carried along the line, and what it comes to so far: the work done
    // on it, or the energy it gives up
    // (close in, in the membrane beside the channel's other wall)
    const barX = chx + Math.max(70 * u, wallReach + 14 * u);
    const barW = narrow ? 70 * u : 110 * u;
    const barY = lerp(ay - 4 * u, chy - 4 * u, P.zoom);
    const bar = (k: number, shown: number, named: [string, number][]) => {
      if (shown < 0.01) return;
      ctx.globalAlpha = shown;
      ctx.fillStyle = rgba(L.grey, 0.35);
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, 8 * u, 4 * u);
      ctx.fill();
      ctx.fillStyle = rgba(FIELD, 1);
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(2, barW * k), 8 * u, 4 * u);
      ctx.fill();
      ctx.globalAlpha = 1;
      for (const [text, b] of named)
        say(g, text, barX, barY - 12 * u, shown * b, 12, 'left', FIELD);
    };
    // the membrane potential: a positive charge carried from A, outside, down to B, inside, and again, an arrow ahead
    // of it as it goes — then pulled in by the field rather than carried, the energy it gives up a glow round it,
    // growing as it goes, the arrow the field's, and that energy filling the bar; told, with the membrane potential's
    // sign, as the work done on it, negative; gone where the negative charge lining the inside is picked out
    if (P.inward > 0.01) {
      const cycleMs = 3400;
      const t = cycle(g.now, cycleMs) * cycleMs;
      const k = smooth(clamp01((t - 300) / 2200));
      const seenAt = Math.min(1, t / 250, (cycleMs - t) / 350);
      const qy = lerp(ay, by, k);
      const shown = a * P.inward * seenAt * (1 - P.hidden);
      if (P.freed > 0.01) {
        const r = lerp(10, 26, k) * u;
        const glow = ctx.createRadialGradient(ax, qy, 0, ax, qy, r);
        glow.addColorStop(0, rgba(FIELD, 0.6 * k * P.freed * shown));
        glow.addColorStop(1, rgba(FIELD, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ax, qy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      disc(g, ax, qy, 7 * u, IONS.K.colour, 1, shown);
      if (k > 0.02 && k < 0.98)
        arrow(ctx, ax, qy + 11 * u, ax, qy + 26 * u, mix(L.ink, FIELD, P.freed), 0.8 * shown, 2, 7);
      const given = joules(k * WORK_J);
      // (no minus on nothing yet)
      const less = k * WORK_J < 0.005e-20 ? '' : '−';
      bar(k, a * P.inward * P.freed, [
        [narrow ? `released: ${given}` : `energy released: ${given}`, 1 - P.signed],
        [narrow ? `work: ${less}${given}` : `work done: ${less}${given}`, P.signed],
      ]);
      foot(
        narrow
          ? 'membrane potential: work per charge, A to B'
          : 'the membrane potential: the work done, per coulomb, to move a positive charge from outside (A) to inside (B)',
        a * P.inward
      );
    }
    // the negative charge lining the inside, picked out, named below it
    if (P.surplus > 0.01)
      mathWords(
        ctx,
        narrow ? 'surplus negative charge' : 'surplus negative charge inside the cell',
        chx,
        seen(cx, y + face + 27 * u)[1],
        mix(NEG, L.ink, 0.3),
        a * P.surplus,
        13 * g.ts,
        'center',
        L.page,
        'italic 600'
      );
    // and there, once it has gone, the potential energy each point's charge has; what the one outside has to be
    // released; and their difference per unit of charge, worked out — each gone before the next comes
    const told: [string, number][] = [
      [
        narrow
          ? 'potential energy: U_{in} − U_{out}'
          : "a positive charge's potential energy, inside and outside: U_{in} and U_{out}",
        P.levels * (1 - P.surplus) * clamp01(1 - 2 * P.stored),
      ],
      [
        narrow
          ? `outside: ${joules(WORK_J)} to release; inside: none`
          : `outside, a positive charge has ${joules(WORK_J)} of potential energy to be released; inside, none`,
        clamp01(2 * P.stored - 1) * clamp01(1 - 2 * P.perUnit),
      ],
      [
        narrow
          ? `(U_{in} − U_{out}) / q = ${mV(E_K)}`
          : `(U_{in} − U_{out}) / q = −${joules(WORK_J)} ÷ 1.60 × 10^{−19} C = −${(Math.abs(E_K) / 1000).toFixed(3)} V = ${mV(E_K)}`,
        clamp01(2 * P.perUnit - 1),
      ],
    ];
    for (const [text, k] of told)
      mathWords(
        ctx,
        text,
        chx,
        seen(cx, y + face + 27 * u)[1],
        FIELD,
        a * k,
        13 * g.ts,
        'center',
        L.page,
        'italic 600'
      );

    if (P.work > 0.01) {
      // the charge, B to A and again; the work done so far, a bar beside A filling as it rises
      const cycleMs = 3400;
      const t = cycle(g.now, cycleMs) * cycleMs;
      const k = smooth(clamp01((t - 300) / 2200));
      const seenAt = Math.min(1, t / 250, (cycleMs - t) / 350);
      const qy = lerp(by, ay, k);
      disc(g, bx, qy, 7 * u, IONS.K.colour, 1, P.work * seenAt);
      // pushed up, against the field: an arrow under it while it moves
      if (k > 0.02 && k < 0.98)
        arrow(ctx, bx, qy + 26 * u, bx, qy + 11 * u, L.ink, 0.8 * P.work * seenAt, 2, 7);
      bar(k, P.work, [[`${narrow ? 'work' : 'work done'}: ${joules(k * WORK_J)}`, 1]]);
      foot(
        narrow
          ? 'voltage: the work to move a charge, in joules'
          : 'a voltage is the work done (energy, in joules) to move a charge from one point to the other',
        P.work * (1 - P.units)
      );
    }
  }
  // the balance: beside the channel, an arrow up and out for diffusion, in potassium's colour, and one down and in
  // for the field, in the field's, the same length - growing in together - each named; and what it comes to
  if (P.balance > 0.01) {
    const [chx, chy] = seen(cx, y);
    // (longer close in, where the channel is large)
    const len = 62 * u * smooth(P.balance) * (1 + 0.6 * P.zoom * (1 - P.onChannel));
    // how hard each pushes, and which way: diffusion as potassium's concentrations set it, the field as the membrane
    // potential does — as hard as each other at E_K; both turned round where more potassium is set outside than in
    const [chem, elec] = [Math.log(P.cin / P.cout) / Math.log(RATIO), P.vm / E_K];
    // close in, side by side in the channel's pore, their names outside its walls; zoomed out — or right in on the
    // channel, as its pore is wide — beside each other as far apart as before
    const pore = (1 + 4 * P.open) * u * zoom;
    const gap = lerp(46 * u, 0.5 * pore, P.zoom * (1 - P.onChannel));
    const nameAt = Math.max(gap + 12 * u, (13 + 4 * P.open) * u * zoom + 18 * u);
    const lift = 4 * u;
    // the names beside them; zoomed out, off the membrane and the pairs lining it: diffusion's below, the field's above
    const off = 46 * u * (1 - P.zoom);
    // (and, close in, below the potentials' plate, where it is in the membrane)
    const below = chy + lift + plateDrop;
    // diffusion, left of the channel: from inside, up, out
    arrow(
      ctx,
      chx - gap,
      chy + (len * chem) / 2 + lift,
      chx - gap,
      chy - (len * chem) / 2 + lift,
      IONS.K.colour,
      P.balance * clamp01(4 * Math.abs(chem)),
      3.2,
      12
    );
    // the field, right of it: from outside, down, in
    saber(
      ctx,
      L,
      g.now,
      chx + gap,
      chy - (len * elec) / 2 + lift,
      chx + gap,
      chy + (len * elec) / 2 + lift,
      FIELD,
      clamp01(4 * Math.abs(elec)),
      P.balance,
      3,
      12,
      0.3,
      1100
    );
    mathWords(
      ctx,
      `${narrow ? 'K^{+}' : 'potassium'} diffuses ${chem < 0 ? 'in' : 'out'}`,
      chx - nameAt,
      below + off,
      IONS.K.colour,
      P.balance * (1 - P.vary) * clamp01(3 * Math.abs(chem)),
      13 * g.ts,
      'right',
      L.page,
      'italic 600'
    );
    mathWords(
      ctx,
      `${narrow ? 'field: back' : 'the field pushes it back'} ${elec < 0 ? 'out' : 'in'}`,
      chx + nameAt,
      below - off,
      FIELD,
      P.balance * (1 - P.vary) * clamp01(3 * Math.abs(elec)),
      13 * g.ts,
      'left',
      L.page,
      'italic 600'
    );
    // (zoomed out only: close in, it would sit among the ions inside)
    foot(
      narrow
        ? 'as strong as each other: no net flow'
        : 'the two are as strong as each other: they balance out, and there is no net flow of potassium',
      P.balance * (1 - P.vary) * (1 - P.plate) * (1 - P.zoom)
    );
  }
  // a potassium ion drawn in through the channel, then one carried out: as the one comes in, the energy it gives up,
  // a glow spreading from the pore's inner mouth; as the other is carried out, an arrow under it, pushing; and what each
  // gives up or needs
  if (P.energy > 0.01) {
    const s = cycle(g.now, ENERGY_MS) * ENERGY_MS;
    const crossing = energyAt(s, cx, y, face, u);
    const [chx, chy] = seen(cx, y);
    if (s > 1300 && s < 2300) {
      const k = (s - 1300) / 1000;
      const [gx, gy] = seen(cx, y + face + 4 * u);
      const r = lerp(10, 44, k) * u;
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      glow.addColorStop(0, rgba(FIELD, 0.9 * (1 - k) * P.energy));
      glow.addColorStop(0.45, rgba(FIELD, 0.45 * (1 - k) * P.energy));
      glow.addColorStop(1, rgba(FIELD, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (crossing) {
      const [qx, qy] = seen(...crossing.at);
      const a = P.energy * crossing.seen;
      disc(g, qx, qy, 8 * u * zoom, IONS.K.colour, 1, a);
      // carried, against the field, while in the pore
      if (!crossing.inward && s > 3700 && s < 4500)
        arrow(ctx, qx, qy + 30 * u, qx, qy + 13 * u, L.ink, 0.8 * a, 2, 7);
    }
    const inA = s < 2600 ? clamp01(Math.min((s - 700) / 300, (2600 - s) / 350)) : 0;
    const outA = s > 2800 ? clamp01(Math.min((s - 3400) / 300, (ENERGY_MS - s) / 350)) : 0;
    mathWords(
      ctx,
      narrow ? 'in: energy released' : `in: ${joules(WORK_J)} released`,
      chx + Math.max(30 * u, wallReach + 10 * u),
      lerp(chy + face + 34 * u, chy + 40 * u, P.zoom),
      FIELD,
      P.energy * inA,
      13 * g.ts,
      'left',
      L.page,
      'italic 600'
    );
    mathWords(
      ctx,
      narrow ? 'out: energy needed' : `out: ${joules(WORK_J)} needed`,
      chx - Math.max(30 * u, wallReach + 10 * u),
      lerp(chy - face - 34 * u, chy - 40 * u, P.zoom),
      FIELD,
      P.energy * outA,
      13 * g.ts,
      'right',
      L.page,
      'italic 600'
    );
    foot(
      narrow
        ? `${joules(WORK_J)} per ion, either way`
        : `either way, ${joules(WORK_J)} per potassium ion: its charge, 1.60 × 10^{−19} C, times ${(Math.abs(E_K) / 1000).toFixed(3)} V`,
      P.energy
    );
  }
  // the net flow through the channel, as the membrane potential stands to E_K: a broad arrow through the pore, out if it
  // is above E_K — less negative — and in if below, the longer the further off; and named
  if (P.netFlow > 0.01) {
    const [chx, chy] = seen(cx, y);
    const off = P.vm - E_K;
    const len = 70 * u * clamp01(Math.abs(off) / 29);
    const way = off > 0 ? -1 : 1;
    arrow(
      ctx,
      chx,
      chy - way * len,
      chx,
      chy + way * len,
      IONS.K.colour,
      0.45 * P.netFlow * clamp01(Math.abs(off) / 3),
      6 * u,
      18 * u
    );
    const named = (text: string, at: number, a: number) =>
      mathWords(
        ctx,
        text,
        chx,
        at,
        IONS.K.colour,
        P.netFlow * a,
        13 * g.ts,
        'center',
        L.page,
        'italic 600'
      );
    // past the arrow's tip, but never among the pairs lining the membrane, nor level with the pushes' names
    const reach = Math.max(Math.max(len, 50 * u) + 16 * u, chy - wallTop + 14 * u);
    named(narrow ? 'net: out' : 'net flow: out of the cell', chy - reach, clamp01((off - 3) / 6));
    named(narrow ? 'net: in' : 'net flow: into the cell', chy + reach, clamp01((-off - 3) / 6));
    named('no net flow', chy - reach, clamp01(1 - Math.abs(off) / 6));
  }
  // and, from the potential at which the two pushes balance on, what each slide says of it
  foot(
    narrow
      ? 'balanced: the equilibrium potential, E_{K}'
      : "where the two balance, the membrane potential is potassium's equilibrium (or reversal) potential, E_{K}",
    P.plate * (1 - P.valued)
  );
  foot(
    narrow
      ? 'negative: the field pulls K^{+} back in'
      : 'negative: the inside is lined with negative charge, whose field pulls potassium ions back in',
    P.valued * (1 - P.energy) * (1 - P.meter)
  );
  foot(
    narrow
      ? 'as many in as out: no net flow'
      : 'potassium ions still cross both ways, but as many in as out: no net flow',
    P.even
  );
  foot(
    narrow
      ? "E_{K}: set by K^{+}'s own concentrations"
      : `E_{K} is set by potassium's own concentrations, ${CONC.K.in} mM inside and ${CONC.K.out} mM outside: other ions have their own`,
    P.own
  );
  foot(
    narrow
      ? 'off E_{K}: a net flow, out or in'
      : 'less negative than E_{K}, a net flow out; more negative, a net flow in',
    P.netFlow * (1 - P.example)
  );
  foot(
    narrow
      ? `K^{+} flows out until ${mV(E_K)}`
      : `at ${mV(EXAMPLE_MV)} the field is too weak to hold potassium in: it flows out, the inside grows more negative, and the flow stops at ${mV(E_K)}`,
    P.example
  );
  foot(
    narrow
      ? 'Na^{+}, Cl^{−}: more outside; K^{+}: more inside'
      : 'sodium and chloride are many times more concentrated outside the cell, potassium inside',
    P.listed * (1 - P.marked) * (1 - P.panel) * (1 - P.active)
  );
  foot(
    narrow
      ? 'each set by its charge and concentrations'
      : "each ion's reversal potential is set by its charge and its concentrations inside and outside the cell",
    P.marked
  );
  foot(
    narrow
      ? `the pulls balance at ${mV(V_REST)}`
      : `each pulls the membrane potential towards its own reversal potential, the harder the more open its channels: they balance at ${mV(V_REST)}`,
    P.panel * (1 - P.weighted)
  );
  // the average itself, with the physics course's numbers
  const weighed = PASSING.map((ion) => `${G_REST[ion]} × ${signed(EQUILIBRIUM[ion])}`).join(' + ');
  const total = PASSING.reduce((sum, ion) => sum + G_REST[ion], 0);
  foot(
    narrow
      ? `(${weighed}) ÷ ${total.toFixed(2)} = ${mV(V_REST)}`
      : `resting potential = (${weighed}) ÷ (${PASSING.map((ion) => G_REST[ion]).join(' + ')}) = ${mV(V_REST)}`,
    P.weighted * (1 - P.nearer)
  );
  // how near rest sits to potassium's reversal potential, and how far from sodium's
  const [fromK, fromNa] = [Math.round(V_REST - EQUILIBRIUM.K), Math.round(EQUILIBRIUM.Na - V_REST)];
  foot(
    narrow
      ? `rest: ${fromK} mV from E_{K}, ${fromNa} mV from E_{Na}`
      : `potassium is about ${Math.round(G_REST.K / G_REST.Na)} times as permeable as sodium at rest: the resting potential sits ${fromK} mV from E_{K}, but ${fromNa} mV from E_{Na}`,
    P.nearer * (1 - P.ap) * (1 - P.active)
  );
  foot(
    narrow
      ? 'each spike: Na^{+} in, K^{+} out'
      : 'each spike lets a little sodium in and a little potassium out: over many, the concentrations would even out',
    P.pumpNeed * (1 - smooth(clamp01(2 * P.closeUp)))
  );
  foot(
    narrow
      ? 'active channels open and shut'
      : 'active channels open and shut in response to something, unlike passive ones, which stay open',
    P.active * (1 - smooth(clamp01(2 * P.closeUp)))
  );
  for (const [wide, short, alpha] of [
    [
      'neurons signal with action potentials: brief spikes in the membrane potential',
      'action potentials: brief spikes',
      P.ap * (1 - P.inputs),
    ],
    [
      "at each input, neurotransmitter opens a receptor's channel a moment, and positive ions flow in",
      'a receptor opens a moment',
      P.inputs * (1 - P.thresh),
    ],
    [
      'each input raises the potential a little; together they take it past threshold',
      'together, past threshold',
      P.thresh * (1 - P.gated),
    ],
    [
      'voltage-gated sodium and potassium channels: they open as the potential rises',
      'voltage-gated Na^{+} and K^{+}',
      P.gated * (1 - P.upstroke),
    ],
    [
      'past threshold, sodium channels open: sodium rushes in, and the potential shoots up towards E_{Na}',
      'Na^{+} channels open: up',
      P.upstroke * (1 - P.downstroke),
    ],
    [
      'they shut, and potassium channels open: potassium flows out, and the potential falls past rest',
      'K^{+} channels open: down',
      P.downstroke * (1 - P.spikeNamed),
    ],
    [
      'the action potential: a spike about 1 ms long and 100 mV high',
      'a spike: ~1 ms, ~100 mV',
      P.spikeNamed * (1 - P.pumpNeed),
    ],
  ] as [string, string, number][])
    foot(narrow ? short : wide, alpha);
  for (const p of pushes) {
    const [px, py] = seen(p.x, p.y);
    const [start, len] = [p.r * zoom + 3 * u, (14 + 22 * p.a) * u];
    const [ex, ey] = [px + p.ux * (start + len), py + p.uy * (start + len)];
    arrow(ctx, px + p.ux * start, py + p.uy * start, ex, ey, L.ink, 0.85 * p.a, 2, 8);
  }
  if (P.recharge > 0.01)
    say(
      g,
      'but each potassium ion carries a positive charge',
      w / 2,
      h - 20 * u,
      clamp01(3 * P.recharge),
      13,
      'center',
      IONS.K.colour
    );
  if (P.selective > 0.01) {
    drawSelective(g, pores, y, face, P.selective);
    const why = narrow
      ? 'each lets only its own ion through'
      : 'each channel lets through only its own kind of ion; others bounce off';
    say(g, why, w / 2, h - 20 * u, 0.85 * P.selective, 13, 'center');
  }
  // each bounce, a ring spreading from where it hit
  for (const [bx, by, k] of bumps) {
    ctx.globalAlpha = 0.6 * P.barrier * (1 - k);
    ctx.strokeStyle = rgba(L.ink, 1);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(bx, by, lerp(4, 16, k) * u, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (P.barrier > 0.01) {
    const why = narrow
      ? 'ions bounce off the membrane'
      : 'its fatty core keeps out charged ions, so they bounce off it';
    say(g, why, w / 2, h - 20 * u, 0.85 * P.barrier, 13, 'center');
  }
  // passive channels: what being one means
  if (P.leak > 0.01) {
    const what = narrow
      ? 'passive channels: always open'
      : 'passive channels stay open: how easily ions pass through them, their permeability, stays the same';
    say(g, what, w / 2, h - 20 * u, 0.85 * P.leak, 13, 'center');
  }
  // what each pair shows, and which way its two go
  if (P.pairs > 0.01) {
    DEMO_SAID.forEach(([said, short, pull], i) => {
      const fade = P.pairs * ends(c4);
      const [xa, xb] = [pairX(i) - apart(pull) / 2, pairX(i) + apart(pull) / 2];
      const ay = pairY - 18 * u;
      const dir = pull ? 1 : -1;
      arrow(ctx, xa - dir * 10 * u, ay, xa + dir * 13 * u, ay, L.ink, 0.75 * fade, 1.8, 7);
      arrow(ctx, xb + dir * 10 * u, ay, xb - dir * 13 * u, ay, L.ink, 0.75 * fade, 1.8, 7);
      say(g, narrow ? short : said, pairX(i), pairY + 24 * u, 0.85 * P.pairs, 12.5, 'center');
    });
  }

  // on the lipids' slide, a lens over a few of them, drawn out large: each a round head, which water suits, and two
  // fatty tails, which it does not — the two layers back to back, heads out and tails in
  if (P.lens > 0.01) {
    const spot = { x: 0.5 * w - 30 * u, y };
    const centre = { x: 0.5 * w + (narrow ? 40 : 110) * u, y: y + 84 * u };
    const r = 52 * u * (0.7 + 0.3 * P.lens);
    const sr = 13 * u;
    const [dx, dy] = [centre.x - spot.x, centre.y - spot.y];
    const [nx, ny] = [-dy / Math.hypot(dx, dy), dx / Math.hypot(dx, dy)];
    ctx.globalAlpha = P.lens;
    ctx.strokeStyle = rgba(L.ink, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(spot.x + side * nx * sr, spot.y + side * ny * sr);
      ctx.lineTo(centre.x + side * nx * r, centre.y + side * ny * r);
    }
    ctx.moveTo(spot.x + sr, spot.y);
    ctx.arc(spot.x, spot.y, sr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(L.page, 1);
    ctx.fill();
    ctx.clip();
    const k = r / 56;
    for (let i = -3; i <= 3; i++) {
      const x = centre.x + i * 20 * k;
      for (const side of [-1, 1]) {
        ctx.strokeStyle = rgba(L.ink, 0.45);
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const off of [-3.2, 3.2]) {
          ctx.beginPath();
          ctx.moveTo(x + off * k, centre.y + side * 17 * k);
          ctx.lineTo(x + off * k, centre.y + side * 10 * k);
          ctx.lineTo(x + off * 1.9 * k, centre.y + side * 3 * k);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(x, centre.y + side * 24 * k, 7.5 * k, 0, Math.PI * 2);
        ctx.fillStyle = rgba(headOf(L), 0.95);
        ctx.fill();
        ctx.strokeStyle = rgba(L.ink, 0.4);
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha = P.lens;
    ctx.strokeStyle = rgba(L.ink, 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // what it shows: beside the lens — or, on a narrow screen, left of it, under the membrane
    const [tx, ty, align] = narrow
      ? [centre.x - r - 12 * u, centre.y - 18 * u, 'right' as const]
      : [centre.x + r + 16 * u, centre.y - 18 * u, 'left' as const];
    if (narrow) {
      say(g, 'lipids:', tx, ty, 0.95 * P.lens, 13, align);
      say(g, 'fat molecules,', tx, ty + 18 * u, 0.75 * P.lens, 12, align);
      say(g, 'heads out, tails in', tx, ty + 34 * u, 0.75 * P.lens, 12, align);
    } else {
      say(g, 'lipids: fat molecules', tx, ty, 0.95 * P.lens, 13, align);
      say(g, 'in two layers, back to back: heads out,', tx, ty + 20 * u, 0.75 * P.lens, 12, align);
      say(g, 'where the water is, and fatty tails in', tx, ty + 37 * u, 0.75 * P.lens, 12, align);
    }
  }

  // which is which: the membrane, named under its right end with a tick up onto it — but not over the pairs lining
  // it, zoomed out; and what it keeps apart — the outside above and the inside below
  const membraneNamed = P.named * (1 - P.zoom) * (1 - P.sheet);
  if (membraneNamed > 0.01) {
    const name = 'cell membrane';
    ctx.font = `italic ${12.5 * g.ts}px ${SERIF}`;
    const mid = x1 - ctx.measureText(name).width / 2;
    say(g, name, x1, y + face + 18 * u, 0.75 * membraneNamed, 12.5, 'right');
    ctx.globalAlpha = membraneNamed;
    ctx.strokeStyle = rgba(L.ink, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mid, y + face + 10 * u);
    ctx.lineTo(mid, y + face + 2 * u);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (P.sides * (1 - P.zoom) * away > 0.01) {
    // close to the membrane — and, once the ions are there, out past them, the further the more there are
    const off = lerp(lerp(17, 100, P.ions), 126, P.crowd) * u;
    const outside = narrow ? 'outside the cell' : 'outside the cell: the extracellular space';
    // the names give way to what each side counts — one gone before the other comes, as they share a place
    const plain =
      clamp01(1 - 2 * Math.max(P.tally, P.counted, P.spread, P.imbalance, P.conc, P.listed)) *
      (1 - P.zoom);
    const swap = (k: number) => clamp01(2 * k - 1);
    // large, in the middle of each side, on the slide that names them; small, to the left, after it
    const named = (text: string, small: number, large: number, a: number) => {
      const size = lerp(12.5, 26, P.big);
      ctx.font = `italic ${size * g.ts}px ${SERIF}`;
      const left = lerp(x0, (w - ctx.measureText(text).width) / 2, P.big);
      say(g, text, left, lerp(small, large, P.big), a, size);
    };
    named(outside, y - face - off, y - 68 * u, 0.8 * P.sides * (1 - 0.5 * P.dim) * plain);
    named('inside the neuron', y + face + off, y + 68 * u, 0.8 * P.sides * (1 - P.dim) * plain);
    // or, on the slide about potassium's concentrations, how many of its ions each side has
    const [few, many] = POTASSIUM;
    const ions = (count: number) => `${count} potassium ion${count === 1 ? '' : 's'}`;
    const outsideK = narrow
      ? `outside: ${few} K^{+}`
      : `outside the cell: ${ions(few)} (${CONC.K.out} mM)`;
    const insideK = narrow
      ? `inside: ${many} K^{+}`
      : `inside the neuron: ${ions(many)} (${CONC.K.in} mM)`;
    say(
      g,
      outsideK,
      x0,
      y - face - off,
      0.95 * P.sides * swap(P.counted),
      12.5,
      'left',
      IONS.K.colour
    );
    say(
      g,
      insideK,
      x0,
      y + face + off,
      0.95 * P.sides * swap(P.counted),
      12.5,
      'left',
      IONS.K.colour
    );
    // or, on the slide about diffusion's rate, potassium's concentration each side, and how many times more inside —
    // or, as the reader sets them, on whichever side has more, how many times more
    const [kIn, kOut] = [P.cin, P.cout].map((c) => PER_ION * Math.round(c / PER_ION));
    const times = (more: number, less: number) => {
      const x = more / less;
      return String(
        x < 1.995 ? Number(x.toFixed(2)) : x < 9.95 ? Number(x.toFixed(1)) : Math.round(x)
      );
    };
    const than = (more: number, less: number) =>
      more > less ? `, ${times(more, less)}${narrow ? '×' : ' times'} as much` : '';
    const same = kIn === kOut ? ', the same' : '';
    const outsideConc = narrow
      ? `outside: ${kOut} mM K^{+}${than(kOut, kIn)}`
      : `outside the cell: potassium at ${kOut} mM${than(kOut, kIn)}`;
    const insideConc = narrow
      ? `inside: ${kIn} mM K^{+}${than(kIn, kOut)}${same}`
      : `inside the neuron: potassium at ${kIn} mM${than(kIn, kOut)}${same}`;
    const concShown = 0.95 * P.sides * swap(P.conc) * (1 - P.zoom);
    // picked out, gently pulsing, where E_K is shown to be potassium's own
    if (P.own > 0.01) {
      const pulse = 0.5 + 0.5 * Math.sin(g.now / 420);
      ctx.fillStyle = rgba(IONS.K.colour, 1);
      for (const [text, at] of [
        [outsideConc, y - face - off],
        [insideConc, y + face + off],
      ] as [string, number][]) {
        ctx.globalAlpha = concShown * P.own * (0.1 + 0.1 * pulse);
        ctx.beginPath();
        ctx.roundRect(
          x0 - 8 * u,
          at - 12 * u,
          mathWidth(ctx, text, 12.5 * g.ts) + 16 * u,
          24 * u,
          10 * u
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    say(g, outsideConc, x0, y - face - off, concShown, 12.5, 'left', IONS.K.colour);
    say(g, insideConc, x0, y + face + off, concShown, 12.5, 'left', IONS.K.colour);
    // or, from the slide about every kind of ion, each side's concentration of each, in its colour — the outside's gone
    // once the reversal potentials' line is drawn over it
    const listed = (parts: [string, RGB][], at: number, a: number) => {
      if (a < 0.01) return;
      let x = x0;
      for (const [text, colour] of parts) {
        say(g, text, x, at, a, 12.5, 'left', colour);
        x += mathWidth(ctx, text, 12.5 * g.ts) + 12 * u;
      }
    };
    const each = (side: 'out' | 'in') =>
      (['Na', 'K', 'Cl'] as const).map((kind): [string, RGB] => [
        `${IONS[kind].name} ${CONC[kind][side]} mM`,
        IONS[kind].colour,
      ]);
    const listShown = 0.95 * P.sides * swap(P.listed) * (1 - P.zoom) * away;
    listed(
      [[narrow ? 'outside:' : 'outside the cell:', L.ink], ...each('out')],
      y - face - off,
      listShown * (1 - P.panel)
    );
    listed(
      [
        [narrow ? 'inside:' : 'inside the neuron:', L.ink],
        ...each('in'),
        ...(narrow ? [] : [['and large negative molecules', LARGE] as [string, RGB]]),
      ],
      y + face + off,
      listShown
    );
    // or, while potassium is imagined uncharged and spreading, how many each side has now
    const gone = spreadOut(P.drainMs);
    const [outNow, inNow] = [few + gone, many - gone];
    const outsideNow = narrow
      ? `outside: ${outNow} potassium`
      : `outside the cell: ${ions(outNow)}`;
    const insideNow = narrow ? `inside: ${inNow} potassium` : `inside the neuron: ${ions(inNow)}`;
    say(
      g,
      outsideNow,
      x0,
      y - face - off,
      0.95 * P.sides * swap(P.spread),
      12.5,
      'left',
      IONS.K.colour
    );
    say(
      g,
      insideNow,
      x0,
      y + face + off,
      0.95 * P.sides * swap(P.spread),
      12.5,
      'left',
      IONS.K.colour
    );
    // or, one potassium ion out, each side's charges: one more positive outside, one more negative inside
    const stands = (side: number, name: string, short: string, more: string) => {
      const [plus, minus] = CHARGES(side);
      const [p, m] = [plus - side, minus];
      return narrow
        ? `${short}: ${p} +, ${m} −`
        : `${name}: ${p} positive, ${m} negative charges — one more ${more}`;
    };
    const tipped = 0.95 * P.sides * swap(P.imbalance) * (1 - P.zoom);
    say(g, stands(-1, 'outside the cell', 'outside', 'positive'), x0, y - face - off, tipped);
    say(g, stands(1, 'inside the neuron', 'inside', 'negative'), x0, y + face + off, tipped);
    // or, once they are counted, how each side's charges balance
    const counted = (name: string, short: string, side: number) => {
      const [plus, minus] = countOf(side);
      return narrow
        ? `${short}: ${plus} + and ${minus} −, so neutral`
        : `${name}: ${plus} positive and ${minus} negative charges, so neutral`;
    };
    say(
      g,
      counted('outside the cell', 'outside', -1),
      x0,
      y - face - off,
      0.95 * P.sides * swap(P.tally)
    );
    say(
      g,
      counted('inside the neuron', 'inside', 1),
      x0,
      y + face + off,
      0.95 * P.sides * swap(P.tally)
    );
  }
  // the imbalance: where there is too much of each charge; then, once it has flowed away, balanced again
  if (P.split > 0.01) {
    const row = y + face + 100 * u;
    say(
      g,
      narrow ? 'too much +' : 'too much positive charge',
      along(0.22),
      row,
      0.9 * P.split,
      12.5,
      'center'
    );
    say(
      g,
      narrow ? 'too much −' : 'too much negative charge',
      along(0.78),
      row,
      0.9 * P.split,
      12.5,
      'center'
    );
  }
  if (P.balanced > 0.01)
    say(g, 'balanced again', w / 2, y + face + 100 * u, 0.9 * P.balanced, 13, 'center');
  // each channel named, with a mark of the ion it lets through beside it — clear of the way out of the open one; or, on
  // a narrow screen, over it — and, from the slide about its two states, whether it is open or closed; none over the
  // pairs lining the membrane, zoomed out
  const channelsNamed = P.channels * (1 - P.zoom) * (1 - P.sheet);
  if (channelsNamed > 0.01) {
    CHANNELS.forEach((kind, i) => {
      const [name, short] = CHANNEL_NAMES[kind];
      const colour = colourOf(kind, own);
      // the others' names gone once a potassium ion has left, which comes to rest where chloride's is written
      const a = channelsNamed * (kind === 'K' ? 1 : lerp(0.6, 1, P.selective) * (1 - P.alone));
      const ly = y - face - 16 * u;
      // every way of naming it starts at the same place, so that between slides only its last word changes — beside
      // the channel's marker, or, on a narrow screen, over the channel, kept inside the figure
      const widest = mathWidth(ctx, `${narrow ? short : name}: closed`, 12 * g.ts);
      const left = narrow
        ? Math.min(w - 6 - widest, Math.max(6, pores[i] - widest / 2))
        : pores[i] - 40 * u - widest;
      const said = (text: string, shown: number) =>
        say(g, text, left, ly, shown, 12, 'left', colour);
      if (!narrow) disc(g, pores[i] - 30 * u, ly, 6 * u, colour, SIGN[kind], a);
      const text = narrow ? short : name;
      said(text, a * (1 - P.stated));
      said(`${text}: open`, a * P.stated * openness[i]);
      said(`${text}: closed`, a * P.stated * (1 - openness[i]));
    });
  }
  // each channel's reversal potential, over it in its ion's colour, clear of the pairs lining the membrane
  if (P.marked > 0.01)
    CHANNELS.forEach((kind, i) => {
      const ion = kind as 'Na' | 'K' | 'Cl';
      const value = `E_{${ion}} = ${signed(EQUILIBRIUM[ion])} mV`;
      const text = narrow ? value : `${CHANNEL_NAMES[ion][0]}: ${value}`;
      const width = mathWidth(ctx, text, 12.5 * g.ts);
      const left = Math.min(w - 6 - width, Math.max(6, pores[i] - width / 2));
      const ly = y - face - 36 * u;
      // on a plate of the page, as the ions outside crowd round it
      ctx.globalAlpha = 0.85 * P.marked;
      ctx.fillStyle = rgba(L.page, 1);
      ctx.beginPath();
      ctx.roundRect(left - 6 * u, ly - 11 * u, width + 12 * u, 22 * u, 8 * u);
      ctx.fill();
      ctx.globalAlpha = 1;
      say(g, text, left, ly, 0.95 * P.marked, 12.5, 'left', IONS[ion].colour);
    });
  // and, under potassium's channel and sodium's, how many of each are open at rest — on plates, among the ions inside
  if (P.nearer > 0.01)
    for (const [ion, i, many] of [
      ['K', 1, true],
      ['Na', 0, false],
    ] as const) {
      // (short on a narrow screen, where the two would run together)
      const text = narrow
        ? `${IONS[ion].name}: ${many ? 'many' : 'few'} open`
        : `${ion === 'K' ? 'potassium' : 'sodium'}: ${many ? 'many' : 'few'} channels open`;
      const width = mathWidth(ctx, text, 12.5 * g.ts);
      const left = Math.min(w - 6 - width, Math.max(6, pores[i] - width / 2));
      const ly = y + face + 38 * u;
      ctx.globalAlpha = 0.85 * P.nearer * (1 - P.ap) * (1 - P.active);
      ctx.fillStyle = rgba(L.page, 1);
      ctx.beginPath();
      ctx.roundRect(left - 6 * u, ly - 11 * u, width + 12 * u, 22 * u, 8 * u);
      ctx.fill();
      ctx.globalAlpha = 1;
      say(
        g,
        text,
        left,
        ly,
        0.95 * P.nearer * (1 - P.ap) * (1 - P.active),
        12.5,
        'left',
        IONS[ion].colour
      );
    }
  // the key, where the basic course's slide has its own: each kind in its colour, the positive ones and the negative
  if (P.key > 0.01) drawKey(g, P.key, narrow, own, P.dock);
  // and, on the last slides, the potentials, in the same corner
  if (P.plate > 0.01) drawPotentials(g, P, narrow, plateTop);
  // and, on the slides about every kind of ion, the reversal potentials' pulls, across the top
  if (P.panel > 0.01) {
    const vm = lerp(P.vm, keyed(AP_V, lt), P.ap);
    const gain = {
      K: lerp(1, keyed(AP_K, lt), P.ap),
      Na: lerp(1, keyed(AP_NA, lt), P.ap),
      Cl: 1,
    };
    drawPulls(g, { ...P, vm }, narrow, x0, x1, gain);
  }
  // and, from the slide that closes in on an active channel on, that close in, over all of this; and, from the slide
  // about the potential rising on, its round, on a plot below
  if (P.closeUp > 0.01)
    drawCloseUp(
      g,
      P,
      narrow,
      { zoom, zx, zy, y, near: P.closeUp * (1 - 0.8 * hop) },
      { sodium: gatedPores[0], ligand: ligandX, pump: pumpX, pores },
      gt
    );
  if (P.plot > 0.01) drawGating(g, P, narrow, gt);
  // and, from the slide about a voltage clamp to the last about active channels, its plots in front of it all
  if (P.ivPanel > 0.01) drawIV(g, P, narrow);
  // and, from the slide about spikes on, the membrane potential through the round, on a plot below
  if (P.ap > 0.01) drawSpike(g, P, narrow, lt);
  // and, on the slides about the action potential, its own plots, in front of it all
  if (P.apPanel > 0.01) drawAP(g, P, narrow);
  // and, from the slide about a signal arriving on, the membrane giving way to two neurons and the synapse between them
  if (P.scene > 0.001) {
    ctx.globalAlpha = P.scene;
    ctx.fillStyle = rgba(L.page, 1);
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    drawSynapse(g, P, narrow);
  }
}

/** Words at the foot, on a plate of the page — for when what is behind them is busy — the line above it, `row` 1, for a
 * second thing to say. */
function footNote(g: G, text: string, a: number, row = 0, colour: RGB = g.L.ink) {
  if (a < 0.01) return;
  const { ctx, w, h, u, L } = g;
  ctx.font = `italic ${13 * g.ts}px ${SERIF}`;
  const width = ctx.measureText(text).width + 24 * u;
  const at = h - 20 * u - row * 26 * u;
  ctx.globalAlpha = 0.9 * a;
  ctx.fillStyle = rgba(L.page, 1);
  ctx.beginPath();
  ctx.roundRect(w / 2 - width / 2, at - 12 * u, width, 24 * u, 8 * u);
  ctx.fill();
  ctx.globalAlpha = 1;
  say(g, text, w / 2, at, a, 13, 'center', colour);
}

/**
 * The reversal potentials on a line across the top of the figure, −100 mV to +80, each a tick in its ion's colour, named
 * over it; the membrane potential, a marker under the line, its value over the line's middle; and, under that, each
 * one's pull on it, in a row of its own — towards its reversal potential, as hard as its conductance times how far off
 * that is — and, last, what they come to. Then, at rest, each one's weight beside its pull: the resting potential is
 * the average of the reversal potentials, weighted so.
 */
function drawPulls(
  g: G,
  P: Pose,
  narrow: boolean,
  x0: number,
  x1: number,
  gain: Record<'K' | 'Na' | 'Cl', number> = { K: 1, Na: 1, Cl: 1 }
) {
  const { ctx, L } = g;
  // no smaller than this on a narrow screen, where the words would crowd
  const s = Math.max(g.u, 0.85);
  const a = P.panel;
  const top = 6;
  const [left, right] = [x0 - 6 * g.u, x1 + 6 * g.u];
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(left, top, right - left, 114 * s, 10 * s);
  ctx.fillStyle = rgba(L.page, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.12);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // the rows' names in a column on the left, as wide as the widest, weighted
  const column = mathWidth(ctx, 'Na^{+} ×0.12', 12 * g.ts) + 18 * s;
  const ly = top + 42 * s;
  const [lx0, lx1] = [left + column, right - 22 * s];
  const at = (v: number) => lerp(lx0, lx1, clamp01((v - SPAN[0]) / (SPAN[1] - SPAN[0])));
  // how far the membrane potential sits from potassium's reversal potential and from sodium's: a band along the line to
  // each, in its ion's colour
  if (P.nearer > 0.01)
    for (const ion of ['K', 'Na'] as const) {
      ctx.globalAlpha = 0.35 * a * P.nearer * (1 - P.ap);
      ctx.strokeStyle = rgba(IONS[ion].colour, 1);
      ctx.lineWidth = 8 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(at(P.vm), ly);
      ctx.lineTo(at(lerp(P.vm, EQUILIBRIUM[ion], P.nearer)), ly);
      ctx.stroke();
    }
  // the line, with a small tick every 20 mV; 0 named over it — and, with room, its ends
  ctx.globalAlpha = 0.5 * a;
  ctx.strokeStyle = rgba(L.ink, 1);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(lx0, ly);
  ctx.lineTo(lx1, ly);
  for (let v = SPAN[0]; v <= SPAN[1]; v += 20) {
    ctx.moveTo(at(v), ly - 3 * s);
    ctx.lineTo(at(v), ly + 3 * s);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  const tiers = [ly - 28 * s, ly - 14 * s];
  say(g, '0 mV', at(0), tiers[1], 0.6 * a, 11, 'center');
  if (!narrow) {
    say(g, `−${-SPAN[0]} mV`, lx0, tiers[1], 0.6 * a, 11, 'left');
    say(g, `+${SPAN[1]} mV`, lx1, tiers[1], 0.6 * a, 11, 'right');
  }
  // each reversal potential, a tick across the line in its ion's colour, named over it — chloride's lower, as it sits
  // so near potassium's
  for (const ion of PASSING) {
    const x = at(EQUILIBRIUM[ion]);
    const colour = IONS[ion].colour;
    ctx.globalAlpha = a;
    ctx.strokeStyle = rgba(colour, 1);
    ctx.lineWidth = 3 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, ly - 7 * s);
    ctx.lineTo(x, ly + 7 * s);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const name = `E_{${ion}} ${signed(EQUILIBRIUM[ion])}${narrow ? '' : ' mV'}`;
    say(g, name, x, tiers[ion === 'Cl' ? 1 : 0], a, 12, 'center', colour);
  }
  // the membrane potential: a marker under the line; and, over the line's middle, its value — at rest, named so
  const vx = at(P.vm);
  ctx.globalAlpha = a;
  ctx.fillStyle = rgba(L.ink, 0.85);
  ctx.beginPath();
  ctx.moveTo(vx, ly + s);
  ctx.lineTo(vx - 5 * s, ly + 10 * s);
  ctx.lineTo(vx + 5 * s, ly + 10 * s);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  const mid = (lx0 + lx1) / 2;
  const value = mV(P.vm);
  say(
    g,
    `${narrow ? 'membrane' : 'membrane potential'}: ${value}`,
    mid,
    tiers[0],
    a * (1 - P.weighted * (1 - P.ap)),
    12.5,
    'center'
  );
  say(
    g,
    `${narrow ? 'resting' : 'resting potential'}: ${value}`,
    mid,
    tiers[0],
    a * P.weighted * (1 - P.ap),
    12.5,
    'center'
  );
  // each one's pull, from the marker towards its reversal potential, and, last, what they come to
  const k = (narrow ? 1.6 : 2.6) * s;
  const reach = (narrow ? 95 : 150) * s;
  let net = 0;
  const rows: [string, string, RGB, number][] = PASSING.map((ion) => {
    // (its conductance as the action potential's round has it: at rest, as ever)
    const conductance = G_REST[ion] * gain[ion];
    const pull = conductance * (EQUILIBRIUM[ion] - P.vm);
    net += pull;
    return [
      IONS[ion].name,
      `${IONS[ion].name} ×${Number(conductance.toPrecision(2))}`,
      IONS[ion].colour,
      pull,
    ];
  });
  rows.push(['net', 'net', L.ink, net]);
  rows.forEach(([name, weighted, colour, pull], j) => {
    const ry = ly + (18 + 14 * j + (j === 3 ? 4 : 0)) * s;
    say(g, name, left + 10 * s, ry, a * (1 - P.weighted), 12, 'left', colour);
    say(g, weighted, left + 10 * s, ry, a * P.weighted, 12, 'left', colour);
    const len = Math.max(-reach, Math.min(reach, pull * k));
    arrow(
      ctx,
      vx,
      ry,
      vx + len,
      ry,
      colour,
      a * clamp01(Math.abs(len) / (4 * s)),
      (j === 3 ? 2.6 : 2) * s,
      7 * s
    );
  });
}

/** The sodium channel close in, as each slide has it, `ms` into the round: the potential stepped up only from the slide
 * about its rising on — but its gate opening and shutting all the same on the slide about the gate, and among the
 * passive channels before the view closes in; its second gate at work from the slide about inactivation; and, from the
 * slide about chance, opening and shutting at random. */
function activeSodium(P: Pose, ms: number) {
  const det = sodiumAt(ms, P.twice, P.inact);
  let act = det.act * Math.max(P.stepV, P.swing, 1 - P.closeUp);
  let lid = det.lid;
  if (P.flicker > 0.001) {
    const one = chanceAt(ms);
    act = lerp(act, one.act, P.flicker);
    lid = lerp(lid, one.lid, P.flicker);
  }
  return {
    v: lerp(V_REST, det.v, P.stepV),
    sensors: det.sensors * P.stepV,
    act,
    lid,
    open: act * (1 - lid),
  };
}
/** The ligand-gated channel close in, `ms` into the round: its ligand there briefly, or, from the slide about
 * desensitization on, for longer, and desensitizing. */
const activeLigand = (P: Pose, ms: number) => ligandAt(ms, P.desen, P.desen);
/** With reduced motion, the moment of the active channels' round each slide is held at: one that shows what it says. */
const activeStillMs = (P: Pose) => {
  if (P.onPump > 0.5) return P.pumping > 0.5 ? 2150 : 300;
  if (P.onLigand > 0.5) return P.desen > 0.5 ? 3000 : 1400;
  if (P.flicker > 0.5) return 1100;
  if (P.twice > 0.5) return 3700;
  if (P.recov > 0.5) return 3600;
  if (P.inact > 0.5) return 2300;
  return P.stepV > 0.5 || P.swing > 0.5 || P.closeUp < 0.5 ? 1500 : 600;
};
/** A share, 0 to 1, of where along a row `j` falls, the same every time: which of the charge lining the membrane go
 * first as the field weakens. */
const rankOf = (j: number) => {
  const s = Math.sin(j * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

/** How often an ion sets off for an active channel's pore close in, ms; and, design px from the channel's middle at ms
 * since it set off, its way down through the pore of the voltage-gated channel and in — or, the gate shut, to its mouth
 * and back out again — and the same for the ligand-gated one, in under its lobes. */
const PASS_EVERY = 300;
const SODIUM_PASS: [number, number, number][] = [
  [0, 10, -42],
  [380, 0, -27],
  [560, 0, -12],
  [760, 0, 14],
  [900, 0, 27],
  [1150, -9, 44],
];
const SODIUM_BACK: [number, number, number][] = [
  [0, 10, -42],
  [380, 0, -28],
  [700, 1.5, -29],
  [1000, 12, -44],
];
const LIGAND_PASS: [number, number, number][] = [
  [0, 30, -19.6],
  [330, 9, -19.6],
  [480, 0, -15],
  [620, 0, -8],
  [800, 0, 12],
  [920, 0, 22],
  [1150, -9, 38],
];
const LIGAND_BACK: [number, number, number][] = [
  [0, 30, -19.6],
  [380, 11, -19.6],
  [700, 12, -20],
  [1000, 30, -21],
];
/** Where along such a way it is, `age` ms in: steadily through the middle of it, easing at its two ends. */
function wayAt(keys: [number, number, number][], age: number): [number, number] {
  let j = 0;
  while (j < keys.length - 2 && age > keys[j + 1][0]) j++;
  const [[ta, xa, ya], [tb, xb, yb]] = [keys[j], keys[j + 1]];
  const f = clamp01((age - ta) / (tb - ta));
  const e = j === 0 || j === keys.length - 2 ? smooth(f) : f;
  return [lerp(xa, xb, e), lerp(ya, yb, e)];
}

/** A smooth line through points, as Catmull–Rom would draw it, from a move to the first. */
function curveThrough(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [
      pts[Math.max(0, i - 1)],
      pts[i],
      pts[i + 1],
      pts[Math.min(pts.length - 1, i + 2)],
    ];
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6,
      p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6,
      p2[1] - (p3[1] - p1[1]) / 6,
      p2[0],
      p2[1]
    );
  }
}

/**
 * The voltage-gated sodium channel close in, centred at (cx, cy), `k` px to a design px: two halves of its pore, round
 * a pore that narrows to its selectivity filter near the outside, widens into a cavity, and shuts at its gate near the
 * inside — apart there as far as `act`; beyond each, in the membrane, its voltage sensor, a rod with four positive
 * charges, out as far as `sensors`, a linker from its foot to the gate; and, `lidShown`, its second gate, a ball on a
 * tether from the left half's foot, swung into the pore's inner mouth as far as `lid`. `lit` picks the sensors out.
 */
function sodiumChannel(
  g: G,
  cx: number,
  cy: number,
  k: number,
  a: number,
  st: { sensors: number; act: number; lid: number },
  lit: number,
  lidShown: number
) {
  if (a < 0.01) return;
  const { ctx, L } = g;
  const o = st.act;
  const at = (x: number, y: number): [number, number] => [cx + x * k, cy + y * k];
  const body = mix(mix(L.page, L.ink, L.dark ? 0.2 : 0.1), IONS.Na.colour, 0.12);
  const edge = rgba(mix(IONS.Na.colour, L.ink, 0.25), 0.9);
  const lw = Math.max(1.4, 0.32 * k);
  const rodY = lerp(4.5, -5.5, st.sensors);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    // the linker, from the sensor's foot round under the pore's half to its gate
    ctx.beginPath();
    ctx.moveTo(...at(side * 21.2, rodY + 10.5));
    ctx.bezierCurveTo(
      ...at(side * 21.5, rodY + 18),
      ...at(side * 15, 29.5),
      ...at(side * lerp(5, 8, o), 25.5)
    );
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(2, 1.1 * k);
    ctx.stroke();
    // the sensor's body, in the membrane beside the pore, and its rod
    ctx.beginPath();
    ctx.roundRect(cx + (side > 0 ? 16 : -26.5) * k, cy - 16 * k, 10.5 * k, 32 * k, 4.5 * k);
    ctx.fillStyle = rgba(mix(body, L.ink, 0.05), 0.98);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(cx + (side * 21.2 - 2.4) * k, cy + (rodY - 10.5) * k, 4.8 * k, 21 * k, 2.4 * k);
    ctx.fillStyle = rgba(mix(body, POS, 0.08 + 0.22 * lit), 1);
    ctx.fill();
    ctx.stroke();
    // the pore's half: its inner face the pore's shape — wide at the outside, narrowing to the filter, widening into the
    // cavity — and, near the inside, shut against the other half, or apart as far as the gate is open
    const inner: [number, number][] = [
      [8.4, -24],
      [6.2, -19.5],
      [3.9, -14.5],
      [3.9, -10],
      [5, -6],
      [5, 4],
      [lerp(1.4, 4.6, o), 10],
      [lerp(0, 4.4, o), 15],
      [lerp(2.6, 6.8, o), 21],
    ];
    ctx.beginPath();
    curveThrough(
      ctx,
      inner.map(([x, y]) => at(side * x, y))
    );
    ctx.quadraticCurveTo(...at(side * lerp(6, 9, o), 25.5), ...at(side * 11, 25));
    ctx.quadraticCurveTo(...at(side * 15.2, 24.5), ...at(side * 15.2, 20));
    ctx.lineTo(...at(side * 15.2, -19.5));
    ctx.quadraticCurveTo(...at(side * 15.2, -24.8), ...at(side * 11.5, -25));
    ctx.closePath();
    ctx.fillStyle = rgba(body, 0.98);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = lw;
    ctx.stroke();
    // (its helices, faintly: one along the pore, one along its outside)
    ctx.beginPath();
    curveThrough(
      ctx,
      inner.slice(4).map(([x, y]) => at(side * (x + 3.4), y))
    );
    ctx.moveTo(...at(side * 11.8, -18));
    ctx.lineTo(...at(side * 11.8, 19));
    ctx.strokeStyle = rgba(L.ink, 0.1);
    ctx.lineWidth = Math.max(1, 0.25 * k);
    ctx.stroke();
  }
  // its second gate: a ball on a tether from the left half's foot, swinging up into the pore's inner mouth
  if (lidShown > 0.01) {
    const e = smooth(st.lid);
    const angle = lerp(2.01, -0.26, e);
    const [px, py] = [-11, 23.5];
    const [bx, by] = [px + 11.65 * Math.cos(angle), py + 11.65 * Math.sin(angle)];
    const tint = rgba(mix(IONS.Na.colour, L.ink, 0.35), 1);
    ctx.globalAlpha = a * lidShown;
    ctx.beginPath();
    ctx.moveTo(...at(px, py));
    ctx.quadraticCurveTo(
      ...at((px + bx) / 2 - 0.2 * (by - py), (py + by) / 2 + 0.2 * (bx - px)),
      ...at(bx, by)
    );
    ctx.strokeStyle = tint;
    ctx.lineWidth = Math.max(1.6, 0.8 * k);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(...at(bx, by), 5 * k, 0, Math.PI * 2);
    ctx.fillStyle = tint;
    ctx.fill();
  }
  ctx.restore();
  // the sensors' charges
  for (const side of [-1, 1])
    for (let c = 0; c < 4; c++)
      disc(
        g,
        cx + side * 21.2 * k,
        cy + (rodY - 7.5 + 5 * c) * k,
        1.75 * k,
        POS,
        1,
        a * (0.55 + 0.45 * lit)
      );
}

/**
 * The ligand-gated channel close in, centred at (cx, cy), `k` px to a design px: two halves of its pore, shut at its gate
 * near the outside, apart there as far as it is `open`; over each, outside, two lobes with a binding site between them,
 * which close on the ligand as far as it has `docked` — the ligand there, or coming and going — and, desensitized
 * (`numb`), the lobes turned apart and the channel greyed, though the ligand is still bound.
 */
function ligandChannel(
  g: G,
  cx: number,
  cy: number,
  k: number,
  a: number,
  st: { docked: number; open: number; numb: number }
) {
  if (a < 0.01) return;
  const { ctx, L } = g;
  const o = st.open;
  const at = (x: number, y: number): [number, number] => [cx + x * k, cy + y * k];
  const tint = mix(TRANSMITTER, GREY, 0.7 * st.numb);
  const body = mix(mix(L.page, L.ink, L.dark ? 0.2 : 0.1), tint, 0.12);
  const edge = rgba(mix(tint, L.ink, 0.25), 0.9);
  const lw = Math.max(1.4, 0.32 * k);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.lineJoin = 'round';
  for (const side of [-1, 1]) {
    // the pore's half, shut against the other near the outside, or apart as far as the gate is open
    const inner: [number, number][] = [
      [6.6, -16.5],
      [lerp(0.2, 4.4, o), -11],
      [lerp(1.8, 4.4, o), -7],
      [4.6, 0],
      [4.4, 8],
      [5.2, 14],
      [6.8, 19.5],
    ];
    ctx.beginPath();
    curveThrough(
      ctx,
      inner.map(([x, y]) => at(side * x, y))
    );
    ctx.quadraticCurveTo(...at(side * 9, 23.5), ...at(side * 13.5, 19));
    ctx.lineTo(...at(side * 13.5, -13));
    ctx.quadraticCurveTo(...at(side * 13.5, -17.2), ...at(side * 10, -17.2));
    ctx.closePath();
    ctx.fillStyle = rgba(body, 0.98);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = lw;
    ctx.stroke();
    // its two lobes outside, and the binding site between them — all turned apart as it desensitizes — on two stalks
    // down to the pore's half, with a gap between them for ions to come in under the lobes
    ctx.save();
    const [hx, hy] = at(side * 12, -17);
    ctx.translate(hx, hy);
    ctx.rotate(side * 0.22 * st.numb);
    ctx.translate(-hx, -hy);
    ctx.strokeStyle = edge;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, 1.3 * k);
    ctx.beginPath();
    for (const x of [4.5, 15]) {
      ctx.moveTo(...at(side * x, -23.5));
      ctx.lineTo(...at(side * (x - 0.8), -16.8));
    }
    ctx.stroke();
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(...at(side * 10, -28), 8.2 * k, 5.6 * k, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(mix(body, L.ink, 0.04), 0.98);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.stroke();
    // (the upper one hinged at its outer end, open until the ligand docks)
    ctx.save();
    const [ux, uy] = at(side * 18.6, -35);
    ctx.translate(ux, uy);
    ctx.rotate(side * 0.5 * (1 - st.docked));
    ctx.translate(-ux, -uy);
    ctx.beginPath();
    ctx.ellipse(...at(side * 11, -37.4), 7.2 * k, 5 * k, side * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = rgba(mix(body, L.ink, 0.04), 0.98);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // the ligand: a small molecule, down from outside into the binding site, and gone again
    const shown = clamp01(1.6 * st.docked);
    if (shown > 0.01) {
      const [mx, my] = [
        lerp(side * 12, side * 6.2, st.docked),
        lerp(-58, -34.4, smooth(st.docked)),
      ];
      ctx.globalAlpha = a * shown;
      ctx.fillStyle = rgba(TRANSMITTER, 0.95);
      for (const [dx, dy] of [
        [-1.2, 0.4],
        [1.2, -0.5],
      ]) {
        ctx.beginPath();
        ctx.arc(...at(mx + dx, my + dy), 2.1 * k, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = a;
    }
    ctx.restore();
  }
  ctx.restore();
}

/** ATP and the phosphate it gives the pump, where they are drawn: a dark yellow. */
const ATP_COLOUR: RGB = [202, 138, 4];

/**
 * The sodium–potassium pump close in, centred at (cx, cy), `k` px to a design px: two halves round a cavity in its
 * middle, open to the inside or, as far as `face`, to the outside — shut to both halfway — and, under its right half, its
 * foot, where ATP docks and its phosphate is taken on.
 */
function pumpProtein(
  g: G,
  cx: number,
  cy: number,
  k: number,
  a: number,
  face: number,
  phosphate: number
) {
  if (a < 0.01) return;
  const { ctx, L } = g;
  const at = (x: number, y: number): [number, number] => [cx + x * k, cy + y * k];
  const body = mix(mix(L.page, L.ink, L.dark ? 0.2 : 0.1), [100, 116, 139], 0.12);
  const edge = rgba(mix(L.ink, L.page, 0.35), 0.9);
  const lw = Math.max(1.4, 0.32 * k);
  const [top, bottom] = [0.4 + 5.2 * clamp01(2 * face - 1), 0.4 + 5.2 * clamp01(1 - 2 * face)];
  ctx.save();
  ctx.globalAlpha = a;
  ctx.lineJoin = 'round';
  // its foot, under the right half
  ctx.beginPath();
  ctx.ellipse(...at(16, 31), 10.5 * k, 7.2 * k, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = rgba(mix(body, L.ink, 0.04), 0.98);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = lw;
  ctx.stroke();
  for (const side of [-1, 1]) {
    const inner: [number, number][] = [
      [top, -22],
      [3.2, -13],
      [5.4, -4],
      [5.4, 4],
      [3.2, 13],
      [bottom, 22],
    ];
    ctx.beginPath();
    curveThrough(
      ctx,
      inner.map(([x, y]) => at(side * x, y))
    );
    ctx.quadraticCurveTo(...at(side * (bottom + 3), 25.5), ...at(side * 11, 25.5));
    ctx.quadraticCurveTo(...at(side * 18.5, 25.5), ...at(side * 18.5, 19));
    ctx.lineTo(...at(side * 18.5, -19));
    ctx.quadraticCurveTo(...at(side * 18.5, -25.5), ...at(side * 11, -25.5));
    ctx.quadraticCurveTo(...at(side * (top + 3), -25.5), ...at(side * top, -22));
    ctx.closePath();
    ctx.fillStyle = rgba(body, 0.98);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = lw;
    ctx.stroke();
    // (its helices, faintly)
    ctx.beginPath();
    for (const x of [9, 14]) {
      ctx.moveTo(...at(side * x, -20));
      ctx.lineTo(...at(side * x, 20));
    }
    ctx.strokeStyle = rgba(L.ink, 0.1);
    ctx.lineWidth = Math.max(1, 0.25 * k);
    ctx.stroke();
  }
  ctx.restore();
  // the phosphate, while it is on
  if (phosphate > 0.01) atpMark(g, ...at(8.5, 27.5), k, a * phosphate, 'P');
}
/** ATP, ADP or a phosphate close in: a dark yellow pill or disc, named on it. */
function atpMark(g: G, x: number, y: number, k: number, a: number, name: string) {
  if (a < 0.01) return;
  const { ctx } = g;
  const half = (name === 'P' ? 2.6 : 5.6) * k;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(x - half, y - 2.6 * k, 2 * half, 5.2 * k, 2.6 * k);
  ctx.fillStyle = rgba(ATP_COLOUR, 0.95);
  ctx.fill();
  ctx.globalAlpha = 1;
  mathWords(
    ctx,
    name,
    x,
    y,
    [255, 255, 255],
    a,
    Math.max(9, 3.3 * k) * g.ts,
    'center',
    null,
    '600'
  );
}

/** Words close in on a channel, haloed, and a fine line from them to what they name, ending in a dot. */
function tag(
  g: G,
  text: string,
  tx: number,
  ty: number,
  px: number,
  py: number,
  a: number,
  align: CanvasTextAlign,
  colour: RGB
) {
  if (a < 0.01) return;
  const { ctx } = g;
  const from = align === 'right' ? tx + 5 : align === 'left' ? tx - 5 : tx;
  ctx.globalAlpha = 0.6 * a;
  ctx.strokeStyle = rgba(colour, 1);
  ctx.fillStyle = rgba(colour, 1);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(from, ty);
  ctx.lineTo(px, py);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  say(g, text, tx, ty, a, 12, align, colour);
}

/**
 * The active channels close in, over the membrane as first drawn: the page, as much as the view has closed in; the
 * membrane's lipids, heads out, two tails each, broken where the channels are — the passive ones, as before, and the two
 * active ones, in full; from the slide about the field on, the charge lining the membrane, fewer the less negative the
 * potential, and the field across it, as strong; sodium ions through the active channels' pores while they are open —
 * turned back at their mouths while they are shut; each part named as the slides come to it; and the words at the
 * foot.
 */
function drawCloseUp(
  g: G,
  P: Pose,
  narrow: boolean,
  view: { zoom: number; zx: number; zy: number; y: number; near: number },
  at: { sodium: number; ligand: number; pump: number; pores: number[] },
  ms: number
) {
  const { ctx, w, h, L, u } = g;
  const shown = smooth(clamp01((view.near - 0.5) / 0.35));
  if (shown < 0.01) return;
  const seen = (px: number, py: number): [number, number] => [
    w / 2 + view.zoom * (px - view.zx),
    view.y + view.zoom * (py - view.zy),
  ];
  const k = view.zoom * u;
  const [, my] = seen(0, view.y);
  const [sx] = seen(at.sodium, view.y);
  const [lx] = seen(at.ligand, view.y);
  const [px] = seen(at.pump, view.y);
  // (the active channels in full only on their own slides: beside the pump, plainly)
  const full = 1 - P.onPump;
  const na = activeSodium(P, ms);
  const lg = activeLigand(P, ms);
  // the page, over the membrane as first drawn
  ctx.globalAlpha = shown;
  ctx.fillStyle = rgba(L.page, 1);
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;

  // the membrane's lipids, every 9 px of it as first drawn — broken where the channels are
  const gaps: [number, number][] = [
    [sx, lerp(27, 18, P.onPump) * k],
    [lx, lerp(15, 18, P.onPump) * k],
    ...(P.onPump > 0.01 ? [[px, 20 * k] as [number, number]] : []),
    ...at.pores.map((p): [number, number] => [seen(p, view.y)[0], 18 * k]),
  ];
  const origin = seen(0, view.y)[0];
  const every = 9 * k;
  const heads = new Path2D();
  const tails = new Path2D();
  for (let j = Math.floor(-origin / every) - 1; origin + j * every < w + every; j++) {
    const x = origin + j * every;
    if (gaps.some(([gx, half]) => Math.abs(x - gx) < half)) continue;
    for (const side of [-1, 1]) {
      heads.moveTo(x + 3.6 * k, my + side * 10 * k);
      heads.arc(x, my + side * 10 * k, 3.6 * k, 0, Math.PI * 2);
      for (const dx of [-1.3, 1.3]) {
        tails.moveTo(x + dx * k, my + side * 6.4 * k);
        tails.lineTo(x + dx * 0.7 * k, my + side * 1.2 * k);
      }
    }
  }
  ctx.globalAlpha = shown;
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(L.ink, 0.22);
  ctx.lineWidth = Math.max(1, 0.3 * k);
  ctx.stroke(tails);
  ctx.fillStyle = rgba(headOf(L), 0.95);
  ctx.fill(heads);
  ctx.strokeStyle = rgba(L.ink, 0.12);
  ctx.lineWidth = 1;
  ctx.stroke(heads);
  ctx.globalAlpha = 1;
  // the passive channels, as the membrane first had them, open — and, beside the pump, the active ones, plainly, shut
  const plain = (x: number, colour: RGB, a: number, open: number) => {
    if (a < 0.01 || x < -30 * k || x > w + 30 * k) return;
    ctx.globalAlpha = a;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(x + side * (7 + 4 * open) * k - 6 * k, my - 19 * k, 12 * k, 38 * k, 5 * k);
      ctx.fillStyle = rgba(mix(L.page, L.ink, 0.22), 0.98);
      ctx.fill();
      ctx.strokeStyle = rgba(colour, 0.85);
      ctx.lineWidth = Math.max(1.5, 0.35 * k);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  at.pores.forEach((p, i) => plain(seen(p, view.y)[0], colourOf(CHANNELS[i], 0), shown, 1));
  plain(sx, IONS.Na.colour, shown * P.onPump, 0);
  plain(lx, TRANSMITTER, shown * P.onPump, 0);

  // from the slide about the field on: the charge lining the membrane, a positive charge outside and a negative one
  // inside every 12 px of it as first drawn — fewer, the less negative the potential (near the ligand-gated channel, at
  // rest), those going drifting off — and between them, the field across it, as strong
  const level = clamp01(lerp(na.v, V_REST, P.onLigand) / V_REST);
  if (P.field > 0.01) {
    const a = shown * P.field;
    const clear = (x: number) =>
      Math.abs(x - at.sodium) > 30 * u &&
      Math.abs(x - at.ligand) > 22 * u &&
      at.pores.every((p) => Math.abs(x - p) > 20 * u);
    const span = 12 * u;
    const [from, to] = [
      Math.floor((view.zx - w / 2 / view.zoom) / span) - 1,
      Math.ceil((view.zx + w / 2 / view.zoom) / span) + 1,
    ];
    for (let j = from; j <= to; j++) {
      const x = (j + 0.5) * span;
      if (j % 2 || !clear(x)) continue;
      const [fx] = seen(x, view.y);
      saber(
        ctx,
        L,
        g.now,
        fx,
        my - 8 * k,
        fx,
        my + 8 * k,
        FIELD,
        a * (0.12 + 0.88 * level),
        1,
        0.5 * k,
        2.6 * k,
        j * 0.13,
        1400
      );
    }
    for (let j = from; j <= to; j++) {
      const x = j * span;
      if (!clear(x)) continue;
      const kept = smooth(clamp01((level - 0.85 * rankOf(j)) / 0.12 + 0.5));
      if (kept < 0.01) continue;
      const [cx] = seen(x, view.y);
      const off = (1 - kept) * 10 * k;
      disc(g, cx, my - 16 * k - off, 2.3 * k, POS, 1, a * kept);
      disc(g, cx, my + 16 * k + off, 2.3 * k, NEG, -1, a * kept);
    }
  }
  // the two active channels, in full
  sodiumChannel(g, sx, my, k, shown * full, na, P.sensors * (1 - P.field), P.lid);
  ligandChannel(g, lx, my, k, shown * full, lg);
  // the pump: its round, from the slide about it on — and, before that, open to the inside, empty
  if (P.onPump > 0.01) {
    const a = shown * P.onPump;
    const go = P.pumping;
    const phosphate = Number(phosphorylated(ms)) * go;
    pumpProtein(g, px, my, k, a, pumpFace(ms) * go, phosphate);
    const ion = (way: Way, kind: 'Na' | 'K', hold: [boolean, boolean]) => {
      const [x, yy, s] = pumpWay(way, ms, hold);
      disc(g, px + x * k, my + yy * k, 2.8 * k, IONS[kind].colour, 1, a * go * s);
    };
    for (const way of PUMP_NA) ion(way, 'Na', [false, false]);
    for (const way of PUMP_K) ion(way, 'K', [false, false]);
    const [ax, ay, as] = pumpWay(ATP_WAY, ms, [false, true]);
    atpMark(g, px + ax * k, my + ay * k, k, a * go * as * Number(ms < 1250), 'ATP');
    const [dx, dy, ds] = pumpWay(ADP_WAY, ms, [true, false]);
    atpMark(g, px + dx * k, my + dy * k, k, a * go * ds, 'ADP');
    const [fx, fy, fs] = pumpWay(PHOSPHATE_WAY, ms, [true, false]);
    atpMark(g, px + fx * k, my + fy * k, k, a * go * fs, 'P');
  }
  // sodium ions through each one's pore while its gate is open, one after another — turned back at its mouth while
  // it is shut (every other one, there) — only on their own slides
  for (const [cx, openAt, pass, back, cross] of [
    [sx, (t: number) => activeSodium(P, t).open, SODIUM_PASS, SODIUM_BACK, 700],
    [lx, (t: number) => activeLigand(P, t).open, LIGAND_PASS, LIGAND_BACK, 560],
  ] as [number, (t: number) => number, typeof SODIUM_PASS, typeof SODIUM_PASS, number][]) {
    if (cx < -40 * k || cx > w + 40 * k) continue;
    for (let j = 0; j < ACT_MS / PASS_EVERY; j++) {
      const t0 = j * PASS_EVERY;
      const age = (((ms - t0) % ACT_MS) + ACT_MS) % ACT_MS;
      const through = openAt((t0 + cross) % ACT_MS) > 0.5;
      if (!through && j % 2) continue;
      const keys = through ? pass : back;
      const end = keys[keys.length - 1][0];
      if (age > end) continue;
      const side = j % 4 < 2 ? 1 : -1;
      const [qx, qy] = wayAt(keys, age);
      disc(
        g,
        cx + side * qx * k,
        my + qy * k,
        3.1 * k,
        IONS.Na.colour,
        1,
        shown * full * Math.min(1, age / 150, (end - age) / 200)
      );
    }
  }

  // the names, each on the slides that come to it
  const ink = mix(L.ink, L.page, 0.15);
  const naInk = mix(IONS.Na.colour, L.ink, 0.35);
  const lgInk = mix(TRANSMITTER, L.ink, 0.35);
  const side = (narrow ? 24 : 34) * k;
  say(g, 'outside', 18 * u, my - 31 * k, 0.75 * shown, 15, 'left', ink);
  say(g, 'inside', 18 * u, my + 31 * k, 0.75 * shown, 15, 'left', ink);
  say(
    g,
    'membrane',
    18 * u,
    my,
    0.9 * shown * P.protein * (1 - P.swing) * (1 - P.sensors),
    12,
    'left',
    ink
  );
  // the voltage-gated channel
  const sodiumNamed = shown * (1 - P.onLigand);
  say(
    g,
    'an ion channel: a protein',
    sx,
    my - 32 * k,
    sodiumNamed * P.protein * (1 - P.sensors),
    12.5,
    'center',
    naInk
  );
  say(
    g,
    narrow ? 'voltage-gated Na^{+} channel' : 'a voltage-gated sodium channel',
    sx,
    my - 32 * k,
    sodiumNamed * P.sensors,
    12.5,
    'center',
    naInk
  );
  tag(
    g,
    'pore',
    sx + side,
    my - 3 * k,
    sx + 1.5 * k,
    my - 2 * k,
    sodiumNamed * P.protein * (1 - P.swing) * (1 - P.sensors),
    'left',
    naInk
  );
  tag(
    g,
    na.act > 0.5 ? 'gate: open' : 'gate: shut',
    sx + side,
    my + 15 * k,
    sx + 2 * k,
    my + 15 * k,
    sodiumNamed * P.swing * (1 - P.sensors),
    'left',
    naInk
  );
  tag(
    g,
    'voltage sensor',
    sx - side,
    my - 27 * k,
    sx - 21.2 * k,
    my + (lerp(4.5, -5.5, na.sensors) - 9) * k,
    sodiumNamed * P.sensors * (1 - P.stepV),
    'right',
    naInk
  );
  // the field's push on the sensors, inward — weaker, the weaker the field
  const push = sodiumNamed * P.field * (1 - P.act);
  if (push > 0.01)
    for (const s of [-1, 1]) {
      const ax = sx + s * 29.5 * k;
      arrow(
        ctx,
        ax,
        my - 7 * k,
        ax,
        my + (-7 + 4 + 10 * level) * k,
        POS,
        0.85 * push,
        Math.max(1.6, 0.5 * k),
        2.6 * k
      );
    }
  say(
    g,
    'pushed in',
    sx + 29.5 * k,
    my - 19 * k,
    push * clamp01(2 * level - 0.4),
    11,
    'center',
    mix(POS, L.ink, 0.3)
  );
  say(g, 'the field', sx + side + 18 * k, my + 2 * k, push, 11, 'left', mix(FIELD, L.ink, 0.25));
  // its state, from the slide about activation on: open, shut, or plugged
  const state = na.lid > 0.5 ? 'inactivated' : na.open > 0.5 ? 'open' : 'closed';
  say(g, state, sx + side, my + 4 * k, sodiumNamed * P.act * (1 - P.many), 12.5, 'left', naInk);
  tag(
    g,
    narrow ? 'Na^{+} in' : 'sodium flows in',
    sx + side,
    my + 33 * k,
    sx + 3 * k,
    my + 30 * k,
    sodiumNamed * P.act * (1 - P.lid) * smooth(clamp01((na.open - 0.4) / 0.3)),
    'left',
    mix(IONS.Na.colour, L.ink, 0.2)
  );
  // its second gate
  const lidAngle = lerp(2.01, -0.26, smooth(na.lid));
  tag(
    g,
    'inactivation gate',
    sx - side,
    my + 36 * k,
    sx + (-11 + 11.65 * Math.cos(lidAngle)) * k,
    my + (23.5 + 11.65 * Math.sin(lidAngle)) * k,
    sodiumNamed * P.lid * (1 - P.recov),
    'right',
    naInk
  );
  // the membrane potential, in the corner, from the slide about the field on
  say(
    g,
    `membrane potential: ${Math.round(na.v)} mV`,
    w - 18 * u,
    24 * u,
    sodiumNamed * P.field,
    12.5,
    'right',
    mix(FIELD, L.ink, 0.25)
  );
  // the ligand-gated channel
  const ligandNamed = shown * P.onLigand;
  say(
    g,
    narrow ? 'ligand-gated channel' : 'a ligand-gated channel',
    lx,
    my - 52 * k,
    ligandNamed * P.ligand,
    12.5,
    'center',
    lgInk
  );
  tag(
    g,
    'ligand',
    lx + side,
    my - 44 * k,
    lx + 7 * k,
    my - 35 * k,
    ligandNamed * P.ligand * (1 - P.binding) * smooth(lg.docked),
    'left',
    lgInk
  );
  tag(
    g,
    'binding site',
    lx - side,
    my - 44 * k,
    lx - 7 * k,
    my - 33 * k,
    ligandNamed * P.ligand * (1 - P.binding),
    'right',
    lgInk
  );
  const ligandState = lg.numb > 0.5 ? 'desensitized' : lg.open > 0.5 ? 'open' : 'closed';
  say(g, ligandState, lx + side, my + 4 * k, ligandNamed * P.ligand, 12.5, 'left', lgInk);

  // the pump: named; its round's ions, out and in; the charge it carries out; and its ATP
  const pumpShown = shown * P.onPump;
  if (pumpShown > 0.01) {
    const pumpInk = mix(L.ink, L.page, 0.1);
    say(
      g,
      narrow ? 'Na^{+}–K^{+} pump' : 'the sodium–potassium pump',
      px,
      my - 32 * k,
      pumpShown * P.pumpNamed,
      12.5,
      'center',
      pumpInk
    );
    const [naInk, kInk] = [mix(IONS.Na.colour, L.ink, 0.3), mix(IONS.K.colour, L.ink, 0.3)];
    const lw = Math.max(1.8, 0.5 * k);
    arrow(
      ctx,
      px - 27 * k,
      my + 13 * k,
      px - 27 * k,
      my - 15 * k,
      IONS.Na.colour,
      0.8 * pumpShown * P.pumping,
      lw,
      3 * k
    );
    say(
      g,
      narrow ? '3 Na^{+}' : '3 Na^{+} out',
      px - 30 * k,
      my - 19 * k,
      pumpShown * P.pumping,
      12,
      'right',
      naInk
    );
    arrow(
      ctx,
      px + 27 * k,
      my - 15 * k,
      px + 27 * k,
      my + 13 * k,
      IONS.K.colour,
      0.8 * pumpShown * P.pumping,
      lw,
      3 * k
    );
    say(
      g,
      narrow ? '2 K^{+}' : '2 K^{+} in',
      px + 30 * k,
      my - 19 * k,
      pumpShown * P.pumping,
      12,
      'left',
      kInk
    );
    say(
      g,
      narrow ? 'net: one + out' : 'net: one positive charge out each round',
      px,
      my - 41 * k,
      pumpShown * P.netCharge,
      12,
      'center',
      mix(POS, L.ink, 0.3)
    );
    say(
      g,
      narrow ? 'one ATP a round' : 'one ATP each round',
      px + 37 * k,
      my + 43 * k,
      pumpShown * P.atpCost,
      12,
      'left',
      mix(ATP_COLOUR, L.ink, 0.3)
    );
    for (const [wide, short, alpha] of [
      [
        'the sodium–potassium pump: a protein using the energy of ATP to move ions against their gradients',
        'a pump, run on ATP',
        P.pumpNamed * (1 - P.pumping),
      ],
      [
        'each round: three Na^{+} out, two K^{+} in, using one ATP',
        '3 Na^{+} out, 2 K^{+} in',
        P.pumping * (1 - P.netCharge),
      ],
      [
        'one more positive charge out than in, each round: the inside a few millivolts more negative',
        'net: one + out a round',
        P.netCharge * (1 - P.atpCost),
      ],
      [
        'pumping the ions back uses a large share of the brain’s energy',
        'a large share of the brain’s energy',
        P.atpCost,
      ],
    ] as [string, string, number][])
      footNote(g, narrow ? short : wide, pumpShown * alpha);
  }

  // the words at the foot, as each slide comes to them
  const sodiumFoot = shown * (1 - P.onLigand);
  for (const [wide, short, alpha] of [
    [
      'an ion channel: a protein through the membrane, a pore through its middle',
      'a protein, with a pore',
      sodiumFoot * P.protein * (1 - P.swing) * (1 - P.sensors),
    ],
    [
      'its gate: shut, no ions pass; open, they flow through',
      'shut, none pass; open, they flow',
      sodiumFoot * P.swing * (1 - P.sensors),
    ],
    [
      'voltage sensors: parts of the protein, in the membrane, carrying positive charges',
      'voltage sensors: positively charged',
      sodiumFoot * P.sensors * (1 - P.field),
    ],
    [
      'at rest, the field across the membrane pushes the sensors in, and the gate stays shut',
      'at rest, the field pushes them in',
      sodiumFoot * P.field * (1 - P.stepV),
    ],
    [
      'the potential up: less charge lining the membrane, a weaker field, and the sensors move out',
      'potential up: weaker field, sensors out',
      sodiumFoot * P.stepV * (1 - P.act),
    ],
    [
      'activation: the sensors pull the gate open, and sodium flows in',
      'activation: open, sodium in',
      sodiumFoot * P.act * (1 - P.deact),
    ],
    [
      'deactivation: the potential back down, the sensors pushed back in, and the gate shut',
      'deactivation: shut again',
      sodiumFoot * P.deact * (1 - P.lid),
    ],
    [
      'a second gate: the inactivation gate, a loop of the protein inside the cell',
      'the inactivation gate',
      sodiumFoot * P.lid * (1 - P.inact),
    ],
    [
      'inactivation: soon after it opens, the second gate plugs the pore, while the potential stays up',
      'inactivation: plugged',
      sodiumFoot * P.inact * (1 - P.recov),
    ],
    [
      'recovery: back at rest, the plug comes out again, slowly',
      'recovery: slowly',
      sodiumFoot * P.recov * (1 - P.twice) * (1 - P.ligand),
    ],
    [
      'too soon, a second rise finds it still plugged: no sodium flows',
      'too soon: still plugged',
      sodiumFoot * P.twice * (1 - P.ligand),
    ],
    [
      'ligand-gated: it opens when its ligand binds',
      'opens when its ligand binds',
      shown * P.onLigand * P.ligand * (1 - P.binding),
    ],
    [
      'the ligand bound, the gate opens: activation; the ligand gone, it shuts: deactivation',
      'bound, open; gone, shut',
      shown * P.onLigand * P.binding * (1 - P.desen),
    ],
    [
      'desensitization: shut, though the ligand is still bound',
      'desensitized: shut, still bound',
      shown * P.onLigand * P.desen,
    ],
    [
      'closed, open, and inactivated or desensitized: the states an active channel moves between',
      'closed, open, inactivated',
      sodiumFoot * P.states * (1 - P.flicker),
    ],
    [
      'one channel: open or shut at random, open more often while the potential is up',
      'one channel: at random',
      sodiumFoot * P.flicker * (1 - P.many),
    ],
    [
      'many channels together: the share of them open rises and falls smoothly',
      'many together: smooth',
      sodiumFoot * P.many,
    ],
  ] as [string, string, number][])
    footNote(g, narrow ? short : wide, alpha);
}

/**
 * Below the active channel close in, a plot of its round, slowed far down, a dot where it has got to: the membrane
 * potential, stepped up and back — or, for the ligand-gated channel, how bound its ligand is — and, under it, how far out
 * the voltage sensors are, then how open the channel is, each part of that named as the slides come to it, the time it
 * is inactivated or desensitized shaded; then that one channel, opening at random, and with it, faint, a few more such
 * channels and, bold, the share of 120 of them open. And, on the slide about its states, in the plot's place, the states
 * such a channel moves between, the one it is in lit.
 */
function drawGating(g: G, P: Pose, narrow: boolean, ms: number) {
  const { ctx, w, h, L, u } = g;
  const a = P.plot;
  const s = Math.max(u, 0.85);
  const [left, right] = [14, w - 14];
  const top = h - 36 * u - 96 * s;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(left, top, right - left, 92 * s, 10 * s);
  ctx.fillStyle = rgba(L.page, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.12);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const traces = a * (1 - P.states);
  const lig = P.onLigand;
  if (traces > 0.01) {
    const names = narrow ? 0 : 150 * s;
    const [x0, x1] = [left + 18 * s + names, right - 18 * s];
    const X = (t: number) => lerp(x0, x1, t / ACT_MS);
    // the two rows, each [foot, top]
    const rows: [number, number][] = [
      [top + 38 * s, top + 16 * s],
      [top + 82 * s, top + 52 * s],
    ];
    const Y = (row: number, v: number) => lerp(rows[row][0], rows[row][1], v);
    const line = (
      row: number,
      f: (t: number) => number,
      colour: RGB,
      alpha: number,
      width: number
    ) => {
      if (alpha < 0.01) return;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = rgba(colour, 1);
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 600; i++) {
        const t = (i / 600) * ACT_MS;
        if (i) ctx.lineTo(X(t), Y(row, f(t)));
        else ctx.moveTo(X(t), Y(row, f(t)));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    // where in the round a channel is in some state — plugged, or desensitized — shaded on the lower row
    const shade = (inState: (t: number) => boolean, colour: RGB, alpha: number) => {
      if (alpha < 0.01) return [] as [number, number][];
      const spans: [number, number][] = [];
      let from = -1;
      for (let i = 0; i <= 300; i++) {
        const t = (i / 300) * ACT_MS;
        const on = i < 300 && inState(t);
        if (on && from < 0) from = t;
        if (!on && from >= 0) {
          spans.push([from, t]);
          from = -1;
        }
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = rgba(colour, 0.13);
      for (const [t0, t1] of spans)
        ctx.fillRect(X(t0), rows[1][1] - 4 * s, X(t1) - X(t0), rows[1][0] - rows[1][1] + 8 * s);
      ctx.globalAlpha = 1;
      return spans;
    };
    const naInk = mix(IONS.Na.colour, L.ink, 0.3);
    const lgInk = mix(TRANSMITTER, L.ink, 0.3);
    const stim = mix(L.ink, L.page, 0.25);
    // the voltage-gated channel's: the membrane potential, and how far out its sensors are, then how open it is
    const vg = traces * clamp01(1 - 2 * lig);
    const plugged = shade(
      (t) => activeSodium(P, t).lid > 0.5,
      IONS.Na.colour,
      vg * P.inact * (1 - P.flicker)
    );
    const rise = (t: number) => (activeSodium(P, t).v - V_REST) / (V_STEPPED - V_REST);
    line(0, rise, stim, 0.75 * vg, 1.6 * s);
    const lower = (t: number) => {
      const na = activeSodium(P, t);
      return lerp(lerp(na.sensors, na.open, P.act), shareOpenAt(t), P.many);
    };
    for (let n = 1; n <= 6; n++)
      line(1, (t) => oneOpenAt(n, t), IONS.Na.colour, 0.16 * vg * P.many, 1);
    line(1, lower, IONS.Na.colour, vg, 2 * s);
    // the ligand-gated channel's: how bound its ligand is, and how open it is
    const lgShown = traces * clamp01(2 * lig - 1);
    const numbed = shade((t) => activeLigand(P, t).numb > 0.5, GREY, lgShown * P.desen);
    line(0, (t) => activeLigand(P, t).docked, stim, 0.75 * lgShown, 1.6 * s);
    line(1, (t) => activeLigand(P, t).open, TRANSMITTER, lgShown, 2 * s);
    // the dots, where the round has got to
    const dot = (x: number, yy: number, alpha: number) => {
      if (alpha < 0.01) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = rgba(L.ink, 0.85);
      ctx.beginPath();
      ctx.arc(x, yy, 3.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    dot(X(ms), Y(0, rise(ms)), vg);
    dot(X(ms), Y(1, lower(ms)), vg);
    dot(X(ms), Y(0, activeLigand(P, ms).docked), lgShown);
    dot(X(ms), Y(1, activeLigand(P, ms).open), lgShown);
    // the rows' names, on the left — or, on a narrow screen, over each row
    const [nx, align] = narrow ? [x0, 'left' as const] : [left + 16 * s, 'left' as const];
    const nameAt = (row: number) =>
      narrow ? rows[row][1] - 8 * s : (rows[row][0] + rows[row][1]) / 2;
    const name = (text: string, row: number, alpha: number, colour: RGB) =>
      say(g, text, nx, nameAt(row), alpha, narrow ? 10.5 : 11.5, align, colour);
    name('membrane potential', 0, vg, stim);
    say(
      g,
      `${Math.round(activeSodium(P, ms).v)} mV`,
      X(ms) + 7 * s,
      Y(0, rise(ms)) - 7 * s,
      vg,
      10.5,
      'left',
      stim
    );
    name('voltage sensors: out', 1, vg * (1 - P.act), naInk);
    name('channel open', 1, vg * P.act * (1 - P.flicker), naInk);
    name(
      narrow ? 'one channel open' : 'this one channel open',
      1,
      vg * P.flicker * (1 - P.many),
      naInk
    );
    name(narrow ? 'share open' : 'share of 120 open', 1, vg * P.many, naInk);
    name('ligand bound', 0, lgShown, stim);
    name('channel open', 1, lgShown, lgInk);
    // each part of the response named, as the slides come to it
    const [on, off] = V_STEPS[0];
    const mid = (rows[1][0] + rows[1][1]) / 2;
    say(g, 'activation', X(on) - 5 * s, mid, vg * P.act * (1 - P.flicker), 11, 'right', naInk);
    say(g, 'deactivation', X(off) + 5 * s, mid, vg * P.deact * (1 - P.inact), 11, 'left', naInk);
    for (const [t0, t1] of plugged) {
      const alpha = vg * P.inact * (1 - P.flicker);
      say(
        g,
        'inactivated',
        (X(t0) + X(Math.min(t1, off))) / 2,
        rows[1][1] + 6 * s,
        alpha * (1 - P.twice * Number(t0 > off)),
        11,
        'center',
        naInk
      );
      if (t1 > off) say(g, 'recovered', X(t1) + 5 * s, mid, alpha * P.recov, 11, 'left', naInk);
    }
    say(
      g,
      narrow ? 'too soon' : 'too soon: still plugged',
      X(V_STEPS[1][0]) + 5 * s,
      rows[0][1] + 2 * s,
      vg * P.twice,
      11,
      'left',
      naInk
    );
    say(
      g,
      narrow ? 'at random' : 'open and shut at random',
      X(off) + 5 * s,
      mid,
      vg * P.flicker * (1 - P.many),
      11,
      'left',
      naInk
    );
    say(
      g,
      narrow ? 'smooth' : 'together: smooth',
      X(off) + 5 * s,
      mid,
      vg * P.many,
      11,
      'left',
      naInk
    );
    const [bound, unbound] = BOUND[0];
    say(g, 'activation', X(bound + 200) - 5 * s, mid, lgShown * P.binding, 11, 'right', lgInk);
    say(
      g,
      'deactivation',
      X(unbound) + 5 * s,
      mid,
      lgShown * P.binding * (1 - P.desen),
      11,
      'left',
      lgInk
    );
    for (const [t0, t1] of numbed)
      say(
        g,
        'desensitized',
        (X(t0) + X(t1)) / 2,
        rows[1][1] + 6 * s,
        lgShown * P.desen,
        11,
        'center',
        lgInk
      );
    say(g, 'slowed down', right - 14 * s, top + 11 * s, 0.6 * traces, 10.5, 'right', stim);
  }
  // the states, in the plot's place: closed, open, and inactivated or desensitized, and the ways between them — the one
  // the sodium channel is in lit
  const st = a * P.states;
  if (st < 0.01) return;
  const width = right - left;
  const boxes: [string, number][] = [
    ['closed', left + 0.18 * width],
    ['open', left + 0.5 * width],
    [narrow ? 'inactivated' : 'inactivated or desensitized', left + 0.82 * width],
  ];
  const now = activeSodium(P, ms);
  const lit = [Math.max(0, 1 - now.open - now.lid), now.open, now.lid];
  const [by, bh] = [top + 18 * s, 22 * s];
  const half = (text: string) => mathWidth(ctx, text, 12.5 * g.ts) / 2 + 12 * s;
  boxes.forEach(([text, x], i) => {
    ctx.globalAlpha = st;
    ctx.beginPath();
    ctx.roundRect(x - half(text), by, 2 * half(text), bh, 8 * s);
    ctx.fillStyle = rgba(IONS.Na.colour, 0.16 * lit[i]);
    ctx.fill();
    ctx.strokeStyle = rgba(mix(L.ink, IONS.Na.colour, 0.6 * lit[i]), 0.5 + 0.4 * lit[i]);
    ctx.lineWidth = 1.2 + 0.8 * lit[i];
    ctx.stroke();
    ctx.globalAlpha = 1;
    say(g, text, x, by + bh / 2, st, 12.5, 'center');
  });
  const edge = (i: number, sign: number) => boxes[i][1] + sign * half(boxes[i][0]);
  const ink = mix(L.ink, L.page, 0.2);
  // closed to open, and back
  arrow(
    ctx,
    edge(0, 1) + 4 * s,
    by + 6 * s,
    edge(1, -1) - 4 * s,
    by + 6 * s,
    ink,
    0.75 * st,
    1.4,
    6 * s
  );
  arrow(
    ctx,
    edge(1, -1) - 4 * s,
    by + 16 * s,
    edge(0, 1) + 4 * s,
    by + 16 * s,
    ink,
    0.75 * st,
    1.4,
    6 * s
  );
  const between = (edge(0, 1) + edge(1, -1)) / 2;
  say(g, 'activation', between, by - 6 * s, st, 11, 'center');
  say(g, 'deactivation', between, by + bh + 8 * s, st, 11, 'center');
  // open to inactivated
  arrow(
    ctx,
    edge(1, 1) + 4 * s,
    by + bh / 2,
    edge(2, -1) - 4 * s,
    by + bh / 2,
    ink,
    0.75 * st,
    1.4,
    6 * s
  );
  say(
    g,
    narrow ? 'inactivation' : 'inactivation, or desensitization',
    (edge(1, 1) + edge(2, -1)) / 2,
    by - 6 * s,
    st,
    11,
    'center'
  );
  // and, slowly, back to closed: recovery
  const ry = by + bh + 26 * s;
  ctx.globalAlpha = 0.75 * st;
  ctx.strokeStyle = rgba(ink, 1);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(boxes[2][1], by + bh + 4 * s);
  ctx.lineTo(boxes[2][1], ry);
  ctx.lineTo(boxes[0][1], ry);
  ctx.stroke();
  ctx.globalAlpha = 1;
  arrow(ctx, boxes[0][1], ry, boxes[0][1], by + bh + 4 * s, ink, 0.75 * st, 1.4, 6 * s);
  say(g, 'recovery, slowly', (boxes[0][1] + boxes[2][1]) / 2, ry + 9 * s, st, 11, 'center');
}

/** Each voltage-clamp step's peak current: when in the step, ms, and how much, as on the curve. */
const IV_PEAKS = IV_STEPS.map((V) => {
  let [t, i] = [0, 0];
  for (let s = 0; s <= IV_WINDOW; s += 0.01) {
    const now = currentAfter(V, s);
    if (Math.abs(now) > Math.abs(i)) [t, i] = [s, now];
  }
  return { t, i };
});
/** A potential as the slides write it: a sign, then the millivolts. */
const mvSigned = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))} mV`;

/**
 * In front of the active channels close in, from the slide about a voltage clamp: on the left, the clamp's seven steps
 * from rest, and under them the current through the sodium channels at each — inward down — one after another picked
 * out; on the right, from the next slide, each step's peak current plotted against its potential, and the curve
 * through them; a constant conductance's straight line through the reversal potential; above the curve, the share of
 * channels open at each potential, a cursor running across both; and the reversal potential marked where the curve
 * crosses zero. On a narrow screen the clamp is above the curve, and the share open comes in its place.
 */
function drawIV(g: G, P: Pose, narrow: boolean) {
  const { ctx, w, h, L, u } = g;
  const a = P.ivPanel;
  const s = Math.max(u, 0.85);
  ctx.globalAlpha = a;
  ctx.fillStyle = rgba(L.page, 1);
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  const ink = mix(L.ink, L.page, 0.12);
  const faint = mix(L.ink, L.page, 0.5);
  const naInk = mix(IONS.Na.colour, L.ink, 0.3);
  const [top, bottom] = [30 * s, h - 46 * u];
  const [left, right] = [16 * s, w - 16 * s];
  // which step is picked out, one after another
  const lit = g.still ? 2 : Math.floor(g.now / 1100) % IV_STEPS.length;
  type Box = { x0: number; x1: number; y0: number; y1: number };
  let clampBox: Box;
  let ivBox: Box;
  let gvBox: Box;
  if (narrow) {
    const split = lerp(top, bottom, 0.44);
    clampBox = { x0: left + 30 * s, x1: right - 44 * s, y0: top, y1: split - 20 * s };
    gvBox = { x0: left + 30 * s, x1: right - 10 * s, y0: top + 12 * s, y1: split - 26 * s };
    ivBox = { x0: left + 30 * s, x1: right - 10 * s, y0: split + 6 * s, y1: bottom };
  } else {
    const mid = lerp(left, right, 0.44);
    clampBox = { x0: left + 52 * s, x1: mid - 56 * s, y0: top, y1: bottom };
    const gvTall = (bottom - top) * 0.34 * P.ivBends;
    gvBox = { x0: mid + 40 * s, x1: right - 10 * s, y0: top + 12 * s, y1: top + gvTall - 26 * s };
    ivBox = { x0: mid + 40 * s, x1: right - 10 * s, y0: top + gvTall, y1: bottom };
  }
  const line = (
    pts: [number, number][],
    colour: RGB,
    alpha: number,
    width: number,
    dash: number[] = []
  ) => {
    if (alpha < 0.01 || pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = rgba(colour, 1);
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash(dash);
    ctx.beginPath();
    pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  };
  // a mark on a plot: a dot in its step's colour, ringed in the page
  const dot = (x: number, y: number, r: number, colour: RGB, alpha: number) => {
    if (alpha < 0.01) return;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = rgba(L.page, 1);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(colour, 1);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  // the voltage clamp: the steps, and under them the currents
  const clamp = a * (narrow ? 1 - P.ivBends : 1);
  if (clamp > 0.01) {
    const { x0, x1, y0, y1 } = clampBox;
    const protoBottom = lerp(y0 + 14 * s, y1, 0.3);
    const [cTop, cBottom] = [protoBottom + 34 * s, y1 - 18 * s];
    const X = (t: number) => lerp(x0, x1, (t + 0.5) / (IV_WINDOW + 0.5));
    const Vy = (v: number) => lerp(protoBottom, y0 + 14 * s, (v + 80) / 180);
    const Iy = (i: number) => lerp(cBottom, cTop, (i + 1.08) / 1.78);
    say(
      g,
      narrow ? 'potential, stepped' : 'the membrane potential, stepped from rest',
      x0,
      y0,
      clamp,
      11.5,
      'left',
      ink
    );
    IV_STEPS.forEach((V, j) => {
      const on = j === lit;
      line(
        [
          [X(-0.5), Vy(V_REST)],
          [X(0), Vy(V_REST)],
          [X(0), Vy(V)],
          [X(IV_WINDOW), Vy(V)],
        ],
        stepColour(L, j),
        clamp * (on ? 1 : 0.55),
        (on ? 2.4 : 1.4) * s
      );
      say(g, mvSigned(V), x1 + 6 * s, Vy(V), clamp * (on ? 1 : 0.6), 10, 'left', ink);
    });
    say(
      g,
      narrow ? 'current' : 'the current through the channels',
      x0,
      cTop - 18 * s,
      clamp,
      11.5,
      'left',
      ink
    );
    line(
      [
        [X(-0.5), Iy(0)],
        [X(IV_WINDOW), Iy(0)],
      ],
      faint,
      0.7 * clamp,
      1,
      [3, 4]
    );
    say(g, narrow ? 'out' : 'outward', x0 - 8 * s, Iy(0.32), 0.8 * clamp, 10, 'right', faint);
    say(g, narrow ? 'in' : 'inward', x0 - 8 * s, Iy(-0.55), 0.8 * clamp, 10, 'right', faint);
    // the picked-out step last, over the others
    for (const j of [...IV_STEPS.keys()].filter((n) => n !== lit).concat(lit)) {
      const pts: [number, number][] = [];
      for (let t = -0.5; t <= IV_WINDOW + 1e-6; t += 0.025)
        pts.push([X(t), Iy(t < 0 ? 0 : currentAfter(IV_STEPS[j], t))]);
      line(pts, stepColour(L, j), clamp * (j === lit ? 1 : 0.55), (j === lit ? 2.4 : 1.4) * s);
    }
    // each one's peak, from the slide that plots them
    IV_PEAKS.forEach(({ t, i }, j) =>
      dot(
        X(t),
        Iy(i),
        (j === lit ? 5 : 3.8) * s,
        stepColour(L, j),
        clamp * clamp01(P.ivPeaks * IV_STEPS.length - j)
      )
    );
    for (let t = 0; t <= IV_WINDOW; t++)
      say(g, `${t}`, X(t), cBottom + 12 * s, 0.85 * clamp, 10, 'center', faint);
    say(g, 'ms', X(IV_WINDOW) + 10 * s, cBottom + 12 * s, 0.85 * clamp, 10, 'left', faint);
  }

  // the I–V curve: each step's peak current against its potential
  const iv = a * P.ivPeaks;
  const { x0, x1, y0, y1 } = ivBox;
  const VX = (v: number) => lerp(x0, x1, (v + 90) / 190);
  const IY = (i: number) => lerp(y1, y0 + 16 * s, (i + 1.12) / 2.04);
  if (iv > 0.01) {
    say(
      g,
      narrow ? 'peak current' : 'the peak current at each potential',
      x0,
      y0,
      iv,
      11.5,
      'left',
      ink
    );
    line(
      [
        [x0, IY(0)],
        [x1, IY(0)],
      ],
      faint,
      0.8 * iv,
      1
    );
    line(
      [
        [VX(0), y0 + 16 * s],
        [VX(0), y1],
      ],
      faint,
      0.8 * iv,
      1
    );
    for (const v of [-80, -40, 40, 80]) {
      line(
        [
          [VX(v), IY(0) - 3 * s],
          [VX(v), IY(0) + 3 * s],
        ],
        faint,
        0.8 * iv,
        1
      );
      say(g, mvSigned(v).replace(' mV', ''), VX(v), IY(0) - 10 * s, 0.85 * iv, 10, 'center', faint);
    }
    say(
      g,
      narrow ? 'mV' : 'membrane potential, mV',
      x1,
      IY(0) + 16 * s,
      0.85 * iv,
      10,
      'right',
      faint
    );
    say(g, narrow ? 'out' : 'outward', VX(0) + 6 * s, y0 + 24 * s, 0.8 * iv, 10, 'left', faint);
    say(g, narrow ? 'in' : 'inward', VX(0) + 6 * s, y1 - 4 * s, 0.8 * iv, 10, 'left', faint);
    // a constant conductance's straight line, through the reversal potential, from the slide about it
    const [vLow, vHigh] = [
      EQUILIBRIUM.Na - 1.12 * IV_CURVE.largest,
      EQUILIBRIUM.Na + 0.62 * IV_CURVE.largest,
    ];
    line(
      [
        [VX(vLow), IY(-1.12)],
        [VX(vHigh), IY(0.62)],
      ],
      ink,
      0.75 * iv * P.ivLine,
      1.6 * s,
      [6, 5]
    );
    say(
      g,
      narrow ? 'constant: straight' : 'a constant conductance: a straight line',
      VX(vLow) + 10 * s,
      IY(-1.04),
      iv * P.ivLine,
      11,
      'left',
      ink
    );
    // the curve, drawn on as the dots come
    const reach = lerp(-90, 100, clamp01(P.ivPeaks * 1.15));
    line(
      IV_CURVE.points
        .filter((p) => p.v <= reach && p.i <= 0.92)
        .map((p): [number, number] => [VX(p.v), IY(p.i)]),
      IONS.Na.colour,
      iv,
      2 * s
    );
    IV_STEPS.forEach((V, j) =>
      dot(
        VX(V),
        IY(ivAt(V).i),
        (j === lit ? 5.5 : 4.2) * s,
        stepColour(L, j),
        iv * clamp01(P.ivPeaks * IV_STEPS.length - j)
      )
    );
    // the reversal potential, where the curve crosses zero
    const rev = iv * P.ivReverse;
    if (rev > 0.01) {
      ctx.globalAlpha = rev;
      ctx.strokeStyle = rgba(IONS.Na.colour, 1);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(VX(EQUILIBRIUM.Na), IY(0), 8 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      say(
        g,
        narrow
          ? `E_{Na}: ${mvSigned(EQUILIBRIUM.Na)}`
          : `E_{Na} ≈ ${mvSigned(EQUILIBRIUM.Na)}: no current`,
        VX(EQUILIBRIUM.Na) - 12 * s,
        IY(0) - 22 * s,
        rev,
        11.5,
        'right',
        naInk
      );
    }
  }

  // the share of channels open at each potential, from the slide about why the curve bends — and a cursor across both
  const gv = a * P.ivBends;
  if (gv > 0.01) {
    const { x0: gx0, x1: gx1, y0: gy0, y1: gy1 } = gvBox;
    const GX = (v: number) => lerp(gx0, gx1, (v + 90) / 190);
    const GY = (share: number) => lerp(gy1, gy0 + 14 * s, share);
    say(
      g,
      narrow ? 'share open' : 'the share of channels open, at the peak',
      gx0,
      gy0,
      gv,
      11.5,
      'left',
      ink
    );
    line(
      [
        [gx0, GY(0)],
        [gx1, GY(0)],
      ],
      faint,
      0.8 * gv,
      1
    );
    line(
      [
        [gx0, GY(1)],
        [gx1, GY(1)],
      ],
      faint,
      0.4 * gv,
      1,
      [3, 4]
    );
    say(g, 'all', gx0 - 6 * s, GY(1), 0.8 * gv, 10, 'right', faint);
    say(g, 'none', gx0 - 6 * s, GY(0), 0.8 * gv, 10, 'right', faint);
    line(
      IV_CURVE.points.map((p): [number, number] => [GX(p.v), GY(p.g)]),
      IONS.Na.colour,
      gv,
      2 * s
    );
    IV_STEPS.forEach((V, j) =>
      dot(GX(V), GY(ivAt(V).g), (j === lit ? 5.5 : 4.2) * s, stepColour(L, j), gv)
    );
    // the cursor: at each potential in turn, the share open, and the current it passes there
    const vc = g.still ? 0 : -90 + 190 * cycle(g.now, 6000);
    const at = ivAt(vc);
    line(
      [
        [GX(vc), gy0 + 14 * s],
        [GX(vc), GY(0)],
      ],
      faint,
      0.7 * gv,
      1
    );
    if (!narrow)
      line(
        [
          [VX(vc), y0 + 16 * s],
          [VX(vc), y1],
        ],
        faint,
        0.7 * gv,
        1
      );
    dot(GX(vc), GY(at.g), 3.6 * s, L.ink, gv);
    dot(VX(vc), IY(at.i), 3.6 * s, L.ink, gv);
    if (!narrow)
      say(
        g,
        `${Math.round(100 * at.g)}% open × driving force ${mvSigned(vc - EQUILIBRIUM.Na)}`,
        VX(vc) + (vc > 20 ? -8 : 8) * s,
        // (above the dot near the curve's trough, clear of the straight line's name)
        IY(at.i) + (at.i < -0.45 ? -16 : 18) * s,
        gv,
        10.5,
        vc > 20 ? 'right' : 'left',
        ink
      );
  }

  // the words at the foot, as each slide comes to them
  for (const [wide, short, alpha] of [
    [
      "a voltage clamp: the potential held at each level in turn, and the current recorded — Hodgkin and Huxley's sodium channels",
      'a voltage clamp',
      1 - P.ivPeaks,
    ],
    [
      "each step's peak current against its potential: the I–V curve, inward current down",
      'the I–V curve',
      P.ivPeaks * (1 - P.ivLine),
    ],
    [
      'a constant conductance would give a straight line through the reversal potential: Ohm’s law',
      'constant conductance: straight',
      P.ivLine * (1 - P.ivBends),
    ],
    [
      'the current is the share of channels open times the driving force, V − E_{Na}',
      'share open × driving force',
      P.ivBends * (1 - P.ivReverse),
    ],
    [
      "at sodium's reversal potential, no current: below it sodium flows in, above it out",
      'E_{Na}: no current',
      P.ivReverse,
    ],
  ] as [string, string, number][])
    footNote(g, narrow ? short : wide, a * alpha);
}

/** Each input size's colour: one hue, the synapse's green, light to dark as it grows — dark to light on a dark page
 * (each run checked: steps a reader can tell apart, the faintest clear of the page). */
const sizeColour = (L: Look, j: number) =>
  mix(
    L.dark ? [22, 101, 52] : [92, 194, 130],
    L.dark ? [134, 239, 172] : [22, 101, 52],
    j / (AP_SIZES.length - 1)
  );
/** When in the one followed the spike rises past threshold, peaks, dips lowest, and is back near rest, ms; and how long
 * after it a strong input fires nothing. */
const AP_PHASES = (() => {
  const v = AP_RUN.v;
  let peak = 0;
  for (let j = 0; j < 300; j++) if (v[j] > v[peak]) peak = j;
  let low = peak;
  for (let j = peak; j < 300; j++) if (v[j] < v[low]) low = j;
  let rise = peak;
  while (rise > 0 && v[rise] - v[rise - 1] > 0.4) rise--;
  let back = low;
  while (back < 299 && v[back] < V_REST - 1) back++;
  return {
    rise: rise / 10,
    peak: peak / 10,
    low: low / 10,
    back: back / 10,
    refractory: [peak / 10, 16],
  };
})();

/**
 * The action potential's own plots, in front of the membrane: across the top, the membrane potential through the run
 * followed — four spikes, or, close in, the first — with sodium's and potassium's reversal potentials, rest and the
 * threshold marked, a dot running along it; the inputs that start it; inputs short of threshold, and inputs of four
 * sizes; then, under it, sodium's and potassium's conductances, and a strip of membrane whose channels open, shut and
 * inactivate with the dot, ions through those open; the rise shaded, and the runaway that drives it; the peak; the
 * fall, and the dip below rest; the refractory period, and a strong input in it firing nothing; and every part of the
 * spike named together.
 */
function drawAP(g: G, P: Pose, narrow: boolean) {
  const { ctx, w, h, L, u } = g;
  const a = P.apPanel;
  const s = Math.max(u, 0.85);
  ctx.globalAlpha = a;
  ctx.fillStyle = rgba(L.page, 1);
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  const ink = mix(L.ink, L.page, 0.12);
  const faint = mix(L.ink, L.page, 0.5);
  const [naInk, kInk] = [mix(IONS.Na.colour, L.ink, 0.3), mix(IONS.K.colour, L.ink, 0.3)];
  // the window, ms: a hundred, four spikes; or, close in, thirty, the first; and the dot, slowed far down
  const tMax = lerp(100, 30, P.apZoom);
  const tc = g.still ? AP_PHASES.peak : cycle(g.now, AP_MS) * tMax;
  const single = P.apZoom;
  // the rows: the potential across the top — all the room, until the conductances and the channels come under it
  const [left, right] = [16 * s, w - 16 * s];
  const [x0, x1] = [left + (narrow ? 46 : 84) * s, right - 12 * s];
  const vTop = 34 * s;
  const vBottom = lerp(h - 64 * u, lerp(vTop, h - 46 * u, 0.5), P.apGated);
  const [gTop, gBottom] = [vBottom + 34 * s, lerp(vBottom, h - 46 * u, 0.42) + 26 * s];
  const [sTop, sBottom] = [gBottom + 12 * s, h - 50 * u];
  const TX = (t: number) => lerp(x0, x1, t / tMax);
  const VY = (v: number) => lerp(vBottom, vTop + 8 * s, (v + 95) / 165);
  const line = (
    pts: [number, number][],
    colour: RGB,
    alpha: number,
    width: number,
    dash: number[] = []
  ) => {
    if (alpha < 0.01 || pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = rgba(colour, 1);
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash(dash);
    ctx.beginPath();
    pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  };
  const trace = (series: number[], Y: (v: number) => number, from = 0, to = tMax) => {
    const pts: [number, number][] = [];
    for (let t = from; t <= Math.min(to, (series.length - 1) / 10); t += 0.1)
      pts.push([TX(t), Y(runAt(series, t))]);
    return pts;
  };
  const shade = (t0: number, t1: number, colour: RGB, alpha: number, y0 = vTop, y1 = vBottom) => {
    if (alpha < 0.01) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = rgba(colour, 0.12);
    ctx.fillRect(TX(t0), y0, TX(t1) - TX(t0), y1 - y0);
    ctx.globalAlpha = 1;
  };
  const named = (
    text: string,
    x: number,
    y: number,
    alpha: number,
    align: CanvasTextAlign,
    colour: RGB,
    size = 11.5
  ) => say(g, text, x, y, a * alpha, size, align, colour);

  // the phases, close in, shaded as the slides come to them: the rise, the fall, and the refractory period
  const { rise, peak, low, back, refractory } = AP_PHASES;
  shade(rise, peak, IONS.Na.colour, a * single * Math.max(P.apUp * (1 - P.apPeak), P.apSummary));
  shade(peak, low, IONS.K.colour, a * single * Math.max(P.apDown * (1 - P.apRefract), P.apSummary));
  shade(refractory[0], refractory[1], faint, a * single * P.apRefract * (1 - P.apSummary));

  // the reversal potentials, rest and the threshold, each named at the left
  const refs: [number, string, string, RGB, number, number[]][] = [
    [EQUILIBRIUM.Na, `E_{Na} ${mvSigned(EQUILIBRIUM.Na)}`, 'E_{Na}', IONS.Na.colour, 1, [6, 5]],
    [EQUILIBRIUM.K, `E_{K} ${mvSigned(EQUILIBRIUM.K)}`, 'E_{K}', IONS.K.colour, 1, [6, 5]],
    [V_REST, `rest ${mvSigned(V_REST)}`, 'rest', faint, 1, []],
    [THRESHOLD, `threshold ${mvSigned(THRESHOLD)}`, 'thresh.', ink, P.apThresh, [2, 4]],
  ];
  for (const [v, wide, short, colour, shown, dash] of refs) {
    line(
      [
        [x0, VY(v)],
        [x1, VY(v)],
      ],
      colour,
      0.55 * a * shown,
      1.2,
      dash
    );
    named(
      narrow ? short : wide,
      x0 - 6 * s,
      VY(v),
      0.9 * shown,
      'right',
      mix(colour, L.ink, 0.3),
      10.5
    );
  }
  named(narrow ? 'potential' : 'the membrane potential', x0, vTop - 12 * s, 1, 'left', ink);
  // the time, under the potential
  const every = tMax > 60 ? 20 : 5;
  for (let t = 0; t <= tMax + 1e-6; t += every)
    named(`${t}`, TX(t), vBottom + 12 * s, 0.85, 'center', faint, 10);
  named('ms', TX(tMax) + 10 * s, vBottom + 12 * s, 0.85, 'left', faint, 10);

  // the inputs that start each spike, under it
  const inputs = [...burstAt(3), ...burstAt(28), ...burstAt(53), ...burstAt(78)].map(([t0]) => t0);
  for (const t0 of inputs) {
    if (t0 > tMax) continue;
    const x = TX(t0 + 0.8);
    arrow(
      ctx,
      x,
      VY(-93),
      x,
      VY(-80),
      TRANSMITTER,
      0.85 * a * P.apInputs * (1 - P.apSizes),
      1.8 * s,
      6 * s
    );
  }
  named(
    narrow ? 'inputs' : 'inputs from synapses',
    TX(3.8) - 8 * s,
    VY(-81),
    P.apInputs * (1 - P.apSizes) * (1 - P.apGated),
    'right',
    mix(TRANSMITTER, L.ink, 0.3),
    10.5
  );
  // the one followed — dimmed while the inputs of four sizes are shown
  line(
    trace(AP_RUN.v, VY),
    ink,
    a * (1 - 0.75 * P.apSizes) * (1 - 0.5 * P.apRefract * (1 - P.apSummary)),
    2 * s
  );
  // the first two inputs alone: short of threshold, faded away
  line(
    trace(AP_SHORT.v, VY, 0, 30),
    faint,
    0.9 * a * single * P.apThresh * (1 - P.apSizes) * (1 - P.apGated),
    1.6 * s,
    [5, 4]
  );
  named(
    narrow ? 'two inputs: no spike' : 'two inputs only: short of threshold',
    TX(6.6),
    VY(-48),
    single * P.apThresh * (1 - P.apSizes) * (1 - P.apGated),
    'left',
    faint,
    10.5
  );
  // one input of each of four sizes: all or nothing
  AP_SIZES.forEach((run, j) => {
    line(trace(run.v, VY, 0, 30), sizeColour(L, j), a * single * P.apSizes, (j ? 1.8 : 1.5) * s);
    // (its arrow as long as the input is big)
    const ax = TX(3.8) - (j - 1.5) * 5 * s;
    const tall = 3 + 3.2 * Math.sqrt([6, 10, 18, 36][j]);
    arrow(
      ctx,
      ax,
      VY(-93),
      ax,
      VY(-93 + tall),
      sizeColour(L, j),
      a * single * P.apSizes,
      1.6 * s,
      5 * s
    );
  });
  named(
    narrow ? 'too small: none' : 'too small: no spike',
    TX(7),
    VY(-60),
    single * P.apSizes,
    'left',
    mix(sizeColour(L, 0), L.ink, 0.4),
    10.5
  );
  named(
    narrow ? 'bigger: sooner' : 'bigger: the same spike, sooner',
    TX(7.4),
    VY(42),
    single * P.apSizes,
    'left',
    mix(sizeColour(L, 3), L.ink, 0.2),
    10.5
  );
  // a strong input too soon after the spike, in the refractory period: nothing
  const late = a * single * P.apRefract * (1 - P.apSummary);
  line(trace(AP_LATE.v, VY, 13.6, 30), mix(TRANSMITTER, L.ink, 0.25), late, 2 * s);
  arrow(ctx, TX(14.8), VY(-93), TX(14.8), VY(-70), TRANSMITTER, late, 2.2 * s, 7 * s);
  named(
    narrow ? 'too soon: no spike' : 'a strong input too soon: no spike',
    TX(15.6),
    VY(-60),
    P.apRefract * (1 - P.apSummary) * single,
    'left',
    mix(TRANSMITTER, L.ink, 0.3),
    10.5
  );
  named(
    narrow ? 'refractory' : 'refractory period',
    TX((refractory[0] + refractory[1]) / 2),
    vTop + 4 * s,
    P.apRefract * (1 - P.apSummary) * single,
    'center',
    faint,
    10.5
  );
  // the parts of the spike, each named as the slides come to it — and all of them, on the last
  const upNamed = single * Math.max(P.apUp * (1 - P.apPeak), P.apSummary);
  const peakNamed = single * Math.max(P.apPeak * (1 - P.apDown), P.apSummary);
  const downNamed = single * Math.max(P.apDown * (1 - P.apRefract), P.apSummary);
  named(
    narrow ? 'rise: Na^{+} in' : 'rise: sodium rushes in',
    TX(rise) - 6 * s,
    VY(-10),
    upNamed,
    'right',
    naInk
  );
  named(
    narrow
      ? `peak ${mvSigned(runAt(AP_RUN.v, peak))}`
      : `peak, ${mvSigned(runAt(AP_RUN.v, peak))}: Na^{+} channels inactivate, K^{+} channels open`,
    TX(peak) + 8 * s,
    VY(runAt(AP_RUN.v, peak)) - 2 * s,
    peakNamed,
    'left',
    ink
  );
  named(
    narrow ? 'fall: K^{+} out' : 'fall: potassium flows out',
    TX(peak + 0.9) + 8 * s,
    VY(-20),
    downNamed,
    'left',
    kInk
  );
  named(
    narrow ? 'below rest' : 'a dip below rest',
    TX(low) + 6 * s,
    VY(runAt(AP_RUN.v, low)) + 13 * s,
    downNamed,
    'left',
    kInk,
    10.5
  );
  named(
    narrow ? 'back to rest' : 'back to rest',
    TX(back),
    VY(V_REST) - 10 * s,
    single * P.apSummary,
    'left',
    faint,
    10.5
  );
  // the dot, where the run has got to
  const vc = runAt(AP_RUN.v, tc);
  ctx.globalAlpha = a * (1 - P.apSizes);
  ctx.fillStyle = rgba(L.ink, 0.9);
  ctx.beginPath();
  ctx.arc(TX(tc), VY(vc), 4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // the runaway that drives the rise: the potential up, sodium channels open, sodium in — round an ellipse wide enough
  // for the words, the arrows between them on a smaller one — lit while the potential is rising
  const loop = a * single * P.apUp * (1 - P.apPeak);
  if (loop > 0.01) {
    const lit = tc > rise - 0.4 && tc < peak + 0.1 ? 1 : 0.7;
    const [rx, ry] = [(narrow ? 66 : 118) * s, (narrow ? 36 : 46) * s];
    const [cx, cy] = [lerp(x0, x1, narrow ? 0.68 : 0.68), lerp(vTop, vBottom, 0.36)];
    const around = (angle: number, f: number): [number, number] => [
      cx + f * rx * Math.cos(angle),
      cy + f * ry * Math.sin(angle),
    ];
    const nodes: [string, string, number][] = [
      ['the potential rises', 'potential up', -Math.PI / 2],
      ['more Na^{+} channels open', 'Na^{+} open', Math.PI / 6],
      ['more Na^{+} flows in', 'Na^{+} in', (5 * Math.PI) / 6],
    ];
    for (const [wide, short, angle] of nodes)
      say(g, narrow ? short : wide, ...around(angle, 1), loop * lit, 11.5, 'center', naInk);
    // the arrows round between them, clockwise, on an ellipse inside the words
    ctx.save();
    ctx.globalAlpha = loop * lit;
    ctx.strokeStyle = rgba(IONS.Na.colour, 0.9);
    ctx.fillStyle = rgba(IONS.Na.colour, 0.9);
    ctx.lineWidth = 1.8 * s;
    for (let j = 0; j < 3; j++) {
      const [from, to] = [
        -Math.PI / 2 + (j * 2 * Math.PI) / 3 + 0.55,
        -Math.PI / 2 + ((j + 1) * 2 * Math.PI) / 3 - 0.55,
      ];
      ctx.beginPath();
      ctx.ellipse(cx, cy, 0.62 * rx, 0.62 * ry, 0, from, to);
      ctx.stroke();
      // its head, along the ellipse at its end
      const [hx, hy] = around(to, 0.62);
      const [tx, ty] = [-0.62 * rx * Math.sin(to), 0.62 * ry * Math.cos(to)];
      const len = Math.hypot(tx, ty);
      const [ux, uy] = [tx / len, ty / len];
      ctx.beginPath();
      ctx.moveTo(hx + 6 * s * ux, hy + 6 * s * uy);
      ctx.lineTo(hx - 3 * s * ux - 4 * s * uy, hy - 3 * s * uy + 4 * s * ux);
      ctx.lineTo(hx - 3 * s * ux + 4 * s * uy, hy - 3 * s * uy - 4 * s * ux);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    say(
      g,
      narrow ? 'a runaway' : 'a runaway: each makes the next',
      cx,
      cy + ry + 24 * s,
      loop,
      10.5,
      'center',
      faint
    );
  }

  // under it, from the slide about the channels: sodium's and potassium's conductances
  const gs = a * P.apGated;
  if (gs > 0.01) {
    const GY = (v: number) => lerp(gBottom, gTop + 6 * s, v / AP_MOST.Na);
    named(
      narrow ? 'conductance' : 'how open each kind of channel is: its conductance',
      x0,
      gTop - 10 * s,
      P.apGated,
      'left',
      ink
    );
    line(
      [
        [x0, GY(0)],
        [x1, GY(0)],
      ],
      faint,
      0.8 * gs,
      1
    );
    line(trace(AP_RUN.na, GY), IONS.Na.colour, gs, 2 * s);
    line(trace(AP_RUN.k, GY), IONS.K.colour, gs, 2 * s);
    const kPeak = AP_RUN.k.slice(0, 300).indexOf(Math.max(...AP_RUN.k.slice(0, 300))) / 10;
    named(
      'sodium',
      TX(peak) - 6 * s,
      GY(AP_MOST.Na * 0.82),
      single * P.apGated,
      'right',
      naInk,
      10.5
    );
    named(
      'potassium',
      TX(kPeak) + 8 * s,
      GY(runAt(AP_RUN.k, kPeak)) - 6 * s,
      single * P.apGated,
      'left',
      kInk,
      10.5
    );
    // the dot's time, across both plots
    line(
      [
        [TX(tc), vTop],
        [TX(tc), gBottom],
      ],
      faint,
      0.35 * gs,
      1
    );

    // and a strip of membrane, its channels following the dot: four sodium channels and four potassium channels — two of
    // each on a narrow screen — as many open as the conductance says, sodium's plugged as they inactivate, and ions
    // through those open; each as big as the strip and the room between them allow
    const count = narrow ? 4 : 8;
    const k = Math.min((sBottom - sTop) / 64, (x1 - x0 - 52 * s) / count / 46);
    const ym = (sTop + sBottom) / 2;
    const xs = Array.from({ length: count }, (_, j) =>
      lerp(x0 + 26 * s, x1 - 26 * s, (j + 0.5) / count)
    );
    const heads = new Path2D();
    for (let x = x0 - 30 * s; x < x1 + 8 * s; x += 9 * k) {
      if (xs.some((cx) => Math.abs(cx - x) < 17 * k)) continue;
      for (const side of [-1, 1]) {
        heads.moveTo(x + 3.6 * k, ym + side * 10 * k);
        heads.arc(x, ym + side * 10 * k, 3.6 * k, 0, Math.PI * 2);
      }
    }
    ctx.globalAlpha = gs;
    ctx.fillStyle = rgba(headOf(L), 0.95);
    ctx.fill(heads);
    ctx.globalAlpha = 1;
    named('outside', left, ym - 22 * k, 0.75 * P.apGated, 'left', faint, 10.5);
    named('inside', left, ym + 22 * k, 0.75 * P.apGated, 'left', faint, 10.5);
    const stateAt = (t: number, sodium: boolean, q: number) => {
      const th = (q + 0.5) / 4;
      const share = sodium ? runAt(AP_RUN.na, t) / AP_MOST.Na : runAt(AP_RUN.k, t) / AP_MOST.K;
      const open = smooth(clamp01((share - th) * 6 + 0.5));
      const plugged = sodium
        ? (1 - open) * smooth(clamp01((1 - runAt(AP_RUN.h, t) / HH_REST.h - th) * 6 + 0.5))
        : 0;
      return { open, plugged };
    };
    xs.forEach((cx, j) => {
      const sodium = j % 2 === 0;
      // (its place among its kind, as a share of four, whatever the count)
      const q = (Math.floor(j / 2) * 4) / (count / 2);
      const { open, plugged } = stateAt(tc, sodium, q);
      const colour = sodium ? IONS.Na.colour : IONS.K.colour;
      // the ions through it while it is open: sodium down and in, potassium up and out
      for (let e = Math.floor((tc - 0.9) / 0.3); e <= Math.floor(tc / 0.3); e++) {
        const t0 = e * 0.3;
        if (t0 < 0 || stateAt(t0, sodium, q).open < 0.5) continue;
        const p = (tc - t0) / 0.9;
        if (p < 0 || p > 1) continue;
        const yy = ym + (sodium ? 1 : -1) * lerp(-30, 30, p) * k;
        disc(g, cx, yy, 3.2 * k, colour, 1, gs * Math.min(1, 5 * p, 5 * (1 - p)));
      }
      // the channel, at the strip's scale: two halves round the pore, apart as far as it is open
      ctx.globalAlpha = gs;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.roundRect(cx + side * (7 + 4 * open) * k - 6 * k, ym - 19 * k, 12 * k, 38 * k, 5 * k);
        ctx.fillStyle = rgba(mix(L.page, L.ink, 0.22), 0.98);
        ctx.fill();
        ctx.strokeStyle = rgba(colour, 0.85);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // sodium's second gate: hanging below, or swung up into the pore while inactivated
      if (sodium) {
        const [bx, by] = [lerp(cx - 8 * k, cx, plugged), lerp(ym + 30 * k, ym + 21 * k, plugged)];
        ctx.globalAlpha = gs;
        ctx.strokeStyle = rgba(mix(IONS.Na.colour, L.ink, 0.35), 0.8);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - 9 * k, ym + 19 * k);
        ctx.quadraticCurveTo(cx - 13 * k, ym + 26 * k, bx, by);
        ctx.stroke();
        ctx.fillStyle = rgba(mix(IONS.Na.colour, L.ink, 0.35), 1);
        ctx.beginPath();
        ctx.arc(bx, by, 3.8 * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
  }

  // the words at the foot, as each slide comes to them
  for (const [wide, short, alpha] of [
    ['spikes: brief pulses in the membrane potential, again and again', 'spikes', 1 - P.apZoom],
    [
      `close in: a rise of over 100 mV and a fall back, within a few ms — from Hodgkin and Huxley's model`,
      'one spike, close in',
      P.apZoom * (1 - P.apInputs),
    ],
    [
      'each input from a synapse lifts the potential a little, and fades',
      'inputs: a little each',
      P.apInputs * (1 - P.apThresh),
    ],
    [
      `past the threshold, about ${mvSigned(THRESHOLD)}, a spike fires; short of it, the inputs fade away`,
      'past threshold: a spike',
      P.apThresh * (1 - P.apSizes) * (1 - P.apGated),
    ],
    [
      'all or nothing: a bigger input fires the same spike, only sooner',
      'all or nothing',
      P.apSizes,
    ],
    [
      'the conductances, and the channels: as many open as the conductance says',
      'the channels behind it',
      P.apGated * (1 - P.apUp),
    ],
    [
      'the rise: sodium channels open, sodium flows in, the potential rises, more open — a runaway',
      'a runaway rise',
      P.apUp * (1 - P.apPeak),
    ],
    [
      'the peak: the sodium channels inactivate and the slower potassium channels open',
      'peak: Na^{+} shut, K^{+} open',
      P.apPeak * (1 - P.apDown),
    ],
    [
      'the fall: potassium flows out, the potential dips below rest, and the potassium channels shut again',
      'the fall: K^{+} out',
      P.apDown * (1 - P.apRefract) * (1 - P.apSummary),
    ],
    [
      'the refractory period: the sodium channels still plugged, even a strong input fires nothing',
      'refractory: nothing fires',
      P.apRefract * (1 - P.apSummary),
    ],
    [
      'the action potential: up as sodium flows in, down as potassium flows out',
      'up: Na^{+} in; down: K^{+} out',
      P.apSummary,
    ],
  ] as [string, string, number][])
    footNote(g, narrow ? short : wide, a * alpha);
}

/**
 * The membrane potential through the action potential's round, on a plot across the foot of the figure, from −90 to
 * +40 mV, slowed far down and not to scale: three inputs from synapses, summing to threshold; the spike, up as sodium
 * channels open and down past rest as they shut and potassium channels open; and a dot where the round has got to.
 */
function drawSpike(g: G, P: Pose, narrow: boolean, lt: number) {
  const { ctx, w, h, L, u } = g;
  const a = P.ap;
  const s = Math.max(u, 0.85);
  const [left, right] = [14, w - 14];
  const top = h - 36 * u - 96 * s;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(left, top, right - left, 92 * s, 10 * s);
  ctx.fillStyle = rgba(L.page, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.12);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const [x0, x1] = [left + 20 * s, right - (narrow ? 20 : 200) * s];
  const [base, peak] = [top + 76 * s, top + 14 * s];
  const X = (ms: number) => lerp(x0, x1, ms / AP_MS);
  const Y = (v: number) => lerp(base, peak, (v + 90) / 130);
  // the threshold, dashed across
  const thresh = a * P.thresh;
  if (thresh > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.6 * thresh;
    ctx.strokeStyle = rgba(L.ink, 1);
    ctx.lineWidth = 1;
    ctx.setLineDash([4 * s, 4 * s]);
    ctx.beginPath();
    ctx.moveTo(x0, Y(THRESHOLD));
    ctx.lineTo(x1, Y(THRESHOLD));
    ctx.stroke();
    ctx.restore();
  }
  // the potential through the round, and a dot where it has got to
  const colour = mix(FIELD, L.ink, 0.45);
  ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(colour, 1);
  ctx.lineWidth = 2 * s;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 300; i++) {
    const ms = (i / 300) * AP_MS;
    if (i) ctx.lineTo(X(ms), Y(keyed(AP_V, ms)));
    else ctx.moveTo(X(ms), Y(keyed(AP_V, ms)));
  }
  ctx.stroke();
  ctx.fillStyle = rgba(L.ink, 0.85);
  ctx.beginPath();
  ctx.arc(X(lt), Y(keyed(AP_V, lt)), 4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // the inputs, an arrow up to each
  const inputs = a * P.inputs;
  if (inputs > 0.01)
    for (const t0 of AP_INPUTS)
      arrow(
        ctx,
        X(t0),
        base + 12 * s,
        X(t0),
        Y(keyed(AP_V, t0)) + 4 * s,
        TRANSMITTER,
        0.8 * inputs,
        1.4,
        5 * s
      );
  say(
    g,
    narrow ? 'inputs' : 'inputs from synapses',
    X(AP_INPUTS[0]) - 8 * s,
    base + 6 * s,
    inputs,
    11,
    'right',
    mix(TRANSMITTER, L.ink, 0.3)
  );
  // and what each part is
  if (narrow) say(g, 'threshold', x0 + 4 * s, Y(THRESHOLD) - 7 * s, thresh, 11, 'left');
  else say(g, `threshold, about ${mV(THRESHOLD)}`, x1 + 8 * s, Y(THRESHOLD), thresh, 11, 'left');
  say(
    g,
    narrow ? 'Na^{+} in' : 'Na^{+} rushes in',
    X(2250) - 6 * s,
    Y(-10),
    a * P.upstroke,
    11,
    'right',
    IONS.Na.colour
  );
  say(
    g,
    narrow ? 'K^{+} out' : 'K^{+} flows out',
    X(2640) + 6 * s,
    Y(-25),
    a * P.downstroke,
    11,
    'left',
    IONS.K.colour
  );
  say(
    g,
    narrow ? 'spike: ~1 ms' : 'the action potential: about 1 ms, 100 mV',
    X(AP_PEAK) + 24 * s,
    Y(30),
    a * P.spikeNamed,
    11.5,
    'left',
    colour
  );
}

/** The lowest membrane potential the potentials' line shows, mV; it runs from there up to 0. */
const LOWEST = -120;

/**
 * The potentials, on a plate in the figure's top right corner, where the ions' key once was: potassium's equilibrium
 * potential named, with a tick in potassium's colour, and its value; then the membrane potential, with a marker, and
 * both marked on a line from −120 mV to 0 — and E_K's name in potassium's colour where it is shown to be its own.
 */
function drawPotentials(g: G, P: Pose, narrow: boolean, top: number) {
  const { ctx, w, L, u } = g;
  const size = 12.5 * g.ts;
  const eName = narrow ? 'E_{K}' : 'equilibrium (reversal) potential, E_{K}';
  const eValue = `: ${mV(E_K)}`;
  const vName = narrow ? 'membrane' : 'membrane potential';
  // as wide as its words, at their widest, so that it does not twitch as the membrane potential changes
  const mark = 18 * u;
  const eWidth = mathWidth(ctx, eName, size) + P.valued * mathWidth(ctx, eValue, size);
  const vWidth = mathWidth(ctx, `${vName}: −120 mV`, size);
  const inner = Math.max(eWidth, P.meter * Math.max(vWidth, 150 * u));
  const row = 22 * u;
  const lineRow = 34 * u;
  const width = mark + inner + 22 * u;
  const height = row * (1 + P.meter) + lineRow * P.meter + 10 * u;
  const left = w - 14 - width;
  ctx.globalAlpha = P.plate;
  ctx.beginPath();
  ctx.roundRect(left, top, width, height, 8 * u);
  ctx.fillStyle = rgba(L.page, 0.92);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.12);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const x = left + 11 * u;
  // E_K: its tick, its name and its value
  const ey = top + 5 * u + row / 2;
  const tick = (at: number, from: number, to: number, a: number) => {
    ctx.globalAlpha = a;
    ctx.strokeStyle = rgba(IONS.K.colour, 1);
    ctx.lineWidth = 3 * u;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(at, from);
    ctx.lineTo(at, to);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  tick(x + 4 * u, ey - 6 * u, ey + 6 * u, P.plate);
  const eColour = mix(L.ink, IONS.K.colour, P.own);
  say(g, eName, x + mark, ey, P.plate, 12.5, 'left', eColour);
  say(
    g,
    eValue,
    x + mark + mathWidth(ctx, eName, size),
    ey,
    P.plate * P.valued,
    12.5,
    'left',
    eColour
  );
  if (P.meter < 0.01) return;
  // the membrane potential: its marker, a triangle pointing down onto the line, and its name and value
  const a = P.plate * P.meter;
  const vy = ey + row;
  const marker = (at: number, my: number, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = rgba(L.ink, 0.85);
    ctx.beginPath();
    ctx.moveTo(at, my + 5 * u);
    ctx.lineTo(at - 5 * u, my - 4 * u);
    ctx.lineTo(at + 5 * u, my - 4 * u);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  };
  marker(x + 4 * u, vy, a);
  say(g, `${vName}: ${mV(P.vm)}`, x + mark, vy, a, 12.5, 'left');
  // the line, −120 mV to 0, a tick every 30 mV; E_K marked across it, and the membrane potential above it
  const ly = vy + row / 2 + 12 * u;
  const [lx0, lx1] = [x + 4 * u, left + width - 16 * u];
  const at = (v: number) => lerp(lx0, lx1, clamp01((v - LOWEST) / -LOWEST));
  ctx.globalAlpha = 0.5 * a;
  ctx.strokeStyle = rgba(L.ink, 1);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(lx0, ly);
  ctx.lineTo(lx1, ly);
  for (let v = LOWEST; v <= 0; v += 30) {
    ctx.moveTo(at(v), ly - 3 * u);
    ctx.lineTo(at(v), ly + 3 * u);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  // (the low end without its unit, which E_K's tick would cross on a narrow screen)
  say(g, `−${-LOWEST}`, lx0, ly + 13 * u, 0.7 * a, 11, 'left');
  say(g, '0 mV', lx1, ly + 13 * u, 0.7 * a, 11, 'right');
  tick(at(E_K), ly - 7 * u, ly + 7 * u, a);
  marker(at(P.vm), ly - 9 * u, a);
}

/** The ions' key, the positive ones above the negative, on a plate: in the middle of the figure, a little larger, as
 * the slide that brings the ions opens; in its top right corner once they are there. */
/** Water's blues: the oxygen deeper, the hydrogens paler. */
const OXYGEN: RGB = [64, 150, 255];
const HYDROGEN: RGB = [186, 224, 255];

/**
 * Water filling both sides of the membrane: many H₂O molecules, each an oxygen with two hydrogens
 * at its bent angle, tumbling slowly where they are; and one named, neutral.
 */
function drawWater(
  g: G,
  y: number,
  x0: number,
  x1: number,
  face: number,
  a: number,
  narrow: boolean
) {
  const { ctx, u, L } = g;
  const rand = mulberry32(2207);
  const count = narrow ? 34 : 64;
  const o = 5.2 * u;
  const hr = 3.1 * u;
  const bond = 6.2 * u;
  // the molecule's two hydrogens, 104.5° apart
  const half = (104.5 / 2) * (Math.PI / 180);
  let named: [number, number] | null = null;
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const along = x0 + 14 * u + rand() * (x1 - x0 - 28 * u);
    const depth = face + (12 + rand() * 96) * u;
    const p = rand() * 6.28;
    const q = rand() * 6.28;
    const cx = along + drift(g.now, p, q, 8 * u);
    const cy = y + side * depth + drift(g.now, q, p, 5 * u);
    const turn = p + g.now / (2600 + 900 * q);
    // each comes in a moment after the one before, so the water fills in rather than appearing
    const shown = clamp01(a * 1.6 - (i / count) * 0.6);
    if (shown < 0.01) continue;
    ctx.globalAlpha = shown;
    for (const s of [-1, 1]) {
      const hx = cx + Math.cos(turn + s * half) * bond;
      const hy = cy + Math.sin(turn + s * half) * bond;
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, Math.PI * 2);
      ctx.fillStyle = rgba(HYDROGEN, 1);
      ctx.fill();
      ctx.lineWidth = 0.8 * u;
      ctx.strokeStyle = rgba(L.ink, 0.35);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, o, 0, Math.PI * 2);
    ctx.fillStyle = rgba(OXYGEN, 1);
    ctx.fill();
    ctx.strokeStyle = rgba(mix(OXYGEN, L.ink, 0.4), 0.8);
    ctx.stroke();
    // the first outside one in the left third is the one named
    if (!named && side < 0 && along < x0 + (x1 - x0) / 3) named = [cx, cy];
  }
  ctx.globalAlpha = 1;
  if (named) {
    const [nx, ny] = named;
    say(g, 'H₂O: water, no overall charge', nx + 14 * u, ny - 10 * u, 0.85 * a, 12.5);
  }
}

function drawKey(g: G, a: number, narrow: boolean, focus: number, dock: number) {
  const { ctx, w, h, L } = g;
  const scale = lerp(1.2, 1, dock);
  const u = g.u * scale;
  const size = 12.5 * g.ts * scale;
  const rows: [string, [Kind, string][]][] = [
    [
      'positive ions:',
      [
        ['Na', `${IONS.Na.name} sodium`],
        ['K', `${IONS.K.name} potassium`],
      ],
    ],
    [
      'negative ions:',
      [
        ['Cl', `${IONS.Cl.name} chloride`],
        ['A', narrow ? 'large molecules' : 'proteins and other large molecules'],
      ],
    ],
  ];
  ctx.font = `italic ${size}px ${SERIF}`;
  const title = Math.max(...rows.map(([name]) => ctx.measureText(name).width));
  const gap = 16 * u;
  const lengthOf = (items: [Kind, string][]) =>
    items.reduce((s, [, name]) => s + 20 * u + mathWidth(ctx, name, size) + gap, 0) - gap;
  const width = title + 10 * u + Math.max(...rows.map(([, items]) => lengthOf(items)));
  const row = 22 * u;
  const left = lerp((w - width) / 2, w - 14 - width, dock);
  // in the middle, a little above the membrane's line rather than across it; docked, at the very top
  const top = lerp(h / 2 - 10 * g.u - row - 36 * g.u, 10, dock);
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(left - 10 * u, top - 4 * u, width + 20 * u, 2 * row + 8 * u, 8 * u);
  ctx.fillStyle = rgba(L.page, 0.92);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.12);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
  rows.forEach(([name, items], k) => {
    const yy = top + row * (k + 0.5);
    mathWords(ctx, name, left + title, yy, L.ink, 0.7 * a, size, 'right', L.page);
    let x = left + title + 10 * u;
    for (const [kind, label] of items) {
      // greyed, but for potassium, once the slides turn to it
      const shown = a * (kind === 'K' ? 1 : lerp(1, 0.5, focus));
      const colour = colourOf(kind, focus);
      disc(g, x + 8 * u, yy, (kind === 'A' ? 9.5 : 7) * u, colour, SIGN[kind], shown);
      mathWords(ctx, label, x + 20 * u, yy, colour, shown, size, 'left', L.page);
      x += 20 * u + mathWidth(ctx, label, size) + gap;
    }
  });
}

/* ------------------------------------------------------------------------------------------------------- the synapse */

/** The last slides' colours: the other neuron's, a spike's, and the transmitter's and its receptors'. This neuron keeps
 * the page's grey, as its membrane had. */
const PRE: RGB = [59, 130, 246];
const SPIKE: RGB = [234, 179, 8];
const TRANSMITTER: RGB = [22, 163, 74];
/** One round of the synapse at work, ms by the page's clock — a spike running down the axon, arriving, a vesicle
 * emptying, the transmitter crossing and binding, the receptors opening and ions passing, and all of it undone — and
 * when in it the spike arrives. */
const SYN_MS = 5000;
const ARRIVES = 1600;
/** The receptors in the dendrite's upper membrane, under the cleft: how far along it from the cleft's middle, in q. */
const RECEPTORS = [-3.6, 0, 3.6];
/** This neuron's dendrite: how far its membrane is either side of its line, in q, at its left end and at its body. */
const DENDRITE = [3.4, 4.6];
/** The terminal's vesicles, in q from the cleft's middle; the one docked at the membrane last. */
const SYN_VESICLES: [number, number][] = [
  [-5.6, -5.8],
  [-2.6, -8],
  [0.8, -7.2],
  [3.8, -8],
  [6, -5],
  [-4, -3.6],
  [2.8, -4.2],
  [0, -3.1],
];
/** 0 outside `from` to `to`, rising and falling over `edge` at either end. */
const bump = (t: number, from: number, to: number, edge: number) =>
  smooth((t - from) / edge) * (1 - smooth((t - (to - edge)) / edge));
/** A point `t` of the way along a cubic curve through four points. */
const bezier = (p: [number, number][], t: number): [number, number] => {
  const m = 1 - t;
  const k = [m * m * m, 3 * m * m * t, 3 * m * t * t, t * t * t];
  return [
    k.reduce((sum, c, i) => sum + c * p[i][0], 0),
    k.reduce((sum, c, i) => sum + c * p[i][1], 0),
  ];
};

/**
 * Where the two neurons sit, from the figure's size: q, the synapse's scale; C, the middle of the cleft between them;
 * the other neuron's body; this one's; its dendrite's line, its left end, and how far its membrane is either side of
 * that line along it — its upper membrane, where the synapse is, 2q under the cleft's middle: the synapse is on its
 * shaft; and the axon's course — out of the one body, across, and down into the terminal from straight above.
 */
function synapseSite(w: number, h: number, u: number) {
  // (from afar, the neurons as large as the figure has room for; close in, the same synapse whatever this is)
  const q = 1.8 * Math.max(u, 0.75);
  const C: [number, number] = [0.56 * w, 0.5 * h];
  const pre: [number, number] = [0.13 * w, 0.24 * h];
  const [left, body] = [0.22 * w, 0.9 * w];
  const half = (x: number) =>
    lerp(DENDRITE[0], DENDRITE[1], clamp01((x - left) / (body - left))) * q;
  const shaft = C[1] + 2 * q + half(C[0]);
  const axon: [number, number][] = [
    [pre[0] + 11 * q, pre[1] + 5 * q],
    [pre[0] + 0.24 * w, pre[1] - 10 * q],
    [C[0] - 1.8 * q, C[1] - 70 * q],
    [C[0] - 1.8 * q, C[1] - 13.6 * q],
  ];
  return { q, C, pre, post: [body, shaft + 4 * q] as [number, number], shaft, left, half, axon };
}

/**
 * Two neurons and the excitatory synapse between them. Another neuron, upper left, in blue, its axon running across
 * and down to this neuron's dendrite, right on its shaft, the dendrite running to its body at the right; a spike, a
 * glow, running down the axon to the synapse. Then the view dives in on it, as far as fills the figure: the other
 * neuron's terminal, full of vesicles of transmitter; the narrow cleft; and the dendrite's shaft, with receptors in its
 * membrane. Then, again and again, a spike arriving, a vesicle emptying, the transmitter crossing the cleft and binding
 * to the receptors; and, bound, their channels opening — sodium ions flowing through into the dendrite, a chloride ion
 * turned away.
 */
function drawSynapse(g: G, P: Pose, narrow: boolean) {
  const { ctx, w, h, L, u } = g;
  const a = P.scene;
  const { q, C, pre, post, shaft, left, half, axon } = synapseSite(w, h, u);
  // the camera: from the whole of both neurons, diving in on the synapse, as far as fills the figure's height with it
  // from the axon arriving to the dendrite, the cleft a little above the middle
  // — on the slides about its receptors and the charge they let in, closer still, on the cleft and the dendrite under
  // it, as far as leaves room for the names either side
  // — and, on the slide about the two currents cancelling, backing out a little and up, to make room below
  const qz = Math.min(10, (h - 24) / 34);
  const full = qz / q;
  const dived = full ** P.dive;
  const e = (dived - 1) / (full - 1);
  const onCleft = Math.max(1, Math.min(2.2, w / 44 / qz)) ** P.onCleft;
  const Z = dived * full ** (-0.24 * P.room) * onCleft;
  // — and, on the slides about the charge it lets in, sliding down onto the dendrite
  const [ox, oy] = [
    lerp(C[0], w / 2, e),
    lerp(
      C[1],
      h / 2 - (2.6 + 3.8 * P.low + 0.8 * P.onCleft * (1 - P.low)) * q * Z - 0.19 * h * P.room,
      e
    ),
  ];
  const seen = (x: number, y: number): [number, number] => [
    ox + Z * (x - C[0]),
    oy + Z * (y - C[1]),
  ];
  // what is too small to see from afar comes in as the view closes in
  const near = smooth(clamp01((P.dive - 0.45) / 0.4));
  const tc = cycle(g.now, SYN_MS) * SYN_MS;
  // a line a pixel and a bit wide, however close in
  const hair = 1.2 / Z;
  const thisFill = rgba(mix(L.page, L.ink, 0.08), 1);
  const thisEdge = rgba(L.ink, 0.42);
  const preFill = rgba(mix(L.page, PRE, 0.2), 1);
  const preEdge = rgba(mix(PRE, L.ink, 0.35), 0.85);
  // where each receptor sits in the dendrite's upper membrane, under the cleft, and which way it faces — straight up
  const receptors = RECEPTORS.map((dx) => ({
    x: C[0] + dx * q,
    y: shaft - half(C[0] + dx * q),
    turn: 0,
  }));
  const top = shaft - half(C[0]);
  // where a point given in a receptor's own frame is — q along its face, and q in (out, to the cleft, is negative)
  const onReceptor = (i: number, along: number, inward: number): [number, number] => {
    const { x, y, turn } = receptors[i];
    const [c, s] = [Math.cos(turn), Math.sin(turn)];
    return [x + (along * c - inward * s) * q, y + (along * s + inward * c) * q];
  };
  // (desensitized, they close early, the glutamate still bound)
  const opened = P.opening * bump(tc, ARRIVES + 850, lerp(4400, 3400, P.desens), 220);
  const desensitized = P.desens * bump(tc, 3300, 4600, 220);
  const gap = (0.2 + 0.75 * opened) * q;
  const fused = P.release * bump(tc, ARRIVES + 60, 4900, 220);
  const bound = P.bind * bump(tc, ARRIVES + 650, 4600, 220);

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(Z, Z);
  ctx.translate(-C[0], -C[1]);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const shape = (path: Path2D | null, fill: string, edge: string, alpha = a) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.strokeStyle = edge;
    ctx.lineWidth = hair;
    if (path) {
      ctx.fill(path);
      ctx.stroke(path);
    } else {
      ctx.fill();
      ctx.stroke();
    }
  };
  // a branch, wide where it leaves a body and thinning to its tip
  const branch = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    w0: number,
    w1: number,
    fill: string,
    edge: string,
    alpha = a
  ) => {
    const d = Math.hypot(x1 - x0, y1 - y0) || 1;
    const [nx, ny] = [-(y1 - y0) / d, (x1 - x0) / d];
    ctx.beginPath();
    ctx.moveTo(x0 + (nx * w0) / 2, y0 + (ny * w0) / 2);
    ctx.lineTo(x1 + (nx * w1) / 2, y1 + (ny * w1) / 2);
    ctx.lineTo(x1 - (nx * w1) / 2, y1 - (ny * w1) / 2);
    ctx.lineTo(x0 - (nx * w0) / 2, y0 - (ny * w0) / 2);
    ctx.closePath();
    shape(null, fill, edge, alpha);
  };

  // this neuron: its dendrite along the figure, the synapse on its shaft, thinning to its left end; its body at the
  // right, an apical dendrite going up from it
  ctx.beginPath();
  ctx.moveTo(left, shaft - half(left));
  ctx.lineTo(post[0], shaft - half(post[0]));
  ctx.lineTo(post[0], shaft + half(post[0]));
  ctx.lineTo(left, shaft + half(left));
  ctx.arc(left, shaft, half(left), Math.PI / 2, (3 * Math.PI) / 2);
  ctx.closePath();
  shape(null, thisFill, thisEdge);
  branch(
    post[0] - 1 * q,
    post[1] - 10 * q,
    post[0] - 6 * q,
    post[1] - 58 * q,
    3.4 * q,
    0.8 * q,
    thisFill,
    thisEdge
  );
  branch(
    post[0] + 6 * q,
    post[1] + 8 * q,
    post[0] + 26 * q,
    post[1] + 26 * q,
    2.4 * q,
    0.6 * q,
    thisFill,
    thisEdge
  );
  ctx.beginPath();
  ctx.moveTo(post[0] - 12 * q, post[1] + 8 * q);
  ctx.quadraticCurveTo(post[0], post[1] + 13 * q, post[0] + 12 * q, post[1] + 8 * q);
  ctx.quadraticCurveTo(post[0] + 9 * q, post[1] - 4 * q, post[0] + 1.5 * q, post[1] - 14 * q);
  ctx.lineTo(post[0] - 1.5 * q, post[1] - 14 * q);
  ctx.quadraticCurveTo(post[0] - 9 * q, post[1] - 4 * q, post[0] - 12 * q, post[1] + 8 * q);
  ctx.closePath();
  shape(null, thisFill, thisEdge);

  // the other neuron, once it comes in: its dendrites, its body, and its axon, a tube, across and down into the terminal
  const other = a * P.other;
  for (const [turn, len] of [
    [200, 26],
    [150, 22],
    [245, 20],
    [110, 24],
    [290, 18],
  ] as [number, number][]) {
    const th = (turn * Math.PI) / 180;
    const [dx, dy] = [Math.cos(th), Math.sin(th)];
    branch(
      pre[0] + dx * 9 * q,
      pre[1] + dy * 9 * q,
      pre[0] + dx * len * q,
      pre[1] + dy * len * q,
      2.6 * q,
      0.5 * q,
      preFill,
      preEdge,
      other
    );
  }
  const course = Array.from({ length: 49 }, (_, i) => bezier(axon, i / 48));
  ctx.globalAlpha = other;
  for (const [width, colour] of [
    [2 * q + 2 * hair, preEdge],
    [2 * q, preFill],
  ] as [number, string][]) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(...course[0]);
    for (const [x, y] of course.slice(1)) ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(pre[0], pre[1], 11 * q, 0, Math.PI * 2);
  shape(null, preFill, preEdge, other);
  // the terminal: a swelling at the axon's end, its membrane flat against the cleft
  const at = (dx: number, dy: number): [number, number] => [C[0] + dx * q, C[1] + dy * q];
  const terminal = new Path2D();
  terminal.moveTo(...at(-5.8, -1.6));
  terminal.lineTo(...at(5.8, -1.6));
  terminal.bezierCurveTo(...at(8.2, -1.6), ...at(9, -3.8), ...at(9, -5.8));
  terminal.bezierCurveTo(...at(9, -8.6), ...at(5.4, -10.2), ...at(0.4, -10.6));
  terminal.bezierCurveTo(...at(-0.6, -11.8), ...at(-0.8, -13), ...at(-0.8, -14.2));
  terminal.lineTo(...at(-2.8, -14.2));
  terminal.bezierCurveTo(...at(-2.8, -13), ...at(-3.2, -11.6), ...at(-4.4, -10.4));
  terminal.bezierCurveTo(...at(-7.2, -9.6), ...at(-9, -8), ...at(-9, -5.8));
  terminal.bezierCurveTo(...at(-9, -3.8), ...at(-8.2, -1.6), ...at(-5.8, -1.6));
  terminal.closePath();
  shape(terminal, rgba(mix(L.page, PRE, 0.14), 1), preEdge, other);

  if (near > 0.01) {
    // its vesicles, each full of transmitter — the docked one gone while it empties, its membrane open to the cleft
    SYN_VESICLES.forEach(([dx, dy], i) => {
      const docked = i === SYN_VESICLES.length - 1;
      const shown = other * near * (docked ? 1 - fused : 1);
      if (shown < 0.01) return;
      const [vx, vy] = at(dx, dy);
      ctx.globalAlpha = shown;
      ctx.beginPath();
      ctx.arc(vx, vy, 1.15 * q, 0, Math.PI * 2);
      ctx.fillStyle = rgba(mix(L.page, TRANSMITTER, 0.12), 1);
      ctx.fill();
      ctx.strokeStyle = rgba(L.ink, 0.45);
      ctx.lineWidth = hair;
      ctx.stroke();
      ctx.fillStyle = rgba(TRANSMITTER, 0.85);
      for (let k = 0; k < 4; k++) {
        const th = (k * Math.PI) / 2 + 0.5 + i;
        ctx.beginPath();
        ctx.arc(vx + 0.5 * q * Math.cos(th), vy + 0.5 * q * Math.sin(th), 0.22 * q, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    if (fused > 0.01) {
      ctx.globalAlpha = other * near * fused;
      ctx.strokeStyle = rgba(L.ink, 0.45);
      ctx.lineWidth = hair;
      ctx.beginPath();
      ctx.arc(C[0], C[1] - 1.6 * q, 1.1 * q, Math.PI, 0);
      ctx.stroke();
    }
    // the receptors, set in the dendrite's membrane: each two halves round a pore, apart when open, and two pockets on
    // its outer end where the transmitter binds — or, before the synapse comes in, the middle one alone, an ion channel
    // edged in the colour of sodium, which it lets through
    const tint = mix(IONS.Na.colour, TRANSMITTER, P.other);
    receptors.forEach(({ x, y, turn }, i) => {
      const own = a * near * (i === 1 ? 1 : P.other);
      if (own < 0.01) return;
      // (greyed while desensitized: shut, though glutamate is bound)
      const edge = rgba(mix(tint, GREY, 0.85 * desensitized), 0.85);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(turn);
      // on the slide about their channels, the pore lit as it opens
      const lit = own * opened * (1 - P.inflow);
      if (lit > 0.01) {
        const glow = ctx.createLinearGradient(0, -2.2 * q, 0, 2 * q);
        glow.addColorStop(0, rgba(tint, 0));
        glow.addColorStop(0.5, rgba(tint, 0.45 * lit));
        glow.addColorStop(1, rgba(tint, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = glow;
        ctx.fillRect(-gap / 2, -2.2 * q, gap, 4.2 * q);
      }
      for (const side of [-1, 1]) {
        ctx.globalAlpha = own;
        ctx.beginPath();
        ctx.roundRect(
          side > 0 ? gap / 2 : -gap / 2 - 1.1 * q,
          -1.9 * q,
          1.1 * q,
          3.4 * q,
          0.45 * q
        );
        ctx.fillStyle = rgba(mix(L.page, L.ink, 0.22), 1);
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = hair;
        ctx.stroke();
        ctx.globalAlpha = own * P.other;
        ctx.beginPath();
        ctx.arc(side * (gap / 2 + 0.55 * q), -2.05 * q, 0.34 * q, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(TRANSMITTER, 0.7);
        ctx.stroke();
      }
      ctx.restore();
    });
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // the transmitter: out of the emptied vesicle into the cleft — once they bind, two molecules to each receptor's
  // pockets, to stay bound a while, the rest wandering the cleft and gone
  if (P.release * near > 0.01)
    for (let j = 0; j < 18; j++) {
      const rnd = mulberry32(211 + 17 * j);
      const [r1, r2, r3] = [rnd(), rnd(), rnd()];
      const start = ARRIVES + 80 + 160 * r3;
      if (tc < start) continue;
      const k = smooth((tc - start) / 520);
      const ties = j < 2 * RECEPTORS.length ? P.bind : 0;
      const loose: [number, number] = [
        lerp(C[0] + (r1 - 0.5) * 15 * q, C[0] + (r1 < 0.5 ? -9.6 : 9.6) * q, P.clear),
        lerp(C[1] + (0.2 + (r2 - 0.5) * 1.8) * q, C[1] + 0.3 * q, P.clear),
      ];
      const pocket = ties
        ? onReceptor(Math.floor(j / 2), (j % 2 ? 1 : -1) * (gap / q / 2 + 0.55), -2.05)
        : loose;
      const to = [lerp(loose[0], pocket[0], ties), lerp(loose[1], pocket[1], ties)];
      const wander = (1 - ties) * (1 - P.clear);
      const x = lerp(C[0], to[0], k) + wander * drift(g.now, r1 * 6, r2 * 6, 0.5 * q);
      const y = lerp(C[1] - 1.6 * q, to[1], k) + wander * drift(g.now, r2 * 6, r3 * 6, 0.25 * q);
      // (or, taken up, gone as soon as a transporter has it)
      const gone = lerp(
        lerp(
          1 - smooth((tc - 2900 - 500 * r1) / 450),
          1 - smooth((tc - start - 560) / 200),
          P.clear
        ),
        1 - smooth((tc - 4400) / 350),
        ties
      );
      const shown = a * P.release * near * gone * Math.min(1, (tc - start) / 120);
      if (shown < 0.01) continue;
      const [sx, sy] = seen(x, y - ties * smooth((tc - 4400) / 350) * 1.2 * q);
      ctx.globalAlpha = shown;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.34 * q * Z, 0, Math.PI * 2);
      ctx.fillStyle = rgba(TRANSMITTER, 0.95);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  // bound, a glow at each receptor's pockets
  if (bound * near > 0.01)
    receptors.forEach((_, i) => {
      const [bx, by] = seen(...onReceptor(i, 0, -2.1));
      const glow = ctx.createRadialGradient(bx, by, 0, bx, by, 2.4 * q * Z);
      glow.addColorStop(0, rgba(TRANSMITTER, 0.35 * a * bound * near));
      glow.addColorStop(1, rgba(TRANSMITTER, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(bx, by, 2.4 * q * Z, 0, Math.PI * 2);
      ctx.fill();
    });
  // the receptors open: sodium ions from the cleft through their pores into the dendrite, one after another; and a
  // chloride ion running at one and turned away, a ring where it is
  if (opened * near > 0.01) {
    // which receptor the `j`th goes through
    const via = (j: number) => (P.other > 0.5 ? j % 3 : 1);
    // along a way through a receptor, in its frame: from the cleft beside it, to its mouth, through, and into the
    // dendrite — or, outward, the same way back
    const through = (i: number, s: number, side: number, out: boolean): [number, number] => {
      const steps: [number, number][] = [
        [side * 3.4, -1.3],
        [0, -1.3],
        [0, 1.8],
        [side * 1.4, 4.4],
      ];
      if (out) steps.reverse();
      const leg = Math.min(2, Math.floor(s * 3));
      const [p0, p1] = [steps[leg], steps[leg + 1]];
      const k = smooth(s * 3 - leg);
      return seen(...onReceptor(i, lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k)));
    };
    for (let j = 0; j < 6; j++) {
      const s = (tc - (ARRIVES + 950 + 180 * j)) / 1100;
      if (s < 0 || s > 1 || (P.desens > 0.5 && j > 2)) continue;
      const [ix, iy] = through(via(j), s, j % 2 ? 1 : -1, false);
      disc(
        g,
        ix,
        iy,
        0.62 * q * Z,
        IONS.Na.colour,
        1,
        a * P.inflow * near * Math.min(1, 6 * s, 5 * (1 - s))
      );
    }
    for (let j = 0; j < 5; j++) {
      const s = (tc - (ARRIVES + 1050 + 200 * j)) / 1100;
      if (s < 0 || s > 1 || P.kout < 0.01 || (P.desens > 0.5 && j > 1)) continue;
      const [ix, iy] = through(2 - (j % 2), s, j % 2 ? -1 : 1, true);
      disc(
        g,
        ix,
        iy,
        0.62 * q * Z,
        IONS.K.colour,
        1,
        a * P.kout * near * Math.min(1, 6 * s, 5 * (1 - s))
      );
    }
    const s = (tc - (ARRIVES + 1300)) / 900;
    if (s > 0 && s < 1) {
      const k = s < 0.45 ? smooth(s / 0.45) : 1 - smooth((s - 0.55) / 0.45);
      const [ix, iy] = seen(...onReceptor(1, lerp(-3.8, -0.6, k), lerp(-1.6, -1.3, k)));
      disc(
        g,
        ix,
        iy,
        0.62 * q * Z,
        IONS.Cl.colour,
        -1,
        a * P.inflow * near * Math.min(1, 6 * s, 6 * (1 - s))
      );
      if (s > 0.42 && s < 0.65) {
        const [rx, ry] = seen(...onReceptor(1, -0.5, -1.3));
        ctx.globalAlpha = 0.6 * a * P.inflow * (1 - (s - 0.42) / 0.23);
        ctx.strokeStyle = rgba(L.ink, 1);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(rx, ry, lerp(0.5, 1.6, (s - 0.42) / 0.23) * q * Z, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
  // the spike: a glow running down the axon, slowing as it nears the terminal; and the terminal's flash as it arrives
  if (P.spike > 0.01) {
    const p = 1 - (1 - clamp01(tc / ARRIVES)) ** 1.5;
    const [sx, sy] = seen(...bezier(axon, p));
    const r = Math.max(10, 3 * q * Z);
    const shown = a * P.spike * (tc < ARRIVES ? Math.min(1, tc / 200) : 0);
    for (const [x, y, radius, alpha] of [
      [sx, sy, r, shown],
      [
        ...seen(C[0], C[1] - 5.8 * q),
        11 * q * Z,
        0.8 * a * P.spike * bump(tc, ARRIVES - 80, ARRIVES + 520, 180),
      ],
    ] as [number, number, number, number][]) {
      if (alpha < 0.01) continue;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, rgba(SPIKE, 0.85 * alpha));
      glow.addColorStop(0.45, rgba(SPIKE, 0.3 * alpha));
      glow.addColorStop(1, rgba(SPIKE, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // the charge the receptors let in: under the dendrite's membrane round the synapse, above and below, negative charge
  // at rest, neutralized one place after another, the nearest first, as far as part of the way along; and over it,
  // outside, positive charge, no longer held there, drifting off — along the upper membrane either side of the
  // receptors, and along the lower; and the potential round the synapse rising, a warmth there
  const shown = a * near * P.low;
  if (shown > 0.01) {
    const glow = P.rise * 0.22;
    if (glow > 0.01) {
      const [gx, gy] = seen(C[0], shaft);
      const r = 12 * q * Z;
      const warm = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      warm.addColorStop(0, rgba(FIELD, glow * shown));
      warm.addColorStop(1, rgba(FIELD, 0));
      ctx.fillStyle = warm;
      ctx.beginPath();
      ctx.ellipse(gx, gy, r, half(C[0]) * Z, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // each place: how far along from the synapse, in q, and which membrane, the upper (−1) or the lower (1)
    const places: [number, number][] = [
      ...[6.6, 9.7, 12.8].flatMap((d): [number, number][] => [
        [-d, -1],
        [d, -1],
      ]),
      ...[0, 3.2, 6.4, 9.6, 12.8].flatMap((d): [number, number][] =>
        d
          ? [
              [-d, 1],
              [d, 1],
            ]
          : [[0, 1]]
      ),
    ];
    for (const [d, side] of places) {
      const x = C[0] + d * q;
      const edge = shaft + side * half(x);
      // (the lower membrane, further from the receptors, a little later)
      const away = clamp01(((side < 0 ? Math.abs(d) : Math.hypot(d, 8)) - 6.6) / 8.5);
      const gone = clamp01((0.75 * P.excess - away) / 0.15);
      const r = 0.42 * q * Z;
      const [ix, iy] = seen(x, edge - side * 0.75 * q);
      disc(g, ix, iy, r, NEG, -1, shown * (1 - gone));
      const [ox2, oy2] = seen(x, edge + side * (0.75 + 1.4 * gone) * q);
      disc(g, ox2, oy2, r, POS, 1, shown * (1 - gone));
    }
  }
  // the potassium ions inside — the most plentiful positive ions there: in the dendrite by the synapse, pushed away from
  // the charge collecting under the receptors, down and out; and further along, pushed along it, both ways, again and
  // again
  const inside = a * near * P.repelled;
  if (inside > 0.01) {
    const NEAR_K: [number, number][] = [
      [-5.2, 4.2],
      [-2, 5],
      [1.6, 4.4],
      [4.8, 5.2],
      [-3.4, 6.8],
      [2.8, 7],
    ];
    NEAR_K.forEach(([dx, dy], i) => {
      // away from the middle of the membrane under the receptors, as far as stays inside
      const [ux, uy] = [dx, dy - (top - C[1]) / q];
      const d = Math.hypot(ux, uy) || 1;
      const push = 1.1 * P.repelled;
      const [ix, iy] = seen(
        C[0] + (dx + (ux / d) * push) * q + drift(g.now, i, i * 2, 0.15 * q),
        C[1] + (dy + (uy / d) * push) * q
      );
      disc(g, ix, iy, 0.62 * q * Z, IONS.K.colour, 1, inside);
      const r = 0.62 * q * Z;
      arrow(
        ctx,
        ix + (ux / d) * (r + 2),
        iy + (uy / d) * (r + 2),
        ix + (ux / d) * (r + 14 * u),
        iy + (uy / d) * (r + 14 * u),
        L.ink,
        0.7 * inside * (1 - P.axial),
        1.6,
        6
      );
    });
    // in the dendrite: each a way along from the synapse, out to the left or the right, round and round
    for (let j = 0; j < 14; j++) {
      const side = j % 2 ? 1 : -1;
      const span = 40;
      const start = (j * 3.1) % span;
      const run = (start + (g.now / 1000) * 3.2 * P.axial) % span;
      const along = 7 + run;
      const fade = Math.min(1, run / 3, (span - run) / 4);
      const [ix, iy] = seen(
        C[0] + side * along * q,
        shaft + (j % 3 ? (j % 3 === 1 ? -1.8 : 1.8) : 0) * q
      );
      disc(g, ix, iy, 0.62 * q * Z, IONS.K.colour, 1, inside * fade);
      // pushing the next one along
      const r = 0.62 * q * Z;
      arrow(
        ctx,
        ix + side * (r + 2),
        iy,
        ix + side * (r + 10 * u),
        iy,
        L.ink,
        0.5 * inside * fade * P.axial,
        1.4,
        5
      );
    }
    // and, once they are, two broad arrows along it, out either way from the synapse
    if (P.axial > 0.01)
      for (const side of [-1, 1]) {
        const [x0, y0] = seen(C[0] + side * 8 * q, shaft);
        const [x1] = seen(C[0] + side * 30 * q, shaft);
        arrow(ctx, x0, y0, x1, y0, IONS.K.colour, 0.35 * a * near * P.axial, 6 * u, 18 * u);
      }
    // the charge they carry collecting on the dendrite's membrane along it, on from that round the synapse — less
    // further off — a warmth along it where the potential has risen
    const fall = (d: number) => Math.exp(-d / 20);
    const along = a * near * P.accum;
    if (along > 0.01) {
      const [gx0] = seen(C[0] - 50 * q, 0);
      const [gx1] = seen(C[0] + 50 * q, 0);
      const [, gy0] = seen(0, shaft - half(C[0]));
      const [, gy1] = seen(0, shaft + half(C[0]));
      const warm = ctx.createLinearGradient(gx0, 0, gx1, 0);
      for (const k of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1])
        warm.addColorStop(k, rgba(FIELD, 0.22 * along * fall(Math.abs(k - 0.5) * 100)));
      ctx.fillStyle = warm;
      ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
      for (let k = 0; k < 11; k++)
        for (const side of [-1, 1]) {
          const d = 16 + 3.2 * k;
          const x = C[0] + side * d * q;
          if (x < left || x > post[0]) continue;
          // as it spreads, outward
          const come = clamp01((1.3 * P.accum - k / 11) * 4);
          const shownHere = a * near * come * fall(d - 9);
          if (shownHere < 0.01) continue;
          for (const edge of [-1, 1]) {
            const [mx2, my2] = seen(x, shaft + edge * (half(x) - 0.62 * q));
            disc(g, mx2, my2, 0.36 * q * Z, POS, 1, shownHere);
          }
        }
    }
    // and potassium leaking out through channels in its lower membrane, all along it
    const leaking = a * near * P.leaks;
    if (leaking > 0.01) {
      [-17, -28, -39, 17, 28, 39].forEach((d, i) => {
        const xc = C[0] + d * q;
        if (xc < left || xc > post[0]) return;
        const [sx, sy] = seen(xc, shaft + half(xc));
        const [cw, ch, gp] = [0.9 * q * Z, 2.6 * q * Z, 0.6 * q * Z];
        ctx.globalAlpha = leaking;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.roundRect(sx + (side > 0 ? gp / 2 : -gp / 2 - cw), sy - ch / 2, cw, ch, 0.35 * q * Z);
          ctx.fillStyle = rgba(mix(L.page, L.ink, 0.22), 1);
          ctx.fill();
          ctx.strokeStyle = rgba(IONS.K.colour, 0.85);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // one out now and then, from inside, through, and away below
        const k = (g.now + 470 * i) % 2800;
        const t2 = k / 1300;
        if (t2 > 1) return;
        const e = smooth(t2);
        const [lx2, ly2] = [
          lerp(sx - 0.2 * q * Z, sx + 0.6 * q * Z, e),
          lerp(sy - 2.6 * q * Z, sy + 3.6 * q * Z, e),
        ];
        disc(
          g,
          lx2,
          ly2,
          0.62 * q * Z,
          IONS.K.colour,
          1,
          leaking * Math.min(1, 5 * t2, 4 * (1 - t2))
        );
      });
      // the potential at points along it, falling off away from the synapse, either way
      const ticked = a * near * P.ticks;
      if (ticked > 0.01)
        for (const d of narrow ? [14, 19] : [15, 30])
          for (const side of [-1, 1]) {
            const x = C[0] + side * d * q;
            const [tx, ty] = seen(x, shaft - half(x));
            ctx.globalAlpha = 0.8 * ticked;
            ctx.strokeStyle = rgba(FIELD, 1);
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(tx, ty - 1.4 * q * Z);
            ctx.lineTo(tx, ty - 0.2 * q * Z);
            ctx.stroke();
            ctx.globalAlpha = 1;
            say(
              g,
              mV(V_REST + 27 * fall(d)),
              tx,
              ty - 2.4 * q * Z,
              ticked,
              12,
              'center',
              mix(FIELD, L.ink, 0.25)
            );
          }
    }
  }
  // what each of those slides names: above the dendrite either side of the terminal, and below it
  const fresh = a * near * P.low;
  const [hl] = seen(C[0] - 10.4 * q, 0);
  const [hr] = seen(C[0] + 10.4 * q, 0);
  const at2 = (dy: number) => seen(0, C[1] + dy * q)[1];
  // (below the dendrite: close in, just under the charge outside it, clear of the words at the foot)
  const under = lerp(at2(16.8), at2(12.4), P.onCleft);
  const potential = lerp(V_REST, -45, P.rise);
  say(
    g,
    narrow ? '− inside, neutralized' : 'part of the negative layer inside, neutralized',
    hl,
    at2(-3.4),
    fresh * P.excess,
    12.5,
    'right',
    NEG
  );
  say(
    g,
    narrow ? '+ outside, reduced' : 'less positive charge outside',
    hr,
    at2(-3.4),
    fresh * P.excess,
    12.5,
    'left',
    POS
  );
  say(
    g,
    `${narrow ? 'here' : 'membrane potential here'}: ${mV(potential)}`,
    hr,
    at2(-5.6),
    fresh * P.rise,
    12.5,
    'left',
    mix(FIELD, L.ink, 0.25)
  );
  say(
    g,
    narrow ? 'K^{+} pushed away' : 'potassium, the most plentiful positive ion inside, pushed away',
    w / 2,
    under,
    fresh * P.repelled * (1 - P.axial),
    12.5,
    'center',
    IONS.K.colour
  );
  say(
    g,
    narrow
      ? 'a net flow along, both ways'
      : 'a net flow of positive ions along the dendrite, each pushing the next',
    w / 2,
    under,
    fresh * P.axial * clamp01(1 - 2 * P.leaks),
    12.5,
    'center',
    IONS.K.colour
  );
  say(
    g,
    narrow ? 'K^{+} leak channels' : 'K^{+} leak channels: potassium leaks out through them',
    w / 2,
    under,
    fresh * clamp01(2 * P.leaks - 1),
    12.5,
    'center',
    IONS.K.colour
  );
  footNote(
    g,
    narrow
      ? 'less − inside, less + outside'
      : 'the positive ions flowing in neutralize part of the negative layer inside the membrane, and the positive charge outside is reduced',
    a * P.excess * (1 - P.rise)
  );
  footNote(
    g,
    narrow
      ? 'the potential here rises'
      : `so the membrane potential round the channel rises, from ${mV(V_REST)} to ${mV(-45)}`,
    a * P.rise * (1 - P.repelled)
  );
  footNote(
    g,
    narrow
      ? 'it pushes nearby K^{+} away'
      : 'that extra positive charge pushes away the positive ions nearest it, mostly potassium',
    a * P.repelled * (1 - P.axial)
  );
  footNote(
    g,
    narrow
      ? '+ flows along, raising the potential'
      : 'each pushes the next: a net flow of positive charge along the dendrite, which collects on its membrane and raises the potential there too',
    a * P.axial * (1 - P.quick)
  );
  footNote(
    g,
    narrow
      ? 'spreading out, it falls fast'
      : 'as the charge spreads away along the dendrite, the potential by the channel falls fast',
    a * P.quick * (1 - P.leaks)
  );
  footNote(
    g,
    narrow
      ? 'K^{+} leaking: slower, τ_{m}'
      : 'potassium leaking out through K^{+} leak channels lowers it too, more slowly, with τ_{m} ≈ 10–30 ms',
    a * P.leaks * (1 - P.soma)
  );
  footNote(
    g,
    narrow
      ? 'synapse: large, brief; soma: smaller, slower'
      : 'large and brief by the channel, smaller and slower at the soma; once spread out, both fall with τ_{m}',
    a * P.soma * (1 - P.ticks)
  );
  footNote(
    g,
    narrow
      ? 'leaking out, the rise fades with distance'
      : 'potassium leaks out through ion channels along the way, so the rise in potential fades with distance from the channel',
    a * P.ticks
  );

  // the words: each neuron named, from afar — and the spike
  const far = a * (1 - P.dive);
  const [px, py] = seen(...pre);
  const [qx, qy] = seen(...post);
  say(
    g,
    'another neuron',
    px,
    py + 26 * q,
    far * P.cells * P.other,
    12.5,
    'center',
    mix(PRE, L.ink, 0.35)
  );
  say(g, 'this neuron', qx, qy + 24 * q, far * P.cells, 12.5, 'center');
  // two ways to inject current into it: an electrode, a glass pipette from above with its tip at the body; and an ion
  // channel in its dendrite, ringed
  const injected = far * P.inject * (1 - P.other);
  if (injected > 0.01) {
    const [tx, ty] = seen(post[0] + 2.5 * q, post[1] - 12.5 * q);
    const [bx, by] = seen(post[0] + 12 * q, post[1] - 62 * q);
    const len = Math.hypot(bx - tx, by - ty) || 1;
    const [nx, ny] = [-(by - ty) / len, (bx - tx) / len];
    const [w0, w1] = [0.25 * q, 2.6 * q];
    ctx.globalAlpha = injected;
    ctx.beginPath();
    ctx.moveTo(tx + nx * w0, ty + ny * w0);
    ctx.lineTo(bx + nx * w1, by + ny * w1);
    ctx.lineTo(bx - nx * w1, by - ny * w1);
    ctx.lineTo(tx - nx * w0, ty - ny * w0);
    ctx.closePath();
    ctx.fillStyle = rgba(mix(L.page, [125, 211, 252], 0.35), 1);
    ctx.fill();
    ctx.strokeStyle = rgba(L.ink, 0.5);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    say(g, 'an electrode', bx, by - 10, injected, 12.5, 'center');
    const [cx, cy] = seen(C[0], top);
    ctx.globalAlpha = 0.7 * injected;
    ctx.strokeStyle = rgba(L.ink, 1);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 12 * q, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    say(g, 'an ion channel', cx + 15 * q, cy - 13 * q, injected, 13, 'left');
  }
  const [mx, my] = seen(...bezier(axon, 0.42));
  say(
    g,
    narrow ? 'a spike' : 'a signal: a spike',
    mx,
    my - 12 * q,
    far * P.spike,
    12.5,
    'center',
    mix(SPIKE, L.ink, 0.35)
  );
  // where they meet: a ring, and its name
  const contact = far * P.contact;
  if (contact > 0.01) {
    const [cx, cy] = seen(...C);
    ctx.globalAlpha = 0.7 * contact;
    ctx.strokeStyle = rgba(L.ink, 1);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 20 * q, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    say(g, 'a chemical synapse', cx + 24 * q, cy - 22 * q, contact, 13, 'left');
  }
  // the transporters either side of the cleft, at its edges, taking up the glutamate that wanders out
  if (P.clear * near > 0.01)
    for (const side of [-1, 1]) {
      const [tx, ty] = seen(C[0] + side * 9.8 * q, C[1] + 0.3 * q);
      ctx.globalAlpha = a * near * P.clear;
      ctx.beginPath();
      ctx.roundRect(tx - 0.6 * q * Z, ty - 0.9 * q * Z, 1.2 * q * Z, 1.8 * q * Z, 0.45 * q * Z);
      ctx.fillStyle = rgba(mix(L.page, [168, 85, 247], 0.25), 1);
      ctx.fill();
      ctx.strokeStyle = rgba(TRANSMITTER, 0.85);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  // close in: the synapse's parts, either side of it — the names either side moved out a little for the transporters
  const close = a * near * (1 - P.low);
  const [lx] = seen(C[0] - (9.6 + 1.6 * P.clear) * q, 0);
  const [rx] = seen(C[0] + (9.6 + 1.6 * P.clear) * q, 0);
  const yOf = (dy: number) => seen(0, C[1] + dy * q)[1];
  // (of two words that share a place, one gone before the other comes)
  const before = (k: number) => clamp01(1 - 2 * k);
  const after = (k: number) => clamp01(2 * k - 1);
  const named = (
    text: string,
    short: string,
    x: number,
    dy: number,
    alpha: number,
    align: CanvasTextAlign,
    colour?: RGB
  ) => say(g, narrow ? short : text, x, yOf(dy), close * alpha, 12.5, align, colour);
  // (gone once the view closes in on the cleft, and the terminal's top is out of it)
  named(
    'vesicles, full of neurotransmitter',
    'vesicles',
    lx - 10,
    -8.8,
    P.release * (1 - P.onCleft),
    'right',
    mix(TRANSMITTER, L.ink, 0.3)
  );
  named(
    "the other neuron's presynaptic terminal",
    'terminal',
    lx - 10,
    -5.6,
    P.parts * P.other * (1 - P.onCleft),
    'right',
    mix(PRE, L.ink, 0.35)
  );
  named(
    'neurotransmitter',
    'transmitter',
    rx + 10,
    -3,
    P.release * before(P.glutamate),
    'left',
    mix(TRANSMITTER, L.ink, 0.3)
  );
  named(
    'glutamate',
    'glutamate',
    rx + 10,
    -3,
    P.release * after(P.glutamate),
    'left',
    mix(TRANSMITTER, L.ink, 0.3)
  );
  named('the synaptic cleft', 'cleft', rx + 10, 0.2, P.parts * P.other * before(P.kout), 'left');
  named('potassium ions flow out', 'K^{+} out', rx + 10, 0.2, after(P.kout), 'left', IONS.K.colour);
  named(
    'receptors',
    'receptors',
    seen(C[0] + 6.4 * q, 0)[0] + 10,
    3.2,
    P.bind * before(P.opening),
    'left',
    mix(TRANSMITTER, L.ink, 0.3)
  );
  named(
    'receptors: ion channels, open when bound',
    'channels, open',
    seen(C[0] + 6.4 * q, 0)[0] + 10,
    3.2,
    P.other * after(P.opening) * before(P.glutamate),
    'left',
    mix(TRANSMITTER, L.ink, 0.3)
  );
  named(
    'AMPA receptors',
    'AMPA',
    seen(C[0] + 6.4 * q, 0)[0] + 10,
    3.2,
    after(P.glutamate) * before(P.desens),
    'left',
    mix(TRANSMITTER, L.ink, 0.3)
  );
  named(
    'AMPA receptors, desensitized',
    'desensitized',
    seen(C[0] + 6.4 * q, 0)[0] + 10,
    3.2,
    after(P.desens),
    'left',
    mix(GREY, L.ink, 0.4)
  );
  named(
    'glutamate taken up by transporters',
    'transporters',
    lx - 10,
    0.4,
    P.clear,
    'right',
    mix(TRANSMITTER, L.ink, 0.3)
  );
  named(
    "this neuron's dendrite: the synapse is on its shaft",
    'dendrite',
    seen(C[0] + 7 * q, 0)[0] + 10,
    6.6,
    P.parts * P.other,
    'left'
  );
  named(
    "this neuron's dendrite",
    'dendrite',
    seen(C[0] + 7 * q, 0)[0] + 10,
    6.6,
    P.parts * (1 - P.other),
    'left'
  );
  named(
    'an ion channel',
    'a channel',
    seen(C[0] + 3 * q, 0)[0] + 10,
    3.2,
    P.chan * (1 - P.other) * before(P.opening),
    'left',
    mix(IONS.Na.colour, L.ink, 0.3)
  );
  named(
    'an ion channel, open for about 5 ms',
    'open, ~5 ms',
    seen(C[0] + 3 * q, 0)[0] + 10,
    3.2,
    (1 - P.other) * after(P.opening),
    'left',
    mix(IONS.Na.colour, L.ink, 0.3)
  );
  named(
    'sodium ions flow in',
    'Na^{+} in',
    seen(C[0] - 6.8 * q, 0)[0] - 10,
    7,
    P.inflow,
    'right',
    IONS.Na.colour
  );
  named(
    'chloride turned away',
    'Cl^{−} out',
    lx - 10,
    0.4,
    P.inflow * (1 - P.glutamate),
    'right',
    IONS.Cl.colour
  );
  // and what each slide says of it
  footNote(
    g,
    narrow
      ? 'a spike runs down its axon'
      : "a signal, a spike, runs down the other neuron's axon towards this one",
    a * P.other * P.cells * (1 - P.contact) * (1 - P.dive)
  );
  footNote(
    g,
    narrow
      ? 'first: current within a dendrite'
      : 'first, how current flows within a neuron, starting with a dendrite',
    a * P.first * (1 - P.inject)
  );
  footNote(
    g,
    narrow
      ? 'an electrode, or an ion channel'
      : 'current can be injected through an electrode, or through an ion channel of another kind opening',
    a * P.inject * (1 - P.dive)
  );
  footNote(
    g,
    narrow
      ? 'an ion channel in the dendrite'
      : "an ion channel in the dendrite's membrane, which opens in certain circumstances",
    a * P.chan * (1 - P.other) * (1 - P.opening)
  );
  footNote(
    g,
    narrow
      ? 'open for about 5 ms'
      : 'say it opens briefly, for about 5 ms (slowed down here), and shuts again',
    a * (1 - P.other) * P.opening * (1 - P.inflow)
  );
  footNote(
    g,
    narrow
      ? 'terminal, cleft and dendrite'
      : "an excitatory synapse: the other neuron's terminal, a narrow cleft, and right across it the shaft of this neuron's dendrite",
    a * P.contact * (1 - P.release)
  );
  footNote(
    g,
    narrow
      ? 'a vesicle empties into the cleft'
      : 'a spike arrives, and a vesicle empties its neurotransmitter into the cleft',
    a * P.release * (1 - P.bind)
  );
  footNote(
    g,
    narrow
      ? 'the transmitter binds to receptors'
      : "the neurotransmitter crosses the cleft and binds to receptors in this neuron's dendrite",
    a * P.bind * (1 - P.opening)
  );
  footNote(
    g,
    narrow
      ? 'bound, their channels open'
      : 'each receptor holds an ion channel: when the neurotransmitter binds, the channel opens',
    a * P.other * P.opening * (1 - P.inflow)
  );
  footNote(
    g,
    narrow
      ? 'Na^{+} in, Cl^{−} turned away'
      : 'selective: sodium ions flow in, while chloride is turned away',
    a * P.inflow * (1 - P.glutamate) * (1 - P.low) * (1 - P.room)
  );
  footNote(
    g,
    narrow
      ? 'glutamate opens AMPA receptors'
      : 'one example: AMPA receptors, opened by the neurotransmitter glutamate',
    a * P.glutamate * (1 - P.kout)
  );
  footNote(
    g,
    narrow
      ? 'Na^{+} in, K^{+} out, about equally'
      : 'open, AMPA receptors pass sodium in and potassium out about as easily as each other, as passive channels would',
    a * P.kout * (1 - P.currents) * (1 - P.low) * (1 - P.kinetics)
  );
  footNote(
    g,
    narrow
      ? 'the two currents cancel near 0 mV'
      : 'with equal permeability, the sodium flowing in and the potassium flowing out cancel at about 0 mV',
    a * P.currents
  );
  if (P.currents > 0.01) drawCurrents(g, a * P.currents, narrow);
  // how fast: each slide's words at the foot, and the plot over them
  footNote(
    g,
    narrow
      ? 'glutamate gone in about 1 ms'
      : 'glutamate leaves the cleft within about a millisecond: it diffuses out, and transporters take it up',
    a * P.kinetics * P.clear * (1 - P.epsc) * (1 - P.brief) * (1 - P.current) * (1 - P.types)
  );
  footNote(
    g,
    narrow
      ? 'the current decays in 1–5 ms'
      : 'glutamate off, the channels take a while to shut, some shutting though still bound: the current decays in 1–5 ms',
    a * P.epsc * (1 - P.brief)
  );
  footNote(
    g,
    narrow
      ? 'open briefly: a short rise'
      : 'the channel is open only briefly, and the voltage rises only while it is',
    a * P.brief * (1 - P.resist)
  );
  footNote(
    g,
    narrow
      ? 'less resistance: a faster rise'
      : 'how fast the voltage rises depends on the resistance of the open channels: the less it is, the faster',
    a * P.resist * (1 - P.rc)
  );
  footNote(
    g,
    narrow
      ? 'τ = R × C: 63% of the way'
      : "the time constant τ, the time to rise 63% of the way, is that resistance times the membrane's capacitance",
    a * P.rc * (1 - P.cap) * (1 - P.eps) * (1 - P.ohm)
  );
  footNote(
    g,
    narrow
      ? 'C = Q / V'
      : 'capacitance: how much charge the membrane holds for each volt across it',
    a * P.cap * (1 - P.thin)
  );
  footNote(
    g,
    narrow
      ? 'thinner: more charge per volt'
      : 'about 1 µF/cm² in most neurons: the thinner the membrane, the more charge it holds per volt',
    a * P.thin * (1 - P.eps)
  );
  footNote(
    g,
    narrow
      ? 'C = ε × A / d'
      : 'C = ε × A / d: more area or a higher dielectric constant, more capacitance; a thicker membrane, less',
    a * P.eps * (1 - P.ohm)
  );
  footNote(
    g,
    narrow
      ? 'I = (E − V) / R'
      : "Ohm's law: the current is the gap between the reversal potential and the membrane potential, over the resistance",
    a * P.ohm * (1 - P.slope)
  );
  footNote(
    g,
    narrow
      ? 'it rises at I / C, slowing'
      : 'the current charges the membrane: a charge ΔQ raises the voltage by ΔV = ΔQ / C, so it rises at I / C, slowing as it nears E',
    a * P.slope
  );
  footNote(
    g,
    narrow
      ? 'unbinding: closed in 1 to 3 ms'
      : 'with the glutamate gone it comes off the receptors, and their channels close: the current falls within 1 to 3 ms',
    a * P.current * (1 - P.desens) * (1 - P.volt)
  );
  footNote(
    g,
    narrow
      ? 'desensitized: shut though bound'
      : 'held in glutamate, AMPA receptors still shut within about 10 ms, and stay shut a while: desensitized',
    a * P.desens
  );
  footNote(
    g,
    narrow
      ? 'decay: synapse, subunits, temperature'
      : 'how fast the current falls depends on the synapse, its receptors’ subunits and partners, and the temperature',
    a * P.types
  );
  footNote(
    g,
    narrow
      ? 'voltage: slower, τ = r_{m}c_{m}'
      : 'the brief current charges the membrane’s capacitance: the voltage rises and falls far more slowly, with τ = r_{m}c_{m}',
    a * P.volt
  );
  if (P.kinetics > 0.01) drawKinetics(g, a * P.kinetics, P, narrow);
  if (P.quick > 0.01) drawDecay(g, a * P.quick, P, narrow);
  if (P.cap > 0.01) drawCapacitor(g, a * P.cap, P, narrow);
}

/** A rise then a fall, each exponential, `rise` and `fall` ms: as high at its peak as 1. */
function pulse(t: number, rise: number, fall: number) {
  if (t <= 0) return 0;
  const peak = ((rise * fall) / (fall - rise)) * Math.log(fall / rise);
  const at = (s: number) => Math.exp(-s / fall) - Math.exp(-s / rise);
  return at(t) / at(peak);
}

/**
 * How fast it all happens, on a plot across the foot of the figure, its time axis `P.span` ms long: glutamate in the
 * cleft, gone within a millisecond — or, held there, a long while; the AMPA receptors' current, falling within 1 to
 * 3 ms — or, glutamate held, desensitizing within 10; that current at three kinds of synapse, an auditory brainstem
 * one, a cortical one, and the same at room temperature; and the voltage the current makes, rising and falling with
 * the membrane's time constant, far slower.
 */
function drawKinetics(g: G, a: number, P: Pose, narrow: boolean) {
  const { ctx, w, h, L, u } = g;
  const s = Math.max(u, 0.85);
  const [left, right] = [14, w - 14];
  const top = h - 36 * u - 96 * s;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(left, top, right - left, 92 * s, 10 * s);
  ctx.fillStyle = rgba(L.page, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.12);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // the axes: time along the foot, 0 to the span; up, each trace as a share of its peak
  const [x0, x1] = [left + 20 * s, right - (narrow ? 20 : 200) * s];
  const [base, peak] = [top + 70 * s, top + 14 * s];
  const span = P.span;
  const X = (t: number) => lerp(x0, x1, t / span);
  const Y = (v: number) => lerp(base, peak, v);
  ctx.globalAlpha = 0.5 * a;
  ctx.strokeStyle = rgba(L.ink, 1);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0, base);
  ctx.lineTo(x1, base);
  ctx.stroke();
  ctx.globalAlpha = 1;
  say(g, '0', x0, base + 11 * s, 0.6 * a, 11, 'center');
  say(g, `${Math.round(span)} ms`, x1, base + 11 * s, 0.6 * a, 11, 'center');
  // a trace, drawn as far as it has come; and its name, beside it where it is at `at` ms
  const trace = (
    f: (t: number) => number,
    colour: RGB,
    alpha: number,
    name: string,
    at: number,
    dashed = false
  ) => {
    if (alpha < 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = rgba(colour, 1);
    ctx.lineWidth = 2 * s;
    ctx.lineJoin = 'round';
    if (dashed) ctx.setLineDash([5 * s, 4 * s]);
    ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * span;
      const [x, y] = [X(t), Y(clamp01(f(t)))];
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    const t = Math.min(at, span * 0.92);
    say(
      g,
      name,
      X(t) + 6 * s,
      Y(clamp01(f(t))) - 8 * s,
      alpha,
      11.5,
      'left',
      mix(colour, L.ink, 0.25)
    );
  };
  // glutamate in the cleft: a spike, gone within a millisecond — or held there, 20 ms
  const glu = (t: number) =>
    lerp(
      pulse(t, 0.05, 0.35),
      t < 20 ? 1 - Math.exp(-t / 0.05) : Math.exp(-(t - 20) / 0.35),
      P.desens
    );
  const shownGlu = a * P.clear * (1 - P.resist) * (1 - P.types) * (1 - P.volt);
  trace(
    glu,
    TRANSMITTER,
    shownGlu,
    narrow ? 'glutamate' : 'glutamate in the cleft',
    P.desens > 0.5 ? 12 : 0.5,
    P.desens > 0.5
  );
  // once glutamate unbinds, the AMPA current (the EPSC), decaying within a few ms
  trace(
    (t) => pulse(t, 0.25, 2.5),
    IONS.Na.colour,
    a * P.epsc * (1 - P.brief),
    narrow ? 'EPSC' : 'AMPA current (EPSC): decays in about 1–5 ms',
    2.6
  );
  // the AMPA receptors' current: falling within 1 to 3 ms — or, desensitizing, within about 10
  const fall = lerp(2, 6, P.desens);
  trace(
    (t) => pulse(t, 0.25, fall),
    IONS.Na.colour,
    a * P.current * (1 - P.types),
    P.desens > 0.5
      ? narrow
        ? 'current'
        : 'AMPA current: shuts anyway'
      : narrow
        ? 'current'
        : 'AMPA current',
    1.2 * fall
  );
  // at three kinds of synapse
  const types = a * P.types;
  trace(
    (t) => pulse(t, 0.12, 0.5),
    IONS.Na.colour,
    types,
    narrow ? 'brainstem' : 'auditory brainstem: under 1 ms',
    0.7
  );
  trace(
    (t) => pulse(t, 0.3, 3),
    mix(IONS.Na.colour, L.ink, 0.3),
    types,
    narrow ? 'cortex' : 'cortex, hippocampus: 2 to 5 ms',
    6
  );
  trace(
    (t) => pulse(t, 0.6, 7),
    mix(IONS.Na.colour, L.page, 0.35),
    types,
    narrow ? 'cooler' : 'at room temperature: slower',
    10,
    true
  );
  // and the voltage: rising and falling with the membrane's time constant, 20 ms
  trace(
    (t) => pulse(t, 2, 20),
    mix(FIELD, L.ink, 0.45),
    a * P.volt,
    narrow ? 'voltage' : 'voltage: τ = r_{m}c_{m} ≈ 20 ms',
    30
  );
  // after the glutamate is cleared: how long the receptors are open, shaded, and the voltage rising only while they
  // are, then hardly falling
  const OPEN_MS = 5;
  const rising = (t: number, tau: number) => 1 - Math.exp(-Math.max(0, t) / tau);
  const brief = a * P.brief * (1 - P.resist);
  if (brief > 0.01) {
    ctx.globalAlpha = 0.14 * brief;
    ctx.fillStyle = rgba(TRANSMITTER, 1);
    ctx.fillRect(X(0), peak, X(OPEN_MS) - X(0), base - peak);
    ctx.globalAlpha = 1;
    say(
      g,
      narrow ? 'open' : 'channel open',
      X(OPEN_MS / 2),
      peak - 6 * s,
      brief,
      11,
      'center',
      mix(TRANSMITTER, L.ink, 0.3)
    );
  }
  const shut = rising(OPEN_MS, 2);
  trace(
    (t) => (t < OPEN_MS ? rising(t, 2) : shut * Math.exp(-(t - OPEN_MS) / 20)) / shut,
    mix(FIELD, L.ink, 0.45),
    brief,
    narrow ? 'voltage' : 'voltage: rises only while it is open',
    2.4
  );
  // how fast it rises with the channels' resistance: through less, faster; through more, slower
  const resist = a * P.resist * (1 - P.rc);
  for (const [tau, name, short, at, ink] of [
    [0.35, 'less resistance: a fast rise', 'less R', 0.9, 0.15],
    [1.2, '', '', 0, 0.45],
    [3.2, 'more resistance: a slower rise', 'more R', 3.4, 0.75],
  ] as [number, string, string, number, number][])
    trace((t) => rising(t, tau), mix(FIELD, L.ink, ink), resist, narrow ? short : name, at);
  // and one rise, its time constant marked: 63% of the way up, at τ
  const rc = a * P.rc;
  const TAU = 1.2;
  trace((t) => rising(t, TAU), mix(FIELD, L.ink, 0.45), rc, 'voltage', 3.6);
  // (going once the slides turn to what sets that rise)
  const marks = rc * (1 - P.ohm);
  if (marks > 0.01) {
    const [tx, ty] = [X(TAU), Y(1 - Math.exp(-1))];
    ctx.save();
    ctx.globalAlpha = 0.55 * marks;
    ctx.strokeStyle = rgba(L.ink, 1);
    ctx.lineWidth = 1;
    ctx.setLineDash([4 * s, 3 * s]);
    ctx.beginPath();
    ctx.moveTo(x0, ty);
    ctx.lineTo(tx, ty);
    ctx.lineTo(tx, base);
    ctx.stroke();
    ctx.restore();
    say(g, '63%', x0 + 4 * s, ty - 7 * s, 0.8 * marks, 11, 'left');
    say(g, 'τ', tx, base + 11 * s, marks, 11.5, 'center');
    say(
      g,
      narrow ? 'τ = R × C' : 'the time constant: τ = R × C',
      tx + 8 * s,
      ty + 10 * s,
      marks,
      11.5,
      'left',
      mix(FIELD, L.ink, 0.25)
    );
  }
  // what sets that rise: by Ohm's law, the current is the gap to the reversal potential E over the resistance, and so
  // falls as the gap closes — the reversal potential dashed along the top, the gap a while in, and the current
  const ohm = a * P.ohm;
  if (ohm > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.5 * ohm;
    ctx.strokeStyle = rgba(TRANSMITTER, 1);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5 * s, 4 * s]);
    ctx.beginPath();
    ctx.moveTo(x0, Y(1));
    ctx.lineTo(x1, Y(1));
    ctx.stroke();
    ctx.restore();
    say(
      g,
      narrow ? 'E' : 'reversal potential E',
      x1 + 6 * s,
      Y(1),
      ohm,
      11.5,
      'left',
      mix(TRANSMITTER, L.ink, 0.3)
    );
  }
  const gap = ohm * (1 - P.slope);
  if (gap > 0.01) {
    const tg = 0.8;
    const gx = X(tg);
    arrow(ctx, gx, Y(rising(tg, TAU)) - 2 * s, gx, Y(1) + 2 * s, L.ink, 0.7 * gap, 1.4, 5);
    say(g, 'E − V', gx + 6 * s, Y((1 + rising(tg, TAU)) / 2), gap, 11.5, 'left');
  }
  trace(
    (t) => Math.exp(-t / TAU),
    IONS.Na.colour,
    gap,
    narrow ? 'current' : 'current: I = (E − V) / R',
    2.6
  );
  // and, charging the capacitance, the voltage rising at I / C: lines along the rise, steep at first, then shallower
  const slope = a * P.slope;
  if (slope > 0.01)
    for (const [t, from, to, name, short] of [
      [0.12, 0, 0.55, 'rate of rise I / C: fast while the current is large', 'fast'],
      [1.9, -0.6, 0.6, 'slower as V nears E', 'slower'],
    ] as [number, number, number, string, string][]) {
      const v = rising(t, TAU);
      const k = (1 - v) / TAU;
      ctx.globalAlpha = 0.8 * slope;
      ctx.strokeStyle = rgba(L.ink, 1);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(X(t + from), Y(v + k * from));
      ctx.lineTo(X(t + to), Y(v + k * to));
      ctx.stroke();
      ctx.globalAlpha = 1;
      say(g, narrow ? short : name, X(t + to) + 6 * s, Y(v + k * to) + 12 * s, slope, 11, 'left');
    }
}

/**
 * The membrane as a capacitor, on a panel across the foot of the figure: its two faces and the lipids between, and the
 * charge either side for 1 volt across it, positive outside and negative inside — as much as it holds per volt; then
 * thinner, and more charge for the same volt; then its area A, thickness d and the lipids' dielectric constant ε
 * named: C = ε × A / d.
 */
function drawCapacitor(g: G, a: number, P: Pose, narrow: boolean) {
  const { ctx, w, h, L, u } = g;
  const s = Math.max(u, 0.85);
  const [left, right] = [14, w - 14];
  const top = h - 36 * u - 96 * s;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(left, top, right - left, 92 * s, 10 * s);
  ctx.fillStyle = rgba(L.page, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.12);
  ctx.lineWidth = 1;
  ctx.stroke();
  // the membrane: a slab along the panel, its lipid core between two faces — thinner on the slide about thickness
  const [x0, x1] = [left + 30 * s, narrow ? right - 30 * s : lerp(left, right, 0.58)];
  const mid = top + 50 * s;
  const d = lerp(24, 12, P.thin) * s;
  const [outer, inner] = [mid - d / 2, mid + d / 2];
  ctx.fillStyle = rgba(mix(L.page, L.ink, 0.09), 1);
  ctx.fillRect(x0, outer, x1 - x0, d);
  ctx.strokeStyle = rgba(L.ink, 0.4);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0, outer);
  ctx.lineTo(x1, outer);
  ctx.moveTo(x0, inner);
  ctx.lineTo(x1, inner);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // the charge either side for 1 volt: six pairs — or, thinner, eleven, the extra ones between
  const r = 5 * s;
  for (let i = 0; i < 11; i++) {
    const shown = a * (i % 2 ? P.thin : 1);
    if (shown < 0.01) continue;
    const x = lerp(x0 + 14 * s, x1 - 14 * s, i / 10);
    disc(g, x, outer - r - 2 * s, r, POS, 1, shown);
    disc(g, x, inner + r + 2 * s, r, NEG, -1, shown);
  }
  // its thickness d, and, named last, its area A and the lipids' dielectric constant ε
  const marked = a * P.thin;
  if (marked > 0.01) {
    const mx = x1 + 12 * s;
    arrow(ctx, mx, mid, mx, outer, L.ink, 0.7 * marked, 1.2, 4 * s);
    arrow(ctx, mx, mid, mx, inner, L.ink, 0.7 * marked, 1.2, 4 * s);
    say(g, 'd', mx + 6 * s, mid, marked, 11.5, 'left');
  }
  const named = a * P.eps;
  if (named > 0.01) {
    const ay = outer - 2 * r - 9 * s;
    const cx = (x0 + x1) / 2;
    arrow(ctx, cx - 12 * s, ay, x0, ay, L.ink, 0.6 * named, 1.2, 4 * s);
    arrow(ctx, cx + 12 * s, ay, x1, ay, L.ink, 0.6 * named, 1.2, 4 * s);
    say(g, 'A', cx, ay, named, 11.5, 'center');
    say(g, 'ε', cx, mid, named, 11.5, 'center');
  }
  // the words: what capacitance is; then, thinner, more per volt; then what sets it
  if (narrow) {
    for (const [text, alpha] of [
      ['C = Q / V', a * (1 - P.thin)],
      ['thinner: more per volt', a * P.thin * (1 - P.eps)],
      ['C = ε × A / d', named],
    ] as [string, number][])
      say(g, text, w / 2, top + 10 * s, alpha, 11.5, 'center');
    return;
  }
  const tx = x1 + 30 * s;
  say(
    g,
    'the charge either side, for 1 volt across it',
    tx,
    mid - 14 * s,
    a * (1 - P.eps),
    11.5,
    'left'
  );
  say(g, 'C = Q / V: the charge held per volt', tx, mid + 6 * s, a * (1 - P.thin), 11.5, 'left');
  say(
    g,
    'thinner: more charge for the same volt',
    tx,
    mid + 6 * s,
    marked * (1 - P.eps),
    11.5,
    'left'
  );
  say(g, 'C = ε × A / d', tx, mid - 14 * s, named, 13, 'left');
  say(
    g,
    "A its area, d its thickness, ε the lipids' dielectric constant",
    tx,
    mid + 6 * s,
    named,
    11.5,
    'left'
  );
}

/**
 * The membrane potential by the synapse, on a plot across the foot of the figure, 40 ms long, as a share of its peak:
 * up within a millisecond as the current flows in, then down — fast at first, as the charge spreads along the
 * dendrite, then slower, as potassium leaks out, with τ_m; and the same at the soma, smaller, rising and falling more
 * slowly, the two alike once the charge has spread.
 */
function drawDecay(g: G, a: number, P: Pose, narrow: boolean) {
  const { ctx, w, h, L, u } = g;
  const s = Math.max(u, 0.85);
  const [left, right] = [14, w - 14];
  const top = h - 36 * u - 96 * s;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(left, top, right - left, 92 * s, 10 * s);
  ctx.fillStyle = rgba(L.page, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.12);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const [x0, x1] = [left + 20 * s, right - (narrow ? 20 : 200) * s];
  const [base, peak] = [top + 70 * s, top + 14 * s];
  const span = 40;
  const X = (t: number) => lerp(x0, x1, t / span);
  const Y = (v: number) => lerp(base, peak, v);
  ctx.globalAlpha = 0.5 * a;
  ctx.strokeStyle = rgba(L.ink, 1);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0, base);
  ctx.lineTo(x1, base);
  ctx.stroke();
  ctx.globalAlpha = 1;
  say(g, '0', x0, base + 11 * s, 0.6 * a, 11, 'center');
  say(g, `${span} ms`, x1, base + 11 * s, 0.6 * a, 11, 'center');
  // at the synapse: up in a millisecond; then most of it gone in a few, the rest falling with τ_m
  const local = (t: number) =>
    t < 1 ? smooth(t) : 0.71 * Math.exp(-(t - 1) / 1.5) + 0.29 * Math.exp(-(t - 1) / 20);
  // at the soma: a fifth as high, peaking at about 6 ms, then falling with τ_m
  const SOMA_NORM = Math.exp(-0.297) - Math.exp(-2.376);
  const atSoma = (t: number) => (0.2 * (Math.exp(-t / 20) - Math.exp(-t / 2.5))) / SOMA_NORM;
  const curve = (f: (t: number) => number, colour: RGB, alpha: number) => {
    if (alpha < 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = rgba(colour, 1);
    ctx.lineWidth = 2 * s;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * span;
      if (i) ctx.lineTo(X(t), Y(clamp01(f(t))));
      else ctx.moveTo(X(t), Y(clamp01(f(t))));
    }
    ctx.stroke();
    ctx.restore();
  };
  const [synColour, somaColour] = [mix(FIELD, L.ink, 0.25), mix(L.page, L.ink, 0.6)];
  curve(local, synColour, a);
  curve(atSoma, somaColour, a * P.soma);
  // what each part of the fall is: fast, as the charge spreads; slower, as potassium leaks out
  say(
    g,
    narrow ? 'fast: spreading' : 'fast: the charge spreading along the dendrite',
    X(3) + 6 * s,
    Y(local(3)) - 8 * s,
    a,
    11,
    'left',
    synColour
  );
  say(
    g,
    narrow ? 'slower: τ_{m}' : 'slower: K^{+} leaking out, τ_{m} ≈ 10–30 ms',
    X(22) + 6 * s,
    Y(local(22)) - 10 * s,
    a * P.slow,
    11,
    'left',
    IONS.K.colour
  );
  // and which is which, at the side
  if (narrow) return;
  const key = (y: number, colour: RGB, text: string, alpha: number) => {
    if (alpha < 0.01) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = rgba(colour, 1);
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x1 + 14 * s, y);
    ctx.lineTo(x1 + 28 * s, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    say(g, text, x1 + 34 * s, y, alpha, 11, 'left', mix(colour, L.ink, 0.2));
  };
  key(Y(0.8), synColour, 'by the channel', a * (1 - P.soma));
  key(Y(0.8), synColour, 'by the channel: large, brief', a * P.soma);
  key(Y(0.45), somaColour, 'at the soma: smaller, slower', a * P.soma);
}

/** The AMPA receptors' reversal potential, mV, sodium and potassium passing as easily as each other: from the physics
 * course's concentrations, by the Goldman equation — close to 0. */
const E_AMPA = KT * Math.log((CONC.Na.out + CONC.K.out) / (CONC.Na.in + CONC.K.in));

/**
 * The two currents through the AMPA receptors, on a line of potentials across the foot of the figure, −100 mV to +80:
 * potassium's and sodium's reversal potentials, each a tick in its ion's colour; the receptors' own, a marker under the
 * line, near 0 mV; and from it two arrows as long as each other — potassium's out, pulling down towards its reversal
 * potential, sodium's in, pulling up towards its own — cancelling there.
 */
function drawCurrents(g: G, a: number, narrow: boolean) {
  const { ctx, w, h, L, u } = g;
  const s = Math.max(u, 0.85);
  const [left, right] = [14, w - 14];
  const top = h - 36 * u - 96 * s;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(left, top, right - left, 92 * s, 10 * s);
  ctx.fillStyle = rgba(L.page, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.12);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const ly = top + 38 * s;
  const [lx0, lx1] = [left + 26 * s, right - 26 * s];
  const at = (v: number) => lerp(lx0, lx1, clamp01((v - SPAN[0]) / (SPAN[1] - SPAN[0])));
  // the line, a small tick every 20 mV, and 0 named over it
  ctx.globalAlpha = 0.5 * a;
  ctx.strokeStyle = rgba(L.ink, 1);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(lx0, ly);
  ctx.lineTo(lx1, ly);
  for (let v = SPAN[0]; v <= SPAN[1]; v += 20) {
    ctx.moveTo(at(v), ly - 3 * s);
    ctx.lineTo(at(v), ly + 3 * s);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  say(g, '0 mV', at(0), ly - 12 * s, 0.6 * a, 11, 'center');
  // each ion's reversal potential, a tick in its colour, named over it
  for (const ion of ['K', 'Na'] as const) {
    const x = at(EQUILIBRIUM[ion]);
    ctx.globalAlpha = a;
    ctx.strokeStyle = rgba(IONS[ion].colour, 1);
    ctx.lineWidth = 3 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, ly - 7 * s);
    ctx.lineTo(x, ly + 7 * s);
    ctx.stroke();
    ctx.globalAlpha = 1;
    say(
      g,
      `E_{${ion}} ${signed(EQUILIBRIUM[ion])}${narrow ? '' : ' mV'}`,
      x,
      ly - 24 * s,
      a,
      12,
      'center',
      IONS[ion].colour
    );
  }
  // the receptors' reversal potential: a marker under the line, and the two currents from it, cancelling
  const vx = at(E_AMPA);
  ctx.globalAlpha = a;
  ctx.fillStyle = rgba(TRANSMITTER, 0.95);
  ctx.beginPath();
  ctx.moveTo(vx, ly + s);
  ctx.lineTo(vx - 6 * s, ly + 11 * s);
  ctx.lineTo(vx + 6 * s, ly + 11 * s);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  const len = (narrow ? 46 : 80) * s;
  const ay = ly + 22 * s;
  arrow(ctx, vx - 8 * s, ay, vx - 8 * s - len, ay, IONS.K.colour, 0.9 * a, 2.4 * s, 8 * s);
  arrow(ctx, vx + 8 * s, ay, vx + 8 * s + len, ay, IONS.Na.colour, 0.9 * a, 2.4 * s, 8 * s);
  say(
    g,
    narrow ? 'K^{+} out' : 'potassium out',
    vx - 14 * s - len,
    ay,
    a,
    12,
    'right',
    IONS.K.colour
  );
  say(g, narrow ? 'Na^{+} in' : 'sodium in', vx + 14 * s + len, ay, a, 12, 'left', IONS.Na.colour);
  say(
    g,
    narrow
      ? `AMPA: ≈ ${mV(E_AMPA)}`
      : `the AMPA receptors' reversal potential: about ${mV(E_AMPA)}`,
    vx,
    ly + 40 * s,
    a,
    12,
    'center',
    mix(TRANSMITTER, L.ink, 0.3)
  );
}

const LABELS: Record<Physics2Step, string> = {
  stronger:
    'Close in on the channel, the membrane lined with pairs: potassium ions come up out through the channel one after another, each moving over to join those lining the membrane outside, a negative ion inside drawn to it; the field across the membrane sweeps down brighter and stronger.',
  clearance:
    'Back up at the synapse, backed out a little: either side of the cleft, a transporter on an astrocyte wrapped round it takes up the glutamate that wanders out. Below, a plot over 5 milliseconds: glutamate in the cleft, a spike gone within about a millisecond.',
  brief:
    'Back up at the channel, backed out a little; below, a plot over 15 milliseconds: the 5 milliseconds the channel is open are shaded, and the voltage rises only during them, then hardly falls.',
  resist:
    'The plot now shows only the voltage rising, three ways: fast through channels of little resistance, slower through more, and slower still through more again.',
  rc: "One rise of the voltage, a dashed line marking where it is 63% of the way up and when: the time constant τ, the open channels' resistance times the membrane's capacitance.",
  capacitance:
    'As before, and now the plot below gives way to the membrane as a capacitor: its two faces and the lipids between them, positive charge lining the outside and negative the inside, as much as it holds for 1 volt across it.',
  thickness:
    'As before, and now the membrane grows thinner, its thickness d marked, and more charge lines either side for the same 1 volt: the thinner the membrane, the greater its capacitance.',
  dielectric:
    "As before, and now the membrane's area A, its thickness d and the lipids' dielectric constant ε are named: C = ε × A / d.",
  ohm: 'The capacitor gives way to the plot of the rise again; now the reversal potential E dashed along the top, where the rise is headed; the gap from the voltage up to it marked, E − V; and the current through the channels, I = (E − V) / R, largest at first and falling as the gap closes.',
  charging:
    'As before, the reversal potential dashed along the top; two lines lie along the rising voltage, steep at first and shallower later: it rises at I / C, slowing as it nears E.',
  deactivation:
    "Back up at the synapse, the transporters at work, and below, the plot of glutamate in the cleft, now over 10 milliseconds; it adds the AMPA receptors' current, rising fast and falling within 1 to 3 milliseconds as the glutamate comes off them and their channels close.",
  desensitize:
    'As before, the plot now over 30 milliseconds: glutamate held in the cleft, dashed, and the AMPA current falling anyway within about 10 milliseconds; at the synapse, the AMPA receptors shut and grey while glutamate is still bound to them: desensitized.',
  factors:
    'The plot, over 15 milliseconds: the AMPA current at an auditory brainstem synapse, gone in under a millisecond; at a cortical or hippocampal synapse, 2 to 5 milliseconds; and, dashed, the same at room temperature, slower.',
  tau: "The plot, over 80 milliseconds: the brief AMPA current, and the voltage it makes, rising over a few milliseconds and falling over tens, with the membrane's time constant, τ = r_m c_m, about 20 milliseconds.",
  excess:
    "The view slides down onto the dendrite. Round the channel, the negative charges lining the dendrite's membrane inside, above and below, are neutralized one after another, the nearest first, part of the way along; the positive charges just outside them drift off.",
  rise: 'As before, and now the dendrite glows warm round the channel, and the membrane potential there rises from −72 to −45 millivolts.',
  repel:
    'Back down on the dendrite, close in; now the potassium ions in the dendrite by the channel, the most plentiful positive ions there, are shown, each pushed away from the charge collecting under it, down and out, an arrow on each.',
  along:
    "The view backs out along the dendrite, and potassium ions in it flow along it away from the synapse, both ways, again and again, each with a small arrow pushing the next, and a broad arrow out either side; positive charge collects on the dendrite's membrane along it, most near the synapse, the dendrite glowing warm there.",
  spread:
    'The view backs out a little and up; below it, a plot over 40 milliseconds of the membrane potential by the channel: up within a millisecond, then most of the way back down within a few, fast, as the charge spreads away along the dendrite.',
  leak: "As before, and now K⁺ leak channels along the dendrite's lower membrane, potassium ions leaking out through them now and then; on the plot, the slower part of the fall is named: potassium leaking out, with τ_m, about 10 to 30 milliseconds.",
  soma: 'As before, and now on the plot the same potential at the soma: about a fifth as high, peaking at about 6 milliseconds and falling slowly; after about 10 milliseconds the two fall alike, with τ_m.',
  decay:
    'As before, and now the membrane potential named at points along the dendrite either way, −59 millivolts nearer the synapse and −66 further off: the rise fades with distance.',
  unbind:
    'As before, and now on the plot the AMPA current, the EPSC, rising at once and decaying within a few milliseconds as the channels shut.',
  glutamate:
    'As before, close in on the synapse at work; the transmitter is now named glutamate, and the receptors AMPA receptors, sodium passing through them.',
  ampa: 'As before, and now, through the open AMPA receptors, potassium ions flow out of the dendrite into the cleft as sodium ions flow in, about as many each way.',
  cancel:
    "The view backs out a little and up; below it, a line of potentials from −100 millivolts to +80: potassium's reversal potential at −89, sodium's at +67, and the AMPA receptors' own marked between them, about 0 millivolts, with an arrow each way from it, potassium out and sodium in, as long as each other: the two currents cancel there.",
  activeChannels:
    "The potentials' line goes; beside the passive channels, two active channels appear in the membrane, opening and shutting again and again, each named.",
  closeUp:
    "The view closes in on one of them until it fills the figure: the membrane's two layers of lipids, heads out, and through them a protein, two halves round a pore — wide at the outside, narrow near it, wider in the middle, and shut near the inside — with a rod in the membrane beyond each half. It is named a protein, and its pore.",
  gate: 'As before, and now its gate, where the pore is shut near the inside, opens and shuts, again and again, and is named. While it is open, sodium ions pass down through the pore into the cell; while it is shut, they come to the mouth of the pore and go away again.',
  sensor:
    'As before, the gate shut again, and now the voltage sensors are picked out: beyond each half of the pore, in the membrane, a rod carrying four positive charges, joined by a linker under the channel to its gate. It is named a voltage-gated sodium channel.',
  held: 'As before, and now positive ions line the membrane outside and negative ions line it inside, and the field across the membrane between them is drawn as glowing arrows pointing in. Beside each sensor, an arrow shows the field pushing its positive charges inward; the membrane potential, in the corner, reads −70 millivolts.',
  rises:
    "As before, and now the membrane potential steps up to −20 millivolts and back, again and again, on a plot below too. As it rises, most of the ions lining the membrane drift off, the field's arrows and its push on the sensors fade, and the sensors slide outward; the gate opens with them.",
  activates:
    "As before, and now, while the gate is open, sodium ions flow in through the pore, and the channel's state is named beside it: open, or closed. On the plot, under the membrane potential, how open the channel is, rising soon after the step: activation.",
  deactivates:
    'As before, and now as the potential falls back the sensors slide in and the gate shuts; on the plot, the fall is named: deactivation.',
  secondGate:
    "As before, and now the channel's second gate is named: a ball on a tether, hanging from the inner end of the channel.",
  inactivates:
    'As before, and now, soon after the gate opens, the ball swings up into the inner mouth of the pore and plugs it while the potential stays up, so sodium stops flowing, and the channel is named inactivated. On the plot, its opening is brief, and the time it is plugged is shaded.',
  recovers:
    'As before, and now, after the potential falls back, the ball stays in the pore for a while, then swings out again; on the plot, the end of the shading is named: recovered.',
  tooSoon:
    'As before, and now a second step up comes soon after the first: the sensors move out and the gate opens, but the pore is still plugged, and no sodium flows. On the plot, no opening at the second step: too soon.',
  ligandGated:
    'The view backs out a little, slides along the membrane past the passive channels, and closes in on the ligand-gated channel: two halves round a pore, shut near the outside, each with two lobes above it and a binding site between them. Again and again, molecules of its ligand come down into the binding sites, and go; it and its ligand are named. The plot now shows the ligand bound, and how open the channel is.',
  binds:
    'As before: as the ligand binds, the lobes close on it, the gate opens, and sodium ions flow in; as it goes, the gate shuts. On the plot, the rise and the fall are named: activation and deactivation.',
  desensitizes:
    'As before, but now the ligand stays longer: soon after the channel opens, its lobes turn apart, it greys, and its gate shuts, though the ligand is still bound. On the plot, the time it is desensitized is shaded.',
  channelStates:
    "The view slides back along the membrane to the sodium channel, opening and being plugged as before. In the plot's place, the states: closed, open, and inactivated or desensitized, with arrows between them — activation and deactivation between closed and open, inactivation or desensitization from open, and recovery, slowly, back to closed — the state the channel is in lit.",
  chance:
    'The plot is back, and now, while the potential is up, the channel opens and shuts at random: three openings of different lengths, then it is plugged. On the plot, its opening is a run of square pulses.',
  together:
    'As before, and now on the plot, faintly, the openings of a few more such channels, each different, and in bold the share of 120 of them open: it rises smoothly soon after the step, then falls as they are plugged.',
  clamp:
    'In front of it all, two plots. Above, the membrane potential, held at rest and stepped to each of seven levels, from −60 to +90 millivolts, in shades of orange from light to dark. Below, the current through the sodium channels at each: inward, plotted down, rising to a peak within a millisecond and falling back as they inactivate — small at −60, largest near 0, almost none at +65, and outward, up, at +90. One step after another is picked out.',
  peakIV:
    "As before, and now each current's peak is dotted, and on the right the peaks are plotted against their potentials, a dot for each, and a curve drawn through them: near zero below −50 millivolts, dipping to its most inward near 0, and rising back through zero to outward above +67.",
  linear:
    'As before, and now a dashed straight line on the right, steep, through the point where the curve crosses zero: the current a constant conductance would pass. Near +67 millivolts and above, the curve follows it; lower, it falls away from it towards zero.',
  bends:
    'As before, and now above the curve, a second plot: the share of the channels open at each potential, from none below −60 millivolts, through about half at 0, to nearly all at +90. A cursor runs across both, a dot on each curve, and the share open times the driving force written beside it.',
  reverses:
    "As before, and now where the curve crosses zero, at sodium's reversal potential, about +67 millivolts, it is ringed and named: no current there.",
  spikes:
    'In front of the membrane, a plot of the membrane potential over 100 milliseconds: flat at rest, with four sharp spikes, each shooting up past 0 and falling back. A dot runs along it, and sodium’s and potassium’s reversal potentials and rest are marked as dashed lines.',
  oneSpike:
    'The plot closes in on the first spike, over 30 milliseconds: from rest at −72 millivolts it shoots up to about +58 within a millisecond, falls back below rest, and creeps back up.',
  inputs:
    'As before, and now green arrows under the trace mark three inputs from synapses, each lifting the potential a little; the third takes it into the spike.',
  threshold:
    'As before, and now a dotted line at the threshold, −55 millivolts, and, dashed, what the first two inputs alone do: lift the potential short of it, and fade away.',
  allOrNone:
    'The one run dimmed; in green, light to dark, the potential after one input of each of four sizes: the smallest lifts it a little and fades; the other three each fire the same spike, the bigger the input, the sooner.',
  gated:
    'The one run again, and under it now two plots: the conductances of sodium, in orange, rising fast at the spike and falling, and potassium, in purple, rising later and lasting longer. Under them, a strip of membrane with four sodium channels and four potassium channels, following the dot: as many open as the conductance says, ions passing through those open, sodium’s plugged by a ball after the spike.',
  upstroke:
    'As before, and now the rise is shaded and named, sodium rushing in, and beside it a cycle of three: the potential rises, more sodium channels open, more sodium flows in — lit while the potential is rising.',
  peak: 'As before, and now the peak is named, about +58 millivolts: the sodium channels inactivate and the potassium channels open.',
  downstroke:
    'As before, and now the fall is shaded and named, potassium flowing out, and the dip below rest after it.',
  refractory:
    'As before, and now the few milliseconds after the spike are shaded, the refractory period, and a strong input there, marked by a big green arrow, lifts the potential only a little: no spike.',
  actionPotential:
    'As before, the late input gone, and every part of the spike named together: the rise as sodium rushes in, the peak, the fall as potassium flows out, the dip below rest, and back to rest.',
  propagate:
    "The membrane gives way to two neurons: another neuron, upper left, its axon running across and down to this neuron's dendrite. A spike, a yellow glow, runs down the axon to it, again and again: the action potential, passed on.",
  pumpNeed:
    'The membrane again, the action potential going round as before, sodium ions passing in through the voltage-gated sodium channel and potassium ions out through the potassium channel; at the foot, what each spike moves.',
  pump: 'The view closes in on a protein in the membrane between the sodium channels, wider than a channel and with no pore through it: two halves round a cavity in its middle, open to the inside, and a foot under one half. It is named the sodium–potassium pump.',
  pumpCycle:
    'As before, and now its round, again and again: three sodium ions come into its cavity from inside; ATP docks at its foot, and as ADP leaves, a phosphate stays on; the halves turn to open to the outside, and the sodium ions leave there; two potassium ions come in from outside; the phosphate goes; the halves turn back, and the potassium ions leave inside. Arrows beside it: three sodium out, two potassium in.',
  electrogenic: 'As before, and now over it: one positive charge out, net, each round.',
  pumpEnergy: 'As before, and now by its foot: one ATP each round.',
  first: 'The other neuron goes, leaving this one, its dendrite running to its body at the right.',
  inject:
    'This neuron, its dendrite running to its body at the right. Two ways to inject current into it are shown and named: an electrode, a glass pipette with its tip at the body, and an ion channel in its dendrite, ringed.',
  channel:
    "The electrode goes, and the view dives in on the ion channel, set in the upper membrane of the dendrite's shaft, shut; it and the dendrite are named.",
  opens:
    'The view closes in on the channel; it opens, its two halves parting round a lit pore, and shuts again, again and again: open for about 5 milliseconds, slowed down here.',
  sodium:
    'As before, and now sodium ions pass in through the open channel, one after another, while a chloride ion runs at it and is turned away.',
  signal:
    "The view backs out from the dendrite to the whole of this neuron, and another neuron comes in, upper left, in blue, its axon running across and down to this neuron's dendrite, ending right on its shaft. A spike, a yellow glow, runs down the axon to the synapse, again and again.",
  synapse:
    "Where the axon meets the dendrite is ringed and named a chemical synapse; the view dives in on it: the other neuron's presynaptic terminal, full of vesicles, a narrow synaptic cleft, and the shaft of this neuron's dendrite, receptors set in its membrane.",
  release:
    'Close in on the synapse: a spike arrives down the axon and the terminal flashes; a vesicle fuses with its membrane and empties its neurotransmitter into the cleft, the molecules spreading through it and gone; and again.',
  bind: "The view closes in on the cleft and the dendrite under it; the molecules cross the cleft, two binding to each receptor in the dendrite's membrane, which glow, then let go; and again.",
  opening:
    "As before, and now, bound, each receptor's channel opens, its two halves parting round a lit pore, then closes as the transmitter lets go; and again.",
  inflow:
    'As before, and now sodium ions from the cleft pass through the open channels into the dendrite, one after another, while a chloride ion runs at one and is turned away; and again.',
  water:
    'The same membrane, with the outside named above and the inside below, both filling with water molecules, each a blue oxygen with two paler blue hydrogens: neutral H₂O, tumbling slowly.',
  voltage:
    "The whole membrane, lined with pairs, potassium's concentrations named each side. Two points are marked either side of the potassium channel, A outside and B inside, joined by a dashed line, labelled with the voltage between A and B.",
  depends:
    'The field across the membrane, as before. Two points are marked either side of the channel, A outside and B inside, joined by a dashed line, labelled with the voltage between A and B.',
  work: 'The two points, as before: a positive charge is carried from point B inside up to point A outside, against the field, again and again; beside A a bar fills with the work done on it, 1.43 × 10⁻²⁰ joules.',
  volts:
    'The two points, as before: a positive charge is carried from point B inside up to point A outside, against the field, again and again, and beside A a bar fills with the work done on it, 1.43 × 10⁻²⁰ joules. Then the badge gives the voltage between A and B, 89 millivolts: 1.43 × 10⁻²⁰ joules of work for a charge of 1.60 × 10⁻¹⁹ coulombs is 0.089 volts, a volt being a joule per coulomb.',
  potential:
    'The bar gone, a positive charge is carried the other way, from A outside down to B inside, again and again, an arrow ahead of it; the badge now reads membrane potential: the work done, per coulomb, to move a positive charge from outside to inside.',
  freeIn:
    "The two points, as before, and the positive charge moving from A outside down to B inside, again and again, now pulled in by the field rather than carried: an arrow in the field's colour ahead of it, and a glow growing round it as it gives up energy. Beside the channel a bar fills with the energy released, 1.43 × 10⁻²⁰ joules.",
  negative:
    'As before, the charge pulled in from A to B and the bar filling; the bar now reads the work done on the charge, −1.43 × 10⁻²⁰ joules, negative, and the badge the membrane potential, −89 millivolts: that work per unit of charge.',
  surplus:
    'The charge and its bar gone: the negative charge lining the inside of the membrane glows blue, named surplus negative charge inside the cell, and the badge still reads the membrane potential, −89 millivolts.',
  potentialEnergy:
    "The blue glow gone: a positive charge sits at each point, A outside and B inside, each point's name now giving the potential energy the charge has there, U_out and U_in; below, the words: a positive charge's potential energy, inside and outside.",
  stored:
    'As before; the charge at A, outside, now glows, with an arrow pointing in through the channel: it has 1.43 × 10⁻²⁰ joules of potential energy to be released coming in. The charge at B, inside, has none.',
  perCharge:
    'As before; below, the difference worked out: (U_in − U_out) / q = −1.43 × 10⁻²⁰ joules ÷ 1.60 × 10⁻¹⁹ coulombs = −0.089 volts, −89 millivolts, and the badge reading the membrane potential, −89 millivolts, lights up.',
  equilibrium:
    "The points gone, two arrows beside the channel, as strong as each other: diffusion pushing potassium out and the field pushing it back in. A plate in the top corner names the membrane potential at which they balance: potassium's equilibrium, or reversal, potential, E_K.",
  reversal:
    "The two pushes balanced at the channel, as before; the plate in the corner now gives E_K's value, −89 millivolts: negative, the inside lined with negative charge whose field pulls potassium ions back in.",
  energy:
    'The pushes gone: a potassium ion is drawn in through the channel, a glow spreading from the pore as it releases 1.43 × 10⁻²⁰ joules; then one is carried out through it, pushed, needing as much; and again, by turns.',
  noNet:
    'The two pushes balanced at the channel again; the plate adds the membrane potential, −89 millivolts, marked on a line from −120 millivolts to 0 at the same place as E_K; potassium ions cross the channel by turns, one out, one in: no net flow.',
  specific:
    "As before; potassium's concentrations, 140 mM inside and 5 mM outside, are picked out, and E_K is named in potassium's colour: it is set by potassium's own concentrations.",
  differs:
    "The membrane potential moves along the plate's line, up to −60 millivolts, back to −89, down to −118, and back; the field's push shrinks and grows with it, and a broad arrow through the channel shows the net flow: out while the membrane potential is above E_K, in while below, none at E_K.",
  example:
    "The membrane potential rises to −70 millivolts, less negative than E_K at −89: the field's push is shorter than diffusion's, and a broad arrow through the channel shows potassium flowing out of the cell. As it does, the membrane potential falls back to −89 millivolts, the arrow shrinking until there is no net flow; and again.",
  kinds:
    'The pushes and potentials go: every ion is back in its own colour, sodium, potassium, chloride and the large negative molecules, with their key, positive ions and negative.',
  each: "Each side's concentrations, in each ion's colour: outside the cell, sodium 145 mM, potassium 5 and chloride 110; inside the neuron, sodium 12 mM, potassium 140 and chloride 10, and large negative molecules.",
  reversals:
    "Over each channel, its ion's reversal potential, in that ion's colour: the sodium channel's +67 millivolts, the potassium channel's −89 and the chloride channel's −64.",
  pulls:
    "Across the top, a line from −100 millivolts to +80 with the three reversal potentials marked on it, and the membrane potential under it. In rows below, arrows show each ion's pull on the membrane potential, towards its own reversal potential: knocked up to −30 millivolts or down to −110, the pulls no longer balance and draw it back, until they balance again at −72.",
  nearer:
    "At rest, as before: along the line, a short band in potassium's colour from the resting potential, −72 millivolts, to potassium's reversal potential, 17 millivolts away, and a long one in sodium's to sodium's, 138 millivolts away. Under the channels: potassium, many channels open; sodium, few.",
  weighted:
    "At rest, −72 millivolts, the pulls balanced; beside each its weight, its permeability relative to potassium's: potassium 1, sodium 0.12, chloride 0.1. The resting potential is the average of the reversal potentials, weighted so: (1 × −89 + 0.12 × 67 + 0.1 × −64) ÷ 1.22.",
  buildup:
    "As before, potassium's concentrations named each side: now pairs line the membrane one after another, potassium ions outside and negative ions inside, the charge building up; the arrow of diffusion gives way to two beside the channel, diffusion pushing potassium out and the field pushing it back in, growing until they are as strong as each other.",
  determine:
    "The view backs out from the channel to the whole membrane, lined with pairs, potassium alone, no words on the figure: the field across the membrane as three lines sweeping through it, and now and then a potassium ion through the open channel, out or in. Two sliders under it set potassium's concentration inside the neuron and outside it, 5 to 150 mM: the potassium ions each side follow them, and how often they cross each way follows at once; the pairs lining the membrane, and the field's lines, catch up until as many cross each way — fewer as the two concentrations come closer, none when they are the same, and the other way round, potassium inside and the lines sweeping up, when there is more outside.",
  rate: "The view backs out from the channel to the whole stretch of membrane. Potassium's concentration is named on each side, 140 mM inside the neuron and 5 mM outside, 28 times as much inside; the ions jostle at random, and a broad arrow beside the open potassium channel, named diffusion, points out of the cell.",
  enter:
    'The pairs still line the membrane with their field across it, down through the channel. A potassium ion outside comes down to the channel, is drawn through it, quickening, and into the cell.',
  balance:
    'The pairs still line the membrane with their field across it. Beside the channel, two arrows of the same length: one pointing up and out, in the colour of potassium, labelled potassium diffuses out; one pointing down and in, in the colour of the field, labelled the field pushes it back in. They balance out: no net flow of potassium.',
  lipids:
    'A short piece of cell membrane, two layers of lipids, drawing in; a lens over a few lipids shows each a round head with two fatty tails, the layers back to back.',
  membrane:
    'The same piece of membrane, the outside of the cell named above it and the inside of the neuron below: the membrane keeps them apart.',
  charges:
    'Twelve ions on each side of the membrane, each kind in its own colour, positive and negative on both sides: outside, mostly sodium and chloride; inside, mostly potassium and large negative molecules.',
  barrier:
    'Ions running at the membrane from either side, in turn — a chloride and a sodium ion from outside, a potassium ion from inside — and bouncing off it: its fatty core keeps out charged ions.',
  forces:
    'Three pairs of ions taken aside from the rest: two positive ions pushing apart, two negative ions pushing apart, and a negative and a positive ion pulling together.',
  flow: 'The ions inside sorted, positive to the left and negative to the right: an imbalance. Then they flow, the positive ones pushing apart and the negative pulled towards them, until they are mixed and balanced again.',
  neutral:
    'The ions on both sides, mixed: six positive charges and six negative on each, so the inside and the outside of the cell are both neutral.',
  potassium: "The same ions, potassium's in violet and all the others greyed into the background.",
  gradient:
    'The ions at their real proportions: 28 potassium ions inside the neuron to 1 outside, as 140 mM is to 5 mM; the other ions, grey, fill in so that each side stays neutral.',
  channels:
    "Three channels set into the membrane, each letting through one kind of ion: sodium's, potassium's and chloride's.",
  selective:
    'All three channels open, each in its own colour: in turn, a sodium ion passes in through the sodium channel, a potassium ion out through the potassium channel and a chloride ion in through the chloride channel, while an ion of another kind runs at each and bounces off.',
  gating:
    'The three channels opening and closing in turn, each named open or closed as it goes: a channel has an open state and a closed state.',
  passive:
    'The other two channels open beside the potassium channel, and all three stay open, each named open: passive channels, whose permeability stays the same.',
  moving:
    'Every ion jostling about at random, a ring wherever a potassium ion bumps into another; the channels still open.',
  moreOut:
    'As before: one potassium ion has left the cell. Outside, one more positive charge than negative. One negative ion inside, near the membrane, is now in its own colour.',
  moreIn:
    'As before: inside, one more negative charge than positive. One negative ion inside, near the membrane, is in its own colour.',
  imbalance:
    'The potassium ions inside grey, all but one, which leaves through the open channel and comes to rest close by the membrane outside, not touching it: now the inside holds one more negative charge than positive, and the outside one more positive than negative. One negative ion inside, near the membrane, is shown in its own colour.',
  fieldK:
    'Closer in on the pair: ripples spread out from the potassium ion, pulse after pulse, its electric field. Other potassium ions outside come towards it, slow as they near it, and are pushed back out; nearby positive ions are pushed away from it, each with an arrow showing which way.',
  across:
    'The same pair, close in, the potassium ion outside and the negative ion inside: between them, faint lines of their field run from the one to the other, straight down through the membrane and bowing out to either side, and straight amber lines sweep down along them from outside to inside, each as wide as the field where it is — their field together, across the membrane.',
  sheet:
    'Many pairs line the membrane, potassium ions outside and negative ions inside, one after another outwards from the first; and long straight amber lines, their field, sweep down through the membrane from outside to inside, all along it and through the channel too.',
  pushed:
    'The pairs and their field, as before: now a potassium ion comes up into the channel from inside, is pushed back by the field, and falls back into the cell.',
  fieldDef:
    'Close in on the potassium ion outside: its electric field drawn as arrows all round it, pointing away from it and shorter further off; a unit positive charge is set down at one point after another, a bold arrow showing the force on it there, which is the field at that point.',
  fieldN:
    'The same pair, the view lowered onto the negative ion inside: ripples close in on it, pulse after pulse, its field pointing in. Potassium ions inside are drawn in towards it, faster the nearer they come, and rest against it a while; nearby positive ions are pulled towards it, each with an arrow.',
  attract:
    "Close in on the potassium channel and the membrane: the potassium ion that left, just outside, draws a negative ion inside to the membrane's inner surface opposite it — opposite charges attract each other across the membrane.",
  uncharged:
    'Potassium ions imagined without charge, their plus signs gone: through the open channel they spread out of the cell, one after another, while those left inside spread out evenly, until the two sides hold about as many — 15 inside, 14 outside — the counts kept beside them.',
  charged:
    "The spreading undone, back through the channel to 28 potassium ions inside and 1 outside; then each one's plus sign back, a ring spreading round it: each potassium ion carries a positive charge.",
  net: 'Potassium ions through the open channel, out and in, counted; a broad arrow beside the channel shows the net movement out of the cell, with how many more have gone out than in.',
  term: 'The same: potassium ions now and then through the open channel, far more often out than in; a broad arrow beside it shows the net flow out, named diffusion — random motion carrying ions from where they are many to where they are few.',
  random:
    "Potassium's channel open, the ions still jostling: now and then a potassium ion near the channel wanders through it — far more often out than in, there being so many more inside — and a count of each is kept.",
  diffusion:
    "Potassium's channel open, the others closed: one potassium ion, jostled about at random, bumps the membrane beside the channel, finds the open pore and passes through it, out of the cell.",
};

export default function Physics2Figure({
  step,
  back = false,
}: {
  step: Physics2Step;
  back?: boolean;
}) {
  // what plays out once waits for the slide's words: its clock is held while they type, unless the slide was come back to
  const held = useRef({ step: '', at: 0, back: false, opened: 0 });
  // potassium's concentrations as the reader sets them on the slide about what they determine, mM; and, for the figure,
  // as drawn, eased towards them, the charge they line the membrane with slower, catching up
  const [set, setSet] = useState<{ cin: number; cout: number }>({
    cin: CONC.K.in,
    cout: CONC.K.out,
  });
  const chosen = useRef(set);
  const eased = useRef({
    ...AS_IS,
    at: 0,
    // and the potassium ions through the channel: how soon the next each way, out and in, as a share of the time
    // between them; those on their way, and when each set off; and those, as drawn
    due: [0.3, 0.8],
    count: 0,
    rnd: mulberry32(53),
    crossers: [] as (Omit<Crossing, 'age'> & { born: number })[],
    crossing: [] as Crossing[],
  });
  const choose = (next: { cin: number; cout: number }) => {
    chosen.current = next;
    setSet(next);
  };
  return (
    <StepCanvas
      step={step}
      back={back}
      label={LABELS[step]}
      done={DONE}
      pose={(st, t) => {
        const h = held.current;
        if (h.step !== st) Object.assign(h, { step: st, at: 0, back: t >= DONE });
        if (!h.back && Number.isFinite(t) && document.querySelector('main .typing-caret')) h.at = t;
        if (st !== 'determine') return poseFor(st, t, Number.isFinite(t) ? t - h.at : t);
        const e = eased.current;
        const now = performance.now();
        // (at once with reduced motion)
        const dt = Number.isFinite(t) ? Math.min(100, now - e.at) : Infinity;
        e.at = now;
        const move = (v: number, to: number, by: number) =>
          Math.abs(to - v) <= by ? to : v + Math.sign(to - v) * by;
        // eased there, but no slower than `least` a ms, so as to get there
        const toward = (v: number, to: number, ms: number, least: number) =>
          move(v, to, Math.max(Math.abs(to - v) * (1 - Math.exp(-dt / ms)), least * dt));
        e.cin = toward(e.cin, chosen.current.cin, 160, 0.02);
        e.cout = toward(e.cout, chosen.current.cout, 160, 0.02);
        e.charge = toward(e.charge, Math.log(e.cin / e.cout) / Math.log(RATIO), 650, 0.0003);
        // and the first pair parting, or coming together again, over 1.5 s, as the charge falls below one pair's worth
        // or rises above it
        e.lone = move(e.lone, e.charge > ONE_PAIR ? 1 : 0, dt / 1500);
        // potassium ions through the channel, each way as often as the concentration it comes from and the membrane
        // potential make it — as often as each other at the equilibrium potential — but nearer alike (their square roots),
        // lest it grow too busy or too bare; none with reduced motion
        if (Number.isFinite(dt)) {
          const off = (E_K * e.charge - E_K) / KT / 2;
          const rates = [
            (e.cin / CONC.K.in) * Math.exp(off),
            (e.cout / CONC.K.out) * Math.exp(-off),
          ];
          for (const way of [0, 1]) {
            e.due[way] -= (dt / CROSSING_MS) * Math.sqrt(rates[way]);
            if (e.due[way] > 0) continue;
            e.due[way] = 0.5 + e.rnd();
            const side = e.rnd() < 0.5 ? -1 : 1;
            e.crossers.push({ born: now, inward: way === 1, side, j: e.count++ });
          }
        }
        e.crossers = e.crossers.filter((c) => now - c.born < 2400);
        e.crossing = e.crossers.map(({ born, ...c }) => ({ ...c, age: now - born }));
        return poseFor(st, t, Number.isFinite(t) ? t - h.at : t, e);
      }}
      draw={(f, P) => {
        // when potassium's channel opened on the slide about its flux — 800 ms after the words typed — by the page's
        // clock: what its count counts from, kept for the slide after
        const h = held.current;
        if (f.step === 'random') h.opened = f.now - (Number.isFinite(f.t) ? f.t - h.at - 800 : 0);
        drawFigure(f, P, h.opened, eased.current.crossing);
      }}
      below={
        step === 'determine' && (
          // let go of with the pointer, a slider gives the arrow keys back to the slides
          <div
            className="mx-auto grid w-full max-w-md grid-cols-2 gap-x-6 px-2 pt-2"
            onPointerUp={() => (document.activeElement as HTMLElement | null)?.blur()}
          >
            <Slider
              label="potassium inside"
              value={set.cin}
              min={SETTABLE[0]}
              max={SETTABLE[1]}
              step={PER_ION}
              unit=" mM"
              accent="accent-violet-600"
              onChange={(cin) => choose({ ...set, cin })}
            />
            <Slider
              label="potassium outside"
              value={set.cout}
              min={SETTABLE[0]}
              max={SETTABLE[1]}
              step={PER_ION}
              unit=" mM"
              accent="accent-violet-600"
              onChange={(cout) => choose({ ...set, cout })}
            />
          </div>
        )
      }
    />
  );
}
