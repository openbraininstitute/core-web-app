/**
 * Hybrid mesher: swept tubes where a section runs alone, voxels where sections blend.
 *
 * The voxel mesher (mesher.ts) spends its time in proportion to the surface, and on a neuron nearly all of the surface
 * is plain tube: 98 % of the cable of a whole-brain projection neuron, 93 % of a cortical cell's. There it samples a
 * field whose level set is known in closed form, extracts a mesh whose facets follow the grid rather than the tube,
 * and then cannot simplify it, because the quadric error takes the facets' tilt for shape. Here the plain stretches
 * are swept directly (tubes.ts), and only the patches around branch points, the soma, near contacts and sharp bends
 * go through the voxels, each as a small mesh of its own with the unchanged pipeline (classify.ts says which).
 *
 * A patch is meshed from a copy of the skeleton around it, whose sections are cut off a little beyond the patch, so
 * its surface is closed and the whole pipeline (field, surface nets, projection, checked simplification) runs on it
 * as on a small cell. The stubs are then cut away at planes across the sections (clip.ts), which leaves a loop of
 * vertices on the exact surface in each plane. A tube starts a collar's length farther on, with a ring of its own,
 * and `mergeHybrid` fills the collar between loop and ring. Tubes and patches share no samples and no vertices, so
 * they are meshed independently, in any order, on any worker; the pool hands them out in batches that are compact
 * in space (they become the render chunks) and about equal in work. A patch too large for one worker's share, the
 * soma with everything that grows out of it as a rule, is cut into slabs like a whole cell, which the pool spreads
 * over the workers (and over the GPU backend, if that is on) before one of them stitches and clips it.
 *
 * Where nothing is thinner than a voxel, the surface is the voxel mesher's: the tubes lie on F = 1, the patches are
 * its voxel mesh, and both keep within the same tolerance. Where something is, it is not, and better: one grid holds
 * no fibre under a voxel in radius and has to thicken it, but a tube needs no grid and a patch has one of its own. So
 * the sections keep their traced radii here, every patch is meshed at a voxel fine enough for the thinnest fibre in it
 * (classify.ts chooses it, and says where that would cost too much and the fibres are thickened after all), and the
 * voxel of the parameters is merely the coarsest. If anything goes wrong (a clip that finds no loop, a ray that finds
 * no surface) the build throws and the caller falls back to the voxel mesher.
 */

import { type Interface, type Layout, layoutSkeleton, type PatchPiece } from './classify';
import { type ClipOutput, type ClipPlane, clipMesh } from './clip';
import { partAt, partsBetween } from './kin';
import {
  boundsOf,
  collectPrimitives,
  countNonManifoldEdges,
  estimateBandVoxels,
  type FieldPrim,
  type HybridStats,
  layoutOptions,
  type MeshChunk,
  type MeshParams,
  type MeshResult,
  type MeshStats,
  meshCenter,
  meshSlab,
  type Prim,
  planPrimitives,
  type SlabJob,
  type SlabResult,
  type SlabWork,
  type SomaMeshed,
  segmentCount,
  somaMeshed,
  somaSegments,
  stitchSlabs,
  sumWork,
} from './mesher';
import { countPoints, prepareMorphology, sectionSegments, untangleReport } from './prepare';
import {
  across,
  aroundFor,
  bridgeLoops,
  ringEdge,
  SectionPath,
  TubeMesher,
  type TubeSpec,
  tubeTolerance,
  WINDOW_RADII,
} from './tubes';

import type { SkeletonData } from './protocol';
import type { Morphology } from './swc';
import type { UntangleReport } from './untangle';

/** Largest ratio of the distance between a tube's rings to the edge length around them, unless the parameters say. */
export const DEFAULT_TUBE_ASPECT = 16;
/** A patch with more band voxels than this is cut into slabs of its own instead of riding in a batch. */
const BIG_PATCH_BAND_VOXELS = 2e6;
/** Work of a tube vertex in band voxels, for balancing the batches. */
const TUBE_VERTEX_COST = 12;
/** Path on either side of a stretch or an interface that a job takes along, in radii: more than decides its surface (`WINDOW_RADII`). */
const JOB_WINDOW_RADII = WINDOW_RADII + 1;
/** A lone sphere's neck targets. */
const NO_TARGETS = new Float64Array(0);
/**
 * How many times finer than the voxel of the parameters a patch's voxel may be. Radii are held above the floor of the
 * finest one, so this is also how far below the voxel mesher's floor the calibre is true. Not more than 4: a fibre in a
 * patch that stays coarser than it calls for (classify.ts) is laid out at its own radius and meshed at the patch's
 * floor, and up to here the margins of the layout keep it clear of whatever was found to pass it by.
 */
export const MAX_REFINE = 4;

export interface HybridParams extends MeshParams {
  /** Largest ratio of ring spacing to ring edge on the tubes. */
  tubeAspect?: number;
}

export interface TubeJob extends TubeSpec {
  /** Interfaces at the tube's ends, -1 where it is capped. */
  startInterface: number;
  endInterface: number;
}

export interface InterfaceJob {
  id: number;
  /** The section's points around the clip plane, and the plane's arc length along them. */
  points: Float64Array;
  sClip: number;
  side: 1 | -1;
  /** Length of the stub beyond the plane. */
  stub: number;
}

export interface PatchJob {
  prims: FieldPrim[];
  interfaces: InterfaceJob[];
  /** Voxel of the patch's grid, µm. */
  voxel: number;
  bandVoxels: number;
}

export interface HybridBatch {
  index: number;
  center: [number, number, number];
  simplifyMesh: number;
  project: boolean;
  tolerance: number;
  maxAspect: number;
  tubes: TubeJob[];
  patches: PatchJob[];
}

/** What the clip needs to know besides the mesh. */
export interface ClipContext {
  center: [number, number, number];
  voxel: number;
  tolerance: number;
}

/** A patch meshed as slabs of its own. Its result takes the place of a batch's, under `index`. */
export interface BigPatch extends ClipContext {
  index: number;
  slabs: number;
  jobs: SlabJob[];
  interfaces: InterfaceJob[];
}

export type BigPatchInfo = Omit<BigPatch, 'jobs'>;

/** A mesh's vertex attributes and triangles, as a batch is made of them. */
interface MeshPart {
  positions: Float32Array;
  normals: Float32Array;
  vertexTypes: Uint8Array;
  /** Per vertex, the radius of the closest section (µm): a tube's ring, a patch's last field sample (a cut vertex takes its near end's). */
  radii: Float32Array;
  indices: Uint32Array;
}

/** A batch meshed; `rawTriangles` counts its tubes' as well. The `gpu` statistics are there when slabs of it ran on the GPU. */
export interface BatchResult extends MeshPart, SlabWork {
  index: number;
  /** The box of its vertices, for its render chunk (`MeshChunk.bounds`). */
  bounds: MeshChunk['bounds'];
  /** Interface, first vertex and size of every open tube ring. */
  rings: Int32Array;
  /** Interface, offset into `loopVertices` and size of every patch loop. */
  loops: Int32Array;
  loopVertices: Uint32Array;
  tubeTriangles: number;
  defects: number;
  nonManifoldEdges: number;
  tubeMs: number;
  /** Stitching the patches' slabs and cutting them open. */
  clipMs: number;
}

export interface HybridPlan {
  /** The voxel of the parameters, which is the coarsest of the patches', and the finest of them. */
  voxel: number;
  finestVoxel: number;
  center: [number, number, number];
  sections: number;
  segments: number;
  points: number;
  rawPoints: number;
  untangle?: UntangleReport;
  soma?: SomaMeshed;
  bandVoxels: number;
  tubes: number;
  patches: number;
  plainFraction: number;
  /** Share of the cable that is meshed thicker than traced. */
  flooredFraction: number;
  /** How many times fibres that do not blend touch. */
  contacts: number;
  planMs: number;
  /** Per interface: the clip plane's axis point, then the ring's, relative to `center`. */
  interfaceAxes: Float64Array;
  batches: HybridBatch[];
  bigPatches: BigPatch[];
  skeleton: SkeletonData;
}

export type HybridPlanInfo = Omit<HybridPlan, 'batches' | 'bigPatches' | 'skeleton'>;

export interface HybridPlanOptions {
  /** Upper bound on the number of batches. */
  maxBatches: number;
  /** Upper bound on the slabs of a big patch; 1 keeps every patch in a batch. */
  maxSlabs?: number;
  /** As `PlanOptions.maxBandVoxelsPerSlab`, for the slabs of big patches. */
  maxBandVoxelsPerSlab?: number;
  /**
   * Band voxels above which a patch is cut into slabs of its own rather than riding in a batch, which is also what
   * sends it to the GPU. `BIG_PATCH_BAND_VOXELS` unless given; a backend that meshes slabs on the GPU lowers it, so
   * that the small patches go there too rather than being splatted on the worker.
   */
  bigPatchBandVoxels?: number;
}

/** Mesh in the calling thread, batch after batch. */
export function buildHybrid(
  m: Morphology,
  params: HybridParams,
  opts: HybridPlanOptions = { maxBatches: 1 }
): MeshResult {
  const t0 = performance.now();
  const { batches, bigPatches, ...plan } = planHybrid(m, params, opts);
  const results = batches.map(meshBatch);
  for (const { jobs, ...big } of bigPatches) results.push(finishPatch(big, jobs.map(meshSlab)));
  const res = mergeHybrid(plan, results);
  res.stats.totalMs = performance.now() - t0;
  return res;
}

// ---------------------------------------------------------------------------
// Planning

/**
 * What is a tube and what a patch, for a morphology that has been prepared: the primitives at their traced calibre,
 * their layout, whose paths carry the radii that are meshed, and the tubes' tolerance.
 */
export function hybridLayout(
  prepared: Morphology,
  params: HybridParams
): { prims: Prim[]; layout: Layout; floorVoxels: number; tolerance: number } {
  const h = params.voxel;
  if (!(h > 0)) throw new Error('voxel size must be positive');
  // The radius floor in voxels is the parameters'; the voxels it is counted in are each patch's own.
  const { floorVoxels, tolerance } = layoutOptions(params);
  const hMin = h / MAX_REFINE;
  const prims = collectPrimitives(prepared, params, floorVoxels * hMin);
  if (prims.length === 0) throw new Error('nothing to mesh: no sections selected');
  return {
    prims,
    layout: layoutSkeleton(prims, { h, hMin, floorVoxels, tolerance }),
    floorVoxels,
    tolerance,
  };
}

export function planHybrid(
  m: Morphology,
  params: HybridParams,
  opts: HybridPlanOptions
): HybridPlan {
  const t0 = performance.now();
  const h = params.voxel;
  const prepared = prepareMorphology(m, params);
  const { prims, layout, floorVoxels, tolerance } = hybridLayout(prepared, params);
  const center = meshCenter(m);
  const simplifyMesh = Math.max(0, params.simplifyMesh ?? 0);
  const maxAspect = params.tubeAspect ?? DEFAULT_TUBE_ASPECT;

  interface Item {
    cost: number;
    x: number;
    y: number;
    z: number;
    tube?: TubeJob;
    patch?: PatchJob;
  }
  const items: Item[] = [];
  const tmp = new Float64Array(4);

  for (const st of layout.stretches) {
    const path = layout.paths[st.prim]!;
    const [points, offset] = windowOf(path, st.s0, st.s1, tolerance);
    const tube: TubeJob = {
      points,
      s0: st.s0 - offset,
      s1: st.s1 - offset,
      capStart: st.startInterface < 0,
      capEnd: st.endInterface < 0,
      type: prims[st.prim].type,
      startInterface: st.startInterface,
      endInterface: st.endInterface,
    };
    path.at(0.5 * (st.s0 + st.s1), tmp);
    const rings = points.length / 4 + (st.s1 - st.s0) / (maxAspect * ringEdge(tmp[3], tolerance));
    const around = aroundFor(tmp[3], tubeTolerance(tmp[3], tolerance));
    items.push({ cost: TUBE_VERTEX_COST * rings * around, x: tmp[0], y: tmp[1], z: tmp[2], tube });
  }

  const interfaceAxes = new Float64Array(6 * layout.interfaces.length);
  layout.interfaces.forEach((f, id) => {
    const path = layout.paths[f.prim]!;
    path.at(f.sClip, tmp);
    for (let c = 0; c < 3; c++) interfaceAxes[6 * id + c] = tmp[c] - center[c];
    path.at(f.sRing, tmp);
    for (let c = 0; c < 3; c++) interfaceAxes[6 * id + 3 + c] = tmp[c] - center[c];
  });

  const big: PatchJob[] = [];
  const maxSlabs = Math.max(1, Math.floor(opts.maxSlabs ?? 1));
  const bigPatchBandVoxels = opts.bigPatchBandVoxels ?? BIG_PATCH_BAND_VOXELS;
  let bandVoxels = 0,
    finestVoxel = h;
  for (const patch of layout.patches) {
    const patchPrims = patchPrimitives(
      prims,
      layout,
      patch.pieces,
      patch.soma,
      floorVoxels * patch.voxel
    );
    if (patchPrims.length === 0) continue;
    const job: PatchJob = {
      prims: patchPrims,
      interfaces: patch.interfaces.map((id) => interfaceJob(layout, id, tolerance)),
      voxel: patch.voxel,
      bandVoxels: estimateBandVoxels(patchPrims, patch.voxel),
    };
    finestVoxel = Math.min(finestVoxel, patch.voxel);
    bandVoxels += job.bandVoxels;
    if (maxSlabs > 1 && job.bandVoxels > bigPatchBandVoxels) {
      big.push(job);
      continue;
    }
    const s = patchPrims[0].segs;
    items.push({ cost: job.bandVoxels, x: s[0], y: s[1], z: s[2], patch: job });
  }

  const batches = makeBatches(items, Math.max(1, Math.floor(opts.maxBatches))).map(
    (group, index): HybridBatch => ({
      index,
      center,
      simplifyMesh,
      project: params.project !== false,
      tolerance,
      maxAspect,
      tubes: group.filter((it) => it.tube).map((it) => it.tube!),
      patches: group.filter((it) => it.patch).map((it) => it.patch!),
    })
  );

  const bigPatches = big.map((job, k): BigPatch => {
    // Only a patch that is big in its own right is worth cutting up: a slab cut locks the vertices along it, so a
    // patch that took the slab road only because the backend prefers it keeps the surface it had in a batch.
    const { jobs } = planPrimitives(
      job.prims,
      { voxel: job.voxel, simplifyMesh, project: params.project },
      center,
      {
        maxSlabs: job.bandVoxels > BIG_PATCH_BAND_VOXELS ? maxSlabs : 1,
        maxBandVoxelsPerSlab: opts.maxBandVoxelsPerSlab,
      }
    );
    return {
      index: batches.length + k,
      slabs: jobs.length,
      jobs,
      interfaces: job.interfaces,
      center,
      voxel: job.voxel,
      tolerance,
    };
  });

  return {
    voxel: h,
    finestVoxel,
    center,
    sections: prims.length,
    segments: segmentCount(prims),
    points: countPoints(prepared.sections),
    rawPoints: countPoints(m.sections),
    untangle: untangleReport(prepared),
    soma: somaMeshed(prepared, prims),
    bandVoxels,
    tubes: layout.stretches.length,
    patches: layout.patches.length,
    plainFraction: layout.totalLength > 0 ? layout.plainLength / layout.totalLength : 0,
    flooredFraction: layout.totalLength > 0 ? layout.flooredLength / layout.totalLength : 0,
    contacts: layout.contacts,
    planMs: performance.now() - t0,
    interfaceAxes,
    batches,
    bigPatches,
    skeleton: sectionSegments(prepared.sections, center),
  };
}

/** The points of `path` that decide the surface between arc lengths s0 and s1, and the arc length of the first. */
function windowOf(
  path: SectionPath,
  s0: number,
  s1: number,
  tolerance: number
): [Float64Array, number] {
  let rmax = 0;
  const j0 = path.segmentAt(s0),
    j1 = path.segmentAt(s1);
  for (let k = j0; k <= j1 + 1; k++) rmax = Math.max(rmax, path.points[4 * k + 3]);
  const reach = JOB_WINDOW_RADII * rmax + tolerance;
  const k0 = path.segmentAt(Math.max(0, s0 - reach));
  const k1 = path.segmentAt(Math.min(path.length, s1 + reach)) + 1;
  return [path.points.slice(4 * k0, 4 * (k1 + 1)), path.arc[k0]];
}

function interfaceJob(layout: Layout, id: number, tolerance: number): InterfaceJob {
  const f: Interface = layout.interfaces[id];
  const path = layout.paths[f.prim]!;
  const [points, offset] = windowOf(
    path,
    Math.min(f.sClip, f.sEnd),
    Math.max(f.sClip, f.sEnd),
    tolerance
  );
  return { id, points, sClip: f.sClip - offset, side: f.side, stub: Math.abs(f.sEnd - f.sClip) };
}

/**
 * A patch's copy of the skeleton: the soma if it is in it, necks and all, and of every section the parts the patch
 * covers, with the radii of the layout's paths, which are nowhere below the patch's `floor`. The soma is laid again at
 * that floor (`somaSegments`), so that its necks stay tangent to the sphere and to their targets as the floor has them.
 * A section that the layout cuts where a star ends (kin.ts) comes in those parts, each with its family.
 */
function patchPrimitives(
  prims: Prim[],
  layout: Layout,
  pieces: PatchPiece[],
  soma: boolean,
  floor: number
): FieldPrim[] {
  const out: FieldPrim[] = [];
  if (soma) {
    const i = prims.findIndex((_, k) => layout.paths[k] === null);
    if (i >= 0) {
      const p = prims[i];
      const segs = somaSegments(p.segs, p.segs[3], p.targets ?? NO_TARGETS, floor);
      out.push({
        type: p.type,
        beta: p.beta,
        segs,
        family: layout.kin.families[i][partAt(layout.kin, i, 0)],
        chain: i,
      });
    }
  }
  const byPrim = new Map<number, number[][]>();
  for (const piece of pieces) {
    let list = byPrim.get(piece.prim);
    if (!list) {
      list = [];
      byPrim.set(piece.prim, list);
    }
    list.push([piece.s0, piece.s1]);
  }
  const tmp = new Float64Array(4);
  for (const p of [...byPrim.keys()].sort((a, b) => a - b)) {
    const path = layout.paths[p]!;
    // The segments of every family that the section has a part in here, in the order in which the parts come.
    const byFamily = new Map<number, number[]>();
    for (const [from, to] of byPrim.get(p)!) {
      for (const [s0, s1, family] of partsBetween(layout.kin, p, from, to)) {
        let segs = byFamily.get(family);
        if (!segs) {
          segs = [];
          byFamily.set(family, segs);
        }
        if (path.count < 2) {
          // A section without a direction: one sphere.
          const q = path.points;
          segs.push(q[0], q[1], q[2], q[3], q[0], q[1], q[2], q[3]);
          continue;
        }
        const pts: number[] = [];
        path.at(s0, tmp);
        pts.push(tmp[0], tmp[1], tmp[2], tmp[3]);
        for (let k = 0; k < path.count; k++) {
          if (path.arc[k] > s0 && path.arc[k] < s1)
            pts.push(...path.points.subarray(4 * k, 4 * k + 4));
        }
        path.at(s1, tmp);
        pts.push(tmp[0], tmp[1], tmp[2], tmp[3]);
        for (let k = 0; k + 4 < pts.length; k += 4) segs.push(...pts.slice(k, k + 8));
      }
    }
    for (const [family, segs] of byFamily)
      out.push({
        type: prims[p].type,
        beta: prims[p].beta,
        segs: Float64Array.from(segs),
        family,
        chain: p,
      });
  }
  return out;
}

/** Groups of about equal cost that are compact in space: the items along a Morton curve, cut into runs. */
function makeBatches<T extends { cost: number; x: number; y: number; z: number }>(
  items: T[],
  count: number
): T[][] {
  if (items.length === 0) return [];
  let x0 = Infinity,
    y0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity,
    z1 = -Infinity;
  for (const it of items) {
    x0 = Math.min(x0, it.x);
    y0 = Math.min(y0, it.y);
    z0 = Math.min(z0, it.z);
    x1 = Math.max(x1, it.x);
    y1 = Math.max(y1, it.y);
    z1 = Math.max(z1, it.z);
  }
  const scale = 1023 / Math.max(1e-9, x1 - x0, y1 - y0, z1 - z0);
  const spread = (x: number): number => {
    let v = x & 0x3ff;
    v = (v | (v << 16)) & 0x030000ff;
    v = (v | (v << 8)) & 0x0300f00f;
    v = (v | (v << 4)) & 0x030c30c3;
    return (v | (v << 2)) & 0x09249249;
  };
  const keyed = items.map((it) => ({
    it,
    key:
      spread((it.x - x0) * scale) |
      (spread((it.y - y0) * scale) << 1) |
      (spread((it.z - z0) * scale) << 2),
  }));
  keyed.sort((a, b) => a.key - b.key);
  let total = 0;
  for (const it of items) total += it.cost;
  const groups: T[][] = [];
  let group: T[] = [],
    acc = 0;
  for (const { it } of keyed) {
    // Close the group when it has its share, unless it is the last one.
    if (
      group.length > 0 &&
      groups.length + 1 < count &&
      acc + 0.5 * it.cost > (total * (groups.length + 1)) / count
    ) {
      groups.push(group);
      group = [];
    }
    group.push(it);
    acc += it.cost;
  }
  groups.push(group);
  return groups;
}

// ---------------------------------------------------------------------------
// Meshing a batch

export function meshBatch(batch: HybridBatch): BatchResult {
  const t0 = performance.now();
  const tubes = new TubeMesher(batch.center, {
    tolerance: batch.tolerance,
    maxAspect: batch.maxAspect,
  });
  const rings: number[] = [];
  for (const job of batch.tubes) {
    const ends = tubes.add(job);
    if (ends.start) rings.push(job.startInterface, ends.start.first, ends.start.count);
    if (ends.end) rings.push(job.endInterface, ends.end.first, ends.end.count);
  }
  const tubeMs = performance.now() - t0;
  const patches = batch.patches.map((patch) => {
    const { jobs } = planPrimitives(
      patch.prims,
      { voxel: patch.voxel, simplifyMesh: batch.simplifyMesh, project: batch.project },
      batch.center,
      { maxSlabs: 1 }
    );
    return clipSlabs(jobs.map(meshSlab), jobs.length, patch.interfaces, {
      center: batch.center,
      voxel: patch.voxel,
      tolerance: batch.tolerance,
    });
  });
  return batchResult(batch.index, tubes.mesh(), rings, tubeMs, patches);
}

/** A patch's slabs stitched and cut open at its interfaces, and what that took. */
interface ClippedPatch {
  mesh: ClipOutput;
  interfaces: InterfaceJob[];
  work: SlabWork;
  defects: number;
  nonManifoldEdges: number;
  clipMs: number;
}

function clipSlabs(
  results: SlabResult[],
  slabs: number,
  interfaces: InterfaceJob[],
  ctx: ClipContext
): ClippedPatch {
  const t0 = performance.now();
  const sorted = [...results].sort((a, b) => a.index - b.index);
  const whole = stitchSlabs(sorted, slabs);
  const mesh = clipPatch(whole, interfaces, ctx);
  const clipMs = performance.now() - t0;
  const nonManifoldEdges = countNonManifoldEdges(mesh.indices, mesh.vertexTypes.length);
  return {
    mesh,
    interfaces,
    work: sumWork(sorted),
    defects: whole.defects,
    nonManifoldEdges,
    clipMs,
  };
}

/** A batch's result: its tubes, if it has any, then its patches, in one set of arrays. */
function batchResult(
  index: number,
  tubes: MeshPart | null,
  rings: number[],
  tubeMs: number,
  patches: ClippedPatch[]
): BatchResult {
  const mesh = concatMeshes(
    tubes === null ? patches.map((p) => p.mesh) : [tubes, ...patches.map((p) => p.mesh)]
  );
  const loops: number[] = [],
    loopVertices: number[] = [];
  const work = sumWork(patches.map((p) => p.work));
  let defects = 0,
    nonManifoldEdges = 0,
    clipMs = 0;
  patches.forEach((p, k) => {
    const base = mesh.base[tubes === null ? k : k + 1];
    p.interfaces.forEach((f, i) => {
      loops.push(f.id, loopVertices.length, p.mesh.loops[i].length);
      for (const v of p.mesh.loops[i]) loopVertices.push(base + v);
    });
    defects += p.defects;
    nonManifoldEdges += p.nonManifoldEdges;
    clipMs += p.clipMs;
  });
  const tubeTriangles = tubes === null ? 0 : tubes.indices.length / 3;
  work.rawTriangles += tubeTriangles;
  return {
    index,
    positions: mesh.positions,
    normals: mesh.normals,
    vertexTypes: mesh.vertexTypes,
    radii: mesh.radii,
    indices: mesh.indices,
    bounds: boundsOf(mesh.positions, mesh.indices),
    rings: Int32Array.from(rings),
    loops: Int32Array.from(loops),
    loopVertices: Uint32Array.from(loopVertices),
    tubeTriangles,
    ...work,
    defects,
    nonManifoldEdges,
    tubeMs,
    clipMs,
  };
}

/** Meshes one after another in one set of arrays, each one's indices offset by the vertices before it; `extra` indices left free at the end. */
function concatMeshes(
  parts: MeshPart[],
  extra = 0
): MeshPart & { base: number[]; start: number[] } {
  if (parts.length === 1 && extra === 0) return { ...parts[0], base: [0], start: [0] };
  const base: number[] = [],
    start: number[] = [];
  let nv = 0,
    ni = 0;
  for (const p of parts) {
    base.push(nv);
    start.push(ni);
    nv += p.vertexTypes.length;
    ni += p.indices.length;
  }
  const positions = new Float32Array(3 * nv),
    normals = new Float32Array(3 * nv);
  const vertexTypes = new Uint8Array(nv),
    radii = new Float32Array(nv),
    indices = new Uint32Array(ni + extra);
  parts.forEach((p, k) => {
    const v = base[k],
      o = start[k];
    positions.set(p.positions, 3 * v);
    normals.set(p.normals, 3 * v);
    vertexTypes.set(p.vertexTypes, v);
    radii.set(p.radii, v);
    for (let i = 0; i < p.indices.length; i++) indices[o + i] = p.indices[i] + v;
  });
  return { positions, normals, vertexTypes, radii, indices, base, start };
}

/** Cut a patch's closed mesh open at its interfaces. */
function clipPatch(mesh: MeshPart, interfaces: InterfaceJob[], ctx: ClipContext): ClipOutput {
  // A patch no tube leaves (a cell that is complex throughout, a lone sphere) stays as it is.
  if (interfaces.length === 0) return { ...mesh, loops: [] };
  // The clip planes, and the section around each to put the cut's vertices on.
  const tmp = new Float64Array(4),
    dir = new Float64Array(3);
  const paths = interfaces.map((f) => new SectionPath(f.points));
  const planes: ClipPlane[] = [];
  const windows: [number, number][] = [];
  const radii: number[] = [];
  interfaces.forEach((f, i) => {
    const path = paths[i];
    path.at(f.sClip, tmp);
    path.direction(path.segmentAt(f.sClip), dir);
    const r = tmp[3];
    radii.push(r);
    windows.push(path.window(f.sClip, WINDOW_RADII * r + ctx.tolerance));
    const tolerance = tubeTolerance(r, ctx.tolerance);
    planes.push({
      cx: tmp[0],
      cy: tmp[1],
      cz: tmp[2],
      nx: f.side * dir[0],
      ny: f.side * dir[1],
      nz: f.side * dir[2],
      reach: r + 2 * ctx.voxel + tolerance,
      farLimit: f.stub + 2 * r + 2 * ctx.voxel + tolerance,
      snap: 0.1 * Math.min(ctx.voxel, r),
      minEdge: 0.3 * ringEdge(r, ctx.tolerance),
      maxSagitta: 0.5 * tolerance,
    });
  });
  return clipMesh(mesh, ctx.center, planes, (i, q) => {
    const pl = planes[i],
      path = paths[i];
    let dx = q[0] - pl.cx,
      dy = q[1] - pl.cy,
      dz = q[2] - pl.cz;
    // Keep the ray in the plane whatever the rounding of the point.
    const off = dx * pl.nx + dy * pl.ny + dz * pl.nz;
    dx -= off * pl.nx;
    dy -= off * pl.ny;
    dz -= off * pl.nz;
    const len = Math.hypot(dx, dy, dz);
    if (!(len > 0)) throw new Error("clip: a cut vertex on the section's axis");
    dx /= len;
    dy /= len;
    dz /= len;
    const rho = path.cast(pl.cx, pl.cy, pl.cz, dx, dy, dz, radii[i], windows[i][0], windows[i][1]);
    if (!(rho > 0)) throw new Error('clip: no surface along a ray in the plane');
    q[0] = pl.cx + rho * dx;
    q[1] = pl.cy + rho * dy;
    q[2] = pl.cz + rho * dz;
    // The shading normal, as the patch's other vertices and the ring across the collar have it.
    path.shade(q[0], q[1], q[2], windows[i][0], windows[i][1]);
    q[3] = path.nx;
    q[4] = path.ny;
    q[5] = path.nz;
  });
}

/** Stitch the slabs of a big patch, cut it open, and hand it on in the form of a batch's result. */
export function finishPatch(big: BigPatchInfo, results: SlabResult[]): BatchResult {
  return batchResult(big.index, null, [], 0, [clipSlabs(results, big.slabs, big.interfaces, big)]);
}

// ---------------------------------------------------------------------------
// Merging

/** Put the batches into one mesh and fill the collar between every patch loop and its tube's ring. */
export function mergeHybrid(plan: HybridPlanInfo, results: BatchResult[]): MeshResult {
  const t0 = performance.now();
  const batches = [...results].sort((a, b) => a.index - b.index);
  // A collar has a triangle for every vertex of its loop and of its ring (`bridgeLoops`).
  let collarIndices = 0;
  for (const b of batches) {
    for (let i = 2; i < b.rings.length; i += 3) collarIndices += 3 * b.rings[i];
    for (let i = 2; i < b.loops.length; i += 3) collarIndices += 3 * b.loops[i];
  }
  const { positions, normals, vertexTypes, radii, indices, base, start } = concatMeshes(
    batches,
    collarIndices
  );
  const ni = indices.length - collarIndices;

  // Rings and loops by interface, in global vertex numbers.
  const count = plan.interfaceAxes.length / 6;
  const ringOf: (Uint32Array | null)[] = new Array(count).fill(null);
  const loopOf: (Uint32Array | null)[] = new Array(count).fill(null);
  batches.forEach((b, k) => {
    for (let i = 0; i < b.rings.length; i += 3) {
      const ring = new Uint32Array(b.rings[i + 2]);
      for (let j = 0; j < ring.length; j++) ring[j] = base[k] + b.rings[i + 1] + j;
      ringOf[b.rings[i]] = ring;
    }
    for (let i = 0; i < b.loops.length; i += 3) {
      const loop = new Uint32Array(b.loops[i + 2]);
      for (let j = 0; j < loop.length; j++) loop[j] = base[k] + b.loopVertices[b.loops[i + 1] + j];
      loopOf[b.loops[i]] = loop;
    }
  });
  const collars: number[] = [];
  for (let id = 0; id < count; id++) {
    const ring = ringOf[id],
      loop = loopOf[id];
    if (ring === null || loop === null)
      throw new Error(`hybrid: interface ${id} has no ${ring === null ? 'ring' : 'loop'}`);
    collar(positions, plan.interfaceAxes, id, loop, ring, collars);
  }
  indices.set(collars, ni);

  const chunks: MeshChunk[] = [];
  batches.forEach((b, k) => {
    if (b.indices.length > 0)
      chunks.push({ indexStart: start[k], indexCount: b.indices.length, bounds: b.bounds });
  });
  if (collars.length > 0)
    chunks.push({
      indexStart: ni,
      indexCount: collars.length,
      bounds: boundsOf(positions, indices, ni, collars.length),
    });
  const mergeMs = performance.now() - t0;

  const work = sumWork(batches);
  let tubeTriangles = 0,
    defects = 0,
    nonManifoldEdges = 0,
    tubeMs = 0,
    clipMs = 0;
  for (const b of batches) {
    tubeTriangles += b.tubeTriangles;
    defects += b.defects;
    nonManifoldEdges += b.nonManifoldEdges;
    tubeMs += b.tubeMs;
    clipMs += b.clipMs;
  }
  const hybrid: HybridStats = {
    tubes: plan.tubes,
    patches: plan.patches,
    interfaces: count,
    tubeTriangles,
    patchTriangles: ni / 3 - tubeTriangles,
    collarTriangles: collars.length / 3,
    plainFraction: plan.plainFraction,
    flooredFraction: plan.flooredFraction,
    finestVoxel: plan.finestVoxel,
    contacts: plan.contacts,
    planMs: plan.planMs,
    tubeMs,
    clipMs,
  };
  const stats: MeshStats = {
    voxel: plan.voxel,
    sections: plan.sections,
    segments: plan.segments,
    points: plan.points,
    rawPoints: plan.rawPoints,
    untangle: plan.untangle,
    soma: plan.soma,
    blocks: work.blocks,
    bandVoxels: plan.bandVoxels,
    vertices: vertexTypes.length,
    triangles: indices.length / 3,
    rawTriangles: work.rawTriangles,
    defects,
    nonManifoldEdges,
    fieldMs: work.fieldMs,
    extractMs: work.extractMs,
    simplifyMs: work.simplifyMs,
    simplifyPasses: work.simplifyPasses,
    mergeMs,
    totalMs: 0,
    fieldMB: work.fieldMB,
    slabs: batches.length,
    workers: 1,
    gpu: work.gpu,
    hybrid,
  };
  stats.totalMs =
    plan.planMs +
    stats.fieldMs +
    stats.extractMs +
    stats.simplifyMs +
    hybrid.tubeMs +
    hybrid.clipMs +
    mergeMs;
  return { positions, indices, normals, vertexTypes, radii, chunks, center: plan.center, stats };
}

/**
 * The collar of interface `id`: triangles between the patch's loop, in the clip plane, and the tube's ring, both
 * sorted by angle around the axis from the one to the other.
 */
function collar(
  positions: Float32Array,
  axes: Float64Array,
  id: number,
  loop: Uint32Array,
  ring: Uint32Array,
  out: number[]
): void {
  const o = 6 * id;
  let ux = axes[o + 3] - axes[o],
    uy = axes[o + 4] - axes[o + 1],
    uz = axes[o + 5] - axes[o + 2];
  const len = Math.hypot(ux, uy, uz);
  if (!(len > 0)) throw new Error('hybrid: a collar without length');
  ux /= len;
  uy /= len;
  uz /= len;
  // A frame across the axis, right-handed with it.
  const frame = new Float64Array(3);
  across(ux, uy, uz, frame);
  const nx = frame[0],
    ny = frame[1],
    nz = frame[2];
  const bx = uy * nz - uz * ny,
    by = uz * nx - ux * nz,
    bz = ux * ny - uy * nx;

  const sorted = (vertices: Uint32Array, cx: number, cy: number, cz: number, what: string) => {
    const n = vertices.length;
    const angle = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const v = 3 * vertices[i];
      const px = positions[v] - cx,
        py = positions[v + 1] - cy,
        pz = positions[v + 2] - cz;
      angle[i] = Math.atan2(px * bx + py * by + pz * bz, px * nx + py * ny + pz * nz);
    }
    // Which way round the vertices are listed: the steps must all turn the same way and add up to one turn.
    let turn = 0;
    const step = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let d = angle[(i + 1) % n] - angle[i];
      if (d > Math.PI) d -= 2 * Math.PI;
      else if (d < -Math.PI) d += 2 * Math.PI;
      step[i] = d;
      turn += d;
    }
    const sign = turn > 0 ? 1 : -1;
    if (Math.abs(Math.abs(turn) - 2 * Math.PI) > 1e-6)
      throw new Error(`hybrid: the ${what} of interface ${id} does not wind once around its axis`);
    for (let i = 0; i < n; i++)
      if (sign * step[i] <= 0)
        throw new Error(`hybrid: the ${what} of interface ${id} doubles back`);
    const order = new Uint32Array(n),
      angles = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const j = sign > 0 ? i : n - 1 - i;
      order[i] = vertices[j];
      angles[i] = angle[j];
    }
    return { vertices: order, angles };
  };
  bridgeLoops(
    sorted(loop, axes[o], axes[o + 1], axes[o + 2], 'loop'),
    sorted(ring, axes[o + 3], axes[o + 4], axes[o + 5], 'ring'),
    out
  );
}
