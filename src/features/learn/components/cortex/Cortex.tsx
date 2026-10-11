'use client';

/**
 * The cells of the cortex, over a course of slides — one figure carrying on
 * from each slide to the next: the 26 kinds of neuron Markram et al. (2015)
 * found in the rat's somatosensory cortex, one real cell of each, side by side
 * and turning; told apart as excitatory and inhibitory, and by their shapes;
 * in their places in the cortex's layers, all to scale; one pyramidal cell's
 * parts; layer by layer, the excitatory cells, and where their inputs come from
 * and their outputs go; the interneurons, kind by kind, beside that pyramidal
 * cell, the part of it each one inhibits lit in its colour; then the eleven
 * ways they fire — real recordings, one of each — set out by how they start
 * and how they go on; one kind's several ways; their genes; and, all together,
 * the microcircuit they make.
 */

import { useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { useCanvasFrame } from '@/features/learn/components/basics/useCanvasFrame';
import { useSpillRoot } from '@/features/learn/components/basics/useSpillRoot';
import { Embedded } from '@/features/learn/components/embedded';
import {
  clamp01,
  lerp,
  mix,
  type Pt,
  phase,
  type RGB,
  rgba,
  SERIF,
  smooth,
} from '@/features/learn/components/heuristics/shared';
import { mulberry32 } from '@/features/learn/lib/basics/morphologies';
import { savedSpill, subscribe } from '@/features/learn/lib/settings';
import { getTheme } from '@/features/learn/lib/theme';

/** The course's slides, in order: each a picture the figure eases into from the last. */
export const CORTEX_STEPS = [
  'kinds',
  'families',
  'shape',
  'layers',
  'pyramidal',
  'l23',
  'l4',
  'l5',
  'l6',
  'interneurons',
  'basket',
  'chandelier',
  'martinotti',
  'vertical',
  'neurogliaform',
  'layer1',
  'targets',
  'firing',
  'named',
  'several',
  'genes',
  'circuit',
] as const;
export type CortexStep = (typeof CORTEX_STEPS)[number];
export const isCortexStep = (w: unknown): w is CortexStep => CORTEX_STEPS.includes(w as CortexStep);

/* ------------------------------------------------------------------ the cells */

/** The layers, µm under the pia — 2 and 3 as one, as the kinds are named — in the rat's hindlimb somatosensory cortex. */
const LAYERS = [
  { name: 'layer 1', top: 0, bottom: 165 },
  { name: 'layer 2/3', top: 165, bottom: 667 },
  { name: 'layer 4', top: 667, bottom: 857 },
  { name: 'layer 5', top: 857, bottom: 1382 },
  { name: 'layer 6', top: 1382, bottom: 2082 },
];
const DEPTH = 2082;
/** Closer in, on one pyramidal cell: how deep a piece of the cortex the figure holds, µm. */
const ZOOM_DEPTH = 1450;

/**
 * Each kind: its name; the layer its cell comes from (0 to 4, as LAYERS); where
 * its soma sits in the column, µm under the pia and across it, 0 to 1 — each
 * kept clear of the pia; and its colour, hue, saturation and lightness — the
 * interneurons' cool, the excitatory cells' warm, kinds alike in hues alike.
 */
const KINDS: Record<
  string,
  { name: string; layer: number; depth: number; across: number; hsl: [number, number, number] }
> = {
  DAC: { name: 'Descending axon cell', layer: 0, depth: 90, across: 0.07, hsl: [285, 0.45, 0.5] },
  'NGC-DA': {
    name: 'Neurogliaform cell, dense axon',
    layer: 0,
    depth: 100,
    across: 0.24,
    hsl: [140, 0.45, 0.36],
  },
  'NGC-SA': {
    name: 'Neurogliaform cell, slender axon',
    layer: 0,
    depth: 75,
    across: 0.41,
    hsl: [150, 0.5, 0.42],
  },
  HAC: { name: 'Horizontal axon cell', layer: 0, depth: 66, across: 0.58, hsl: [300, 0.4, 0.45] },
  LAC: { name: 'Large axon cell', layer: 0, depth: 160, across: 0.75, hsl: [268, 0.45, 0.55] },
  SAC: { name: 'Small axon cell', layer: 0, depth: 136, across: 0.92, hsl: [315, 0.45, 0.5] },
  MC: { name: 'Martinotti cell', layer: 3, depth: 1265, across: 0.94, hsl: [218, 0.72, 0.5] },
  BTC: { name: 'Bitufted cell', layer: 1, depth: 420, across: 0.05, hsl: [198, 0.7, 0.42] },
  DBC: { name: 'Double bouquet cell', layer: 1, depth: 300, across: 0.17, hsl: [188, 0.8, 0.35] },
  BP: { name: 'Bipolar cell', layer: 1, depth: 330, across: 0.29, hsl: [206, 0.6, 0.56] },
  NGC: { name: 'Neurogliaform cell', layer: 1, depth: 400, across: 0.41, hsl: [128, 0.45, 0.4] },
  LBC: { name: 'Large basket cell', layer: 1, depth: 520, across: 0.65, hsl: [168, 0.7, 0.32] },
  NBC: { name: 'Nest basket cell', layer: 2, depth: 760, across: 0.8, hsl: [160, 0.55, 0.42] },
  SBC: { name: 'Small basket cell', layer: 1, depth: 360, across: 0.78, hsl: [178, 0.6, 0.42] },
  ChC: { name: 'Chandelier cell', layer: 1, depth: 300, across: 0.9, hsl: [255, 0.62, 0.55] },
  PC: { name: 'Pyramidal cell', layer: 1, depth: 480, across: 0.53, hsl: [12, 0.78, 0.5] },
  SP: { name: 'Star pyramidal cell', layer: 2, depth: 760, across: 0.3, hsl: [30, 0.85, 0.45] },
  SS: { name: 'Spiny stellate cell', layer: 2, depth: 760, across: 0.55, hsl: [45, 0.9, 0.4] },
  TTPC1: {
    name: 'Thick-tufted pyramidal, late tuft',
    layer: 3,
    depth: 1100,
    across: 0.12,
    hsl: [355, 0.72, 0.46],
  },
  TTPC2: {
    name: 'Thick-tufted pyramidal, early tuft',
    layer: 3,
    depth: 1290,
    across: 0.34,
    hsl: [340, 0.62, 0.42],
  },
  UTPC: {
    name: 'Untufted pyramidal cell',
    layer: 3,
    depth: 1000,
    across: 0.56,
    hsl: [5, 0.6, 0.58],
  },
  STPC: {
    name: 'Slender-tufted pyramidal cell',
    layer: 3,
    depth: 960,
    across: 0.76,
    hsl: [22, 0.72, 0.4],
  },
  'TPC-L4': {
    name: 'Tufted pyramidal, tuft in layer 4',
    layer: 4,
    depth: 1780,
    across: 0.15,
    hsl: [325, 0.5, 0.48],
  },
  'TPC-L1': {
    name: 'Tufted pyramidal, tuft in layer 1',
    layer: 4,
    depth: 1395,
    across: 0.4,
    hsl: [335, 0.55, 0.58],
  },
  IPC: {
    name: 'Inverted pyramidal cell',
    layer: 4,
    depth: 1620,
    across: 0.64,
    hsl: [25, 0.7, 0.35],
  },
  BPC: {
    name: 'Bipolar pyramidal cell',
    layer: 4,
    depth: 1500,
    across: 0.87,
    hsl: [40, 0.6, 0.38],
  },
};
/** The excitatory kinds; the rest are interneurons. */
const EXCITATORY = [
  'PC',
  'SP',
  'SS',
  'TTPC1',
  'TTPC2',
  'UTPC',
  'STPC',
  'TPC-L4',
  'TPC-L1',
  'IPC',
  'BPC',
];
/** The pyramidal cell the interneurons are shown beside, and whose parts are named: layer 5's thick-tufted. */
const MAIN = 'TTPC1';

/** A colour from hue, saturation and lightness: degrees, and 0–1. */
function hsl(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)) as RGB;
}

/** One kind's cell: its nodes — µm, the soma at 0, y towards the pia — and how it is set out and turned. */
interface Kind {
  index: number;
  type: string;
  name: string;
  /** 0 an interneuron, 1 excitatory. */
  group: number;
  layer: number;
  depth: number;
  across: number;
  colour: RGB;
  x: Int16Array;
  y: Int16Array;
  z: Int16Array;
  t: Uint8Array;
  p: Int32Array;
  /** Where its nodes were last drawn, px; and how, to place more points the same way. */
  sx: Float32Array;
  sy: Float32Array;
  view: {
    x: number;
    y: number;
    s: number;
    cos: number;
    sin: number;
    mx: number;
    my: number;
    mz: number;
  };
  /** The middle of the box round it; its height; how far it reaches round the line up through that; its dendrites' top. */
  mid: [number, number, number];
  tall: number;
  round: number;
  top: number;
  /** Its own turning, rad/s, either way, and from where. */
  spin: number;
  start: number;
  /** The angles it is best seen from: its dendrites spread widest; its axon off to its left; to its right. */
  wide: number;
  left: number;
  right: number;
}

let kinds: Kind[] | null = null;
let kindsAsked = false;
/** The 26, fetched once. */
function loadKinds() {
  if (kindsAsked) return;
  kindsAsked = true;
  fetch('/static/learn/heuristics/mtypes.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`mtypes: ${r.status}`))))
    .then(
      (d: {
        cells: { type: string; x: number[]; y: number[]; z: number[]; t: number[]; p: number[] }[];
      }) => {
        const rnd = mulberry32(26);
        kinds = d.cells.map((c, index) => {
          const info = KINDS[c.type] ?? {
            name: c.type,
            layer: 1,
            depth: 500,
            across: 0.5,
            hsl: [0, 0, 0.5],
          };
          const n = c.x.length;
          const mid: [number, number, number] = [
            (Math.min(...c.x) + Math.max(...c.x)) / 2,
            (Math.min(...c.y) + Math.max(...c.y)) / 2,
            (Math.min(...c.z) + Math.max(...c.z)) / 2,
          ];
          let [round, top] = [1, 0];
          // the spread of its dendrites round the vertical, and where its axon lies, for the angles it is best seen from
          let [sxx, szz, sxz, ax, az] = [0, 0, 0, 0, 0];
          for (let j = 0; j < n; j++) {
            round = Math.max(round, Math.hypot(c.x[j] - mid[0], c.z[j] - mid[2]));
            if (c.t[j] === 2) {
              ax += c.x[j];
              az += c.z[j];
            } else {
              top = Math.max(top, c.y[j]);
              [sxx, szz, sxz] = [
                sxx + c.x[j] * c.x[j],
                szz + c.z[j] * c.z[j],
                sxz + c.x[j] * c.z[j],
              ];
            }
          }
          const [a, b, e] = [rnd(), rnd(), rnd()];
          return {
            index,
            type: c.type,
            name: info.name,
            group: EXCITATORY.includes(c.type) ? 1 : 0,
            layer: info.layer,
            depth: info.depth,
            across: info.across,
            colour: hsl(...info.hsl),
            x: Int16Array.from(c.x),
            y: Int16Array.from(c.y),
            z: Int16Array.from(c.z),
            t: Uint8Array.from(c.t),
            p: Int32Array.from(c.p),
            sx: new Float32Array(n),
            sy: new Float32Array(n),
            view: { x: 0, y: 0, s: 1, cos: 1, sin: 0, mx: 0, my: 0, mz: 0 },
            mid,
            tall: Math.max(...c.y) - Math.min(...c.y),
            round,
            top,
            spin: (a < 0.5 ? -1 : 1) * lerp(0.15, 0.4, b),
            start: e * Math.PI * 2,
            wide: 0.5 * Math.atan2(2 * sxz, sxx - szz),
            left: Math.atan2(-az, -ax),
            right: Math.atan2(az, ax),
          };
        });
      },
      () => {
        kindsAsked = false;
      }
    );
}

/** The main pyramidal cell's parts, the ones the interneurons aim at: by node, and where to name each. */
const [TUFT, APICAL, BASAL, SOMA, AIS] = [0, 1, 2, 3, 4];
const DOMAINS = [TUFT, APICAL, BASAL, SOMA, AIS];
interface Anatomy {
  /** Each node's part — TUFT, APICAL or BASAL for the dendrites — or -1. */
  of: Int8Array;
  /** The axon initial segment: the first 40 µm of the axon past the soma, as points. */
  ais: [number, number, number][];
  /** Nodes to name the parts at: the tuft's middle, the apical dendrite's, the axon's, some way down it. */
  tuft: number;
  trunk: number;
  axon: number;
}
let anatomy: Anatomy | null = null;
function anatomyOf(c: Kind): Anatomy {
  if (anatomy) return anatomy;
  const n = c.x.length;
  const kids: number[][] = Array.from({ length: n }, () => []);
  for (let j = 1; j < n; j++) kids[c.p[j]].push(j);
  let apex = 1;
  for (let j = 0; j < n; j++) if (c.t[j] === 4) apex = Math.max(apex, c.y[j]);
  // the tuft: the apical dendrite's top part, from where it fans out
  const of = new Int8Array(n).fill(-1);
  let [tx, ty, tz, tn] = [0, 0, 0, 0];
  for (let j = 1; j < n; j++) {
    if (c.t[j] === 4 && c.y[j] > 0.7 * apex) {
      of[j] = TUFT;
      [tx, ty, tz, tn] = [tx + c.x[j], ty + c.y[j], tz + c.z[j], tn + 1];
    } else if (c.t[j] === 4) of[j] = APICAL;
    else if (c.t[j] === 3) of[j] = BASAL;
  }
  const nearest = (score: (j: number) => number) => {
    let [best, at] = [Infinity, 0];
    for (let j = 1; j < n; j++) {
      const s = score(j);
      if (s < best) [best, at] = [s, j];
    }
    return at;
  };
  const tuft = nearest((j) =>
    of[j] === TUFT ? Math.hypot(c.x[j] - tx / tn, c.y[j] - ty / tn, c.z[j] - tz / tn) : Infinity
  );
  // the apical dendrite's trunk: on the way from its highest point down to the soma, about halfway up
  let trunk = nearest((j) => (c.t[j] === 4 && c.y[j] >= apex ? 0 : Infinity));
  for (let j = trunk, best = Infinity; j > 0; j = c.p[j]) {
    const off = Math.abs(c.y[j] - 0.45 * apex);
    if (of[j] === APICAL && off < best) [best, trunk] = [off, j];
  }
  // along the axon from the soma, by its first branch at each fork: the initial segment, and a place further down
  const ais: [number, number, number][] = [];
  let [j, d, axon] = [kids[0].find((k) => c.t[k] === 2) ?? -1, 0, 0];
  let prev: [number, number, number] = [0, 0, 0];
  while (j >= 0 && d < 320) {
    const q: [number, number, number] = [c.x[j], c.y[j], c.z[j]];
    const len = Math.hypot(q[0] - prev[0], q[1] - prev[1], q[2] - prev[2]);
    for (let s = 0; s <= len; s += 4) {
      const at = d + s;
      if (at >= 8 && at <= 48)
        ais.push([0, 1, 2].map((k) => prev[k] + ((q[k] - prev[k]) * s) / len) as typeof q);
    }
    d += len;
    if (d < 260) axon = j;
    prev = q;
    j = kids[j].find((k) => c.t[k] === 2) ?? -1;
  }
  anatomy = { of, ais, tuft, trunk, axon };
  return anatomy;
}

/** The eleven electrical types (Markram et al., 2015): each one's name, and its place in the table of them. */
const ETYPES: { code: string; name: string; col: number; row: number }[] = [
  { code: 'cADpyr', name: 'continuous adapting, pyramidal', col: 0, row: 0 },
  { code: 'cAC', name: 'continuous accommodating', col: 1, row: 0 },
  { code: 'bAC', name: 'bursting accommodating', col: 1, row: 1 },
  { code: 'cNAC', name: 'continuous non-accommodating', col: 2, row: 0 },
  { code: 'bNAC', name: 'bursting non-accommodating', col: 2, row: 1 },
  { code: 'dNAC', name: 'delayed non-accommodating', col: 2, row: 2 },
  { code: 'cSTUT', name: 'continuous stuttering', col: 3, row: 0 },
  { code: 'bSTUT', name: 'bursting stuttering', col: 3, row: 1 },
  { code: 'dSTUT', name: 'delayed stuttering', col: 3, row: 2 },
  { code: 'cIR', name: 'continuous irregular', col: 4, row: 0 },
  { code: 'bIR', name: 'bursting irregular', col: 4, row: 1 },
];
/** The table's columns, how a cell goes on firing; and its rows, how it starts. */
const GOES_ON = [
  ['adapting', 'AD'],
  ['accommodating', 'AC'],
  ['non-accommodating', 'NAC'],
  ['stuttering', 'STUT'],
  ['irregular', 'IR'],
];
const STARTS = [
  ['continuous', 'c'],
  ['bursting', 'b'],
  ['delayed', 'd'],
];
/** The small basket cell's firing types, among the Blue Brain Project's models of it. */
const SBC_ETYPES = ['bNAC', 'cIR', 'dNAC', 'dSTUT'];
/** The voltage each trace is drawn over, mV. */
const [V_LOW, V_HIGH] = [-95, 45];

/** One recording: [min, max] mV for each ms, the step of current on from `on` to `off` ms. */
interface Trace {
  code: string;
  v: Int16Array;
  on: number;
  off: number;
}
let traces: Trace[] | null = null;
let tracesAsked = false;
function loadTraces() {
  if (tracesAsked) return;
  tracesAsked = true;
  fetch('/static/learn/heuristics/etypes.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`etypes: ${r.status}`))))
    .then(
      (d: { on: number; off: number; traces: { etype: string; v: number[] }[] }) => {
        traces = ETYPES.map(({ code }) => {
          const one = d.traces.find((k) => k.etype === code);
          return { code, v: Int16Array.from(one?.v ?? []), on: d.on, off: d.off };
        });
      },
      () => {
        tracesAsked = false;
      }
    );
}

/* ------------------------------------------------------------- where things go */

/**
 * The part of the page the figure may draw on, in its own coordinates: its box
 * — or, spilling over the page, the whole window about it. Set each frame.
 */
const seen = { x0: 0, y0: 0, x1: 0, y1: 0, spill: false };

/** The room the figure fills: as far above its box as below it, short of the words and the slides' dots, and a little past its sides. */
interface Room {
  top: number;
  foot: number;
  left: number;
  right: number;
}
function roomOf(w: number, th: number): Room {
  const below = Math.max(0, seen.y1 - 64 - th);
  const [top, foot] = seen.spill ? [-Math.max(0, below - 14), th + below] : [0, th];
  const spare = seen.spill ? Math.max(0, Math.min(150, -seen.x0 - 16, seen.x1 - w - 16)) : 0;
  return { top, foot, left: -spare, right: w + spare };
}

/** The column the layers are drawn in: the pia's height, px to the µm, and its sides. */
interface Column {
  top: number;
  k: number;
  left: number;
  right: number;
}
/** The column, as deep as `reach` µm of it fits the room, and `share` of the way across it. */
function columnOf(R: Room, reach = DEPTH, share = 1): Column {
  const top = R.top + 26;
  const left = R.left + 82;
  return { top, k: (R.foot - 34 - top) / reach, left, right: left + (R.right - 16 - left) * share };
}

/** Under each cell, side by side, room for its name on up to three lines; under the rows, for whose they are. */
const NAMED = 42;
const FOOT = 24;
/** At the left of the rows, room for their names — less on a narrow screen, under NARROW px across. */
const GUTTER = 128;
const NARROW = 700;
const gutterOf = (R: Room) => (R.right - R.left < NARROW ? 92 : GUTTER);
/**
 * Two rows of cells, each spread evenly across, each as tall as its taller
 * cells need, and all drawn to the one scale: as big as the middling cell,
 * turned whichever way, fits its place.
 */
function rowsOf(R: Room, cells: Kind[], orders: Kind[][], top = R.top) {
  const [left, right] = [R.left + gutterOf(R), R.right - 6];
  const slot = (g: number) => (right - left) / Math.max(1, orders[g].length);
  const tallish = (list: Kind[]) =>
    list.map((c) => c.tall).sort((a, b) => a - b)[Math.floor(list.length * 0.8)] ?? 1;
  const needs = orders.map(tallish);
  const room = Math.max(40, R.foot - top - FOOT - 2 * NAMED);
  const cellH = needs.map((n) => (room * n) / (needs[0] + needs[1]));
  const middling = cells.map((c) => c.round).sort((a, b) => a - b)[Math.floor(cells.length / 2)];
  const s = Math.min(
    (1.1 * Math.min(slot(0), slot(1))) / (2 * middling),
    (0.95 * room) / (needs[0] + needs[1])
  );
  const rowTop = (g: number) => top + (g ? cellH[0] + NAMED : 0);
  return {
    left,
    slot,
    cellH,
    rowTop,
    s,
    at: (g: number, i: number) => ({ x: left + (i + 0.5) * slot(g), y: rowTop(g) + cellH[g] / 2 }),
  };
}

/** A table's cell: `cols` across and `rows` down the room, past `pad` px at its left, each a trace's box. */
function tableOf(R: Room, cols: number, rows: number, pad: number, headroom = 46) {
  const [x0, x1, y0, y1] = [R.left + pad, R.right - 24, R.top + headroom, R.foot - 44];
  const [cw, rh] = [(x1 - x0) / cols, (y1 - y0) / rows];
  const h = Math.min(96, rh - 38);
  return (col: number, row: number) => ({
    x: x0 + col * cw + 10,
    y: y0 + row * rh + (rh - 38 - h) / 2 + 24,
    w: cw - 22,
    h,
  });
}

/**
 * The interneurons each of their slides shows beside the pyramidal cell — µm
 * deep and how far to its right of it — and which of its parts they aim at.
 */
const BESIDE: Record<
  'basket' | 'chandelier' | 'martinotti' | 'vertical' | 'neurogliaform' | 'layer1',
  { at: { type: string; depth: number; dx: number }[]; aim: number[] }
> = {
  basket: {
    at: [
      { type: 'LBC', depth: 1070, dx: 190 },
      { type: 'NBC', depth: 1160, dx: 440 },
      { type: 'SBC', depth: 1080, dx: 680 },
    ],
    aim: [SOMA],
  },
  chandelier: { at: [{ type: 'ChC', depth: 1170, dx: 130 }], aim: [AIS] },
  martinotti: { at: [{ type: 'MC', depth: 1265, dx: 300 }], aim: [TUFT] },
  vertical: {
    at: [
      { type: 'DBC', depth: 420, dx: 170 },
      { type: 'BTC', depth: 760, dx: 480 },
      { type: 'BP', depth: 560, dx: 760 },
    ],
    aim: [APICAL, BASAL],
  },
  neurogliaform: { at: [{ type: 'NGC', depth: 470, dx: 170 }], aim: [APICAL] },
  layer1: {
    at: [
      { type: 'DAC', depth: 95, dx: -560 },
      { type: 'NGC-DA', depth: 100, dx: -330 },
      { type: 'NGC-SA', depth: 80, dx: -110 },
      { type: 'HAC', depth: 66, dx: 170 },
      { type: 'LAC', depth: 160, dx: 440 },
      { type: 'SAC', depth: 136, dx: 720 },
    ],
    aim: [TUFT],
  },
};
/** Whose colour each part takes when all of them are lit: who aims at it. */
const AIMED_BY = ['MC', 'DBC', 'DBC', 'LBC', 'ChC'];
/** Each part's name, on its own; and, all lit, with who aims at it (the basal dendrites go with the rest). */
const PART_NAMES = ['tuft', 'dendrites', '', 'soma', 'axon initial segment'];
const AIMED_NAMES = [
  "tuft: Martinotti cells and layer 1's interneurons",
  'dendrites: double bouquet, bitufted, bipolar and neurogliaform cells',
  '',
  'soma: basket cells',
  'axon initial segment: chandelier cells',
];

/** Where each layer's inputs come from and its outputs go: lines in the column — across it, 0 to 1, and µm deep — each named. */
const ARROWS: {
  pts: [number, number][];
  name: string;
  at: [number, number];
  align: CanvasTextAlign;
}[] = [
  {
    pts: [
      [0.02, 2082],
      [0.02, 1300],
      [0.2, 800],
    ],
    name: 'from the thalamus',
    at: [0.035, 1990],
    align: 'left',
  },
  {
    pts: [
      [0.43, 730],
      [0.43, 470],
    ],
    name: 'to layer 2/3',
    at: [0.44, 600],
    align: 'left',
  },
  {
    pts: [
      [0.6, 400],
      [0.84, 352],
      [1.01, 330],
    ],
    name: 'to other cortical areas',
    at: [0.99, 300],
    align: 'right',
  },
  {
    pts: [
      [0.47, 560],
      [0.47, 1010],
    ],
    name: 'to layer 5',
    at: [0.48, 900],
    align: 'left',
  },
  {
    pts: [
      [0.23, 1160],
      [0.23, 2200],
    ],
    name: 'out of the cortex: to the thalamus, brainstem and spinal cord',
    at: [0.24, 1990],
    align: 'left',
  },
  {
    pts: [
      [0.24, 1800],
      [0.24, 2200],
    ],
    name: 'back to the thalamus',
    at: [0.25, 1990],
    align: 'left',
  },
  {
    pts: [
      [0, 100],
      [0.2, 100],
    ],
    name: 'from other areas and the thalamus',
    at: [0, -42],
    align: 'left',
  },
];
/** Which of those each layer's slide shows. */
const LAYER_ARROWS: Record<'l23' | 'l4' | 'l5' | 'l6', number[]> = {
  l23: [2, 3],
  l4: [0, 1],
  l5: [4],
  l6: [5],
};

/** The interneurons by the marker they carry (Markram et al., 2015; Rudy et al., 2011), each group named. */
const MARKERS: { name: string; types: string[] }[] = [
  { name: 'PV · parvalbumin', types: ['LBC', 'NBC', 'ChC'] },
  { name: 'SST · somatostatin', types: ['MC'] },
  { name: 'VIP', types: ['BP', 'DBC', 'SBC'] },
  { name: 'other markers', types: ['BTC', 'NGC', 'NGC-DA', 'NGC-SA', 'DAC', 'HAC', 'LAC', 'SAC'] },
];

/** The microcircuit, in numbers (Markram et al., 2015). */
const NUMBERS = [
  ['~31,000', 'neurons'],
  ['55', 'kinds by shape, layer by layer'],
  ['207', 'kinds by shape and firing together'],
  ['~8 million', 'connections between them'],
  ['~37 million', 'synapses making those connections'],
  ['0.29 mm³', 'of cortex, about a third of a cubic millimetre'],
];

/**
 * For the microcircuit, many more cells like these filling the column: how
 * much of it each layer holds, and how many of its cells are inhibitory —
 * all of layer 1's; and which kinds stand for its excitatory cells, and for
 * the interneurons of layers 2 to 6, basket cells about half of them and
 * Martinotti cells about a fifth.
 */
const FILL: { share: number; inhibitory: number; excitatory: string[] }[] = [
  { share: 0.012, inhibitory: 1, excitatory: [] },
  { share: 0.21, inhibitory: 0.17, excitatory: ['PC'] },
  { share: 0.15, inhibitory: 0.1, excitatory: ['SS', 'SP'] },
  { share: 0.2, inhibitory: 0.14, excitatory: ['TTPC1', 'TTPC2', 'UTPC', 'STPC'] },
  { share: 0.428, inhibitory: 0.1, excitatory: ['TPC-L4', 'TPC-L1', 'IPC', 'BPC'] },
];
const FIRST_LAYER = ['DAC', 'NGC-DA', 'NGC-SA', 'HAC', 'LAC', 'SAC'];
const DEEPER = ['LBC', 'LBC', 'NBC', 'NBC', 'SBC', 'MC', 'MC', 'BTC', 'DBC', 'BP', 'NGC', 'ChC'];

/* ---------------------------------------------------------------- the poses */

/** One cell as drawn: where — its soma (m 0) or its middle (m 1) — and at what scale; and how. */
interface CellPose {
  x: number;
  y: number;
  s: number;
  m: number;
  /** How much of it shows; in its colour or grey; its axon, and as strong as its dendrites or paler; its dendrites. */
  a: number;
  tint: number;
  ax: number;
  axc: number;
  de: number;
  /** Turning its own way (0), or held at `turn`, swaying (1). */
  hold: number;
  turn: number;
  /** Its name under it, side by side; and beside its soma, in the column — this far off it, px, and centred on that (1) or not. */
  name: number;
  tag: number;
  tx: number;
  ty: number;
  tc: number;
}
interface TracePose {
  x: number;
  y: number;
  w: number;
  h: number;
  a: number;
}
interface Pose {
  cells: CellPose[];
  traces: TracePose[];
  col: Column;
  /** The layers, and how lit each one is; and each of the ways in and out. */
  bands: number;
  hi: number[];
  arrows: number[];
  /** The two rows: where they are, and how much of their names show — and of each one's family, and how it is told. */
  rows: {
    y0: number;
    y1: number;
    top0: number;
    left: number;
    slot0: number;
    slot1: number;
    name0: number;
    name1: number;
    s: number;
    title: number;
    families: number;
    shape: number;
  };
  genes: number;
  /** The pyramidal cell's parts named; each part lit, and in what colour; and who aims at each, named. */
  parts: number;
  /** How much the part lit is named, when it is not one of all of them. */
  partNames: number;
  dom: number[];
  domRGB: number[][];
  aimed: number;
  /** The recordings: how far through they have played; the table's headings; their names; one kind's, linked. */
  sweep: number;
  /** The table turned on its side (1), as on a narrow screen: how they start across it, how they go on down it. */
  flip: number;
  headers: number;
  named: number;
  link: number;
  /** The microcircuit: the column filled, and its numbers. */
  circuit: number;
  numbers: number[];
}

/** How the page looks: its ink and paper, and grey between them; and whether it is the dark one. */
interface Look {
  ink: RGB;
  page: RGB;
  grey: RGB;
  dark: boolean;
}
function lookOf(): Look {
  const dark = getTheme() !== 'obi';
  const ink: RGB = dark ? [226, 232, 240] : [30, 41, 59];
  const page: RGB = dark ? [6, 9, 17] : [255, 255, 255];
  return { ink, page, grey: mix(page, ink, 0.32), dark };
}
const colourOf = (c: Kind, L: Look): RGB =>
  L.dark ? mix(c.colour, [255, 255, 255], 0.22) : c.colour;

/** When a slide's picture is finished: shown so at once, on a slide come back to. */
const DONE = 8000;

/** Each slide's picture, `t` ms in. */
function poseFor(step: CortexStep, t: number, R: Room, cells: Kind[], L: Look): Pose {
  const by = (type: string) => cells.find((c) => c.type === type) ?? cells[0];
  const main = by(MAIN);
  const inter = cells.filter((c) => c.group === 0);
  const exc = cells.filter((c) => c.group === 1);
  const col = columnOf(R);
  const shown = (from: number, dur = 600) => phase(t, from, dur);
  const W = R.right - R.left;

  // the recordings: first in a grid — two across on a narrow screen — then in their table, how they start down its
  // side and how they go on across it; or, on a narrow screen, the other way round
  const narrow = W < NARROW;
  const across = narrow ? 2 : 4;
  const inGrid = tableOf(R, across, Math.ceil(ETYPES.length / across), 30);
  const grid = (i: number) => inGrid(i % across, Math.floor(i / across));
  const laid = narrow ? tableOf(R, 3, 5, 128, 70) : tableOf(R, 5, 3, 156, 76);
  const table = (e: (typeof ETYPES)[number]) => (narrow ? laid(e.row, e.col) : laid(e.col, e.row));
  const beside = tableOf({ ...R, left: R.left + 0.27 * W }, 5, 3, 120, 76);
  const shifted = (e: (typeof ETYPES)[number]) => (narrow ? table(e) : beside(e.col, e.row));
  const L0 = rowsOf(R, cells, [inter, exc]);
  const P: Pose = {
    cells: cells.map((c) => ({
      x: col.left + c.across * (col.right - col.left),
      y: col.top + c.depth * col.k,
      s: col.k,
      m: 0,
      a: 0,
      tint: 1,
      ax: 0.5,
      axc: 0,
      de: 1,
      hold: 0,
      turn: c.wide,
      name: 0,
      tag: 0,
      tx: 7,
      ty: 0,
      tc: 0,
    })),
    traces: ETYPES.map((_, i) => ({ ...grid(i), a: 0 })),
    flip: narrow ? 1 : 0,
    col,
    bands: 0,
    hi: LAYERS.map(() => 0),
    arrows: ARROWS.map(() => 0),
    rows: {
      y0: L0.rowTop(0) + L0.cellH[0] / 2,
      y1: L0.rowTop(1) + L0.cellH[1] / 2,
      top0: L0.rowTop(0),
      left: L0.left,
      slot0: L0.slot(0),
      slot1: L0.slot(1),
      name0: L0.rowTop(0) + L0.cellH[0] + 10,
      name1: L0.rowTop(1) + L0.cellH[1] + 10,
      s: L0.s,
      title: 0,
      families: 0,
      shape: 0,
    },
    genes: 0,
    parts: 0,
    partNames: 1,
    dom: DOMAINS.map(() => 0),
    domRGB: AIMED_BY.map((type) => colourOf(by(type), L)),
    aimed: 0,
    sweep: 1,
    headers: 0,
    named: 0,
    link: 0,
    circuit: 0,
    numbers: NUMBERS.map(() => 0),
  };
  const put = (c: Kind, q: Partial<CellPose>) => Object.assign(P.cells[c.index], q);

  // side by side, in two rows: the interneurons, the excitatory cells
  const rows = (orders: Kind[][], top = R.top) => {
    const G = rowsOf(R, cells, orders, top);
    orders.forEach((list, g) =>
      list.forEach((c, i) =>
        put(c, {
          ...G.at(g, i),
          s: G.s,
          m: 1,
          a: 1,
          tint: 1,
          ax: 1,
          axc: 0,
          de: 1,
          hold: 0,
          name: shown(400),
        })
      )
    );
    Object.assign(P.rows, {
      y0: G.rowTop(0) + G.cellH[0] / 2,
      y1: G.rowTop(1) + G.cellH[1] / 2,
      top0: G.rowTop(0),
      left: G.left,
      slot0: G.slot(0),
      slot1: G.slot(1),
      name0: G.rowTop(0) + G.cellH[0] + 10,
      name1: G.rowTop(1) + G.cellH[1] + 10,
      s: G.s,
      title: shown(200),
    });
  };
  // in the column, each at its depth in its layer, to scale
  const column = (G: Column, each: (c: Kind) => Partial<CellPose>) => {
    for (const c of cells)
      put(c, {
        x: G.left + c.across * (G.right - G.left),
        y: G.top + c.depth * G.k,
        s: G.k,
        m: 0,
        a: 1,
        tint: 1,
        ax: 0.5,
        axc: 0,
        de: 1,
        hold: 0,
        name: 0,
        tag: 0,
        ...each(c),
      });
    P.col = G;
    P.bands = 1;
  };
  // closer in: the thick-tufted pyramidal cell held still, `greyed` of its colour gone; and beside it, interneurons,
  // each turned to send its axon its way
  const closer = (beside: { type: string; depth: number; dx: number }[], greyed: number) => {
    const G = columnOf(R, ZOOM_DEPTH);
    const x0 = G.left + 0.3 * (G.right - G.left);
    column(G, () => ({ a: 0 }));
    put(main, {
      x: x0,
      y: G.top + main.depth * G.k,
      a: 1,
      tint: 1 - greyed,
      ax: 0.45,
      hold: 1,
      turn: main.wide,
    });
    for (const b of beside) {
      const c = by(b.type);
      const turn = b.dx < 0 ? c.right : c.left;
      put(c, {
        x: x0 + b.dx * G.k,
        y: G.top + b.depth * G.k,
        a: 1,
        ax: 1,
        axc: 0.7,
        hold: 1,
        turn,
        tag: shown(500),
      });
    }
  };
  const hideCells = () => cells.forEach((c) => put(c, { a: 0 }));

  switch (step) {
    case 'kinds':
      rows([inter, exc]);
      break;
    case 'families':
      rows([inter, exc]);
      P.rows.families = shown(300);
      break;
    case 'shape':
      rows([inter, exc]);
      for (const c of inter) put(c, { axc: 1, de: 0.35 });
      for (const c of exc) put(c, { ax: 0.25 });
      P.rows.shape = shown(300);
      break;
    case 'layers':
      column(col, () => ({}));
      break;
    case 'pyramidal':
      closer([], 0);
      P.parts = shown(500);
      P.dom[AIS] = shown(500);
      P.domRGB[AIS] = mix(colourOf(main, L), L.ink, 0.45);
      break;
    case 'l23':
    case 'l4':
    case 'l5':
    case 'l6': {
      const layer = { l23: 1, l4: 2, l5: 3, l6: 4 }[step];
      column(col, (c) =>
        c.layer === layer && c.group === 1 ? { tag: shown(500) } : { a: 0.2, tint: 0, ax: 0.25 }
      );
      P.hi[layer] = 1;
      for (const k of LAYER_ARROWS[step]) P.arrows[k] = shown(700, 700);
      break;
    }
    case 'interneurons':
      column(col, (c) =>
        c.group === 0 ? { ax: 0.8, tag: shown(500) } : { a: 0.18, tint: 0, ax: 0.2 }
      );
      break;
    case 'basket':
    case 'chandelier':
    case 'martinotti':
    case 'vertical':
    case 'neurogliaform':
    case 'layer1': {
      const { at, aim } = BESIDE[step];
      closer(at, 0.85);
      for (const d of aim) {
        P.dom[d] = shown(400);
        P.domRGB[d] = colourOf(by(at[0].type), L);
      }
      if (step === 'layer1') {
        P.hi[0] = 1;
        P.arrows[6] = shown(700, 700);
        P.partNames = 0;
        [...at]
          .sort((a, b) => a.dx - b.dx)
          .forEach((b, i) => put(by(b.type), { tx: 0, ty: i % 2 ? 40 : 24, tc: 1 }));
      }
      break;
    }
    case 'targets':
      closer([], 0.85);
      DOMAINS.forEach((d) => (P.dom[d] = shown(300 + 150 * d)));
      P.aimed = shown(700);
      break;
    case 'firing':
      hideCells();
      P.traces = ETYPES.map((_, i) => ({ ...grid(i), a: 1 }));
      P.sweep = clamp01((t - 300) / 2300);
      P.named = shown(200);
      break;
    case 'named':
      hideCells();
      P.traces = ETYPES.map((e) => ({ ...table(e), a: 1 }));
      P.headers = shown(500);
      break;
    case 'several': {
      hideCells();
      P.traces = ETYPES.map((e) => ({ ...shifted(e), a: SBC_ETYPES.includes(e.code) ? 1 : 0.25 }));
      P.headers = 1;
      P.link = shown(500);
      // the small basket cell at the table's left — or, on a narrow screen, in the empty top row beside the
      // pyramidal cell's
      const sbc = by('SBC');
      const [a1, a2] = [laid(1, 0), laid(2, 0)];
      const place = narrow
        ? { x: (a1.x + a2.x + a2.w) / 2, y: a1.y + a1.h / 2, w: a2.x + a2.w - a1.x, h: 1.4 * a1.h }
        : {
            x: R.left + 0.14 * W,
            y: (R.top + R.foot) / 2 - 14,
            w: 0.21 * W,
            h: 0.55 * (R.foot - R.top),
          };
      const s = Math.min(place.w / (2 * sbc.round), place.h / sbc.tall);
      put(sbc, { x: place.x, y: place.y, s, m: 1, a: 1, ax: 1, de: 1, hold: 0 });
      break;
    }
    case 'genes': {
      rows([MARKERS.flatMap((m) => m.types.map(by)), exc], R.top + 30);
      for (const c of exc) put(c, { a: 0.35, tint: 0.3, name: 0 });
      P.genes = shown(400);
      break;
    }
    case 'circuit':
      column(columnOf(R, DEPTH, 0.56), () => ({ ax: 0.3 }));
      P.circuit = shown(200, 900);
      P.numbers = NUMBERS.map((_, i) => shown(800 + 260 * i, 500));
      break;
  }
  return P;
}

/** `k` of the way between two sets of numbers alike — a scale `s` by ratio, an angle `turn` the short way. */
function mixed<T extends object>(a: T, b: T, k: number): T {
  const out: Record<string, number> = {};
  const [ra, rb] = [a as Record<string, number>, b as Record<string, number>];
  for (const key of Object.keys(rb)) {
    const [u, v] = [ra[key], rb[key]];
    if (key === 's' && u > 0 && v > 0) out[key] = u * (v / u) ** k;
    else if (key === 'turn') out[key] = u + Math.atan2(Math.sin(v - u), Math.cos(v - u)) * k;
    else out[key] = u + (v - u) * k;
  }
  return out as T;
}

/** `k` of the way from pose `a` to `b`: what comes into view comes in where it is going; what goes, goes from where it was. */
function blendPose(a: Pose, b: Pose, k: number): Pose {
  const nums = (u: number[], v: number[]) => v.map((x, i) => lerp(u[i] ?? 0, x, k));
  const shows = <Q extends { a: number }>(p: Q, q: Q, at: (keyof Q)[]) => {
    const pick = (from: Q, to: Q) =>
      ({ ...from, ...Object.fromEntries(at.map((key) => [key, to[key]])) }) as Q;
    return mixed(p.a < 0.01 ? pick(p, q) : p, q.a < 0.01 ? pick(q, p) : q, k);
  };
  return {
    cells: b.cells.map((q, i) => shows(a.cells[i], q, ['x', 'y', 's', 'm', 'turn'])),
    traces: b.traces.map((q, i) => shows(a.traces[i], q, ['x', 'y', 'w', 'h'])),
    col: mixed(a.col, b.col, k),
    bands: lerp(a.bands, b.bands, k),
    hi: nums(a.hi, b.hi),
    arrows: nums(a.arrows, b.arrows),
    rows: mixed(a.rows, b.rows, k),
    genes: lerp(a.genes, b.genes, k),
    parts: lerp(a.parts, b.parts, k),
    partNames: lerp(a.partNames, b.partNames, k),
    dom: nums(a.dom, b.dom),
    domRGB: b.domRGB.map((c, i) => nums(a.domRGB[i], c)),
    aimed: lerp(a.aimed, b.aimed, k),
    // the recordings play from where this slide has them, not eased from the last's
    sweep: b.sweep,
    flip: b.flip,
    headers: lerp(a.headers, b.headers, k),
    named: lerp(a.named, b.named, k),
    link: lerp(a.link, b.link, k),
    circuit: lerp(a.circuit, b.circuit, k),
    numbers: nums(a.numbers, b.numbers),
  };
}

/* ------------------------------------------------------------------ drawing */

/** Words in the figure's serif, italic unless told otherwise, with a halo of the page if asked, so they read over anything. */
function words(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  colour: RGB,
  alpha: number,
  size = 12,
  align: CanvasTextAlign = 'left',
  halo: RGB | null = null,
  style = 'italic'
) {
  if (alpha < 0.01 || !text) return;
  ctx.font = `${style} ${size}px ${SERIF}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (halo) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = rgba(halo, 0.85 * alpha);
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = rgba(colour, alpha);
  ctx.fillText(text, x, y);
}

/** A name over as few lines as fit it in `room`, three at most, the lines as even as its words allow. */
function wrapName(ctx: CanvasRenderingContext2D, name: string, room: number): string[] {
  const parts = name.split(' ');
  const width = (line: string) => ctx.measureText(line).width;
  let best = [name];
  for (let n = 1; n <= Math.min(3, parts.length); n++) {
    let pick: string[] = [];
    let widest = Infinity;
    const split = (from: number, lines: string[]) => {
      if (lines.length === n - 1) {
        const all = [...lines, parts.slice(from).join(' ')];
        const most = Math.max(...all.map(width));
        if (most < widest) [pick, widest] = [all, most];
        return;
      }
      for (let k = from + 1; k <= parts.length - (n - 1 - lines.length); k++)
        split(k, [...lines, parts.slice(from, k).join(' ')]);
    };
    split(0, []);
    best = pick;
    if (widest <= room) break;
  }
  return best;
}

/** How wide a cell's dendrites are drawn, px, at `s` px to the µm. */
const lineFor = (s: number) => Math.max(0.7, Math.min(2.1, 0.5 + s * 2.4));

/**
 * One cell, as `cp` has it, turned `angle` about the line up through it: its
 * axon first, paler and finer, then its dendrites over it, and its soma —
 * leaving where each node went in its `sx`, `sy`.
 */
function drawCell(ctx: CanvasRenderingContext2D, c: Kind, cp: CellPose, angle: number, L: Look) {
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  const [mx, my, mz] = [c.mid[0] * cp.m, c.mid[1] * cp.m, c.mid[2] * cp.m];
  Object.assign(c.view, { x: cp.x, y: cp.y, s: cp.s, cos, sin, mx, my, mz });
  const n = c.x.length;
  for (let j = 0; j < n; j++) {
    c.sx[j] = cp.x + ((c.x[j] - mx) * cos + (c.z[j] - mz) * sin) * cp.s;
    c.sy[j] = cp.y - (c.y[j] - my) * cp.s;
  }
  if (cp.a < 0.01) return;
  const base = mix(L.grey, colourOf(c, L), cp.tint);
  const width = lineFor(cp.s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const axon of [true, false]) {
    const a = cp.a * (axon ? cp.ax : cp.de);
    if (a < 0.01) continue;
    ctx.globalAlpha = a * (axon ? 0.85 : 1);
    ctx.strokeStyle = rgba(axon ? mix(base, L.page, 0.5 * (1 - cp.axc)) : base, 1);
    ctx.lineWidth = axon ? width * 0.6 : width;
    ctx.beginPath();
    for (let j = 1; j < n; j++) {
      if ((c.t[j] === 2) !== axon) continue;
      const q = c.p[j];
      ctx.moveTo(c.sx[q], c.sy[q]);
      ctx.lineTo(c.sx[j], c.sy[j]);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = cp.a * Math.max(0.5, cp.de);
  ctx.fillStyle = rgba(mix(base, [0, 0, 0], 0.25), 1);
  ctx.beginPath();
  ctx.arc(c.sx[0], c.sy[0], Math.max(1.8, Math.min(5.5, cp.s * 9)), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Where a point of the cell, µm in its own frame, was drawn. */
function placed(c: Kind, q: [number, number, number]): Pt {
  const v = c.view;
  return {
    x: v.x + ((q[0] - v.mx) * v.cos + (q[2] - v.mz) * v.sin) * v.s,
    y: v.y - (q[1] - v.my) * v.s,
  };
}

/** The main pyramidal cell's parts, each lit as much as the pose has it, in its colour: a soft wide stroke under a bright one. */
function drawParts(ctx: CanvasRenderingContext2D, c: Kind, an: Anatomy, P: Pose, cp: CellPose) {
  const width = lineFor(cp.s);
  for (const d of DOMAINS) {
    const a = P.dom[d] * cp.a;
    if (a < 0.01) continue;
    const colour = P.domRGB[d] as RGB;
    ctx.strokeStyle = rgba(colour, 1);
    ctx.lineCap = 'round';
    if (d === SOMA) {
      const r = Math.max(1.8, Math.min(5.5, cp.s * 9));
      ctx.globalAlpha = a;
      ctx.fillStyle = rgba(colour, 0.9);
      ctx.beginPath();
      ctx.arc(c.sx[0], c.sy[0], r + 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 * a;
      ctx.beginPath();
      ctx.arc(c.sx[0], c.sy[0], r + 6, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    const path = new Path2D();
    if (d === AIS) {
      an.ais.forEach((q, k) => {
        const p = placed(c, q);
        if (k) path.lineTo(p.x, p.y);
        else path.moveTo(p.x, p.y);
      });
    } else {
      for (let j = 1; j < c.x.length; j++) {
        if (an.of[j] !== d) continue;
        const q = c.p[j];
        path.moveTo(c.sx[q], c.sy[q]);
        path.lineTo(c.sx[j], c.sy[j]);
      }
    }
    const thick = d === AIS ? 3.4 : 1.9;
    ctx.globalAlpha = 0.22 * a;
    ctx.lineWidth = width * thick * 2.6;
    ctx.stroke(path);
    ctx.globalAlpha = a;
    ctx.lineWidth = width * thick;
    ctx.stroke(path);
  }
  ctx.globalAlpha = 1;
}

/**
 * Names set out in a column at `x`, each by the point it names — moved apart
 * where they would overlap — with a line from each to its point.
 */
function callouts(
  ctx: CanvasRenderingContext2D,
  items: { text: string; p: Pt; colour: RGB; alpha: number }[],
  x: number,
  side: 'left' | 'right',
  R: Room,
  L: Look
) {
  const shown = items.filter((it) => it.alpha > 0.01 && it.text).sort((a, b) => a.p.y - b.p.y);
  const gap = 19;
  const ys = shown.map((it) => Math.max(R.top + 12, it.p.y));
  for (let k = 1; k < ys.length; k++) ys[k] = Math.max(ys[k], ys[k - 1] + gap);
  for (let k = ys.length - 1, most = R.foot - 34; k >= 0; k--, most -= gap)
    ys[k] = Math.min(ys[k], most);
  shown.forEach((it, k) => {
    const y = ys[k];
    words(
      ctx,
      it.text,
      x,
      y,
      it.colour,
      it.alpha,
      12.5,
      side === 'left' ? 'right' : 'left',
      L.page
    );
    const x0 = side === 'left' ? x + 6 : x - 6;
    const [dx, dy] = [it.p.x - x0, it.p.y - y];
    const len = Math.hypot(dx, dy);
    if (len < 10) return;
    const end = { x: it.p.x - (dx / len) * 5, y: it.p.y - (dy / len) * 5 };
    ctx.globalAlpha = it.alpha;
    ctx.strokeStyle = rgba(L.ink, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.fillStyle = rgba(L.ink, 0.6);
    ctx.beginPath();
    ctx.arc(end.x, end.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

/** The layers, as bands across the column, each lit as the pose has it. */
function drawBands(ctx: CanvasRenderingContext2D, P: Pose, L: Look) {
  if (P.bands < 0.01) return;
  const { top, k, left, right } = P.col;
  LAYERS.forEach((layer, i) => {
    const [y0, y1] = [top + layer.top * k, top + layer.bottom * k];
    ctx.globalAlpha = P.bands;
    ctx.fillStyle = rgba(L.ink, (i % 2 ? 0.028 : 0.05) + 0.05 * P.hi[i]);
    ctx.fillRect(left, y0, right - left, y1 - y0);
  });
  ctx.globalAlpha = 1;
}

/**
 * Over the cells, fading out what of them reaches past the column's sides —
 * so that it reads as a piece of cortex; and the layers named at its left,
 * halfway down as much of each as shows, the lit one bolder; the pia over
 * them; the white matter under.
 */
function drawLayers(ctx: CanvasRenderingContext2D, P: Pose, R: Room, L: Look) {
  if (P.bands < 0.01) return;
  const { top, k, left, right } = P.col;
  const bottom = top + DEPTH * k;
  const edge = 26;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = P.bands;
  const sides = [
    [left - edge, left, 1, 0],
    [right, right + edge, 0, 1],
  ];
  for (const [x0, x1, a0, a1] of sides) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, `rgba(0, 0, 0, ${a0})`);
    g.addColorStop(1, `rgba(0, 0, 0, ${a1})`);
    ctx.fillStyle = g;
    ctx.fillRect(x0, seen.y0, x1 - x0, seen.y1 - seen.y0);
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(seen.x0, seen.y0, Math.max(0, left - edge - seen.x0), seen.y1 - seen.y0);
  ctx.fillRect(right + edge, seen.y0, Math.max(0, seen.x1 - right - edge), seen.y1 - seen.y0);
  ctx.restore();
  LAYERS.forEach((layer, i) => {
    const [y0, y1] = [top + layer.top * k, top + layer.bottom * k];
    const hi = P.hi[i];
    const [ya, yb] = [Math.max(y0, R.top + 6), Math.min(y1, R.foot - 30)];
    if (yb - ya > 10) {
      const style = hi > 0.5 ? 'italic 600' : 'italic';
      words(
        ctx,
        layer.name,
        left - 12,
        (ya + yb) / 2,
        L.ink,
        P.bands * (0.55 + 0.45 * hi),
        12.5,
        'right',
        null,
        style
      );
    }
  });
  ctx.globalAlpha = P.bands;
  ctx.strokeStyle = rgba(L.ink, 0.4);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(right, top);
  if (bottom < R.foot) {
    ctx.moveTo(left, bottom);
    ctx.lineTo(right, bottom);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  words(ctx, "pia: the brain's surface", right, top - 9, L.ink, 0.6 * P.bands, 10.5, 'right');
  if (bottom < R.foot - 12)
    words(ctx, 'white matter', right, bottom + 9, L.ink, 0.6 * P.bands, 10.5, 'right');
}

/** The ways into a layer and out of it, as the pose has them: arrows in the column, each named. */
function drawArrows(ctx: CanvasRenderingContext2D, P: Pose, L: Look) {
  const { top, k, left, right } = P.col;
  const at = ([u, d]: [number, number]): Pt => ({ x: left + u * (right - left), y: top + d * k });
  ARROWS.forEach((arrow, i) => {
    const a = P.arrows[i];
    if (a < 0.01) return;
    const pts = arrow.pts.map(at);
    ctx.globalAlpha = a;
    ctx.strokeStyle = rgba(L.ink, 0.7);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 3) ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
    else ctx.lineTo(pts[1].x, pts[1].y);
    ctx.stroke();
    // its head, along the way it comes in
    const [p, q] = [pts[pts.length - 2], pts[pts.length - 1]];
    const angle = Math.atan2(q.y - p.y, q.x - p.x);
    ctx.fillStyle = rgba(L.ink, 0.7);
    ctx.beginPath();
    ctx.moveTo(q.x, q.y);
    ctx.lineTo(q.x - 9 * Math.cos(angle - 0.4), q.y - 9 * Math.sin(angle - 0.4));
    ctx.lineTo(q.x - 9 * Math.cos(angle + 0.4), q.y - 9 * Math.sin(angle + 0.4));
    ctx.fill();
    ctx.globalAlpha = 1;
    const named = at(arrow.at);
    words(ctx, arrow.name, named.x, named.y, L.ink, a, 12.5, arrow.align, L.page, 'italic 600');
  });
}

/** The rows' names at their left — and, as the pose has them, their families and how each is told apart. */
function drawRowNames(ctx: CanvasRenderingContext2D, P: Pose, L: Look, R: Room) {
  const r = P.rows;
  if (r.title < 0.01) return;
  const x = r.left - 16;
  // smaller in the narrow gutter of a narrow screen
  const sized = (size: number) => (r.left - R.left < GUTTER ? size - 2 : size);
  const lines: [string, number, number, number][][] = [
    [
      ['Interneurons', 13.5, 0.9, 1],
      ['inhibitory', 11.5, 0.6, 1],
      ['release GABA', 11, 0.6, r.families],
      ['13% of neurons', 11, 0.6, r.families],
      ['told apart', 11, 0.8, r.shape],
      ['by their axons', 11, 0.8, r.shape],
    ],
    [
      ['Excitatory cells', 13.5, 0.9, 1],
      ['excitatory', 11.5, 0.6, 1],
      ['release glutamate', 11, 0.6, r.families],
      ['87% of neurons', 11, 0.6, r.families],
      ['told apart', 11, 0.8, r.shape],
      ['by their dendrites', 11, 0.8, r.shape],
    ],
  ];
  lines.forEach((list, g) => {
    const tall = list.reduce((h, [, size, , a]) => h + (size + 4) * a, 0);
    let y = (g ? r.y1 : r.y0) - tall / 2;
    for (const [text, size, alpha, a] of list) {
      y += ((size + 4) * a) / 2;
      const style = size > 13 ? 'italic 600' : 'italic';
      words(ctx, text, x, y, L.ink, alpha * a * r.title, sized(size), 'right', null, style);
      y += ((size + 4) * a) / 2;
    }
  });
}

/** The cells' names: side by side, under each; in the column, beside its soma. */
function drawNames(ctx: CanvasRenderingContext2D, P: Pose, cells: Kind[], L: Look) {
  for (const c of cells) {
    const cp = P.cells[c.index];
    const colour = mix(colourOf(c, L), L.dark ? [255, 255, 255] : [0, 0, 0], 0.2);
    const slot = c.group ? P.rows.slot1 : P.rows.slot0;
    if (cp.name * cp.a > 0.01 && slot >= 40) {
      const small = slot < 80 ? 9.5 : 10.5;
      ctx.font = `italic ${small}px ${SERIF}`;
      const lines = wrapName(ctx, c.name, slot - 6);
      const y = c.group ? P.rows.name1 : P.rows.name0;
      lines.forEach((line, k) =>
        words(ctx, line, cp.x, y + k * (small + 1.5), colour, cp.name * cp.a, small, 'center')
      );
    }
    if (cp.tag * cp.a > 0.01) {
      const align = cp.tc > 0.5 ? 'center' : 'left';
      words(
        ctx,
        c.name,
        c.sx[0] + cp.tx,
        c.sy[0] + cp.ty,
        colour,
        cp.tag * cp.a,
        11,
        align,
        L.page
      );
    }
  }
}

/** The interneurons by marker: a bracket over each group, named. */
function drawMarkers(ctx: CanvasRenderingContext2D, P: Pose, cells: Kind[], L: Look) {
  if (P.genes < 0.01) return;
  const half = P.rows.slot0 / 2 - 5;
  for (const m of MARKERS) {
    const xs = m.types.map((type) => P.cells[cells.findIndex((c) => c.type === type)].x);
    const [x0, x1] = [Math.min(...xs) - half, Math.max(...xs) + half];
    const y = P.rows.top0 - 8;
    ctx.globalAlpha = P.genes;
    ctx.strokeStyle = rgba(L.ink, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y + 5);
    ctx.lineTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.lineTo(x1, y + 5);
    ctx.stroke();
    ctx.globalAlpha = 1;
    words(ctx, m.name, (x0 + x1) / 2, y - 10, L.ink, P.genes, 12, 'center', L.page, 'italic 600');
  }
}

/** Min and max for each px of a trace `w` px wide, mV — worked out again only when its width changes. */
const envelopes = new Map<Trace, { w: number; lo: Float32Array; hi: Float32Array }>();
function envelopeOf(tr: Trace, w: number) {
  const cols = Math.max(1, Math.round(w));
  const known = envelopes.get(tr);
  if (known && known.w === cols) return known;
  const bins = tr.v.length / 2;
  const [lo, hi] = [new Float32Array(cols), new Float32Array(cols)];
  for (let c = 0; c < cols; c++) {
    const [b0, b1] = [
      Math.floor((c * bins) / cols),
      Math.max(Math.floor((c * bins) / cols) + 1, Math.floor(((c + 1) * bins) / cols)),
    ];
    let [l, h] = [Infinity, -Infinity];
    for (let b = b0; b < b1 && b < bins; b++)
      [l, h] = [Math.min(l, tr.v[2 * b]), Math.max(h, tr.v[2 * b + 1])];
    [lo[c], hi[c]] = [l, h];
  }
  const env = { w: cols, lo, hi };
  envelopes.set(tr, env);
  return env;
}

/**
 * The recordings, each where the pose has it: its type's code and name over
 * it; the 2 s the step of current is on, shaded; and the voltage, played as
 * far as the pose has got through it — in the pyramidal cell's colour for
 * its own, ink for the interneurons', or, linked to the small basket cell,
 * that cell's. And, as the pose has them, the table's headings, and a scale.
 */
function drawTraces(ctx: CanvasRenderingContext2D, P: Pose, cells: Kind[], L: Look, R: Room) {
  const all = traces;
  if (!all || P.traces.every((q) => q.a < 0.01)) return;
  const pyramidal = colourOf(cells.find((c) => c.type === MAIN) ?? cells[0], L);
  const sbc = colourOf(cells.find((c) => c.type === 'SBC') ?? cells[0], L);
  const y = (tp: TracePose, v: number) => tp.y + tp.h * (1 - (v - V_LOW) / (V_HIGH - V_LOW));
  ETYPES.forEach((e, i) => {
    const tp = P.traces[i];
    const tr = all[i];
    if (tp.a < 0.01 || !tr || !tr.v.length) return;
    const bins = tr.v.length / 2;
    const colour =
      e.code === 'cADpyr'
        ? pyramidal
        : SBC_ETYPES.includes(e.code)
          ? mix(L.ink, sbc, P.link)
          : mix(L.ink, L.grey, 0.15);
    // the step of current, on
    ctx.globalAlpha = tp.a;
    ctx.fillStyle = rgba(L.ink, 0.045);
    ctx.fillRect(
      tp.x + (tp.w * tr.on) / bins,
      tp.y - 2,
      (tp.w * (tr.off - tr.on)) / bins,
      tp.h + 4
    );
    // the voltage, as far as played: its highs along the top, its lows back along the bottom
    const env = envelopeOf(tr, tp.w);
    const upTo = Math.max(1, Math.round(env.w * clamp01(P.sweep)));
    const dx = tp.w / env.w;
    ctx.fillStyle = rgba(colour, 1);
    ctx.beginPath();
    for (let c = 0; c < upTo; c++) ctx.lineTo(tp.x + c * dx, y(tp, env.hi[c]) - 0.6);
    for (let c = upTo - 1; c >= 0; c--) ctx.lineTo(tp.x + c * dx, y(tp, env.lo[c]) + 0.6);
    ctx.closePath();
    ctx.fill();
    if (P.sweep < 1) {
      ctx.beginPath();
      ctx.arc(
        tp.x + (upTo - 1) * dx,
        y(tp, (env.hi[upTo - 1] + env.lo[upTo - 1]) / 2),
        2.4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // its code, and its name
    words(
      ctx,
      e.code,
      tp.x,
      tp.y - 14,
      e.code === 'cADpyr' ? pyramidal : L.ink,
      tp.a,
      13.5,
      'left',
      null,
      'italic 600'
    );
    ctx.font = `italic 600 13.5px ${SERIF}`;
    const cw = ctx.measureText(e.code).width;
    // its name beside its code, where there is room for it
    ctx.font = `italic 11px ${SERIF}`;
    if (cw + 8 + ctx.measureText(e.name).width < tp.w + 16)
      words(ctx, e.name, tp.x + cw + 8, tp.y - 13, L.ink, 0.65 * tp.a * P.named, 11, 'left');
  });
  // the table's headings: how each column goes on, how each row starts; and over them, whose they are
  if (P.headers > 0.01) {
    const a = P.headers;
    const flip = P.flip > 0.5;
    const inCol = (col: number) =>
      ETYPES.map((e, i) => (e.col === col ? P.traces[i] : null)).filter((q) => q !== null);
    const inRow = (row: number) =>
      ETYPES.map((e, i) => (e.row === row ? P.traces[i] : null)).filter((q) => q !== null);
    const top = Math.min(...P.traces.map((q) => q.y)) - 42;
    const left = Math.min(...P.traces.map((q) => q.x)) - 16;
    // over each column, under its name — or, turned, at the left of each row
    const over = (name: string, code: string, q: TracePose | undefined, colour = L.ink) => {
      if (!q) return;
      words(ctx, name, q.x + q.w / 2, top, colour, 0.85 * a, 12.5, 'center', null, 'italic 600');
      words(ctx, `(${code})`, q.x + q.w / 2, top + 14, L.ink, 0.55 * a, 10.5, 'center');
    };
    const beside = (name: string, code: string, q: TracePose | undefined, colour = L.ink) => {
      if (!q) return;
      words(
        ctx,
        name,
        left,
        q.y + q.h / 2 - 7,
        colour,
        0.85 * a,
        12.5,
        'right',
        L.page,
        'italic 600'
      );
      words(ctx, `(${code})`, left, q.y + q.h / 2 + 8, L.ink, 0.55 * a, 10.5, 'right', L.page);
    };
    GOES_ON.forEach(([name, code], col) =>
      (flip ? beside : over)(name, code, inCol(col)[0], col ? L.ink : pyramidal)
    );
    STARTS.forEach(([name, code], row) => (flip ? over : beside)(name, code, inRow(row)[0]));
    // whose: the pyramidal cells' one column, the interneurons' four
    const [first, rest] = [inCol(0)[0], inCol(1)[0]];
    const last = inCol(4)[0];
    if (first && rest && last && !flip) {
      ctx.globalAlpha = a;
      ctx.strokeStyle = rgba(L.ink, 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const [x0, x1] of [
        [first.x, first.x + first.w],
        [rest.x, last.x + last.w],
      ]) {
        ctx.moveTo(x0, top - 14);
        ctx.lineTo(x0, top - 18);
        ctx.lineTo(x1, top - 18);
        ctx.lineTo(x1, top - 14);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      words(
        ctx,
        'pyramidal cells',
        first.x + first.w / 2,
        top - 28,
        pyramidal,
        a,
        12,
        'center',
        null,
        'italic 600'
      );
      words(
        ctx,
        'interneurons',
        (rest.x + last.x + last.w) / 2,
        top - 28,
        L.ink,
        a,
        12,
        'center',
        null,
        'italic 600'
      );
    }
  }
  // a scale, under the last
  const q = P.traces[0];
  const shown = Math.max(...P.traces.map((tp) => tp.a));
  if (q && shown > 0.01) {
    const [ms, mv] = [(500 * q.w) / 2300, (50 * q.h) / (V_HIGH - V_LOW)];
    const [x1, y1] = [R.right - 56, R.foot - 16];
    ctx.globalAlpha = shown;
    ctx.strokeStyle = rgba(L.ink, 0.8);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x1 - ms, y1);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, y1 - mv);
    ctx.stroke();
    ctx.globalAlpha = 1;
    words(ctx, '500 ms', x1 - ms / 2, y1 + 9, L.ink, 0.75 * shown, 10.5, 'center');
    words(ctx, '50 mV', x1 + 6, y1 - mv / 2, L.ink, 0.75 * shown, 10.5, 'left');
  }
}

/** The small basket cell's own: a line from it to each of its firing types, and its name under it. */
function drawLinks(ctx: CanvasRenderingContext2D, P: Pose, cells: Kind[], L: Look) {
  if (P.link < 0.01) return;
  const c = cells.find((k) => k.type === 'SBC');
  if (!c) return;
  const cp = P.cells[c.index];
  const colour = colourOf(c, L);
  const from = { x: cp.x + c.round * cp.s * 0.8, y: cp.y };
  ctx.globalAlpha = P.link;
  ctx.strokeStyle = rgba(colour, 0.7);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const code of SBC_ETYPES) {
    const tp = P.traces[ETYPES.findIndex((e) => e.code === code)];
    const to = { x: tp.x - 10, y: tp.y + tp.h / 2 };
    const mid = (from.x + to.x) / 2;
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(mid, from.y, mid, to.y, to.x, to.y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  const dark = mix(colour, L.dark ? [255, 255, 255] : [0, 0, 0], 0.2);
  // under it — or, turned into the table on a narrow screen, at its right
  const [x, y, align] =
    P.flip > 0.5
      ? [cp.x + c.round * cp.s * 0.7 + 6, cp.y - 8, 'left' as const]
      : [cp.x, cp.y + (c.tall / 2) * cp.s + 18, 'center' as const];
  words(ctx, c.name, x, y, dark, P.link, 13.5, align, L.page, 'italic 600');
  words(ctx, 'four of the ways it can fire', x, y + 17, L.ink, 0.65 * P.link, 11.5, align, L.page);
}

/**
 * The column filled: many more cells like the 26, at their layers' depths and
 * in their layers' mix, faint, their dendrites only — drawn once, a few a
 * frame, onto a canvas of their own, and laid over the column wherever it is.
 */
const crowd = {
  key: '',
  canvas: null as HTMLCanvasElement | null,
  done: 0,
  list: [] as { c: Kind; x: number; y: number; a: number }[],
  box: { x: 0, y: 0, w: 1, h: 1 },
};
function drawCrowd(ctx: CanvasRenderingContext2D, P: Pose, G: Column, cells: Kind[], L: Look) {
  if (P.circuit < 0.01) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const key = [G.top, G.k, G.left, G.right].map((v) => v.toFixed(1)).join() + `:${dpr}:${L.dark}`;
  if (crowd.key !== key || !crowd.canvas) {
    const box = { x: G.left - 40, y: G.top - 10, w: G.right - G.left + 80, h: DEPTH * G.k + 30 };
    const canvas = crowd.canvas ?? document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(box.w * dpr));
    canvas.height = Math.max(1, Math.round(box.h * dpr));
    // as many as fill it without crowding it into one colour, by layer and kind
    const rnd = mulberry32(31346);
    const count = Math.round(
      Math.max(150, Math.min(700, ((G.right - G.left) * DEPTH * G.k) / 650))
    );
    const by = (type: string) => cells.find((c) => c.type === type) ?? cells[0];
    const list: typeof crowd.list = [];
    for (let i = 0; i < count; i++) {
      let [r, li] = [rnd(), 0];
      while (li < FILL.length - 1 && r > FILL[li].share) r -= FILL[li++].share;
      const layer = FILL[li];
      const pool = rnd() < layer.inhibitory ? (li === 0 ? FIRST_LAYER : DEEPER) : layer.excitatory;
      const c = by(pool[Math.floor(rnd() * pool.length)]);
      const { top, bottom } = LAYERS[li];
      // kept under the pia: its dendrites' top no higher than it
      const depth = Math.max(c.top + 5, top + 6 + rnd() * (bottom - top - 12));
      list.push({
        c,
        x: G.left + rnd() * (G.right - G.left),
        y: G.top + depth * G.k,
        a: rnd() * Math.PI * 2,
      });
    }
    Object.assign(crowd, { key, canvas, done: 0, list, box });
  }
  const canvas = crowd.canvas!;
  const g = canvas.getContext('2d');
  if (!g) return;
  if (crowd.done === 0) g.clearRect(0, 0, canvas.width, canvas.height);
  g.setTransform(dpr, 0, 0, dpr, -crowd.box.x * dpr, -crowd.box.y * dpr);
  g.lineCap = 'round';
  for (let n = 0; n < 24 && crowd.done < crowd.list.length; n++, crowd.done++) {
    const { c, x, y, a } = crowd.list[crowd.done];
    const [cos, sin] = [Math.cos(a), Math.sin(a)];
    g.strokeStyle = rgba(colourOf(c, L), L.dark ? 0.24 : 0.17);
    g.lineWidth = 0.6;
    g.beginPath();
    for (let j = 1; j < c.x.length; j++) {
      if (c.t[j] === 2) continue;
      const q = c.p[j];
      g.moveTo(x + (c.x[q] * cos + c.z[q] * sin) * G.k, y - c.y[q] * G.k);
      g.lineTo(x + (c.x[j] * cos + c.z[j] * sin) * G.k, y - c.y[j] * G.k);
    }
    g.stroke();
    g.fillStyle = rgba(colourOf(c, L), 0.45);
    g.beginPath();
    g.arc(x, y, 1.2, 0, Math.PI * 2);
    g.fill();
  }
  // laid over the column where the pose has it — the one it was drawn for, or on its way there
  const sx = (P.col.right - P.col.left) / (G.right - G.left);
  const sy = P.col.k / G.k;
  const b = crowd.box;
  ctx.globalAlpha = P.circuit;
  ctx.drawImage(
    canvas,
    P.col.left + (b.x - G.left) * sx,
    P.col.top + (b.y - G.top) * sy,
    b.w * sx,
    b.h * sy
  );
  ctx.globalAlpha = 1;
}

/** The microcircuit's numbers, beside it. */
function drawNumbers(ctx: CanvasRenderingContext2D, P: Pose, R: Room, L: Look) {
  if (Math.max(...P.numbers) < 0.01) return;
  const x = P.col.right + 56;
  const [y0, y1] = [R.top + 40, R.foot - 64];
  const step = (y1 - y0) / (NUMBERS.length - 1);
  const big = Math.max(16, Math.min(28, step * 0.5));
  NUMBERS.forEach(([n, what], i) => {
    const y = y0 + step * i;
    words(ctx, n, x, y, L.ink, P.numbers[i], big, 'left', null, '600');
    words(ctx, what, x, y + big * 0.55 + 8, L.ink, 0.7 * P.numbers[i], 12, 'left');
  });
}

/** How far under the words above the figure it fades out, and over how far; and over the slides' dots under it. */
const FADE_UNDER = 28;
const FADE_FOR = 56;
const FOOT_OVER = 6;
const FOOT_FOR = 48;
/** Spilling over the page, nothing drawn behind the words above the figure, nor behind the slides' dots below it. */
function fadeEdges(ctx: CanvasRenderingContext2D, box: DOMRect, frame: HTMLElement | null) {
  const width = seen.x1 - seen.x0;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const said = frame?.parentElement?.previousElementSibling;
  const line =
    (said ? said.getBoundingClientRect().bottom : box.top - FADE_UNDER) + FADE_UNDER - box.top;
  ctx.fillStyle = '#000';
  ctx.fillRect(seen.x0, seen.y0, width, Math.max(0, line - FADE_FOR - seen.y0));
  const above = ctx.createLinearGradient(0, line - FADE_FOR, 0, line);
  above.addColorStop(0, 'rgba(0, 0, 0, 1)');
  above.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = above;
  ctx.fillRect(seen.x0, line - FADE_FOR, width, FADE_FOR);
  const foot = frame?.closest('main')?.nextElementSibling;
  if (foot) {
    const floor = foot.getBoundingClientRect().top - FOOT_OVER - box.top;
    ctx.fillStyle = '#000';
    ctx.fillRect(seen.x0, floor, width, Math.max(0, seen.y1 - floor));
    const below = ctx.createLinearGradient(0, floor - FOOT_FOR, 0, floor);
    below.addColorStop(0, 'rgba(0, 0, 0, 0)');
    below.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = below;
    ctx.fillRect(seen.x0, floor - FOOT_FOR, width, FOOT_FOR);
  }
  ctx.restore();
}

/** Whose each slide's cells and recordings are, along its foot. */
function creditOf(step: CortexStep) {
  if (step === 'kinds' || step === 'families' || step === 'shape')
    return "26 kinds of neuron in the rat's somatosensory cortex, one real cell of each · Markram et al., 2015, Blue Brain Project";
  if (step === 'genes')
    return 'Markers: Markram et al., 2015; Rudy et al., 2011 · cells: Blue Brain Project';
  if (step === 'firing' || step === 'named' || step === 'several')
    return "Real recordings, rat somatosensory cortex: each cell's answer to a 2 s step of current · M. Toledo-Rodriguez, S. Romand, Markram lab, EPFL";
  if (step === 'circuit')
    return 'The digital reconstruction of Markram et al., 2015, Cell 163:456 · Blue Brain Project';
  return "Real cells, drawn to scale in the layers of the rat's somatosensory cortex · Markram et al., 2015, Blue Brain Project";
}

/** How long a change of slide takes to ease the figure from one picture to the next, ms. */
const BLEND = 1200;
/** Turned by hand: how far for each px dragged across. */
const TURN_PER_PX = 0.008;

const BOX_CLASS = 'h-[340px] w-full rounded-xl';

export default function Cortex({ step, back = false }: { step: CortexStep; back?: boolean }) {
  const embedded = useContext(Embedded);
  const spill = useSyncExternalStore(subscribe, savedSpill, () => false) && !embedded;
  const frame = useRef<HTMLDivElement | null>(null);
  const spillRoot = useSpillRoot(frame, spill);
  // The slide being drawn, and since when — at its finished picture, come back to; the picture last drawn; and the
  // one a change of slide eases out of, and its credit.
  const run = useRef<{ step: CortexStep; first: number; t0: number } | null>(null);
  const drawn = useRef<Pose | null>(null);
  const from = useRef<{ pose: Pose; at: number; credit: string } | null>(null);
  // turned by hand, by dragging across it — eased back with a double click
  const hand = useRef<{
    yaw: number;
    settle: boolean;
    drag: { id: number; x: number; yaw: number } | null;
  }>({
    yaw: 0,
    settle: false,
    drag: null,
  });

  useEffect(() => {
    loadKinds();
    loadTraces();
  }, []);

  const canvasRef = useCanvasFrame((ctx, cw, ch, now) => {
    let [w, h] = [cw, ch];
    const box = spill ? frame.current?.getBoundingClientRect() : null;
    if (box) {
      ctx.translate(box.left, box.top);
      [w, h] = [Math.round(box.width), Math.round(box.height)];
      Object.assign(seen, {
        x0: -box.left,
        y0: -box.top,
        x1: cw - box.left,
        y1: ch - box.top,
        spill: true,
      });
    } else Object.assign(seen, { x0: 0, y0: 0, x1: w, y1: h, spill: false });
    const cells = kinds;
    if (!cells) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (run.current?.step !== step) {
      const was = run.current?.step;
      run.current = { step, first: now, t0: back ? DONE : 0 };
      if (drawn.current && was)
        from.current = { pose: drawn.current, at: now, credit: creditOf(was) };
    }
    const t = still ? Infinity : run.current.t0 + now - run.current.first;
    const R = roomOf(w, h);
    const L = lookOf();
    const target = poseFor(step, t, R, cells, L);
    let pose = target;
    let k = 1;
    if (from.current) {
      k = still ? 1 : smooth((now - from.current.at) / BLEND);
      if (k >= 1) from.current = null;
      else pose = blendPose(from.current.pose, target, k);
    }
    drawn.current = pose;

    // as turned by hand — which, let go of with a double click, eases back to nothing
    const by = hand.current;
    if (by.settle && !by.drag) {
      by.yaw *= 0.86;
      if (Math.abs(by.yaw) < 0.002) [by.yaw, by.settle] = [0, false];
    }
    const clock = still ? 0 : now / 1000;
    const angleOf = (c: Kind, cp: CellPose) => {
      const free = c.start + c.spin * clock;
      const held = cp.turn + (still ? 0 : 0.28 * Math.sin(clock * 0.45 + c.start));
      return free + cp.hold * Math.atan2(Math.sin(held - free), Math.cos(held - free)) + by.yaw;
    };

    drawBands(ctx, pose, L);
    drawCrowd(ctx, pose, columnOf(R, DEPTH, 0.56), cells, L);
    // the greyed cells under the ones in colour
    const order = [...cells].sort((a, b) => pose.cells[a.index].tint - pose.cells[b.index].tint);
    for (const c of order)
      drawCell(ctx, c, pose.cells[c.index], angleOf(c, pose.cells[c.index]), L);
    const main = cells.find((c) => c.type === MAIN);
    if (main) drawParts(ctx, main, anatomyOf(main), pose, pose.cells[main.index]);
    drawLayers(ctx, pose, R, L);
    if (main) {
      const an = anatomyOf(main);
      const cp = pose.cells[main.index];
      // its parts named at its left; or, the interneurons aiming at them, the parts they aim at; or, all of them lit,
      // who aims at each, at its right
      if (cp.a > 0.01) {
        const at = (j: number) => ({ x: main.sx[j], y: main.sy[j] });
        const basal = (() => {
          let best = -1;
          for (let j = 1; j < main.x.length; j++)
            if (an.of[j] === BASAL && (best < 0 || main.sx[j] < main.sx[best])) best = j;
          return Math.max(0, best);
        })();
        const aisAt = placed(main, an.ais[Math.floor(an.ais.length / 2)] ?? [0, -20, 0]);
        const ink = L.ink;
        // at its left — or, with no room there, at its right
        const roomy = main.sx[0] - R.left > 270;
        const left = roomy ? main.sx[0] - 150 : main.sx[0] + 80;
        const side = roomy ? 'left' : 'right';
        callouts(
          ctx,
          [
            { text: 'tuft', p: at(an.tuft), colour: ink, alpha: pose.parts * cp.a },
            { text: 'apical dendrite', p: at(an.trunk), colour: ink, alpha: pose.parts * cp.a },
            { text: 'basal dendrites', p: at(basal), colour: ink, alpha: pose.parts * cp.a },
            { text: 'soma', p: at(0), colour: ink, alpha: pose.parts * cp.a },
            { text: 'axon initial segment', p: aisAt, colour: ink, alpha: pose.parts * cp.a },
            { text: 'axon', p: at(an.axon), colour: ink, alpha: pose.parts * cp.a },
          ],
          left,
          side,
          R,
          L
        );
        const points = [at(an.tuft), at(an.trunk), at(basal), at(0), aisAt];
        const dim = (d: number) =>
          mix(pose.domRGB[d] as RGB, L.dark ? [255, 255, 255] : [0, 0, 0], 0.2);
        callouts(
          ctx,
          DOMAINS.map((d) => ({
            text: PART_NAMES[d],
            p: points[d],
            colour: dim(d),
            alpha: pose.dom[d] * pose.partNames * (1 - pose.parts) * (1 - pose.aimed) * cp.a,
          })),
          left,
          side,
          R,
          L
        );
        callouts(
          ctx,
          DOMAINS.map((d) => ({
            text: AIMED_NAMES[d],
            p: points[d],
            colour: dim(d),
            alpha: pose.aimed * cp.a,
          })),
          main.sx[0] + 130,
          'right',
          R,
          L
        );
      }
    }
    drawArrows(ctx, pose, L);
    drawRowNames(ctx, pose, L, R);
    drawNames(ctx, pose, cells, L);
    drawMarkers(ctx, pose, cells, L);
    drawLinks(ctx, pose, cells, L);
    drawTraces(ctx, pose, cells, L, R);
    drawNumbers(ctx, pose, R, L);
    // a scale under the rows of cells, all drawn to one
    const r = pose.rows;
    if (r.title > 0.01) {
      const len = 200 * r.s;
      ctx.globalAlpha = r.title;
      ctx.strokeStyle = rgba(L.ink, 0.85);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(R.right - 52 - len, R.foot - 9);
      ctx.lineTo(R.right - 52, R.foot - 9);
      ctx.stroke();
      ctx.globalAlpha = 1;
      words(ctx, '200 µm', R.right - 46, R.foot - 9, L.ink, 0.75 * r.title, 11);
    }
    // whose they are, the last slide's going as this one's comes
    const credit = creditOf(step);
    const small = w < 560 ? 9 : 10.5;
    if (from.current && from.current.credit !== credit)
      words(ctx, from.current.credit, R.left + 16, R.foot - 9, L.ink, 0.6 * (1 - k), small);
    words(
      ctx,
      credit,
      R.left + 16,
      R.foot - 9,
      L.ink,
      0.6 * (from.current && from.current.credit !== credit ? k : 1),
      small
    );
    if (box) fadeEdges(ctx, box, frame.current);
  });

  const onGrab = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // a pointer no longer down: the drag still works within the figure
    }
    hand.current.drag = { id: e.pointerId, x: e.clientX, yaw: hand.current.yaw };
    hand.current.settle = false;
  };
  const onDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = hand.current.drag;
    if (d && d.id === e.pointerId) hand.current.yaw = d.yaw + (e.clientX - d.x) * TURN_PER_PX;
  };
  const onDrop = (e: React.PointerEvent<HTMLDivElement>) => {
    if (hand.current.drag?.id === e.pointerId) hand.current.drag = null;
  };
  const onStraighten = () => {
    hand.current.yaw = Math.atan2(Math.sin(hand.current.yaw), Math.cos(hand.current.yaw));
    hand.current.settle = true;
  };

  return (
    <div
      className="relative flex w-full flex-1 cursor-grab touch-none flex-col select-none active:cursor-grabbing"
      title="Drag to turn the cells · double-click to set them straight"
      onPointerDown={onGrab}
      onPointerMove={onDrag}
      onPointerUp={onDrop}
      onPointerCancel={onDrop}
      onDoubleClick={onStraighten}
      // a drag across it turns the cells, rather than swiping on to another slide
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="min-h-[16px] flex-1" />
      {spill ? (
        <>
          <div ref={frame} role="img" aria-label={LABELS[step]} className={BOX_CLASS} />
          {spillRoot &&
            createPortal(
              // biome-ignore lint/a11y/noAriaHiddenOnFocusable: drawn behind the words, never focused
              <canvas
                ref={canvasRef}
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
              />,
              spillRoot
            )}
        </>
      ) : (
        <canvas ref={canvasRef} role="img" aria-label={LABELS[step]} className={BOX_CLASS} />
      )}
      <div className="flex-1" />
    </div>
  );
}

/** What each slide's figure shows, for screen readers. */
const LABELS: Record<CortexStep, string> = {
  kinds:
    "Twenty-six real neurons side by side, each turning in three dimensions and named under it: a row of fifteen kinds of interneuron above a row of eleven kinds of excitatory cell, from the rat's somatosensory cortex.",
  families:
    'The same two rows: the interneurons, inhibitory, releasing GABA, 13% of neurons; the excitatory cells, releasing glutamate, 87%.',
  shape:
    'The same two rows, the interneurons drawn by their axons, the excitatory cells by their dendrites — the parts each family is told apart by.',
  layers:
    "The twenty-six cells in a column of cortex, drawn to scale, each at its depth in its layer: layer 1 under the brain's surface, then layers 2/3, 4, 5 and 6 above the white matter.",
  pyramidal:
    'Closer in, a thick-tufted layer 5 pyramidal cell, its parts named: the tuft in layer 1, the apical dendrite, the basal dendrites, the soma, the axon initial segment and the axon.',
  l23: 'Layer 2/3 lit, its pyramidal cell in colour, arrows from it out to other cortical areas and down to layer 5.',
  l4: 'Layer 4 lit, its star pyramidal and spiny stellate cells in colour, an arrow from the thalamus into it and one up from it to layer 2/3.',
  l5: 'Layer 5 lit, its four kinds of pyramidal cell in colour, an arrow from it down out of the cortex, to the thalamus, brainstem and spinal cord.',
  l6: 'Layer 6 lit, its four kinds of pyramidal cell in colour, an arrow from it back down to the thalamus.',
  interneurons:
    'The fifteen kinds of interneuron in colour in the column, in every layer, the excitatory cells greyed.',
  basket:
    'Beside the pyramidal cell, now grey, three basket cells — large, nest and small — their axons around its soma, which is lit in their colour.',
  chandelier:
    "A chandelier cell beside the pyramidal cell, its axon's rows of boutons by the pyramidal cell's axon initial segment, lit in its colour.",
  martinotti:
    "A Martinotti cell beside the pyramidal cell, its axon climbing to layer 1 and spreading there, over the pyramidal cell's tuft, lit in its colour.",
  vertical:
    'A double bouquet cell, a bitufted cell and a bipolar cell beside the pyramidal cell, their narrow axons running up and down, its dendrites lit in their colour.',
  neurogliaform:
    "A neurogliaform cell beside the pyramidal cell's apical dendrite, its dense small cloud of axon around it, the dendrite lit in its colour.",
  layer1:
    "Layer 1's six kinds of interneuron along the top of the cortex, among the pyramidal cell's tuft, which is lit; an arrow brings inputs into layer 1 from other areas and the thalamus.",
  targets:
    "The pyramidal cell with each part lit in the colour of who inhibits it: the tuft, Martinotti cells and layer 1's interneurons; the dendrites, double bouquet, bitufted, bipolar and neurogliaform cells; the soma, basket cells; the axon initial segment, chandelier cells.",
  firing:
    "Eleven real voltage recordings, played as they were recorded, each a cell's answer to two seconds of steady current: one pyramidal cell's, adapting, and ten interneurons', each firing in its own pattern.",
  named:
    'The eleven recordings set out in a table: rows for how firing starts — continuous, bursting or delayed — and columns for how it goes on — adapting, accommodating, non-accommodating, stuttering or irregular.',
  several:
    'A small basket cell, turning, linked to four of the firing types its kind shows: bursting non-accommodating, continuous irregular, delayed non-accommodating and delayed stuttering.',
  genes:
    'The interneurons regrouped by the marker they carry: parvalbumin — large and nest basket cells and chandelier cells; somatostatin — Martinotti cells; VIP — bipolar, double bouquet and small basket cells; and others.',
  circuit:
    'The column filled with hundreds of faint cells like the twenty-six, and beside it the microcircuit in numbers: about 31,000 neurons, 55 kinds by shape, 207 by shape and firing, about 8 million connections and 37 million synapses, in 0.29 cubic millimetres.',
};
