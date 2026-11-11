/**
 * Which parts of the skeleton are plain tubes, and which need the voxels.
 *
 * The field is, family by family (kin.ts), a sum over sections of a kernel of compact support: a section adds nothing
 * farther than its band (radius plus twice the blend scale) from its axis, and nothing at all to a section of another
 * family.
 * Where no other section's kernel reaches a section's surface, F = 1 is that section's own surface and tubes.ts sweeps
 * it. Everywhere else (branch points, the soma and what grows out of it, fibres that touch, bends and tapers too sharp
 * for rings) the surface is the blend that only the field knows, and the voxel mesher extracts it as before, from a
 * piece of the skeleton: a patch.
 *
 * `layoutSkeleton` decides that on short pieces of the sections' paths. Two pieces of one family interact when one's
 * band, and a voxel of margin, reaches the other's surface; both are then complex, whichever is the thick one, so
 * that a patch holds the whole surface of everything it blends. Two pieces that are not of one family interact when
 * their surfaces come within that margin: they touch, and what touches is welded, which is to say made a family from
 * where the two come within each other's reach to where they leave it (`weldContacts`). That takes two rounds: the
 * touches are only known when all the pairs have been gone through, and the pairs that were within reach without
 * touching are gone through again once the welds are there. Interacting pieces end up in one cluster (union-find),
 * and so do the complex pieces that follow each other along a section. A cluster becomes a patch.
 *
 * Planning is serial, so the search must not cost what the pieces' number would: there are as many as voxels along
 * the cable. It goes by levels. Chunks of a fixed length of path are hashed by their boxes; the segments of two
 * chunks that share a cell are tested by their exact distance; and only a segment that comes close to something is
 * cut into pieces, which are then tested pair by pair. A plain stretch never gets any.
 *
 * Along a section, a run of complex pieces [a, b] is given, on each side that continues as a tube:
 *
 *     b ── δ1 ──▶ clip plane ── δ2 ──▶ tube's first ring
 *                 └──── stub ────▶ end of the patch's copy of the section
 *
 * The patch meshes its copy of the section up to the end of the stub, where the copy ends in a rounded cap. Its
 * mesh is cut open at the clip plane (clip.ts), and a collar of triangles (hybrid.ts) joins the cut to the ring, which
 * the tube starts from. Plain stretches too short for two such transitions and a tube between them become complex.
 *
 * The cut has to be the section's circle, so the plane keeps clear of the skeleton's bends (`clearance`): next to a
 * bend, the segment beyond it lies askew behind the plane and comes through it beside the circle. δ1 is a voxel, or
 * as much more as that takes.
 *
 * Voxels
 * ------
 * A grid holds a fibre from a radius of `floorVoxels` voxels on, and a tube needs no grid at all. So the sections come
 * in at their traced calibre, and every patch gets a voxel of its own, fine enough for the thinnest fibre in it: the
 * voxel of the parameters is the coarsest one, for the soma and whatever is thick. All the lengths that were counted
 * in voxels go by the voxel a radius calls for (`localVoxel`): a fibre's blend scale, and with it its band, the
 * margin of the tests, the length of a piece. Thin fibres thus blend over distances of their own size, whatever the
 * voxel of the parameters, and a patch around a thin branch point is as many voxels across as one around a thick one.
 *
 * Refinement stops at `hMin`, and where there are no voxels to spare for it (`clusterVoxels`): a thin fibre on
 * something thick makes a fine grid of all of it, and the soma's patch is most of the work as it is. Fibres thinner
 * than such a patch's voxels can hold are raised to its floor, as the voxel mesher does everywhere. Thicker, they
 * blend with the rest of the patch over a longer way than they were laid out for, so its runs are taken as far as
 * that goes (`stillBlending`), and the tubes that leave it start at the floor and come down to their own radius along
 * a ramp (`flooredPath`). `Layout.paths` has the radii that are meshed; tubes and patches both take theirs from it.
 */

import { bandHalfWidth } from './field';
import {
  type Contact,
  findRoot,
  joinRoots,
  type Kinship,
  kinship,
  reachOf,
  socialBetween,
  weldContacts,
} from './kin';
import { CellLists, type Closest, closestOnSegments } from './segments';
import { SWC_SOMA } from './swc';
import {
  jointError,
  jointFits,
  ringEdge,
  SAME_SECTION_RADII,
  SectionPath,
  tubeTolerance,
} from './tubes';

import type { Prim } from './mesher';

export interface LayoutOptions {
  /** Coarsest voxel of a patch, µm: the voxel of the parameters. */
  h: number;
  /** Finest voxel of a patch, µm. The primitives' radii must not be below `floorVoxels` times this. */
  hMin: number;
  /** Smallest radius a patch's grid holds, in its voxels. */
  floorVoxels: number;
  /** Largest distance of a tube's triangles from the surface, µm. */
  tolerance: number;
}

/** A plain stretch of a section, from ring to ring; an end without an interface is the section's free end. */
export interface Stretch {
  prim: number;
  s0: number;
  s1: number;
  /** Index into `Layout.interfaces`, -1 for a cap. */
  startInterface: number;
  endInterface: number;
}

/** Where a tube takes over from a patch. */
export interface Interface {
  prim: number;
  patch: number;
  /** Arc lengths of the plane the patch is cut at, of the tube's ring and of the end of the patch's stub. */
  sClip: number;
  sRing: number;
  sEnd: number;
  /** 1 if the tube lies towards larger arc lengths, -1 if towards smaller. */
  side: 1 | -1;
}

/** The part of a section that a patch meshes, stubs included. */
export interface PatchPiece {
  prim: number;
  s0: number;
  s1: number;
}

export interface Patch {
  pieces: PatchPiece[];
  soma: boolean;
  interfaces: number[];
  /** Voxel of the patch's grid, µm. Radii in the patch are at least `floorVoxels` times this. */
  voxel: number;
}

export interface Layout {
  /** The path of every primitive with the radii that are meshed; null for the soma. */
  paths: (SectionPath | null)[];
  stretches: Stretch[];
  patches: Patch[];
  interfaces: Interface[];
  /** Cable length in plain stretches, and in all. */
  plainLength: number;
  totalLength: number;
  /** Cable length that is meshed thicker than traced: inside patches too coarse for it, and on the ramps out of them. */
  flooredLength: number;
  /** Where the sections are cut into the parts that blend and the parts that do not, and the family of each part. */
  kin: Kinship;
  /** How many times fibres that do not blend touch, each other or themselves: what the mesh has in handles, at most. */
  contacts: number;
}

/** Piece length in voxels. Runs of complex pieces end on piece boundaries, so this is how tightly a patch fits. */
const PIECE_VOXELS = 6;
/** Length of path that is hashed as one chunk, µm: a few times the reach of a thin neurite's band. */
const CHUNK_LENGTH = 8;
/** Along a segment shorter than this share of what the creases at its ends take up, the rings would cross. */
const FOLD_FRACTION = 0.8;
/** Band voxels (as `pieceVoxels` counts them) up to which a single patch is refined: a quarter of a second of one worker. */
const PATCH_BUDGET = 2e6;
/** Refining the patches may add this share to their voxels altogether, and `REFINE_FREE` voxels whatever they come to. */
const REFINE_SHARE = 1;
const REFINE_FREE = 2e6;
/** Slope at which a tube's radius comes down from the floor of the patch it leaves to its own. */
const RAMP_SLOPE = 0.25;
/** Radii closer than this are the same, µm. */
const RADIUS_EPS = 1e-6;
/** A clip plane stays this many times the distance at which a bend would just show in it away from the bend. */
const CLEARANCE_SAFETY = 1.25;

/** The points of a primitive's segments as a path: the first segment's start, then every segment's end. */
function pathOf(prim: Prim): SectionPath {
  const s = prim.segs;
  const n = s.length / 8;
  const pts = new Float64Array(4 * (n + 1));
  for (let c = 0; c < 4; c++) pts[c] = s[c];
  for (let k = 0; k < n; k++) for (let c = 0; c < 4; c++) pts[4 * (k + 1) + c] = s[8 * k + 4 + c];
  return new SectionPath(pts);
}

/** A ring this close to a skeleton point, as a share of the collar, moves onto it. */
const RING_SNAP = 0.35;

/**
 * The margins around a run of complex pieces, from the radius where the run ends and the voxel v of its patch: from
 * the run to the clip plane, from there to the ring (the collar, about as long as the ring's edges so that its
 * triangles are well shaped), the stub beyond the clip plane, and the shortest tube worth having, with room for both
 * of its rings to be snapped. They grow with v.
 */
function margins(
  traced: number,
  v: number,
  o: LayoutOptions
): { clip: number; collar: number; stub: number; tube: number } {
  const r = Math.max(traced, o.floorVoxels * v);
  const edge = ringEdge(r, o.tolerance);
  const collar = Math.max(1.5 * v, edge);
  return {
    clip: v,
    collar,
    stub: Math.max(2 * v, 0.5 * r),
    tube: Math.max(v, 0.5 * edge) + 2 * RING_SNAP * collar,
  };
}

/**
 * The families of a skeleton that is meshed with voxels throughout, at one voxel: the stars, and the welds where its
 * fibres touch, as the layout finds them. They are known before there are patches, and the layout goes no farther.
 */
export function layoutKinship(prims: Prim[], o: LayoutOptions): Kinship {
  return layout(prims, o, true);
}

export function layoutSkeleton(prims: Prim[], o: LayoutOptions): Layout {
  return layout(prims, o, false);
}

function layout(prims: Prim[], o: LayoutOptions, kinOnly: true): Kinship;
function layout(prims: Prim[], o: LayoutOptions, kinOnly: false): Layout;
function layout(prims: Prim[], o: LayoutOptions, kinOnly: boolean): Layout | Kinship {
  const h = o.h,
    floorVoxels = o.floorVoxels;
  if (!(o.hMin > 0 && o.hMin <= h))
    throw new Error('layout: the finest voxel must lie between zero and the coarsest');
  /** The voxel that a fibre of radius r calls for. */
  const localVoxel = (r: number): number => Math.min(h, Math.max(o.hMin, r / floorVoxels));
  const somaPrim = prims.findIndex((p) => p.type === SWC_SOMA);
  const paths: (SectionPath | null)[] = prims.map((p, i) => (i === somaPrim ? null : pathOf(p)));
  const tmpA = new Float64Array(4),
    tmpB = new Float64Array(4);
  const bandOf = (r: number, beta: number): number => bandHalfWidth(r, beta, localVoxel(r));
  // The stars for now; the welds come in when it is known what touches.
  let kin = kinship(prims, bandOf, localVoxel);

  // ---- Segments ----------------------------------------------------------------------------------------------------
  // Segment j of prim p is segFirst[p] + j. A section without a direction (a lone sphere) counts as one segment of no
  // length, which only the voxels can mesh.
  const segFirst = new Int32Array(prims.length + 1);
  let totalLength = 0;
  for (let p = 0; p < prims.length; p++) {
    const path = paths[p];
    segFirst[p + 1] = segFirst[p] + (path === null ? 0 : Math.max(1, path.count - 1));
    if (path !== null) totalLength += path.length;
  }
  const S = segFirst[prims.length];
  const sPrim = new Int32Array(S),
    sIndex = new Int32Array(S);
  const sR = new Float64Array(S),
    sBand = new Float64Array(S),
    sH = new Float64Array(S);
  const sEnds = new Float64Array(6 * S);
  const sArc = new Float64Array(2 * S);
  const sphere = new Uint8Array(S);
  for (let p = 0; p < prims.length; p++) {
    const path = paths[p];
    if (path === null) continue;
    const beta = prims[p].beta;
    if (path.count < 2) {
      const g = segFirst[p],
        q = prims[p].segs;
      sPrim[g] = p;
      sR[g] = Math.max(q[3], q[7]);
      sH[g] = localVoxel(sR[g]);
      sBand[g] = bandHalfWidth(sR[g], beta, sH[g]);
      for (let c = 0; c < 3; c++) sEnds[6 * g + c] = sEnds[6 * g + 3 + c] = q[c];
      sphere[g] = 1;
      continue;
    }
    const pts = path.points;
    for (let j = 0; j + 1 < path.count; j++) {
      const g = segFirst[p] + j;
      sPrim[g] = p;
      sIndex[g] = j;
      sR[g] = Math.max(pts[4 * j + 3], pts[4 * j + 7]);
      sH[g] = localVoxel(sR[g]);
      sBand[g] = bandHalfWidth(sR[g], beta, sH[g]);
      for (let c = 0; c < 3; c++) {
        sEnds[6 * g + c] = pts[4 * j + c];
        sEnds[6 * g + 3 + c] = pts[4 * j + 4 + c];
      }
      sArc[2 * g] = path.arc[j];
      sArc[2 * g + 1] = path.arc[j + 1];
    }
  }

  // ---- Skeleton points that a tube cannot pass ------------------------------------------------------------------------
  // The cosine of the bend and half the bend angle at every point of a path, zero at its ends, and how many of points
  // 0..k the rings cannot follow.
  const dirA = new Float64Array(3),
    dirB = new Float64Array(3);
  const bendCos: (Float64Array | null)[] = [],
    halfBend: (Float64Array | null)[] = [],
    unfitUpTo: (Int32Array | null)[] = [];
  for (let p = 0; p < prims.length; p++) {
    const path = paths[p];
    if (path === null || path.count < 3) {
      bendCos.push(null);
      halfBend.push(null);
      unfitUpTo.push(null);
      continue;
    }
    const cos = new Float64Array(path.count),
      alpha = new Float64Array(path.count),
      unfit = new Int32Array(path.count);
    path.direction(0, dirA);
    for (let k = 1; k + 1 < path.count; k++) {
      path.direction(k, dirB);
      const c = dirA[0] * dirB[0] + dirA[1] * dirB[1] + dirA[2] * dirB[2];
      cos[k] = c;
      alpha[k] = 0.5 * Math.acos(Math.max(-1, Math.min(1, c)));
      const r = path.points[4 * k + 3];
      unfit[k] =
        unfit[k - 1] +
        (jointFits(
          jointError(r, Math.cos(alpha[k]), path.taperAt(k)),
          tubeTolerance(r, o.tolerance)
        )
          ? 0
          : 1);
      dirA.set(dirB);
    }
    unfit[path.count - 1] = unfit[path.count - 2];
    bendCos.push(cos);
    halfBend.push(alpha);
    unfitUpTo.push(unfit);
  }
  /** Whether a tube could be swept from piece i to piece j of one section: every skeleton point between them fits one. */
  const sweepable = (i: number, j: number): boolean => {
    const unfit = unfitUpTo[pPrim[i]];
    if (unfit === null) return true;
    const a = Math.min(pSeg[i], pSeg[j]),
      b = Math.max(pSeg[i], pSeg[j]);
    return unfit[b] === unfit[a];
  };

  // ---- Pieces, made when a segment first comes close to something -----------------------------------------------------
  const pPrim: number[] = [],
    pS0: number[] = [],
    pS1: number[] = [],
    pR: number[] = [],
    pBand: number[] = [],
    pH: number[] = [];
  const pA: number[] = [],
    pB: number[] = [];
  /** The segment of its path that a piece is part of. */
  const pSeg: number[] = [];
  /**
   * The families that a piece blends in (stars, welds; kin.ts). Such a family's part ends in a cap, which the field
   * gives a say for as far as its band goes, so a piece is in the family from that far beyond the part's end.
   */
  const pFamilies: number[][] = [];
  /**
   * How far the surface of such a family may stand off the piece's own, zero if the piece is in none; with a band and
   * a radius, what that comes to at another voxel. Where the kernels of three or four sections add up to one, the
   * largest is a quarter at least: the surface is no farther from that section's own than one blend scale.
   */
  const fillet = (i: number, band = pBand[i], r = pR[i]): number =>
    pFamilies[i].length > 0 ? 0.5 * (band - r) : 0;
  const complex: number[] = [];
  const parent: number[] = [];
  /** As `parent`, but joining only what blends or follows each other along a section: what touches without blending is a contact. */
  const kinParent: number[] = [];
  const pieceFirst = new Int32Array(S).fill(-1),
    pieceCount = new Int32Array(S);
  const addPiece = (
    p: number,
    s0: number,
    s1: number,
    r: number,
    a: ArrayLike<number>,
    ao: number,
    b: ArrayLike<number>,
    bo: number,
    seg = 0
  ): number => {
    const i = pPrim.length;
    pPrim.push(p);
    pSeg.push(seg);
    pS0.push(s0);
    pS1.push(s1);
    pR.push(r);
    pH.push(localVoxel(r));
    const band = bandOf(r, prims[p].beta);
    pBand.push(band);
    pA.push(a[ao], a[ao + 1], a[ao + 2]);
    pB.push(b[bo], b[bo + 1], b[bo + 2]);
    pFamilies.push(socialBetween(kin, p, s0, s1, band));
    blended.push(0);
    complex.push(0);
    parent.push(i);
    kinParent.push(i);
    return i;
  };
  /** Whether two pieces are in one family, so that their kernels add up. */
  const blends = (i: number, j: number): boolean => {
    for (const f of pFamilies[i]) if (pFamilies[j].includes(f)) return true;
    return false;
  };
  /** Where fibres that do not blend touch, and the pairs of pieces that are within each other's bands without touching: they blend if a weld takes them in. */
  const contacts: Contact[] = [];
  const nearMisses: number[] = [];
  /**
   * Pairs that touch only if the fillets are there that a family may have, with their distance. A fillet is there
   * where a piece does blend with something, which is known when all the pairs have been gone through.
   */
  const perhaps: number[] = [];
  const blended: number[] = [];
  const touch = (i: number, j: number): void => {
    complex[i] = complex[j] = 1;
    union(i, j);
    contacts.push({
      p: pPrim[i],
      sp: 0.5 * (pS0[i] + pS1[i]),
      q: pPrim[j],
      sq: 0.5 * (pS0[j] + pS1[j]),
    });
  };
  // The soma is piece 0, so that it has a cluster like any other.
  const SOMA =
    somaPrim >= 0
      ? addPiece(
          somaPrim,
          0,
          0,
          prims[somaPrim].segs[3],
          prims[somaPrim].segs,
          0,
          prims[somaPrim].segs,
          0
        )
      : -1;
  const refine = (g: number): void => {
    if (pieceFirst[g] >= 0) return;
    pieceFirst[g] = pPrim.length;
    const p = sPrim[g];
    if (sphere[g] === 1) {
      complex[addPiece(p, 0, 0, sR[g], sEnds, 6 * g, sEnds, 6 * g)] = 1;
      pieceCount[g] = 1;
      return;
    }
    const path = paths[p]!;
    const a = sArc[2 * g],
      b = sArc[2 * g + 1];
    const parts = Math.max(1, Math.ceil((b - a) / (PIECE_VOXELS * sH[g])));
    for (let q = 0; q < parts; q++) {
      const s0 = a + ((b - a) * q) / parts,
        s1 = q + 1 === parts ? b : a + ((b - a) * (q + 1)) / parts;
      path.at(s0, tmpA);
      path.at(s1, tmpB);
      addPiece(p, s0, s1, Math.max(tmpA[3], tmpB[3]), tmpA, 0, tmpB, 0, sIndex[g]);
    }
    pieceCount[g] = parts;
  };
  for (let g = 0; g < S; g++) if (sphere[g] === 1) refine(g);

  const find = (a: number): number => findRoot(parent, a);
  const union = (a: number, b: number): void => joinRoots(parent, a, b);
  const kinFind = (a: number): number => findRoot(kinParent, a);
  /** Into one cluster, as what blends or is one surface. */
  const unionKin = (a: number, b: number): void => {
    union(a, b);
    joinRoots(kinParent, a, b);
  };
  /**
   * Whether pieces i and j of one section, of radii ri and rj, are one surface, which the tube's window covers:
   * neighbours along it, if a tube can be swept from one to the other. Parts farther apart, and the two sides of a
   * point that the rings cannot follow, must not touch.
   */
  const oneSurface = (i: number, j: number, ri: number, rj: number): boolean =>
    Math.max(pS0[i], pS0[j]) - Math.min(pS1[i], pS1[j]) <= SAME_SECTION_RADII * Math.max(ri, rj) &&
    sweepable(i, j);
  const testPieces = (i: number, j: number): void => {
    // What blends interacts within reach of the bands. Whatever else has no effect on each other's surface unless it touches.
    const margin = Math.max(pH[i], pH[j]);
    const touching = pR[i] + pR[j] + margin,
      reach = reachOf(pR[i], pBand[i], pR[j], pBand[j], margin);
    // Middles first: most pieces of two segments that come close are nowhere near each other, and nothing below counts
    // farther apart than the reach, or than touching with the fillets.
    const most =
      (Math.max(reach, touching + fillet(i) + fillet(j)) +
        0.5 * (pS1[i] - pS0[i] + pS1[j] - pS0[j])) *
      (1 + 1e-6);
    const mx = pA[3 * i] + pB[3 * i] - pA[3 * j] - pB[3 * j];
    const my = pA[3 * i + 1] + pB[3 * i + 1] - pA[3 * j + 1] - pB[3 * j + 1];
    const mz = pA[3 * i + 2] + pB[3 * i + 2] - pA[3 * j + 2] - pB[3 * j + 2];
    if (mx * mx + my * my + mz * mz > 4 * most * most) return;
    const same = pPrim[i] === pPrim[j],
      kindred = !same && blends(i, j);
    // Of what does not blend, every touch counts, in one cluster already or not.
    if ((same || kindred) && complex[i] === 1 && complex[j] === 1 && find(i) === find(j)) return;
    if (same && oneSurface(i, j, pR[i], pR[j])) return;
    const d = segmentSegment(pA, pB, i, pA, pB, j);
    if (same || kindred) {
      if (d >= (kindred ? reach : touching)) return;
      complex[i] = complex[j] = 1;
      if (kindred) {
        blended[i] = blended[j] = 1;
        unionKin(i, j);
      } else union(i, j);
    } else if (d < touching) touch(i, j);
    else if (d < touching + fillet(i) + fillet(j)) perhaps.push(i, j, d);
    else if (d < reach) nearMisses.push(i, j);
  };

  // ---- The soma against everything ---------------------------------------------------------------------------------
  // The soma is one piece, but its primitive is a sphere and a neck to every valid stem (mesher.ts), and a neck
  // tapers: each segment of it is tested at the radius it has where it comes closest, and the piece gets the closest
  // relation any of them has. A neck is judged for `perhaps` by how far the piece is from its surface, put as a
  // distance from the sphere, so that the rule there needs no change; the sphere's fillet stands in for the neck's,
  // which is smaller.
  const somaSegs = SOMA >= 0 ? prims[somaPrim].segs : new Float64Array(0);
  const somaBeta = SOMA >= 0 ? prims[somaPrim].beta : 0;
  /**
   * The distance from segment i of A/B (six numbers per segment in `sEnds`, three in `pA`/`pB`) to segment j of the
   * soma, left in `nearest.d`, and the soma's radius where it is closest.
   */
  const somaSegment = (
    j: number,
    A: ArrayLike<number>,
    B: ArrayLike<number>,
    i: number,
    stride: number
  ): number => {
    const o = 8 * j;
    closestOnSegments(
      A,
      stride * i,
      B,
      stride * i + (stride === 6 ? 3 : 0),
      somaSegs,
      o,
      somaSegs,
      o + 4,
      nearest
    );
    return somaSegs[o + 3] + (somaSegs[o + 7] - somaSegs[o + 3]) * nearest.t;
  };
  /** Whether segment i of A/B, of radius r, band `band` and voxel `hh`, is within reach of a segment of the soma. */
  const nearSoma = (
    A: ArrayLike<number>,
    B: ArrayLike<number>,
    i: number,
    stride: number,
    r: number,
    band: number,
    hh: number
  ): boolean => {
    for (let j = 0; 8 * j < somaSegs.length; j++) {
      const rj = somaSegment(j, A, B, i, stride);
      if (nearest.d < reachOf(r, band, rj, bandOf(rj, somaBeta), Math.max(localVoxel(rj), hh)))
        return true;
    }
    return false;
  };
  if (SOMA >= 0) {
    const r0 = pR[SOMA];
    // Boxes first. Band and voxel grow with the radius, so no segment of the soma reaches farther from the box of
    // their ends than its thickest does.
    let rMax = 0;
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let o = 0; o < somaSegs.length; o += 4) {
      rMax = Math.max(rMax, somaSegs[o + 3]);
      for (let c = 0; c < 3; c++) {
        box[c] = Math.min(box[c], somaSegs[o + c]);
        box[c + 3] = Math.max(box[c + 3], somaSegs[o + c]);
      }
    }
    const bMax = bandOf(rMax, somaBeta),
      hMax = localVoxel(rMax);
    for (let g = 0; g < S; g++) {
      const limit = Math.max(sR[g] + bMax, rMax + sBand[g]) + Math.max(hMax, sH[g]);
      let apart = false;
      for (let c = 0; c < 3 && !apart; c++) {
        const a0 = sEnds[6 * g + c],
          a1 = sEnds[6 * g + 3 + c];
        apart = Math.min(a0, a1) - box[c + 3] >= limit || box[c] - Math.max(a0, a1) >= limit;
      }
      if (apart || !nearSoma(sEnds, sEnds, g, 6, sR[g], sBand[g], sH[g])) continue;
      refine(g);
      for (let i = pieceFirst[g]; i < pieceFirst[g] + pieceCount[g]; i++) {
        if (blends(i, SOMA)) {
          if (!nearSoma(pA, pB, i, 3, pR[i], pBand[i], pH[i])) continue;
          complex[i] = 1;
          blended[i] = blended[SOMA] = 1;
          unionKin(i, SOMA);
          continue;
        }
        // 3: touching; 2: touching if the fillets are there; 1: within reach without touching.
        let verdict = 0,
          at = Infinity;
        for (let j = 0; 8 * j < somaSegs.length && verdict < 3; j++) {
          const rj = somaSegment(j, pA, pB, i, 3),
            d = nearest.d;
          const margin = Math.max(localVoxel(rj), pH[i]);
          const dd = d - rj + r0;
          if (dd < r0 + pR[i] + margin) verdict = 3;
          else if (dd < r0 + pR[i] + margin + fillet(SOMA) + fillet(i)) {
            verdict = Math.max(verdict, 2);
            at = Math.min(at, dd);
          } else if (d < reachOf(pR[i], pBand[i], rj, bandOf(rj, somaBeta), margin))
            verdict = Math.max(verdict, 1);
        }
        if (verdict === 3) touch(i, SOMA);
        else if (verdict === 2) perhaps.push(i, SOMA, at);
        else if (verdict === 1) nearMisses.push(i, SOMA);
      }
    }
  }

  // ---- Segments against segments -------------------------------------------------------------------------------------
  const testSegments = (ga: number, gb: number): void => {
    if (ga === gb) return; // a straight segment does not come close to itself
    let limit: number;
    const margin = Math.max(sH[ga], sH[gb]);
    if (sPrim[ga] === sPrim[gb]) {
      const rr = Math.max(sR[ga], sR[gb]);
      const joint = Math.max(sIndex[ga], sIndex[gb]);
      const unfit = unfitUpTo[sPrim[ga]]!;
      if (Math.abs(sIndex[ga] - sIndex[gb]) === 1 && unfit[joint] === unfit[joint - 1]) {
        // Points at arc lengths a and b on either side of a bend of φ are at least (a + b) cos(φ / 2) apart, and only
        // those more than SAME_SECTION_RADII radii apart along the path count: a gentle bend cannot bring them together.
        if (SAME_SECTION_RADII * rr * Math.cos(halfBend[sPrim[ga]]![joint]) >= 2 * rr + margin)
          return;
      }
      limit = sR[ga] + sR[gb] + margin;
    } else {
      limit = reachOf(sR[ga], sBand[ga], sR[gb], sBand[gb], margin);
    }
    // Boxes first: most pairs of a cell are nowhere near each other.
    for (let c = 0; c < 3; c++) {
      const a0 = sEnds[6 * ga + c],
        a1 = sEnds[6 * ga + 3 + c],
        b0 = sEnds[6 * gb + c],
        b1 = sEnds[6 * gb + 3 + c];
      if (
        (a0 < a1 ? a0 : a1) - (b0 > b1 ? b0 : b1) >= limit ||
        (b0 < b1 ? b0 : b1) - (a0 > a1 ? a0 : a1) >= limit
      )
        return;
    }
    if (segmentSegment(sEnds, sEnds, ga, sEnds, sEnds, gb, 6) >= limit) return;
    refine(ga);
    refine(gb);
    for (let i = pieceFirst[ga]; i < pieceFirst[ga] + pieceCount[ga]; i++) {
      for (let j = pieceFirst[gb]; j < pieceFirst[gb] + pieceCount[gb]; j++) testPieces(i, j);
    }
  };

  // Chunks: runs of whole segments up to CHUNK_LENGTH long, and the parts of a segment longer than that. They exist
  // to be hashed; what is tested is their segments.
  let maxChunks = 0;
  for (let g = 0; g < S; g++)
    maxChunks += Math.max(1, Math.ceil((sArc[2 * g + 1] - sArc[2 * g]) / CHUNK_LENGTH));
  const cSegA = new Int32Array(maxChunks),
    cSegB = new Int32Array(maxChunks),
    cBox = new Float64Array(6 * maxChunks);
  let C = 0;
  for (let p = 0; p < prims.length; p++) {
    if (paths[p] === null) continue;
    let from = -1,
      length = 0,
      grow = 0;
    let x0 = Infinity,
      y0 = Infinity,
      z0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity,
      z1 = -Infinity;
    const flush = (to: number): void => {
      if (from < 0) return;
      cSegA[C] = from;
      cSegB[C] = to;
      cBox.set([x0 - grow, y0 - grow, z0 - grow, x1 + grow, y1 + grow, z1 + grow], 6 * C++);
      from = -1;
      length = 0;
      grow = 0;
      x0 = y0 = z0 = Infinity;
      x1 = y1 = z1 = -Infinity;
    };
    for (let g = segFirst[p]; g < segFirst[p + 1]; g++) {
      const len = sArc[2 * g + 1] - sArc[2 * g];
      // Two boxes grown like this overlap wherever the two segments are within a test's limit.
      const w = sBand[g] + sH[g];
      const o = 6 * g;
      if (len > CHUNK_LENGTH) {
        flush(g - 1);
        const parts = Math.ceil(len / CHUNK_LENGTH);
        for (let k = 0; k < parts; k++) {
          cSegA[C] = cSegB[C] = g;
          for (let c = 0; c < 3; c++) {
            const a = sEnds[o + c] + ((sEnds[o + 3 + c] - sEnds[o + c]) * k) / parts;
            const b = sEnds[o + c] + ((sEnds[o + 3 + c] - sEnds[o + c]) * (k + 1)) / parts;
            cBox[6 * C + c] = Math.min(a, b) - w;
            cBox[6 * C + c + 3] = Math.max(a, b) + w;
          }
          C++;
        }
        continue;
      }
      if (from >= 0 && length + len > CHUNK_LENGTH) flush(g - 1);
      if (from < 0) from = g;
      length += len;
      grow = Math.max(grow, w);
      x0 = Math.min(x0, sEnds[o], sEnds[o + 3]);
      y0 = Math.min(y0, sEnds[o + 1], sEnds[o + 4]);
      z0 = Math.min(z0, sEnds[o + 2], sEnds[o + 5]);
      x1 = Math.max(x1, sEnds[o], sEnds[o + 3]);
      y1 = Math.max(y1, sEnds[o + 1], sEnds[o + 4]);
      z1 = Math.max(z1, sEnds[o + 2], sEnds[o + 5]);
    }
    flush(segFirst[p + 1] - 1);
  }

  // The hash: every chunk is listed in the cells its box touches (`CellLists`). A pair of chunks is handled in the
  // first cell that both are listed in.
  const widths = new Float64Array(C);
  for (let c = 0; c < C; c++)
    widths[c] = Math.max(
      cBox[6 * c + 3] - cBox[6 * c],
      cBox[6 * c + 4] - cBox[6 * c + 1],
      cBox[6 * c + 5] - cBox[6 * c + 2]
    );
  const cell = Math.max(CHUNK_LENGTH, C > 0 ? widths.sort()[C >> 1] : 0);
  const range = new Int32Array(6 * C);
  for (let c = 0; c < 6 * C; c++) range[c] = Math.floor(cBox[c] / cell);
  const { head, next, item: entryChunk, cell: entryCell, buckets } = new CellLists(range, C);
  for (let b = 0; b < buckets; b++) {
    for (let x = head[b]; x >= 0; x = next[x]) {
      const ca = entryChunk[x];
      const ci = entryCell[3 * x],
        cj = entryCell[3 * x + 1],
        ck = entryCell[3 * x + 2];
      // A chunk against itself: a hairpin inside it.
      if (ci === range[6 * ca] && cj === range[6 * ca + 1] && ck === range[6 * ca + 2]) {
        for (let ga = cSegA[ca]; ga <= cSegB[ca]; ga++)
          for (let gb = ga + 1; gb <= cSegB[ca]; gb++) testSegments(ga, gb);
      }
      for (let y = next[x]; y >= 0; y = next[y]) {
        const cb = entryChunk[y];
        if (cb === ca) continue;
        if (entryCell[3 * y] !== ci || entryCell[3 * y + 1] !== cj || entryCell[3 * y + 2] !== ck)
          continue;
        // Only in the lowest cell the two share.
        if (
          ci !== Math.max(range[6 * ca], range[6 * cb]) ||
          cj !== Math.max(range[6 * ca + 1], range[6 * cb + 1]) ||
          ck !== Math.max(range[6 * ca + 2], range[6 * cb + 2])
        )
          continue;
        let apart = false;
        for (let a = 0; a < 3 && !apart; a++)
          apart =
            cBox[6 * ca + a] > cBox[6 * cb + 3 + a] || cBox[6 * cb + a] > cBox[6 * ca + 3 + a];
        if (apart) continue;
        for (let ga = cSegA[ca]; ga <= cSegB[ca]; ga++)
          for (let gb = cSegA[cb]; gb <= cSegB[cb]; gb++) testSegments(ga, gb);
      }
    }
  }

  // ---- Welds ----------------------------------------------------------------------------------------------------------
  // What touches is one surface, and blends from where it comes within reach to where it leaves it (kin.ts): the
  // pieces get their families again, and those that were within reach without touching are complex if a weld has
  // taken them in.
  for (let k = 0; k < perhaps.length; k += 3) {
    const i = perhaps[k],
      j = perhaps[k + 1];
    const fillets = (blended[i] === 1 ? fillet(i) : 0) + (blended[j] === 1 ? fillet(j) : 0);
    if (perhaps[k + 2] < pR[i] + pR[j] + Math.max(pH[i], pH[j]) + fillets) touch(i, j);
    else nearMisses.push(i, j);
  }
  kin = weldContacts(kin, prims, contacts, bandOf, localVoxel);
  if (kinOnly) return kin;
  if (contacts.length > 0) {
    for (let i = 0; i < pPrim.length; i++)
      pFamilies[i] = socialBetween(kin, pPrim[i], pS0[i], pS1[i], pBand[i]);
    for (let k = 0; k < nearMisses.length; k += 2) {
      const i = nearMisses[k],
        j = nearMisses[k + 1];
      if (!blends(i, j)) continue;
      // Into one cluster, but not as kin: it is by touching that they have come together.
      complex[i] = complex[j] = 1;
      union(i, j);
    }
  }

  // ---- Skeleton points the rings cannot follow, and segments too short for the creases at their ends ------------------------------
  const markRange = (p: number, from: number, to: number): void => {
    const path = paths[p]!;
    if (path.count < 2) return;
    const j0 = path.segmentAt(Math.max(0, from)),
      j1 = path.segmentAt(Math.min(path.length, to));
    let prev = -1;
    for (let j = j0; j <= j1; j++) {
      const g = segFirst[p] + j;
      refine(g);
      for (let i = pieceFirst[g]; i < pieceFirst[g] + pieceCount[g]; i++) {
        if (pS1[i] < from || pS0[i] > to) continue;
        complex[i] = 1;
        if (prev >= 0) unionKin(prev, i);
        prev = i;
      }
    }
  };
  for (let p = 0; p < prims.length; p++) {
    const path = paths[p];
    if (path === null || path.count < 3) continue;
    const alpha = halfBend[p]!,
      unfit = unfitUpTo[p]!;
    for (let k = 1; k + 1 < path.count; k++) {
      const r = path.points[4 * k + 3];
      if (unfit[k] > unfit[k - 1]) markRange(p, path.arc[k] - 2 * r, path.arc[k] + 2 * r);
    }
    for (let j = 0; j + 1 < path.count; j++) {
      const ra = path.points[4 * j + 3],
        rb = path.points[4 * j + 7];
      const need = ra * Math.tan(alpha[j]) + rb * Math.tan(alpha[j + 1]);
      if (need > FOLD_FRACTION * (path.arc[j + 1] - path.arc[j]))
        markRange(p, path.arc[j] - ra, path.arc[j + 1] + rb);
    }
  }

  // ---- Runs of complex pieces per section, the voxel of their patches, and room for the transitions -----------------------
  interface Run {
    a: number;
    b: number;
    piece: number;
    /** What `transition` gave at the run's ends, by side and voxel (`endOf`). */
    ends?: { side: number; v: number; t: Transition | null }[];
  }
  const runsOf = (p: number): Run[] => {
    const runs: Run[] = [];
    let open: Run | null = null,
      last = -1;
    for (let g = segFirst[p]; g < segFirst[p + 1]; g++) {
      if (pieceFirst[g] < 0) {
        open = null;
        continue;
      }
      for (let i = pieceFirst[g]; i < pieceFirst[g] + pieceCount[g]; i++) {
        if (complex[i] === 0) {
          open = null;
          continue;
        }
        if (open === null) {
          open = { a: pS0[i], b: pS1[i], piece: i };
          runs.push(open);
        } else {
          open.b = pS1[i];
          unionKin(last, i);
        }
        last = i;
      }
    }
    return runs;
  };
  const radiusAt = (path: SectionPath, s: number): number => {
    path.at(s, tmpA);
    return tmpA[3];
  };
  const minRadiusOver = (path: SectionPath, s0: number, s1: number): number => {
    let r = Math.min(radiusAt(path, s0), radiusAt(path, s1));
    for (let q = path.segmentAt(s0) + 1; q <= path.segmentAt(s1); q++)
      r = Math.min(r, path.points[4 * q + 3]);
    return r;
  };
  /**
   * How close to point q of a path a plane across the segment before it (first number) or after it (second) may lie.
   * The spheres of the segment beyond the point, whose direction is off by the bend φ and whose radii grow at τ, reach
   * a plane at distance a in circles; these stay inside the section's own, of radius r, if a ≥ r (sin φ + τ) / cos φ,
   * and they do not reach the plane at all from a = r on.
   */
  const clearances: { around: Float64Array; widest: number }[] = [];
  const clearance = (p: number): { around: Float64Array; widest: number } => {
    const known = clearances[p];
    if (known !== undefined) return known;
    const path = paths[p]!;
    const c = new Float64Array(2 * path.count);
    let widest = 0;
    for (let q = 1; q + 1 < path.count; q++) {
      const cos = bendCos[p]![q];
      const sin = Math.sqrt(Math.max(0, 1 - cos * cos));
      const r = path.points[4 * q + 3];
      const after = Math.max(0, (path.points[4 * q + 7] - r) / (path.arc[q + 1] - path.arc[q]));
      const before = Math.max(0, (path.points[4 * q - 1] - r) / (path.arc[q] - path.arc[q - 1]));
      c[2 * q] = r * Math.min(1, (sin + after) / Math.max(cos, 0.1));
      c[2 * q + 1] = r * Math.min(1, (sin + before) / Math.max(cos, 0.1));
      widest = Math.max(widest, c[2 * q], c[2 * q + 1]);
    }
    const made = { around: c, widest };
    clearances[p] = made;
    return made;
  };
  interface Transition {
    sClip: number;
    /** Where the ring goes before it is snapped, and the stub's end. */
    sRing: number;
    sEnd: number;
    collar: number;
    /** Shortest tube worth having beyond the ring. */
    tube: number;
    /** From the run's end to the ring, and to the far side of the stub's cap. */
    ringReach: number;
    stubReach: number;
  }
  /** Where a run of section p that ends at s, in a patch of voxel v, hands over to a tube on `side`; null without room on the section. */
  const transition = (p: number, s: number, side: 1 | -1, v: number): Transition | null => {
    const path = paths[p]!;
    const L = path.length;
    const m = margins(radiusAt(path, s), v, o);
    const { around, widest } = clearance(p);
    const within = CLEARANCE_SAFETY * widest + v;
    let sClip = s + side * m.clip;
    for (let moved = true; moved; ) {
      moved = false;
      if (!(sClip > 0 && sClip < L)) return null;
      // Away from the run, past every bend that is too close.
      const q0 = Math.max(1, path.segmentAt(Math.max(0, sClip - within))),
        q1 = Math.min(path.count - 2, path.segmentAt(Math.min(L, sClip + within)) + 1);
      for (let q = q0; q <= q1; q++) {
        if (around[2 * q] + around[2 * q + 1] === 0) continue;
        const lo = path.arc[q] - (CLEARANCE_SAFETY * around[2 * q] + v),
          hi = path.arc[q] + (CLEARANCE_SAFETY * around[2 * q + 1] + v);
        if (sClip > lo && sClip < hi) {
          sClip = side > 0 ? hi : lo;
          moved = true;
        }
      }
    }
    const sRing = sClip + side * m.collar;
    const sEnd = Math.min(L, Math.max(0, sClip + side * m.stub));
    const cap = Math.max(radiusAt(path, sEnd), floorVoxels * v);
    return {
      sClip,
      sRing,
      sEnd,
      collar: m.collar,
      tube: m.tube,
      ringReach: Math.abs(sRing - s),
      stubReach: Math.abs(sEnd - s) + cap,
    };
  };
  /** `transition` at an end of a run, once for every voxel: runs that no fill has changed keep what they were given. */
  const endOf = (p: number, run: Run, side: 1 | -1, v: number): Transition | null => {
    run.ends ??= [];
    const known = run.ends;
    for (const e of known) if (e.side === side && e.v === v) return e.t;
    const t = transition(p, side < 0 ? run.a : run.b, side, v);
    known.push({ side, v, t });
    return t;
  };
  /** Voxels of size v in the band of a fibre of radius r and length `len`, were it meshed at that size: a box along it, a cube around it without length. */
  const boxVoxels = (r: number, beta: number, len: number, v: number): number => {
    const across = (2 * bandHalfWidth(Math.max(r, floorVoxels * v), beta, v)) / v + 1;
    return (len > 0 ? len / v + 1 : across) * across * across;
  };
  /** Voxels of size v in the band of piece i, were it meshed at that size; for the soma, a box along each neck as well. */
  const pieceVoxels = (i: number, v: number): number => {
    let voxels = boxVoxels(pR[i], prims[pPrim[i]].beta, pS1[i] - pS0[i], v);
    if (i === SOMA) {
      for (let o = 8; o < somaSegs.length; o += 8) {
        const len = Math.hypot(
          somaSegs[o + 4] - somaSegs[o],
          somaSegs[o + 5] - somaSegs[o + 1],
          somaSegs[o + 6] - somaSegs[o + 2]
        );
        voxels += boxVoxels(0.5 * (somaSegs[o + 3] + somaSegs[o + 7]), somaBeta, len, v);
      }
    }
    return voxels;
  };
  /**
   * The voxel of every cluster, by its root: what its thinnest fibre calls for, stubs and collars included (as far as
   * they reach at the coarsest voxel, where they are longest), if there are voxels to spare for it. A patch of thin
   * fibres alone costs the same at any voxel, since it shrinks with them; what costs is a thin fibre on something
   * thick, and the soma's patch is most of the work as it is. So the patches may take `REFINE_SHARE` more voxels
   * than at the coarsest voxel altogether, handed out from the cheapest patch up, and none beyond `PATCH_BUDGET`.
   */
  const clusterVoxels = (
    allRuns: Run[][]
  ): { voxels: Map<number, number>; coarser: Set<number> } => {
    const thinnest = new Map<number, number>();
    const note = (piece: number, r: number): void => {
      const root = find(piece),
        known = thinnest.get(root);
      if (known === undefined || r < known) thinnest.set(root, r);
    };
    if (SOMA >= 0) note(SOMA, pR[SOMA]);
    for (let g = 0; g < S; g++) if (sphere[g] === 1) note(pieceFirst[g], sR[g]);
    for (let p = 0; p < prims.length; p++) {
      const path = paths[p];
      if (path === null) continue;
      for (const run of allRuns[p]) {
        const lo = run.a > 0 ? endOf(p, run, -1, h) : null,
          hi = run.b < path.length ? endOf(p, run, 1, h) : null;
        const from = lo === null ? 0 : Math.max(0, Math.min(lo.sEnd, lo.sRing));
        note(
          run.piece,
          minRadiusOver(
            path,
            from,
            hi === null ? path.length : Math.min(path.length, Math.max(hi.sEnd, hi.sRing))
          )
        );
      }
    }
    // What each cluster costs at the coarsest voxel and at the one it calls for.
    const coarse = new Map<number, number>(),
      fine = new Map<number, number>();
    let base = 0;
    for (let i = 0; i < pPrim.length; i++) {
      if (complex[i] === 0 && i !== SOMA) continue;
      const root = find(i);
      const ideal = localVoxel(thinnest.get(root)!);
      const atCoarse = pieceVoxels(i, h);
      base += atCoarse;
      if (ideal >= h) continue;
      coarse.set(root, (coarse.get(root) ?? 0) + atCoarse);
      fine.set(root, (fine.get(root) ?? 0) + pieceVoxels(i, ideal));
    }
    // The most that one patch may come to, so that all of them stay within what there is to spend.
    const spare = REFINE_SHARE * base + REFINE_FREE;
    const extra = (each: number): number => {
      let sum = 0;
      for (const [root, atCoarse] of coarse)
        sum += Math.max(0, Math.min(fine.get(root)!, each) - atCoarse);
      return sum;
    };
    let each = PATCH_BUDGET;
    if (extra(each) > spare) {
      let lo = 0;
      for (let step = 0; step < 40; step++) {
        const mid = 0.5 * (lo + each);
        if (extra(mid) > spare) each = mid;
        else lo = mid;
      }
      each = lo;
    }
    const voxels = new Map<number, number>(),
      coarser = new Set<number>();
    for (const [root, r] of thinnest) {
      const ideal = localVoxel(r);
      let v = ideal;
      const atCoarse = coarse.get(root),
        atIdeal = fine.get(root);
      if (atCoarse !== undefined && atIdeal !== undefined && atIdeal > Math.max(atCoarse, each)) {
        // The cost follows a power of the voxel between the two; stop where it meets what is allowed.
        const power = Math.log(atIdeal / atCoarse) / Math.log(h / ideal);
        v = Math.min(h, Math.max(ideal, h * (atCoarse / Math.max(atCoarse, each)) ** (1 / power)));
      }
      voxels.set(root, v);
      if (floorVoxels * v > r + RADIUS_EPS) coarser.add(root);
    }
    return { voxels, coarser };
  };

  /**
   * A patch that stays coarser than its thinnest fibre calls for meshes that fibre at the patch's floor, and the
   * fibre was laid out at its own radius: thicker, it blends with the rest of the patch over a longer way, and the
   * run may end where it still does. Beyond the end of a run of section p at `from`, up to `to`: the far end of the
   * first piece that, at the floor, still comes within reach of the cluster's `members`, or NaN.
   */
  const stillBlending = (
    p: number,
    from: number,
    to: number,
    members: number[],
    v: number
  ): number => {
    const path = paths[p]!;
    const floor = floorVoxels * v,
      side = to > from ? 1 : -1;
    const lo = Math.min(from, to),
      hi = Math.max(from, to);
    let far = NaN;
    for (let j = path.segmentAt(lo); j <= path.segmentAt(hi); j++) {
      const g = segFirst[p] + j;
      refine(g);
      for (let i = pieceFirst[g]; i < pieceFirst[g] + pieceCount[g]; i++) {
        if (complex[i] === 1 || pS1[i] <= lo || pS0[i] >= hi) continue;
        const ri = Math.max(pR[i], floor),
          bi = bandHalfWidth(ri, prims[p].beta, v);
        const mx = 0.5 * (pA[3 * i] + pB[3 * i]),
          my = 0.5 * (pA[3 * i + 1] + pB[3 * i + 1]),
          mz = 0.5 * (pA[3 * i + 2] + pB[3 * i + 2]);
        const half = 0.5 * (pS1[i] - pS0[i]);
        /** How near member m, of radius rm and band bm, must come to piece i to still blend with it or touch it. */
        const limitOf = (m: number, rm: number, bm: number): number =>
          blends(i, m)
            ? reachOf(ri, bi, rm, bm, v)
            : ri + rm + fillet(i, bi, ri) + fillet(m, bm, rm) + v;
        for (const m of members) {
          let near = false;
          if (m === SOMA) {
            // The soma's sphere and its necks, each at its radius where it is closest.
            for (let q = 0; 8 * q < somaSegs.length && !near; q++) {
              const rm = Math.max(somaSegment(q, pA, pB, i, 3), floor);
              near = nearest.d < limitOf(m, rm, bandHalfWidth(rm, somaBeta, v));
            }
          } else {
            const rm = Math.max(pR[m], floor);
            let limit: number;
            if (pPrim[m] === p) {
              if (oneSurface(i, m, ri, rm)) continue;
              limit = ri + rm + v;
            } else limit = limitOf(m, rm, bandHalfWidth(rm, prims[pPrim[m]].beta, v));
            // Middles first: most members are nowhere near.
            const reach = limit + half + 0.5 * (pS1[m] - pS0[m]);
            const dx = mx - 0.5 * (pA[3 * m] + pB[3 * m]),
              dy = my - 0.5 * (pA[3 * m + 1] + pB[3 * m + 1]),
              dz = mz - 0.5 * (pA[3 * m + 2] + pB[3 * m + 2]);
            near =
              dx * dx + dy * dy + dz * dz < reach * reach &&
              segmentSegment(pA, pB, i, pA, pB, m) < limit;
          }
          if (!near) continue;
          const end = side > 0 ? pS1[i] : pS0[i];
          if (!(side * (end - far) <= 0)) far = end;
          break;
        }
      }
    }
    return far;
  };

  // Gaps between runs with too little room are filled, which may join two clusters, which may change their voxel and
  // with it the room the next gap needs: all the gaps are judged with one set of voxels, then filled, until none is.
  const allRuns: Run[][] = prims.map((_, p) => (paths[p] === null ? [] : runsOf(p)));
  let { voxels, coarser } = clusterVoxels(allRuns);
  for (;;) {
    const fill: [number, number, number][] = [];
    const members = new Map<number, number[]>();
    if (coarser.size > 0) {
      for (let i = 0; i < pPrim.length; i++) {
        if (complex[i] === 0 && i !== SOMA) continue;
        const root = find(i);
        if (!coarser.has(root)) continue;
        const list = members.get(root);
        if (list) list.push(i);
        else members.set(root, [i]);
      }
    }
    for (let p = 0; p < prims.length; p++) {
      const path = paths[p];
      if (path === null) continue;
      const L = path.length,
        runs = allRuns[p];
      for (let q = 0; q < runs.length; q++) {
        const run = runs[q];
        const v = voxels.get(find(run.piece))!;
        // In a patch coarser than it calls for: the run reaches as far as the patch's floor makes its fibres blend,
        // and then as far again as the tube takes to come down from that floor.
        const among = members.get(find(run.piece));
        if (among !== undefined) {
          for (const side of [-1, 1] as const) {
            const from = side < 0 ? run.a : run.b;
            if (side < 0 ? from <= 0 : from >= L) continue;
            const t = endOf(p, run, side, v);
            if (t === null) continue;
            const end = side < 0 ? Math.min(t.sEnd, t.sRing) : Math.max(t.sEnd, t.sRing);
            const thin = minRadiusOver(path, Math.min(from, end), Math.max(from, end));
            const ramp = Math.max(0, floorVoxels * v - thin) / RAMP_SLOPE;
            const far = stillBlending(
              p,
              from,
              Math.min(L, Math.max(0, end + side * ramp)),
              among,
              v
            );
            if (!Number.isNaN(far)) fill.push([p, Math.min(from, far), Math.max(from, far)]);
          }
        }
        // Too little room before the run for a tube from the section's start.
        if (q === 0 && run.a > 0) {
          const t = endOf(p, run, -1, v);
          if (t === null || run.a < t.ringReach + t.tube) fill.push([p, 0, run.a]);
        }
        if (run.b < L && q + 1 === runs.length) {
          const t = endOf(p, run, 1, v);
          if (t === null || L - run.b < t.ringReach + t.tube) fill.push([p, run.b, L]);
        } else if (q + 1 < runs.length) {
          // Room for two collars and a tube between them, and for the two stubs with their caps not to touch: in one
          // patch they would merge, and neither could be cut off.
          const next = runs[q + 1],
            vn = voxels.get(find(next.piece))!;
          const hi = endOf(p, run, 1, v),
            lo = endOf(p, next, -1, vn);
          const room =
            hi === null || lo === null
              ? Infinity
              : Math.max(
                  hi.ringReach + lo.ringReach + Math.max(hi.tube, lo.tube),
                  hi.stubReach + lo.stubReach + 2 * Math.max(v, vn)
                );
          if (next.a - run.b < room) fill.push([p, run.b, next.a]);
        }
      }
    }
    if (fill.length === 0) break;
    for (const [p, from, to] of fill) markRange(p, from, to);
    for (const p of new Set(fill.map((f) => f[0]))) allRuns[p] = runsOf(p);
    ({ voxels, coarser } = clusterVoxels(allRuns));
  }

  // ---- Patches, interfaces and stretches -------------------------------------------------------------------------------
  const patchOf = new Map<number, number>();
  const patches: Patch[] = [];
  const patchFor = (piece: number): number => {
    const root = find(piece);
    let id = patchOf.get(root);
    if (id === undefined) {
      id = patches.length;
      patchOf.set(root, id);
      patches.push({ pieces: [], soma: false, interfaces: [], voxel: voxels.get(root) ?? h });
    }
    return id;
  };
  if (SOMA >= 0) patches[patchFor(SOMA)].soma = true;

  const interfaces: Interface[] = [];
  const stretches: Stretch[] = [];
  /** Per section: where a patch's floor holds in full. */
  const zones: Zone[][] = prims.map(() => []);
  let plainLength = 0;
  /** A ring next to a skeleton point moves onto it: the point would have a ring of its own a sliver away. */
  const snapRing = (path: SectionPath, s: number, within: number): number => {
    const j = path.segmentAt(s);
    for (const q of [j, j + 1])
      if (q > 0 && q + 1 < path.count && Math.abs(path.arc[q] - s) <= within) return path.arc[q];
    return s;
  };
  /** The interface of patch `patch` at the end of a run of section p on `side`, its ring snapped to a skeleton point. */
  const addInterface = (
    p: number,
    run: Run,
    side: 1 | -1,
    patch: number
  ): Interface & { id: number } => {
    const path = paths[p]!,
      t = endOf(p, run, side, patches[patch].voxel)!;
    const f: Interface = {
      prim: p,
      patch,
      sClip: t.sClip,
      sRing: snapRing(path, t.sRing, RING_SNAP * t.collar),
      sEnd: t.sEnd,
      side,
    };
    const id = interfaces.length;
    interfaces.push(f);
    patches[patch].interfaces.push(id);
    return { ...f, id };
  };
  for (let p = 0; p < prims.length; p++) {
    const path = paths[p];
    if (path === null) continue;
    const L = path.length;
    const runs = allRuns[p];
    let from = 0,
      fromInterface = -1;
    for (const run of runs) {
      const patch = patchFor(run.piece);
      const piece: PatchPiece = { prim: p, s0: 0, s1: L };
      const zone: Zone = { s0: 0, s1: L, floor: floorVoxels * patches[patch].voxel };
      if (run.a > 0) {
        const f = addInterface(p, run, -1, patch);
        piece.s0 = f.sEnd;
        zone.s0 = Math.min(f.sEnd, f.sRing);
        stretches.push({
          prim: p,
          s0: from,
          s1: f.sRing,
          startInterface: fromInterface,
          endInterface: f.id,
        });
        plainLength += f.sRing - from;
      }
      if (run.b < L) {
        const f = addInterface(p, run, 1, patch);
        piece.s1 = f.sEnd;
        zone.s1 = Math.max(f.sEnd, f.sRing);
        from = f.sRing;
        fromInterface = f.id;
      } else {
        from = L;
      }
      patches[patch].pieces.push(piece);
      zones[p].push(zone);
    }
    if (from < L) {
      stretches.push({ prim: p, s0: from, s1: L, startInterface: fromInterface, endInterface: -1 });
      plainLength += L - from;
    }
  }

  // ---- The radii that are meshed ------------------------------------------------------------------------------------------
  let flooredLength = 0;
  for (let p = 0; p < prims.length; p++) {
    const path = paths[p];
    if (path === null || zones[p].length === 0) continue;
    const floored = flooredPath(path, zones[p], RAMP_SLOPE);
    paths[p] = floored.path;
    flooredLength += floored.raised;
  }
  // Within a cluster, what neither blends nor follows each other along a section has come together by touching.
  const kinds = new Map<number, Set<number>>();
  for (let i = 0; i < pPrim.length; i++) {
    if (complex[i] === 0 && i !== SOMA) continue;
    const root = find(i),
      set = kinds.get(root);
    if (set) set.add(kinFind(i));
    else kinds.set(root, new Set([kinFind(i)]));
  }
  let touches = 0;
  for (const set of kinds.values()) touches += set.size - 1;
  return {
    paths,
    stretches,
    patches,
    interfaces,
    plainLength,
    totalLength,
    flooredLength,
    kin,
    contacts: touches,
  };
}

/** A stretch of a section over which radii are at least `floor`. */
interface Zone {
  s0: number;
  s1: number;
  floor: number;
}

/**
 * The path with its radii raised to the zones' floors, and beyond a zone to a ramp that comes down from the floor at
 * `slope`, so that a tube leaves a patch at the radius the patch has there. Points are added where a ramp meets the
 * traced radius; elsewhere the radius is taken at the path's points, which can only err upwards. Returns the path
 * itself if nothing is raised, and the length over which something is.
 */
export function flooredPath(
  path: SectionPath,
  zones: Zone[],
  slope: number
): { path: SectionPath; raised: number } {
  const L = path.length,
    pts = path.points,
    tmp = new Float64Array(4);
  if (path.count < 2) {
    let r = pts[3];
    for (const z of zones) r = Math.max(r, z.floor);
    if (r <= pts[3] + RADIUS_EPS) return { path, raised: 0 };
    return { path: new SectionPath(Float64Array.of(pts[0], pts[1], pts[2], r)), raised: 0 };
  }
  // Nearly always the patches' voxels suit their fibres and no floor is above any radius.
  let thinnest = Infinity,
    highest = 0;
  for (let q = 0; q < path.count; q++) thinnest = Math.min(thinnest, pts[4 * q + 3]);
  for (const z of zones) highest = Math.max(highest, z.floor);
  if (highest <= thinnest + RADIUS_EPS) return { path, raised: 0 };
  const floorAt = (s: number): number => {
    let f = 0;
    for (const z of zones)
      f = Math.max(f, z.floor - slope * (s < z.s0 ? z.s0 - s : s > z.s1 ? s - z.s1 : 0));
    return f;
  };
  // Where each ramp meets the traced radius: both are linear along a segment.
  const cuts: number[] = [];
  for (const z of zones) {
    for (const side of [-1, 1]) {
      const at = side < 0 ? z.s0 : z.s1;
      const reach =
        side < 0 ? Math.max(0, at - z.floor / slope) : Math.min(L, at + z.floor / slope);
      if (reach === at) continue;
      cuts.push(at);
      const j0 = path.segmentAt(Math.min(at, reach)),
        j1 = path.segmentAt(Math.max(at, reach));
      for (let j = j0; j <= j1; j++) {
        const u0 = Math.max(path.arc[j], Math.min(at, reach)),
          u1 = Math.min(path.arc[j + 1], Math.max(at, reach));
        if (!(u1 > u0)) continue;
        path.at(u0, tmp);
        const g0 = z.floor - slope * Math.abs(u0 - at) - tmp[3];
        path.at(u1, tmp);
        const g1 = z.floor - slope * Math.abs(u1 - at) - tmp[3];
        if (g0 > 0 !== g1 > 0) cuts.push(u0 + ((u1 - u0) * g0) / (g0 - g1));
      }
    }
  }
  const arcs: number[] = Array.from(path.arc);
  const eps = 1e-9 * Math.max(1, L);
  for (const c of cuts) if (c > eps && c < L - eps) arcs.push(c);
  arcs.sort((a, b) => a - b);
  const out: number[] = [],
    grown: number[] = [];
  let last = -Infinity;
  for (const s of arcs) {
    if (s - last <= eps) continue;
    last = s;
    path.at(s, tmp);
    const r = Math.max(tmp[3], floorAt(s));
    grown.push(s, r - tmp[3]);
    out.push(tmp[0], tmp[1], tmp[2], r);
  }
  let raised = 0;
  for (let q = 2; q < grown.length; q += 2) {
    const a = grown[q - 1] > RADIUS_EPS,
      b = grown[q + 1] > RADIUS_EPS;
    if (a || b) raised += (grown[q] - grown[q - 2]) * (a && b ? 1 : 0.5);
  }
  if (raised === 0) return { path, raised: 0 };
  return { path: new SectionPath(Float64Array.from(out)), raised };
}

/** Scratch for `segmentSegment` and the soma's tests: planning is serial. */
const nearest: Closest = { d: 0, s: 0, t: 0 };

/**
 * Distance between two segments. Segment i starts at A1[3 i] and ends at B1[3 i]; with a `stride` of 6, both ends lie
 * in one array, the end three numbers after the start.
 */
function segmentSegment(
  A1: ArrayLike<number>,
  B1: ArrayLike<number>,
  i: number,
  A2: ArrayLike<number>,
  B2: ArrayLike<number>,
  j: number,
  stride = 3
): number {
  const oi = stride * i,
    oj = stride * j,
    shift = stride === 6 ? 3 : 0;
  closestOnSegments(A1, oi, B1, oi + shift, A2, oj, B2, oj + shift, nearest);
  return nearest.d;
}
