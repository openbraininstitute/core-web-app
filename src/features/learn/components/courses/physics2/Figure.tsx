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
 * passes through; all of them jostling and bumping at random, the channels shut;
 * and, potassium's open, now and then one through it — far more often out than
 * in, a count of each kept; the net movement out — which is diffusion; were
 * potassium uncharged, its ions spreading until the two sides were even; that
 * undone, their charge back; one potassium ion out, and the imbalance of charge
 * it leaves; and, close in, a negative ion inside drawn to the membrane opposite
 * it — then the field of each, pushing ions alike away and drawing opposite ones
 * in; and many such pairs lining the membrane, their field across it, even in
 * the channel, pushing potassium back. What plays out once waits for the slide's
 * words to type.
 */

import { useRef } from 'react';

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

import { cycle, disc, drift, ends, type G, IONS, type IonKind, membrane } from '../elec/Figure';
import { IONS as CONC } from '../physics/model';
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
  'fieldN',
  'across',
  'sheet',
  'pushed',
  'enter',
  'balance',
  'voltage',
  'work',
  'depends',
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
  /** The pair's field together, across the membrane between them: little waves crossing it, outside to inside. */
  across: number;
  /** Right in on the channel, all round it greyed: on the slides about what happens in it. */
  onChannel: number;
  /** Pairs lining the membrane, many, and the field they make across it; and a potassium ion trying the channel,
   * pushed back. */
  sheet: number;
  attempt: number;
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
  /** Every ion jostled faster, on the slide about their moving at random only: slowed again after it. */
  fast: number;
  /** The negative ion the next slides draw to the membrane, in its own colour among the greyed. */
  reveal: number;
  /** The potassium ions inside greyed, all but the one that leaves: on the slides about it and the ion it draws. */
  quiet: number;
  /** Water molecules filling both sides, neutral: on their own slide only, fading as the next begins. */
  water: number;
}

/** A step's picture, `t` ms into it and `typed` ms after its words typed out. */
function poseFor(step: Physics2Step, t: number, typed: number): Pose {
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
    across: 0,
    onChannel: 0,
    sheet: 0,
    balance: 0,
    enter: 0,
    points: 0,
    work: 0,
    attempt: 0,
    selective: 0,
    water: 0,
    fast: 0,
    reveal: 0,
    quiet: 0,
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
      Object.assign(P, { focus: 1, crowd: 1, channels: 1, stated: 1 });
      P.open = phase(typed, 200, 600);
      P.walk = phase(typed, 700, 500);
      // held still, caught in the pore
      P.walkMs = Number.isFinite(typed) ? typed - 700 : 3900;
      break;
    case 'moving':
      // the channels shut, and every ion jostling, bumping into the others
      Object.assign(P, { focus: 1, crowd: 1, channels: 1, stated: 1 });
      P.random = phase(typed, 200, 600);
      P.fast = P.random;
      break;
    case 'random':
      // still jostling; potassium's channel opening, then ions through it, out and in, counted
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
      // the field across the membrane, as left; then two points either side of it, and the voltage between them
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
        onChannel: 1,
      });
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
        onChannel: 1,
        points: 1,
      });
      P.work = phase(typed, 200, 600);
      break;
    case 'balance':
      // the last slide's picture, as it was left; then, at the channel, the two pushes on potassium side by side,
      // as long as each other, as the words about them type
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
        onChannel: 1,
        attempt: 1,
      });
      P.balance = phase(typed, 300, 1200);
      break;
  }
  // the ions' key only from the slide that brings the ions to the one that turns to potassium (slides 4
  // to 9): it fades out as the slide after begins
  if (!KEYED.includes(step)) P.key = 0;
  return P;
}

/** The steps that show the ions' key. */
const KEYED: readonly Physics2Step[] = [
  'charges',
  'barrier',
  'forces',
  'flow',
  'neutral',
  'potassium',
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
      disc(g, x, yy, 8 * u, IONS.K.colour, 1, alpha * Math.min(1, age / 300, (2400 - age) / 400));
    }
  }
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
function drawFigure(f: Frame<Physics2Step>, P: Pose, opened: number) {
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
  if (P.drawn > 0.01) membrane(g, y, x0, lerp(x0, x1, P.drawn), 1, P.channels > 0.01 ? pores : []);
  // the channels, each edged in its ion's colour: opening and closing in turn, on the slide about their two states,
  // each open half the time — and potassium's, on the last slide, open
  // the channels, their names and the key keep their own colours on the slide about any channel, not just potassium's
  const own = P.focus * (1 - P.selective);
  const openness = CHANNELS.map((kind, i) => {
    const c = cycle(g.now, 3600, -i * 1200);
    const toggled = smooth(clamp01(c / 0.08)) * (1 - smooth(clamp01((c - 0.5) / 0.08)));
    return Math.max(kind === 'K' ? P.open : 0, P.gating * toggled, P.selective);
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
        if (c.kind !== 'K') a *= lerp(1, 0.42, P.focus);
        // and potassium's own inside, on the slides about the one that leaves — all but that one
        let quiet = c.kind === 'K' && c.side > 0 && n !== WALKER ? P.quiet : 0;
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
        // potassium's sign gone while it is imagined uncharged — and, its charge back, a ring spreading round it
        const sign = c.kind === 'K' && P.bare > 0.5 ? 0 : SIGN[c.kind];
        // — and, right in on the channel, every ion round it greyed
        const colour =
          c.kind === 'K'
            ? mix(IONS.K.colour, GREY, 0.85 * Math.max(quiet, P.onChannel))
            : colourOf(c.kind, Math.max(tint, P.onChannel));
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
      if (
        k !== 0 &&
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
    slots.forEach((x, j) => {
      const shown = clamp01(P.sheet * (slots.length + 2) - j);
      if (shown < 0.01) return;
      // greyed, right in on the channel
      const faded = 0.9 * shown * lerp(1, 0.6, P.onChannel);
      disc(g, x, y - face - 9 * u, 8 * u, mix(IONS.K.colour, GREY, 0.85 * P.onChannel), 1, faded);
      const kind = x === beside || !(j % 3) ? 'Cl' : 'A';
      disc(
        g,
        x,
        y + face + (kind === 'A' ? 12 : 10) * u,
        (kind === 'A' ? 10.5 : 8) * u,
        colourOf(kind, P.onChannel),
        -1,
        faded
      );
    });
    // their field: long straight lines right along the membrane — as far as the pairs line it, so all along it once they
    // all do, through the channel too — sweeping down through it, outside to inside, each a glowing crest with a fainter
    // one just behind; drawn in the zoomed frame, so as thin there as they are wide on the page
    const lined = slots.filter((_, j) => clamp01(P.sheet * (slots.length + 2) - j) > 0.5);
    const xl = Math.max(x0, Math.min(cx + pairDx, ...lined) - lining / 2);
    const xr = Math.min(x1, Math.max(cx + pairDx, ...lined) + lining / 2);
    ctx.save();
    ctx.strokeStyle = rgba(FIELD, 1);
    ctx.lineCap = 'round';
    for (let j = 0; j < FIELD_WAVES; j++) {
      const q = cycle(g.now, WAVE_MS, -(j / FIELD_WAVES) * WAVE_MS);
      const a = P.sheet * Math.sin(Math.PI * q) ** 0.7;
      if (a < 0.01) continue;
      for (const [back, alpha, width, glow] of [
        [0, 0.9, 2.6, 10],
        [0.035, 0.35, 1.2, 0],
      ]) {
        const at = lerp(y - face - u, y + face + u, Math.max(0, q - back));
        ctx.globalAlpha = alpha * a;
        ctx.lineWidth = (width * u) / zoom;
        ctx.shadowColor = rgba(FIELD, 0.6);
        ctx.shadowBlur = glow * u;
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
  ctx.restore();
  // words at the foot on a plate of the page — for when the view is closed in, and the ions behind them are large
  // — the line above it, `row` 1, for a second thing to say
  const foot = (text: string, a: number, row = 0, colour: RGB = L.ink) => {
    if (a < 0.01) return;
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
  };
  if (P.flux > 0.01) {
    const count = narrow
      ? `so far: ${out} out, ${into} in`
      : `through the potassium channel so far: ${out} out, ${into} in`;
    // (gone before diffusion's words take its place)
    say(g, count, w / 2, h - 20 * u, P.flux * clamp01(1 - 2 * P.term), 13, 'center', IONS.K.colour);
  }
  // the net movement out: a broad arrow beside the channel, with how many more have gone out than in; then the
  // process named, diffusion, and what it is
  const ax = cx + 62 * u;
  if (P.net > 0.01) {
    arrow(ctx, ax, y + 78 * u, ax, y - 78 * u, IONS.K.colour, 0.4 * P.net, 6 * u, 18 * u);
    const net = `${narrow ? 'net' : 'net movement'}: ${out - into} out`;
    const shown = P.net * (1 - P.term);
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
      const a = P.across * Math.sin(Math.PI * q) ** 0.7;
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
  if (P.sheet > 0.01) {
    const field = narrow
      ? 'a field across the membrane'
      : 'an electric field across the membrane — even in the channel';
    foot(field, P.sheet, 1, FIELD);
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
    const why = narrow
      ? 'potassium pushed back: harder to pass out'
      : 'the field pushes potassium ions back into the cell: fewer make it out through the channel';
    foot(why, P.attempt * (1 - P.balance));
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
    const reach = Math.min(105 * u, h / 2 - 40 * u);
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
    for (const [px, py, name] of [
      [ax, ay, narrow ? 'A' : 'A, outside'],
      [bx, by, narrow ? 'B' : 'B, inside'],
    ] as [number, number, string][]) {
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
    }
    // the voltage between them, a badge beside the line's middle
    const vx = chx - 40 * u;
    const label = narrow ? 'voltage' : 'voltage between A and B';
    ctx.font = `600 ${12.5 * g.ts}px ${SERIF}`;
    const bw = ctx.measureText(label).width + 22 * u;
    ctx.globalAlpha = 0.95 * a;
    ctx.fillStyle = rgba(L.page, 1);
    ctx.strokeStyle = rgba(FIELD, 1);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(vx - bw, chy - 12 * u, bw, 24 * u, 12 * u);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
    say(g, label, vx - bw / 2, chy, a, 12.5, 'center', FIELD);
    foot(
      narrow
        ? 'the field, measured: a voltage'
        : 'the field can be measured by the voltage it makes between two points',
      a * (1 - P.work)
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
      const barX = chx + 70 * u;
      const barW = narrow ? 70 * u : 110 * u;
      const barY = ay - 4 * u;
      ctx.globalAlpha = P.work;
      ctx.fillStyle = rgba(L.grey, 0.35);
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, 8 * u, 4 * u);
      ctx.fill();
      ctx.fillStyle = rgba(FIELD, 1);
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(2, barW * k), 8 * u, 4 * u);
      ctx.fill();
      ctx.globalAlpha = 1;
      say(
        g,
        `work done: ${(k * 1.12).toFixed(2)} × 10^{−20} J`,
        barX,
        barY - 12 * u,
        P.work,
        12,
        'left',
        FIELD
      );
      foot(
        narrow
          ? 'voltage: the work to move a charge, in joules'
          : 'a voltage is the work done (energy, in joules) to move a charge from one point to the other',
        P.work
      );
    }
  }
  // the balance: beside the channel, an arrow up and out for diffusion, in potassium's colour, and one down and in
  // for the field, in the field's, the same length - growing in together - each named; and what it comes to
  if (P.balance > 0.01) {
    const [chx, chy] = seen(cx, y);
    const len = 62 * u * smooth(P.balance);
    const gap = 46 * u;
    const lift = 4 * u;
    // diffusion, left of the channel: from inside, up, out
    arrow(
      ctx,
      chx - gap,
      chy + len / 2 + lift,
      chx - gap,
      chy - len / 2 + lift,
      IONS.K.colour,
      P.balance,
      3.2,
      12
    );
    // the field, right of it: from outside, down, in
    saber(
      ctx,
      L,
      g.now,
      chx + gap,
      chy - len / 2 + lift,
      chx + gap,
      chy + len / 2 + lift,
      FIELD,
      1,
      P.balance,
      3,
      12,
      0.3,
      1100
    );
    mathWords(
      ctx,
      narrow ? 'diffusion: out' : 'diffusion pushes potassium out',
      chx - gap - 12 * u,
      chy + lift,
      IONS.K.colour,
      P.balance,
      13 * g.ts,
      'right',
      L.page,
      'italic 600'
    );
    mathWords(
      ctx,
      narrow ? 'field: back in' : 'the field pushes it back in',
      chx + gap + 14 * u,
      chy + lift,
      FIELD,
      P.balance,
      13 * g.ts,
      'left',
      L.page,
      'italic 600'
    );
    foot(
      narrow
        ? 'as strong as each other: they balance'
        : 'the two are as strong as each other: they balance out, and potassium stops flowing out on balance',
      P.balance
    );
  }
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

  // which is which: the membrane, named under its right end with a tick up onto it; and what it keeps apart — the
  // outside above and the inside below
  if (P.named * (1 - P.zoom) > 0.01) {
    const name = 'cell membrane';
    ctx.font = `italic ${12.5 * g.ts}px ${SERIF}`;
    const mid = x1 - ctx.measureText(name).width / 2;
    say(g, name, x1, y + face + 18 * u, 0.75 * P.named * (1 - P.zoom), 12.5, 'right');
    ctx.globalAlpha = P.named * (1 - P.zoom);
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
      clamp01(1 - 2 * Math.max(P.tally, P.counted, P.spread, P.imbalance)) * (1 - P.zoom);
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
  // a narrow screen, over it — and, from the slide about its two states, whether it is open or closed
  if (P.channels * (1 - P.zoom) > 0.01) {
    CHANNELS.forEach((kind, i) => {
      const [name, short] = CHANNEL_NAMES[kind];
      const colour = colourOf(kind, own);
      // the others' names gone once a potassium ion has left, which comes to rest where chloride's is written
      const a =
        P.channels * (kind === 'K' ? 1 : lerp(0.6, 1, P.selective) * (1 - P.alone)) * (1 - P.zoom);
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
  // the key, where the basic course's slide has its own: each kind in its colour, the positive ones and the negative
  if (P.key > 0.01) drawKey(g, P.key, narrow, own, P.dock);
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

const LABELS: Record<Physics2Step, string> = {
  water:
    'The same membrane, with the outside named above and the inside below, both filling with water molecules, each a blue oxygen with two paler blue hydrogens: neutral H₂O, tumbling slowly.',
  voltage:
    'The field across the membrane, as before. Two points are marked either side of the channel, A outside and B inside, joined by a dashed line, labelled with the voltage between A and B.',
  depends:
    'The field across the membrane, as before. Two points are marked either side of the channel, A outside and B inside, joined by a dashed line, labelled with the voltage between A and B.',
  work: 'A positive charge is carried from point B inside up to point A outside, against the field, again and again; beside A a bar fills with the work done on it, counted in joules.',
  enter:
    'The pairs still line the membrane with their field across it, down through the channel. A potassium ion outside comes down to the channel, is drawn through it, quickening, and into the cell.',
  balance:
    'The pairs still line the membrane with their field across it. Beside the channel, two arrows of the same length: one pointing up and out, in the colour of potassium, labelled diffusion pushes potassium out; one pointing down and in, in the colour of the field, labelled the field pushes it back in. They balance out.',
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
  moving:
    'Every ion jostling about at random, a ring wherever a potassium ion bumps into another; the channels all closed.',
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
        return poseFor(st, t, Number.isFinite(t) ? t - h.at : t);
      }}
      draw={(f, P) => {
        // when potassium's channel opened on the slide about its flux — 800 ms after the words typed — by the page's
        // clock: what its count counts from, kept for the slide after
        const h = held.current;
        if (f.step === 'random') h.opened = f.now - (Number.isFinite(f.t) ? f.t - h.at - 800 : 0);
        drawFigure(f, P, h.opened);
      }}
    />
  );
}
