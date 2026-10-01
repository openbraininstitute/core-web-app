/**
 * How far segments are from each other and from a point, for whoever asks what is near what (classify.ts, kin.ts,
 * untangle.ts). A segment is given by where its ends are: the three numbers at A[a] and the three at B[b], so that it
 * does not matter how the caller has packed them. Also the few things done alike to polylines of x, y, z, r points,
 * and the cell lists that find what is near what in the first place.
 */

/** Where two things come closest: their distance, and how far along each segment that is, from 0 at its start to 1 at its end. */
export interface Closest {
  d: number;
  s: number;
  t: number;
}

/** Below this a segment's squared length counts as none, and it is a point. */
const NO_LENGTH = 1e-18;

const clamp = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** The closest points of two segments (Ericson, Real-Time Collision Detection, 5.1.9): `out.s` on the first, `out.t` on the second. */
export function closestOnSegments(
  A1: ArrayLike<number>,
  a1: number,
  B1: ArrayLike<number>,
  b1: number,
  A2: ArrayLike<number>,
  a2: number,
  B2: ArrayLike<number>,
  b2: number,
  out: Closest
): void {
  const p1x = A1[a1],
    p1y = A1[a1 + 1],
    p1z = A1[a1 + 2];
  const p2x = A2[a2],
    p2y = A2[a2 + 1],
    p2z = A2[a2 + 2];
  const d1x = B1[b1] - p1x,
    d1y = B1[b1 + 1] - p1y,
    d1z = B1[b1 + 2] - p1z;
  const d2x = B2[b2] - p2x,
    d2y = B2[b2 + 1] - p2y,
    d2z = B2[b2 + 2] - p2z;
  const rx = p1x - p2x,
    ry = p1y - p2y,
    rz = p1z - p2z;
  const a = d1x * d1x + d1y * d1y + d1z * d1z,
    e = d2x * d2x + d2y * d2y + d2z * d2z;
  const f = d2x * rx + d2y * ry + d2z * rz;
  let s = 0,
    t = 0;
  if (a > NO_LENGTH || e > NO_LENGTH) {
    if (a <= NO_LENGTH) t = clamp(f / e);
    else {
      const c = d1x * rx + d1y * ry + d1z * rz;
      if (e <= NO_LENGTH) s = clamp(-c / a);
      else {
        const b = d1x * d2x + d1y * d2y + d1z * d2z;
        const den = a * e - b * b;
        s = den > NO_LENGTH ? clamp((b * f - c * e) / den) : 0;
        t = (b * s + f) / e;
        if (t < 0) {
          t = 0;
          s = clamp(-c / a);
        } else if (t > 1) {
          t = 1;
          s = clamp((b - c) / a);
        }
      }
    }
  }
  out.s = s;
  out.t = t;
  out.d = Math.hypot(rx + d1x * s - d2x * t, ry + d1y * s - d2y * t, rz + d1z * s - d2z * t);
}

/**
 * The point of a segment that is closest to x, y, z, of those between the shares `lo` and `hi` of the way along it:
 * `out.s` and the distance `out.d`, with `out.t` zero.
 */
export function closestOnSegment(
  x: number,
  y: number,
  z: number,
  A: ArrayLike<number>,
  a: number,
  B: ArrayLike<number>,
  b: number,
  out: Closest,
  lo = 0,
  hi = 1
): void {
  const abx = B[b] - A[a],
    aby = B[b + 1] - A[a + 1],
    abz = B[b + 2] - A[a + 2];
  const dx = x - A[a],
    dy = y - A[a + 1],
    dz = z - A[a + 2];
  const len2 = abx * abx + aby * aby + abz * abz;
  let s = len2 > NO_LENGTH ? (dx * abx + dy * aby + dz * abz) / len2 : 0;
  s = s < lo ? lo : s > hi ? hi : s;
  out.s = s;
  out.t = 0;
  out.d = Math.hypot(dx - abx * s, dy - aby * s, dz - abz * s);
}

/** Arc length at every point of a polyline of x, y, z, r points. */
export function arcLengths(points: ArrayLike<number>): Float64Array {
  const n = points.length / 4;
  const arc = new Float64Array(n);
  for (let k = 1; k < n; k++) {
    const o = 4 * k;
    arc[k] =
      arc[k - 1] +
      Math.hypot(
        points[o] - points[o - 4],
        points[o + 1] - points[o - 3],
        points[o + 2] - points[o - 2]
      );
  }
  return arc;
}

/** The segment of a polyline with these arc lengths that holds arc length s: the last one at or before it, and the last segment for the end. */
export function segmentAt(arc: ArrayLike<number>, s: number): number {
  let lo = 0,
    hi = arc.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (arc[mid] <= s) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** The segments of a polyline, packed ax, ay, az, ra, bx, by, bz, rb, with the radii raised to `floor`. */
export function chainSegments(points: ArrayLike<number>, floor = -Infinity): Float64Array {
  const n = Math.max(0, points.length / 4 - 1);
  const segs = new Float64Array(8 * n);
  for (let k = 0; k < n; k++) {
    const o = 8 * k,
      q = 4 * k;
    segs[o] = points[q];
    segs[o + 1] = points[q + 1];
    segs[o + 2] = points[q + 2];
    segs[o + 3] = Math.max(points[q + 3], floor);
    segs[o + 4] = points[q + 4];
    segs[o + 5] = points[q + 5];
    segs[o + 6] = points[q + 6];
    segs[o + 7] = Math.max(points[q + 7], floor);
  }
  return segs;
}

const KEY_OFFSET = 1 << 16,
  KEY_STRIDE = 1 << 17;

/** The grid cell (i, j, k), each index within ±2¹⁶, as one exact double of 17 bits per index; `cellOfKey` undoes it. */
export function cellKey(i: number, j: number, k: number): number {
  return ((k + KEY_OFFSET) * KEY_STRIDE + (j + KEY_OFFSET)) * KEY_STRIDE + (i + KEY_OFFSET);
}

export function cellOfKey(key: number): [number, number, number] {
  return [
    (key % KEY_STRIDE) - KEY_OFFSET,
    (Math.floor(key / KEY_STRIDE) % KEY_STRIDE) - KEY_OFFSET,
    Math.floor(key / (KEY_STRIDE * KEY_STRIDE)) - KEY_OFFSET,
  ];
}

const P0 = 73856093,
  P1 = 19349663,
  P2 = 83492791;
/** What `cellHash` multiplies the indices by, for the GPU's block table (gpu-slab.ts), which hashes alike. */
export const CELL_HASH_PRIMES = [P0, P1, P2] as const;

/** A hash of the grid cell (i, j, k). */
export function cellHash(i: number, j: number, k: number): number {
  return (Math.imul(i, P0) ^ Math.imul(j, P1) ^ Math.imul(k, P2)) >>> 0;
}

/**
 * Items listed in every grid cell of their cell ranges: linked lists in typed arrays, one per hash bucket. `range`
 * holds i0, j0, k0, i1, j1, k1 per item. Cells that share a bucket only cost a few more tests; `cell` says which
 * cell an entry is for.
 */
export class CellLists {
  /** First entry of every bucket, -1 for none; `next` goes on to the following one. */
  readonly head: Int32Array;
  readonly next: Int32Array;
  /** The item and the cell (i, j, k) of every entry. */
  readonly item: Int32Array;
  readonly cell: Int32Array;
  private readonly mask: number;

  constructor(range: ArrayLike<number>, count: number) {
    let entries = 0;
    for (let c = 0; c < count; c++) {
      const r = 6 * c;
      entries +=
        (range[r + 3] - range[r] + 1) *
        (range[r + 4] - range[r + 1] + 1) *
        (range[r + 5] - range[r + 2] + 1);
    }
    let buckets = 1024;
    while (buckets < 2 * entries) buckets *= 2;
    this.mask = buckets - 1;
    this.head = new Int32Array(buckets).fill(-1);
    this.next = new Int32Array(entries);
    this.item = new Int32Array(entries);
    this.cell = new Int32Array(3 * entries);
    let e = 0;
    for (let c = 0; c < count; c++) {
      const r = 6 * c;
      for (let k = range[r + 2]; k <= range[r + 5]; k++) {
        for (let j = range[r + 1]; j <= range[r + 4]; j++) {
          for (let i = range[r]; i <= range[r + 3]; i++) {
            const b = this.bucket(i, j, k);
            this.next[e] = this.head[b];
            this.head[b] = e;
            this.item[e] = c;
            this.cell[3 * e] = i;
            this.cell[3 * e + 1] = j;
            this.cell[3 * e + 2] = k;
            e++;
          }
        }
      }
    }
  }

  get buckets(): number {
    return this.mask + 1;
  }

  bucket(i: number, j: number, k: number): number {
    return cellHash(i, j, k) & this.mask;
  }
}
