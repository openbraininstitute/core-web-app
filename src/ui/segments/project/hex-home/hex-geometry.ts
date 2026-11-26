/**
 * Pointy-top hexagons, as on the landing: circumradius r, width √3 r, height 2 r. Every cloud is laid out in a
 * fixed frame of its own (layout px) and scaled to fit its column.
 */

export const SQRT3 = Math.sqrt(3);
/** Apothem over circumradius. */
export const APO = SQRT3 / 2;

/** The hexagon's outline as a CSS clip-path, its box √3 r × 2 r. */
export const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

/** Axial (q, r) on a grid of circumradius R to the centre's position. */
export function axial(q: number, r: number, R: number): { x: number; y: number } {
  return { x: SQRT3 * R * (q + r / 2), y: 1.5 * R * r };
}

/** The six neighbours of an axial cell, east first, then anticlockwise. */
export const RING: Array<[number, number]> = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export function hexDistance(a: [number, number], b: [number, number]): number {
  const dq = a[0] - b[0];
  const dr = a[1] - b[1];
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

const NORMALS = [0, 60, 120].map((deg) => [
  Math.cos((deg * Math.PI) / 180),
  Math.sin((deg * Math.PI) / 180),
]);

export interface IPoint {
  x: number;
  y: number;
}

export interface IHexBox extends IPoint {
  r: number;
}

/** Whether two same-way-up hexagons stay at least `gap` apart: along one edge normal, past both apothems. */
export function apart(a: IHexBox, b: IHexBox, gap = 0): boolean {
  const sep = Math.max(...NORMALS.map(([nx, ny]) => Math.abs((a.x - b.x) * nx + (a.y - b.y) * ny)));
  return sep >= (a.r + b.r) * APO + gap;
}

/** mulberry32: the same seed lays the same cloud out on every render. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A white tile of the cloud around the picked ones: on the floor, raised a little, or a small stray. */
export interface IFiller extends IHexBox {
  key: string;
  /** 0 = flat on the floor, 1 = raised as high as a picked tile. */
  lift: number;
  drift: boolean;
}

export interface ICloudOptions {
  seed: number;
  /** The frame the cloud is laid out in. */
  width: number;
  height: number;
  /** The honeycomb's cell radius. */
  R: number;
  /** Where the cloud is thickest, and how far it reaches (an ellipse, in layout px). */
  centre: { x: number; y: number };
  reach: { x: number; y: number };
  /** The tiles with something on them: no white tile overlaps one. */
  avoid: IHexBox[];
  /** The gap kept round the avoided tiles. */
  gap?: number;
  /** Share of the honeycomb's cells kept near the centre; it thins out towards the reach. */
  density?: number;
  /** Small tiles scattered off the grid at the cloud's edge. */
  strays?: number;
}

/**
 * A honeycomb of white tiles, thick in the middle and breaking up towards its edge, kept clear of the tiles that
 * carry something, with a few small strays beyond it: the landing's field, as DOM tiles.
 */
export function cloudFillers({
  seed,
  width,
  height,
  R,
  centre,
  reach,
  avoid,
  gap = 6,
  density = 0.85,
  strays = 8,
}: ICloudOptions): IFiller[] {
  const random = seeded(seed);
  const out: IFiller[] = [];
  const colW = SQRT3 * R;
  const rowH = 1.5 * R;
  const r = R * 0.94;
  const inFrame = (x: number, y: number, rr: number) =>
    x - rr * APO >= 0 && x + rr * APO <= width && y - rr >= 0 && y + rr <= height;

  for (let row = 0; row * rowH <= height + rowH; row++) {
    for (let col = -1; col * colW <= width + colW; col++) {
      const x = col * colW + (row % 2 ? colW / 2 : 0);
      const y = row * rowH;
      if (!inFrame(x, y, r)) continue;
      const d = Math.hypot((x - centre.x) / reach.x, (y - centre.y) / reach.y);
      // thick inside, thinning past half the reach, none beyond it
      const keep = density * Math.max(0, Math.min(1, (1.05 - d) / 0.55));
      if (random() > keep) continue;
      const box = { x, y, r };
      if (!avoid.every((a) => apart(box, a, gap))) continue;
      const raised = random();
      out.push({
        key: `f${row}-${col}`,
        ...box,
        // most lie on the floor; some stand out of it a little, and those wander
        lift: raised < 0.55 ? 0.12 : raised < 0.85 ? 0.35 : 0.6,
        drift: raised >= 0.55,
      });
    }
  }

  // strays: small tiles off the grid round the edge, each where it touches nothing
  let tries = 0;
  let made = 0;
  while (made < strays && tries < strays * 40) {
    tries++;
    const angle = random() * 2 * Math.PI;
    const d = 0.75 + random() * 0.4;
    const x = centre.x + Math.cos(angle) * reach.x * d;
    const y = centre.y + Math.sin(angle) * reach.y * d;
    const rr = R * (0.38 + random() * 0.3);
    if (!inFrame(x, y, rr)) continue;
    const box = { x, y, r: rr };
    if (!avoid.every((a) => apart(box, a, gap)) || !out.every((f) => apart(box, f, 3))) continue;
    out.push({ key: `s${made}`, ...box, lift: 0.45 + random() * 0.3, drift: true });
    made++;
  }
  return out;
}

/** A tile's wander: its own pace on each axis and where in it it starts, from its place in the frame. */
export function driftOf(x: number, y: number, r: number) {
  const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  const k = Math.abs(Math.sin(x * 39.3468 + y * 11.135) * 24634.6345) % 1;
  const amount = Math.min(7, 0.05 * r);
  return {
    dx: amount * (0.6 + 0.4 * h),
    dy: amount * (0.6 + 0.4 * k),
    duration: 9 + 6 * h,
    delay: -15 * k,
  };
}
