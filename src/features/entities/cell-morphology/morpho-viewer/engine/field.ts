/**
 * The field of a slab at arbitrary points.
 *
 * The mesher only ever knows F on the grid samples. Three later steps need it
 * in between: moving the surface-nets vertices onto the isosurface, checking
 * that a simplified triangle still lies on it (refine.ts), and shading the
 * vertices that are left (below). `FieldSampler` evaluates
 *
 *     F(p) = max_families Σ_sections g( min_segments (dist - r) / s )
 *
 * from the slab's segment records with the arithmetic of `splatSegment` and
 * `flushSection`, together with its gradient, which is that of the family
 * with the largest sum (kin.ts has what a family is). The soma's minimum is
 * a smooth one: its parts fold by `smoothMin`, so that they meet in a round
 * rather than a crease.
 *
 * Lookup is in two levels. A coarse uniform grid lists the segments whose band
 * box touches each cell; its cell size is doubled until the lists stay
 * proportional to the segment count, so a soma with a band of tens of µm does
 * not fill millions of cells. The grid is sparse, so its memory follows the
 * segment count and not the slab's extent. The queries cluster along the
 * surface, so the fine level (cells of 8 voxels, nested in the coarse ones) is
 * built on first use by filtering the coarse list with a segment-to-cell
 * distance test. Lists keep the job's segment order, which is section order,
 * so a walk over a list sees each section's segments as one run, and each
 * family's sections as one.
 *
 * Shading
 * -------
 * -∇F is not what the vertices are shaded with. The field measures a segment
 * from the orthogonal projection onto its axis, which makes it a cone set on
 * the equators of its two end spheres rather than the cone that is tangent to
 * them. Where the radius changes with slope τ, the sphere at a skeleton point
 * stands out of the cone on its thinner side by up to r (√(1 + τ²) − 1), and
 * the gradient turns by the whole of atan τ where sphere and cone meet: twice
 * at every skeleton point, by 10° to 30° on a stem that tapers out of the
 * soma. A simplified mesh has a vertex here and there on either side of such
 * a ring, and interpolating between them turns it into blotches. `shade`
 * keeps the field's sum and every section's weight in it, and takes only the
 * direction in which a section pulls from elsewhere: from the hull of a
 * segment's end spheres, whose side is tangent to both, so that the normal
 * runs on smoothly past a skeleton point. What is left are the creases that
 * the surface has itself: on the inside of a bend, where the taper steepens,
 * and where a sphere much larger than the neck behind it folds against it.
 * Across those the normal is turned over a short way (`SHADE_HANDOVER`)
 * rather than at once: a vertex on a fold is on one side of it or the other
 * by rounding, and would be shaded accordingly.
 *
 * The soma's necks are the exception (`tangentNeck` in mesher.ts). A neck is
 * laid so that its field cone is the surface meant, the hull of the base
 * sphere and the sphere at its target; the hull of the segment's own end
 * spheres, which are smaller, is a steeper cone, of half-angle asin(tan α)
 * for the neck's α: 35° for 30°, 57° for 40°, and from 45° on one of the two
 * spheres holds the other. So the soma's segments answer with their cones,
 * the field's own direction. Nor is there a hand-over within the soma: its
 * parts pull as they fold in the field (`foldRun`), each along its own
 * surface's normal, and where they meet the surface is round.
 */

import { cellKey } from './segments';

import type { SlabJob } from './mesher';

/** Half-width of a segment's influence band: radius plus twice the blend scale, which is as far as the kernel goes. */
export function bandHalfWidth(rmax: number, beta: number, h: number): number {
  return rmax + 2 * Math.max(beta * rmax, h);
}

/**
 * Where on a segment is the centre of the sphere, of the hull of its end spheres, that is closest to a point: as a
 * share of the way from its start, unclamped. The point is d from the start, `along` is d · (b − a), `len2` the
 * segment's squared length (not zero) and `dr` = rb − ra. ±Infinity, for the end whose sphere it is, where one end
 * sphere holds the other, and the hull is the larger: len² (1 − τ²) is what is left of the hull's side.
 */
export function hullShare(
  dx: number,
  dy: number,
  dz: number,
  dr: number,
  len2: number,
  along: number
): number {
  const side2 = len2 - dr * dr;
  if (!(side2 > 1e-9 * len2)) return dr > 0 ? Infinity : -Infinity;
  const off2 = dx * dx + dy * dy + dz * dz - (along * along) / len2;
  return (along + dr * Math.sqrt((off2 > 0 ? off2 : 0) * (len2 / side2))) / len2;
}

/** Kernel g(u): 1 - u inside (clamped), (1 - u/2)² outside, 0 beyond u = 2. */
export function kernel(u: number): number {
  if (u < 0) return 1 - (u < -2 ? -2 : u);
  if (u >= 2) return 0;
  const q = 1 - 0.5 * u;
  return q * q;
}

/** g'(u). */
function kernelSlope(u: number): number {
  if (u < 0) return u < -2 ? 0 : -1;
  if (u >= 2) return 0;
  return 0.5 * u - 1;
}

/**
 * How wide the smooth minimum that joins the soma's parts is, as a fraction of the local radius. The base sphere and
 * the necks are one section, and a plain minimum over them leaves a crease wherever two cones cross, as deep as 90°
 * between a thin neck and a thick one; a mesh of the simplifier's triangles zigzags across it, and each vertex takes
 * the normal of one side or the other. Folded by `smoothMin` instead, the parts meet in a round, and where they are
 * tangent (a neck and the base sphere around the circle where it leaves it) the surface swells by a quarter of the
 * width, a tenth of the radius.
 */
const SOMA_ROUNDING = 0.4;
/** The rounding's width in normalised distance at most: where the blend is thinner than a fifth of the radius, the band would not hold it. */
const SOMA_ROUNDING_MAX = 2;

/** The width, in normalised distance, of the smooth minimum over the parts of a soma whose blend is β (`SOMA_ROUNDING`). */
export function somaRounding(beta: number): number {
  return SOMA_ROUNDING / Math.max(beta, SOMA_ROUNDING / SOMA_ROUNDING_MAX);
}

/**
 * Polynomial smooth minimum of two normalised distances over a width k: min(a, b) less k/4 (1 − |a − b| / k)² f
 * where they are within k of each other, the plain minimum elsewhere, f = `somaFade(a) somaFade(b)`. Continuous with
 * its slope, which is 1 − q/2 towards the smaller and q/2 towards the larger, q = (1 − |a − b| / k) f, and f's own.
 * Folding a section's segments through it in their order, a the running value, is what the field does for the soma
 * (`splatSegment`, the field shader, `FieldSampler`); with a single segment, or from the first, it is the segment's
 * own distance.
 */
export function smoothMin(a: number, b: number, k: number): number {
  const d = a < b ? b - a : a - b;
  const m = a < b ? a : b;
  if (!(d < k)) return m;
  const q = 1 - d / k;
  return m - 0.25 * k * q * q * somaFade(a) * somaFade(b);
}

/**
 * How much of the normalised distance before a part's band ends at 2 its say in the soma's rounding fades over. The
 * field has no value for a part beyond its band, and the fold lost the part's share there at once, though the rounding
 * reaches that far from what went before (as far as the band at a blend of 0.2): a step in the field, where the
 * surface stands off the parts, which the mesh followed in small triangles. `somaFade` of the part's distance, as its
 * band has it, takes the share down smoothly instead, and so does `somaFade` of the running value it is folded into,
 * which the first part is alone; at the surface (distances near 0) the share is whole.
 */
export const SOMA_FADE = 1;

/** The share, 1 down to 0 as the band ends, that a soma part at the normalised distance u has in the rounding. */
function somaFade(u: number): number {
  if (!(u > 2 - SOMA_FADE)) return 1;
  if (!(u < 2)) return 0;
  const s = (2 - u) / SOMA_FADE;
  return s * s * (3 - 2 * s);
}

/** d somaFade / du. */
function somaFadeSlope(u: number): number {
  if (!(u > 2 - SOMA_FADE) || !(u < 2)) return 0;
  const s = (2 - u) / SOMA_FADE;
  return (-6 * s * (1 - s)) / SOMA_FADE;
}

/** Fine cell edge in voxels: the mesher's block size. */
const FINE_CELL_VOXELS = 8;
/** Coarse lists may hold this many entries per segment (plus a constant) before the coarse cells are doubled. */
const COARSE_ENTRIES_PER_SEGMENT = 16;
const COARSE_ENTRIES_FLOOR = 1 << 16;

/** Squared gradient below which a point has no shading normal: outside every band, or where the sections' pulls cancel. */
const MIN_SHADE_GRADIENT2 = 1e-18;

/**
 * How far the hand-over from one segment of a section to the next reaches in the shading normals, in normalised
 * distance: a segment that is no more than this farther from a point than the section's nearest has a say in the
 * direction. A quarter is an eighth of a neurite's radius at a blend of 0.5.
 */
export const SHADE_HANDOVER = 0.25;
/** Numbers per segment in `FieldSampler.run`: segment, normalised distance, then the hull's distance, direction, blend scale, and the ends it is clamped at. */
const RUN = 8;

const NO_SEGMENTS = new Int32Array(0);

export class FieldSampler {
  /** F at the last sampled point. */
  value = 0;
  /** ∇F at the last sampled point. It points into the surface, F falls off outwards. */
  gx = 0;
  gy = 0;
  gz = 0;
  /** Radius (µm) of the closest section at the last sampled point, 0 if none reaches it. */
  radius = 0;
  /** Unit normal to shade with at the last point given to `shade`, out of the surface. */
  nx = 0;
  ny = 0;
  nz = 0;

  private readonly segs: Float64Array;
  private readonly segPrim: Uint32Array;
  private readonly primBeta: Float64Array;
  private readonly primFamily: Uint32Array;
  private readonly primStart: Uint32Array;
  /**
   * Per section: the width its segments fold over by `smoothMin`, for a soma of more than one part; 0 for the plain
   * minimum, and for a lone sphere, whose shading stays what it was to the last bit.
   */
  private readonly primRound: Float64Array;
  /** Per section: the segment that carries on before its first one, and the one after its last, in another section cut from the same; -1 if none. */
  private readonly before: Int32Array;
  private readonly after: Int32Array;
  private readonly h: number;

  private readonly fine: number;
  private readonly ratio: number;
  private readonly ox: number;
  private readonly oy: number;
  private readonly oz: number;
  private readonly cnx: number;
  private readonly cny: number;
  private readonly cnz: number;
  /** Row of `coarseStart` for the coarse cell (k × cny + j) × cnx + i; cells no band box touches have none. */
  private readonly coarseRows = new Map<number, number>();
  private readonly coarseStart: Uint32Array;
  private readonly coarseSegs: Int32Array;

  private readonly fineLists = new Map<number, Int32Array>();
  /** Where `fineList` filters a coarse list, as long as the longest so far. */
  private fineScratch = NO_SEGMENTS;
  private lastKey = -1;
  private lastList: Int32Array = NO_SEGMENTS;
  /** The segments of the section that `shade` is going through, `RUN` numbers each, with a place before them and one after. */
  private run = new Float64Array(RUN * 64);
  /** The direction the soma pulls in, as `foldRun` leaves it. */
  private px = 0;
  private py = 0;
  private pz = 0;

  constructor(job: SlabJob) {
    const segs = job.segs;
    this.segs = segs;
    const h = job.grid.h;
    this.h = h;
    this.primBeta = job.primBeta;
    this.primFamily = job.primFamily;
    this.primStart = job.primStart;
    this.primRound = job.primRound;
    const n = segs.length / 8;
    const segPrim = new Uint32Array(n);
    this.segPrim = segPrim;
    for (let p = 0; p + 1 < job.primStart.length; p++) {
      for (let s = job.primStart[p]; s < job.primStart[p + 1]; s++) segPrim[s] = p;
    }
    // Sections cut from one: where the end of one is the start of another, to the last bit.
    const count = job.primStart.length - 1;
    const before = new Int32Array(count).fill(-1);
    const after = new Int32Array(count).fill(-1);
    this.before = before;
    this.after = after;
    const chains = new Map<number, number[]>();
    for (let p = 0; p < count; p++) {
      if (job.primStart[p + 1] === job.primStart[p]) continue;
      const list = chains.get(job.primChain[p]);
      if (list) list.push(p);
      else chains.set(job.primChain[p], [p]);
    }
    for (const parts of chains.values()) {
      if (parts.length < 2) continue;
      for (const a of parts) {
        for (const b of parts) {
          const first = 8 * job.primStart[a],
            last = 8 * (job.primStart[b + 1] - 1) + 4;
          if (
            a === b ||
            segs[first] !== segs[last] ||
            segs[first + 1] !== segs[last + 1] ||
            segs[first + 2] !== segs[last + 2]
          )
            continue;
          before[a] = job.primStart[b + 1] - 1;
          after[b] = job.primStart[a];
        }
      }
    }

    // Band boxes, and the box of all of them.
    const box = new Float64Array(6 * n);
    let x0 = Infinity,
      y0 = Infinity,
      z0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity,
      z1 = -Infinity;
    for (let s = 0; s < n; s++) {
      const o = 8 * s;
      const w = this.bandWidth(s);
      const b = 6 * s;
      box[b] = Math.min(segs[o], segs[o + 4]) - w;
      box[b + 1] = Math.min(segs[o + 1], segs[o + 5]) - w;
      box[b + 2] = Math.min(segs[o + 2], segs[o + 6]) - w;
      box[b + 3] = Math.max(segs[o], segs[o + 4]) + w;
      box[b + 4] = Math.max(segs[o + 1], segs[o + 5]) + w;
      box[b + 5] = Math.max(segs[o + 2], segs[o + 6]) + w;
      if (box[b] < x0) x0 = box[b];
      if (box[b + 1] < y0) y0 = box[b + 1];
      if (box[b + 2] < z0) z0 = box[b + 2];
      if (box[b + 3] > x1) x1 = box[b + 3];
      if (box[b + 4] > y1) y1 = box[b + 4];
      if (box[b + 5] > z1) z1 = box[b + 5];
    }
    if (n === 0) x0 = y0 = z0 = x1 = y1 = z1 = 0;
    this.ox = x0;
    this.oy = y0;
    this.oz = z0;

    const fine = FINE_CELL_VOXELS * h;

    this.fine = fine;
    const limit = COARSE_ENTRIES_PER_SEGMENT * n + COARSE_ENTRIES_FLOOR;
    let ratio = 1;
    let entries = 0;
    for (;;) {
      const c = fine * ratio;
      entries = 0;
      for (let s = 0; s < n && entries <= limit; s++) {
        const b = 6 * s;
        entries +=
          (Math.floor((box[b + 3] - x0) / c) - Math.floor((box[b] - x0) / c) + 1) *
          (Math.floor((box[b + 4] - y0) / c) - Math.floor((box[b + 1] - y0) / c) + 1) *
          (Math.floor((box[b + 5] - z0) / c) - Math.floor((box[b + 2] - z0) / c) + 1);
      }
      if (entries <= limit) break;
      ratio *= 2;
    }
    this.ratio = ratio;
    const c = fine * ratio;
    const cnx = Math.floor((x1 - x0) / c) + 1;
    this.cnx = cnx;
    const cny = Math.floor((y1 - y0) / c) + 1;
    this.cny = cny;
    this.cnz = Math.floor((z1 - z0) / c) + 1;

    // Coarse lists in CSR form: count, prefix sum, fill. Segments are visited in order, so every list is ascending.
    // Only the cells a band box touches get a row: an axon running for millimetres leaves nearly all of its box
    // empty, and a row per cell of the box would take gigabytes. `entries` bounds the number of rows.
    const rows = this.coarseRows;
    const counts = new Uint32Array(entries + 1);
    const range = new Int32Array(6 * n);
    // Row of every entry, in visiting order, so that the fill pass does not look the cells up again.
    const entryRow = new Uint32Array(entries);
    let e = 0;
    for (let s = 0; s < n; s++) {
      const b = 6 * s;
      range[b] = Math.floor((box[b] - x0) / c);
      range[b + 1] = Math.floor((box[b + 1] - y0) / c);
      range[b + 2] = Math.floor((box[b + 2] - z0) / c);
      range[b + 3] = Math.floor((box[b + 3] - x0) / c);
      range[b + 4] = Math.floor((box[b + 4] - y0) / c);
      range[b + 5] = Math.floor((box[b + 5] - z0) / c);
      for (let k = range[b + 2]; k <= range[b + 5]; k++) {
        for (let j = range[b + 1]; j <= range[b + 4]; j++) {
          const first = (k * cny + j) * cnx;
          for (let i = range[b]; i <= range[b + 3]; i++) {
            let row = rows.get(first + i);
            if (row === undefined) {
              row = rows.size;
              rows.set(first + i, row);
            }
            counts[row + 1]++;
            entryRow[e++] = row;
          }
        }
      }
    }
    const start = counts.slice(0, rows.size + 1);
    this.coarseStart = start;
    for (let i = 1; i < start.length; i++) start[i] += start[i - 1];
    const list = new Int32Array(entries);
    this.coarseSegs = list;
    const fill = start.slice(0, rows.size);
    e = 0;
    for (let s = 0; s < n; s++) {
      const b = 6 * s;
      const cells =
        (range[b + 3] - range[b] + 1) *
        (range[b + 4] - range[b + 1] + 1) *
        (range[b + 5] - range[b + 2] + 1);
      for (let q = 0; q < cells; q++) list[fill[entryRow[e++]]++] = s;
    }
  }

  /** Half-width of segment s's band. */
  private bandWidth(s: number): number {
    const o = 8 * s;
    return bandHalfWidth(
      Math.max(this.segs[o + 3], this.segs[o + 7]),
      this.primBeta[this.segPrim[s]],
      this.h
    );
  }

  /** The segments whose band reaches the fine cell (i, j, k). */
  private fineList(i: number, j: number, k: number): Int32Array {
    const ratio = this.ratio;
    const ci = Math.floor(i / ratio),
      cj = Math.floor(j / ratio),
      ck = Math.floor(k / ratio);
    if (ci < 0 || cj < 0 || ck < 0 || ci >= this.cnx || cj >= this.cny || ck >= this.cnz)
      return NO_SEGMENTS;
    const row = this.coarseRows.get((ck * this.cny + cj) * this.cnx + ci);
    if (row === undefined) return NO_SEGMENTS;
    const from = this.coarseStart[row],
      to = this.coarseStart[row + 1];

    const fine = this.fine,
      segs = this.segs;
    const cx = this.ox + (i + 0.5) * fine,
      cy = this.oy + (j + 0.5) * fine,
      cz = this.oz + (k + 0.5) * fine;
    const halfDiagonal = 0.5 * Math.sqrt(3) * fine;
    if (this.fineScratch.length < to - from) this.fineScratch = new Int32Array(to - from);
    const out = this.fineScratch;
    let m = 0;
    for (let q = from; q < to; q++) {
      const s = this.coarseSegs[q];
      const o = 8 * s;
      const abx = segs[o + 4] - segs[o],
        aby = segs[o + 5] - segs[o + 1],
        abz = segs[o + 6] - segs[o + 2];
      const dx = cx - segs[o],
        dy = cy - segs[o + 1],
        dz = cz - segs[o + 2];
      const len2 = abx * abx + aby * aby + abz * abz;
      let t = len2 > 1e-18 ? (dx * abx + dy * aby + dz * abz) / len2 : 0;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
      const ex = dx - abx * t,
        ey = dy - aby * t,
        ez = dz - abz * t;
      const reach = this.bandWidth(s) + halfDiagonal;
      if (ex * ex + ey * ey + ez * ez <= reach * reach) out[m++] = s;
    }
    return m === 0 ? NO_SEGMENTS : out.slice(0, m);
  }

  /** The segments whose band reaches the fine cell that holds a point. */
  private listAt(x: number, y: number, z: number): Int32Array {
    const fine = this.fine;
    const i = Math.floor((x - this.ox) / fine),
      j = Math.floor((y - this.oy) / fine),
      k = Math.floor((z - this.oz) / fine);
    const key = cellKey(i, j, k);
    if (key !== this.lastKey) {
      let l = this.fineLists.get(key);
      if (l === undefined) {
        l = this.fineList(i, j, k);
        this.fineLists.set(key, l);
      }
      this.lastKey = key;
      this.lastList = l;
    }
    return this.lastList;
  }

  /** Evaluate the field at a point given in the job's coordinates (µm, not relative to the mesh centre). */
  sample(x: number, y: number, z: number): void {
    const list = this.listAt(x, y, z);
    const segs = this.segs,
      segPrim = this.segPrim,
      primBeta = this.primBeta,
      primFamily = this.primFamily,
      h = this.h;
    let F = 0,
      gx = 0,
      gy = 0,
      gz = 0;
    let closest = Infinity,
      radius = 0;
    // The sum of the current family and its gradient.
    let family = -1,
      fF = 0,
      fx = 0,
      fy = 0,
      fz = 0;
    // Running minimum of the current section, and the gradient of u at it; for the soma the running smooth minimum
    // over a width `smooth`, 0 elsewhere.
    let cur = -1,
      beta = 0,
      smooth = 0;
    let mu = Infinity,
      mx = 0,
      my = 0,
      mz = 0,
      mr = 0;
    for (let q = 0; q <= list.length; q++) {
      const s = q < list.length ? list[q] : -1;
      const p = s < 0 ? -2 : segPrim[s];
      if (p !== cur) {
        if (mu < 2) {
          fF += kernel(mu);
          const slope = kernelSlope(mu);
          fx += slope * mx;
          fy += slope * my;
          fz += slope * mz;
          if (mu < closest) {
            closest = mu;
            radius = mr;
          }
        }
        const next = s < 0 ? -1 : primFamily[p];
        if (next !== family) {
          if (fF > F) {
            F = fF;
            gx = fx;
            gy = fy;
            gz = fz;
          }
          family = next;
          fF = fx = fy = fz = 0;
        }
        if (s < 0) break;
        cur = p;
        beta = primBeta[p];
        smooth = this.primRound[p];
        mu = Infinity;
      }
      const o = 8 * s;
      const ax = segs[o],
        ay = segs[o + 1],
        az = segs[o + 2],
        ra = segs[o + 3];
      const abx = segs[o + 4] - ax,
        aby = segs[o + 5] - ay,
        abz = segs[o + 6] - az;
      const dr = segs[o + 7] - ra;
      const dx = x - ax,
        dy = y - ay,
        dz = z - az;
      const len2 = abx * abx + aby * aby + abz * abz;
      const invLen2 = len2 > 1e-18 ? 1 / len2 : 0;
      let t = (dx * abx + dy * aby + dz * abz) * invLen2;
      let taper = dr * invLen2;
      if (t < 0) {
        t = 0;
        taper = 0;
      } else if (t > 1) {
        t = 1;
        taper = 0;
      }
      const ex = dx - abx * t,
        ey = dy - aby * t,
        ez = dz - abz * t;
      const dist2 = ex * ex + ey * ey + ez * ez;
      const r = ra + dr * t;
      let sc = beta * r;
      if (sc < h) sc = h;
      const lim = r + 2 * sc;
      if (dist2 >= lim * lim) continue;
      const dist = Math.sqrt(dist2);
      const u = (dist - r) / sc;
      if (smooth > 0) {
        // The soma: the running value folds this part in by `smoothMin`, and its gradient by the slopes of that, the
        // fades' (`somaFade`) among them.
        const inv = dist > 1e-12 ? 1 / (dist * sc) : 0;
        const d = mu < u ? u - mu : mu - u;
        const q = d < smooth ? 1 - d / smooth : 0;
        const fadeOwn = somaFade(u),
          fadeKept = somaFade(mu),
          fade = fadeOwn * fadeKept,
          lift = 0.25 * smooth * q * q;
        const own = u < mu ? 1 - 0.5 * q * fade : 0.5 * q * fade;
        const kept = 1 - own - lift * fadeOwn * somaFadeSlope(mu),
          mine = own - lift * fadeKept * somaFadeSlope(u);
        if (u < mu) mr = r;
        mx = kept * mx + mine * (ex * inv - (taper * abx) / sc);
        my = kept * my + mine * (ey * inv - (taper * aby) / sc);
        mz = kept * mz + mine * (ez * inv - (taper * abz) / sc);
        mu = (u < mu ? u : mu) - lift * fade;
      } else if (u < mu) {
        mu = u;
        mr = r;
        // ∇u = (∇dist - ∇r) / s: the unit vector off the axis, tilted by the cone's taper between its ends.
        const inv = dist > 1e-12 ? 1 / (dist * sc) : 0;
        mx = ex * inv - (taper * abx) / sc;
        my = ey * inv - (taper * aby) / sc;
        mz = ez * inv - (taper * abz) / sc;
      }
    }
    this.value = F;
    this.gx = gx;
    this.gy = gy;
    this.gz = gz;
    this.radius = radius;
  }

  /**
   * The normal to shade a vertex at this point with, left in nx, ny, nz; see the file comment. It is the gradient of
   * the field with one thing changed: the direction in which a section pulls. How much it pulls stays the field's,
   * g'(u) of its own normalised distance, so that sections blend in the normal as they do in the surface; a hull is
   * larger than the cone it replaces, by a lot where a thin branch leaves a thick one at the radius of its parent, and
   * would claim a say in places that the field leaves to others.
   *
   * The direction is that of a hull: from the centre, on the axis, of the sphere of the hull that the point is closest
   * to. That centre lies ahead of the point's orthogonal projection where the radius grows and behind it where it
   * falls, by ρ τ / √(1 − τ²) at the distance ρ from the axis.
   *
   * Which hull answers is for the field to say, not for the hulls: they are larger than the surface the vertex is on,
   * so it may lie deep inside the hull of a thick shoulder farther back, and on the inside of a bend the hulls fold a
   * little way from where the surface does. It is the hull of the segment that the field has the point on. Only where
   * that is the sphere at one of the segment's ends, by the field's measure or by the hull's own, does the neighbour
   * that shares the sphere come in, and the nearer of the two hulls answers: that carries the normal across a skeleton
   * point, from the one cone over what shows of the sphere to the other.
   *
   * On the inside of a bend the surface has a fold, where the field hands the point from one segment to the next, and
   * the normal would turn by the whole bend from one vertex to its neighbour: which side of the fold a vertex on it
   * belongs to is a matter of rounding, and a simplified mesh has few vertices to either side. So the hand-over is
   * soft. Every segment that the field has the point no more than `SHADE_HANDOVER` farther from than from the nearest
   * has a say, through the hull that would answer for it by the rule above, with a weight that is one for the nearest
   * and falls to nothing, with its slope, at `SHADE_HANDOVER`: the normal turns across the fold over a width of a few
   * hundredths of the radius to either side, as over a rounded edge. Along a straight run the segments about a
   * skeleton point answer with one and the same hull, and nothing changes. How much the section pulls is still g'(u)
   * of its least distance.
   *
   * False, with the normal left as it was, where the gradient vanishes.
   */
  shade(x: number, y: number, z: number): boolean {
    const list = this.listAt(x, y, z);
    const segPrim = this.segPrim,
      primBeta = this.primBeta,
      primFamily = this.primFamily,
      primStart = this.primStart;
    // The family with the largest sum so far, as `sample` has it, and the current one.
    let F = 0,
      gx = 0,
      gy = 0,
      gz = 0;
    let family = -1,
      fF = 0,
      fx = 0,
      fy = 0,
      fz = 0;
    let cur = -1,
      beta = 0;
    // The current section: its normalised distance as `sample` has it, how many of its segments are in `run`, from
    // the second place on, and the last of them. The first place is for the segment before the section's first, if
    // the section is cut from a longer one (kin.ts), and the place after the last for the segment that follows: a cut
    // is no more to the eye than any skeleton point, and the normal has to get across it in the same way.
    let mu = Infinity,
      n = 0,
      lastSeg = -1,
      guestBefore = false;
    for (let q = 0; q <= list.length; q++) {
      const s = q < list.length ? list[q] : -1;
      const p = s < 0 ? -2 : segPrim[s];
      if (p !== cur) {
        if (mu < 2 && this.primRound[cur] > 0) {
          // The soma: its parts fold as `sample` folds them, each pulling along the normal of its own surface
          // (`measure`). The surface is round where they meet, so there is no fold for a hand-over to soften.
          const v = this.foldRun(n, this.primRound[cur]);
          if (v < 2) {
            fF += kernel(v);
            const slope = kernelSlope(v);
            fx += slope * this.px;
            fy += slope * this.py;
            fz += slope * this.pz;
          }
        } else if (mu < 2) {
          fF += kernel(mu);
          let near = mu,
            to = n;
          if (guestBefore) near = Math.min(near, this.run[1]);
          if (lastSeg === primStart[cur + 1] - 1 && this.after[cur] >= 0) {
            near = Math.min(near, this.measure(this.after[cur], x, y, z, beta, RUN * ++to));
            this.run[RUN * to] = lastSeg + 1;
          }
          const run = this.run;
          let sx = 0,
            sy = 0,
            sz = 0,
            scale = 0,
            weight = 0;
          for (let i = guestBefore ? 0 : 1; i <= to; i++) {
            const o = RUN * i;
            const gap = run[o + 1] - near;
            if (!(gap < SHADE_HANDOVER)) continue;
            // The hull that answers for this segment: its own, or a neighbour's on the sphere between them.
            let a = o;
            const ends = run[o + 7];
            if (
              (ends & 1) !== 0 &&
              i > 0 &&
              run[o - RUN] === run[o] - 1 &&
              run[o - RUN + 2] < run[a + 2]
            )
              a = o - RUN;
            if (
              (ends & 2) !== 0 &&
              i < to &&
              run[o + RUN] === run[o] + 1 &&
              run[o + RUN + 2] < run[a + 2]
            )
              a = o + RUN;
            const w = (1 - gap / SHADE_HANDOVER) ** 2;
            sx += w * run[a + 3];
            sy += w * run[a + 4];
            sz += w * run[a + 5];
            // The blend scale at the hull's sphere rather than at the field's closest point: it runs on as smoothly as the direction.
            scale += w * run[a + 6];
            weight += w;
          }
          const l = Math.sqrt(sx * sx + sy * sy + sz * sz);
          if (l > 1e-12) {
            const pull = (kernelSlope(mu) * weight) / (scale * l);
            fx += pull * sx;
            fy += pull * sy;
            fz += pull * sz;
          }
        }
        const next = s < 0 ? -1 : primFamily[p];
        if (next !== family) {
          if (fF > F) {
            F = fF;
            gx = fx;
            gy = fy;
            gz = fz;
          }
          family = next;
          fF = fx = fy = fz = 0;
        }
        if (s < 0) break;
        cur = p;
        beta = primBeta[p];
        mu = Infinity;
        n = 0;
        guestBefore = s === primStart[p] && this.before[p] >= 0;
        if (guestBefore) {
          this.measure(this.before[p], x, y, z, beta, 0);
          this.run[0] = s - 1;
        } else this.run[0] = -2;
      }
      const u = this.measure(s, x, y, z, beta, RUN * ++n);
      if (u < mu) mu = u;
      lastSeg = s;
    }
    const g2 = gx * gx + gy * gy + gz * gz;
    if (g2 < MIN_SHADE_GRADIENT2) return false;
    // The kernel falls off outwards, so the sum points into the surface.
    const inv = -1 / Math.sqrt(g2);
    this.nx = gx * inv;
    this.ny = gy * inv;
    this.nz = gz * inv;
    return true;
  }

  /**
   * Fold the n segments in `run`, from its second place on, by `smoothMin` over the width k, in their order, as
   * `sample` folds the soma's parts, and return the result. The direction it pulls in is left in px, py, pz: each
   * part's direction over its blend scale, mixed by the slopes of the fold as the gradient is, all but the fades'.
   */
  private foldRun(n: number, k: number): number {
    const run = this.run;
    let v = Infinity,
      x = 0,
      y = 0,
      z = 0;
    for (let i = 1; i <= n; i++) {
      const o = RUN * i,
        u = run[o + 1];
      // Beyond its band the field does not see the part either.
      if (!(u < Infinity)) continue;
      const d = v < u ? u - v : v - u;
      // The shares fade as `sample` has them, by the part's distance and by the running value's.
      const q = d < k ? 1 - d / k : 0,
        fade = somaFade(u) * somaFade(v),
        fq = q * fade;
      const own = u < v ? 1 - 0.5 * fq : 0.5 * fq,
        kept = 1 - own,
        s = own / run[o + 6];
      x = kept * x + s * run[o + 3];
      y = kept * y + s * run[o + 4];
      z = kept * z + s * run[o + 5];
      v = (u < v ? u : v) - 0.25 * k * q * q * fade;
    }
    this.px = x;
    this.py = y;
    this.pz = z;
    return v;
  }

  /**
   * Measure the point against segment s for `shade`, into the `RUN` numbers of `run` from w: the segment, the
   * normalised distance as the field has it (returned as well; infinite beyond the band), then the hull's distance,
   * direction and blend scale, and the ends it is clamped at.
   */
  private measure(s: number, x: number, y: number, z: number, beta: number, w: number): number {
    const segs = this.segs,
      h = this.h;
    const o = 8 * s;
    const ax = segs[o],
      ay = segs[o + 1],
      az = segs[o + 2],
      ra = segs[o + 3];
    const abx = segs[o + 4] - ax,
      aby = segs[o + 5] - ay,
      abz = segs[o + 6] - az;
    const dr = segs[o + 7] - ra;
    const dx = x - ax,
      dy = y - ay,
      dz = z - az;
    const len2 = abx * abx + aby * aby + abz * abz;
    const along = dx * abx + dy * aby + dz * abz;

    // The field's measure, from the orthogonal projection. `ends`: 1 if the point is on the sphere at the segment's
    // start, 2 if on the one at its end, by this measure or by the hull's.
    let t = len2 > 1e-18 ? along / len2 : 0;
    let ends = 0;
    if (t < 0) {
      t = 0;
      ends = 1;
    } else if (t > 1) {
      t = 1;
      ends = 2;
    }
    let ex = dx - abx * t,
      ey = dy - aby * t,
      ez = dz - abz * t;
    let dist2 = ex * ex + ey * ey + ez * ez;
    let r = ra + dr * t;
    let sc = beta * r;
    if (sc < h) sc = h;
    const lim = r + 2 * sc;
    const u = dist2 < lim * lim ? (Math.sqrt(dist2) - r) / sc : Infinity;

    if (this.primRound[this.segPrim[s]] > 0 && len2 > 1e-18) {
      // A neck of the soma. On its side, the cone itself, as ∇u has it (`sample`), tilted by the taper between the
      // ends: off the axis, back by dist (dr / len) along it. Beyond an end, not the segment's end sphere, which is
      // smaller than the surface there and would turn the normal by the neck's half-angle where the point passes the
      // end's plane: the sphere the neck is tangent to at that end (`tangentNeck`), the base sphere or the target's,
      // centred r (dr / len) along the axis from the end. On the surface, dist = r, the two are one.
      const dist = Math.sqrt(dist2);
      const back = ((ends === 0 ? dist : r) * dr) / len2;
      const nx = ex - back * abx,
        ny = ey - back * aby,
        nz = ez - back * abz;
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const il = l > 1e-12 ? 1 / l : 0;
      this.put(w, s, u, dist - r, nx * il, ny * il, nz * il, sc, ends);
      return u;
    }

    // The hull's.
    t = 0;
    let clamped = 3;
    if (len2 > 1e-18) {
      t = hullShare(dx, dy, dz, dr, len2, along);
      clamped = 0;
      if (t < 0) {
        t = 0;
        clamped = 1;
      } else if (t > 1) {
        t = 1;
        clamped = 2;
      }
    }
    ex = dx - abx * t;
    ey = dy - aby * t;
    ez = dz - abz * t;
    dist2 = ex * ex + ey * ey + ez * ez;
    const dist = Math.sqrt(dist2);
    const inv = dist > 1e-12 ? 1 / dist : 0;
    r = ra + dr * t;
    sc = beta * r;
    if (sc < h) sc = h;

    this.put(w, s, u, dist - r, ex * inv, ey * inv, ez * inv, sc, ends | clamped);
    return u;
  }

  /** The `RUN` numbers of one segment into `run` from w, which grows if it has no room for them. */
  private put(
    w: number,
    s: number,
    u: number,
    off: number,
    nx: number,
    ny: number,
    nz: number,
    sc: number,
    flags: number
  ): void {
    let run = this.run;
    if (w + RUN > run.length) {
      const grown = new Float64Array(2 * (w + RUN));
      grown.set(run);
      this.run = run = grown;
    }
    run[w] = s;
    run[w + 1] = u;
    run[w + 2] = off;
    run[w + 3] = nx;
    run[w + 4] = ny;
    run[w + 5] = nz;
    run[w + 6] = sc;
    run[w + 7] = flags;
  }
}
