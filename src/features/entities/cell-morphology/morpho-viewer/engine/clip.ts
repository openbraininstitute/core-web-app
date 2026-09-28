/**
 * Cutting a patch's mesh open where a tube takes over.
 *
 * A patch (hybrid.ts) is meshed from a piece of the skeleton whose sections are cut off a little beyond the complex
 * region, so its surface is closed: every cut-off section ends in a stub with a rounded cap. `clipMesh` removes each
 * stub at a plane across the section, where the surface is a plain tube again, and leaves a boundary loop in that
 * plane for the collar to the tube's first ring.
 *
 * Per plane:
 *  1. The plane is infinite and other parts of the patch cross it too, some of them close by (the other arm of a
 *     hairpin, or on a coarse stub the triangles around a vertex that dips across the plane). The cut is the one curve,
 *     of triangles connected through edges that meet the plane, that goes round the section's axis and comes closest
 *     to it; it has to stay within `reach` of it.
 *  2. The cut's vertices closer to the plane than `snap` are moved into it, so that no cut passes through the corner
 *     of a triangle and leaves a sliver. Not a vertex that the cut passes on both sides: there the boundary would
 *     touch itself.
 *  3. Triangles across the plane are replaced by their part on the near side. The new vertices, one per cut edge, and
 *     the snapped ones are put on the true surface by `project`: a simplified triangle's edge is a chord of it.
 *  4. What lies beyond the plane and hangs together with the cut is the stub: it is found by a flood fill over
 *     vertices on the far side and deleted. A fill that gets farther than `farLimit` from the axis point has leaked
 *     into the rest of the patch, which means the plane does not separate a stub, and the clip fails.
 *  5. The boundary edges in the plane are chained into the loop. Loop edges shorter than `minEdge` are collapsed unless
 *     that turns a triangle over, and those that run backwards around the axis, as one does wherever its triangle
 *     faces the axis: at a fold, or where a stub of a voxel in radius is cut in a rough polygon that need not be
 *     star-shaped about it. Of a backward edge the end that is out of order goes, into whichever neighbour on the loop
 *     the surface allows. All of them lie on the same curve, so nothing moves off the surface. Loop edges that cut the
 *     curve short by more than `maxSagitta` (the patch was simplified to a few long triangles there) are split at the
 *     curve.
 */

import { facing } from './refine';
import { cellKey } from './segments';

export interface ClipPlane {
  /** A point of the section's axis, in the coordinates of the field (not relative to the mesh centre). */
  cx: number;
  cy: number;
  cz: number;
  /** Unit normal of the plane, towards the side that is cut away. */
  nx: number;
  ny: number;
  nz: number;
  /** The cut stays within this distance of the axis point: more is not the cross-section of this section's tube. */
  reach: number;
  /** The stub lies within this distance of the axis point. */
  farLimit: number;
  /** Vertices within this distance of the plane are moved into it. */
  snap: number;
  /** Loop edges shorter than this are collapsed. */
  minEdge: number;
  /** Loop edges whose middle is farther than this from the surface are split. */
  maxSagitta: number;
}

export interface ClipInput {
  /** Relative to `center`. */
  positions: Float32Array;
  normals: Float32Array;
  vertexTypes: Uint8Array;
  /** Per vertex, the radius of the closest section (µm); a vertex the cut makes takes its near end's. */
  radii: Float32Array;
  indices: Uint32Array;
}

export interface ClipOutput extends ClipInput {
  /** Per plane, the boundary loop in the plane: vertices in the direction of the boundary edges of the kept triangles. */
  loops: Uint32Array[];
}

/**
 * Put a point of plane `plane` (field coordinates, in `p[0..2]`) onto the surface without leaving the plane, and its
 * unit normal into `p[3..5]`.
 */
export type ProjectInPlane = (plane: number, p: Float64Array) => void;

export function clipMesh(
  input: ClipInput,
  center: [number, number, number],
  planes: ClipPlane[],
  project: ProjectInPlane
): ClipOutput {
  let farthest = 0;
  for (const pl of planes) farthest = Math.max(farthest, pl.farLimit);
  const mesh = new WorkMesh(input, center, GRID_CELL_FACTOR * farthest);
  const loops: number[][] = [];
  for (let p = 0; p < planes.length; p++) {
    try {
      loops.push(mesh.clip(p, planes[p], project));
    } catch (e) {
      throw new Error(`${e instanceof Error ? e.message : e} (plane ${p + 1} of ${planes.length})`);
    }
  }
  return mesh.finish(loops);
}

/** Cells of the triangle grid, as a multiple of the largest `farLimit`. */
const GRID_CELL_FACTOR = 2;

class WorkMesh {
  private pos: number[];
  private nrm: number[];
  private typ: number[];
  private rad: number[];
  private tri: number[];
  private alive: boolean[];
  private grid = new Map<number, number[]>();
  private stamp: Uint32Array;
  private stampValue = 0;
  private tmp = new Float64Array(6);

  /** The mesh, with its triangles filed in a grid of cells of `cell` µm unless that is 0 (no planes). */
  constructor(
    input: ClipInput,
    private center: [number, number, number],
    private cell: number
  ) {
    this.pos = Array.from(input.positions);
    this.nrm = Array.from(input.normals);
    this.typ = Array.from(input.vertexTypes);
    this.rad = Array.from(input.radii);
    this.tri = Array.from(input.indices);
    this.alive = new Array(this.tri.length / 3).fill(true);
    this.stamp = new Uint32Array(this.tri.length / 3 + 1024);
    if (cell > 0) for (let t = 0; t < this.alive.length; t++) this.insert(t);
  }

  private insert(t: number): void {
    const P = this.pos,
      c = this.cell;
    let x0 = Infinity,
      y0 = Infinity,
      z0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity,
      z1 = -Infinity;
    for (let e = 0; e < 3; e++) {
      const v = 3 * this.tri[3 * t + e];
      if (P[v] < x0) x0 = P[v];
      if (P[v] > x1) x1 = P[v];
      if (P[v + 1] < y0) y0 = P[v + 1];
      if (P[v + 1] > y1) y1 = P[v + 1];
      if (P[v + 2] < z0) z0 = P[v + 2];
      if (P[v + 2] > z1) z1 = P[v + 2];
    }
    for (let k = Math.floor(z0 / c); k <= Math.floor(z1 / c); k++) {
      for (let j = Math.floor(y0 / c); j <= Math.floor(y1 / c); j++) {
        for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) {
          const key = cellKey(i, j, k);
          const list = this.grid.get(key);
          if (list) list.push(t);
          else this.grid.set(key, [t]);
        }
      }
    }
  }

  /** Live triangles listed in the grid cells within `radius` of a point (relative to the centre): all that come that near, and more. */
  private near(x: number, y: number, z: number, radius: number): number[] {
    const c = this.cell;
    if (this.stamp.length < this.alive.length) {
      const grown = new Uint32Array(2 * this.alive.length);
      grown.set(this.stamp);
      this.stamp = grown;
    }
    const mark = ++this.stampValue;
    const out: number[] = [];
    for (let k = Math.floor((z - radius) / c); k <= Math.floor((z + radius) / c); k++) {
      for (let j = Math.floor((y - radius) / c); j <= Math.floor((y + radius) / c); j++) {
        for (let i = Math.floor((x - radius) / c); i <= Math.floor((x + radius) / c); i++) {
          const list = this.grid.get(cellKey(i, j, k));
          if (!list) continue;
          for (const t of list) {
            if (!this.alive[t] || this.stamp[t] === mark) continue;
            this.stamp[t] = mark;
            out.push(t);
          }
        }
      }
    }
    return out;
  }

  /** A new vertex of the type and radius of vertex `like`, for `place` to put on the surface. */
  private addVertex(like: number): number {
    const v = this.typ.length;
    this.pos.push(0, 0, 0);
    this.nrm.push(0, 0, 0);
    this.typ.push(this.typ[like]);
    this.rad.push(this.rad[like]);
    return v;
  }

  private addTriangle(a: number, b: number, c: number): number {
    if (a === b || b === c || a === c) return -1;
    const t = this.alive.length;
    this.tri.push(a, b, c);
    this.alive.push(true);
    this.insert(t);
    return t;
  }

  clip(index: number, pl: ClipPlane, project: ProjectInPlane): number[] {
    const P = this.pos,
      T = this.tri;
    const [ox, oy, oz] = this.center;
    const cx = pl.cx - ox,
      cy = pl.cy - oy,
      cz = pl.cz - oz;
    const local = this.near(cx, cy, cz, pl.farLimit);

    // Signed distances of the local vertices, with those next to the plane snapped into it.
    const sigma = new Map<number, number>();
    const onPlane = new Set<number>();
    const distanceOf = (v: number): number => {
      let s = sigma.get(v);
      if (s === undefined) {
        s = (P[3 * v] - cx) * pl.nx + (P[3 * v + 1] - cy) * pl.ny + (P[3 * v + 2] - cz) * pl.nz;
        sigma.set(v, s);
      }
      return s;
    };
    /** The point on the surface, in the plane, for (x, y, z) relative to the centre: in `tmp`, in the field's coordinates and with the normal after them. */
    const onSurface = (x: number, y: number, z: number): Float64Array => {
      const tmp = this.tmp;
      tmp[0] = x + ox;
      tmp[1] = y + oy;
      tmp[2] = z + oz;
      project(index, tmp);
      return tmp;
    };
    /** Vertex v to the point `onSurface` has found. */
    const put = (v: number, q: Float64Array): void => {
      P[3 * v] = q[0] - ox;
      P[3 * v + 1] = q[1] - oy;
      P[3 * v + 2] = q[2] - oz;
      this.nrm[3 * v] = q[3];
      this.nrm[3 * v + 1] = q[4];
      this.nrm[3 * v + 2] = q[5];
    };
    const place = (v: number, x: number, y: number, z: number): void => put(v, onSurface(x, y, z));

    // The cut: the triangles that meet the plane, give or take the snapping distance, and hang together, through
    // edges that meet it too, in the one curve that goes round the section's axis and comes closest to it. Other
    // curves may cross the plane nearby and must not be touched, so distance alone will not do: the other arm of a
    // hairpin, or on a coarse stub the ring of triangles around a vertex that dips across the plane, which can come
    // closer to the axis than the section's own cut. Neither goes round the axis.
    const meetsPlane = (sa: number, sb: number): boolean =>
      (sa < pl.snap && sb > -pl.snap) || (sb < pl.snap && sa > -pl.snap);
    const edgeId = (a: number, b: number): number => Math.min(a, b) * 4294967296 + Math.max(a, b);
    const byEdge = new Map<number, number[]>();
    const reached = new Map<number, number>();
    const candidates: number[] = [];
    for (const t of local) {
      const v = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
      const sg = [distanceOf(v[0]), distanceOf(v[1]), distanceOf(v[2])];
      if (Math.min(sg[0], sg[1], sg[2]) >= pl.snap || Math.max(sg[0], sg[1], sg[2]) <= -pl.snap)
        continue;
      let closest = Infinity;
      for (let e = 0; e < 3; e++) {
        const e1 = (e + 1) % 3;
        if (!meetsPlane(sg[e], sg[e1])) continue;
        const key = edgeId(v[e], v[e1]);
        const list = byEdge.get(key);
        if (list) list.push(t);
        else byEdge.set(key, [t]);
        // Where the edge meets the plane, or its middle if it lies along it.
        const span = sg[e] - sg[e1];
        const w = Math.abs(span) > 1e-12 ? Math.min(1, Math.max(0, sg[e] / span)) : 0.5;
        const dx = P[3 * v[e]] + w * (P[3 * v[e1]] - P[3 * v[e]]) - cx;
        const dy = P[3 * v[e] + 1] + w * (P[3 * v[e1] + 1] - P[3 * v[e] + 1]) - cy;
        const dz = P[3 * v[e] + 2] + w * (P[3 * v[e1] + 2] - P[3 * v[e] + 2]) - cz;
        closest = Math.min(closest, dx * dx + dy * dy + dz * dz);
      }
      reached.set(t, closest);
      candidates.push(t);
    }
    // How many times the curve of these triangles goes round the axis. With every vertex taken to lie beyond the plane
    // or not, a triangle that has both holds one straight piece of the curve, from the edge where its boundary leaves
    // the far side to the one where it comes back; the pieces meet on the triangles' shared edges, and their angles
    // about the axis add up to whole turns.
    const windings = (curve: Set<number>): number => {
      let turn = 0;
      const ends = [0, 0, 0, 0, 0, 0];
      for (const t of curve) {
        let found = 0;
        for (let e = 0; e < 3; e++) {
          const a = T[3 * t + e],
            b = T[3 * t + ((e + 1) % 3)];
          const sa = distanceOf(a),
            sb = distanceOf(b);
          if (sa > 0 === sb > 0) continue;
          const w = sa / (sa - sb),
            k = sa > 0 ? 0 : 3;
          ends[k] = P[3 * a] + w * (P[3 * b] - P[3 * a]) - cx;
          ends[k + 1] = P[3 * a + 1] + w * (P[3 * b + 1] - P[3 * a + 1]) - cy;
          ends[k + 2] = P[3 * a + 2] + w * (P[3 * b + 2] - P[3 * a + 2]) - cz;
          found++;
        }
        if (found !== 2) continue;
        const [ax, ay, az, bx, by, bz] = ends;
        const cross =
          pl.nx * (ay * bz - az * by) + pl.ny * (az * bx - ax * bz) + pl.nz * (ax * by - ay * bx);
        turn += Math.atan2(cross, ax * bx + ay * by + az * bz);
      }
      return Math.round(Math.abs(turn) / (2 * Math.PI));
    };
    // Curve after curve, from the one that comes closest to the axis.
    candidates.sort((a, b) => reached.get(a)! - reached.get(b)!);
    const seen = new Set<number>();
    let component: Set<number> | null = null;
    for (const seed of candidates) {
      if (reached.get(seed)! > pl.reach * pl.reach) break;
      if (seen.has(seed)) continue;
      const curve = new Set<number>([seed]);
      for (const stack = [seed]; stack.length > 0; ) {
        const t = stack.pop()!;
        for (let e = 0; e < 3; e++) {
          const a = T[3 * t + e],
            b = T[3 * t + ((e + 1) % 3)];
          if (!meetsPlane(distanceOf(a), distanceOf(b))) continue;
          for (const nb of byEdge.get(edgeId(a, b)) ?? []) {
            if (curve.has(nb)) continue;
            curve.add(nb);
            stack.push(nb);
          }
        }
      }
      for (const t of curve) seen.add(t);
      if (windings(curve) === 1) {
        component = curve;
        break;
      }
    }
    if (component === null)
      throw new Error("clip: the surface does not cross the plane around the section's axis");
    for (const t of component) {
      if (reached.get(t)! > pl.reach * pl.reach)
        throw new Error("clip: the cut is wider than the section's tube");
    }

    // A vertex next to the plane that the cut passes twice: on a stub of a voxel or two in radius the simplified
    // surface may go to and fro across the plane around it. In the plane it would pinch the boundary, so it stays on
    // its side, and the finger that the cut makes around it goes with the loop's backward edges.
    const fan = new Map<number, number[]>();
    for (const t of component) {
      for (let e = 0; e < 3; e++) {
        const v = T[3 * t + e];
        if (Math.abs(distanceOf(v)) >= pl.snap) continue;
        let list = fan.get(v);
        if (!list) {
          list = [];
          fan.set(v, list);
        }
        list.push(T[3 * t + ((e + 1) % 3)], T[3 * t + ((e + 2) % 3)]);
      }
    }
    for (const [v, across] of fan) {
      // The fan around v is closed, so its far edges change sides an even number of times: twice for a plain cut.
      let changes = 0;
      for (let k = 0; k < across.length; k += 2) {
        const sa = distanceOf(across[k]),
          sb = distanceOf(across[k + 1]);
        if ((sa >= pl.snap && sb <= -pl.snap) || (sa <= -pl.snap && sb >= pl.snap)) changes++;
      }
      if (changes > 2) sigma.set(v, distanceOf(v) < 0 ? -pl.snap : pl.snap);
    }

    // Snap: the cut's vertices within `snap` of the plane move into it.
    for (const t of component) {
      for (let e = 0; e < 3; e++) {
        const v = T[3 * t + e];
        if (onPlane.has(v)) continue;
        const sv = distanceOf(v);
        if (Math.abs(sv) >= pl.snap) continue;
        place(v, P[3 * v] - sv * pl.nx, P[3 * v + 1] - sv * pl.ny, P[3 * v + 2] - sv * pl.nz);
        sigma.set(v, 0);
        onPlane.add(v);
      }
    }

    // Cut the triangles that cross the plane within reach.
    const cutVertex = new Map<number, number>();
    const cut = (a: number, b: number): number => {
      // The new vertex on edge a-b, shared by the two triangles on it.
      const key = edgeId(a, b);
      let v = cutVertex.get(key);
      if (v !== undefined) return v;
      const sa = distanceOf(a),
        sb = distanceOf(b);
      const w = sa / (sa - sb);
      // The near end's type and radius: that is the side that stays.
      v = this.addVertex(sa < 0 ? a : b);
      place(
        v,
        P[3 * a] + w * (P[3 * b] - P[3 * a]),
        P[3 * a + 1] + w * (P[3 * b + 1] - P[3 * a + 1]),
        P[3 * a + 2] + w * (P[3 * b + 2] - P[3 * a + 2])
      );
      sigma.set(v, 0);
      onPlane.add(v);
      cutVertex.set(key, v);
      return v;
    };

    const seeds: number[] = [];
    const kept: number[] = [];
    const crossing = new Set<number>();
    for (const t of component) {
      const v = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
      const sg = v.map(distanceOf);
      const pos = (sg[0] > 0 ? 1 : 0) + (sg[1] > 0 ? 1 : 0) + (sg[2] > 0 ? 1 : 0);
      const neg = (sg[0] < 0 ? 1 : 0) + (sg[1] < 0 ? 1 : 0) + (sg[2] < 0 ? 1 : 0);
      if (pos === 0) {
        kept.push(t);
        continue;
      }
      for (let e = 0; e < 3; e++) if (sg[e] > 0) seeds.push(v[e]);
      if (neg > 0) crossing.add(t);
      else this.alive[t] = false; // touches the plane from beyond
    }
    // No triangle need cross: a ring of vertices that lay next to the plane is in it now, with triangles on either side.
    if (seeds.length === 0) throw new Error('clip: nothing lies beyond the plane at the section');

    for (const t of crossing) {
      const v = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
      const s = v.map(distanceOf);
      this.alive[t] = false;
      // Walk the corners, keeping those on the near side or in the plane and adding the cut points between.
      const poly: number[] = [];
      for (let e = 0; e < 3; e++) {
        const e1 = (e + 1) % 3;
        if (s[e] <= 0) poly.push(v[e]);
        if (s[e] * s[e1] < 0) poly.push(cut(v[e], v[e1]));
      }
      if (poly.length === 3) kept.push(this.addTriangle(poly[0], poly[1], poly[2]));
      else if (poly.length === 4) {
        // Split along the shorter diagonal.
        const d = (i: number, j: number): number =>
          (P[3 * poly[i]] - P[3 * poly[j]]) ** 2 +
          (P[3 * poly[i] + 1] - P[3 * poly[j] + 1]) ** 2 +
          (P[3 * poly[i] + 2] - P[3 * poly[j] + 2]) ** 2;
        if (d(0, 2) <= d(1, 3))
          kept.push(
            this.addTriangle(poly[0], poly[1], poly[2]),
            this.addTriangle(poly[0], poly[2], poly[3])
          );
        else
          kept.push(
            this.addTriangle(poly[1], poly[2], poly[3]),
            this.addTriangle(poly[1], poly[3], poly[0])
          );
      }
    }

    // The stub: vertices beyond the plane that hang together with the cut, through the edges between two of them.
    const neighbours = new Map<number, number[]>();
    for (const t of local) {
      if (crossing.has(t)) continue;
      if (
        (distanceOf(T[3 * t]) > 0 ? 1 : 0) +
          (distanceOf(T[3 * t + 1]) > 0 ? 1 : 0) +
          (distanceOf(T[3 * t + 2]) > 0 ? 1 : 0) <
        2
      )
        continue;
      for (let e = 0; e < 3; e++) {
        const a = T[3 * t + e],
          b = T[3 * t + ((e + 1) % 3)];
        let list = neighbours.get(a);
        if (!list) {
          list = [];
          neighbours.set(a, list);
        }
        list.push(b);
        list = neighbours.get(b);
        if (!list) {
          list = [];
          neighbours.set(b, list);
        }
        list.push(a);
      }
    }
    const far = new Set<number>(seeds);
    const stack = [...far];
    const limit2 = pl.farLimit * pl.farLimit;
    while (stack.length > 0) {
      const v = stack.pop()!;
      const dx = P[3 * v] - cx,
        dy = P[3 * v + 1] - cy,
        dz = P[3 * v + 2] - cz;
      if (dx * dx + dy * dy + dz * dz > limit2)
        throw new Error('clip: the plane does not cut off a stub');
      for (const w of neighbours.get(v) ?? []) {
        if (far.has(w) || distanceOf(w) <= 0) continue;
        far.add(w);
        stack.push(w);
      }
    }
    for (const t of local) {
      if (!this.alive[t]) continue;
      if (far.has(T[3 * t]) || far.has(T[3 * t + 1]) || far.has(T[3 * t + 2]))
        this.alive[t] = false;
    }

    // The loop: boundary edges of the kept triangles between vertices in the plane.
    const live = kept.filter((t) => t >= 0 && this.alive[t]);
    return this.loop(live, onPlane, pl, onSurface, put);
  }

  /** Chain the boundary edges in the plane into one loop, collapse its short and backward edges, and split those that cut the curve short. */
  private loop(
    live: number[],
    onPlane: Set<number>,
    pl: ClipPlane,
    onSurface: (x: number, y: number, z: number) => Float64Array,
    put: (v: number, q: Float64Array) => void
  ): number[] {
    const T = this.tri,
      P = this.pos;
    const directed = new Set<number>();
    const edgeKey = (a: number, b: number): number => a * 4294967296 + b;
    const incident = new Map<number, number[]>();
    for (const t of live) {
      for (let e = 0; e < 3; e++) {
        const a = T[3 * t + e],
          b = T[3 * t + ((e + 1) % 3)];
        if (onPlane.has(a)) {
          let list = incident.get(a);
          if (!list) {
            list = [];
            incident.set(a, list);
          }
          list.push(t);
          if (onPlane.has(b)) directed.add(edgeKey(a, b));
        }
      }
    }
    const next = new Map<number, number>();
    for (const key of directed) {
      const a = Math.floor(key / 4294967296),
        b = key % 4294967296;
      if (directed.has(edgeKey(b, a))) continue;
      if (next.has(a)) throw new Error('clip: the boundary in the plane branches');
      next.set(a, b);
    }
    if (next.size < 3) throw new Error('clip: no boundary loop in the plane');
    const start = next.keys().next().value as number;
    const loop: number[] = [];
    for (let v = start, n = 0; ; n++) {
      loop.push(v);
      const w = next.get(v);
      if (w === undefined || n > next.size)
        throw new Error('clip: the boundary in the plane is not closed');
      if (w === start) break;
      v = w;
    }
    if (loop.length !== next.size)
      throw new Error('clip: more than one boundary loop in the plane');

    // The angle from one loop vertex to the next around the section's axis, and the way the loop goes round. The
    // vertices were put on the section's circle along rays from the axis, and the cut need not be star-shaped about
    // it: an edge runs backwards wherever its triangle faces the axis, which the collar cannot take.
    const [ox, oy, oz] = this.center;
    const cx = pl.cx - ox,
      cy = pl.cy - oy,
      cz = pl.cz - oz;
    const step = (a: number, b: number): number => {
      const ax = P[3 * a] - cx,
        ay = P[3 * a + 1] - cy,
        az = P[3 * a + 2] - cz;
      const bx = P[3 * b] - cx,
        by = P[3 * b + 1] - cy,
        bz = P[3 * b + 2] - cz;
      const cross =
        pl.nx * (ay * bz - az * by) + pl.ny * (az * bx - ax * bz) + pl.nz * (ax * by - ay * bx);
      return Math.atan2(cross, ax * bx + ay * by + az * bz);
    };
    let turn = 0;
    for (let i = 0; i < loop.length; i++) turn += step(loop[i], loop[(i + 1) % loop.length]);

    // Collapse loop edges that are short or run backwards. Of a short edge the second vertex goes, into the first, or
    // else the first into the second, but not if a triangle that it takes along would turn over. The vertex moves along
    // the loop by up to `minEdge`, which is several triangles where the cut runs through small ones: on a thick stem
    // that a slab's border crosses lengthwise, the simplifier keeps the raw triangles along the border and fans slivers
    // into them, and a sliver's corner moved past the line of its other two faces inwards. A short edge that stays does
    // no harm. Of a backward edge the vertex that goes is the one out of order, whose neighbours on the loop run
    // forwards without it: the second if they do, else the first if they do, else the second all the same, and what is
    // left of the fold comes next. It goes into the vertex at the other end of the edge or, if the surface does not
    // allow that, into its neighbour on the other side: the edge's one triangle faces the axis, and the vertex at its
    // apex may have no other neighbours than the edge's ends and one that they then share. Only if it cannot go either
    // way does the other end go. Every loop vertex lies on the same curve, so nothing moves off the surface.
    const dist = (a: number, b: number): number =>
      Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]);
    const forward = (a: number, b: number): boolean => step(a, b) * turn > 0;
    const ringOf = (v: number): Set<number> => {
      const ring = new Set<number>();
      for (const t of incident.get(v) ?? []) {
        if (!this.alive[t]) continue;
        for (let e = 0; e < 3; e++) if (T[3 * t + e] !== v) ring.add(T[3 * t + e]);
      }
      return ring;
    };
    // Whether a triangle of `gone` that stays, one that does not have `into`, would face against the normals at its
    // corners with `into` in the place of `gone`, or have no area.
    const turnsOver = (gone: number, into: number): boolean => {
      for (const t of incident.get(gone) ?? []) {
        if (!this.alive[t]) continue;
        const c = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
        if (c.includes(into)) continue;
        c[c.indexOf(gone)] = into;
        if (facing(P, this.nrm, 3 * c[0], 3 * c[1], 3 * c[2]) <= 0) return true;
      }
      return false;
    };
    // Loop vertex `gone` into `into`, next to it on the loop, if the surface allows: its triangles move to `into`.
    // With `facing`, only if none of them turns over.
    const merge = (gone: number, into: number, facing = false): boolean => {
      const ri = ringOf(into),
        rg = ringOf(gone);
      let common = 0;
      for (const v of rg) if (ri.has(v)) common++;
      // A boundary edge has one triangle, so its ends share one neighbour; more would fold the surface.
      if (common !== 1) return false;
      if (facing && turnsOver(gone, into)) return false;
      for (const t of incident.get(gone) ?? []) {
        if (!this.alive[t]) continue;
        for (let e = 0; e < 3; e++) if (T[3 * t + e] === gone) T[3 * t + e] = into;
        if (T[3 * t] === T[3 * t + 1] || T[3 * t + 1] === T[3 * t + 2] || T[3 * t] === T[3 * t + 2])
          this.alive[t] = false;
        else incident.get(into)!.push(t);
      }
      loop.splice(loop.indexOf(gone), 1);
      return true;
    };
    for (let changed = true; changed && loop.length > 3; ) {
      changed = false;
      for (let i = 0; i < loop.length && loop.length > 3; i++) {
        const n = loop.length;
        const p = loop[(i + n - 1) % n],
          u = loop[i],
          w = loop[(i + 1) % n],
          x = loop[(i + 2) % n];
        let gone = w;
        if (forward(u, w)) {
          if (dist(u, w) >= pl.minEdge) continue;
          if (!merge(w, u, true)) {
            if (!merge(u, w, true)) continue;
            gone = u;
          }
        } else {
          const tries: [number, number][] =
            !forward(u, x) && forward(p, w)
              ? [
                  [u, w],
                  [u, p],
                  [w, u],
                  [w, x],
                ]
              : [
                  [w, u],
                  [w, x],
                  [u, w],
                  [u, p],
                ];
          const done = tries.find(([g, into]) => merge(g, into));
          if (done === undefined) continue;
          gone = done[0];
        }
        changed = true;
        // Look again at the edge that now spans the vertex's place.
        i = gone === w ? i - 1 : Math.max(-1, i - 2);
      }
    }

    // Split loop edges that cut the curve short: a vertex on the curve at the edge's middle, and the edge's one
    // triangle in two.
    for (let i = 0; i < loop.length; i++) {
      const u = loop[i],
        w = loop[(i + 1) % loop.length];
      const mx = 0.5 * (P[3 * u] + P[3 * w]),
        my = 0.5 * (P[3 * u + 1] + P[3 * w + 1]),
        mz = 0.5 * (P[3 * u + 2] + P[3 * w + 2]);
      const q = onSurface(mx, my, mz);
      if (Math.hypot(q[0] - ox - mx, q[1] - oy - my, q[2] - oz - mz) <= pl.maxSagitta) continue;
      // The edge's one triangle, and its corner across the edge.
      let t = -1,
        x = -1;
      for (const c of incident.get(u) ?? []) {
        if (!this.alive[c]) continue;
        for (let e = 0; e < 3 && t < 0; e++) {
          if (T[3 * c + e] === u && T[3 * c + ((e + 1) % 3)] === w) {
            t = c;
            x = T[3 * c + ((e + 2) % 3)];
          }
        }
        if (t >= 0) break;
      }
      if (t < 0) continue;
      const v = this.addVertex(u);
      put(v, q);
      this.alive[t] = false;
      const t1 = this.addTriangle(u, v, x),
        t2 = this.addTriangle(v, w, x);
      incident.get(u)!.push(t1);
      incident.set(v, [t1, t2]);
      (incident.get(w) ?? []).push(t2);
      loop.splice(i + 1, 0, v);
      // Look at the first half again: it may still be too long.
      i--;
    }
    return loop;
  }

  /** Drop the dead triangles and the vertices nothing uses. */
  finish(loops: number[][]): ClipOutput {
    const T = this.tri;
    const nv = this.typ.length;
    const remap = new Int32Array(nv).fill(-1);
    let count = 0,
      triangles = 0;
    for (let t = 0; t < this.alive.length; t++) {
      if (!this.alive[t]) continue;
      triangles++;
      for (let e = 0; e < 3; e++) if (remap[T[3 * t + e]] < 0) remap[T[3 * t + e]] = count++;
    }
    const positions = new Float32Array(3 * count),
      normals = new Float32Array(3 * count);
    const vertexTypes = new Uint8Array(count),
      radii = new Float32Array(count);
    for (let v = 0; v < nv; v++) {
      const r = remap[v];
      if (r < 0) continue;
      for (let c = 0; c < 3; c++) {
        positions[3 * r + c] = this.pos[3 * v + c];
        normals[3 * r + c] = this.nrm[3 * v + c];
      }
      vertexTypes[r] = this.typ[v];
      radii[r] = this.rad[v];
    }
    const indices = new Uint32Array(3 * triangles);
    let o = 0;
    for (let t = 0; t < this.alive.length; t++) {
      if (!this.alive[t]) continue;
      for (let e = 0; e < 3; e++) indices[o++] = remap[T[3 * t + e]];
    }
    return {
      positions,
      normals,
      vertexTypes,
      radii,
      indices,
      loops: loops.map((loop) => {
        const out = new Uint32Array(loop.length);
        for (let i = 0; i < loop.length; i++) {
          if (remap[loop[i]] < 0) throw new Error('clip: a loop vertex lost its triangles');
          out[i] = remap[loop[i]];
        }
        return out;
      }),
    };
  }
}
