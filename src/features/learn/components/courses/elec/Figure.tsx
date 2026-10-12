'use client';

/**
 * The basic electrical physics course's figure: a picture for each idea in
 * turn, each fading into the next — charge, and how charges push and pull; the
 * particles that carry it, the atoms they make up, molecules and ions;
 * current, carried in the body by ions, direct and alternating; force, work
 * and voltage; resistance, conductance and Ohm's law; capacitance and power;
 * circuits, their parts and what each is in a neuron, side by side and one
 * after another; the RC circuit, Kirchhoff's voltage law, a capacitor charging
 * and its time constant; the dendrite as a cable; and the electric field. The
 * course's section is named at the figure's top left, and what plays out once
 * waits for the slide's words to type.
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

export const ELEC_STEPS = [
  'intro',
  'charge',
  'attract',
  'particles',
  'sizes',
  'atom',
  'molecules',
  'ions',
  'current',
  'carriers',
  'acdc',
  'force',
  'work',
  'separate',
  'voltage',
  'resistance',
  'conductance',
  'ohm',
  'capacitance',
  'power',
  'circuit',
  'battery',
  'resistor',
  'capacitor',
  'switch',
  'parallel',
  'series',
  'rc',
  'kirchhoff',
  'charging',
  'tau',
  'cable',
  'field',
] as const;
export type ElecStep = (typeof ELEC_STEPS)[number];

/** The course's sections, each named from its first step on. */
const SECTIONS: [ElecStep, string][] = [
  ['charge', '1.1  Basic terms & concepts'],
  ['circuit', '1.2  Electrical circuits'],
  ['rc', '1.3  The RC circuit'],
  ['cable', '1.4  Cable theory'],
  ['field', '1.5  The electric field'],
];
const sectionOf = (step: ElecStep) =>
  SECTIONS.filter(([first]) => ELEC_STEPS.indexOf(step) >= ELEC_STEPS.indexOf(first)).at(-1)?.[1] ??
  '';

/** The pictures, each shown on one step or more; `masses` only adds to the particles'. */
const SCENES = [
  'intro',
  'charge',
  'pairs',
  'particles',
  'masses',
  'atom',
  'molecules',
  'ions',
  'current',
  'carriers',
  'acdc',
  'force',
  'work',
  'separate',
  'voltage',
  'resistance',
  'conductance',
  'ohm',
  'capacitance',
  'power',
  'circuit',
  'parts',
  'parallel',
  'series',
  'rc',
  'kirchhoff',
  'charging',
  'tau',
  'cable',
  'field',
] as const;
type Scene = (typeof SCENES)[number];
const SHOWS: Record<ElecStep, Scene[]> = {
  intro: ['intro'],
  charge: ['charge'],
  attract: ['pairs'],
  particles: ['particles'],
  sizes: ['particles', 'masses'],
  atom: ['atom'],
  molecules: ['molecules'],
  ions: ['ions'],
  current: ['current'],
  carriers: ['carriers'],
  acdc: ['acdc'],
  force: ['force'],
  work: ['work'],
  separate: ['separate'],
  voltage: ['voltage'],
  resistance: ['resistance'],
  conductance: ['conductance'],
  ohm: ['ohm'],
  capacitance: ['capacitance'],
  power: ['power'],
  circuit: ['circuit'],
  battery: ['parts'],
  resistor: ['parts'],
  capacitor: ['parts'],
  switch: ['parts'],
  parallel: ['parallel'],
  series: ['series'],
  rc: ['rc'],
  kirchhoff: ['kirchhoff'],
  charging: ['charging'],
  tau: ['tau'],
  cable: ['cable'],
  field: ['field'],
};
/** On the slides naming a circuit's parts, the one picked out: battery, resistor, capacitor or switch. */
const FOCUS: Partial<Record<ElecStep, number>> = {
  battery: 0,
  resistor: 1,
  capacitor: 2,
  switch: 3,
};

interface Pose {
  /** How much each picture shows; and, among a circuit's parts, how much each is picked out. */
  show: Record<Scene, number>;
  focus: number[];
}
const poseFor = (step: ElecStep): Pose => ({
  show: Object.fromEntries(SCENES.map((s) => [s, SHOWS[step].includes(s) ? 1 : 0])) as Record<
    Scene,
    number
  >,
  focus: [0, 1, 2, 3].map((i) => (FOCUS[step] === i ? 1 : 0)),
});

/** By when everything that plays out once has played, ms: a slide come back to starts there. */
const DONE = 6000;

/** Charge, told by colour as everywhere on the site: positive red, negative blue; none grey. */
const POS: RGB = [214, 50, 58];
const NEG: RGB = [38, 98, 214];
const NEUTRAL: RGB = [140, 150, 165];
/** Voltage and energy, where they are drawn: warm. */
const VOLT: RGB = [217, 119, 6];
const WHITE: RGB = [255, 255, 255];
/** The ions that carry current in the body: each in its own colour, as the physics course draws them, and its charge. */
export type IonKind = 'Na' | 'K' | 'Cl' | 'Ca';
export const IONS: Record<IonKind, { name: string; colour: RGB; sign: number }> = {
  Na: { name: 'Na^{+}', colour: [234, 88, 12], sign: 1 },
  K: { name: 'K^{+}', colour: [124, 58, 237], sign: 1 },
  Cl: { name: 'Cl^{−}', colour: [13, 148, 136], sign: -1 },
  Ca: { name: 'Ca^{2+}', colour: [219, 39, 119], sign: 1 },
};

/** What a picture is drawn with: the canvas, the look, the figure's size and middle, its scales, and its clocks. */
export interface G {
  ctx: CanvasRenderingContext2D;
  L: Look;
  w: number;
  h: number;
  cx: number;
  cy: number;
  /** px per design px — 1 on a wide figure, less on a narrow one; and the same for words, which shrink less. */
  u: number;
  ts: number;
  /** ms since the slide's words typed out; and ms since the page opened, for what keeps moving. */
  t: number;
  now: number;
  /** Reduced motion: each picture held at a moment that shows it. */
  still: boolean;
}
type Draw = (g: G, a: number, P: Pose) => void;

/* ---------------------------------------------------------------- pieces */

/** A disc in a colour, with a charge's sign on it if it has one. */
export function disc(g: G, x: number, y: number, r: number, colour: RGB, sign: number, a: number) {
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
    ctx.lineWidth = Math.max(1.2, r * 0.2);
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
/** A charge: red and positive, blue and negative, or grey with none. */
const charge = (g: G, x: number, y: number, r: number, sign: number, a: number) =>
  disc(g, x, y, r, sign > 0 ? POS : sign < 0 ? NEG : NEUTRAL, sign, a);
const ion = (g: G, x: number, y: number, r: number, kind: IonKind, a: number) =>
  disc(g, x, y, r, IONS[kind].colour, IONS[kind].sign, a);

/**
 * Words in the figures' serif — italic, and haloed in the page's colour, unless told otherwise — with subscripts
 * after `_` and superscripts after `^`.
 */
function rich(
  g: G,
  text: string,
  x: number,
  y: number,
  a: number,
  size: number,
  align: CanvasTextAlign,
  colour: RGB,
  halo = true,
  style = 'italic'
) {
  mathWords(g.ctx, text, x, y, colour, a, size * g.ts, align, halo ? g.L.page : null, style);
}
const say = (
  g: G,
  text: string,
  x: number,
  y: number,
  a: number,
  size = 13,
  align: CanvasTextAlign = 'center',
  c?: RGB
) => rich(g, text, x, y, a, size, align, c ?? g.L.ink);
const formula = (
  g: G,
  text: string,
  x: number,
  y: number,
  a: number,
  size = 20,
  align: CanvasTextAlign = 'center'
) => rich(g, text, x, y, a, size, align, g.L.ink);
/** A symbol set on a disc: upright, with no halo. */
const mark = (g: G, text: string, x: number, y: number, a: number, size: number, colour: RGB) =>
  rich(g, text, x, y, a, size, 'center', colour, false, 'normal');

function line(
  g: G,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  a: number,
  colour?: RGB,
  width = 2.2,
  dash = 0
) {
  if (a < 0.01) return;
  const { ctx } = g;
  ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(colour ?? g.L.ink, 0.8);
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

function curve(g: G, pts: [number, number][], a: number, colour: RGB, width = 2.4, dash = 0) {
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

/** A soft glow round (x, y), to pick something out. */
function glow(g: G, x: number, y: number, r: number, colour: RGB, a: number) {
  if (a < 0.01) return;
  const { ctx } = g;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, rgba(colour, 0.32 * a));
  grad.addColorStop(1, rgba(colour, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** A bar from l to r round y, `k` of it filled, named at its right. */
function meter(g: G, l: number, r: number, y: number, k: number, a: number, name: string) {
  if (a < 0.01) return;
  const { ctx, u, L } = g;
  ctx.globalAlpha = a;
  ctx.fillStyle = rgba(mix(L.page, L.ink, 0.08), 1);
  ctx.fillRect(l, y - 6 * u, r - l, 12 * u);
  ctx.fillStyle = rgba(VOLT, 0.8);
  ctx.fillRect(l, y - 6 * u, (r - l) * clamp01(k), 12 * u);
  ctx.globalAlpha = 1;
  say(g, name, r + 12 * u, y, 0.8 * a, 12.5, 'left');
}

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}
/** A plot's axes in a box, each named; and where a point 0..1 along and up falls in it. */
function axes(g: G, b: Box, along: string, up: string, a: number) {
  line(g, b.l, b.b, b.r, b.b, a, g.L.ink, 1.4);
  line(g, b.l, b.b, b.l, b.t, a, g.L.ink, 1.4);
  say(g, along, b.r, b.b + 16 * g.u, 0.75 * a, 12.5, 'right');
  say(g, up, b.l - 8 * g.u, b.t, 0.75 * a, 12.5, 'right');
  return (fx: number, fy: number): [number, number] => [lerp(b.l, b.r, fx), lerp(b.b, b.t, fy)];
}

/** How long a circuit's part is along its wire, design px. */
const SPAN = 58;
type Part = 'battery' | 'resistor' | 'capacitor' | 'switch' | 'bulb';
interface PartLook {
  /** How much it is picked out; a switch, how far open; a bulb, how bright; and its size. */
  pick?: number;
  open?: number;
  lit?: number;
  size?: number;
}
/** A circuit's part, as circuit diagrams draw it, centred on (x, y), along a wire across — or, `vertical`, up and down. */
function part(
  g: G,
  kind: Part,
  x: number,
  y: number,
  vertical: boolean,
  a: number,
  o: PartLook = {}
) {
  if (a < 0.01) return;
  const { ctx, u, L } = g;
  const { pick = 0, open = 0, lit = 0, size = 1 } = o;
  glow(g, x, y, 54 * u * size, VOLT, pick * a);
  if (kind === 'bulb') glow(g, x, y, 66 * u * size, [250, 204, 21], lit * a);
  ctx.save();
  ctx.translate(x, y);
  if (vertical) ctx.rotate(Math.PI / 2);
  ctx.scale(u * size, u * size);
  ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(L.ink, 0.85);
  ctx.fillStyle = rgba(L.ink, 0.85);
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const half = SPAN / 2;
  const leads = (inner: number) => {
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(-inner, 0);
    ctx.moveTo(inner, 0);
    ctx.lineTo(half, 0);
    ctx.stroke();
  };
  if (kind === 'resistor') {
    const run = 0.7 * half;
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(-run, 0);
    for (let k = 0; k < 6; k++) ctx.lineTo(-run + ((k + 0.5) * 2 * run) / 6, k % 2 ? 8 : -8);
    ctx.lineTo(run, 0);
    ctx.lineTo(half, 0);
    ctx.stroke();
  } else if (kind === 'capacitor') {
    leads(6);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, -17);
    ctx.lineTo(-6, 17);
    ctx.moveTo(6, -17);
    ctx.lineTo(6, 17);
    ctx.stroke();
  } else if (kind === 'battery') {
    // the long plate positive, the short one negative
    leads(5);
    ctx.beginPath();
    ctx.moveTo(-5, -18);
    ctx.lineTo(-5, 18);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(5, -9);
    ctx.lineTo(5, 9);
    ctx.stroke();
  } else if (kind === 'switch') {
    const c = 0.62 * half;
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(-c, 0);
    ctx.moveTo(c, 0);
    ctx.lineTo(half, 0);
    const lift = -0.55 * open;
    ctx.moveTo(-c, 0);
    ctx.lineTo(-c + 2 * c * Math.cos(lift), 2 * c * Math.sin(lift));
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * c, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    leads(14);
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = rgba(mix(L.page, [250, 204, 21], 0.15 + 0.7 * lit), 1);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.lineTo(-3, -5);
    ctx.lineTo(0, 4);
    ctx.lineTo(3, -5);
    ctx.lineTo(6, 4);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

type Edge = 'top' | 'right' | 'bottom' | 'left';
interface Placed extends PartLook {
  kind: Part;
  edge: Edge;
  /** How far along its edge: from the left, or from the top. */
  at: number;
}
/** Where `at` of the way along an edge of a box is, and whether the edge runs up and down. */
function onEdge(box: Box, edge: Edge, at: number): [number, number, boolean] {
  if (edge === 'top') return [lerp(box.l, box.r, at), box.t, false];
  if (edge === 'bottom') return [lerp(box.l, box.r, at), box.b, false];
  if (edge === 'left') return [box.l, lerp(box.t, box.b, at), true];
  return [box.r, lerp(box.t, box.b, at), true];
}
/** A loop of wire round a box, broken where each of its parts sits; and the parts. */
function loop(g: G, box: Box, parts: Placed[], a: number) {
  const half = (SPAN / 2) * g.u;
  const edges: [Edge, number, number, number, number][] = [
    ['top', box.l, box.t, box.r, box.t],
    ['right', box.r, box.t, box.r, box.b],
    ['bottom', box.l, box.b, box.r, box.b],
    ['left', box.l, box.t, box.l, box.b],
  ];
  for (const [edge, x0, y0, x1, y1] of edges) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const gaps = parts
      .filter((p) => p.edge === edge)
      .map((p) => p.at * len)
      .sort((m, n) => m - n);
    let from = 0;
    for (const at of [...gaps, len + half]) {
      const to = Math.min(len, at - half);
      if (to > from)
        line(
          g,
          lerp(x0, x1, from / len),
          lerp(y0, y1, from / len),
          lerp(x0, x1, to / len),
          lerp(y0, y1, to / len),
          a
        );
      from = at + half;
    }
  }
  for (const p of parts) {
    const [x, y, vertical] = onEdge(box, p.edge, p.at);
    part(g, p.kind, x, y, vertical, a, p);
  }
}
/**
 * Charges going round a box clockwise, about `every` design px apart, moved on `shift` px — and `phase` more —
 * leaving out any `skip` says is inside a part.
 */
function flowRound(
  g: G,
  box: Box,
  a: number,
  shift: number,
  every: number,
  skip?: (x: number, y: number) => boolean,
  phase = 0
) {
  if (a < 0.01) return;
  const [wd, ht] = [box.r - box.l, box.b - box.t];
  const P = 2 * (wd + ht);
  const n = Math.max(1, Math.round(P / (every * g.u)));
  for (let i = 0; i < n; i++) {
    const s = ((((i * P) / n + shift + phase) % P) + P) % P;
    let x: number;
    let y: number;
    if (s < wd) [x, y] = [box.l + s, box.t];
    else if (s - wd < ht) [x, y] = [box.r, box.t + s - wd];
    else if (s - wd - ht < wd) [x, y] = [box.r - (s - wd - ht), box.b];
    else [x, y] = [box.l, box.b - (s - 2 * wd - ht)];
    if (skip?.(x, y)) continue;
    charge(g, x, y, 6 * g.u, 1, 0.9 * a);
  }
}

/** A strip of membrane across: two layers of lipids, heads out, broken where a channel goes through. */
export function membrane(g: G, y: number, x0: number, x1: number, a: number, gaps: number[] = []) {
  if (a < 0.01) return;
  const { ctx, u, L } = g;
  ctx.globalAlpha = a;
  const heads = new Path2D();
  const tails = new Path2D();
  for (let x = x0; x < x1; x += 9 * u) {
    if (gaps.some((gx) => Math.abs(gx - x) < 16 * u)) continue;
    for (const side of [-1, 1]) {
      heads.moveTo(x + 3.6 * u, y + side * 10 * u);
      heads.arc(x, y + side * 10 * u, 3.6 * u, 0, Math.PI * 2);
      tails.moveTo(x, y + side * 6.4 * u);
      tails.lineTo(x, y + side * 1.2 * u);
    }
  }
  ctx.strokeStyle = rgba(L.ink, 0.25);
  ctx.lineWidth = 1;
  ctx.stroke(tails);
  ctx.fillStyle = rgba(mix(L.page, [148, 163, 184], 0.85), 0.95);
  ctx.fill(heads);
  ctx.globalAlpha = 1;
}
/** A channel through the membrane: two halves round a pore, apart when it is open. */
function channel(g: G, x: number, y: number, a: number, open = 1) {
  if (a < 0.01) return;
  const { ctx, u, L } = g;
  ctx.globalAlpha = a;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(x + side * (7 + 4 * open) * u - 6 * u, y - 19 * u, 12 * u, 38 * u, 5 * u);
    ctx.fillStyle = rgba(mix(L.page, L.ink, 0.22), 0.98);
    ctx.fill();
    ctx.strokeStyle = rgba(L.ink, 0.5);
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A slow wander, px, for what drifts: two sines out of step. */
export const drift = (now: number, p: number, q: number, size: number) =>
  size * (0.65 * Math.sin(now / 1900 + p) + 0.35 * Math.sin(now / 730 + q));
/** Where a repeating motion is, 0 to 1, every `period` ms; and how much it shows, fading in and out at the ends. */
export const cycle = (now: number, period: number, offset = 0) =>
  ((((now + offset) % period) + period) % period) / period;
export const ends = (c: number) => Math.min(1, 10 * c, 8 * (1 - c));

/* -------------------------------------------------------------- pictures */

const intro: Draw = (g, a) => {
  const rnd = mulberry32(7);
  for (let i = 0; i < 46; i++) {
    const [bx, by, p, q, sign] = [rnd(), rnd(), rnd() * 6.3, rnd() * 6.3, rnd() < 0.5 ? 1 : -1];
    const x = g.w * (0.04 + 0.92 * bx) + drift(g.now, p, q, 18 * g.u);
    const y = g.h * (0.12 + 0.8 * by) + drift(g.now, q, p, 12 * g.u);
    charge(g, x, y, 11 * g.u, sign, 0.85 * a);
  }
};

const chargeScene: Draw = (g, a) => {
  const { cx, cy, u } = g;
  const d = 160 * u;
  const bob = (p: number) => 4 * u * Math.sin(g.now / 900 + p);
  charge(g, cx - d, cy - 20 * u + bob(0), 38 * u, 1, a);
  charge(g, cx + d, cy - 20 * u + bob(2), 38 * u, -1, a);
  say(g, 'positive', cx - d, cy + 42 * u, a, 15, 'center', POS);
  say(g, 'negative', cx + d, cy + 42 * u, a, 15, 'center', NEG);
  say(g, 'measured in coulombs, C; written q or Q', cx, g.h - 26 * u, 0.8 * a, 13);
};

const pairs: Draw = (g, a) => {
  const { cx, cy, u, L } = g;
  // each pair let go: alike, they push apart, slowing as they go; unlike, they pull together, faster and faster
  const c = cycle(g.now, 3400);
  const p = clamp01(c / 0.7);
  const fade = a * ends(c);
  const kinds: [number, number, boolean, string][] = [
    [1, 1, false, 'two positive charges repel'],
    [-1, -1, false, 'two negative charges repel'],
    [1, -1, true, 'a positive and a negative attract'],
  ];
  kinds.forEach(([s0, s1, pull, name], i) => {
    const x = cx + (i - 1) * 290 * u;
    const y = cy - 10 * u;
    const apart = (pull ? lerp(170, 56, p * p) : lerp(56, 170, 1 - (1 - p) * (1 - p))) * u;
    const [xa, xb] = [x - apart / 2, x + apart / 2];
    charge(g, xa, y, 24 * u, s0, fade);
    charge(g, xb, y, 24 * u, s1, fade);
    const ay = y - 40 * u;
    const dir = pull ? 1 : -1;
    arrow(g.ctx, xa - dir * 12 * u, ay, xa + dir * 16 * u, ay, L.ink, 0.75 * fade, 2, 8);
    arrow(g.ctx, xb + dir * 12 * u, ay, xb - dir * 16 * u, ay, L.ink, 0.75 * fade, 2, 8);
    say(g, name, x, y + 58 * u, 0.85 * a, 13.5);
  });
};

/** The three particles: their charge, size and mass, how big each is drawn, and their masses against the proton's. */
const PARTICLES: {
  name: string;
  sign: number;
  r: number;
  charge: string;
  size: string;
  mass: string;
  m: number;
}[] = [
  {
    name: 'proton',
    sign: 1,
    r: 34,
    charge: '+1.602 × 10^{−19} C',
    size: 'radius ≈ 0.85 fm',
    mass: '1.673 × 10^{−27} kg',
    m: 1,
  },
  {
    name: 'neutron',
    sign: 0,
    r: 34.5,
    charge: 'no charge',
    size: 'about the same size',
    mass: '1.675 × 10^{−27} kg',
    m: 1.0014,
  },
  {
    name: 'electron',
    sign: -1,
    r: 3.2,
    charge: '−1.602 × 10^{−19} C',
    size: '≥ 1000 times smaller (drawn far too big)',
    mass: '1836 times lighter',
    m: 1 / 1836,
  },
];
const particles: Draw = (g, a, P) => {
  const { ctx, cx, cy, u, L } = g;
  const more = P.show.masses;
  const y = lerp(cy - 24 * u, 62 * u, more);
  PARTICLES.forEach((p, k) => {
    const x = cx + (k - 1) * 260 * u;
    const colour = p.sign > 0 ? POS : p.sign < 0 ? NEG : NEUTRAL;
    if (p.sign < 0) glow(g, x, y, 24 * u, NEG, a);
    charge(g, x, y, p.r * u, p.sign, a);
    say(g, p.name, x, y + 54 * u, a, 15);
    say(g, p.charge, x, y + 76 * u, 0.9 * a, 13, 'center', colour);
    // its size, and its mass: a bar as long as the proton's mass is 180 px
    const m = a * more;
    say(g, p.size, x, y + 104 * u, 0.8 * m, 12.5);
    const by = y + 140 * u;
    ctx.globalAlpha = m;
    ctx.fillStyle = rgba(mix(L.page, L.ink, 0.08), 1);
    ctx.fillRect(x - 90 * u, by - 6 * u, 180 * u, 12 * u);
    ctx.fillStyle = rgba(colour, 0.85);
    ctx.fillRect(x - 90 * u, by - 6 * u, Math.max(1.5, 180 * u * p.m), 12 * u);
    ctx.globalAlpha = 1;
    say(g, p.mass, x, by + 22 * u, 0.85 * m, 12.5);
  });
  say(g, 'mass', cx - 400 * u, y + 140 * u, 0.6 * a * more, 12, 'left');
};

/** The elements as the periodic table sets them out, row then column, the f-block's two rows below. */
function periodic(): [number, number][] {
  const cells: [number, number][] = [
    [1, 1],
    [1, 18],
  ];
  for (const row of [2, 3])
    for (const col of [1, 2, 13, 14, 15, 16, 17, 18]) cells.push([row, col]);
  for (const row of [4, 5, 6, 7]) for (let col = 1; col <= 18; col++) cells.push([row, col]);
  for (const row of [9, 10]) for (let col = 4; col <= 17; col++) cells.push([row, col]);
  return cells;
}
const TABLE = periodic();

/**
 * An atom, Bohr's way: its nucleus — drawn out as its protons and neutrons, or as one disc with its charge — and
 * its electrons going round it in shells; the outermost of them `out` of the way out of it, as it leaves or arrives.
 */
function atomAt(
  g: G,
  x: number,
  y: number,
  protons: number,
  neutrons: number,
  shells: number[],
  radii: number[],
  a: number,
  o: { drawn?: boolean; out?: number } = {}
) {
  const { ctx, u, L } = g;
  const { drawn = true, out = 0 } = o;
  shells.forEach((n, s) => {
    const r = radii[s] * u;
    ctx.globalAlpha = a;
    ctx.strokeStyle = rgba(L.ink, 0.16);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (let k = 0; k < n; k++) {
      const angle = (2 * Math.PI * k) / n + (g.now / 1000) * (0.8 / (s + 1)) + s * 1.3;
      const away = s === shells.length - 1 && k === n - 1 ? out : 0;
      const [ex, ey] = [
        x + (r + away * 170 * u) * Math.cos(angle),
        y + (r + away * 50 * u) * Math.sin(angle),
      ];
      charge(g, ex, ey, 4.6 * u, -1, a * (1 - away));
    }
  });
  if (drawn) {
    // the nucleons packed as a sunflower packs its seeds
    const rnd = mulberry32(protons * 31 + neutrons);
    const kinds = [...Array<number>(protons).fill(1), ...Array<number>(neutrons).fill(0)].sort(
      () => rnd() - 0.5
    );
    kinds.forEach((sign, i) => {
      const r = 4.8 * u * Math.sqrt(i);
      const th = i * 2.39996;
      charge(g, x + r * Math.cos(th), y + r * Math.sin(th), 5.6 * u, sign, a);
    });
  } else {
    charge(g, x, y, 15 * u, 0, a);
    mark(g, `${protons}+`, x, y + 0.5, a, 11, WHITE);
  }
}

const atom: Draw = (g, a) => {
  const { ctx, cx, cy, u, L } = g;
  const ax = cx - 190 * u;
  const ay = cy - 6 * u;
  atomAt(g, ax, ay, 11, 12, [2, 8, 1], [46, 78, 110], a);
  arrow(ctx, ax + 84 * u, ay - 112 * u, ax + 22 * u, ay - 24 * u, L.ink, 0.55 * a, 1.5, 7);
  say(g, 'nucleus: protons and neutrons', ax + 88 * u, ay - 120 * u, 0.85 * a, 12.5, 'left');
  say(g, 'electrons, orbiting it', ax + 112 * u, ay + 92 * u, 0.85 * a, 12.5, 'left');
  say(
    g,
    'sodium: 11 protons, 12 neutrons and 11 electrons — neutral',
    ax,
    g.h - 16 * u,
    0.85 * a,
    13
  );
  // the periodic table: its 118 elements, sodium among them
  const cell = 11 * u;
  const pitch = 13 * u;
  const tx = cx + 110 * u;
  const ty = cy - 70 * u;
  ctx.globalAlpha = a;
  for (const [row, col] of TABLE) {
    ctx.fillStyle = row === 3 && col === 1 ? rgba(VOLT, 0.95) : rgba(mix(L.page, L.ink, 0.16), 1);
    ctx.fillRect(tx + (col - 1) * pitch, ty + (row - 1) * pitch, cell, cell);
  }
  ctx.globalAlpha = 1;
  say(g, 'Na', tx - 8 * u, ty + 2 * pitch + cell / 2, 0.95 * a, 12, 'right', VOLT);
  say(g, '118 known elements: the periodic table', tx, ty - 20 * u, 0.85 * a, 13, 'left');
  say(
    g,
    'each defined by its number of protons',
    tx,
    ty + 10 * pitch + 18 * u,
    0.75 * a,
    12.5,
    'left'
  );
};

/** An atom in a molecule: a ball with its symbol. */
function ball(g: G, x: number, y: number, r: number, fill: RGB, symbol: string, a: number) {
  const { ctx, L } = g;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = rgba(fill, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.35);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.globalAlpha = 1;
  mark(
    g,
    symbol,
    x,
    y + 1,
    a,
    Math.round((r / g.u) * 0.7),
    fill[0] + fill[1] + fill[2] > 500 ? L.ink : WHITE
  );
}
const molecules: Draw = (g, a) => {
  const { cx, cy, u, L } = g;
  const O: RGB = [100, 116, 139];
  const H: RGB = mix(L.page, [226, 232, 240], 0.6);
  const sway = (p: number) => 2.5 * u * Math.sin(g.now / 520 + p);
  const ox = cx - 200 * u;
  ball(g, ox - 25 * u + sway(0), cy - 14 * u, 32 * u, O, 'O', a);
  ball(g, ox + 25 * u - sway(0), cy - 14 * u, 32 * u, O, 'O', a);
  say(g, 'oxygen, O_{2}: two oxygen atoms', ox, cy + 58 * u, 0.85 * a, 14);
  const wx = cx + 200 * u;
  ball(g, wx - 40 * u - sway(1), cy + 16 * u, 19 * u, H, 'H', a);
  ball(g, wx + 40 * u + sway(1), cy + 16 * u, 19 * u, H, 'H', a);
  ball(g, wx, cy - 14 * u, 34 * u, O, 'O', a);
  say(g, 'water, H_{2}O: two hydrogen atoms and an oxygen', wx, cy + 58 * u, 0.85 * a, 14);
};

const ions: Draw = (g, a) => {
  const { cx, cy, u, L } = g;
  // sodium gives up its outermost electron; then chlorine takes one
  const lose = smooth(clamp01((g.t - 900) / 1400));
  const gain = smooth(clamp01((g.t - 2100) / 1400));
  const y = cy - 12 * u;
  const nx = cx - 220 * u;
  atomAt(g, nx, y, 11, 12, [2, 8, 1], [24, 42, 62], a, { drawn: false, out: lose });
  const na = lose > 0.5;
  say(
    g,
    na ? 'a sodium ion, Na^{+}' : 'a sodium atom, Na',
    nx,
    y + 88 * u,
    a,
    15,
    'center',
    na ? POS : L.ink
  );
  say(g, 'an electron short: charge +1', nx, y + 110 * u, 0.85 * a * lose, 13, 'center', POS);
  const kx = cx + 200 * u;
  atomAt(g, kx, y, 17, 18, [2, 8, 8], [24, 42, 62], a, { drawn: false, out: 1 - gain });
  const cl = gain > 0.5;
  say(
    g,
    cl ? 'a chloride ion, Cl^{−}' : 'a chlorine atom, Cl',
    kx,
    y + 88 * u,
    a,
    15,
    'center',
    cl ? NEG : L.ink
  );
  say(g, 'an electron extra: charge −1', kx, y + 110 * u, 0.85 * a * gain, 13, 'center', NEG);
  say(
    g,
    'potassium too gives up one, K^{+}; calcium gives up two, Ca^{2+}',
    cx,
    g.h - 14 * u,
    0.75 * a * gain,
    13
  );
};

const current: Draw = (g, a) => {
  const { ctx, cx, cy, u, L } = g;
  const [x0, x1] = [60 * u, g.w - 60 * u];
  const y = cy - 46 * u;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(x0, y - 26 * u, x1 - x0, 52 * u, 26 * u);
  ctx.fillStyle = rgba(mix(L.page, L.ink, 0.06), 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.25);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // charges streaming along, and the line they are counted across
  const every = 64 * u;
  const run = (ms: number) => (90 * u * ms) / 1000;
  const start = x0 + 30 * u;
  for (let x = start + (run(g.now) % every) - every; x < x1 - 20 * u; x += every)
    if (x > x0 + 20 * u) charge(g, x, y + 8 * u * Math.sin((x - start) / (37 * u)), 11 * u, 1, a);
  line(g, cx, y - 42 * u, cx, y + 42 * u, 0.8 * a, VOLT, 2, 5);
  say(g, 'count the charge crossing here', cx, y - 54 * u, 0.85 * a, 12.5, 'center', VOLT);
  // how much has crossed since the slide began, and how long that took
  const secs = g.t / 1000;
  const crossed =
    Math.floor((run(g.now) - (cx - start)) / every) -
    Math.floor((run(g.now - g.t) - (cx - start)) / every);
  const ry = cy + 40 * u;
  say(g, `charge: Q = ${crossed}`, cx - 300 * u, ry, 0.9 * a, 14, 'left');
  say(g, `time: t = ${secs.toFixed(1)} s`, cx - 120 * u, ry, 0.9 * a, 14, 'left');
  const rate = secs > 1 ? ` = ${(crossed / secs).toFixed(2)} a second` : '';
  say(g, `current: I = Q / t${rate}`, cx + 50 * u, ry, 0.95 * a, 14, 'left', VOLT);
  say(
    g,
    'measured in amperes, A: one ampere is one coulomb a second',
    cx,
    g.h - 24 * u,
    0.8 * a,
    13
  );
};

const carriers: Draw = (g, a) => {
  const { cx, cy, u } = g;
  const y = cy - 10 * u;
  const pores = [cx - 240 * u, cx, cx + 240 * u];
  membrane(g, y, 30 * u, g.w - 30 * u, a, pores);
  pores.forEach((px) => channel(g, px, y, a));
  const kinds: IonKind[] = ['Na', 'K', 'Cl', 'Ca'];
  const rnd = mulberry32(5);
  for (let i = 0; i < 24; i++) {
    const [bx, side, p, q, depth] = [rnd(), rnd() < 0.5 ? -1 : 1, rnd() * 6.3, rnd() * 6.3, rnd()];
    const x = 40 * u + bx * (g.w - 80 * u) + drift(g.now, p, q, 14 * u);
    const yy = y + side * (42 + 52 * depth) * u + drift(g.now, q, p, 8 * u);
    if (pores.some((px) => Math.abs(px - x) < 30 * u)) continue;
    ion(g, x, yy, 8 * u, kinds[i % 4], 0.8 * a);
  }
  // through each channel, now and then, an ion of one kind or another
  pores.forEach((px, k) => {
    const c = cycle(g.now, 2400, k * 800);
    const kind = kinds[(Math.floor((g.now + k * 800) / 2400) + k) % 4];
    const yy = y + (k % 2 ? 1 : -1) * lerp(62, -62, smooth(c)) * u;
    const fade = a * Math.min(1, 4 * c, 4 * (1 - c));
    ion(g, px, yy, 8 * u, kind, fade);
    say(g, IONS[kind].name, px + 16 * u, yy, 0.9 * fade, 12.5, 'left', IONS[kind].colour);
  });
  kinds.forEach((kind, k) => {
    const kx = cx - 225 * u + k * 140 * u;
    ion(g, kx, g.h - 18 * u, 7 * u, kind, a);
    say(g, IONS[kind].name, kx + 14 * u, g.h - 18 * u, 0.9 * a, 13, 'left', IONS[kind].colour);
  });
};

const acdc: Draw = (g, a) => {
  const { ctx, u, L } = g;
  const [x0, x1] = [50 * u, g.w * 0.58];
  const rows: [number, string, boolean][] = [
    [g.cy - 70 * u, 'direct current, DC: one way only', false],
    [g.cy + 64 * u, 'alternating current, AC: back and forth', true],
  ];
  const swing = (ms: number) => (2 * Math.PI * ms) / 2000;
  for (const [y, name, ac] of rows) {
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.roundRect(x0, y - 18 * u, x1 - x0, 36 * u, 18 * u);
    ctx.fillStyle = rgba(mix(L.page, L.ink, 0.06), 1);
    ctx.fill();
    ctx.globalAlpha = 1;
    const every = 56 * u;
    const shift = ac ? 30 * u * Math.sin(swing(g.now)) : ((80 * u * g.now) / 1000) % every;
    for (let x = x0 + 26 * u - every; x < x1; x += every) {
      const xx = x + shift;
      if (xx > x0 + 14 * u && xx < x1 - 14 * u) charge(g, xx, y, 9 * u, 1, a);
    }
    say(g, name, x0 + 4 * u, y - 34 * u, 0.9 * a, 13.5, 'left');
    // its current over the last four seconds, now at the right
    const p: Box = { l: g.w * 0.65, t: y - 28 * u, r: g.w - 40 * u, b: y + 28 * u };
    const mid = (p.t + p.b) / 2;
    line(g, p.l, mid, p.r, mid, 0.35 * a, L.ink, 1);
    line(g, p.l, p.t, p.l, p.b, 0.35 * a, L.ink, 1);
    const pts: [number, number][] = [];
    for (let k = 0; k <= 80; k++) {
      const f = k / 80;
      const v = ac ? Math.cos(swing(g.now - (1 - f) * 4000)) : 0.7;
      pts.push([lerp(p.l, p.r, f), mid - v * 22 * u]);
    }
    curve(g, pts, a, VOLT, 2.2);
    say(g, 'current', p.l - 6 * u, p.t + 4 * u, 0.6 * a, 11.5, 'right');
    say(g, 'time', p.r, p.b + 10 * u, 0.6 * a, 11.5, 'right');
  }
};

const force: Draw = (g, a) => {
  const { cx, cy, u, L } = g;
  const c = cycle(g.now, 3200);
  const fade = a * ends(c);
  const x0 = cx - 330 * u;
  const y = cy - 10 * u;
  const at = (f: number) => x0 + 600 * u * f * f;
  // where it was at equal moments before: further apart each time
  for (let k = 1; k <= 6; k++) {
    const f = c - k * 0.12;
    if (f >= 0) charge(g, at(f), y, 14 * u, 1, fade * 0.2 * (1 - k / 7));
  }
  const x = at(c);
  charge(g, x, y, 16 * u, 1, fade);
  arrow(g.ctx, x + 22 * u, y, x + 86 * u, y, VOLT, fade, 3, 11);
  say(g, 'force', x + 54 * u, y - 20 * u, 0.9 * fade, 13.5, 'center', VOLT);
  arrow(
    g.ctx,
    x - 6 * u,
    y + 34 * u,
    x - 6 * u + (12 + 150 * c) * u,
    y + 34 * u,
    L.ink,
    0.6 * fade,
    2,
    8
  );
  say(g, 'speed', x - 12 * u, y + 34 * u, 0.7 * fade, 12, 'right');
  say(
    g,
    'a steady force speeds it up: the gaps between where it was, at equal moments, grow',
    cx,
    g.h - 24 * u,
    0.8 * a,
    13
  );
};

const work: Draw = (g, a) => {
  const { cx, cy, u, L } = g;
  const c = cycle(g.now, 4400);
  const k = smooth(clamp01(c / 0.7));
  const fade = a * ends(c);
  const [xa, xb] = [cx - 250 * u, cx + 170 * u];
  const x = lerp(xa, xb, k);
  const y = cy - 34 * u;
  charge(g, xa, y, 14 * u, 1, 0.15 * fade);
  charge(g, x, y, 16 * u, 1, fade);
  arrow(g.ctx, x - 96 * u, y, x - 24 * u, y, VOLT, fade, 3, 11);
  say(g, 'force, F', x - 60 * u, y - 20 * u, 0.9 * fade, 13, 'center', VOLT);
  const dy = y + 32 * u;
  line(g, xa, dy, x, dy, 0.7 * fade, L.ink, 1.5);
  line(g, xa, dy - 7 * u, xa, dy + 7 * u, 0.7 * fade, L.ink, 1.5);
  line(g, x, dy - 7 * u, x, dy + 7 * u, 0.7 * fade, L.ink, 1.5);
  say(g, 'distance, d', (xa + x) / 2, dy + 17 * u, 0.85 * fade, 13);
  meter(g, xa, xb, cy + 60 * u, k, fade, 'energy transferred: the work done');
  formula(g, 'W = F d', cx - 40 * u, g.h - 26 * u, a, 22);
  say(g, 'measured in joules, J', cx + 20 * u, g.h - 26 * u, 0.75 * a, 13, 'left');
};

const separate: Draw = (g, a) => {
  const { cx, cy, u, L } = g;
  const c = cycle(g.now, 4800);
  const k = smooth(clamp01(c / 0.7));
  const fade = a * ends(c);
  const y = cy - 34 * u;
  const xn = cx - 200 * u;
  const xp = lerp(xn + 50 * u, cx + 170 * u, k);
  charge(g, xn, y, 20 * u, -1, fade);
  charge(g, xp, y, 20 * u, 1, fade);
  // the pull between them, and the work done pulling them apart
  line(g, xn + 24 * u, y, xp - 24 * u, y, 0.4 * fade, L.ink, 1.4, 4);
  say(g, 'pulling back', (xn + xp) / 2, y - 16 * u, 0.6 * fade * clamp01((k - 0.15) * 4), 12);
  arrow(g.ctx, xp + 26 * u, y, xp + 90 * u, y, VOLT, fade, 3, 11);
  say(g, 'work done pulling it away', xp + 28 * u, y - 22 * u, 0.85 * fade, 12.5, 'left', VOLT);
  meter(g, xn, cx + 170 * u, cy + 40 * u, k, fade, 'stored: a voltage between them');
  formula(g, 'W = q V', cx - 40 * u, g.h - 26 * u, a, 22);
  say(g, 'measured in joules, J', cx + 20 * u, g.h - 26 * u, 0.75 * a, 13, 'left');
};

const voltage: Draw = (g, a) => {
  const { ctx, cx, cy, u, L } = g;
  const [xl, xr] = [cx - 170 * u, cx + 170 * u];
  const [yt, yb] = [cy - 60 * u, cy + 76 * u];
  const plates: [number, number][] = [
    [xl, 1],
    [xr, -1],
  ];
  for (const [x, sign] of plates) {
    ctx.globalAlpha = a;
    ctx.fillStyle = rgba(mix(L.page, L.ink, 0.35), 1);
    ctx.fillRect(x - 3 * u, yt, 6 * u, yb - yt);
    ctx.globalAlpha = 1;
    for (let k = 0; k < 5; k++)
      charge(g, x + sign * 15 * u, yt + 16 * u + k * 26 * u, 8 * u, sign, a);
  }
  // a positive charge let go between them, speeding up as it gives up its energy
  const c = cycle(g.now, 2800);
  charge(g, lerp(xl + 44 * u, xr - 44 * u, c * c), cy + 8 * u, 11 * u, 1, a * ends(c));
  say(g, 'each coulomb that crosses gives up W joules', cx, yb + 22 * u, 0.8 * a, 12.5);
  // a voltmeter across them
  const my = yt - 40 * u;
  for (const x of [xl, xr]) line(g, x, yt, x, my, 0.55 * a, L.ink, 1.4);
  line(g, xl, my, cx - 44 * u, my, 0.55 * a, L.ink, 1.4);
  line(g, cx + 44 * u, my, xr, my, 0.55 * a, L.ink, 1.4);
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.roundRect(cx - 44 * u, my - 16 * u, 88 * u, 32 * u, 6 * u);
  ctx.fillStyle = rgba(mix(L.page, L.ink, 0.06), 1);
  ctx.fill();
  ctx.strokeStyle = rgba(L.ink, 0.5);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.globalAlpha = 1;
  say(g, 'V', cx, my, a, 17, 'center', VOLT);
  formula(g, 'V = W / q', cx - 150 * u, g.h - 20 * u, a, 20);
  say(g, 'measured in volts, V', cx - 70 * u, g.h - 20 * u, 0.8 * a, 13, 'left');
};

const resistance: Draw = (g, a) => {
  const { ctx, cx, cy, u, L } = g;
  const [x0, x1] = [70 * u, g.w - 70 * u];
  const rows: [number, number, number, string][] = [
    [cy - 74 * u, 30, 90, 'low resistance: a large current'],
    [cy + 40 * u, 18, 40, 'high resistance: a small current'],
  ];
  for (const [y, gap, speed, name] of rows) {
    ctx.globalAlpha = a;
    ctx.fillStyle = rgba(mix(L.page, L.ink, 0.07), 1);
    ctx.beginPath();
    ctx.roundRect(x0, y - 20 * u, x1 - x0, 40 * u, 20 * u);
    ctx.fill();
    // the narrowing the charges squeeze through
    ctx.fillStyle = rgba(mix(L.page, L.ink, 0.25), 1);
    ctx.fillRect(cx - 110 * u, y - 20 * u, 220 * u, (20 - gap / 2) * u);
    ctx.fillRect(cx - 110 * u, y + (gap / 2) * u, 220 * u, (20 - gap / 2) * u);
    ctx.globalAlpha = 1;
    const every = (speed > 60 ? 46 : 80) * u;
    const run = ((speed * u * g.now) / 1000) % every;
    for (let x = x0 + 20 * u + run - every; x < x1 - 14 * u; x += every)
      if (x > x0 + 12 * u) charge(g, x, y, 7 * u, 1, a);
    say(g, name, x0 + 6 * u, y - 34 * u, 0.9 * a, 13.5, 'left');
  }
  formula(g, 'R = V / I', cx - 160 * u, g.h - 22 * u, a, 20);
  say(g, 'measured in ohms, Ω', cx - 80 * u, g.h - 22 * u, 0.8 * a, 13, 'left');
};

const conductance: Draw = (g, a) => {
  const { cx, cy, u } = g;
  const y = cy - 26 * u;
  const pores = [-2, -1, 0, 1, 2].map((k) => cx + k * 150 * u);
  // the channels opening one by one
  const opened = Math.min(5, Math.floor(clamp01((g.t - 400) / 3600) * 6));
  membrane(g, y, 30 * u, g.w - 30 * u, a, pores);
  pores.forEach((px, k) => {
    const open = k < opened ? 1 : 0;
    channel(g, px, y, a, open);
    if (!open) return;
    for (const lag of [0, 0.5]) {
      const c = cycle(g.now, 1600, k * 330 + lag * 1600);
      charge(g, px, y - lerp(56, -56, c) * u, 8 * u, 1, a * Math.min(1, 5 * c, 5 * (1 - c)));
    }
  });
  meter(
    g,
    cx - 230 * u,
    cx + 150 * u,
    y + 100 * u,
    opened / 5,
    a,
    `conductance: ${opened} of 5 channels open`
  );
  formula(g, 'G = 1 / R', cx - 140 * u, g.h - 20 * u, a, 20);
  say(g, 'measured in siemens, S', cx - 60 * u, g.h - 20 * u, 0.8 * a, 13, 'left');
};

const ohm: Draw = (g, a) => {
  const { cx, cy, u, L } = g;
  // the voltage across a resistor turned up and down, and the current through it following
  const v = 0.5 - 0.5 * Math.cos((2 * Math.PI * g.now) / 4400);
  const b: Box = { l: cx - 350 * u, t: cy - 100 * u, r: cx - 70 * u, b: cy + 84 * u };
  const to = axes(g, b, 'voltage, V', 'current, I', a);
  curve(g, [to(0, 0), to(1, 0.9)], a, L.ink, 2);
  const [px, py] = to(v, 0.9 * v);
  line(g, px, py, px, b.b, 0.5 * a, VOLT, 1.4, 4);
  line(g, b.l, py, px, py, 0.5 * a, VOLT, 1.4, 4);
  charge(g, px, py, 6 * u, 0, a);
  say(
    g,
    'a straight line: double the voltage, double the current',
    (b.l + b.r) / 2,
    b.b + 38 * u,
    0.75 * a,
    12.5
  );
  const rx = cx + 190 * u;
  const ry = cy - 14 * u;
  const half = (SPAN / 2) * u;
  line(g, rx - 150 * u, ry, rx - half, ry, a);
  line(g, rx + half, ry, rx + 150 * u, ry, a);
  part(g, 'resistor', rx, ry, false, a);
  arrow(g.ctx, rx - 140 * u, ry + 22 * u, rx - 70 * u, ry + 22 * u, L.ink, 0.7 * a, 2, 8);
  say(g, `I = ${(9 * v).toFixed(1)} mA`, rx - 105 * u, ry + 44 * u, 0.9 * a, 14);
  say(g, `V = ${(9 * v).toFixed(1)} V`, rx, ry - 40 * u, 0.9 * a, 14, 'center', VOLT);
  say(g, 'R = 1 kΩ', rx + 100 * u, ry + 44 * u, 0.75 * a, 14);
  formula(g, 'V = I R', rx, g.h - 34 * u, a, 26);
};

const capacitance: Draw = (g, a) => {
  const { ctx, cx, cy, u, L } = g;
  // charge piling up on the plates, and the voltage across them rising with it
  const n = Math.round(smooth(clamp01((g.t - 400) / 3600)) * 6);
  const [xl, xr] = [cx - 35 * u, cx + 35 * u];
  const [yt, yb] = [cy - 84 * u, cy + 66 * u];
  const wy = (yt + yb) / 2;
  line(g, cx - 300 * u, wy, xl, wy, a);
  line(g, xr, wy, cx + 300 * u, wy, a);
  ctx.globalAlpha = a;
  ctx.fillStyle = rgba(mix(L.page, L.ink, 0.6), 1);
  ctx.fillRect(xl - 4 * u, yt, 8 * u, yb - yt);
  ctx.fillRect(xr - 4 * u, yt, 8 * u, yb - yt);
  ctx.globalAlpha = 1;
  for (let k = 0; k < n; k++) {
    const y = yt + 13 * u + k * 25 * u;
    charge(g, xl + 14 * u, y, 8 * u, 1, a);
    charge(g, xr - 14 * u, y, 8 * u, -1, a);
  }
  say(g, `charge: Q = ${n} on each plate`, cx - 60 * u, yb + 24 * u, 0.9 * a, 13.5, 'right');
  say(g, `voltage: V = ${n * 10} mV`, cx + 60 * u, yb + 24 * u, 0.9 * a, 13.5, 'left', VOLT);
  say(
    g,
    'the more charge it holds, the higher the voltage across it, in proportion',
    cx,
    yt - 22 * u,
    0.75 * a,
    12.5
  );
  formula(g, 'C = Q / V', cx - 140 * u, g.h - 18 * u, a, 20);
  say(g, 'measured in farads, F', cx - 60 * u, g.h - 18 * u, 0.8 * a, 13, 'left');
};

const power: Draw = (g, a) => {
  const { cx, cy, u } = g;
  const box: Box = { l: cx - 340 * u, t: cy - 92 * u, r: cx + 40 * u, b: cy + 70 * u };
  const mid = (box.t + box.b) / 2;
  const flicker = 0.85 + 0.15 * Math.sin(g.now / 170);
  loop(
    g,
    box,
    [
      { kind: 'battery', edge: 'left', at: 0.5 },
      { kind: 'bulb', edge: 'right', at: 0.5, lit: flicker },
    ],
    a
  );
  flowRound(
    g,
    box,
    a,
    (80 * u * g.now) / 1000,
    50,
    (x, y) => (x === box.l || x === box.r) && Math.abs(y - mid) < 32 * u
  );
  say(g, '9 V', box.l - 22 * u, mid, 0.9 * a, 14, 'right', VOLT);
  const tx = cx + 110 * u;
  say(g, 'voltage: V = 9 V', tx, cy - 64 * u, 0.9 * a, 14, 'left');
  say(g, 'current: I = 0.5 A', tx, cy - 36 * u, 0.9 * a, 14, 'left');
  say(g, 'power: P = V I = 4.5 W', tx, cy - 8 * u, 0.95 * a, 14, 'left', VOLT);
  say(g, '4.5 joules a second, as light and heat', tx, cy + 18 * u, 0.75 * a, 12.5, 'left');
  formula(g, 'P = W / t = (W / Q) (Q / t) = V I', cx, g.h - 20 * u, a, 19);
};

/** A circuit's box, as the circuit slides draw it. */
const circuitBox = (g: G): Box => ({
  l: g.cx - 220 * g.u,
  t: g.cy - 96 * g.u,
  r: g.cx + 220 * g.u,
  b: g.cy + 76 * g.u,
});
const circuit: Draw = (g, a) => {
  const { cx, u } = g;
  const box = circuitBox(g);
  const mid = (box.t + box.b) / 2;
  loop(
    g,
    box,
    [
      { kind: 'battery', edge: 'left', at: 0.5 },
      { kind: 'resistor', edge: 'top', at: 0.5 },
    ],
    a
  );
  flowRound(
    g,
    box,
    a,
    (80 * u * g.now) / 1000,
    50,
    (x, y) =>
      (x === box.l && Math.abs(y - mid) < 32 * u) || (y === box.t && Math.abs(x - cx) < 32 * u)
  );
  say(g, 'battery', box.l - 30 * u, mid, 0.85 * a, 13, 'right');
  say(g, 'resistor', cx, box.t - 30 * u, 0.85 * a, 13);
  say(
    g,
    "a closed path: charge flows round it, driven by the battery's voltage",
    cx,
    g.h - 18 * u,
    0.8 * a,
    13
  );
};

/** A circuit's four parts: where each goes, what it is, and what it is in a neuron. */
const PARTS: { kind: Part; edge: Edge; is: string; neuron: string }[] = [
  {
    kind: 'battery',
    edge: 'left',
    is: 'A battery: a voltage source',
    neuron: 'in a neuron: the ion gradients across the membrane',
  },
  {
    kind: 'resistor',
    edge: 'top',
    is: 'A resistor: resistance',
    neuron: "in a neuron: the membrane's channels, and the fluid inside",
  },
  {
    kind: 'capacitor',
    edge: 'right',
    is: 'A capacitor: it stores charge',
    neuron: 'in a neuron: the membrane itself',
  },
  {
    kind: 'switch',
    edge: 'bottom',
    is: 'A switch: it opens and closes the path',
    neuron: 'in a neuron: ion channels gating',
  },
];
/**
 * What each of a circuit's parts is in a neuron, drawn small round (x, y): sodium crowded outside and potassium
 * inside; ions through a channel; charge held either side of the membrane; a channel opening as the switch shuts.
 */
function analogue(g: G, i: number, x: number, y: number, a: number, open: number) {
  if (a < 0.01) return;
  const { u } = g;
  const [x0, x1] = [x - 150 * u, x + 150 * u];
  const pore = i === 1 || i === 3;
  membrane(g, y, x0, x1, a, pore ? [x] : []);
  say(g, 'outside', x0, y - 62 * u, 0.55 * a, 11.5, 'left');
  say(g, 'inside', x0, y + 62 * u, 0.55 * a, 11.5, 'left');
  if (i === 0) {
    // sodium crowded outside and potassium inside, a few of each the other side
    const rnd = mulberry32(21);
    for (let k = 0; k < 12; k++) {
      const [jx, out, inn] = [rnd() - 0.5, rnd(), rnd()];
      const ix = x0 + 36 * u + (k + jx * 0.6) * 21 * u;
      ion(g, ix, y - (24 + 30 * out) * u, 5.5 * u, k % 5 === 3 ? 'K' : 'Na', a);
      ion(g, ix + 8 * u, y + (24 + 30 * inn) * u, 5.5 * u, k % 5 === 1 ? 'Na' : 'K', a);
    }
    say(g, IONS.Na.name, x1 + 10 * u, y - 40 * u, 0.9 * a, 12.5, 'left', IONS.Na.colour);
    say(g, IONS.K.name, x1 + 10 * u, y + 40 * u, 0.9 * a, 12.5, 'left', IONS.K.colour);
  } else if (i === 2) {
    for (let k = 0; k < 9; k++) {
      charge(g, x0 + 30 * u + k * 30 * u, y - 24 * u, 5.5 * u, 1, a);
      charge(g, x0 + 30 * u + k * 30 * u, y + 24 * u, 5.5 * u, -1, a);
    }
  } else {
    // a closed switch lets current through, as an open channel does
    const flowing = i === 1 ? 1 : 1 - open;
    const period = i === 1 ? 2600 : 1600;
    channel(g, x, y, a, flowing);
    for (const lag of [0, 0.5]) {
      const c = cycle(g.now, period, lag * period);
      ion(
        g,
        x,
        y - lerp(52, -52, c) * u,
        6 * u,
        'Na',
        a * flowing * Math.min(1, 5 * c, 5 * (1 - c))
      );
    }
    if (i === 3) {
      const now = flowing > 0.5 ? 'switch closed: channel open' : 'switch open: channel shut';
      say(g, now, x, y + 84 * u, 0.85 * a, 12.5, 'center', VOLT);
    }
  }
}
const parts: Draw = (g, a, P) => {
  const { cx, cy, u } = g;
  const box: Box = { l: cx - 370 * u, t: cy - 86 * u, r: cx - 110 * u, b: cy + 80 * u };
  // the switch flicks open and shut while it is the part picked out
  const open = P.focus[3] > 0.5 && Math.sin((2 * Math.PI * g.now) / 2600) < 0 ? 1 : 0;
  loop(
    g,
    box,
    PARTS.map((p, i) => ({ kind: p.kind, edge: p.edge, at: 0.5, pick: P.focus[i], open })),
    a
  );
  PARTS.forEach((p, i) => {
    const [x, y] = onEdge(box, p.edge, 0.5);
    const [lx, ly, align]: [number, number, CanvasTextAlign] =
      p.edge === 'left'
        ? [x - 30 * u, y, 'right']
        : p.edge === 'right'
          ? [x + 30 * u, y, 'left']
          : [x, y + (p.edge === 'top' ? -30 : 32) * u, 'center'];
    say(g, p.kind, lx, ly, a * (0.45 + 0.55 * P.focus[i]), 13, align);
    const f = a * P.focus[i];
    if (f < 0.01) return;
    say(g, p.is, cx - 30 * u, cy - 96 * u, f, 17, 'left');
    say(g, p.neuron, cx - 30 * u, cy - 68 * u, 0.95 * f, 14, 'left', VOLT);
    analogue(g, i, cx + 170 * u, cy + 36 * u, f, open);
  });
};

const parallel: Draw = (g, a) => {
  const { cx, cy, u } = g;
  // two loops, through one branch or the other, sized so that their charges fall evenly between each other's
  const [l, t, b] = [cx - 250 * u, cy - 96 * u, cy + 80 * u];
  const mid = (t + b) / 2;
  const half = (SPAN / 2) * u;
  const branches = [l + 280 * u, l + 462.4 * u];
  line(g, l, t, branches[1], t, a);
  line(g, l, b, branches[1], b, a);
  line(g, l, t, l, mid - half, a);
  line(g, l, mid + half, l, b, a);
  part(g, 'battery', l, mid, true, a);
  for (const x of branches) {
    line(g, x, t, x, mid - half, a);
    line(g, x, mid + half, x, b, a);
    part(g, 'resistor', x, mid, true, a);
  }
  // on the wire they share, both streams: the two currents added
  const shift = (70 * u * g.now) / 1000;
  branches.forEach((x, k) => {
    const skip = (px: number, py: number) =>
      (px === l || px === x) && Math.abs(py - mid) < half + 4 * u;
    flowRound(g, { l, t, r: x, b }, a, shift, 91.2, skip, k * 45.6 * u);
  });
  say(g, 'V', l - 24 * u, mid, 0.9 * a, 15, 'right', VOLT);
  branches.forEach((x, k) => {
    say(g, 'V', x - 22 * u, mid, 0.85 * a, 14, 'right', VOLT);
    say(g, `I_${k + 1}`, x + 22 * u, mid, 0.85 * a, 14, 'left');
  });
  say(g, 'the same voltage across each; their currents add up', cx, g.h - 40 * u, 0.85 * a, 13.5);
  formula(g, 'I = I_1 + I_2', cx, g.h - 14 * u, a, 19);
};

const series: Draw = (g, a) => {
  const { cx, u } = g;
  const box = circuitBox(g);
  const mid = (box.t + box.b) / 2;
  const [x1, x2] = [lerp(box.l, box.r, 0.3), lerp(box.l, box.r, 0.7)];
  loop(
    g,
    box,
    [
      { kind: 'battery', edge: 'left', at: 0.5 },
      { kind: 'resistor', edge: 'top', at: 0.3 },
      { kind: 'resistor', edge: 'top', at: 0.7 },
    ],
    a
  );
  flowRound(
    g,
    box,
    a,
    (80 * u * g.now) / 1000,
    50,
    (x, y) =>
      (x === box.l && Math.abs(y - mid) < 32 * u) ||
      (y === box.t && Math.min(Math.abs(x - x1), Math.abs(x - x2)) < 32 * u)
  );
  say(g, 'V', box.l - 24 * u, mid, 0.9 * a, 15, 'right', VOLT);
  say(g, 'V_1', x1, box.t - 30 * u, 0.9 * a, 15, 'center', VOLT);
  say(g, 'V_2', x2, box.t - 30 * u, 0.9 * a, 15, 'center', VOLT);
  say(g, 'the same current through each; their voltages add up', cx, g.h - 40 * u, 0.85 * a, 13.5);
  formula(g, 'V = V_1 + V_2', cx, g.h - 14 * u, a, 19);
};

/** The RC circuit, as its slides draw it: battery, resistor, capacitor and switch round a box; `q` of a full charge held. */
function rcLoop(g: G, box: Box, a: number, open = 0, q = 0) {
  loop(
    g,
    box,
    [
      { kind: 'battery', edge: 'left', at: 0.5 },
      { kind: 'resistor', edge: 'top', at: 0.5 },
      { kind: 'capacitor', edge: 'right', at: 0.5 },
      { kind: 'switch', edge: 'bottom', at: 0.5, open },
    ],
    a
  );
  // the charge it holds: positive on the plate the current comes in at, negative on the other
  const [x, y] = onEdge(box, 'right', 0.5);
  const n = Math.round(q * 4);
  [-18, -9, 9, 18].slice(0, n).forEach((dx) => {
    charge(g, x + dx * g.u, y - 13 * g.u, 4.5 * g.u, 1, a);
    charge(g, x + dx * g.u, y + 13 * g.u, 4.5 * g.u, -1, a);
  });
}
/** What `rcLoop` leaves out of its charges' way: its parts. */
const rcSkip = (box: Box, u: number) => (x: number, y: number) => {
  const [mx, my] = [(box.l + box.r) / 2, (box.t + box.b) / 2];
  const near = 34 * u;
  return (
    ((x === box.l || x === box.r) && Math.abs(y - my) < near) ||
    ((y === box.t || y === box.b) && Math.abs(x - mx) < near)
  );
};
/** How far a capacitor has charged, `t` ms after the switch shuts, with time constant `tau`. */
const charged = (t: number, tau: number) => (t <= 0 ? 0 : 1 - Math.exp(-t / tau));

const rc: Draw = (g, a) => {
  const { ctx, cx, cy, u, L } = g;
  const box: Box = { l: cx - 330 * u, t: cy - 90 * u, r: cx - 50 * u, b: cy + 80 * u };
  rcLoop(g, box, a);
  say(g, 'R', (box.l + box.r) / 2, box.t - 28 * u, 0.9 * a, 16);
  say(g, 'C', box.r + 30 * u, (box.t + box.b) / 2, 0.9 * a, 16, 'left');
  // and the piece of membrane it stands for
  const mx = cx + 220 * u;
  const my = cy - 6 * u;
  ctx.globalAlpha = a;
  ctx.fillStyle = rgba(mix(L.page, POS, 0.05), 1);
  ctx.fillRect(mx - 150 * u, my - 92 * u, 300 * u, 72 * u);
  ctx.fillStyle = rgba(mix(L.page, NEG, 0.05), 1);
  ctx.fillRect(mx - 150 * u, my + 20 * u, 300 * u, 72 * u);
  ctx.globalAlpha = 1;
  membrane(g, my, mx - 150 * u, mx + 150 * u, a, [mx + 70 * u]);
  channel(g, mx + 70 * u, my, a);
  say(g, 'outside', mx - 140 * u, my - 76 * u, 0.6 * a, 12, 'left');
  say(g, 'inside', mx - 140 * u, my + 76 * u, 0.6 * a, 12, 'left');
  say(g, 'the membrane: C', mx - 50 * u, my - 36 * u, 0.9 * a, 13, 'center', VOLT);
  say(g, 'its channels: R', mx + 70 * u, my + 40 * u, 0.9 * a, 13, 'center', VOLT);
  say(g, "the basic electrical model of a neuron's membrane", cx, g.h - 16 * u, 0.8 * a, 13);
};

const kirchhoff: Draw = (g, a) => {
  const { ctx, cx, cy, u, L } = g;
  const box: Box = { l: cx - 300 * u, t: cy - 90 * u, r: cx - 40 * u, b: cy + 76 * u };
  // the switch shutting and the capacitor charging, over and over
  const since = g.still ? 1400 : cycle(g.now, 7000) * 7000 - 900;
  const vc = charged(since, 1100);
  const open = since < 0;
  const vr = open ? 0 : 1 - vc;
  rcLoop(g, box, a, open ? 1 : 0, vc);
  flowRound(g, box, a, 150 * u * vc, 50, rcSkip(box, u));
  say(g, 'V_S = 9.0 V', box.l - 30 * u, (box.t + box.b) / 2, 0.9 * a, 13.5, 'right', VOLT);
  say(g, `V_R = ${(9 * vr).toFixed(1)} V`, (box.l + box.r) / 2, box.t - 30 * u, 0.9 * a, 13.5);
  say(
    g,
    `V_C = ${(9 * vc).toFixed(1)} V`,
    box.r + 30 * u,
    (box.t + box.b) / 2,
    0.9 * a,
    13.5,
    'left',
    NEG
  );
  if (open) say(g, 'open: no current', (box.l + box.r) / 2, box.b + 26 * u, 0.85 * a, 13);
  // the source's voltage, shared between the resistor and the capacitor — or, open, all across the switch's gap
  const bar = { x: cx + 200 * u, w: 64 * u, b: cy + 76 * u, h: 166 * u };
  ctx.globalAlpha = a;
  if (open) {
    ctx.fillStyle = rgba(mix(L.page, L.ink, 0.1), 1);
    ctx.fillRect(bar.x, bar.b - bar.h, bar.w, bar.h);
  }
  ctx.fillStyle = rgba(NEG, 0.7);
  ctx.fillRect(bar.x, bar.b - bar.h * vc, bar.w, bar.h * vc);
  ctx.fillStyle = rgba(L.ink, 0.35);
  ctx.fillRect(bar.x, bar.b - bar.h * (vc + vr), bar.w, bar.h * vr);
  ctx.strokeStyle = rgba(L.ink, 0.6);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(bar.x, bar.b - bar.h, bar.w, bar.h);
  ctx.globalAlpha = 1;
  say(g, 'V_S', bar.x - 10 * u, bar.b - bar.h, 0.85 * a, 13.5, 'right', VOLT);
  if (vr > 0.1)
    say(g, 'V_R', bar.x + bar.w + 10 * u, bar.b - bar.h * (vc + vr / 2), 0.85 * a, 13.5, 'left');
  if (vc > 0.1)
    say(g, 'V_C', bar.x + bar.w + 10 * u, bar.b - (bar.h * vc) / 2, 0.85 * a, 13.5, 'left', NEG);
  if (open)
    say(
      g,
      'all across the open switch',
      bar.x + bar.w + 10 * u,
      bar.b - bar.h / 2,
      0.85 * a,
      13,
      'left'
    );
  formula(g, 'round the loop:  V_S − V_R − V_C = 0,  so  V_S = V_R + V_C', cx, g.h - 18 * u, a, 18);
};

const charging: Draw = (g, a) => {
  const { cx, cy, u, L } = g;
  const box: Box = { l: cx - 420 * u, t: cy - 66 * u, r: cx - 200 * u, b: cy + 70 * u };
  const span = 6400;
  const tau = 1200;
  const since = g.still ? span : cycle(g.now, 8400) * 8400 - 800;
  const vc = charged(since, tau);
  rcLoop(g, box, a, since < 0 ? 1 : 0, vc);
  flowRound(g, box, a, 150 * u * vc, 46, rcSkip(box, u));
  // the capacitor's voltage, drawn as it charges
  const b: Box = { l: cx - 110 * u, t: cy - 100 * u, r: cx + 400 * u, b: cy + 64 * u };
  const to = axes(g, b, 'time, t', 'V_C', a);
  const top = to(0, 0.9)[1];
  line(g, b.l, top, b.r, top, 0.5 * a, L.ink, 1.2, 5);
  say(g, 'V_{max}', b.r, top - 14 * u, 0.75 * a, 13.5, 'right');
  const pts: [number, number][] = [];
  for (let k = 0; k <= 160; k++) {
    const tt = (k / 160) * span;
    if (tt > since) break;
    pts.push(to(tt / span, 0.9 * charged(tt, tau)));
  }
  curve(g, pts, a, VOLT, 2.6);
  const last = pts.at(-1);
  if (last && since < span) charge(g, last[0], last[1], 5 * u, 0, a);
  formula(g, 'V(t) = V_{max} (1 − e^{−t / RC})', cx + 145 * u, g.h - 20 * u, a, 20);
};

const tau: Draw = (g, a) => {
  const { cx, cy, u, L } = g;
  const b: Box = { l: cx - 330 * u, t: cy - 104 * u, r: cx + 330 * u, b: cy + 70 * u };
  const to = axes(g, b, 'time', 'V', a);
  const span = 5;
  const up: [number, number][] = [];
  const down: [number, number][] = [];
  for (let k = 0; k <= 160; k++) {
    const f = k / 160;
    up.push(to(f, 0.9 * (1 - Math.exp(-f * span))));
    down.push(to(f, 0.9 * Math.exp(-f * span)));
  }
  curve(g, up, a, VOLT, 2.6);
  curve(g, down, a, NEG, 2.6);
  // a tick at each time constant
  for (let k = 1; k < span; k++) {
    const [x] = to(k / span, 0);
    line(g, x, b.b, x, b.b + 5 * u, 0.6 * a, L.ink, 1.2);
    say(g, k === 1 ? 'τ' : `${k}τ`, x, b.b + 16 * u, 0.7 * a, 12.5);
  }
  const [x] = to(1 / span, 0);
  const [yUp, yDown] = [to(0, 0.9 * (1 - Math.exp(-1)))[1], to(0, 0.9 * Math.exp(-1))[1]];
  line(g, x, b.b, x, b.t + 10 * u, 0.55 * a, L.ink, 1.3, 5);
  line(g, b.l, yUp, x, yUp, 0.5 * a, VOLT, 1.2, 4);
  line(g, b.l, yDown, x, yDown, 0.5 * a, NEG, 1.2, 4);
  charge(g, x, yUp, 5 * u, 0, a);
  charge(g, x, yDown, 5 * u, 0, a);
  // named in the widening gap between the two curves, clear of both
  say(g, 'charging: 63.2% of the way up', x + 24 * u, yUp + 8 * u, 0.9 * a, 13, 'left', VOLT);
  say(g, 'discharging: down to 36.8%', x + 24 * u, yDown - 6 * u, 0.9 * a, 13, 'left', NEG);
  formula(g, 'τ = R C', cx + 210 * u, b.t + 66 * u, a, 24);
  say(g, 'one time constant', cx + 210 * u, b.t + 94 * u, 0.75 * a, 13);
};

const cable: Draw = (g, a) => {
  const { cx, cy, u } = g;
  // a ladder: a piece of membrane at each rung, joined to the next along the inside through the axial resistance
  const n = 6;
  const step = 118 * u;
  const x0 = cx - 275 * u;
  const xn = x0 + (n - 1) * step;
  const [yt, yb] = [cy - 4 * u, cy + 84 * u];
  const ym = (yt + yb) / 2;
  const size = 0.62;
  const half = (SPAN / 2) * u;
  const lam = 1.5;
  const grow = smooth(clamp01((g.t - 300) / 1600));
  line(g, x0 - 60 * u, yt, x0, yt, a);
  line(g, x0 - 60 * u, yb, xn + 16 * u, yb, a);
  for (let k = 0; k < n; k++) {
    const x = x0 + k * step;
    if (k < n - 1) {
      line(g, x, yt, x + step / 2 - half, yt, a);
      part(g, 'resistor', x + step / 2, yt, false, a);
      line(g, x + step / 2 + half, yt, x + step, yt, a);
    }
    line(g, x - 16 * u, yt, x + 16 * u, yt, a);
    const membraneParts: [number, Part][] = [
      [-16, 'resistor'],
      [16, 'capacitor'],
    ];
    for (const [dx, kind] of membraneParts) {
      const px = x + dx * u;
      line(g, px, yt, px, ym - half * size, a);
      part(g, kind, px, ym, true, a, { size });
      line(g, px, ym + half * size, px, yb, a);
    }
    // the voltage there, falling away from where the current comes in
    const v = Math.exp(-k / lam) * grow;
    g.ctx.globalAlpha = a;
    g.ctx.fillStyle = rgba(VOLT, 0.75);
    g.ctx.fillRect(x - 10 * u, yt - 24 * u - 92 * u * v, 20 * u, 92 * u * v);
    g.ctx.globalAlpha = 1;
  }
  const fall: [number, number][] = [];
  for (let k = 0; k <= 80; k++) {
    const xx = lerp(x0, xn, k / 80);
    fall.push([xx, yt - 24 * u - 92 * u * Math.exp(-(xx - x0) / step / lam) * grow]);
  }
  curve(g, fall, 0.7 * a, VOLT, 1.6, 4);
  say(
    g,
    'falls to 37% over one length constant, λ',
    x0 + 1.7 * step,
    yt - 24 * u - 92 * u * Math.exp(-1.7 / lam) - 22 * u,
    0.9 * a * grow,
    13,
    'left',
    VOLT
  );
  arrow(g.ctx, x0 - 40 * u, yt - 80 * u, x0 - 4 * u, yt - 6 * u, POS, a, 2.4, 10);
  say(g, 'current in', x0 - 40 * u, yt - 92 * u, 0.85 * a, 13, 'center', POS);
  say(g, 'inside', x0 - 66 * u, yt, 0.6 * a, 12, 'right');
  say(g, 'outside', x0 - 66 * u, yb, 0.6 * a, 12, 'right');
  say(g, 'axial R', x0 + step / 2, yt + 22 * u, 0.7 * a, 12);
  say(g, 'membrane R and C', x0, yb + 18 * u, 0.7 * a, 12);
  formula(g, 'V(x) = V_0 e^{−x / λ}', cx + 150 * u, yb + 22 * u + 12 * u, a, 19);
};

const field: Draw = (g, a) => {
  const { ctx, cx, cy, u, L } = g;
  const [yt, yb] = [cy - 112 * u, cy + 96 * u];
  const [xl, xr] = [cx - 320 * u, cx + 120 * u];
  const plates: [number, number][] = [
    [yt, 1],
    [yb, -1],
  ];
  for (const [y, sign] of plates) {
    ctx.globalAlpha = a;
    ctx.fillStyle = rgba(mix(L.page, L.ink, 0.35), 1);
    ctx.fillRect(xl, y - 3 * u, xr - xl, 6 * u);
    ctx.globalAlpha = 1;
    for (let x = xl + 18 * u; x < xr; x += 36 * u)
      charge(g, x, y + sign * 12 * u, 6.5 * u, sign, a);
  }
  // the field, from the positive plate to the negative
  for (let x = xl + 36 * u; x < xr - 10 * u; x += 72 * u)
    arrow(ctx, x, yt + 26 * u, x, yb - 26 * u, L.ink, 0.2 * a, 1.4, 9);
  say(g, 'E', xl - 14 * u, cy, 0.9 * a, 18, 'right');
  // a positive charge pushed along it, and a negative one against it
  const c = cycle(g.now, 2800);
  const k = c * c;
  const fade = a * ends(c);
  const xp = xl + 180 * u;
  const yp = lerp(yt + 44 * u, yb - 44 * u, k);
  charge(g, xp, yp, 13 * u, 1, fade);
  arrow(ctx, xp + 24 * u, yp - 20 * u, xp + 24 * u, yp + 26 * u, VOLT, fade, 2.6, 10);
  say(g, 'F', xp + 34 * u, yp, 0.9 * fade, 15, 'left', VOLT);
  const xq = xl + 324 * u;
  const yq = lerp(yb - 44 * u, yt + 44 * u, k);
  charge(g, xq, yq, 13 * u, -1, fade);
  arrow(ctx, xq + 24 * u, yq + 20 * u, xq + 24 * u, yq - 26 * u, VOLT, fade, 2.6, 10);
  say(g, 'F', xq + 34 * u, yq, 0.9 * fade, 15, 'left', VOLT);
  formula(g, 'F = q E', cx + 290 * u, cy - 30 * u, a, 28);
  say(g, 'q: the charge', cx + 290 * u, cy + 10 * u, 0.8 * a, 13);
  say(g, 'E: the electric field', cx + 290 * u, cy + 32 * u, 0.8 * a, 13);
};

const DRAW: Record<Scene, Draw> = {
  intro,
  charge: chargeScene,
  pairs,
  particles,
  masses: () => {},
  atom,
  molecules,
  ions,
  current,
  carriers,
  acdc,
  force,
  work,
  separate,
  voltage,
  resistance,
  conductance,
  ohm,
  capacitance,
  power,
  circuit,
  parts,
  parallel,
  series,
  rc,
  kirchhoff,
  charging,
  tau,
  cable,
  field,
};

const LABELS: Record<ElecStep, string> = {
  intro: 'Positive and negative charges, red and blue, drifting about.',
  charge:
    'A positive charge, red, and a negative one, blue. Charge is measured in coulombs and written q or Q.',
  attract:
    'Three pairs of charges let go: two positive ones pushing apart, two negative ones pushing apart, and a positive and a negative pulling together.',
  particles:
    "A proton, red and positive; a neutron, grey and uncharged, about the same size; and an electron, a tiny blue dot, negative. The proton's and electron's charges are equal and opposite.",
  sizes:
    "The proton, neutron and electron with their sizes and their masses as bars: the proton's and the neutron's almost equal, the electron's a sliver, 1836 times lighter.",
  atom: "A sodium atom: a nucleus of 11 protons and 12 neutrons, with 11 electrons orbiting it in three shells. Beside it, the periodic table's 118 elements, sodium picked out.",
  molecules:
    'An oxygen molecule, two oxygen atoms bound together; and a water molecule, an oxygen atom with two hydrogens.',
  ions: 'A sodium atom gives up its outermost electron and becomes a positive sodium ion; a chlorine atom takes one and becomes a negative chloride ion.',
  current:
    'Positive charges streaming along a wire, counted as they cross a line; the count, the time and the current, their ratio, alongside.',
  carriers:
    'A membrane with channels through it, and sodium, potassium, chloride and calcium ions about it, now and then one crossing through a channel.',
  acdc: 'Two wires: in one, charges move steadily one way, direct current; in the other they swing back and forth, alternating current. Beside each, its current over time.',
  force:
    'A charge pushed by a steady force speeds up: where it was at equal moments, the gaps grow, and its speed arrow lengthens.',
  work: 'A force pushes a charge through a distance, and a bar fills with the energy transferred: W = F d.',
  separate:
    'A positive charge pulled away from a negative one that pulls it back; the work done fills a bar, stored as a voltage: W = q V.',
  voltage:
    'Two plates, positive and negative, with a voltmeter across them; a positive charge let go between them speeds from one to the other: V = W / q.',
  resistance:
    'Two wires with a narrowing: through the wide one, charges stream quickly; through the narrow, more resisting one, slowly. R = V / I.',
  conductance:
    'A membrane whose channels open one by one, ions flowing through each open one, and a bar of conductance growing: G = 1 / R.',
  ohm: 'A plot of current against voltage, a straight line, a point moving up and down it; and a resistor with the voltage across it and current through it: V = I R.',
  capacitance:
    'Two plates charging, positive on one and negative on the other, the voltage across them rising with the charge: C = Q / V.',
  power:
    'A battery lighting a bulb, charges flowing round: 9 volts and half an amp, 4.5 watts. P = V I.',
  circuit: 'A closed loop of wire with a battery and a resistor, charges flowing round it.',
  battery:
    'A circuit of a battery, a resistor, a capacitor and a switch, the battery picked out: a voltage source; in a neuron, the ion gradients across the membrane.',
  resistor:
    "The same circuit, the resistor picked out: resistance; in a neuron, the membrane's channels, with ions passing through one.",
  capacitor:
    'The same circuit, the capacitor picked out: it stores charge; in a neuron, the membrane, charge held either side.',
  switch:
    'The same circuit, the switch picked out, opening and shutting; in a neuron, a channel gating, open while the switch is shut.',
  parallel:
    'A battery with two resistors side by side, charges going round through either: the same voltage across each, the currents adding up.',
  series:
    'A battery with two resistors one after the other, the same charges going through both: the voltages adding up.',
  rc: 'A circuit of a battery, a resistor, a capacitor and a switch; beside it a piece of membrane, the membrane as the capacitor and its channels as the resistor.',
  kirchhoff:
    "The RC circuit's switch shuts and the capacitor charges: the voltage across the resistor falls as the capacitor's rises, the two always adding up to the battery's.",
  charging:
    "The RC circuit's switch shuts, and a plot draws the capacitor's voltage rising fast, then ever more slowly, towards its maximum.",
  tau: 'A charging curve rising and a discharging curve falling, marked at one time constant: 63.2% of the way up, and down to 36.8%.',
  cable:
    'A ladder of membrane RC circuits joined by axial resistors: current goes in at one end, and the voltage at each rung, shown as bars, fades along it.',
  field:
    'Two plates, positive above and negative below, the field between them; a positive charge pushed down along it and a negative one up against it: F = q E.',
};

export default function ElecFigure({ step, back = false }: { step: ElecStep; back?: boolean }) {
  // what plays out once waits for the slide's words: its clock is held while they type, unless the slide was come back to
  const held = useRef({ step: '', at: 0, back: false });
  return (
    <StepCanvas
      step={step}
      back={back}
      label={LABELS[step]}
      done={DONE}
      pose={(st) => poseFor(st)}
      draw={(f: Frame<ElecStep>, P: Pose) => {
        const h = held.current;
        if (h.step !== f.step) Object.assign(h, { step: f.step, at: 0, back: f.t >= DONE });
        if (!h.back && Number.isFinite(f.t) && document.querySelector('main .typing-caret'))
          h.at = f.t;
        const g: G = {
          ctx: f.ctx,
          L: f.look,
          w: f.w,
          h: f.h,
          cx: f.w / 2,
          cy: f.h / 2,
          u: Math.min(1, f.w / 900),
          ts: Math.max(0.72, Math.min(1, f.w / 900)),
          t: Number.isFinite(f.t) ? f.t - h.at : 10000,
          now: f.still ? 2000 : f.now,
          still: f.still,
        };
        for (const scene of SCENES) if (P.show[scene] > 0.01) DRAW[scene](g, P.show[scene], P);
        words(f.ctx, sectionOf(f.step), 14, 16, f.look.ink, 0.45, 12, 'left');
      }}
    />
  );
}
