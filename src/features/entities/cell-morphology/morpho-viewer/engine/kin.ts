/**
 * Which parts of the skeleton blend with which.
 *
 * The field rounds a branch point by adding up the kernels of the sections that meet there. Added up without
 * distinction, they also act on whatever merely passes by: an axon within a dendrite's band is swollen towards it, and
 * joined to it if the gap is small; a branch that comes back to its parent is webbed to it. So the skeleton is divided
 * into parts, and the parts into families:
 *
 * - The sections that meet at a fork blend from the fork on for as long as they are within each other's reach (the
 *   soma and its stems likewise): that much of each is the fork's *star*. It ends where the section has been out of
 *   the others' bands for a band's width, and at `STAR_MAX` band half-widths whatever happens: two branches that run
 *   side by side for tens of microns are two fibres. Stars that meet on a section too short to hold both are one.
 * - Where fibres that are not of one star *touch* (`weldContacts`), they are of one surface whatever the field does,
 *   and the sum makes a better one of it than a union would: two tubes that lie against each other are apart by less
 *   than a voxel over a long way, and a union on a grid flickers between joined and apart all along it, a handle for
 *   every flicker. So each is cut where it comes within reach of the other and where it has left it again, and the
 *   two parts between, a *weld*, blend.
 * - What is left of a section is *shafts*, each a family of its own.
 *
 * The field is
 *
 *     F(p) = max over families of Σ over the family's parts of g(u)
 *
 * so parts of one family blend as before, and the rest has no effect on each other short of touching, which is what
 * the welds are for. Cutting a section into parts leaves no trace: within a section the distance is a minimum over
 * segments, which is a union already, so the maximum over a part and the next is the section's own kernel wherever
 * nothing else adds to it, which is where the cuts are.
 */

import { bandHalfWidth } from './field';
import { type Closest, closestOnSegment, segmentAt } from './segments';
import { type Morphology, type Section, SWC_SOMA } from './swc';

import type { FieldPrim, Prim } from './mesher';

/** Stands for the soma in `Prim.ends`: the stems start there, whichever of the soma's points they are attached to. */
export const SOMA_NODE = -2;
/** A star reaches at least this far along each section, in band half-widths of the thickest section at the fork, */
const STAR_MIN = 1;
/** and no farther than this, however long its sections go on blending. */
export const STAR_MAX = 8;
/** A cut moves on to the next skeleton point if that is no farther than this many band half-widths: a cut elsewhere is one more joint for the field to splat. */
const CUT_SNAP = 1;
/** Parts shorter than this are left out, µm. */
const PART_EPS = 1e-9;
/** How far along the other fibre from where the two touch a weld looks for it, in band half-widths beyond the way it has gone itself. */
const WELD_WINDOW = 8;

export interface Kinship {
  /** Per primitive: the arc lengths at which it is cut, from 0 to its length. Part k lies between the k-th and the next. */
  bounds: Float64Array[];
  /** Per primitive: the family of every part. */
  families: Int32Array[];
  /** Per family, numbered from 0: 1 if parts of several sections add up in it (a star, a weld), 0 for a shaft. */
  social: Uint8Array;
  /** Per primitive: the arc length at every point of its chain of segments (`chainArcs`). */
  arcs: Float64Array[];
}

/** Where two fibres that do not blend touch: the primitives and the arc lengths. */
export interface Contact {
  p: number;
  sp: number;
  q: number;
  sq: number;
}

type Band = (r: number, beta: number) => number;
type Margin = (r: number) => number;

/** `Prim.ends` of a section: the nodes at its two ends, the first `SOMA_NODE` if it is one of the soma's and there is a soma to grow out of. */
export function sectionEnds(m: Morphology, sec: Section, hasSoma: boolean): [number, number] {
  const first = sec.nodes[0];
  return [
    hasSoma && m.types[first] === SWC_SOMA ? SOMA_NODE : first,
    sec.nodes[sec.nodes.length - 1],
  ];
}

/**
 * How near the axes of two fibres must come for the band of one to reach the surface of the other, give or take a
 * margin. Nearer than that, the two have a say in each other's surface if they blend; the stars and the welds end
 * where the layout (classify.ts) stops seeing it, so both go by this.
 */
export function reachOf(
  ra: number,
  bandA: number,
  rb: number,
  bandB: number,
  margin: number
): number {
  return Math.max(ra + bandB, rb + bandA) + margin;
}

/** Scratch for `withinReach`. */
const nearest: Closest = { d: 0, s: 0, t: 0 };

/** The root of a in a forest of parents, with the way to it halved. */
export function findRoot(parent: number[] | Int32Array, a: number): number {
  let root = a;
  while (parent[root] !== root) {
    parent[root] = parent[parent[root]];
    root = parent[root];
  }
  return root;
}

/** Join the trees of a and b in a forest of parents: a's root goes under b's. */
export function joinRoots(parent: number[] | Int32Array, a: number, b: number): void {
  const ra = findRoot(parent, a);
  const rb = findRoot(parent, b);
  if (ra !== rb) parent[ra] = rb;
}

/** Arc length at every point of a primitive's chain of segments. */
export function chainArcs(segs: Float64Array): Float64Array {
  const n = segs.length / 8;
  const arc = new Float64Array(n + 1);
  for (let k = 0; k < n; k++) {
    const o = 8 * k;
    arc[k + 1] =
      arc[k] +
      Math.hypot(segs[o + 4] - segs[o], segs[o + 5] - segs[o + 1], segs[o + 6] - segs[o + 2]);
  }
  return arc;
}

/** x, y, z, r at arc length a of a chain. */
function pointAt(segs: Float64Array, arc: Float64Array, a: number, out: Float64Array): void {
  const k = segmentAt(arc, a);
  const len = arc[k + 1] - arc[k],
    u = len > 0 ? Math.min(1, Math.max(0, (a - arc[k]) / len)) : 0;
  for (let c = 0; c < 4; c++)
    out[c] = segs[8 * k + c] + (segs[8 * k + 4 + c] - segs[8 * k + c]) * u;
}

/**
 * Whether a fibre of radius r at a point is within reach of primitive Q between the arc lengths lo and hi: one's band
 * reaches the other's surface, give or take the margin.
 */
function withinReach(
  x: number,
  y: number,
  z: number,
  r: number,
  beta: number,
  Q: Prim,
  arc: Float64Array,
  lo: number,
  hi: number,
  band: Band,
  margin: Margin
): boolean {
  const s = Q.segs,
    own = band(r, beta),
    slack = margin(r);
  for (let k = segmentAt(arc, lo); k + 1 < arc.length && arc[k] <= hi; k++) {
    const o = 8 * k;
    const len = arc[k + 1] - arc[k];
    // The part of the segment between lo and hi, as shares of it.
    const t0 = len > 0 ? Math.max(0, (lo - arc[k]) / len) : 0,
      t1 = len > 0 ? Math.min(1, (hi - arc[k]) / len) : 1;
    if (t1 < t0) continue;
    closestOnSegment(x, y, z, s, o, s, o + 4, nearest, t0, t1);
    const rq = s[o + 3] + (s[o + 7] - s[o + 3]) * nearest.s;
    if (nearest.d < reachOf(r, own, rq, band(rq, Q.beta), Math.max(slack, margin(rq)))) return true;
  }
  return false;
}

/**
 * The stars of a set of primitives, and the shafts between them. `band(r, beta)` is the half-width of the band of a
 * fibre of radius r, and `margin(r)` what two such fibres must be apart by beyond their bands to count as apart: a
 * voxel. Primitives that do not say where they are attached (`Prim.ends`) are one family, which is the field as it
 * was before there were families; if only some do not, those are shafts.
 */
export function kinship(prims: Prim[], band: Band, margin: Margin): Kinship;
/** With bands and margins of one voxel h throughout. */
export function kinship(prims: Prim[], h: number): Kinship;
export function kinship(prims: Prim[], bandOrVoxel: Band | number, marginOf?: Margin): Kinship {
  const h = bandOrVoxel;
  const band: Band = typeof h === 'number' ? (r, beta) => bandHalfWidth(r, beta, h) : h;
  const margin: Margin = typeof h === 'number' ? () => h : marginOf!;
  const n = prims.length;
  const arcs = prims.map((P) => chainArcs(P.segs));
  const lengthOf = (p: number): number => arcs[p][arcs[p].length - 1];
  if (!prims.some((p) => p.ends !== undefined)) {
    return {
      bounds: prims.map((_, p) => Float64Array.of(0, lengthOf(p))),
      families: prims.map(() => Int32Array.of(0)),
      social: Uint8Array.of(1),
      arcs,
    };
  }

  // Forks: the nodes at which two or more primitives end. The soma is a primitive that ends at SOMA_NODE.
  const forkOf = new Map<number, number>();
  const members: number[] = [],
    radius: number[] = [];
  let somaPrim = -1;
  const forkAt = new Int32Array(2 * n).fill(-1);
  for (let p = 0; p < n; p++) {
    const ends = prims[p].ends;
    if (ends === undefined) continue;
    const s = prims[p].segs;
    const soma = ends[0] === SOMA_NODE && ends[1] === SOMA_NODE;
    if (soma) somaPrim = p;
    for (let e = 0; e < (soma ? 1 : 2); e++) {
      let f = forkOf.get(ends[e]);
      if (f === undefined) {
        f = members.length;
        forkOf.set(ends[e], f);
        members.push(0);
        radius.push(0);
      }
      members[f]++;
      if (!soma) radius[f] = Math.max(radius[f], e === 0 ? s[3] : s[s.length - 1]);
      forkAt[2 * p + e] = f;
    }
  }
  const somaFork = forkOf.get(SOMA_NODE) ?? -1;
  const somaBand = somaPrim >= 0 ? band(prims[somaPrim].segs[3], prims[somaPrim].beta) : 0;
  /** The band half-width that the star at an end of primitive p is measured in; 0 where nothing else is attached. */
  const unit = (p: number, e: number): number => {
    const f = forkAt[2 * p + e];
    if (f < 0 || members[f] < 2) return 0;
    const s = prims[p].segs;
    return band(
      f === somaFork && somaPrim >= 0 ? (e === 0 ? s[3] : s[s.length - 1]) : radius[f],
      prims[p].beta
    );
  };
  /** What comes before that: the soma's own band, for a stem. */
  const base = (p: number, e: number): number =>
    forkAt[2 * p + e] === somaFork && somaPrim >= 0 ? somaBand : 0;

  const parent = Int32Array.from(members, (_, f) => f);
  const find = (f: number): number => findRoot(parent, f);
  // Stars at their least, and the sections too short even for those: their two forks are one star.
  // reach[2 p + e]: how far the star at end e of p goes along p; whole[p]: p lies in one star altogether.
  const reach = new Float64Array(2 * n);
  const whole = new Uint8Array(n);
  const merge = (p: number): void => {
    whole[p] = 1;
    if (unit(p, 0) > 0 && unit(p, 1) > 0) joinRoots(parent, forkAt[2 * p], forkAt[2 * p + 1]);
  };
  for (let p = 0; p < n; p++) {
    if (prims[p].ends === undefined || p === somaPrim) continue;
    for (let e = 0; e < 2; e++)
      reach[2 * p + e] = unit(p, e) > 0 ? base(p, e) + STAR_MIN * unit(p, e) : 0;
    if (
      (reach[2 * p] > 0 || reach[2 * p + 1] > 0) &&
      reach[2 * p] + reach[2 * p + 1] >= lengthOf(p)
    )
      merge(p);
  }

  // The ends of sections by star, to look for what each end's section blends with.
  const byStar = new Map<number, number[]>();
  for (let p = 0; p < n; p++) {
    if (prims[p].ends === undefined || p === somaPrim) continue;
    for (let e = 0; e < 2; e++) {
      if (unit(p, e) === 0 || (whole[p] === 1 && e === 1 && unit(p, 0) > 0)) continue;
      const root = find(forkAt[2 * p + e]);
      const list = byStar.get(root);
      if (list) list.push(2 * p + e);
      else byStar.set(root, [2 * p + e]);
    }
  }
  const at = new Float64Array(4);
  const withSoma = (p: number, e: number): boolean =>
    somaPrim >= 0 && find(forkAt[2 * p + e]) === find(somaFork);
  /** The most that the star at an end may reach. What is of one star with the soma has the soma's band to get out of first, stem or not: a stem may fork inside it. */
  const most = (p: number, e: number): number =>
    Math.min(lengthOf(p), (withSoma(p, e) ? somaBand : 0) + STAR_MAX * unit(p, e));
  for (const ends of byStar.values()) {
    for (const pe of ends) {
      const p = pe >> 1,
        e = pe & 1;
      if (whole[p] === 1) continue;
      const w = unit(p, e),
        far = most(p, e);
      // Along the section in steps of a quarter of the band: as far as it blends with something, and a band farther.
      let last = 0;
      const L = lengthOf(p);
      for (let t = 0; t <= far && t - last <= w; t += 0.25 * w) {
        pointAt(prims[p].segs, arcs[p], e === 0 ? t : L - t, at);
        const x = at[0],
          y = at[1],
          z = at[2],
          r = at[3];
        // The whole soma: its sphere, of no length, which a range from 0 would pass over, and the necks to its stems.
        let blending =
          withSoma(p, e) &&
          withinReach(
            x,
            y,
            z,
            r,
            prims[p].beta,
            prims[somaPrim],
            arcs[somaPrim],
            -Infinity,
            Infinity,
            band,
            margin
          );
        for (let i = 0; i < ends.length && !blending; i++) {
          const q = ends[i] >> 1,
            f = ends[i] & 1;
          if (q === p) continue;
          // The other section as far as its own star may go.
          const Lq = lengthOf(q),
            upTo = whole[q] === 1 ? Lq : most(q, f);
          blending = withinReach(
            x,
            y,
            z,
            r,
            prims[p].beta,
            prims[q],
            arcs[q],
            f === 0 ? 0 : Lq - upTo,
            f === 0 ? upTo : Lq,
            band,
            margin
          );
        }
        if (blending) last = t;
      }
      reach[pe] = Math.min(far, Math.max(reach[pe], last + w));
    }
  }

  // Where the stars end.
  const cutsOf: [number, number][] = [];
  for (let p = 0; p < n; p++) {
    const L = lengthOf(p);
    let a = 0,
      b = L;
    if (prims[p].ends !== undefined && p !== somaPrim && whole[p] === 0) {
      // On to the next skeleton point, if that is near: the section has nothing in reach there either.
      const arc = arcs[p];
      a = reach[2 * p];
      b = L - reach[2 * p + 1];
      if (a > 0) {
        for (let k = 1; k + 1 < arc.length && arc[k] - a <= CUT_SNAP * unit(p, 0); k++) {
          if (arc[k] < a) continue;
          a = arc[k];
          break;
        }
      }
      if (b < L) {
        for (let k = arc.length - 2; k >= 1 && b - arc[k] <= CUT_SNAP * unit(p, 1); k--) {
          if (arc[k] > b) continue;
          b = arc[k];
          break;
        }
      }
      if (a >= b && (reach[2 * p] > 0 || reach[2 * p + 1] > 0)) merge(p);
    }
    cutsOf.push([a, b]);
  }
  // Stars are numbered by their forks, shafts one by one; `normalised` numbers them all afresh.
  const id = new Int32Array(members.length).fill(-1);
  let count = 0;
  const star = (p: number, e: number): number => {
    if (unit(p, e) === 0) return -1;
    const root = find(forkAt[2 * p + e]);
    if (id[root] < 0) id[root] = count++;
    return id[root];
  };
  const bounds: Float64Array[] = [],
    families: Int32Array[] = [];
  for (let p = 0; p < n; p++) {
    // An end that is not attached, as both are of a primitive that does not say and the soma's second is, has no star.
    const L = lengthOf(p),
      [a, b] = cutsOf[p],
      f0 = star(p, 0),
      f1 = star(p, 1);
    if ((whole[p] === 1 || p === somaPrim) && (f0 >= 0 || f1 >= 0)) {
      bounds.push(Float64Array.of(0, L));
      families.push(Int32Array.of(f0 >= 0 ? f0 : f1));
      continue;
    }
    const bs = [0],
      fs: number[] = [];
    if (f0 >= 0 && a > 0) {
      bs.push(a);
      fs.push(f0);
    }
    bs.push(f1 >= 0 && b < L ? b : L);
    fs.push(count++);
    if (f1 >= 0 && b < L) {
      bs.push(L);
      fs.push(f1);
    }
    bounds.push(Float64Array.from(bs));
    families.push(Int32Array.from(fs));
  }
  return normalised(
    bounds,
    families,
    Array.from({ length: count }, (_, f) => f),
    arcs
  );
}

/** Families through `root`, numbered afresh; neighbouring parts of one family made one part; and which families are social. */
function normalised(
  bounds: Float64Array[],
  families: Int32Array[],
  root: number[],
  arcs: Float64Array[]
): Kinship {
  const find = (f: number): number => findRoot(root, f);
  const id = new Int32Array(root.length).fill(-1);
  let next = 0;
  const outBounds: Float64Array[] = [],
    outFamilies: Int32Array[] = [];
  for (let p = 0; p < bounds.length; p++) {
    const bs = [bounds[p][0]],
      fs: number[] = [];
    for (let k = 0; k < families[p].length; k++) {
      const r = find(families[p][k]);
      if (id[r] < 0) id[r] = next++;
      if (fs.length > 0 && fs[fs.length - 1] === id[r]) bs[bs.length - 1] = bounds[p][k + 1];
      else {
        fs.push(id[r]);
        bs.push(bounds[p][k + 1]);
      }
    }
    outBounds.push(Float64Array.from(bs));
    outFamilies.push(Int32Array.from(fs));
  }
  // Social: parts of more than one primitive.
  const owner = new Int32Array(next).fill(-1),
    social = new Uint8Array(next);
  for (let p = 0; p < outFamilies.length; p++) {
    for (const f of outFamilies[p]) {
      if (owner[f] < 0) owner[f] = p;
      else if (owner[f] !== p) social[f] = 1;
    }
  }
  return { bounds: outBounds, families: outFamilies, social, arcs };
}

/**
 * The families with welds where fibres touch. On either side of a contact, a fibre that is a shaft there is cut
 * where it comes within the other's reach and where it has been out of it for a band's width; a fibre that is in a
 * star or a weld there brings that in as it is. What comes together this way is one family.
 */
export function weldContacts(
  kin: Kinship,
  prims: Prim[],
  contacts: Contact[],
  band: Band,
  margin: Margin
): Kinship {
  if (contacts.length === 0) return kin;
  const arcs = kin.arcs;
  const root: number[] = Array.from({ length: kin.social.length }, (_, f) => f);
  const union = (a: number, b: number): void => joinRoots(root, a, b);
  const at = new Float64Array(4);
  /** Per primitive: from, to, family of the stretches of its shafts that are welded, and the primitive each is welded to. */
  const zones: [number, number, number, number][][] = prims.map(() => []);
  /** The family that one side of a contact brings in: the star or weld it is in, or a new weld along its shaft. */
  const side = (p: number, sp: number, q: number, sq: number): number => {
    const k = partAt(kin, p, sp);
    const family = kin.families[p][k];
    if (kin.social[family] === 1) return family;
    // A long contact comes as many, piece by piece: all but the first fall into the weld that the first has made.
    for (const z of zones[p]) if (z[3] === q && sp >= z[0] && sp <= z[1]) return z[2];
    const arc = arcs[p],
      lo = kin.bounds[p][k],
      hi = kin.bounds[p][k + 1];
    const Lq = arcs[q][arcs[q].length - 1];
    pointAt(prims[p].segs, arc, sp, at);
    const w = band(at[3], prims[p].beta);
    const ends = [sp, sp];
    for (const dir of [-1, 1]) {
      let last = 0;
      for (let t = 0; t - last <= w; t += 0.25 * w) {
        const s = sp + dir * t;
        if (s < lo || s > hi) {
          last = Infinity;
          break;
        }
        pointAt(prims[p].segs, arc, s, at);
        const window = t + WELD_WINDOW * w;
        if (
          withinReach(
            at[0],
            at[1],
            at[2],
            at[3],
            prims[p].beta,
            prims[q],
            arcs[q],
            Math.max(0, sq - window),
            Math.min(Lq, sq + window),
            band,
            margin
          )
        )
          last = t;
      }
      // Out of reach for a band's width, or as far as the shaft goes: then it takes in the part beyond as well.
      ends[dir < 0 ? 0 : 1] = last === Infinity ? (dir < 0 ? lo : hi) : sp + dir * (last + w);
    }
    const from = Math.max(lo, ends[0]),
      to = Math.min(hi, ends[1]);
    const zone = root.length;
    root.push(zone);
    zones[p].push([from, to, zone, q]);
    if (from <= lo + PART_EPS && k > 0) union(zone, kin.families[p][k - 1]);
    if (to >= hi - PART_EPS && k + 1 < kin.families[p].length) union(zone, kin.families[p][k + 1]);
    return zone;
  };
  for (const c of contacts) union(side(c.p, c.sp, c.q, c.sq), side(c.q, c.sq, c.p, c.sp));

  // Carve the zones out of the shafts. Zones that overlap are one; what is left of a shaft between two is a shaft of its own.
  const bounds: Float64Array[] = [],
    families: Int32Array[] = [];
  for (let p = 0; p < prims.length; p++) {
    const list = zones[p].sort((a, b) => a[0] - b[0]);
    if (list.length === 0) {
      bounds.push(kin.bounds[p]);
      families.push(kin.families[p]);
      continue;
    }
    const merged: [number, number, number][] = [];
    for (const z of list) {
      const top = merged[merged.length - 1];
      if (top !== undefined && z[0] <= top[1] + PART_EPS) {
        top[1] = Math.max(top[1], z[1]);
        union(top[2], z[2]);
      } else merged.push([z[0], z[1], z[2]]);
    }
    const bs = [kin.bounds[p][0]],
      fs: number[] = [];
    let z = 0;
    for (let k = 0; k < kin.families[p].length; k++) {
      const lo = kin.bounds[p][k],
        hi = kin.bounds[p][k + 1];
      // The old family for the first stretch of shaft that is left, a new one for every other.
      let from = lo,
        used = false,
        carved = false;
      const shaft = (): number => {
        if (!used) {
          used = true;
          return kin.families[p][k];
        }
        root.push(root.length);
        return root.length - 1;
      };
      for (
        ;
        z < merged.length && (merged[z][0] < hi || (hi - lo <= PART_EPS && merged[z][0] <= hi));
        z++
      ) {
        carved = true;
        if (hi - lo <= PART_EPS) {
          // A primitive of no length is welded as a whole.
          bs.push(hi);
          fs.push(merged[z][2]);
          continue;
        }
        if (merged[z][0] - from > PART_EPS) {
          bs.push(merged[z][0]);
          fs.push(shaft());
        }
        bs.push(Math.min(hi, merged[z][1]));
        fs.push(merged[z][2]);
        from = Math.min(hi, merged[z][1]);
      }
      if (!carved || hi - from > PART_EPS) {
        bs.push(hi);
        fs.push(shaft());
      }
    }
    bounds.push(Float64Array.from(bs));
    families.push(Int32Array.from(fs));
  }
  return normalised(bounds, families, root, arcs);
}

/** The part of primitive p that arc length s lies in: the last that starts at or before it. */
export function partAt(kin: Kinship, p: number, s: number): number {
  const b = kin.bounds[p];
  let k = 0;
  while (k + 2 < b.length && b[k + 1] <= s) k++;
  return k;
}

/** The parts of [s0, s1] of primitive p, as from, to, family; a stretch of no length is one part. */
export function partsBetween(
  kin: Kinship,
  p: number,
  s0: number,
  s1: number
): [number, number, number][] {
  const b = kin.bounds[p],
    f = kin.families[p];
  if (!(s1 - s0 > PART_EPS)) return [[s0, s1, f[partAt(kin, p, s0)]]];
  const out: [number, number, number][] = [];
  for (let k = 0; k < f.length; k++) {
    const from = Math.max(b[k], s0),
      to = Math.min(b[k + 1], s1);
    if (to - from > PART_EPS) out.push([from, to, f[k]]);
  }
  return out;
}

/** The social families that primitive p is in between s0 − pad and s1 + pad. */
export function socialBetween(
  kin: Kinship,
  p: number,
  s0: number,
  s1: number,
  pad: number
): number[] {
  const b = kin.bounds[p],
    f = kin.families[p];
  const out: number[] = [];
  for (let k = 0; k < f.length; k++) {
    if (kin.social[f[k]] === 0 || out.includes(f[k])) continue;
    // A part of no length is where it is.
    if (
      (b[k] < s1 + pad && b[k + 1] > s0 - pad) ||
      (b[k + 1] === b[k] && b[k] <= s1 + pad && b[k] >= s0 - pad)
    )
      out.push(f[k]);
  }
  return out;
}

/**
 * The primitives that the field sums: every primitive cut into its parts, each with its family. A primitive that is
 * one part is handed on as it is, segments and all.
 */
export function splitFamilies(prims: Prim[], kin: Kinship): FieldPrim[] {
  const out: FieldPrim[] = [];
  for (let p = 0; p < prims.length; p++) {
    const P = prims[p],
      s = P.segs;
    const arc = kin.arcs[p];
    const L = arc[arc.length - 1];
    const parts = partsBetween(kin, p, 0, L);
    if (parts.length === 1) {
      out.push({ type: P.type, beta: P.beta, segs: s, family: parts[0][2], chain: p });
      continue;
    }
    for (const [from, to, family] of parts) {
      const segs: number[] = [];
      for (let k = 0; k + 1 < arc.length; k++) {
        const o = 8 * k;
        const len = arc[k + 1] - arc[k];
        if (len === 0) {
          // A sphere within the chain goes with the part that holds its place.
          if (arc[k] >= from && (arc[k] < to || to === L))
            for (let c = 0; c < 8; c++) segs.push(s[o + c]);
          continue;
        }
        const lo = Math.max(from, arc[k]),
          hi = Math.min(to, arc[k + 1]);
        if (!(hi - lo > 0)) continue;
        for (const at of [lo, hi]) {
          // The segment's own ends as they are, so that an uncut segment is the same numbers.
          if (at === arc[k]) segs.push(s[o], s[o + 1], s[o + 2], s[o + 3]);
          else if (at === arc[k + 1]) segs.push(s[o + 4], s[o + 5], s[o + 6], s[o + 7]);
          else {
            const t = (at - arc[k]) / len;
            for (let c = 0; c < 4; c++) segs.push(s[o + c] + (s[o + 4 + c] - s[o + c]) * t);
          }
        }
      }
      if (segs.length > 0)
        out.push({ type: P.type, beta: P.beta, segs: Float64Array.from(segs), family, chain: p });
    }
  }
  return out;
}
