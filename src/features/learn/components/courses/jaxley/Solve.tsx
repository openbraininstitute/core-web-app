'use client';

/**
 * The first part of the NEURON and Jaxley course's figure: what any simulator
 * of a detailed neuron has to do. A pyramidal cell, simulated in the page as
 * both simulators would — its voltage, compartment by compartment, as a spike
 * spreads from the soma; the same cell cut into its compartments; a chain of
 * them, each pushing current into its neighbours; forward Euler blowing up
 * where backward Euler does not; and the Hines algorithm solving a tree's
 * equations, from the tips in and back out.
 */

import { clamp01, mix, phase, type RGB, rgba } from '@/features/learn/components/heuristics/shared';
import { buildMorphology } from '@/features/learn/lib/basics/morphologies';

import { arrow, type Look, mathWords, type Room, SERIF, words } from '../ui/canvas';
import StepCanvas, { type Frame } from '../ui/StepCanvas';
import { compartmentsOf, stepping, TreeSim } from './neuron';

export const SOLVE_STEPS = ['cell', 'split', 'spread', 'stiff', 'matrix'] as const;
export type SolveStep = (typeof SOLVE_STEPS)[number];
export const isSolveStep = (s: string): s is SolveStep => SOLVE_STEPS.includes(s as SolveStep);

const MORPH = buildMorphology('pyramidal', 3);
const COMPS = compartmentsOf(MORPH);
const STIFF = stepping(0.4);

/** The voltage, where it is drawn: warm, and hot at a spike's peak; forward and backward Euler's lines. */
const VOLT: RGB = [217, 119, 6];
const HOT: RGB = [220, 38, 38];
const REST: RGB = [100, 116, 139];
const FORWARD: RGB = [214, 50, 58];
const BACKWARD: RGB = [13, 148, 136];

/** The path the chain follows: from the soma out to the furthest apical tip. */
const PATH = (() => {
  const reach = new Float64Array(COMPS.length);
  for (let i = 1; i < COMPS.length; i++) reach[i] = reach[COMPS[i].parent] + COMPS[i].len;
  let tip = 0;
  COMPS.forEach((c, i) => {
    if (c.kind === 'apical' && reach[i] > reach[tip]) tip = i;
  });
  const path: number[] = [];
  for (let i = tip; i >= 0; i = COMPS[i].parent) path.unshift(i);
  return path;
})();
const CHAIN = 8;

/** The simulated neuron, kept across slides and steps; and when, in its own time, current goes in. */
let SIM: TreeSim | null = null;
let LAST = 0;
let OWED = 0;
const PERIOD = 30;
const KICK = 4;
/** How fast the simulation runs, in its ms per second: slowly while the spike starts and spreads, quicker as it fades, quickly through the quiet between spikes. */
const pace = (at: number) => (at >= 2.2 && at < 4.6 ? 1.2 : at >= 2 && at < 8 ? 3 : 25);
function advance(still: boolean, now: number) {
  if (!SIM) {
    SIM = new TreeSim(COMPS);
    if (still) while (SIM.t < 3.15) SIM.step(0.025, SIM.t >= 2 && SIM.t < 3 ? KICK : 0);
  }
  if (still) return SIM;
  const wall = Math.min(100, Math.max(0, now - LAST));
  LAST = now;
  OWED += (wall / 1000) * pace(SIM.t % PERIOD);
  for (let k = 0; OWED >= 0.025 && k < 400; k++) {
    const at = SIM.t % PERIOD;
    SIM.step(0.025, at >= 2 && at < 3 ? KICK : 0);
    OWED -= 0.025;
  }
  return SIM;
}

function voltColour(v: number): RGB {
  const k = clamp01((v + 68) / 105);
  return k < 0.5 ? mix(REST, VOLT, k * 2) : mix(VOLT, HOT, (k - 0.5) * 2);
}

interface Pose {
  /** The cell: where its middle goes, how tall it is drawn (px), how much of it shows and how much its voltage colours it. */
  treeX: number;
  treeY: number;
  treeH: number;
  tree: number;
  live: number;
  /** Its compartments' boundaries and middles; the path to the chain; the chain. */
  ticks: number;
  nodes: number;
  path: number;
  chain: number;
  stiff: number;
  matrix: number;
}

function poseFor(step: SolveStep, R: Room, w: number): Pose {
  const H = R.foot - R.top;
  const mid = R.top + H / 2;
  const wide = w >= 640;
  const big = wide ? Math.min(H * 0.94, w * 1.1) : Math.min(H * 0.8, w * 1.1);
  const P: Pose = {
    treeX: w / 2,
    treeY: wide ? mid : R.top + H * 0.43,
    treeH: big,
    tree: 1,
    live: 1,
    ticks: 0,
    nodes: 0,
    path: 0,
    chain: 0,
    stiff: 0,
    matrix: 0,
  };
  if (step === 'split') Object.assign(P, { ticks: 1, nodes: 1, live: 0.35 });
  else if (step === 'spread') {
    if (wide)
      Object.assign(P, { treeX: Math.max(130, w * 0.2), treeH: Math.min(H * 0.9, w * 0.5) });
    else Object.assign(P, { treeY: R.top + H * 0.27, treeH: H * 0.5 });
    Object.assign(P, { path: 1, chain: 1 });
  } else if (step === 'stiff') Object.assign(P, { tree: 0, live: 0, stiff: 1, treeH: big * 0.8 });
  else if (step === 'matrix') Object.assign(P, { tree: 0, live: 0, matrix: 1, treeH: big * 0.8 });
  return P;
}

interface Scene {
  ctx: CanvasRenderingContext2D;
  P: Pose;
  L: Look;
  R: Room;
  w: number;
  t: number;
  sim: TreeSim;
}

/** Where the drawing's coordinates land on the page. */
function treeFit(P: Pose) {
  const bb = MORPH.bbox;
  const s = P.treeH / (bb.y1 - bb.y0);
  const [cx, cy] = [(bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2];
  return {
    s,
    tx: (x: number) => P.treeX + (x - cx) * s,
    ty: (y: number) => P.treeY + (y - cy) * s,
  };
}

function drawTree(S: Scene) {
  const { ctx, P, L, sim } = S;
  if (P.tree < 0.01) return;
  const f = treeFit(P);
  const plain = mix(L.page, L.ink, 0.55);
  const onPath = new Set(PATH.slice(0, CHAIN + 1));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = P.tree;
  const wide = (i: number) => Math.max(1, COMPS[i].diam * f.s * (onPath.has(i) ? 1 + P.path : 1));
  // the chain's stretch of the path, outlined, so its own voltage still shows
  if (P.path > 0.01) {
    ctx.strokeStyle = rgba(L.ink, 0.45 * P.path);
    for (const i of onPath) {
      if (i === 0) continue;
      const c = COMPS[i];
      ctx.lineWidth = wide(i) + 4;
      ctx.beginPath();
      ctx.moveTo(f.tx(c.x0), f.ty(c.y0));
      ctx.lineTo(f.tx(c.x1), f.ty(c.y1));
      ctx.stroke();
    }
  }
  for (let i = 1; i < COMPS.length; i++) {
    const c = COMPS[i];
    ctx.strokeStyle = rgba(mix(plain, voltColour(sim.v[i]), P.live), 1);
    ctx.lineWidth = wide(i);
    ctx.beginPath();
    ctx.moveTo(f.tx(c.x0), f.ty(c.y0));
    ctx.lineTo(f.tx(c.x1), f.ty(c.y1));
    ctx.stroke();
  }
  ctx.fillStyle = rgba(mix(plain, voltColour(sim.v[0]), P.live), 1);
  ctx.beginPath();
  ctx.arc(f.tx(MORPH.soma.x), f.ty(MORPH.soma.y), MORPH.soma.r * f.s, 0, Math.PI * 2);
  ctx.fill();
  // the cuts between compartments, and each compartment's middle, where its voltage is worked out
  if (P.ticks > 0.01) {
    ctx.globalAlpha = P.tree * P.ticks;
    ctx.strokeStyle = rgba(L.page, 1);
    ctx.lineWidth = 1.6;
    for (let i = 1; i < COMPS.length; i++) {
      const c = COMPS[i];
      const [dx, dy] = [c.x1 - c.x0, c.y1 - c.y0];
      const len = Math.hypot(dx, dy) || 1;
      const half = (c.diam * f.s) / 2 + 2.5;
      const [nx, ny] = [(-dy / len) * half, (dx / len) * half];
      const [x, y] = [f.tx(c.x0), f.ty(c.y0)];
      ctx.beginPath();
      ctx.moveTo(x - nx, y - ny);
      ctx.lineTo(x + nx, y + ny);
      ctx.stroke();
    }
  }
  if (P.nodes > 0.01) {
    ctx.globalAlpha = P.tree * P.nodes;
    ctx.fillStyle = rgba(L.ink, 0.85);
    for (let i = 1; i < COMPS.length; i++) {
      const c = COMPS[i];
      ctx.beginPath();
      ctx.arc(f.tx((c.x0 + c.x1) / 2), f.ty((c.y0 + c.y1) / 2), 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** What each step says on the drawing itself. */
function drawTreeLabels(S: Scene, step: SolveStep) {
  const { ctx, P, L, w, R } = S;
  if (P.tree < 0.05) return;
  const f = treeFit(P);
  const sx = f.tx(MORPH.soma.x);
  const sy = f.ty(MORPH.soma.y);
  const a = P.tree * (step === 'cell' || step === 'split' ? 1 : 0);
  if (a > 0.01) {
    words(ctx, 'the soma', sx + MORPH.soma.r * f.s + 10, sy, L.ink, 0.8 * a, 12.5, 'left', L.page);
    const said =
      step === 'cell'
        ? [`simulated here: ${COMPS.length} compartments,`, 'Hodgkin–Huxley channels in each']
        : [
            `${COMPS.length} compartments, each about 30 µm long:`,
            'a voltage for each, at its middle',
          ];
    const narrow = w < 640;
    said.forEach((line, k) =>
      words(
        ctx,
        line,
        narrow ? w / 2 : P.treeX + 28,
        R.foot - 34 + k * 17,
        L.ink,
        0.75 * a,
        12.5,
        narrow ? 'center' : 'left',
        L.page
      )
    );
  }
}

/** A stretch of the path drawn as a chain of compartments: each one's voltage as a bar, and the current between neighbours. */
function drawChain(S: Scene) {
  const { ctx, P, L, w, R, sim } = S;
  const a = P.chain;
  if (a < 0.01) return;
  const H = R.foot - R.top;
  const wide = w >= 640;
  const box = wide
    ? {
        x: Math.max(280, w * 0.42),
        y: R.top + H * 0.2,
        w: w - Math.max(280, w * 0.42) - 24,
        h: H * 0.62,
      }
    : { x: 30, y: R.top + H * 0.56, w: w - 50, h: H * 0.36 };
  const ids = PATH.slice(0, CHAIN);
  const each = box.w / ids.length;
  const base = box.y + box.h * 0.78;
  const scale = (box.h * 0.62) / 110;
  ctx.save();
  ctx.globalAlpha = a;
  // the axis the bars stand on: rest
  ctx.strokeStyle = rgba(L.ink, 0.25);
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(box.x, base - 5 * scale);
  ctx.lineTo(box.x + box.w, base - 5 * scale);
  ctx.stroke();
  ctx.setLineDash([]);
  ids.forEach((id, k) => {
    const x = box.x + each * k + each * 0.18;
    const bw = each * 0.64;
    const v = sim.v[id];
    const hgt = Math.max(1, (v + 70) * scale);
    ctx.fillStyle = rgba(voltColour(v), 0.9);
    ctx.fillRect(x, base - hgt, bw, hgt);
    // the compartment itself: a short piece of cable
    ctx.fillStyle = rgba(mix(L.page, L.ink, 0.12), 1);
    ctx.strokeStyle = rgba(L.ink, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - each * 0.1, base + 8, bw + each * 0.2, 14, 7);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
  // the current between neighbours, from the higher voltage to the lower
  for (let k = 0; k + 1 < ids.length; k++) {
    const dv = sim.v[ids[k]] - sim.v[ids[k + 1]];
    const strength = clamp01(Math.abs(dv) / 25);
    if (strength < 0.04) continue;
    const xm = box.x + each * (k + 1);
    const y = base + 15;
    const half = each * 0.16;
    const [x0, x1] = dv > 0 ? [xm - half, xm + half] : [xm + half, xm - half];
    arrow(ctx, x0, y, x1, y, VOLT, a * (0.35 + 0.65 * strength), 1.5 + 2 * strength, 7);
  }
  const say = (text: string, x: number, y: number, align: CanvasTextAlign = 'left', size = 12.5) =>
    words(ctx, text, x, y, L.ink, 0.8 * a, size, align, L.page);
  say('the soma', box.x + each * 0.5, base + 38, 'center');
  say('towards a tip', box.x + box.w - each * 0.5, base + 38, 'center');
  say("each compartment's voltage, above rest", box.x, box.y - 4);
  mathWords(
    ctx,
    'current to a neighbour = (V_1 − V_2) / R',
    box.x + box.w / 2,
    base + (wide ? 62 : 56),
    L.ink,
    0.85 * a,
    wide ? 15 : 13.5,
    'center',
    L.page
  );
}

/** Forward against backward Euler: the first compartment's voltage, step by step. */
function drawStiff(S: Scene) {
  const { ctx, P, L, w, R, t } = S;
  const a = P.stiff;
  if (a < 0.01) return;
  const H = R.foot - R.top;
  const box = { x: Math.max(60, w * 0.12), y: R.top + Math.max(34, H * 0.12), w: 0, h: 0 };
  box.w = w - box.x - Math.max(30, w * 0.1);
  box.h = R.foot - box.y - Math.max(54, H * 0.16);
  const [v0, v1] = [-70, -35];
  const px = (tt: number) => box.x + (tt / 0.4) * box.w;
  const py = (v: number) => box.y + box.h - ((v - v0) / (v1 - v0)) * box.h;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(L.ink, 0.2);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const v of [-70, -60, -50, -40]) {
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
  ctx.restore();
  for (const v of [-70, -60, -50, -40])
    words(ctx, String(v), box.x - 6, py(v), L.ink, 0.6 * a, 10.5, 'right');
  for (const tt of [0, 0.1, 0.2, 0.3, 0.4])
    words(ctx, String(tt), px(tt), box.y + box.h + 12, L.ink, 0.6 * a, 10.5, 'center');
  words(ctx, 'time (ms)', box.x + box.w / 2, box.y + box.h + 28, L.ink, 0.7 * a, 11.5, 'center');
  words(ctx, 'voltage (mV)', box.x, box.y - 14, L.ink, 0.7 * a, 11.5, 'left');

  const upTo = clamp01((t - 600) / 3800) * 0.4;
  // forward Euler's line ends where it leaves the chart: its swings beyond are drawn as an arrow, and said
  const gone = STIFF.forward.findIndex((p) => p.v < v0 || p.v > v1);
  const trace = (pts: { t: number; v: number }[], colour: RGB, dots: number) => {
    const shown = pts.filter(
      (p, k) => p.t <= upTo + 1e-9 && (pts !== STIFF.forward || gone < 0 || k <= gone)
    );
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
    ctx.clip();
    ctx.globalAlpha = a;
    ctx.strokeStyle = rgba(colour, 1);
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    shown.forEach((p, k) => (k ? ctx.lineTo(px(p.t), py(p.v)) : ctx.moveTo(px(p.t), py(p.v))));
    ctx.stroke();
    ctx.fillStyle = rgba(colour, 1);
    for (const p of shown) {
      ctx.beginPath();
      ctx.arc(px(p.t), py(p.v), dots, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return shown;
  };
  trace(STIFF.backward, BACKWARD, 3);
  const fe = trace(STIFF.forward, FORWARD, 1.6);
  const out = gone >= 0 && fe.length > gone ? fe[gone] : null;
  const last = STIFF.forward[STIFF.forward.length - 1];
  const wide = w >= 640;
  const size = wide ? 12.5 : 11.5;
  const be = STIFF.backward[Math.round(STIFF.backward.length * 0.6)];
  words(
    ctx,
    `backward Euler, steps of 0.025 ms: steady`,
    px(be.t),
    py(be.v) + 22,
    BACKWARD,
    a * clamp01((upTo - be.t) * 20),
    size,
    'center',
    L.page,
    'italic 600'
  );
  words(
    ctx,
    `forward Euler, steps of ${STIFF.over} ms`,
    px(0.012),
    py(-68),
    FORWARD,
    a * clamp01(upTo * 30),
    size,
    'left',
    L.page,
    'italic 600'
  );
  if (out) {
    // where it left the chart, and how far its swings go
    const x = px(out.t);
    const up = out.v > v1;
    const edge = up ? box.y : box.y + box.h;
    arrow(ctx, x, edge + (up ? 30 : -30), x, edge + (up ? -2 : 2), FORWARD, a, 2, 8);
    const big = Math.abs(last.v);
    const how =
      big >= 1e6 ? `${(big / 1e6).toFixed(1)} million` : Math.round(big).toLocaleString('en-GB');
    const said = wide
      ? `… swinging past ±${how} mV by ${last.t.toFixed(2)} ms`
      : `… past ±${how} mV`;
    ctx.font = `italic ${size}px ${SERIF}`;
    const fits = x + 10 + ctx.measureText(said).width < w - 6;
    words(
      ctx,
      said,
      fits ? x + 10 : x - 10,
      edge + (up ? 22 : -22),
      FORWARD,
      a,
      size,
      fits ? 'left' : 'right',
      L.page
    );
  }

  words(
    ctx,
    `forward Euler is only stable here with steps under ${STIFF.limit.toFixed(4)} ms`,
    wide ? box.x + box.w : box.x + box.w / 2,
    wide ? box.y - 14 : box.y + box.h + 46,
    L.ink,
    0.75 * a,
    size,
    wide ? 'right' : 'center',
    L.page
  );
}

/* ---------------------------------------------------------------- the Hines algorithm */

/** A small tree for the matrix: the soma (0), a trunk, two branches and a basal dendrite; each after its parent. */
const MINI = {
  parent: [-1, 0, 1, 2, 3, 2, 5, 0, 7],
  at: [
    [0, 0],
    [0, -1],
    [0, -2],
    [-0.9, -2.9],
    [-1.5, -3.8],
    [0.9, -2.9],
    [1.5, -3.8],
    [-0.8, 0.9],
    [-1.3, 1.8],
  ] as [number, number][],
};
const FOLD_AT = 1500;
const FOLD_EACH = 600;
const OUT_AT = FOLD_AT + 8 * FOLD_EACH + 600;
const OUT_EACH = 260;
/** Where the algorithm is at `t` ms: how folded each compartment is, and how solved. */
function hinesAt(t: number) {
  const folded = MINI.parent.map((_, i) =>
    i === 0 ? 0 : phase(t, FOLD_AT + (8 - i) * FOLD_EACH, FOLD_EACH * 0.7)
  );
  const solved = MINI.parent.map((_, i) => phase(t, OUT_AT - 300 + i * OUT_EACH, OUT_EACH));
  const busy = MINI.parent.map((_, i) => {
    if (i === 0) return 0;
    const at = FOLD_AT + (8 - i) * FOLD_EACH;
    return t >= at && t < at + FOLD_EACH ? 1 : 0;
  });
  return { folded, solved, busy };
}

function drawMatrix(S: Scene) {
  const { ctx, P, L, w, R, t } = S;
  const a = P.matrix;
  if (a < 0.01) return;
  const H = R.foot - R.top;
  const wide = w >= 640;
  const n = MINI.parent.length;
  const { folded, solved, busy } = hinesAt(t);
  // the tree, on the left (or above)
  const tree = wide
    ? { x: w * 0.22, y: R.top + H * 0.52, s: Math.min(H / 7.2, w * 0.06) }
    : { x: w * 0.27, y: R.top + H * 0.42, s: Math.min(H / 9, w * 0.07) };
  const tp = (i: number) =>
    [tree.x + MINI.at[i][0] * tree.s, tree.y + MINI.at[i][1] * tree.s * 0.95] as const;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.lineCap = 'round';
  for (let i = 1; i < n; i++) {
    const [x0, y0] = tp(MINI.parent[i]);
    const [x1, y1] = tp(i);
    ctx.strokeStyle = rgba(mix(L.page, L.ink, 0.5 - 0.25 * folded[i]), 1);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const [x, y] = tp(i);
    const r = (i === 0 ? 13 : 10.5) * (wide ? 1 : 0.78);
    const fill = mix(mix(L.page, L.ink, 0.08 + 0.1 * busy[i]), VOLT, 0.85 * solved[i]);
    ctx.fillStyle = rgba(fill, 1);
    ctx.strokeStyle = rgba(busy[i] ? VOLT : L.ink, busy[i] ? 1 : 0.6 - 0.35 * folded[i]);
    ctx.lineWidth = busy[i] ? 2.4 : 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = rgba(solved[i] > 0.5 ? [255, 255, 255] : L.ink, 0.9);
    ctx.font = `600 ${(i === 0 ? 12 : 11) * (wide ? 1 : 0.85)}px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i), x, y + 0.5);
  }
  ctx.restore();
  const [sx, sy] = tp(0);
  words(
    ctx,
    'the soma',
    wide ? sx + 18 : sx - 14,
    sy + 2,
    L.ink,
    0.75 * a,
    12,
    wide ? 'left' : 'right',
    L.page
  );

  // the matrix: one row and one column per compartment
  const size = wide ? Math.min(H * 0.72, w * 0.36) : Math.min(H * 0.42, w * 0.5);
  const m = wide
    ? { x: w * 0.47, y: R.top + (H - size) / 2 - 6 }
    : { x: w - size - 22, y: R.top + H * 0.08 };
  const cell = size / n;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(L.ink, 0.12);
  ctx.lineWidth = 1;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath();
    ctx.moveTo(m.x, m.y + i * cell);
    ctx.lineTo(m.x + size, m.y + i * cell);
    ctx.moveTo(m.x + i * cell, m.y);
    ctx.lineTo(m.x + i * cell, m.y + size);
    ctx.stroke();
  }
  const square = (r: number, c: number, colour: RGB, alpha: number) => {
    if (alpha < 0.01) return;
    ctx.fillStyle = rgba(colour, alpha);
    ctx.fillRect(m.x + c * cell + 2, m.y + r * cell + 2, cell - 4, cell - 4);
  };
  for (let i = 0; i < n; i++) {
    square(i, i, mix(L.ink, VOLT, solved[i]), 0.75);
    const p = MINI.parent[i];
    if (p < 0) continue;
    // the pair linking a compartment to its parent: the one in the parent's row is what folding removes
    square(i, p, L.ink, 0.45 * (1 - 0.6 * folded[i]));
    square(p, i, busy[i] ? VOLT : L.ink, (busy[i] ? 0.9 : 0.45) * (1 - folded[i]));
  }
  ctx.fillStyle = rgba(L.ink, 0.55);
  ctx.font = `11px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    ctx.fillText(String(i), m.x - 10, m.y + (i + 0.5) * cell);
    ctx.fillText(String(i), m.x + (i + 0.5) * cell, m.y - 10);
  }
  ctx.restore();
  // what is happening, said under the matrix
  const k = t < FOLD_AT ? 0 : t < OUT_AT - 300 ? 1 : t < OUT_AT + 9 * OUT_EACH ? 2 : 3;
  const lines = [
    [
      'one row per compartment: its own voltage on the diagonal,',
      "its neighbours' beside it — and nothing else",
    ],
    [
      'from the tips in: each compartment folded into its parent,',
      "its entry in the parent's row gone",
    ],
    ['the soma: one equation, one unknown;', "then back out, each voltage from its parent's"],
    ['every voltage, in two sweeps: time in proportion', 'to the compartments, not to their cube'],
  ][k];
  const ty = wide ? m.y + size + 26 : m.y + size + 20;
  const tx = wide ? m.x + size / 2 : w / 2;
  lines.forEach((line, j) =>
    words(ctx, line, tx, ty + j * 17, L.ink, 0.85 * a, wide ? 13 : 12, 'center', L.page)
  );
}

const LABELS: Record<SolveStep, string> = {
  cell: 'A pyramidal cell, simulated in the page: its voltage, compartment by compartment, as a spike spreads from the soma out along its dendrites and axon.',
  split: `The same cell cut into ${COMPS.length} compartments, each about 30 µm long, with a voltage at each one's middle.`,
  spread:
    "A chain of compartments along one dendrite, each one's voltage a bar: current flows from each to its neighbours, from the higher voltage to the lower.",
  stiff:
    "The first compartment's voltage, stepped two ways: forward Euler, with steps just past its limit, swings and blows up; backward Euler, with bigger steps, rises smoothly.",
  matrix:
    'The Hines algorithm on a small tree: its matrix has one row per compartment; folding each compartment into its parent from the tips in, then solving back out, finds every voltage.',
};

export default function SolveFigure({ step, back = false }: { step: SolveStep; back?: boolean }) {
  return (
    <StepCanvas
      step={step}
      back={back}
      label={LABELS[step]}
      done={9600}
      pose={(st, _t, R) => poseFor(st, R, R.right + R.left)}
      draw={(f: Frame<SolveStep>, P: Pose) => {
        const sim = advance(f.still, f.now);
        const S: Scene = { ctx: f.ctx, P, L: f.look, R: f.room, w: f.w, t: f.t, sim };
        drawTree(S);
        drawTreeLabels(S, f.step);
        drawChain(S);
        drawStiff(S);
        drawMatrix(S);
      }}
    />
  );
}
