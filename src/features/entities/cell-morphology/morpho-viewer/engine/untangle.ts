/**
 * Moving fibres apart where a tracing has them touch.
 *
 * A neuron is a tree, and its fibres do not pass through each other. Tracings have them do it all the same: depth
 * is the weak axis of a light microscope, a micron or two off is common, and an axon that in the tissue ran over a
 * dendrite comes out running through it. The mesher can only weld what touches (kin.ts), and every weld is a handle
 * of the surface that the cell does not have. So this pass, which is optional since it edits the anatomy rather than
 * renders it, moves such fibres apart until their surfaces are a given clearance from each other:
 *
 * - Only fibres that do not belong together count: not the sections of one star (kin.ts), and not the parts of one
 *   section.
 * - The thinner fibre gives way, in proportion to the squares of the radii: an axon goes around a dendrite, two
 *   fibres alike share the way.
 * - A fibre moves across its own axis, never along it: where one goes through another's middle, the way from the
 *   other's axis to it is along itself, and leads nowhere. Across both axes, then, and to the side it is on already
 *   if it is on one. Along a fibre the side is kept: one that lies in another for tens of microns would otherwise be
 *   sent up here and down there, and wind around it.
 * - What is asked of a point is spread over its neighbours along the section with a window several times as wide as
 *   the move is far, so that the path bends gently and tubes can still be swept along it. Branch points, the
 *   sections' first points and whatever lies inside the soma stay where they are, and the window closes towards them.
 * - Nothing moves farther than `MAX_SHIFT`. What cannot be parted within that stays welded, and the report says so.
 */

import { type Kinship, kinship, partAt, SOMA_NODE, sectionEnds } from './kin';
import {
  CellLists,
  type Closest,
  chainSegments,
  closestOnSegment,
  closestOnSegments,
} from './segments';
import { type Morphology, type Section, SWC_SOMA } from './swc';

import type { Prim } from './mesher';

export interface UntangleOptions {
  /** How far apart the surfaces of fibres that do not belong together are to be, µm. */
  clearance: number;
  /** The blend scales of the mesher, as fractions of the radius: they say how far the stars go. */
  blend: number;
  somaBlend: number;
}

export interface UntangleReport {
  /** Pairs of sections that were closer than the clearance, and how many of them still are. */
  contacts: number;
  left: number;
  /** The farthest that a point has been moved, µm, and the length of path that has been moved at all. */
  maxShift: number;
  movedLength: number;
}

/**
 * The clearance to ask for, in voxels of the mesh. The layout takes fibres within one voxel of each other for
 * touching, and simplifying the two paths afterwards, by half a voxel each as a rule, may bring them closer again.
 */
export const UNTANGLE_VOXELS = 2.5;
/** No point moves farther than this, µm. */
export const MAX_SHIFT = 3;
/** Sections that take part are given points no farther apart than this, µm, so that they can bend where they have to. */
const MAX_SEGMENT = 1.5;
/** The window over which a move is spread along the section: this many times the move, and no less than `WINDOW_MIN` µm to either side. */
const WINDOW_RATIO = 6;
const WINDOW_MIN = 2;
/** The length of path to either side over which the points that run along one fibre agree on the side they go to, µm. */
const SIDE_WINDOW = 8;
/** Points within this distance along the path of one that does not move are held back in proportion, µm. */
const FIXED_TAPER = 2;
const MAX_ITERATIONS = 40;
/** A pair is apart when it lacks less than this of the clearance, µm. */
const DONE = 1e-3;
/** Edge of the cells that the segments are looked up in, µm. */
const CELL = 8;
/**
 * Two places on one section are fibres that do not belong together if the path between them is this long, µm: a loop.
 * A fold is another matter. Its arms lie against each other right up to the turn, the turn would have to be made
 * round for them to part, and what is asked of one arm spreads along the path into the other.
 */
const SELF_APART = 16;

/** A section that moves: its points, more of them than it came with, and what is known of each. */
interface Moving {
  /** x, y, z, r. */
  pts: Float64Array;
  /** Arc length along the section as it came, which is what the families go by. */
  arc: Float64Array;
  /** The point of the section as it came, -1 for one that was put in between. */
  orig: Int32Array;
  /** How far a point may follow what is asked of it: 0 for one that stays, 1 for one that is free. */
  free: Float64Array;
  /** The first of the segments that segment k of the section as it came has been cut into. */
  first: Int32Array;
  shift: Float64Array;
  push: Float64Array;
  /** What asked a point to move: the other section (-1 for the soma) and the arc length on it. */
  partner: Int32Array;
  partnerArc: Float64Array;
  /** 1 for the segments that may have come too close to something: those at a contact to begin with, then those that have moved. */
  dirty: Uint8Array;
}

/** Where a pair comes closest, and the radii of the two there. */
interface Near extends Closest {
  ra: number;
  rb: number;
}

export function untangleSections(
  m: Morphology,
  sections: Section[],
  o: UntangleOptions
): { sections: Section[]; report: UntangleReport } {
  const report: UntangleReport = { contacts: 0, left: 0, maxShift: 0, movedLength: 0 };
  const c = o.clearance;
  if (!(c > 0)) return { sections, report };

  // ---- Who belongs together ------------------------------------------------------------------------------------------
  const h = c / UNTANGLE_VOXELS;
  // The soma as the fitted sphere; but where no arbor is valid, as the sphere that the mesh has (soma.ts), which may be
  // larger: points inside it stay, and what is not of the soma keeps off it.
  const somaRadius = m.somaStems.source === 'stems' ? m.soma.radius : m.somaStems.baseRadius;
  const hasSoma = m.soma.model !== 'none' && somaRadius > 0;
  const prims: Prim[] = [];
  if (hasSoma) {
    const [x, y, z] = m.soma.center,
      r = somaRadius;
    prims.push({
      type: SWC_SOMA,
      beta: o.somaBlend,
      segs: Float64Array.of(x, y, z, r, x, y, z, r),
      ends: [SOMA_NODE, SOMA_NODE],
    });
  }
  const primOf = new Int32Array(sections.length).fill(-1);
  sections.forEach((sec, s) => {
    if (sec.points.length < 8) return;
    primOf[s] = prims.length;
    prims.push({
      type: sec.type,
      beta: o.blend,
      segs: chainSegments(sec.points),
      ends: sectionEnds(m, sec, hasSoma),
    });
  });
  const kin: Kinship = kinship(prims, h);
  const arcs: (Float64Array | null)[] = sections.map((_, s) =>
    primOf[s] < 0 ? null : kin.arcs[primOf[s]]
  );
  /** The family of section s at an arc length, if it is one in which sections blend; -1 otherwise. */
  const starAt = (s: number, arc: number): number => {
    const p = primOf[s],
      f = kin.families[p][partAt(kin, p, arc)];
    return kin.social[f] === 1 ? f : -1;
  };
  const somaStar = hasSoma && kin.social[kin.families[0][0]] === 1 ? kin.families[0][0] : -1;

  // ---- The segments as they came, in cells -------------------------------------------------------------------------------
  const segStart = new Int32Array(sections.length + 1);
  for (let s = 0; s < sections.length; s++)
    segStart[s + 1] = segStart[s] + (primOf[s] < 0 ? 0 : sections[s].points.length / 4 - 1);
  const S = segStart[sections.length];
  const segSection = new Int32Array(S);
  for (let s = 0; s < sections.length; s++) segSection.fill(s, segStart[s], segStart[s + 1]);
  const hash = new SegmentHash(sections, segStart, segSection, CELL, 0.5 * c);

  // ---- Sections that move -----------------------------------------------------------------------------------------------
  const forkNodes = new Set<number>();
  for (const sec of sections) forkNodes.add(sec.nodes[0]);
  const moving = new Map<number, Moving>();
  const activate = (s: number): Moving => {
    let a = moving.get(s);
    if (a !== undefined) return a;
    const sec = sections[s],
      p = sec.points,
      n = p.length / 4,
      arc = arcs[s]!;
    const pts: number[] = [],
      at: number[] = [],
      orig: number[] = [],
      first: number[] = [];
    for (let k = 0; k + 1 < n; k++) {
      first.push(pts.length / 4);
      const parts = Math.max(1, Math.ceil((arc[k + 1] - arc[k]) / MAX_SEGMENT));
      for (let q = 0; q < parts; q++) {
        const t = q / parts;
        for (let d = 0; d < 4; d++) pts.push(p[4 * k + d] + (p[4 * k + 4 + d] - p[4 * k + d]) * t);
        at.push(arc[k] + (arc[k + 1] - arc[k]) * t);
        orig.push(q === 0 ? k : -1);
      }
    }
    first.push(pts.length / 4);
    pts.push(p[4 * n - 4], p[4 * n - 3], p[4 * n - 2], p[4 * n - 1]);
    at.push(arc[n - 1]);
    orig.push(n - 1);
    const count = at.length;
    // What stays: the first point, which is the parent's; the last, if something grows out of it; what is in the soma.
    const stays = new Uint8Array(count);
    stays[0] = 1;
    if (forkNodes.has(sec.nodes[n - 1])) stays[count - 1] = 1;
    if (hasSoma) {
      const [x, y, z] = m.soma.center;
      for (let i = 0; i < count; i++)
        if (Math.hypot(pts[4 * i] - x, pts[4 * i + 1] - y, pts[4 * i + 2] - z) < somaRadius)
          stays[i] = 1;
    }
    const free = new Float64Array(count).fill(1);
    let last = -Infinity;
    for (let i = 0; i < count; i++) {
      if (stays[i] === 1) last = at[i];
      free[i] = Math.min(free[i], (at[i] - last) / FIXED_TAPER);
    }
    last = Infinity;
    for (let i = count - 1; i >= 0; i--) {
      if (stays[i] === 1) last = at[i];
      free[i] = Math.max(0, Math.min(free[i], (last - at[i]) / FIXED_TAPER));
    }
    a = {
      pts: Float64Array.from(pts),
      arc: Float64Array.from(at),
      orig: Int32Array.from(orig),
      free,
      first: Int32Array.from(first),
      shift: new Float64Array(3 * count),
      push: new Float64Array(3 * count),
      partner: new Int32Array(count),
      partnerArc: new Float64Array(count),
      dirty: new Uint8Array(count),
    };
    moving.set(s, a);
    return a;
  };

  // ---- Pairs ----------------------------------------------------------------------------------------------------------------
  const near: Near = { d: 0, s: 0, t: 0, ra: 0, rb: 0 };
  /** What the pair of segments lacks of the clearance, with `near` set; P and Q hold x, y, z, r per point. */
  const lacking = (P: ArrayLike<number>, i: number, Q: ArrayLike<number>, j: number): number => {
    closestOnSegments(P, 4 * i, P, 4 * i + 4, Q, 4 * j, Q, 4 * j + 4, near);
    near.ra = P[4 * i + 3] + (P[4 * i + 7] - P[4 * i + 3]) * near.s;
    near.rb = Q[4 * j + 3] + (Q[4 * j + 7] - Q[4 * j + 3]) * near.t;
    return near.ra + near.rb + c - near.d;
  };
  /**
   * Whether segment i of P and segment j of Q cannot lack anything, short of looking for where they come closest: on
   * one section (`same`) and too near along it to be strangers, or in boxes farther apart than the radii, the clearance
   * and the fillets add up to. Most of what the cells list for a segment is one or the other.
   */
  const apart = (
    P: ArrayLike<number>,
    i: number,
    arcP: Float64Array,
    Q: ArrayLike<number>,
    j: number,
    arcQ: Float64Array,
    same: boolean
  ): boolean => {
    if (same && Math.max(arcP[i + 1], arcQ[j + 1]) - Math.min(arcP[i], arcQ[j]) <= SELF_APART)
      return true;
    const ra = Math.max(P[4 * i + 3], P[4 * i + 7]),
      rb = Math.max(Q[4 * j + 3], Q[4 * j + 7]);
    const limit = ra + rb + c + Math.max(o.blend * ra, h) + Math.max(o.blend * rb, h);
    for (let d = 0; d < 3; d++) {
      const a0 = P[4 * i + d],
        a1 = P[4 * i + 4 + d],
        b0 = Q[4 * j + d],
        b1 = Q[4 * j + 4 + d];
      if (
        Math.min(a0, a1) - Math.max(b0, b1) > limit ||
        Math.min(b0, b1) - Math.max(a0, a1) > limit
      )
        return true;
    }
    return false;
  };
  /** Whether sections s and t, at these arc lengths, are fibres that do not belong together. */
  const strangers = (s: number, at: number, t: number, bt: number): boolean => {
    if (s === t) return Math.abs(at - bt) > SELF_APART;
    const a = starAt(s, at);
    return a < 0 || a !== starAt(t, bt);
  };
  /**
   * How far the surface may stand off a fibre's own where it is in a star: by a blend scale, where the kernels of three
   * or four sections add up (classify.ts). The layout takes a fibre that comes within that for one that touches.
   */
  const fillet = (s: number, at: number, r: number): number =>
    starAt(s, at) >= 0 ? Math.max(o.blend * r, h) : 0;
  const between = (arc: Float64Array, k: number, share: number): number =>
    arc[k] + (arc[k + 1] - arc[k]) * share;
  /** One number for a pair of sections that touch; the soma comes after the last section. */
  const pairKey = (s: number, t: number): number =>
    Math.min(s, t) * (sections.length + 1) + Math.max(s, t);
  // The sections that touch something, as they came.
  const stamp = new Int32Array(S).fill(-1);
  const pairs = new Set<number>();
  const found: number[] = [];
  // A pair in a star touches with its fillets on: the search reaches as far, by the widest they can be.
  let widest = h;
  for (const sec of sections)
    for (let q = 3; q < sec.points.length; q += 4)
      widest = Math.max(widest, o.blend * sec.points[q]);
  for (let g = 0; g < S; g++) {
    const s = segSection[g],
      k = g - segStart[s];
    const P = sections[s].points;
    found.length = 0;
    hash.query(P, k, 0.5 * c + 2 * widest, found);
    for (const j of found) {
      if (j <= g || stamp[j] === g) continue;
      stamp[j] = g;
      const t = segSection[j],
        l = j - segStart[t];
      if (apart(P, k, arcs[s]!, sections[t].points, l, arcs[t]!, s === t)) continue;
      // Where the two come closest says whether they belong together: a segment may be longer than a star.
      const lack = lacking(P, k, sections[t].points, l);
      const at = between(arcs[s]!, k, near.s),
        bt = between(arcs[t]!, l, near.t);
      if (
        lack + fillet(s, at, near.ra) + fillet(t, bt, near.rb) <= DONE ||
        !strangers(s, at, t, bt)
      )
        continue;
      pairs.add(pairKey(s, t));
      const a = activate(s),
        b = activate(t);
      a.dirty.fill(1, a.first[k], a.first[k + 1]);
      b.dirty.fill(1, b.first[l], b.first[l + 1]);
    }
    if (
      hasSoma &&
      (somaStar < 0 || starAt(s, 0.5 * (arcs[s]![k] + arcs[s]![k + 1])) !== somaStar) &&
      lackingOfSoma(P, k, m.soma.center, somaRadius, c, near) > DONE
    ) {
      pairs.add(pairKey(s, sections.length));
      const a = activate(s);
      a.dirty.fill(1, a.first[k], a.first[k + 1]);
    }
  }
  report.contacts = pairs.size;
  if (moving.size === 0) return { sections, report };

  // ---- Apart -------------------------------------------------------------------------------------------------------------------
  const u = new Float64Array(3),
    v = new Float64Array(3),
    n = new Float64Array(3);
  /**
   * Ask the two points of segment i of a moving section to go `share` of the way that parts the pair in `near`, across
   * the segment. `other` runs from the other fibre's closest point to this one's, along which runs the other's unit `axis`.
   */
  const ask = (
    a: Moving,
    i: number,
    other: Float64Array,
    axis: Float64Array,
    target: number,
    share: number,
    partner: number,
    partnerArc: number
  ): void => {
    const P = a.pts;
    for (let d = 0; d < 3; d++) u[d] = P[4 * i + 4 + d] - P[4 * i + d];
    const ul = Math.hypot(u[0], u[1], u[2]) || 1;
    for (let d = 0; d < 3; d++) u[d] /= ul;
    // From the other fibre's closest point to this one's, and that across this segment.
    for (let d = 0; d < 3; d++) n[d] = other[d];
    const along = n[0] * u[0] + n[1] * u[1] + n[2] * u[2];
    const ox = n[0],
      oy = n[1],
      oz = n[2];
    for (let d = 0; d < 3; d++) n[d] -= along * u[d];
    let nl = Math.hypot(n[0], n[1], n[2]);
    if (nl < 0.05 * near.d || nl < 1e-9) {
      // Through the other's middle, or end on: across both axes; failing that, across this one and upwards.
      n[0] = u[1] * axis[2] - u[2] * axis[1];
      n[1] = u[2] * axis[0] - u[0] * axis[2];
      n[2] = u[0] * axis[1] - u[1] * axis[0];
      nl = Math.hypot(n[0], n[1], n[2]);
      if (nl < 1e-6) {
        n[0] = -u[2] * u[0];
        n[1] = -u[2] * u[1];
        n[2] = 1 - u[2] * u[2];
        nl = Math.hypot(n[0], n[1], n[2]);
        if (nl < 1e-6) {
          n[0] = 1;
          n[1] = n[2] = 0;
          nl = 1;
        }
      }
      const side = n[0] * ox + n[1] * oy + n[2] * oz;
      if (side < 0 || (side === 0 && n[2] < 0)) nl = -nl;
    }
    for (let d = 0; d < 3; d++) n[d] /= nl;
    // How far along n until the two are `target` apart: |o + λ n| = target.
    const on = ox * n[0] + oy * n[1] + oz * n[2];
    const lambda =
      share * (-on + Math.sqrt(Math.max(0, on * on + target * target - near.d * near.d)));
    for (const q of [i, i + 1]) {
      const had = Math.hypot(a.push[3 * q], a.push[3 * q + 1], a.push[3 * q + 2]);
      if (lambda <= had) continue;
      for (let d = 0; d < 3; d++) a.push[3 * q + d] = lambda * n[d];
      a.partner[q] = partner;
      a.partnerArc[q] = partnerArc;
    }
  };
  const offset = new Float64Array(3);
  let left = new Set<number>();
  // Marks for `stamp` that the first round has not used: a segment comes once per query.
  let marks = 0;
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    left = new Set<number>();
    for (const [s, a] of moving) {
      const count = a.arc.length;
      for (let i = 0; i + 1 < count; i++) {
        if (a.dirty[i] === 0) continue;
        found.length = 0;
        hash.query(a.pts, i, 0.5 * c + 2 * MAX_SHIFT, found);
        const mark = S + marks++;
        for (const j of found) {
          const t = segSection[j],
            l = j - segStart[t];
          if (stamp[j] === mark) continue;
          stamp[j] = mark;
          const b = moving.get(t);
          const Q = b === undefined ? sections[t].points : b.pts;
          const arcQ = b === undefined ? arcs[t]! : b.arc;
          const from = b === undefined ? l : b.first[l],
            to = b === undefined ? l + 1 : b.first[l + 1];
          for (let q = from; q < to; q++) {
            if ((b === a && Math.abs(q - i) < 2) || apart(a.pts, i, a.arc, Q, q, arcQ, b === a))
              continue;
            const lack = lacking(a.pts, i, Q, q);
            const at = between(a.arc, i, near.s),
              bt = between(arcQ, q, near.t);
            const ra = near.ra,
              rb = near.rb;
            const fillets = fillet(s, at, ra) + fillet(t, bt, rb);
            if (lack + fillets <= DONE || !strangers(s, at, t, bt)) continue;
            left.add(pairKey(s, t));
            for (let d = 0; d < 3; d++) {
              offset[d] =
                a.pts[4 * i + d] +
                (a.pts[4 * i + 4 + d] - a.pts[4 * i + d]) * near.s -
                (Q[4 * q + d] + (Q[4 * q + 4 + d] - Q[4 * q + d]) * near.t);
              v[d] = Q[4 * q + 4 + d] - Q[4 * q + d];
            }
            const vl = Math.hypot(v[0], v[1], v[2]) || 1;
            for (let d = 0; d < 3; d++) v[d] /= vl;
            // A section that has not touched anything itself stays where it is, and this one goes all the way.
            ask(
              a,
              i,
              offset,
              v,
              ra + rb + c + fillets,
              b === undefined ? 1 : (rb * rb) / (ra * ra + rb * rb),
              t,
              bt
            );
          }
        }
        if (
          hasSoma &&
          (somaStar < 0 || starAt(s, a.arc[i]) !== somaStar) &&
          lackingOfSoma(a.pts, i, m.soma.center, somaRadius, c, near) > DONE
        ) {
          left.add(pairKey(s, sections.length));
          for (let d = 0; d < 3; d++) {
            offset[d] =
              a.pts[4 * i + d] +
              (a.pts[4 * i + 4 + d] - a.pts[4 * i + d]) * near.s -
              m.soma.center[d];
            v[d] = d === 2 ? 1 : 0;
          }
          ask(a, i, offset, v, near.ra + somaRadius + c, 1, -1, 0);
        }
      }
    }
    if (left.size === 0) break;
    for (const a of moving.values()) spread(a);
  }
  report.left = left.size;

  // ---- The sections as they are now -----------------------------------------------------------------------------------------
  const out = sections.slice();
  for (const [s, a] of moving) {
    const count = a.arc.length;
    let moved = false;
    for (let i = 0; i < count; i++) {
      const d = Math.hypot(a.shift[3 * i], a.shift[3 * i + 1], a.shift[3 * i + 2]);
      if (d > report.maxShift) report.maxShift = d;
      if (d > DONE) {
        moved = true;
        report.movedLength +=
          0.5 *
          ((i > 0 ? a.arc[i] - a.arc[i - 1] : 0) + (i + 1 < count ? a.arc[i + 1] - a.arc[i] : 0));
      }
    }
    if (!moved) continue;
    const nodes = new Int32Array(count);
    for (let i = 0; i < count; i++) nodes[i] = a.orig[i] >= 0 ? sections[s].nodes[a.orig[i]] : -1;
    out[s] = { type: sections[s].type, points: a.pts, nodes };
  }
  return { sections: out, report };
}

/**
 * What the points of a section have been asked for, spread along it and carried out. A point that is asked for more
 * than its neighbours hands some of it on to them, falling off as cos² over a window that is wide for a long way; one
 * that is asked to go against the point before it goes with it instead; and no point leaves its place by more than
 * `MAX_SHIFT`.
 */
function spread(a: Moving): void {
  const count = a.arc.length,
    push = a.push;
  // One side along the section, as long as it is the same fibre that it runs along: the two arms of a loop are asked
  // to go opposite ways, and have to. Within such a run a point that is asked to go against the one before it goes
  // with it instead, and then every point takes the way that the run takes around it, across its own axis: a fibre
  // that enters another from above and lies to the left of its middle farther on is led around by degrees, not by a
  // jump from one point to the next.
  const run = new Int32Array(count).fill(-1);
  let runs = 0;
  let px = 0,
    py = 0,
    pz = 0,
    at = -Infinity,
    partner = -2,
    partnerArc = 0;
  for (let i = 0; i < count; i++) {
    const x = push[3 * i],
      y = push[3 * i + 1],
      z = push[3 * i + 2];
    const l = Math.hypot(x, y, z);
    if (l === 0) continue;
    const goesOn =
      a.partner[i] === partner &&
      a.arc[i] - at < 2 * WINDOW_MIN &&
      Math.abs(a.partnerArc[i] - partnerArc) < 2 * WINDOW_MIN + (a.arc[i] - at);
    partner = a.partner[i];
    partnerArc = a.partnerArc[i];
    if (!goesOn) runs++;
    run[i] = runs;
    if (goesOn && x * px + y * py + z * pz < 0) {
      const pl = Math.hypot(px, py, pz);
      push[3 * i] = (px / pl) * l;
      push[3 * i + 1] = (py / pl) * l;
      push[3 * i + 2] = (pz / pl) * l;
    }
    px = push[3 * i];
    py = push[3 * i + 1];
    pz = push[3 * i + 2];
    at = a.arc[i];
  }
  const led = new Float64Array(3 * count);
  for (let i = 0; i < count; i++) {
    if (run[i] < 0) continue;
    let mx = 0,
      my = 0,
      mz = 0;
    for (const dir of [-1, 1]) {
      for (let j = dir < 0 ? i : i + 1; j >= 0 && j < count; j += dir) {
        const off = Math.abs(a.arc[j] - a.arc[i]);
        if (off >= SIDE_WINDOW) break;
        if (run[j] !== run[i]) continue;
        const w = Math.cos((0.5 * Math.PI * off) / SIDE_WINDOW) ** 2;
        mx += w * push[3 * j];
        my += w * push[3 * j + 1];
        mz += w * push[3 * j + 2];
      }
    }
    // Across the path here.
    const b = Math.min(count - 1, i + 1),
      f = Math.max(0, i - 1);
    let ux = a.pts[4 * b] - a.pts[4 * f],
      uy = a.pts[4 * b + 1] - a.pts[4 * f + 1],
      uz = a.pts[4 * b + 2] - a.pts[4 * f + 2];
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const along = mx * ux + my * uy + mz * uz;
    mx -= along * ux;
    my -= along * uy;
    mz -= along * uz;
    const ml = Math.hypot(mx, my, mz),
      l = Math.hypot(push[3 * i], push[3 * i + 1], push[3 * i + 2]);
    const keep = ml < 1e-9 || mx * push[3 * i] + my * push[3 * i + 1] + mz * push[3 * i + 2] <= 0;
    led[3 * i] = keep ? push[3 * i] : (mx / ml) * l;
    led[3 * i + 1] = keep ? push[3 * i + 1] : (my / ml) * l;
    led[3 * i + 2] = keep ? push[3 * i + 2] : (mz / ml) * l;
  }
  push.set(led);
  const given = new Float64Array(3 * count);
  for (let i = 0; i < count; i++) {
    const x = push[3 * i],
      y = push[3 * i + 1],
      z = push[3 * i + 2];
    const l = Math.hypot(x, y, z);
    if (l === 0) continue;
    const total = l + Math.hypot(a.shift[3 * i], a.shift[3 * i + 1], a.shift[3 * i + 2]);
    const window = Math.max(WINDOW_MIN, WINDOW_RATIO * total);
    for (const dir of [-1, 1]) {
      for (let j = dir < 0 ? i : i + 1; j >= 0 && j < count; j += dir) {
        const off = Math.abs(a.arc[j] - a.arc[i]);
        if (off >= window) break;
        const w = Math.cos((0.5 * Math.PI * off) / window) ** 2;
        if (w * l > Math.hypot(given[3 * j], given[3 * j + 1], given[3 * j + 2])) {
          given[3 * j] = w * x;
          given[3 * j + 1] = w * y;
          given[3 * j + 2] = w * z;
        }
      }
    }
  }
  for (let i = 0; i < count; i++) {
    const f = a.free[i];
    let sx = a.shift[3 * i] + f * given[3 * i],
      sy = a.shift[3 * i + 1] + f * given[3 * i + 1],
      sz = a.shift[3 * i + 2] + f * given[3 * i + 2];
    const l = Math.hypot(sx, sy, sz);
    if (l > MAX_SHIFT) {
      sx *= MAX_SHIFT / l;
      sy *= MAX_SHIFT / l;
      sz *= MAX_SHIFT / l;
    }
    if (sx !== a.shift[3 * i] || sy !== a.shift[3 * i + 1] || sz !== a.shift[3 * i + 2]) {
      // The segments on either side may have come too close to something now.
      a.dirty[i] = 1;
      if (i > 0) a.dirty[i - 1] = 1;
    }
    a.pts[4 * i] += sx - a.shift[3 * i];
    a.pts[4 * i + 1] += sy - a.shift[3 * i + 1];
    a.pts[4 * i + 2] += sz - a.shift[3 * i + 2];
    a.shift[3 * i] = sx;
    a.shift[3 * i + 1] = sy;
    a.shift[3 * i + 2] = sz;
  }
  push.fill(0);
}

/** What segment i of P lacks of the clearance from the soma's sphere, with `near` set to the closest point, the radius there and the distance from the centre. */
function lackingOfSoma(
  P: ArrayLike<number>,
  i: number,
  centre: ArrayLike<number>,
  radius: number,
  c: number,
  near: Near
): number {
  const o = 4 * i;
  closestOnSegment(centre[0], centre[1], centre[2], P, o, P, o + 4, near);
  near.ra = P[o + 3] + (P[o + 7] - P[o + 3]) * near.s;
  return near.ra + radius + c - near.d;
}

/**
 * The segments of all the sections by the cells that their boxes touch, a box being grown by the larger radius and
 * `grow`. A long segment is listed by the boxes of its parts, so that it does not fill the cells of a box it only
 * crosses.
 */
class SegmentHash {
  private readonly lists: CellLists;
  /** The segment of every listed part. */
  private readonly owner: Int32Array;

  constructor(
    sections: Section[],
    segStart: Int32Array,
    segSection: Int32Array,
    private readonly cell: number,
    private readonly grow: number
  ) {
    const S = segSection.length;
    // The boxes of the parts, as cell ranges.
    const ranges: number[] = [],
      owner: number[] = [];
    const lo = [0, 0, 0],
      hi = [0, 0, 0];
    for (let g = 0; g < S; g++) {
      const s = segSection[g],
        P = sections[s].points,
        o = 4 * (g - segStart[s]);
      const w = Math.max(P[o + 3], P[o + 7]) + grow;
      const len = Math.hypot(P[o + 4] - P[o], P[o + 5] - P[o + 1], P[o + 6] - P[o + 2]);
      const parts = Math.max(1, Math.ceil(len / cell));
      for (let q = 0; q < parts; q++) {
        for (let d = 0; d < 3; d++) {
          const a = P[o + d] + ((P[o + 4 + d] - P[o + d]) * q) / parts,
            b = P[o + d] + ((P[o + 4 + d] - P[o + d]) * (q + 1)) / parts;
          lo[d] = Math.floor((Math.min(a, b) - w) / cell);
          hi[d] = Math.floor((Math.max(a, b) + w) / cell);
        }
        ranges.push(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2]);
        owner.push(g);
      }
    }
    this.lists = new CellLists(ranges, owner.length);
    this.owner = Int32Array.from(owner);
  }

  /** The segments listed in the cells that the box of segment i of P touches, grown by its larger radius, `grow` and `more`; a segment may come more than once. */
  query(P: ArrayLike<number>, i: number, more: number, out: number[]): void {
    const o = 4 * i,
      cell = this.cell;
    const w = Math.max(P[o + 3], P[o + 7]) + this.grow + more;
    const lo = [0, 0, 0],
      hi = [0, 0, 0];
    for (let d = 0; d < 3; d++) {
      lo[d] = Math.floor((Math.min(P[o + d], P[o + 4 + d]) - w) / cell);
      hi[d] = Math.floor((Math.max(P[o + d], P[o + 4 + d]) + w) / cell);
    }
    const { head, next, cell: at, item } = this.lists;
    for (let k = lo[2]; k <= hi[2]; k++) {
      for (let j = lo[1]; j <= hi[1]; j++) {
        for (let x = lo[0]; x <= hi[0]; x++) {
          for (let e = head[this.lists.bucket(x, j, k)]; e >= 0; e = next[e]) {
            if (at[3 * e] === x && at[3 * e + 1] === j && at[3 * e + 2] === k)
              out.push(this.owner[item[e]]);
          }
        }
      }
    }
  }
}
