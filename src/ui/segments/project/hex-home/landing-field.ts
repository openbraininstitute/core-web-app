import { APO } from '@/ui/segments/project/hex-home/hex-geometry';

import type { IHexBox, IPoint } from '@/ui/segments/project/hex-home/hex-geometry';

/**
 * The website landing's field (landing/landing-tile-renderer.js), for the platform's home to lay out as DOM tiles:
 * a big picture tile with medium ones straight beside it on its sides, white tiles grown up to them with a fade of
 * lower, smaller ones and a few tiny ones round them, over a honeycomb floor. Its numbers are the landing's, in its
 * 1920 px layout, scaled by `k` to the home's.
 */
const R = 55;
const SCALE_PER_H = 0.7;
const FLOOR_R0 = 0.72 * R;
const FLOOR_H: [number, number] = [0.3, 0.6];
// a little sparser than the landing's 0.62 (the user asked)
const FLOOR_FILL = 0.46;
/** How far in from the field's edges the floor thins out over (home px). */
const EDGE_THIN = 180;
const BIG_R = 174;
const MEDIUM_R = 97;
const EDGE_GAP = 6;
const SMALL_COUNT = 8;
const SMALL_R: [number, number] = [65, 84];
const SMALL_GAP = 6;
const SMALL_ON_BIG = 0.2;
const FADE_RINGS: Array<[number, number]> = [
  [58, 63],
  [55.8, 57.5],
];
const FADE_PER = 2;
const FADE_CLEAR = 30;
const TINY_COUNT = 7;
const TINY_R0: [number, number] = [22, 30];
const TINY_H: [number, number] = [0.15, 0.4];
/** Touching edges overlap by at least this much of the shorter edge. */
const FACE_MIN = 0.6;
/** The sides of the big tile the medium ones go on: all but its right, which the one on show has (heroBeside). */
const SIDES = [1, 2, 3, 4, 5];

/** A white tile of the field: its place and size, and how high it stands (the landing's h). */
export interface IFieldTile extends IHexBox {
  key: string;
  h: number;
  /** The floor holds still; the white tiles that stand out of it wander. */
  drift: boolean;
}

export interface IRect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** mulberry32, as the landing's, so a seed lays the same field out. */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const toRad = (a: number) => (a * Math.PI) / 180;
const DIRS = [0, 60, 120, 180, 240, 300].map((a) => [Math.cos(toRad(a)), Math.sin(toRad(a))]);
const NORMALS = [0, 60, 120].map((a) => [Math.cos(toRad(a)), Math.sin(toRad(a))]);

// Pointy-top hexagons all alike, so their straight edges are parallel: two are apart when, along one of the three
// edge normals, their centres are further apart than their apothems together.
const fitRadius = (p: IPoint, t: IHexBox, gap: number) => {
  const sep = Math.max(...NORMALS.map(([nx, ny]) => Math.abs((p.x - t.x) * nx + (p.y - t.y) * ny)));
  return (sep - t.r * APO - gap) / APO;
};
const fits = (p: IHexBox, others: IHexBox[], gap: number) =>
  others.every((o) => fitRadius(p, o, gap) >= p.r - 0.01);
// straight beside t, its facing edge `gap` from t's, slid `lat` along it
const beside = (t: IHexBox, r: number, dir: number, lat: number, gap: number): IHexBox => {
  const [nx, ny] = DIRS[dir];
  const d = (t.r + r) * APO + gap;
  return { x: t.x + nx * d - ny * lat, y: t.y + ny * d + nx * lat, r };
};
const maxLat = (r: number, t: IHexBox) => Math.max(0, (r + t.r) / 2 - FACE_MIN * Math.min(r, t.r));
const inside = (p: IHexBox, b: IRect) =>
  p.x - p.r * APO > b.x0 && p.x + p.r * APO < b.x1 && p.y - p.r > b.y0 && p.y + p.r < b.y1;
const clearOf = (p: IHexBox, rects: IRect[]) =>
  rects.every((b) => p.x + p.r < b.x0 || p.x - p.r > b.x1 || p.y + p.r < b.y0 || p.y - p.r > b.y1);

/**
 * The picture tiles: the big one at `center`, and `count - 1` medium ones each straight beside it on a side of its
 * own, slid a random amount along that edge, all apart and within `bounds`.
 */
export function fieldFeatures({
  center,
  k,
  count,
  bounds,
  random,
  below = false,
}: {
  center: IPoint;
  k: number;
  count: number;
  bounds: IRect;
  random: () => number;
  /** Those past the big one's sides go on downwards, under the cluster (the platform home's more examples). */
  below?: boolean;
}): IHexBox[] {
  const big = { ...center, r: BIG_R * k };
  const r = MEDIUM_R * k;
  const gap = EDGE_GAP * k;
  for (let attempt = 0; attempt < 400; attempt++) {
    const dirs = SIDES.slice().sort(() => random() - 0.5);
    const placed: IHexBox[] = [big];
    for (let m = 1; m < count && placed.length === m; m++) {
      for (let t = 0; t < 60; t++) {
        // a side of the big one each while there are sides; then beside a medium one, outwards from the big one
        const lower = placed.slice(1).filter((p) => p.y >= big.y - 1);
        const by =
          m - 1 < dirs.length
            ? big
            : below && lower.length
              ? lower[Math.floor(random() * lower.length)]
              : placed[1 + Math.floor(random() * (placed.length - 1))];
        // downwards (60° or 120°, y down), now and then across
        const down = [1, 2, 1, 2, 0, 3];
        const dir =
          m - 1 < dirs.length
            ? dirs[m - 1]
            : below
              ? down[Math.floor(random() * down.length)]
              : SIDES.filter((d) => DIRS[d][0] * (by.x - big.x) + DIRS[d][1] * (by.y - big.y) > 0)[
                  Math.floor(random() * 3)
                ];
        if (dir === undefined) continue;
        const p = beside(by, r, dir, (random() * 2 - 1) * maxLat(r, by), gap);
        if (inside(p, bounds) && fits(p, placed, gap)) {
          placed.push(p);
          break;
        }
      }
    }
    if (placed.length === count) return placed;
  }
  return [big, ...Array.from({ length: count - 1 }, (_, m) => beside(big, r, SIDES[m % SIDES.length], 0, gap))];
}

/**
 * The white tiles round the picture tiles, as the landing's: some grown up to them (mostly the medium ones), a fade
 * of lower, smaller ones stepping outwards, a few tiny ones for depth, and the honeycomb floor under the rest of
 * `bounds`, fewer and lower the further from the big one. None in `keepOut`, but the floor.
 */
export function fieldWhites({
  features,
  k,
  bounds,
  keepOut,
  random,
}: {
  features: IHexBox[];
  k: number;
  bounds: IRect;
  keepOut: IRect[];
  random: () => number;
}): IFieldTile[] {
  const rand = (lo: number, hi: number) => lo + random() * (hi - lo);
  const big = features[0];
  const ok = (p: IHexBox) => inside(p, bounds) && clearOf(p, keepOut);
  const outwards = (p: IPoint, from: IPoint) =>
    Math.hypot(p.x - big.x, p.y - big.y) >= Math.hypot(from.x - big.x, from.y - big.y);
  const hOf = (r: number) => (r / k / R - 1) / SCALE_PER_H;
  const gap = SMALL_GAP * k;
  const out: Array<IHexBox & { h: number }> = [];

  for (let tries = 0; tries < 600 && out.length < SMALL_COUNT; tries++) {
    const t = random() < SMALL_ON_BIG ? big : features[1 + Math.floor(random() * (features.length - 1))];
    const r = rand(...SMALL_R) * k;
    const p = beside(t, r, Math.floor(random() * 6), (random() * 2 - 1) * maxLat(r, t), gap);
    if (!ok(p) || !fits(p, features.filter((f) => f !== t), gap) || !fits(p, out, gap)) continue;
    out.push({ ...p, h: hOf(r) });
  }
  let ring = out.slice();
  for (const [r0, r1] of FADE_RINGS) {
    const next: typeof out = [];
    for (const w of ring) {
      for (let t = 0, n = 0; t < 30 && n < FADE_PER; t++) {
        const r = rand(r0, r1) * k;
        const p = beside(w, r, Math.floor(random() * 6), (random() * 2 - 1) * maxLat(r, w), gap);
        if (!outwards(p, w) || !ok(p) || !fits(p, features, FADE_CLEAR * k) || !fits(p, out, gap)) continue;
        const tile = { ...p, h: hOf(r) };
        out.push(tile);
        next.push(tile);
        n++;
      }
    }
    ring = next;
  }
  const whites = out.slice();
  for (let tries = 0, n = 0; tries < 800 && n < TINY_COUNT && whites.length; tries++) {
    const t = whites[Math.floor(random() * whites.length)];
    const h = rand(...TINY_H);
    const r = rand(...TINY_R0) * (1 + SCALE_PER_H * h) * k;
    const p = beside(t, r, Math.floor(random() * 6), (random() * 2 - 1) * maxLat(r, t), gap);
    if (!outwards(p, t) || !ok(p) || !fits(p, features, FADE_CLEAR * k) || !fits(p, out, gap)) continue;
    out.push({ ...p, h });
    n++;
  }

  // the floor: a honeycomb of the landing's cells, about two in three of them up, lower and smaller further out
  const colW = Math.sqrt(3) * R * k;
  const rowH = 1.5 * R * k;
  const reach = Math.hypot(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
  const floor: IFieldTile[] = [];
  for (let row = 0; row * rowH < bounds.y1; row++) {
    for (let col = 0; col * colW < bounds.x1 + colW; col++) {
      const x = col * colW + (row % 2 ? colW / 2 : 0);
      const y = row * rowH;
      const far = Math.min(1, Math.hypot(x - big.x, y - big.y) / reach);
      // thinning out towards the field's edges rather than stopping at them; to the right, steadily from the big one
      // all the way to the field's edge (the user asked for it to trail off to the right)
      const edge = Math.min(1, (x - bounds.x0) / EDGE_THIN, (bounds.y1 - y) / EDGE_THIN);
      const trail = x <= big.x ? 1 : Math.max(0, 1 - (x - big.x) / (bounds.x1 - big.x)) ** 1.3;
      if (random() > FLOOR_FILL * (1 - 0.5 * far) * Math.max(0, edge) * trail) continue;
      const fade = 0.2 + 0.6 * far;
      const h = rand(...FLOOR_H) * (1 - 0.4 * fade);
      const p = { x, y, r: FLOOR_R0 * (1 - 0.45 * fade) * (1 + SCALE_PER_H * h) * k };
      if (!inside(p, bounds) || !fits(p, features, gap) || !fits(p, out, gap)) continue;
      floor.push({ ...p, h, key: `floor${row}-${col}`, drift: false });
    }
  }
  return [...floor, ...out.map((p, i) => ({ ...p, key: `white${i}`, drift: true }))];
}

/**
 * A category's own field (the user asked for its content to be set into the white tiles): the landing's honeycomb
 * floor round what the category shows, none under it, the cells next to it the most often up and the highest, so
 * that the content sits in the field, fewer and lower further off, thinning out to the field's right edge.
 * `around` are rectangles (cards, the videos) and hexagons (tiles); `bounds` is where the field may lie.
 */
export function floorAround({
  around,
  k,
  bounds,
  random,
  near = 160,
}: {
  around: Array<IRect | IHexBox>;
  k: number;
  bounds: IRect;
  random: () => number;
  /** How far from the content its pull on the field reaches (layout px). */
  near?: number;
}): IFieldTile[] {
  const rand = (lo: number, hi: number) => lo + random() * (hi - lo);
  const colW = Math.sqrt(3) * R * k;
  const rowH = 1.5 * R * k;
  // how far a point is from the nearest of the content's edges (0 or less inside it)
  const awayFrom = (x: number, y: number) =>
    Math.min(
      ...around.map((b) => {
        if ('r' in b) return Math.hypot(x - b.x, y - b.y) - b.r * 0.94;
        const dx = Math.max(b.x0 - x, 0, x - b.x1);
        const dy = Math.max(b.y0 - y, 0, y - b.y1);
        return dx || dy ? Math.hypot(dx, dy) : -Math.min(x - b.x0, b.x1 - x, y - b.y0, b.y1 - y);
      })
    );
  const right = Math.max(...around.map((b) => ('r' in b ? b.x + b.r : b.x1)));
  const tiles: IFieldTile[] = [];
  for (let row = 0; row * rowH < bounds.y1 + rowH; row++) {
    for (let col = 0; col * colW < bounds.x1 + colW; col++) {
      const x = col * colW + (row % 2 ? colW / 2 : 0);
      const y = row * rowH;
      const pull = Math.exp(-Math.max(0, awayFrom(x, y)) / near);
      const edge = Math.min(1, (x - bounds.x0) / EDGE_THIN, (bounds.y1 - y) / EDGE_THIN, (y - bounds.y0) / EDGE_THIN);
      const trail = x <= right ? 1 : Math.max(0, 1 - (x - right) / Math.max(1, bounds.x1 - right)) ** 1.3;
      if (random() > FLOOR_FILL * (0.3 + 0.95 * pull) * Math.max(0, edge) * trail) continue;
      const h = rand(...FLOOR_H) * (0.55 + 0.6 * pull);
      const r = FLOOR_R0 * (0.7 + 0.45 * pull) * (1 + SCALE_PER_H * h) * k;
      // clear of the content by a hair, as the landing's tiles stop short of its pictures
      if (awayFrom(x, y) < r * 0.92 + EDGE_GAP * k) continue;
      if (!inside({ x, y, r }, bounds)) continue;
      tiles.push({ x, y, r, h, key: `around${row}-${col}`, drift: false });
    }
  }
  return tiles;
}

/**
 * The examples' tiles in one arrangement, always the same (the user asked: no new one on each visit), round a hole
 * where the words of the one on show go: the big tile against the hole's upper left, then each medium one in turn
 * at the place nearest the hole beside a tile already down (or the hole), straight beside it as the honeycomb lies.
 */
export function clusterAround({
  center,
  holeR,
  k,
  count,
  bounds,
}: {
  center: IPoint;
  holeR: number;
  k: number;
  count: number;
  bounds: IRect;
}): IHexBox[] {
  const gap = EDGE_GAP * k;
  const hole = { ...center, r: holeR };
  const big = beside(hole, BIG_R * k, 4, 0, gap);
  const placed: IHexBox[] = [big];
  const down: IHexBox[] = [hole, big];
  const r = MEDIUM_R * k;
  while (placed.length < count) {
    let best: IHexBox | null = null;
    let bestD = Infinity;
    for (const t of down) {
      // centred on the face, or slid to either end of a larger one's
      const lats = t.r > r ? [0, (t.r - r) / 2, -(t.r - r) / 2] : [0];
      for (let dir = 0; dir < 6; dir++) {
        for (const lat of lats) {
          const p = beside(t, r, dir, lat, gap);
          if (!inside(p, bounds) || !fits(p, down, gap)) continue;
          const d = Math.hypot(p.x - center.x, p.y - center.y);
          if (d < bestD - 0.01) {
            best = p;
            bestD = d;
          }
        }
      }
    }
    if (!best) break;
    placed.push(best);
    down.push(best);
  }
  return placed;
}
