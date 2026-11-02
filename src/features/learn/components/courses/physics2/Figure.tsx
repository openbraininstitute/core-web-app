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
  'signal',
  'synapse',
  'release',
  'inflow',
  'glutamate',
  'ampa',
  'cancel',
  'excess',
  'repel',
  'along',
  'decay',
  'clearance',
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
  /** The membrane giving way to two neurons, each named; a spike running down the one's axon to the other; where they
   * meet, named a synapse; the view diving in on it, and its parts named; the transmitter released and bound; and the
   * receptors' channels open, ions flowing in. */
  scene: number;
  cells: number;
  spike: number;
  contact: number;
  dive: number;
  parts: number;
  release: number;
  inflow: number;
  /** The transmitter named glutamate, and its receptors AMPA and NMDA, the NMDA one darker; potassium flowing out
   * through the AMPA receptors as sodium flows in; the view backing out a little to make room below; and there, the
   * two currents on a line of potentials, cancelling between the two reversal potentials. */
  glutamate: number;
  kout: number;
  room: number;
  currents: number;
  /** The view sliding down onto the spine and the dendrite; positive charge collecting inside the spine's membrane,
   * that outside pushed off, and the potential there rising; the potassium ions nearest pushed away from it; and those
   * in the dendrite pushed along it, both ways. */
  low: number;
  excess: number;
  repelled: number;
  axial: number;
  /** Positive charge collecting on the dendrite's membrane along it, thinning with distance; and potassium leaking out
   * through its channels on the way, the rise in potential named at points along it, falling off. */
  accum: number;
  leaks: number;
  /** How fast it all happens: a plot below the synapse, its time axis `span` ms long; glutamate cleared from the cleft
   * by transporters; the AMPA receptors' current; glutamate held, and the receptors desensitized; how the decay differs
   * from synapse to synapse and with temperature; and the voltage, slower, charging the membrane. */
  kinetics: number;
  span: number;
  clear: number;
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
/** The synapse close in, at work, its receptors opening: as the slide about that leaves it. */
const SYNAPSE_OPEN: Partial<Pose> = {
  scene: 1,
  cells: 1,
  dive: 1,
  parts: 1,
  spike: 1,
  release: 1,
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
    scene: 0,
    cells: 0,
    spike: 0,
    contact: 0,
    dive: 0,
    parts: 0,
    release: 0,
    inflow: 0,
    glutamate: 0,
    kout: 0,
    room: 0,
    currents: 0,
    low: 0,
    excess: 0,
    repelled: 0,
    axial: 0,
    accum: 0,
    leaks: 0,
    kinetics: 0,
    span: 5,
    clear: 0,
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
    case 'signal':
      // the membrane giving way to two neurons as the slide opens, each named; once the words have typed, a spike
      // running down the other neuron's axon to this one, again and again
      Object.assign(P, AT_REST, { scene: 1 });
      P.cells = phase(typed, 0, 600);
      P.spike = phase(typed, 300, 400);
      break;
    case 'synapse':
      // the two neurons, as left; once the words have typed, where they meet named, then the view diving in on it —
      // the other neuron's terminal, the cleft and the spine on this one's dendrite — and those named
      Object.assign(P, AT_REST, { scene: 1, cells: 1 });
      P.contact = phase(typed, 200, 500);
      P.dive = phase(typed, 1300, 2600);
      P.parts = phase(typed, 3700, 700);
      break;
    case 'release':
      // close in, as left; once the words have typed, a spike arriving at the terminal, a vesicle emptying, and the
      // transmitter crossing the cleft to bind to the receptors on the spine, again and again
      Object.assign(P, AT_REST, { scene: 1, cells: 1, dive: 1, parts: 1 });
      P.spike = phase(typed, 200, 400);
      P.release = P.spike;
      break;
    case 'inflow':
      // as left; once the words have typed, the bound receptors' channels opening, sodium ions flowing through them
      // into the spine, and a chloride ion turned away
      Object.assign(P, AT_REST, { scene: 1, cells: 1, dive: 1, parts: 1, spike: 1, release: 1 });
      P.inflow = phase(typed, 200, 500);
      break;
    case 'glutamate':
      // as left; once the words have typed, the transmitter named glutamate, and the receptors AMPA and NMDA — sodium
      // now through the AMPA ones only
      Object.assign(P, AT_REST, SYNAPSE_OPEN);
      P.glutamate = phase(typed, 200, 700);
      break;
    case 'ampa':
      // as left; once the words have typed, potassium flowing out through the AMPA receptors as sodium flows in
      Object.assign(P, AT_REST, SYNAPSE_OPEN, { glutamate: 1 });
      P.kout = phase(typed, 200, 600);
      break;
    case 'cancel':
      // as left; once the words have typed, the view backing out a little and up, and below it the two currents on a
      // line of potentials, pulling towards their reversal potentials and cancelling near 0 mV
      Object.assign(P, AT_REST, SYNAPSE_OPEN, { glutamate: 1, kout: 1 });
      P.room = phase(typed, 200, 1200);
      P.currents = phase(typed, 900, 800);
      break;
    case 'excess':
      // the line of potentials going, the view sliding down onto the spine and its dendrite as the slide opens; once the
      // words have typed, positive charge collecting inside the spine's membrane, that outside pushed off, the potential
      // there rising
      Object.assign(P, AT_REST, SYNAPSE_OPEN, { glutamate: 1, kout: 1 });
      P.low = phase(t, 0, 1400);
      P.excess = phase(typed, 200, 1800);
      break;
    case 'repel':
      // as left; once the words have typed, the potassium ions in the spine, and the nearest pushed away
      Object.assign(P, AT_REST, SYNAPSE_OPEN, { glutamate: 1, kout: 1, low: 1, excess: 1 });
      P.repelled = phase(typed, 200, 900);
      break;
    case 'along':
      // as left; once the words have typed, the potassium ions in the dendrite pushed along it, both ways
      Object.assign(P, AT_REST, SYNAPSE_OPEN, {
        glutamate: 1,
        kout: 1,
        low: 1,
        excess: 1,
        repelled: 1,
      });
      P.axial = phase(typed, 200, 700);
      P.accum = phase(typed, 900, 1600);
      break;
    case 'decay':
      // as left; once the words have typed, potassium channels along the dendrite, potassium leaking out through them,
      // and the potential named at points along it, falling off with distance from the synapse
      Object.assign(P, AT_REST, SYNAPSE_OPEN, {
        glutamate: 1,
        kout: 1,
        low: 1,
        excess: 1,
        repelled: 1,
        axial: 1,
        accum: 1,
      });
      P.leaks = phase(typed, 200, 800);
      break;
    case 'clearance':
      // back up to the synapse, backed out a little to make room below; once the words have typed, transporters either
      // side of the cleft taking up the glutamate, and below, how soon it is gone from the cleft
      Object.assign(P, AT_REST, SYNAPSE_OPEN, { glutamate: 1, kout: 1, room: 1, span: 5 });
      P.kinetics = phase(typed, 200, 700);
      P.clear = phase(typed, 400, 700);
      break;
    case 'deactivation':
      // as left; once the words have typed, the receptors' current, falling as glutamate comes off them
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
  'signal',
  'synapse',
  'release',
  'inflow',
  'glutamate',
  'ampa',
  'cancel',
  'excess',
  'repel',
  'along',
  'decay',
  'clearance',
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

  // close in on the potassium channel, on the slide about the attraction across the membrane: all that is drawn of
  // the membrane, its channels and its ions larger, round the channel; the words over it stay as they are
  // — and, on the slides about each ion's field, closer still, centred on the pair a little way along from it
  const pairDx = (narrow ? 44 : 70) * u;
  // twice as close as it was first drawn (2.4, then 1.4 times that): close enough on slides 20 to 23, with ions to spare
  const zoom = lerp(1, 4.8, P.zoom) * lerp(1, 1.4, P.closer) * lerp(1, ON_CHANNEL, P.onChannel);
  // and on the last of them, the pairs lining the membrane, back over the channel the ion tries
  const zx = w / 2 + P.closer * pairDx * (1 - P.recentre);
  // and, on the negative ion's field's slide, lowered onto it
  const zy = y + P.lower * LOWER * u;
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
  if (P.water > 0.01) drawWater(g, y, x0, x1, face, P.water, narrow);
  // the membrane: its lipids — or, from the slide about a channel open on, faded to two plain lines, its two faces,
  // broken where the channels are, and as thin however close in
  if (P.drawn > 0.01) {
    const gaps = P.channels > 0.01 ? pores : [];
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
          a * lerp(1, 0.6, P.onChannel)
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
      const faded = 0.9 * shown * lerp(1, 0.6, P.onChannel);
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
    P.listed * (1 - P.marked) * (1 - P.panel)
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
    P.nearer
  );
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
  if (P.sides * (1 - P.zoom) > 0.01) {
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
    const listShown = 0.95 * P.sides * swap(P.listed) * (1 - P.zoom);
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
      ctx.globalAlpha = 0.85 * P.nearer;
      ctx.fillStyle = rgba(L.page, 1);
      ctx.beginPath();
      ctx.roundRect(left - 6 * u, ly - 11 * u, width + 12 * u, 22 * u, 8 * u);
      ctx.fill();
      ctx.globalAlpha = 1;
      say(g, text, left, ly, 0.95 * P.nearer, 12.5, 'left', IONS[ion].colour);
    }
  // the key, where the basic course's slide has its own: each kind in its colour, the positive ones and the negative
  if (P.key > 0.01) drawKey(g, P.key, narrow, own, P.dock);
  // and, on the last slides, the potentials, in the same corner
  if (P.plate > 0.01) drawPotentials(g, P, narrow, plateTop);
  // and, on the slides about every kind of ion, the reversal potentials' pulls, across the top
  if (P.panel > 0.01) drawPulls(g, P, narrow, x0, x1);
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
function drawPulls(g: G, P: Pose, narrow: boolean, x0: number, x1: number) {
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
      ctx.globalAlpha = 0.35 * a * P.nearer;
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
    a * (1 - P.weighted),
    12.5,
    'center'
  );
  say(
    g,
    `${narrow ? 'resting' : 'resting potential'}: ${value}`,
    mid,
    tiers[0],
    a * P.weighted,
    12.5,
    'center'
  );
  // each one's pull, from the marker towards its reversal potential, and, last, what they come to
  const k = (narrow ? 1.6 : 2.6) * s;
  const reach = (narrow ? 95 : 150) * s;
  let net = 0;
  const rows: [string, string, RGB, number][] = PASSING.map((ion) => {
    const pull = G_REST[ion] * (EQUILIBRIUM[ion] - P.vm);
    net += pull;
    return [IONS[ion].name, `${IONS[ion].name} ×${G_REST[ion]}`, IONS[ion].colour, pull];
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
/** The receptors on the spine's head: how far along it from its middle, in q. */
const RECEPTORS = [-3.6, 0, 3.6];
/** The spine's head, an ellipse: its middle below the cleft's, and its half-width and half-height, all in q. */
const HEAD = { y: 6.5, rx: 6.5, ry: 4.5 };
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
/** The other spines along the dendrite: how far along from the synapse's, as a share of the figure's width, and which
 * side, up (−1) or down (1). */
const SPINES: [number, number][] = [
  [-0.24, -1],
  [-0.12, -1],
  [0.12, -1],
  [0.22, -1],
  [-0.17, 1],
  [0.06, 1],
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
 * the other neuron's body; this one's, and its dendrite's line; and the axon's course — out of the one body, across,
 * and down into the terminal from straight above.
 */
function synapseSite(w: number, h: number, u: number) {
  // (from afar, the neurons as large as the figure has room for; close in, the same synapse whatever this is)
  const q = 1.8 * Math.max(u, 0.75);
  const C: [number, number] = [0.56 * w, 0.5 * h];
  const pre: [number, number] = [0.13 * w, 0.24 * h];
  const shaft = C[1] + 16.7 * q;
  const axon: [number, number][] = [
    [pre[0] + 11 * q, pre[1] + 5 * q],
    [pre[0] + 0.24 * w, pre[1] - 10 * q],
    [C[0] - 1.8 * q, C[1] - 70 * q],
    [C[0] - 1.8 * q, C[1] - 13.6 * q],
  ];
  return { q, C, pre, post: [0.9 * w, shaft + 4 * q] as [number, number], shaft, axon };
}

/**
 * Two neurons and the chemical synapse between them. Another neuron, upper left, in blue, its axon running across and
 * down to a spine on this neuron's dendrite, which runs to its body at the right; a spike, a glow, running down the axon
 * to the synapse. Then the view dives in on it, as far as fills the figure: the other neuron's terminal, full of
 * vesicles of transmitter; the narrow cleft; and the spine's head, with receptors in its membrane. Then, again and
 * again, a spike arriving, a vesicle emptying, the transmitter crossing the cleft and binding to the receptors; and,
 * bound, their channels opening — sodium ions flowing through into the spine, a chloride ion turned away.
 */
function drawSynapse(g: G, P: Pose, narrow: boolean) {
  const { ctx, w, h, L, u } = g;
  const a = P.scene;
  const { q, C, pre, post, shaft, axon } = synapseSite(w, h, u);
  // the camera: from the whole of both neurons, diving in on the synapse, as far as fills the figure's height with it
  // from the axon arriving to the dendrite, the cleft a little above the middle
  // — and, on the slide about the two currents cancelling, backing out a little and up, to make room below
  const qz = Math.min(10, (h - 24) / 34);
  const full = qz / q;
  const dived = full ** P.dive;
  const e = (dived - 1) / (full - 1);
  const Z = dived * full ** (-0.24 * P.room);
  // — and, on the slides about the charge it lets in, sliding down onto the spine and its dendrite
  const [ox, oy] = [
    lerp(C[0], w / 2, e),
    lerp(C[1], h / 2 - (2.6 + 5.4 * P.low) * q * Z - 0.19 * h * P.room, e),
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
  // the spine's head: where on it each receptor sits, and which way it faces — straight out of the head
  const [hx, hy] = [C[0], C[1] + HEAD.y * q];
  const receptors = RECEPTORS.map((dx) => {
    const t = -Math.acos(dx / HEAD.rx);
    return {
      x: hx + HEAD.rx * q * Math.cos(t),
      y: hy + HEAD.ry * q * Math.sin(t),
      turn: Math.atan2(Math.sin(t) / HEAD.ry, Math.cos(t) / HEAD.rx) + Math.PI / 2,
    };
  });
  // where a point given in a receptor's own frame is — q along its face, and q in (out, to the cleft, is negative)
  const onReceptor = (i: number, along: number, inward: number): [number, number] => {
    const { x, y, turn } = receptors[i];
    const [c, s] = [Math.cos(turn), Math.sin(turn)];
    return [x + (along * c - inward * s) * q, y + (along * s + inward * c) * q];
  };
  // (desensitized, they close early, the glutamate still bound)
  const opened = P.inflow * bump(tc, ARRIVES + 850, lerp(4400, 3400, P.desens), 220);
  const desensitized = P.desens * bump(tc, 3300, 4600, 220);
  const gap = (0.2 + 0.75 * opened) * q;
  const fused = P.release * bump(tc, ARRIVES + 60, 4900, 220);
  const bound = P.release * bump(tc, ARRIVES + 650, 4600, 220);

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(Z, Z);
  ctx.translate(-C[0], -C[1]);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const shape = (path: Path2D | null, fill: string, edge: string) => {
    ctx.globalAlpha = a;
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
    edge: string
  ) => {
    const d = Math.hypot(x1 - x0, y1 - y0) || 1;
    const [nx, ny] = [-(y1 - y0) / d, (x1 - x0) / d];
    ctx.beginPath();
    ctx.moveTo(x0 + (nx * w0) / 2, y0 + (ny * w0) / 2);
    ctx.lineTo(x1 + (nx * w1) / 2, y1 + (ny * w1) / 2);
    ctx.lineTo(x1 - (nx * w1) / 2, y1 - (ny * w1) / 2);
    ctx.lineTo(x0 - (nx * w0) / 2, y0 - (ny * w0) / 2);
    ctx.closePath();
    shape(null, fill, edge);
  };

  // this neuron: its dendrite along the figure, thinning to its left end; its spines; its body at the right, an apical
  // dendrite going up from it
  const left = 0.22 * w;
  ctx.beginPath();
  ctx.moveTo(left, shaft - 1.8 * q);
  ctx.lineTo(post[0], shaft - 2.6 * q);
  ctx.lineTo(post[0], shaft + 2.6 * q);
  ctx.lineTo(left, shaft + 1.8 * q);
  ctx.arc(left, shaft, 1.8 * q, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.closePath();
  shape(null, thisFill, thisEdge);
  for (const [along, side] of SPINES) {
    const x = C[0] + along * w;
    const tip = shaft + side * 5.4 * q;
    branch(x, shaft + side * 1.4 * q, x, tip, 0.9 * q, 0.8 * q, thisFill, thisEdge);
    ctx.beginPath();
    ctx.ellipse(x, tip + side * 1.2 * q, 2 * q, 1.6 * q, 0, 0, Math.PI * 2);
    shape(null, thisFill, thisEdge);
  }
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
  // the spine at the synapse, larger: a neck up out of the dendrite and a head, its membrane facing the cleft — its fill
  // over the dendrite's edge where they join, its outline open there
  const neck = 1.1 * q;
  const t0 = Math.acos(neck / (HEAD.rx * q));
  const spine = new Path2D();
  spine.moveTo(hx - neck, shaft - 1.2 * q);
  spine.lineTo(hx - neck, hy + HEAD.ry * q * Math.sin(Math.PI - t0));
  spine.ellipse(hx, hy, HEAD.rx * q, HEAD.ry * q, 0, Math.PI - t0, 2 * Math.PI + t0);
  spine.lineTo(hx + neck, shaft - 1.2 * q);
  ctx.globalAlpha = a;
  ctx.fillStyle = thisFill;
  ctx.fill(spine);
  ctx.strokeStyle = thisEdge;
  ctx.lineWidth = hair;
  ctx.stroke(spine);

  // the other neuron: its dendrites, its body, and its axon, a tube, across and down into the terminal
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
      preEdge
    );
  }
  const course = Array.from({ length: 49 }, (_, i) => bezier(axon, i / 48));
  ctx.globalAlpha = a;
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
  shape(null, preFill, preEdge);
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
  shape(terminal, rgba(mix(L.page, PRE, 0.14), 1), preEdge);

  if (near > 0.01) {
    // its vesicles, each full of transmitter — the docked one gone while it empties, its membrane open to the cleft
    SYN_VESICLES.forEach(([dx, dy], i) => {
      const docked = i === SYN_VESICLES.length - 1;
      const shown = a * near * (docked ? 1 - fused : 1);
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
      ctx.globalAlpha = a * near * fused;
      ctx.strokeStyle = rgba(L.ink, 0.45);
      ctx.lineWidth = hair;
      ctx.beginPath();
      ctx.arc(C[0], C[1] - 1.6 * q, 1.1 * q, Math.PI, 0);
      ctx.stroke();
    }
    // the receptors, set in the spine's membrane: each two halves round a pore, apart when open, and two pockets on
    // its outer end where the transmitter binds
    receptors.forEach(({ x, y, turn }, i) => {
      const nmda = i === 0 ? P.glutamate : 0;
      // (greyed while desensitized: shut, though glutamate is bound)
      const edge = rgba(
        mix(mix(TRANSMITTER, L.ink, 0.45 * nmda), GREY, i ? 0.85 * desensitized : 0),
        0.85
      );
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(turn);
      ctx.scale(1 + 0.15 * nmda, 1 + 0.15 * nmda);
      ctx.globalAlpha = a * near;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.roundRect(
          side > 0 ? gap / 2 : -gap / 2 - 1.1 * q,
          -1.9 * q,
          1.1 * q,
          3.4 * q,
          0.45 * q
        );
        ctx.fillStyle = rgba(mix(L.page, L.ink, 0.22 + 0.12 * nmda), 1);
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = hair;
        ctx.stroke();
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

  // the transmitter: out of the emptied vesicle into the cleft — two molecules to each receptor's pockets, to stay
  // bound a while, the rest wandering the cleft and gone
  if (P.release * near > 0.01)
    for (let j = 0; j < 18; j++) {
      const rnd = mulberry32(211 + 17 * j);
      const [r1, r2, r3] = [rnd(), rnd(), rnd()];
      const start = ARRIVES + 80 + 160 * r3;
      if (tc < start) continue;
      const k = smooth((tc - start) / 520);
      const ties = j < 2 * RECEPTORS.length;
      const to: [number, number] = ties
        ? onReceptor(Math.floor(j / 2), (j % 2 ? 1 : -1) * (gap / q / 2 + 0.55), -2.05)
        : ([
            lerp(C[0] + (r1 - 0.5) * 15 * q, C[0] + (r1 < 0.5 ? -9.6 : 9.6) * q, P.clear),
            lerp(C[1] + (0.2 + (r2 - 0.5) * 1.8) * q, C[1] + 0.3 * q, P.clear),
          ] as [number, number]);
      const wander = ties ? 0 : 1 - P.clear;
      const x = lerp(C[0], to[0], k) + wander * drift(g.now, r1 * 6, r2 * 6, 0.5 * q);
      const y = lerp(C[1] - 1.6 * q, to[1], k) + wander * drift(g.now, r2 * 6, r3 * 6, 0.25 * q);
      // (or, taken up, gone as soon as a transporter has it)
      const gone = ties
        ? 1 - smooth((tc - 4400) / 350)
        : lerp(
            1 - smooth((tc - 2900 - 500 * r1) / 450),
            1 - smooth((tc - start - 560) / 200),
            P.clear
          );
      const shown = a * P.release * near * gone * Math.min(1, (tc - start) / 120);
      if (shown < 0.01) continue;
      const [sx, sy] = seen(x, y - (ties ? smooth((tc - 4400) / 350) * 1.2 * q : 0));
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
  // the receptors open: sodium ions from the cleft through their pores into the spine, one after another; and a
  // chloride ion running at one and turned away, a ring where it is
  if (opened * near > 0.01) {
    // which receptor the `j`th goes through: any, or, once they are named, the AMPA ones only
    const via = (j: number) => (P.glutamate > 0.5 ? 1 + (j % 2) : j % 3);
    // along a way through a receptor, in its frame: from the cleft beside it, to its mouth, through, and into the spine
    // — or, outward, the same way back
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

  // the charge the receptors let in: round the spine's head, under its membrane, negative charge at rest, turning
  // positive one place after another as the charge collects; and over it, outside, positive charge, pushed off as it
  // does — round all the head but where the receptors sit, on top, and where the neck leaves it, below
  const [hx0, hy0] = [C[0], C[1] + HEAD.y * q];
  const shown = a * near * P.low;
  if (shown > 0.01) {
    const glow = P.excess * 0.22;
    if (glow > 0.01) {
      const [gx, gy] = seen(hx0, hy0);
      const r = HEAD.rx * q * Z;
      const warm = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      warm.addColorStop(0, rgba(FIELD, glow * shown));
      warm.addColorStop(1, rgba(FIELD, 0));
      ctx.fillStyle = warm;
      ctx.beginPath();
      ctx.ellipse(gx, gy, r, HEAD.ry * q * Z, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const places = [
      ...Array.from({ length: 7 }, (_, i) => lerp(-0.7, 1.15, i / 6)),
      ...Array.from({ length: 7 }, (_, i) => lerp(2, 3.85, i / 6)),
    ];
    places.forEach((th, i) => {
      const [c, sn] = [Math.cos(th), Math.sin(th)];
      const flip = clamp01(1.6 * P.excess - (0.6 * (i % 7)) / 7);
      const [ix, iy] = seen(hx0 + 0.78 * HEAD.rx * q * c, hy0 + 0.74 * HEAD.ry * q * sn);
      const r = 0.42 * q * Z;
      disc(g, ix, iy, r, NEG, -1, shown * (1 - flip));
      disc(g, ix, iy, r, POS, 1, shown * flip);
      const off = 1.22 + 0.32 * P.excess;
      const [ox2, oy2] = seen(hx0 + off * HEAD.rx * q * c, hy0 + off * HEAD.ry * q * sn);
      disc(g, ox2, oy2, r, POS, 1, shown * (1 - 0.35 * P.excess));
    });
  }
  // the potassium ions inside — the most plentiful positive ions there: in the spine's head and neck, pushed away from
  // the charge collecting, towards the neck; and in the dendrite, pushed along it, both ways, again and again
  const inside = a * near * P.repelled;
  if (inside > 0.01) {
    const SPINE_K: [number, number][] = [
      [-3.2, 7.4],
      [-0.6, 9.2],
      [2.4, 8.4],
      [4, 6.4],
      [0.8, 5.8],
      [0, 12.6],
    ];
    SPINE_K.forEach(([dx, dy], i) => {
      // away from the head's middle and down, towards the neck, as far as stays inside
      const [px, py] = [dx * (1 - 0.35 * P.repelled), dy + (i < 5 ? 1.4 : 1.2) * P.repelled];
      const [ix, iy] = seen(C[0] + px * q + drift(g.now, i, i * 2, 0.15 * q), C[1] + py * q);
      disc(g, ix, iy, 0.62 * q * Z, IONS.K.colour, 1, inside);
      const [ux, uy] = [-dx * 0.35, i < 5 ? 1.4 : 1.2];
      const d = Math.hypot(ux, uy) || 1;
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
    // in the dendrite: each a way along from where the neck meets it, out to the left or the right, round and round
    const [sy0] = [C[1] + 16.7 * q];
    for (let j = 0; j < 14; j++) {
      const side = j % 2 ? 1 : -1;
      const span = 44;
      const start = (j * 3.1) % span;
      const run = (start + (g.now / 1000) * 3.2 * P.axial) % span;
      const along = 3 + run;
      const fade = Math.min(1, run / 3, (span - run) / 4);
      const [ix, iy] = seen(
        C[0] + side * along * q,
        sy0 + (j % 3 ? (j % 3 === 1 ? -0.85 : 0.85) : 0) * q
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
    // and, once they are, two broad arrows along it, out either way from the spine
    if (P.axial > 0.01)
      for (const side of [-1, 1]) {
        const [x0, y0] = seen(C[0] + side * 4 * q, sy0);
        const [x1] = seen(C[0] + side * 26 * q, sy0);
        arrow(ctx, x0, y0, x1, y0, IONS.K.colour, 0.35 * a * near * P.axial, 6 * u, 18 * u);
      }
    // the charge they carry collecting on the dendrite's membrane along it — the most near the spine, less further
    // off — a warmth along it where the potential has risen
    const half = (x: number) => lerp(1.8, 2.6, clamp01((x - left) / (post[0] - left))) * q;
    const fall = (d: number) => Math.exp(-d / 20);
    const along = a * near * P.accum;
    if (along > 0.01) {
      const [gx0] = seen(C[0] - 50 * q, 0);
      const [gx1] = seen(C[0] + 50 * q, 0);
      const [, gy0] = seen(0, sy0 - half(C[0]));
      const [, gy1] = seen(0, sy0 + half(C[0]));
      const warm = ctx.createLinearGradient(gx0, 0, gx1, 0);
      for (const k of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1])
        warm.addColorStop(k, rgba(FIELD, 0.22 * along * fall(Math.abs(k - 0.5) * 100)));
      ctx.fillStyle = warm;
      ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
      for (let k = 0; k < 15; k++)
        for (const side of [-1, 1]) {
          const d = 3.5 + 3.2 * k;
          const x = C[0] + side * d * q;
          if (x < left || x > post[0]) continue;
          // as it spreads, outward
          const come = clamp01((1.3 * P.accum - k / 15) * 4);
          const shownHere = a * near * come * fall(d);
          if (shownHere < 0.01) continue;
          for (const edge of [-1, 1]) {
            const [mx2, my2] = seen(x, sy0 + edge * (half(x) - 0.62 * q));
            disc(g, mx2, my2, 0.36 * q * Z, POS, 1, shownHere);
          }
        }
    }
    // and potassium leaking out through channels in its lower membrane, all along it — clear of the spines below
    const leaking = a * near * P.leaks;
    if (leaking > 0.01) {
      const below = SPINES.filter(([, side]) => side > 0).map(([along2]) => C[0] + along2 * w);
      [-9, -21, -34, 9, 21, 34].forEach((d, i) => {
        let xc = C[0] + d * q;
        if (below.some((bx) => Math.abs(bx - xc) < 4 * q)) xc += Math.sign(d) * 7 * q;
        if (xc < left || xc > post[0]) return;
        const [sx, sy] = seen(xc, sy0 + half(xc));
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
      for (const d of narrow ? [8, 16] : [15, 30])
        for (const side of [-1, 1]) {
          const x = C[0] + side * d * q;
          const [tx, ty] = seen(x, sy0 - half(x));
          ctx.globalAlpha = 0.8 * leaking;
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
            leaking,
            12,
            'center',
            mix(FIELD, L.ink, 0.25)
          );
        }
    }
  }
  // what each of those slides names
  const fresh = a * near * P.low;
  const [hl] = seen(C[0] - 7.8 * q, 0);
  const [hr] = seen(C[0] + 9.2 * q, 0);
  const at2 = (dy: number) => seen(0, C[1] + dy * q)[1];
  const potential = lerp(V_REST, -45, P.excess);
  say(
    g,
    narrow ? '+ inside' : 'positive charge collects inside',
    hl - 6,
    at2(HEAD.y),
    fresh * P.excess,
    12.5,
    'right',
    POS
  );
  say(
    g,
    narrow ? '+ outside, pushed off' : 'positive charge outside, pushed off',
    hr + 6,
    at2(HEAD.y - 1.6),
    fresh * P.excess,
    12.5,
    'left',
    POS
  );
  say(
    g,
    `${narrow ? 'here' : 'membrane potential here'}: ${mV(potential)}`,
    hr + 6,
    at2(HEAD.y + 2.4),
    fresh * P.excess,
    12.5,
    'left',
    mix(FIELD, L.ink, 0.25)
  );
  say(
    g,
    narrow ? 'K^{+} pushed away' : 'potassium, the most plentiful positive ion inside, pushed away',
    seen(C[0] - 2.4 * q, 0)[0] - 8,
    at2(12.6),
    fresh * P.repelled * (1 - P.axial),
    12.5,
    'right',
    IONS.K.colour
  );
  say(
    g,
    narrow
      ? 'a net flow along, both ways'
      : 'a net flow of positive ions along the dendrite, each pushing the next',
    w / 2,
    at2(21.8),
    fresh * P.axial * clamp01(1 - 2 * P.leaks),
    12.5,
    'center',
    IONS.K.colour
  );
  say(
    g,
    narrow ? 'K^{+} leaks out' : 'potassium leaks out through ion channels along the way',
    w / 2,
    at2(21.8),
    fresh * clamp01(2 * P.leaks - 1),
    12.5,
    'center',
    IONS.K.colour
  );
  footNote(
    g,
    narrow
      ? '+ collects inside: the potential rises'
      : 'positive ions flowing in collect inside the membrane: the potential here rises, and positive charge outside is pushed off',
    a * P.excess * (1 - P.repelled)
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
    a * P.axial * (1 - P.leaks)
  );
  footNote(
    g,
    narrow
      ? 'leaking out, the rise fades with distance'
      : 'potassium leaks out through ion channels along the way, so the rise in potential fades with distance from the synapse',
    a * P.leaks
  );

  // the words: each neuron named, from afar — and the spike
  const far = a * (1 - P.dive);
  const [px, py] = seen(...pre);
  const [qx, qy] = seen(...post);
  say(g, 'another neuron', px, py + 26 * q, far * P.cells, 12.5, 'center', mix(PRE, L.ink, 0.35));
  say(g, 'this neuron', qx, qy + 24 * q, far * P.cells, 12.5, 'center');
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
  named(
    'vesicles, full of neurotransmitter',
    'vesicles',
    lx - 10,
    -8.8,
    P.release,
    'right',
    mix(TRANSMITTER, L.ink, 0.3)
  );
  named(
    "the other neuron's presynaptic terminal",
    'terminal',
    lx - 10,
    -5.6,
    P.parts,
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
  named('the synaptic cleft', 'cleft', rx + 10, 0.2, P.parts * before(P.kout), 'left');
  named('potassium ions flow out', 'K^{+} out', rx + 10, 0.2, after(P.kout), 'left', IONS.K.colour);
  named(
    'receptors',
    'receptors',
    seen(C[0] + 6.4 * q, 0)[0] + 10,
    3.2,
    P.release * (1 - P.inflow),
    'left',
    mix(TRANSMITTER, L.ink, 0.3)
  );
  named(
    'receptors, open',
    'open',
    seen(C[0] + 6.4 * q, 0)[0] + 10,
    3.2,
    P.inflow * before(P.glutamate),
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
    'an NMDA receptor',
    'NMDA',
    seen(C[0] - 6.8 * q, 0)[0] - 10,
    2.6,
    P.glutamate,
    'right',
    mix(TRANSMITTER, L.ink, 0.55)
  );
  named(
    "a spine, on this neuron's dendrite",
    'spine',
    seen(C[0] + 7 * q, 0)[0] + 10,
    7.2,
    P.parts,
    'left'
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
  named(
    'the dendrite',
    'dendrite',
    seen(C[0] - 16 * q, 0)[0],
    16.7,
    P.parts * (1 - P.room),
    'center'
  );
  // and what each slide says of it
  footNote(
    g,
    narrow
      ? 'a spike runs down its axon'
      : "a signal, a spike, runs down the other neuron's axon towards this one",
    a * P.cells * (1 - P.contact) * (1 - P.dive)
  );
  footNote(
    g,
    narrow
      ? 'terminal, cleft and spine'
      : "a chemical synapse: the other neuron's terminal, a narrow cleft, and a spine on this neuron's dendrite",
    a * P.contact * (1 - P.release)
  );
  footNote(
    g,
    narrow
      ? 'transmitter crosses the cleft and binds'
      : 'a spike arrives; a vesicle empties its neurotransmitter into the cleft, and it binds to the receptors on the spine',
    a * P.release * (1 - P.inflow)
  );
  footNote(
    g,
    narrow
      ? 'Na^{+} flows in; Cl^{−} is turned away'
      : "bound, the receptors' channels open: sodium ions flow into the spine, while others, like chloride, are turned away",
    a * P.inflow * (1 - P.glutamate)
  );
  footNote(
    g,
    narrow
      ? 'AMPA and NMDA: positive ions only'
      : 'glutamate binds AMPA and NMDA receptors: both let only positive ions (cations) through, and turn negative ones away',
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
    a * P.clear * (1 - P.current) * (1 - P.types)
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
  const shownGlu = a * P.clear * (1 - P.types) * (1 - P.volt);
  trace(
    glu,
    TRANSMITTER,
    shownGlu,
    narrow ? 'glutamate' : 'glutamate in the cleft',
    P.desens > 0.5 ? 12 : 0.5,
    P.desens > 0.5
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
  deactivation:
    "As before; the plot, now over 10 milliseconds, adds the AMPA receptors' current, rising fast and falling within 1 to 3 milliseconds as the glutamate comes off them and their channels close.",
  desensitize:
    'As before, the plot now over 30 milliseconds: glutamate held in the cleft, dashed, and the AMPA current falling anyway within about 10 milliseconds; at the synapse, the AMPA receptors shut and grey while glutamate is still bound to them: desensitized.',
  factors:
    'The plot, over 15 milliseconds: the AMPA current at an auditory brainstem synapse, gone in under a millisecond; at a cortical or hippocampal synapse, 2 to 5 milliseconds; and, dashed, the same at room temperature, slower.',
  tau: "The plot, over 80 milliseconds: the brief AMPA current, and the voltage it makes, rising over a few milliseconds and falling over tens, with the membrane's time constant, τ = r_m c_m, about 20 milliseconds.",
  excess:
    "The view slides down onto the spine and its dendrite. Round the spine's head, under its membrane, negative charges turn positive one after another as positive charge collects inside, the head glowing warm; positive charges just outside are pushed off; and the membrane potential here rises from −72 to −45 millivolts.",
  repel:
    'As before, and now the potassium ions inside the spine, the most plentiful positive ions there, are shown, each pushed away from the charge collecting under the membrane, down towards the neck, an arrow on each.',
  along:
    "As before, and now potassium ions in the dendrite flow along it away from the spine, both ways, again and again, each with a small arrow pushing the next, and a broad arrow out either side; positive charge collects on the dendrite's membrane along it, most near the spine, the dendrite glowing warm there.",
  decay:
    "As before, and now potassium channels along the dendrite's lower membrane, potassium ions leaking out through them now and then; the membrane potential named at points along the dendrite either way, −59 millivolts nearer the spine and −66 further off: the rise fades with distance.",
  glutamate:
    'As before, close in on the synapse at work; the transmitter is now named glutamate, and the receptors AMPA, the two on the right, through which sodium passes, and NMDA, the darker one on the left: both let only positive ions through.',
  ampa: 'As before, and now, through the open AMPA receptors, potassium ions flow out of the spine into the cleft as sodium ions flow in, about as many each way.',
  cancel:
    "The view backs out a little and up; below it, a line of potentials from −100 millivolts to +80: potassium's reversal potential at −89, sodium's at +67, and the AMPA receptors' own marked between them, about 0 millivolts, with an arrow each way from it, potassium out and sodium in, as long as each other: the two currents cancel there.",
  signal:
    "The membrane gives way to two neurons: another neuron, upper left, in blue, its axon running across and down to a spine on this neuron's dendrite, which runs to its body at the right. A spike, a yellow glow, runs down the axon to the synapse, again and again.",
  synapse:
    "Where the axon meets the spine is ringed and named a chemical synapse; the view dives in on it: the other neuron's presynaptic terminal, full of vesicles, a narrow synaptic cleft, and the head of a spine on this neuron's dendrite, receptors set in its membrane.",
  release:
    'Close in on the synapse: a spike arrives down the axon and the terminal flashes; a vesicle fuses with its membrane and empties its neurotransmitter into the cleft; the molecules cross it, two binding to each receptor on the spine, which glow, then let go; and again.',
  inflow:
    "As before, and now, bound, the receptors' channels open: sodium ions from the cleft pass through them into the spine, one after another, while a chloride ion runs at one and is turned away; then the transmitter lets go and the channels close; and again.",
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
