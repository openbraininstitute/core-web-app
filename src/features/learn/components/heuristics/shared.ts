/**
 * What the heuristic figures share: colour mixing, easing, a clock, neuron
 * drawing and paths, and a brain drawn from the side.
 */

import { useRef } from 'react';

import type { Fit, Morphology, SegKind } from '@/features/learn/lib/basics/morphologies';

export type RGB = [number, number, number];
export type Pt = { x: number; y: number };

export const mix = (a: RGB, b: RGB, k: number): RGB =>
  [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k)) as RGB;
export const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r},${g},${b},${a})`;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
/** 0 → 1, eased, over a phase that starts `at` ms in and lasts `dur` ms. */
export const phase = (t: number, at: number, dur: number) => smooth((t - at) / dur);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const SERIF = "Georgia, 'Times New Roman', serif";
export const GREY: RGB = [148, 163, 184];
export const SEG_RGB: Record<SegKind, RGB> = {
  apical: [125, 211, 252],
  basal: [196, 181, 253],
  axon: [251, 191, 36],
  ais: [251, 146, 60],
};

/** Every figure is this size, so switching between them never moves the slide. */
export const FIGURE_CLASS = 'h-[340px] w-full rounded-xl border border-slate-800';

/** Milliseconds since the figure first drew — or Infinity, the finished picture, with reduced motion. */
export function useClock() {
  const start = useRef(0);
  return (now: number) => {
    if (!start.current) start.current = now;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Infinity;
    return now - start.current;
  };
}

/**
 * The slides the heuristic figures run across, one figure carrying on from each
 * to the next, in the order they come: a brain; closer in, the cells it is made
 * of; one of them, a neuron, whole; ten kinds of neuron side by side; the ten in
 * their places in the brain; closer in, one region's own kinds of neuron, each
 * at its depth in its cortex; the ten signalling to each other; the brain in a mouse; two of them changing as it
 * learns; the mouse going to the cheese it learned of; the diseases of the brain,
 * named; back to the one neuron, whole;
 * its dendrites, its soma and its axon, each picked out — inputs in, gathered,
 * and passed on; the neuron straightened out into a dendrogram; closer in, a
 * piece of one dendrite, a slide at a time — its membrane; the charge either
 * side of it, and the voltage that makes at each place along it; a synapse onto
 * it letting charge in, the voltage there rising; and that charge, and the
 * voltage with it, spreading along the dendrite; and, on the dendrogram, the
 * signals it takes in and passes on.
 */
export const STAGES = [
  'brain',
  'cells',
  'neurons',
  'gallery',
  'atlas',
  'area',
  'talk',
  'mouse',
  'learn',
  'seek',
  'disease',
  'whole',
  'dendrites',
  'soma',
  'axon',
  'dendrogram',
  'closer',
  'lipids',
  'membrane',
  'charges',
  'imbalance',
  'voltage',
  'synapse',
  'spread',
  'signals',
] as const;
export type Stage = (typeof STAGES)[number];
export const isStage = (w: unknown): w is Stage => STAGES.includes(w as Stage);
/** The slides the neuron cannot be switched on: the first, with no one neuron, and those close in on a piece of one. */
export const FIXED: readonly Stage[] = [
  'brain',
  'closer',
  'lipids',
  'membrane',
  'charges',
  'imbalance',
  'voltage',
  'synapse',
  'spread',
];

/** Time for animations that must keep moving: elapsed ms, or 0 where `t` is the finished picture. */
export const moving = (t: number) => (Number.isFinite(t) ? t : 0);

/** A fit placing a neuron's soma at (x, y), drawn at scale `s`. */
export const fitAt = (x: number, y: number, s: number): Fit => ({
  s,
  ox: x,
  oy: y,
  tx: (u) => x + u * s,
  ty: (v) => y + v * s,
});

/** A point a fraction `p` of the way along a polyline, by vertex. */
export function along(pts: Pt[], p: number): Pt {
  const n = pts.length - 1;
  const seg = Math.max(0, Math.min(n - 1, Math.floor(p * n)));
  const local = Math.min(1, p * n - seg);
  return {
    x: pts[seg].x + (pts[seg + 1].x - pts[seg].x) * local,
    y: pts[seg].y + (pts[seg + 1].y - pts[seg].y) * local,
  };
}

export function pathLength(pts: Pt[]) {
  let d = 0;
  for (let i = 1; i < pts.length; i++)
    d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return d;
}

/** The point `d` along a polyline, by distance. */
export function pointAtDist(pts: Pt[], distance: number): Pt {
  let d = distance;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (d <= seg) {
      const k = seg > 0 ? d / seg : 0;
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k,
      };
    }
    d -= seg;
  }
  return pts[pts.length - 1];
}

export const mapPts = (pts: Pt[], f: Fit): Pt[] => pts.map((p) => ({ x: f.tx(p.x), y: f.ty(p.y) }));

/** A cubic Bézier from `a` to `d`, as `n` + 1 points. */
export function cubicPts(a: Pt, b: Pt, c: Pt, d: Pt, n = 24): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return {
      x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
      y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
    };
  });
}

/** The first `k` (0 to 1) of a polyline, by distance. */
export function partOf(pts: Pt[], k: number): Pt[] {
  if (k >= 1) return pts;
  const target = pathLength(pts) * Math.max(0, k);
  const out: Pt[] = [pts[0]];
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (d + seg >= target) {
      const r = seg > 0 ? (target - d) / seg : 0;
      out.push({
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * r,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * r,
      });
      return out;
    }
    d += seg;
    out.push(pts[i]);
  }
  return out;
}

export function strokePts(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

/**
 * Every dendrite tip's path back to the soma, along the branches it grew
 * from — tip first. Branches start exactly where their parent ends, which is
 * how a tip finds its way home.
 */
export function tipPaths(m: Morphology): Pt[][] {
  const key = (x: number, y: number) => `${x.toFixed(3)},${y.toFixed(3)}`;
  const byEnd = new Map<string, Morphology['segs'][number]>();
  for (const s of m.segs)
    if (s.kind === 'apical' || s.kind === 'basal') byEnd.set(key(s.x2, s.y2), s);
  return m.tips.map((tip) => {
    const pts: Pt[] = [tip];
    let cur = byEnd.get(key(tip.x, tip.y));
    for (let guard = 0; cur && guard < 64; guard++) {
      pts.push({ x: cur.x1, y: cur.y1 });
      cur = byEnd.get(key(cur.x1, cur.y1));
    }
    pts.push({ x: 0, y: 0 });
    return pts;
  });
}

/** Stroke a neuron's branches; `color` picks each segment's colour, and widths follow its own. */
export function strokeNeuron(
  ctx: CanvasRenderingContext2D,
  m: Morphology,
  f: Fit,
  color: (kind: SegKind) => string,
  width = 0.5
) {
  ctx.lineCap = 'round';
  for (const s of m.segs) {
    ctx.strokeStyle = color(s.kind);
    ctx.lineWidth = Math.max(0.6, s.w * f.s * width);
    ctx.beginPath();
    ctx.moveTo(f.tx(s.x1), f.ty(s.y1));
    ctx.lineTo(f.tx(s.x2), f.ty(s.y2));
    ctx.stroke();
  }
}

export function fillSoma(
  ctx: CanvasRenderingContext2D,
  m: Morphology,
  f: Fit,
  fill: string,
  scale = 0.8
) {
  ctx.beginPath();
  ctx.arc(f.tx(0), f.ty(0), Math.max(2.5, m.soma.r * f.s * scale), 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** A soft glowing dot. */
export function glowDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  glow: string,
  blur = 12
) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = blur;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

/** A caption line along the bottom of a figure. */
export function caption(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  font: string
) {
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** How tall the brain is for its width. */
export const BRAIN_ASPECT = 0.72;

type P2 = [number, number];

/** A brain from the side, facing left, in a frame 1 wide: a start point and cubic segments. */
const OUTLINE_START: P2 = [0.1, 0.42];
const OUTLINE: [P2, P2, P2][] = [
  [
    [0.02, 0.3],
    [0.06, 0.1],
    [0.22, 0.06],
  ],
  [
    [0.36, 0.0],
    [0.58, 0.0],
    [0.72, 0.05],
  ],
  [
    [0.88, 0.1],
    [0.98, 0.22],
    [0.96, 0.36],
  ],
  [
    [0.95, 0.44],
    [0.9, 0.48],
    [0.86, 0.49],
  ],
  [
    [0.92, 0.55],
    [0.88, 0.66],
    [0.76, 0.66],
  ],
  [
    [0.7, 0.66],
    [0.66, 0.62],
    [0.64, 0.6],
  ],
  [
    [0.63, 0.66],
    [0.62, 0.72],
    [0.58, 0.72],
  ],
  [
    [0.55, 0.72],
    [0.55, 0.64],
    [0.54, 0.58],
  ],
  [
    [0.46, 0.6],
    [0.34, 0.6],
    [0.28, 0.54],
  ],
  [
    [0.24, 0.5],
    [0.2, 0.44],
    [0.18, 0.44],
  ],
  [
    [0.14, 0.46],
    [0.11, 0.45],
    [0.1, 0.42],
  ],
];

/** Its main folds, in the same frame: each a cubic from start to end. */
const FOLDS: [P2, P2, P2, P2][] = [
  [
    [0.22, 0.47],
    [0.32, 0.42],
    [0.42, 0.38],
    [0.56, 0.35],
  ], // lateral fissure
  [
    [0.5, 0.02],
    [0.47, 0.12],
    [0.44, 0.22],
    [0.43, 0.33],
  ], // central sulcus
  [
    [0.12, 0.22],
    [0.18, 0.17],
    [0.24, 0.27],
    [0.32, 0.2],
  ],
  [
    [0.1, 0.33],
    [0.18, 0.29],
    [0.26, 0.36],
    [0.36, 0.3],
  ],
  [
    [0.24, 0.09],
    [0.28, 0.15],
    [0.34, 0.1],
    [0.38, 0.16],
  ],
  [
    [0.56, 0.08],
    [0.6, 0.16],
    [0.66, 0.1],
    [0.72, 0.18],
  ],
  [
    [0.58, 0.25],
    [0.66, 0.22],
    [0.7, 0.3],
    [0.8, 0.26],
  ],
  [
    [0.84, 0.16],
    [0.88, 0.24],
    [0.84, 0.3],
    [0.9, 0.38],
  ],
  [
    [0.6, 0.4],
    [0.66, 0.36],
    [0.72, 0.44],
    [0.82, 0.4],
  ],
  [
    [0.3, 0.52],
    [0.38, 0.47],
    [0.46, 0.53],
    [0.54, 0.47],
  ], // temporal
  [
    [0.68, 0.57],
    [0.74, 0.54],
    [0.82, 0.54],
    [0.88, 0.57],
  ], // cerebellum
  [
    [0.67, 0.61],
    [0.74, 0.58],
    [0.82, 0.59],
    [0.87, 0.62],
  ],
];

/** The brain's outline, `w` wide with its top-left corner at (x, y). */
export function brainOutline(x: number, y: number, w: number) {
  const p = new Path2D();
  p.moveTo(x + OUTLINE_START[0] * w, y + OUTLINE_START[1] * w);
  for (const [c1, c2, e] of OUTLINE) {
    p.bezierCurveTo(
      x + c1[0] * w,
      y + c1[1] * w,
      x + c2[0] * w,
      y + c2[1] * w,
      x + e[0] * w,
      y + e[1] * w
    );
  }
  p.closePath();
  return p;
}

let outlinePolygon: P2[] | null = null;

/** The brain's outline as points, in its own frame (1 wide). */
export function brainEdge(): P2[] {
  if (!outlinePolygon) {
    const pts: P2[] = [OUTLINE_START];
    let a = OUTLINE_START;
    for (const [c1, c2, e] of OUTLINE) {
      for (let i = 1; i <= 12; i++) {
        const t = i / 12;
        const m = 1 - t;
        pts.push([
          m * m * m * a[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * e[0],
          m * m * m * a[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * e[1],
        ]);
      }
      a = e;
    }
    outlinePolygon = pts;
  }
  return outlinePolygon;
}

/**
 * Whether (u, v), in the brain's own frame (1 wide), is inside its outline.
 * Plain arithmetic rather than a canvas, so it also works while rendering on
 * the server.
 */
export function insideBrain(u: number, v: number) {
  let inside = false;
  const p = brainEdge();
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if (
      p[i][1] > v !== p[j][1] > v &&
      u < ((p[j][0] - p[i][0]) * (v - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** The brain's folds, in the same place as `brainOutline(x, y, w)`. */
export function brainFolds(x: number, y: number, w: number) {
  const p = new Path2D();
  for (const [s, c1, c2, e] of FOLDS) {
    p.moveTo(x + s[0] * w, y + s[1] * w);
    p.bezierCurveTo(
      x + c1[0] * w,
      y + c1[1] * w,
      x + c2[0] * w,
      y + c2[1] * w,
      x + e[0] * w,
      y + e[1] * w
    );
  }
  return p;
}
