'use client';

/**
 * The fitting part of the NEURON and Jaxley course's figure: how far a
 * model's spike is from a recorded one, over a grid of its soma's sodium and
 * potassium conductances — the sweep's 1,681 simulations, run with Jaxley —
 * drawn as a landscape, with the values the recording was made with and a
 * wrong start marked. On it: an evolutionary search, generation by
 * generation; the slope, downhill everywhere; and gradient descent, step by
 * step, as the course's fit.py ran it.
 */

import { clamp01, mix, phase, type RGB, rgba } from '@/features/learn/components/heuristics/shared';

import { arrow, type Look, mathWords, type Room, words } from '../ui/canvas';
import StepCanvas, { type Frame } from '../ui/StepCanvas';
import { DESCENT, LANDSCAPE, SEARCH, TRUTH } from './landscape';

export const FIT_STEPS = ['search', 'gradient', 'descent'] as const;
export type FitStep = (typeof FIT_STEPS)[number];
export const isFitStep = (s: string): s is FitStep => FIT_STEPS.includes(s as FitStep);

const SEARCHER: RGB = [124, 58, 237];
const DESCENDER: RGB = [217, 119, 6];
const START = [DESCENT[0][0], DESCENT[0][1]] as const;
const N = LANDSCAPE.n;
const LOG = LANDSCAPE.loss.map((row) => row.map((x) => Math.log10(x + 0.01)));
const [LO, HI] = [Math.log10(0.01), Math.max(...LOG.flat())];

/** The landscape's log loss at any (gNa, gK), between the grid's points. */
function logLossAt(gna: number, gk: number) {
  const c = clamp01((gna - LANDSCAPE.gNa[0]) / (LANDSCAPE.gNa[1] - LANDSCAPE.gNa[0])) * (N - 1);
  const r = clamp01((gk - LANDSCAPE.gK[0]) / (LANDSCAPE.gK[1] - LANDSCAPE.gK[0])) * (N - 1);
  const [c0, r0] = [Math.min(N - 2, Math.floor(c)), Math.min(N - 2, Math.floor(r))];
  const [u, v] = [c - c0, r - r0];
  return (
    LOG[r0][c0] * (1 - u) * (1 - v) +
    LOG[r0][c0 + 1] * u * (1 - v) +
    LOG[r0 + 1][c0] * (1 - u) * v +
    LOG[r0 + 1][c0 + 1] * u * v
  );
}

/** The contour lines of the log loss, at whole powers of ten, by marching squares: segments in grid units. */
const CONTOURS = (() => {
  const out: { level: number; segs: [number, number, number, number][] }[] = [];
  for (let level = -1; level <= 2; level++) {
    const segs: [number, number, number, number][] = [];
    for (let r = 0; r < N - 1; r++)
      for (let c = 0; c < N - 1; c++) {
        const corners: [number, number, number][] = [
          [c, r, LOG[r][c]],
          [c + 1, r, LOG[r][c + 1]],
          [c + 1, r + 1, LOG[r + 1][c + 1]],
          [c, r + 1, LOG[r + 1][c]],
        ];
        const cuts: [number, number][] = [];
        for (let k = 0; k < 4; k++) {
          const [x0, y0, a] = corners[k];
          const [x1, y1, b] = corners[(k + 1) % 4];
          if (a < level !== b < level) {
            const f = (level - a) / (b - a);
            cuts.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]);
          }
        }
        if (cuts.length >= 2) segs.push([cuts[0][0], cuts[0][1], cuts[1][0], cuts[1][1]]);
        if (cuts.length === 4) segs.push([cuts[2][0], cuts[2][1], cuts[3][0], cuts[3][1]]);
      }
    out.push({ level, segs });
  }
  return out;
})();

/** The landscape as a small image, the deep colour for a close match, the page's for a poor one: one per theme. */
const IMAGES = new Map<string, HTMLCanvasElement>();
function imageFor(L: Look) {
  const deep: RGB = L.dark ? [56, 189, 248] : [29, 78, 216];
  const key = `${L.dark}`;
  let img = IMAGES.get(key);
  if (img) return img;
  img = document.createElement('canvas');
  img.width = img.height = N;
  const g = img.getContext('2d');
  if (!g) return img;
  const data = g.createImageData(N, N);
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const k = clamp01((LOG[r][c] - LO) / (HI - LO));
      const [R, G, B] = mix(deep, mix(L.page, L.ink, 0.04), k ** 0.75);
      const at = ((N - 1 - r) * N + c) * 4;
      data.data.set([R, G, B, 255], at);
    }
  g.putImageData(data, 0, 0);
  IMAGES.set(key, img);
  return img;
}

interface Pose {
  map: number;
  search: number;
  field: number;
  descent: number;
  ghost: number;
}

function poseFor(step: FitStep): Pose {
  if (step === 'search') return { map: 1, search: 1, field: 0, descent: 0, ghost: 0 };
  if (step === 'gradient') return { map: 1, search: 0, field: 1, descent: 0, ghost: 0 };
  return { map: 1, search: 0, field: 0.25, descent: 1, ghost: 1 };
}

interface Scene {
  ctx: CanvasRenderingContext2D;
  P: Pose;
  L: Look;
  R: Room;
  w: number;
  t: number;
  box: { x: number; y: number; w: number; h: number };
  px: (gna: number) => number;
  py: (gk: number) => number;
}

function sceneOf(f: Frame<FitStep>, P: Pose): Scene {
  const R = f.room;
  const w = f.w;
  const H = R.foot - R.top;
  const wide = w >= 640;
  // on a narrow screen the plot goes at the top, its words under it
  const bw = wide ? Math.min(w * 0.6, Math.max(320, (H - 90) * 1.45), 640) : w - 70;
  const bh = wide ? Math.min(H - 92, bw * 0.72) : Math.min(H - 150, bw * 0.66);
  const box = {
    x: wide ? (w - bw) / 2 - 40 : 52,
    y: wide ? R.top + (H - bh) / 2 - 4 : R.top + 24,
    w: bw,
    h: bh,
  };
  const px = (gna: number) =>
    box.x + ((gna - LANDSCAPE.gNa[0]) / (LANDSCAPE.gNa[1] - LANDSCAPE.gNa[0])) * box.w;
  const py = (gk: number) =>
    box.y + box.h - ((gk - LANDSCAPE.gK[0]) / (LANDSCAPE.gK[1] - LANDSCAPE.gK[0])) * box.h;
  return { ctx: f.ctx, P, L: f.look, R, w, t: f.t, box, px, py };
}

function drawMap(S: Scene) {
  const { ctx, P, L, box, px, py } = S;
  const a = P.map;
  if (a < 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(imageFor(L), box.x, box.y, box.w, box.h);
  // contours at whole powers of ten
  ctx.strokeStyle = rgba(L.ink, 0.16);
  ctx.lineWidth = 1;
  const gx = (c: number) => box.x + (c / (N - 1)) * box.w;
  const gy = (r: number) => box.y + box.h - (r / (N - 1)) * box.h;
  ctx.beginPath();
  for (const { segs } of CONTOURS)
    for (const [c0, r0, c1, r1] of segs) {
      ctx.moveTo(gx(c0), gy(r0));
      ctx.lineTo(gx(c1), gy(r1));
    }
  ctx.stroke();
  ctx.strokeStyle = rgba(L.ink, 0.5);
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.restore();
  for (const g of [0.05, 0.1, 0.15, 0.2])
    words(ctx, g.toFixed(2), px(g), box.y + box.h + 12, L.ink, 0.6 * a, 10.5, 'center');
  for (const g of [0.02, 0.04, 0.06])
    words(ctx, g.toFixed(2), box.x - 6, py(g), L.ink, 0.6 * a, 10.5, 'right');
  mathWords(
    ctx,
    'sodium conductance, g_{Na} (S/cm²)',
    box.x + box.w / 2,
    box.y + box.h + 30,
    L.ink,
    0.75 * a,
    12,
    'center'
  );
  mathWords(ctx, 'potassium, g_K', box.x, box.y - 13, L.ink, 0.75 * a, 12, 'left');
  // the values behind the recording, and the start
  const [tx, ty] = [px(TRUTH[0]), py(TRUTH[1])];
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(L.ink, 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(tx, ty, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tx - 11, ty);
  ctx.lineTo(tx + 11, ty);
  ctx.moveTo(tx, ty - 11);
  ctx.lineTo(tx, ty + 11);
  ctx.stroke();
  ctx.fillStyle = rgba(L.ink, 0.9);
  ctx.beginPath();
  ctx.arc(px(START[0]), py(START[1]), 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  words(
    ctx,
    "the recording's values",
    tx + 14,
    ty - 14,
    L.ink,
    0.9 * a,
    12.5,
    'left',
    L.page,
    'italic 600'
  );
  words(
    ctx,
    'start',
    px(START[0]) + 9,
    py(START[1]) + 12,
    L.ink,
    0.9 * a,
    12.5,
    'left',
    L.page,
    'italic 600'
  );
}

/** Text to the right of the plot (or under it, on a narrow screen). */
function aside(S: Scene, lines: { text: string; colour?: RGB; strong?: boolean }[], alpha: number) {
  const { ctx, L, w, box } = S;
  const wide = w >= 640;
  // beside the plot; or, on a narrow screen, under it, the first three lines only
  const [x, y0] = wide ? [box.x + box.w + 22, box.y + 18] : [12, box.y + box.h + 50];
  (wide ? lines : lines.slice(0, 3)).forEach((l, k) =>
    words(
      ctx,
      l.text,
      x,
      y0 + k * 18,
      l.colour ?? L.ink,
      alpha,
      12.5,
      'left',
      L.page,
      l.strong ? 'italic 600' : 'italic'
    )
  );
}

const GEN_AT = 700;
const GEN_EACH = 380;
function drawSearch(S: Scene) {
  const { ctx, P, L, t, px, py } = S;
  const a = Math.max(P.search, 0.35 * P.ghost);
  if (a < 0.01) return;
  const upTo =
    P.search > 0.5
      ? Math.max(0, Math.min(SEARCH.length - 1, Math.floor((t - GEN_AT) / GEN_EACH)))
      : SEARCH.length - 1;
  const shown = P.search > 0.5 ? clamp01((t - GEN_AT + GEN_EACH) / GEN_EACH) : 1;
  ctx.save();
  for (let g = 0; g <= upTo; g++) {
    const gen = SEARCH[g];
    const now = g === upTo && P.search > 0.5;
    const alpha = a * (P.ghost > 0.5 && P.search < 0.5 ? 0.22 : now ? shown : 0.16);
    gen.points.forEach(([gna, gk], k) => {
      const kept = gen.kept.includes(k);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = rgba(P.search > 0.5 ? SEARCHER : mix(L.page, L.ink, 0.6), 1);
      ctx.beginPath();
      ctx.arc(px(gna), py(gk), now ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
      if (now && kept) {
        ctx.strokeStyle = rgba(SEARCHER, 1);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(px(gna), py(gk), 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }
  ctx.restore();
  if (P.search > 0.05) {
    const best = Math.min(...SEARCH.slice(0, upTo + 1).flatMap((s) => s.losses));
    aside(
      S,
      [
        { text: `generation ${upTo + 1} of ${SEARCH.length}`, colour: SEARCHER, strong: true },
        { text: `${(upTo + 1) * 10} simulations so far` },
        { text: `closest yet: ${best < 0.01 ? best.toFixed(4) : best.toFixed(2)} mV²` },
        { text: '' },
        { text: 'each generation: ten candidates,' },
        { text: 'the best three kept (ringed)' },
        { text: 'and varied for the next' },
      ],
      P.search
    );
  } else if (P.ghost > 0.05)
    words(
      ctx,
      `the search's ${SEARCH.length * 10} candidates, for comparison`,
      S.box.x + 8,
      S.box.y + S.box.h - 12,
      L.ink,
      0.75 * P.ghost,
      12,
      'left',
      L.page
    );
}

/** Downhill everywhere: the landscape's slope, as arrows on a grid; and, from the start, the gradient. */
function drawField(S: Scene) {
  const { ctx, P, L, t, box, px, py } = S;
  const a = P.field;
  if (a < 0.01) return;
  const appear = P.descent > 0.5 ? 1 : phase(t, 300, 900);
  const [cols, rows] = [11, 8];
  const slope = (gna: number, gk: number) => {
    const dx = (LANDSCAPE.gNa[1] - LANDSCAPE.gNa[0]) / 200;
    const dy = (LANDSCAPE.gK[1] - LANDSCAPE.gK[0]) / 200;
    // per fraction of the plot's width and height, so the arrows point downhill as drawn
    const gx = ((logLossAt(gna + dx, gk) - logLossAt(gna - dx, gk)) / 2) * 200;
    const gy = ((logLossAt(gna, gk + dy) - logLossAt(gna, gk - dy)) / 2) * 200;
    return [-gx * box.w, gy * box.h];
  };
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const gna = LANDSCAPE.gNa[0] + ((i + 0.5) / cols) * (LANDSCAPE.gNa[1] - LANDSCAPE.gNa[0]);
      const gk = LANDSCAPE.gK[0] + ((j + 0.5) / rows) * (LANDSCAPE.gK[1] - LANDSCAPE.gK[0]);
      const [dx, dy] = slope(gna, gk);
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;
      const steep = clamp01(len / (box.w * 2));
      const L2 = 13;
      const [x, y] = [px(gna), py(gk)];
      arrow(
        ctx,
        x - (dx / len) * L2 * 0.5,
        y - (dy / len) * L2 * 0.5,
        x + (dx / len) * L2 * 0.5,
        y + (dy / len) * L2 * 0.5,
        L.ink,
        a * appear * (0.25 + 0.5 * steep),
        1.3,
        5
      );
    }
  if (P.descent < 0.5) {
    const [dx, dy] = slope(START[0], START[1]);
    const len = Math.hypot(dx, dy) || 1;
    const [x, y] = [px(START[0]), py(START[1])];
    const k = phase(t, 1300, 800);
    arrow(ctx, x, y, x + (dx / len) * 70 * k, y + (dy / len) * 70 * k, DESCENDER, a * k, 3, 11);
    aside(
      S,
      [
        { text: 'the gradient: at any point, which way', colour: DESCENDER, strong: true },
        { text: 'is downhill, and how steeply', colour: DESCENDER, strong: true },
        { text: '' },
        { text: 'one simulation, then one pass back' },
        { text: 'through it, gives the slope for every' },
        { text: 'parameter at once' },
      ],
      a * phase(t, 1600, 700)
    );
  }
}

const DESCENT_AT = 600;
const DESCENT_FOR = 4800;
function drawDescent(S: Scene) {
  const { ctx, P, t, px, py } = S;
  const a = P.descent;
  if (a < 0.01) return;
  const k = Math.min(
    DESCENT.length - 1,
    Math.floor(clamp01((t - DESCENT_AT) / DESCENT_FOR) * (DESCENT.length - 1))
  );
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(DESCENDER, 1);
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  DESCENT.slice(0, k + 1).forEach(([gna, gk], j) =>
    j ? ctx.lineTo(px(gna), py(gk)) : ctx.moveTo(px(gna), py(gk))
  );
  ctx.stroke();
  ctx.fillStyle = rgba(DESCENDER, 1);
  DESCENT.slice(0, k + 1).forEach(([gna, gk], j) => {
    if (j % 5) return;
    ctx.beginPath();
    ctx.arc(px(gna), py(gk), 2.6, 0, Math.PI * 2);
    ctx.fill();
  });
  const [gna, gk] = DESCENT[k];
  ctx.beginPath();
  ctx.arc(px(gna), py(gk), 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const loss = DESCENT[k][2];
  aside(
    S,
    [
      {
        text: `gradient descent: step ${k} of ${DESCENT.length - 1}`,
        colour: DESCENDER,
        strong: true,
      },
      { text: `gNa ${gna.toFixed(4)}, gK ${gk.toFixed(4)}` },
      { text: `loss ${loss < 0.01 ? loss.toExponential(1) : loss.toFixed(2)} mV²` },
      { text: '' },
      { text: 'each step: a simulation, a pass back' },
      { text: 'through it, and a step downhill' },
    ],
    a
  );
}

const LABELS: Record<FitStep, string> = {
  search:
    "A landscape over the soma's sodium and potassium conductances, deep where a model's spike matches the recording; an evolutionary search moves across it generation by generation, ten candidates at a time, towards the recording's values.",
  gradient:
    'The same landscape with arrows pointing downhill everywhere; from the wrong start, the gradient points towards the valley.',
  descent:
    "Gradient descent, step by step, from the wrong start down into the valley and along it to the recording's values; the search's candidates are shown faintly for comparison.",
};

export default function FitFigure({ step, back = false }: { step: FitStep; back?: boolean }) {
  return (
    <StepCanvas
      step={step}
      back={back}
      label={LABELS[step]}
      done={DESCENT_AT + DESCENT_FOR + 2000}
      pose={(st) => poseFor(st)}
      draw={(f: Frame<FitStep>, P: Pose) => {
        const S = sceneOf(f, P);
        drawMap(S);
        drawSearch(S);
        drawField(S);
        drawDescent(S);
      }}
    />
  );
}
