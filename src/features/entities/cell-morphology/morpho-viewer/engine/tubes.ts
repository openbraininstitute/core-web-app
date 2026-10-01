/**
 * Swept tubes for the plain stretches of a section.
 *
 * Where no other section's band reaches a section's surface, the blended field there is that section's alone and
 * F = 1 is exactly the surface of its rounded cones: the points at distance r(t) from the axis, t being the clamped
 * orthogonal projection onto a segment, minimum over the segments (`splatSegment` in mesher.ts). That surface needs no
 * voxels. Rings of vertices are put around stations along the path and joined by strips:
 *
 *  - A station sits at each end of the stretch, at every skeleton point in between (in the plane that bisects the
 *    bend, where the two cones meet) and along long segments so that triangles stay within an aspect ratio.
 *  - A ring's vertices lie in the station's plane, at equal angles in a rotation-minimising frame (Wang et al. 2008,
 *    double reflection), so consecutive rings line up without twist. Each vertex is found by a ray cast from the
 *    station: on a cone the surface is a radius away, at a bend the ring is egg-shaped (sphere outside, crease inside).
 *    Its normal is the shading normal there (`SectionPath.shade`), as the voxel mesh's vertices have it.
 *  - The number of vertices around follows the chord error r (1 − cos(π / n)) ≤ tolerance. A cone is a ruled surface,
 *    so strips between rings add nothing to it however long they are.
 *  - The vertices stand a little outside the surface (`ringScale`), as far as the middle of a chord lies inside it. A
 *    ring inscribed in its circle is off by the whole chord error on one side and loses 17 % of a hexagon's
 *    cross-section; this way it is off by half of it on either side, and 5 %.
 *  - A free end is closed by rings on the end's hemisphere and a pole vertex. Any other end stays open: its ring is
 *    joined to the voxel-meshed patch next to it by a collar (hybrid.ts), through `bridgeLoops` as well.
 *
 * What the strips on either side of a skeleton point cannot follow is the sphere around it, where it shows: on the
 * outside of a bend of 2α it stands r (1 − cos α) clear of a bisecting ring's strips, and where the radius falls away
 * with slope τ it bulges r (√(1 + τ²) − 1) out of the cone. `jointError` is the sum; the rings next to the point are
 * sized for what it leaves of the tolerance, and `jointFits` tells the classification (classify.ts) which points are
 * left to the voxels.
 */

import { hullShare } from './field';
import { GrowableFloat32, GrowableUint8, GrowableUint32 } from './growable';
import { arcLengths, segmentAt } from './segments';

/** Fewest vertices around a ring. */
const MIN_AROUND = 6;
/** Most vertices around a ring, whatever the tolerance. */
const MAX_AROUND = 96;
/** The chord error is aimed at this fraction of what the bends leave of the tolerance; the rest is for rounding. */
const CHORD_FRACTION = 0.95;
/** A skeleton point may use up this fraction of the tolerance, see `jointFits`; the chords around it get the rest. */
const BEND_FRACTION = 0.5;
/** Ray casts stop within this distance of the surface, µm. */
const CAST_TOLERANCE = 1e-7;
const CAST_STEPS = 24;
/** Fewest rings between the equator of a cap and its pole. */
const MIN_CAP_RINGS = 2;
/** Edges on a cap, as a fraction of the arc whose sagitta is the tolerance; see `cap`. */
const CAP_EDGE_FRACTION = 0.6;
/** Share of the tolerance that the ring under a cap is sized for: it is an edge of the cap's first triangles as well. */
const CAP_EQUATOR_FRACTION = 0.5;
/**
 * A station's surface is decided by the segments within this many radii of it along the path. Parts of a section
 * farther apart than `SAME_SECTION_RADII` that come close in space make the stretch complex (classify.ts), and so do
 * parts that touch across a skeleton point no tube can pass, however close along the path: the arms of a hairpin, a
 * swelling next to it. The window is twice that, since the radius that rule goes by may be a neighbour's.
 */
export const SAME_SECTION_RADII = 4;
export const WINDOW_RADII = 2 * SAME_SECTION_RADII;

/** A tube is never farther from its surface than this share of its radius, as a simplified voxel mesh (refine.ts). */
const TUBE_RADIUS_FRACTION = 0.5;

/** The tolerance at radius r: the mesh's, or what a fibre that thin can bear. */
export function tubeTolerance(r: number, tolerance: number): number {
  return Math.min(tolerance, TUBE_RADIUS_FRACTION * r);
}

/** Vertices around a ring of radius r for a chord error of `tolerance`: even, so that a ring has opposite vertices. */
export function aroundFor(r: number, tolerance: number): number {
  const x = 1 - (CHORD_FRACTION * tolerance) / r;
  const n = x <= 0 ? MIN_AROUND : Math.ceil(Math.PI / Math.acos(x));
  const even = n + (n & 1);
  return Math.max(MIN_AROUND, Math.min(MAX_AROUND, even));
}

/** Edge length of a ring of radius r that a tube of this tolerance lays (`aroundFor`, `tubeTolerance`). */
export function ringEdge(r: number, tolerance: number): number {
  return 2 * r * Math.sin(Math.PI / aroundFor(r, tubeTolerance(r, tolerance)));
}

/** A unit vector across the unit vector t, into `out`: from the coordinate axis that t is least aligned with. */
export function across(tx: number, ty: number, tz: number, out: Float64Array): void {
  const ax = Math.abs(tx),
    ay = Math.abs(ty),
    az = Math.abs(tz);
  const ex = ax <= ay && ax <= az ? 1 : 0,
    ey = ex === 0 && ay <= az ? 1 : 0,
    ez = ex === 0 && ey === 0 ? 1 : 0;
  const dot = ex * tx + ey * ty + ez * tz;
  const nx = ex - dot * tx,
    ny = ey - dot * ty,
    nz = ez - dot * tz;
  const inv = 1 / Math.hypot(nx, ny, nz);
  out[0] = nx * inv;
  out[1] = ny * inv;
  out[2] = nz * inv;
}

/**
 * What a ring's rays are scaled by, from the surface outwards: with c = cos(π / n) a vertex at 2 r / (1 + c) and the
 * middle of a chord, at c times that, are both r (1 − c) / (1 + c) from a circle of radius r.
 */
export function ringScale(n: number): number {
  return 2 / (1 + Math.cos(Math.PI / n));
}

/**
 * How far the strips next to a skeleton point of radius r stay from the sphere around it: `cosHalfBend` is the cosine
 * of half the bend there, `taper` the steepest slope at which the radius falls away from the point (0 if it does not).
 */
export function jointError(r: number, cosHalfBend: number, taper: number): number {
  return r * (1 - Math.min(1, cosHalfBend)) + r * (Math.sqrt(1 + taper * taper) - 1);
}

/** Whether a tube can pass a skeleton point with that error and still have something left for its chords. */
export function jointFits(error: number, tolerance: number): boolean {
  return error <= BEND_FRACTION * tolerance;
}

/**
 * A polyline of x, y, z, r points with its arc lengths, and the signed distance to the surface of its rounded cones.
 * Consecutive points that coincide are dropped: they have no direction.
 */
export class SectionPath {
  /** Packed x, y, z, r. */
  readonly points: Float64Array;
  /** Arc length at every point. */
  readonly arc: Float64Array;
  readonly count: number;

  /** Gradient of the distance at the last point given to `distance`: along the surface normal there, √(1 + τ²) long on a taper. */
  gx = 0;
  gy = 0;
  gz = 0;
  /** The segment that the last point given to `distance` is on. */
  owner = 0;
  /** Unit normal to shade with at the last point given to `shade`. */
  nx = 0;
  ny = 0;
  nz = 0;

  constructor(points: Float64Array) {
    const kept = new Float64Array(points.length);
    let n = 0;
    for (let k = 0; k < points.length; k += 4) {
      if (
        n >= 4 &&
        points[k] === kept[n - 4] &&
        points[k + 1] === kept[n - 3] &&
        points[k + 2] === kept[n - 2]
      ) {
        // Keep the larger radius of the two: the union of the two spheres.
        if (points[k + 3] > kept[n - 1]) kept[n - 1] = points[k + 3];
        continue;
      }
      kept.set(points.subarray(k, k + 4), n);
      n += 4;
    }
    this.points = n === kept.length ? kept : kept.slice(0, n);
    this.count = n / 4;
    this.arc = arcLengths(this.points);
  }

  get length(): number {
    return this.count > 0 ? this.arc[this.count - 1] : 0;
  }

  /** Index of the segment that holds arc length s; the last segment for the path's end. */
  segmentAt(s: number): number {
    return segmentAt(this.arc, s);
  }

  /** x, y, z, r at arc length s, written to `out`. */
  at(s: number, out: Float64Array): void {
    const j = this.segmentAt(s);
    const p = this.points,
      o = 4 * j;
    const len = this.arc[j + 1] - this.arc[j];
    let t = len > 0 ? (s - this.arc[j]) / len : 0;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    for (let c = 0; c < 4; c++) out[c] = p[o + c] + (p[o + 4 + c] - p[o + c]) * t;
  }

  /** Unit direction of segment j, written to `out`. */
  direction(j: number, out: Float64Array): void {
    const p = this.points,
      o = 4 * j;
    const dx = p[o + 4] - p[o],
      dy = p[o + 5] - p[o + 1],
      dz = p[o + 6] - p[o + 2];
    const inv = 1 / Math.hypot(dx, dy, dz);
    out[0] = dx * inv;
    out[1] = dy * inv;
    out[2] = dz * inv;
  }

  /**
   * Signed distance from a point to the surface of segments j0..j1, with the arithmetic of the field: the distance
   * to the axis point at the clamped orthogonal projection, minus the radius there. Leaves the gradient in gx, gy, gz.
   */
  distance(x: number, y: number, z: number, j0: number, j1: number): number {
    const p = this.points;
    let best = Infinity;
    for (let j = j0; j <= j1; j++) {
      const o = 4 * j;
      const ax = p[o],
        ay = p[o + 1],
        az = p[o + 2],
        ra = p[o + 3];
      const abx = p[o + 4] - ax,
        aby = p[o + 5] - ay,
        abz = p[o + 6] - az;
      const dr = p[o + 7] - ra;
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
      const dist = Math.sqrt(ex * ex + ey * ey + ez * ez);
      const d = dist - (ra + dr * t);
      if (d < best) {
        best = d;
        const inv = dist > 1e-12 ? 1 / dist : 0;
        this.gx = ex * inv - taper * abx;
        this.gy = ey * inv - taper * aby;
        this.gz = ez * inv - taper * abz;
        this.owner = j;
      }
    }
    return best;
  }

  /**
   * The normal to shade the point with that `distance` was last asked about, as after a `cast`; left in nx, ny, nz.
   * Not the gradient that `distance` leaves: that one turns by a cone's whole slope where the cone meets the sphere of
   * a skeleton point, and in a ring around such a point rounding decides vertex by vertex which of the two it is. As
   * `FieldSampler.shade`, which has the reasoning, this takes segments as the hulls of their end spheres and the
   * direction from the centre of the closest sphere of the nearest hull. The hulls asked are those of the segment that
   * the point is on and of both its neighbours, whichever part of the segment it is on: a ring at a skeleton point
   * lies where two segments tie, and must come out the same whichever of them rounding makes the owner. `FieldSampler`
   * cannot be as generous, since hulls fold a little way from where a sharp bend's surface does; the stretches that are
   * swept have no such bends. `j0` and `j1` are the segments that `distance` went over.
   */
  shade(x: number, y: number, z: number, j0: number, j1: number): void {
    const owner = this.owner;
    let near = this.hull(x, y, z, owner);
    let nx = this.nx,
      ny = this.ny,
      nz = this.nz;
    for (let j = owner - 1; j <= owner + 1; j += 2) {
      if (j < j0 || j > j1) continue;
      const d = this.hull(x, y, z, j);
      if (d < near) {
        near = d;
        nx = this.nx;
        ny = this.ny;
        nz = this.nz;
      }
    }
    this.nx = nx;
    this.ny = ny;
    this.nz = nz;
  }

  /** Signed distance from a point to segment j as the hull of its end spheres; leaves the direction from the centre of the hull's closest sphere in nx, ny, nz. */
  private hull(x: number, y: number, z: number, j: number): number {
    const p = this.points,
      o = 4 * j;
    const ax = p[o],
      ay = p[o + 1],
      az = p[o + 2],
      ra = p[o + 3];
    const abx = p[o + 4] - ax,
      aby = p[o + 5] - ay,
      abz = p[o + 6] - az;
    const dr = p[o + 7] - ra;
    const dx = x - ax,
      dy = y - ay,
      dz = z - az;
    const len2 = abx * abx + aby * aby + abz * abz;
    let t = 0;
    if (len2 > 1e-18) {
      t = hullShare(dx, dy, dz, dr, len2, dx * abx + dy * aby + dz * abz);
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
    }
    const ex = dx - abx * t,
      ey = dy - aby * t,
      ez = dz - abz * t;
    const dist = Math.sqrt(ex * ex + ey * ey + ez * ez);
    const inv = dist > 1e-12 ? 1 / dist : 0;
    this.nx = ex * inv;
    this.ny = ey * inv;
    this.nz = ez * inv;
    return dist - (ra + dr * t);
  }

  /** The steepest slope at which the radius falls away from point k along its segments, 0 if it rises on both sides. */
  taperAt(k: number): number {
    const p = this.points,
      r = p[4 * k + 3];
    let taper = 0;
    if (k > 0) taper = Math.max(taper, (r - p[4 * k - 1]) / (this.arc[k] - this.arc[k - 1]));
    if (k + 1 < this.count)
      taper = Math.max(taper, (r - p[4 * k + 7]) / (this.arc[k + 1] - this.arc[k]));
    return taper;
  }

  /** Segments within `reach` of arc length s along the path: what decides the surface around a station. */
  window(s: number, reach: number): [number, number] {
    return [
      this.segmentAt(Math.max(0, s - reach)),
      this.segmentAt(Math.min(this.length, s + reach)),
    ];
  }

  /**
   * Distance from (cx, cy, cz), inside the surface, to the surface along the unit direction d: safeguarded Newton
   * from the guess `r0`. Leaves the surface normal in gx, gy, gz. NaN if the ray does not leave the surface.
   */
  cast(
    cx: number,
    cy: number,
    cz: number,
    dx: number,
    dy: number,
    dz: number,
    r0: number,
    j0: number,
    j1: number
  ): number {
    let lo = 0,
      hi = Infinity;
    let rho = r0;
    for (let step = 0; step < CAST_STEPS; step++) {
      const d = this.distance(cx + rho * dx, cy + rho * dy, cz + rho * dz, j0, j1);
      if (Math.abs(d) < CAST_TOLERANCE) return rho;
      if (d < 0) lo = rho;
      else hi = rho;
      const slope = this.gx * dx + this.gy * dy + this.gz * dz;
      let next = slope > 0.05 ? rho - d / slope : NaN;
      if (!(next > lo && next < hi)) next = hi === Infinity ? 2 * rho + r0 : 0.5 * (lo + hi);
      if (next > 64 * r0) return NaN;
      rho = next;
    }
    this.distance(cx + rho * dx, cy + rho * dy, cz + rho * dz, j0, j1);
    return rho;
  }
}

/** A closed loop of mesh vertices with the angle of each around some axis, ascending over less than a turn. */
export interface Loop {
  vertices: ArrayLike<number>;
  angles: ArrayLike<number>;
}

/** Where triangles go, three vertex indices at a time: a `number[]`, say. */
export interface TriangleOut {
  push(a: number, b: number, c: number): unknown;
}

/**
 * Triangles between two loops that wind the same way around an axis, `a` behind `b` along it: a merge of the two
 * angle sequences, advancing on the loop where the new edge across spans the smaller angle, so that no triangle
 * reaches much farther around the tube than the loops' own edges do. With angles ascending counter-clockwise seen
 * against the axis, the triangles face outwards. Two loops of one size and equal angles give aligned quads split
 * along the same diagonal.
 */
export function bridgeLoops(a: Loop, b: Loop, indices: TriangleOut): void {
  const m = a.vertices.length,
    n = b.vertices.length;
  if (m < 3 || n < 3) throw new Error('a loop needs three vertices');
  const TWO_PI = 2 * Math.PI;
  const a0 = a.angles[0];
  // Start `b` at its vertex closest in angle to a's first, and unwrap both sequences from there.
  let j0 = 0,
    bestDiff = Infinity;
  for (let j = 0; j < n; j++) {
    let diff = (b.angles[j] - a0) % TWO_PI;
    if (diff > Math.PI) diff -= TWO_PI;
    else if (diff < -Math.PI) diff += TWO_PI;
    if (Math.abs(diff) < Math.abs(bestDiff)) {
      bestDiff = diff;
      j0 = j;
    }
  }
  // The unwrapped angles, and after the last vertex the first again a turn on.
  const angleA = new Float64Array(m + 1),
    angleB = new Float64Array(n + 1);
  for (let i = 0; i < m; i++) {
    let d = (a.angles[i] - a0) % TWO_PI;
    if (d < 0) d += TWO_PI;
    angleA[i] = d;
  }
  angleA[m] = TWO_PI + angleA[0];
  for (let k = 0; k < n; k++) {
    let d = (b.angles[(j0 + k) % n] - b.angles[j0]) % TWO_PI;
    if (d < 0) d += TWO_PI;
    angleB[k] = bestDiff + d;
  }
  angleB[n] = TWO_PI + angleB[0];
  let i = 0,
    k = 0;
  while (i < m || k < n) {
    const va = a.vertices[i % m],
      vb = b.vertices[(j0 + k) % n];
    // The new edge runs from the vertex advanced to, across to the other loop's current one; a tie goes to `a`, and
    // `b` then closes the quad.
    const advanceA =
      k >= n ||
      (i < m && Math.abs(angleA[i + 1] - angleB[k]) <= Math.abs(angleB[k + 1] - angleA[i]));
    if (advanceA) {
      indices.push(va, a.vertices[(i + 1) % m], vb);
      i++;
    } else {
      indices.push(va, b.vertices[(j0 + k + 1) % n], vb);
      k++;
    }
  }
}

/** A tube to sweep: a polyline, the stretch of it to cover, and how the ends finish. */
export interface TubeSpec {
  /** Packed x, y, z, r of the polyline around the stretch: enough of the section on either side to decide its surface. */
  points: Float64Array;
  /** Arc lengths along `points` between which the tube runs. */
  s0: number;
  s1: number;
  /** Close the end with the hemisphere of the section's free end, which must then be the polyline's. */
  capStart: boolean;
  capEnd: boolean;
  /** SWC type of the vertices. */
  type: number;
}

export interface TubeOptions {
  /** Largest distance of a triangle from the surface, µm. */
  tolerance: number;
  /** Largest ratio of the distance between rings to the edge length around them. */
  maxAspect: number;
}

/** First vertex and size of a ring whose vertices are consecutive, ascending in angle. */
export interface Ring {
  first: number;
  count: number;
}

export interface TubeEnds {
  /** The open rings at the stretch's ends, null where a cap closed it. */
  start: Ring | null;
  end: Ring | null;
}

interface Station {
  s: number;
  /** What the skeleton point at the station takes of the tolerance (`jointError`), zero within a segment. */
  bend: number;
  /** Position, radius and the normal of the ring's plane. */
  x: number;
  y: number;
  z: number;
  r: number;
  tx: number;
  ty: number;
  tz: number;
}

/** Collects the tubes of a batch in one set of arrays. Positions are relative to `center`. */
export class TubeMesher {
  private readonly positions = new GrowableFloat32(3 << 10);
  private readonly normals = new GrowableFloat32(3 << 10);
  private readonly types = new GrowableUint8(1 << 10);
  /** Per vertex, the radius of the section at its station (a cap's vertices take the end's). */
  private readonly radii = new GrowableFloat32(1 << 10);
  private readonly indices = new GrowableUint32(6 << 10);

  private readonly tmp = new Float64Array(4);
  private readonly dirA = new Float64Array(3);
  private readonly dirB = new Float64Array(3);

  constructor(
    private readonly center: [number, number, number],
    private readonly options: TubeOptions
  ) {}

  get vertexCount(): number {
    return this.types.length;
  }

  /** The tubes swept so far. */
  mesh(): {
    positions: Float32Array;
    normals: Float32Array;
    vertexTypes: Uint8Array;
    radii: Float32Array;
    indices: Uint32Array;
  } {
    return {
      positions: this.positions.trimmed(),
      normals: this.normals.trimmed(),
      vertexTypes: this.types.trimmed(),
      radii: this.radii.trimmed(),
      indices: this.indices.trimmed(),
    };
  }

  /** Sweep one tube and return its open rings. */
  add(spec: TubeSpec): TubeEnds {
    const path = new SectionPath(spec.points);
    if (path.count < 2) throw new Error('a tube needs a polyline of two points');
    const s0 = Math.max(0, spec.s0),
      s1 = Math.min(path.length, spec.s1);
    if (!(s1 > s0)) throw new Error('empty tube stretch');
    const stations = this.stations(path, s0, s1);

    // Rotation-minimising frames along the stations, by double reflection, from any unit vector across the first tangent.
    across(stations[0].tx, stations[0].ty, stations[0].tz, this.dirA);
    let nx = this.dirA[0],
      ny = this.dirA[1],
      nz = this.dirA[2];

    let previous: Ring | null = null;
    let first: Ring | null = null;
    for (let i = 0; i < stations.length; i++) {
      const st = stations[i];
      if (i > 0) {
        const q = stations[i - 1];
        // Reflect the frame across the plane between the stations, then across the one between the tangents.
        const v1x = st.x - q.x,
          v1y = st.y - q.y,
          v1z = st.z - q.z;
        const c1 = v1x * v1x + v1y * v1y + v1z * v1z;
        const k1 = (2 / c1) * (v1x * nx + v1y * ny + v1z * nz);
        const lx = nx - k1 * v1x,
          ly = ny - k1 * v1y,
          lz = nz - k1 * v1z;
        const k1t = (2 / c1) * (v1x * q.tx + v1y * q.ty + v1z * q.tz);
        const ltx = q.tx - k1t * v1x,
          lty = q.ty - k1t * v1y,
          ltz = q.tz - k1t * v1z;
        const v2x = st.tx - ltx,
          v2y = st.ty - lty,
          v2z = st.tz - ltz;
        const c2 = v2x * v2x + v2y * v2y + v2z * v2z;
        if (c2 > 1e-24) {
          const k2 = (2 / c2) * (v2x * lx + v2y * ly + v2z * lz);
          nx = lx - k2 * v2x;
          ny = ly - k2 * v2y;
          nz = lz - k2 * v2z;
        } else {
          nx = lx;
          ny = ly;
          nz = lz;
        }
        // Rounding leaves the frame a little off the plane after thousands of stations: put it back.
        const off = nx * st.tx + ny * st.ty + nz * st.tz;
        nx -= off * st.tx;
        ny -= off * st.ty;
        nz -= off * st.tz;
        const inv = 1 / Math.hypot(nx, ny, nz);
        nx *= inv;
        ny *= inv;
        nz *= inv;
      }
      const bx = st.ty * nz - st.tz * ny,
        by = st.tz * nx - st.tx * nz,
        bz = st.tx * ny - st.ty * nx;
      // The strips on either side of a bend miss its outer sphere by `bend`; their chords get what is left.
      const bend = Math.max(
        st.bend,
        i > 0 ? stations[i - 1].bend : 0,
        i + 1 < stations.length ? stations[i + 1].bend : 0
      );
      const capped = (i === 0 && spec.capStart) || (i === stations.length - 1 && spec.capEnd);
      const tolerance = tubeTolerance(st.r, this.options.tolerance);
      const budget =
        Math.max(0.25 * tolerance, tolerance - bend) * (capped ? CAP_EQUATOR_FRACTION : 1);
      const need = aroundFor(st.r, budget);
      // A radius hovering around a step of `aroundFor` would flip the ring size back and forth: stay one step above.
      const n: number =
        previous !== null && previous.count >= need && previous.count <= need + 2
          ? previous.count
          : need;
      const [j0, j1] = path.window(st.s, WINDOW_RADII * st.r + this.options.tolerance);
      const ring = this.ring(path, st, n, nx, ny, nz, bx, by, bz, j0, j1, spec.type);
      if (previous !== null) this.strip(previous, ring);
      else first = ring;
      previous = ring;
      if (i === 0 && spec.capStart) this.cap(st, ring, -1, nx, ny, nz, bx, by, bz, spec.type);
      if (i === stations.length - 1 && spec.capEnd)
        this.cap(st, ring, 1, nx, ny, nz, bx, by, bz, spec.type);
    }
    return { start: spec.capStart ? null : first, end: spec.capEnd ? null : previous };
  }

  /** Stations from s0 to s1: the ends, the skeleton points between them, and enough more to bound the aspect ratio. */
  private stations(path: SectionPath, s0: number, s1: number): Station[] {
    const base: number[] = [s0];
    // A skeleton point this close to an end of the stretch would make a sliver of a strip; the end's own ring serves.
    const gap = 1e-6 * Math.max(1, path.length);
    for (let k = 1; k < path.count - 1; k++)
      if (path.arc[k] > s0 + gap && path.arc[k] < s1 - gap) base.push(path.arc[k]);
    base.push(s1);

    const out: Station[] = [];
    for (let i = 0; i < base.length; i++) {
      const st = this.station(path, base[i]);
      if (i > 0) {
        const q = out[out.length - 1];
        const edge = ringEdge(Math.max(q.r, st.r), this.options.tolerance);
        const parts = Math.ceil((st.s - q.s) / (this.options.maxAspect * edge) - 1e-9);
        for (let k = 1; k < parts; k++)
          out.push(this.station(path, q.s + ((st.s - q.s) * k) / parts));
      }
      out.push(st);
    }
    return out;
  }

  /** The station at arc length s: across its segment, or across the bisector of the bend at a skeleton point. */
  private station(path: SectionPath, s: number): Station {
    const tmp = this.tmp;
    path.at(s, tmp);
    const j = path.segmentAt(s);
    const a = this.dirA,
      b = this.dirB;
    path.direction(j, a);
    let tx = a[0],
      ty = a[1],
      tz = a[2];
    const eps = 1e-9 * Math.max(1, path.length);
    // At a skeleton point the ring lies in the plane where the two cones meet.
    let other = -1,
      bend = 0;
    if (Math.abs(s - path.arc[j]) <= eps && j > 0) other = j - 1;
    else if (Math.abs(s - path.arc[j + 1]) <= eps && j + 2 < path.count) other = j + 1;
    if (other >= 0) {
      path.direction(other, b);
      // cos α of half the bend, from the sum of the two unit directions.
      const cosHalf = 0.5 * Math.hypot(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
      bend = jointError(tmp[3], cosHalf, path.taperAt(Math.max(j, other)));
      tx += b[0];
      ty += b[1];
      tz += b[2];
      const len = Math.hypot(tx, ty, tz);
      if (len > 1e-9) {
        tx /= len;
        ty /= len;
        tz /= len;
      } else {
        tx = a[0];
        ty = a[1];
        tz = a[2];
      }
    }
    return { s, bend, x: tmp[0], y: tmp[1], z: tmp[2], r: tmp[3], tx, ty, tz };
  }

  private push(
    x: number,
    y: number,
    z: number,
    gx: number,
    gy: number,
    gz: number,
    type: number,
    radius: number
  ): number {
    const c = this.center;
    this.positions.push3(x - c[0], y - c[1], z - c[2]);
    const len = Math.hypot(gx, gy, gz);
    const inv = len > 0 ? 1 / len : 0;
    this.normals.push3(gx * inv, gy * inv, gz * inv);
    this.types.push(type);
    this.radii.push(radius);
    return this.types.length - 1;
  }

  /** A ring of n vertices in the station's plane, each along a ray from the station at `ringScale` times the way to the surface. */
  private ring(
    path: SectionPath,
    st: Station,
    n: number,
    nx: number,
    ny: number,
    nz: number,
    bx: number,
    by: number,
    bz: number,
    j0: number,
    j1: number,
    type: number
  ): Ring {
    const first = this.vertexCount;
    const scale = ringScale(n);
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * k) / n;
      const ca = Math.cos(a),
        sa = Math.sin(a);
      const dx = ca * nx + sa * bx,
        dy = ca * ny + sa * by,
        dz = ca * nz + sa * bz;
      const hit = path.cast(st.x, st.y, st.z, dx, dy, dz, st.r, j0, j1);
      if (!(hit > 0)) throw new Error('tube ring: no surface along a ray');
      // The normal of the surface where the ray meets it, the vertex farther out along the ray.
      path.shade(st.x + hit * dx, st.y + hit * dy, st.z + hit * dz, j0, j1);
      const rho = scale * hit;
      this.push(
        st.x + rho * dx,
        st.y + rho * dy,
        st.z + rho * dz,
        path.nx,
        path.ny,
        path.nz,
        type,
        st.r
      );
    }
    return { first, count: n };
  }

  /** The strip between two consecutive rings of one frame, `a` behind `b`. */
  private strip(a: Ring, b: Ring): void {
    const out = this.indices;
    if (a.count === b.count) {
      const n = a.count;
      for (let k = 0; k < n; k++) {
        const k1 = (k + 1) % n;
        out.push(a.first + k, a.first + k1, b.first + k);
        out.push(a.first + k1, b.first + k1, b.first + k);
      }
      return;
    }
    bridgeLoops(ringLoop(a), ringLoop(b), out);
  }

  /**
   * The hemisphere over a ring at the path's free end: rings of fewer and fewer vertices towards a pole, on a sphere
   * that is the equator's `ringScale` larger than the end's, so that the cap starts where the tube ends.
   * `side` is 1 for the path's last point and -1 for its first, where the pole lies against the tangent.
   */
  private cap(
    st: Station,
    equator: Ring,
    side: number,
    nx: number,
    ny: number,
    nz: number,
    bx: number,
    by: number,
    bz: number,
    type: number
  ): void {
    const tol = CHORD_FRACTION * tubeTolerance(st.r, this.options.tolerance);
    // On a sphere a triangle is off by its circumradius, not by the sagitta of its edges: edges of CAP_EDGE_FRACTION of
    // the arc whose sagitta is the tolerance keep the triangles of the bands between rings within it.
    const step = CAP_EDGE_FRACTION * 2 * Math.acos(Math.max(-1, 1 - tol / st.r));
    const rings = Math.max(MIN_CAP_RINGS, Math.ceil(Math.PI / 2 / step));
    const r = st.r * ringScale(equator.count);
    const px = side * st.tx,
      py = side * st.ty,
      pz = side * st.tz;
    let below = equator;
    for (let i = 1; i < rings; i++) {
      const phi = (i * Math.PI) / 2 / rings;
      const cphi = Math.cos(phi),
        sphi = Math.sin(phi);
      const n = Math.max(3, Math.ceil(((2 * Math.PI) / step) * cphi - 1e-9));
      const first = this.vertexCount;
      for (let k = 0; k < n; k++) {
        const a = (2 * Math.PI * k) / n;
        const ca = Math.cos(a),
          sa = Math.sin(a);
        const ux = cphi * (ca * nx + sa * bx) + sphi * px;
        const uy = cphi * (ca * ny + sa * by) + sphi * py;
        const uz = cphi * (ca * nz + sa * bz) + sphi * pz;
        this.push(st.x + r * ux, st.y + r * uy, st.z + r * uz, ux, uy, uz, type, st.r);
      }
      const ring = { first, count: n };
      if (side > 0) bridgeLoops(ringLoop(below), ringLoop(ring), this.indices);
      else bridgeLoops(ringLoop(ring), ringLoop(below), this.indices);
      below = ring;
    }
    const pole = this.push(st.x + r * px, st.y + r * py, st.z + r * pz, px, py, pz, type, st.r);
    for (let k = 0; k < below.count; k++) {
      const k1 = (k + 1) % below.count;
      if (side > 0) this.indices.push(below.first + k, below.first + k1, pole);
      else this.indices.push(below.first + k1, below.first + k, pole);
    }
  }
}

/** A ring as a loop: its vertices stand at equal angles from zero. */
function ringLoop(ring: Ring): Loop {
  const vertices = new Uint32Array(ring.count),
    angles = new Float64Array(ring.count);
  for (let k = 0; k < ring.count; k++) {
    vertices[k] = ring.first + k;
    angles[k] = (2 * Math.PI * k) / ring.count;
  }
  return { vertices, angles };
}
