/**
 * Path distances to the soma (µm), for the Distance colours: along the tree from the soma, as morphoviewer measures
 * them, but with every soma point at 0 (morphoviewer walks a contour soma too). A point off the skeleton, such as a
 * mesh vertex, takes the distance of the closest point on a segment of its own type, so that where an axon crosses a
 * dendrite each keeps its own.
 */

import { CellLists, type Closest, closestOnSegment } from './segments';
import { type Morphology, SWC_SOMA } from './swc';

import type { SkeletonData } from './protocol';

/** Path distance of every node: 0 on the soma and at a root, and a loop in a broken file cut where it closes. */
export function nodeDistances({
  nodeCount: n,
  xyz,
  parent,
  types,
}: Pick<Morphology, 'nodeCount' | 'xyz' | 'parent' | 'types'>): Float64Array {
  const UNKNOWN = -1,
    ON_CHAIN = -2;
  const dist = new Float64Array(n).fill(UNKNOWN);
  const chain: number[] = [];
  for (let i = 0; i < n; i++) {
    let j = i;
    while (dist[j] === UNKNOWN && types[j] !== SWC_SOMA && parent[j] >= 0) {
      dist[j] = ON_CHAIN;
      chain.push(j);
      j = parent[j];
    }
    if (dist[j] === UNKNOWN) dist[j] = 0;
    for (let k = chain.pop(); k !== undefined; k = chain.pop()) {
      const p = parent[k];
      dist[k] =
        dist[p] < 0
          ? 0
          : dist[p] +
            Math.hypot(
              xyz[3 * k] - xyz[3 * p],
              xyz[3 * k + 1] - xyz[3 * p + 1],
              xyz[3 * k + 2] - xyz[3 * p + 2]
            );
    }
  }
  return dist;
}

/** Rings of grid cells searched around a point before its type's segments are searched one by one. */
const MAX_RING = 2;

/** Path distances of points, from the segments of the morphology's sections. */
export class PathDistances {
  /** The farthest node: the end of the ramp. */
  readonly max: number;
  /** ax, ay, az, bx, by, bz per segment, relative to the mesh's centre. */
  private readonly segs: Float64Array;
  /** The path distance at each segment's two ends. */
  private readonly ends: Float64Array;
  private readonly types: Uint8Array;
  private readonly present = new Set<number>();
  private readonly cells: CellLists;
  private readonly size: number;
  /** How far past its segment's box each entry of the grid reaches: a point that close to a segment finds it in its own cell. */
  private readonly pad: number;
  private readonly lo: [number, number, number];
  private readonly hi: [number, number, number];
  private readonly closest: Closest = { d: 0, s: 0, t: 0 };
  /** The closest segment so far of the point being measured: how far it is, and the distance there. */
  private readonly best = { d: Infinity, value: 0 };

  constructor(m: Morphology, center: [number, number, number]) {
    const nodes = nodeDistances(m);
    let max = 0;
    for (let i = 0; i < m.nodeCount; i++) max = Math.max(max, nodes[i]);
    this.max = max;

    let count = 0;
    for (const s of m.sections) count += s.nodes.length - 1;
    this.segs = new Float64Array(6 * count);
    this.ends = new Float64Array(2 * count);
    this.types = new Uint8Array(count);
    const radii = new Float64Array(count);
    let k = 0;
    for (const s of m.sections) {
      const p = s.points;
      for (let i = 1; i < s.nodes.length; i++, k++) {
        for (let c = 0; c < 3; c++) {
          this.segs[6 * k + c] = p[4 * (i - 1) + c] - center[c];
          this.segs[6 * k + 3 + c] = p[4 * i + c] - center[c];
        }
        this.ends[2 * k] = nodes[s.nodes[i - 1]];
        this.ends[2 * k + 1] = nodes[s.nodes[i]];
        this.types[k] = s.type;
        radii[k] = Math.max(p[4 * i - 1], p[4 * i + 3]);
      }
      this.present.add(s.type);
    }

    // A vertex lies about a radius from its segment, so most of them find theirs in their own cell.
    radii.sort();
    this.pad = 1.5 * (radii[Math.floor(0.95 * (count - 1))] ?? 0) + 1;
    this.size = Math.min(50, Math.max(2, 2 * this.pad));
    const range = new Int32Array(6 * count);
    this.lo = [Infinity, Infinity, Infinity];
    this.hi = [-Infinity, -Infinity, -Infinity];
    for (let s = 0; s < count; s++) {
      for (let c = 0; c < 3; c++) {
        const a = this.segs[6 * s + c],
          b = this.segs[6 * s + 3 + c];
        range[6 * s + c] = Math.floor((Math.min(a, b) - this.pad) / this.size);
        range[6 * s + 3 + c] = Math.floor((Math.max(a, b) + this.pad) / this.size);
        this.lo[c] = Math.min(this.lo[c], range[6 * s + c]);
        this.hi[c] = Math.max(this.hi[c], range[6 * s + 3 + c]);
      }
    }
    this.cells = new CellLists(range, count);
  }

  /** Of each point, packed x, y, z relative to the mesh's centre, by its SWC type. */
  atPoints(positions: ArrayLike<number>, types: ArrayLike<number>): Float32Array {
    const out = new Float32Array(types.length);
    for (let i = 0; i < out.length; i++) {
      out[i] = this.at(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2], types[i]);
    }
    return out;
  }

  /** Of the middle of each segment of a skeleton overlay: one colour per segment. */
  ofSkeleton({ positions: p, types, count }: SkeletonData): Float32Array {
    const out = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const o = 6 * i;
      out[i] = this.at(
        (p[o] + p[o + 3]) / 2,
        (p[o + 1] + p[o + 4]) / 2,
        (p[o + 2] + p[o + 5]) / 2,
        types[i]
      );
    }
    return out;
  }

  private at(x: number, y: number, z: number, type: number): number {
    if (type === SWC_SOMA || !this.present.has(type)) return 0;
    const best = this.best;
    best.d = Infinity;
    best.value = 0;
    const ci = Math.floor(x / this.size),
      cj = Math.floor(y / this.size),
      ck = Math.floor(z / this.size);
    for (let ring = 0; ring <= MAX_RING; ring++) {
      this.searchRing(ci, cj, ck, ring, x, y, z, type);
      // Every segment within `pad + ring · size` of the point has an entry in a cell of these rings.
      if (best.d <= this.pad + ring * this.size) return best.value;
    }
    for (let s = 0; s < this.types.length; s++) {
      if (this.types[s] === type) this.test(s, x, y, z);
    }
    return best.value;
  }

  private searchRing(
    ci: number,
    cj: number,
    ck: number,
    ring: number,
    x: number,
    y: number,
    z: number,
    type: number
  ): void {
    const cells = this.cells;
    const { lo, hi } = this;
    for (let k = Math.max(ck - ring, lo[2]); k <= Math.min(ck + ring, hi[2]); k++) {
      for (let j = Math.max(cj - ring, lo[1]); j <= Math.min(cj + ring, hi[1]); j++) {
        for (let i = Math.max(ci - ring, lo[0]); i <= Math.min(ci + ring, hi[0]); i++) {
          if (Math.max(Math.abs(i - ci), Math.abs(j - cj), Math.abs(k - ck)) !== ring) continue;
          for (let e = cells.head[cells.bucket(i, j, k)]; e >= 0; e = cells.next[e]) {
            if (cells.cell[3 * e] !== i || cells.cell[3 * e + 1] !== j) continue;
            if (cells.cell[3 * e + 2] !== k) continue;
            const s = cells.item[e];
            if (this.types[s] === type) this.test(s, x, y, z);
          }
        }
      }
    }
  }

  private test(s: number, x: number, y: number, z: number): void {
    const c = this.closest;
    const best = this.best;
    closestOnSegment(x, y, z, this.segs, 6 * s, this.segs, 6 * s + 3, c);
    if (c.d < best.d) {
      best.d = c.d;
      best.value = this.ends[2 * s] + c.s * (this.ends[2 * s + 1] - this.ends[2 * s]);
    }
  }
}
