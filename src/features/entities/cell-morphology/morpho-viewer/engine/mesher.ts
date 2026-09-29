/**
 * Skeleton → single watertight surface.
 *
 * Approach
 * --------
 * 1. Every section (unbranched chain of SWC points, plus one sphere for the
 *    soma) is turned into a list of rounded-cone segments.
 * 2. A scalar field is accumulated on a sparse voxel grid:
 *
 *        F(p) = max_families Σ_sections g( d_i(p) / s_i(p) )
 *
 *    where d_i is the signed distance to section i's surface (exact min over
 *    the section's segments, so a chain of segments never "beads"), s_i is the
 *    local blend scale max(blend · radius, voxel), and g is a compact kernel
 *    with g(0)=1, g'(0)=-1 and g(2)=0. An isolated section therefore has its
 *    surface exactly at F = 1, and where the sections of a family come close
 *    their contributions add up, producing a smooth metaball-style fillet at
 *    branch points and around the soma. A family is what meets at a fork, or
 *    what touches; fibres that merely pass each other are of different
 *    families and leave each other alone (kin.ts).
 * 3. The isosurface F = 1 is extracted with naive surface nets, which gives a
 *    closed, smooth quad mesh (triangulated on output) without lookup tables.
 * 4. The vertices are moved onto the isosurface (refine.ts), which takes out
 *    the grid-dependent dents surface nets leave on tubes a few voxels wide.
 * 5. Optionally the mesh is simplified by quadric edge collapse (meshoptimizer)
 *    within a fixed absolute error, which removes most of the triangles surface
 *    nets spend on flat and cylindrical stretches. The result is checked against
 *    the field and redone around anything that left the surface (refine.ts).
 * 6. The vertices that are left get their normals from the segments rather than
 *    from the triangles: the field's, with the crease taken out that it has at
 *    every skeleton point where the radius changes (field.ts).
 *
 * gpu-slab.ts does step 2 of a slab in WebGPU compute shaders instead, and for a
 * slab that fits one batch steps 3 and 4 and the field checks of step 5 as
 * well; it hands its field to `finishSlab`, or its surface to
 * `completeSlabAsync`, here.
 *
 * The grid is stored as a hash of 8³-cell blocks (9³ samples, boundary samples
 * duplicated between neighbours). Only blocks inside the influence band of at
 * least one segment are ever allocated, so memory is proportional to the
 * surface area rather than the bounding-box volume.
 *
 * Extraction works from one 9-bit "inside" mask per sample row of a block.
 * Blocks that are entirely inside or outside are skipped, rows of cells with
 * no crossing are skipped with two bit operations, and the crossing edges of
 * a row come out of XORs of neighbouring row masks. Per active cell, a
 * 256-entry table gives the connected components of the inside corners.
 *
 * Slabs
 * -----
 * To use several threads, the block grid is cut into slabs of block layers
 * along one axis (planMesh), each slab is meshed independently (meshSlab) and
 * the pieces are stitched together (mergeSlabs). A sample's value is the largest
 * of its families' sums of the kernels of the sections reaching it, each added
 * up in section order. Every slab uses the same global grid and section order,
 * so the samples on both sides of a cut are bitwise identical to a single-slab
 * run and the stitched mesh equals it up to vertex order. Faces in a slab's first block layer use cells from the
 * layer below, so each slab also fills the two sample planes under its first
 * layer and extracts that one cell layer ("halo"); the halo vertices are
 * matched to the vertices of the slab below by cell and corner when merging.
 *
 * Simplification runs per slab with the seam vertices locked, so the halo
 * matching still works. A vertex whose copy in the slab below was collapsed
 * away has all of its faces in the upper slab and simply becomes a vertex of
 * its own in the merge. Where the seam vertices lie on a line, both sides
 * could also lay a triangle without area over the same three of them, which
 * would hang back to back with its twin off an edge with four triangles; the
 * simplification takes such triangles out of its result (refine.ts).
 */

import { MeshoptSimplifier } from 'meshoptimizer/simplifier';

import { layoutKinship } from './classify';
import { bandHalfWidth, FieldSampler, kernel, smoothMin, somaRounding } from './field';
import { GrowableFloat32, GrowableUint8, GrowableUint32 } from './growable';
import { kinship, SOMA_NODE, sectionEnds, splitFamilies } from './kin';
import {
  countPoints,
  type PrepareParams,
  prepareMorphology,
  sectionSegments,
  untangleReport,
} from './prepare';
import {
  type CheckedSimplification,
  type OffSurfaceCheck,
  projectVertices,
  shadeVertices,
  simplifyChecked,
  simplifyCheckedAsync,
} from './refine';
import { chainSegments } from './segments';
import { stemNeck } from './soma';
import { type Morphology, type Section, SWC_SOMA } from './swc';

import type { SkeletonData } from './protocol';
import type { UntangleReport } from './untangle';

/** Skeleton preparation (see prepare.ts) plus the field and grid settings. */
export interface MeshParams extends PrepareParams {
  /** Voxel edge length in µm. */
  voxel: number;
  /** Blend scale for neurites as a fraction of the local radius. */
  blend: number;
  /** Blend scale for the soma as a fraction of its radius. */
  somaBlend: number;
  /**
   * Radii below this value (µm) are clamped up so thin fibres survive
   * voxelisation. Whatever is passed, the mesher never goes below
   * `MIN_RADIUS_VOXELS × voxel`, the smallest radius at which a tube in any
   * orientation still contains a face-connected chain of grid samples.
   */
  minRadius: number;
  /** SWC types to include, or null for all. The soma is always included. */
  includeTypes: number[] | null;
  /** Largest deviation (µm) allowed when simplifying the mesh. 0 keeps the raw surface-nets mesh. */
  simplifyMesh: number;
  /** Move the vertices onto the isosurface and take their normals from the segments (`FieldSampler.shade`) instead of the triangles. On unless set to false. */
  project?: boolean;
}

export interface MeshStats {
  voxel: number;
  sections: number;
  segments: number;
  /** Skeleton points after smoothing and simplification. */
  points: number;
  /** Skeleton points as traced. */
  rawPoints: number;
  /** What moving apart the fibres that touch has come to, if it was asked for (untangle.ts). */
  untangle?: UntangleReport;
  /** The soma as meshed, if there is one: the base sphere's radius and how many arbors it emanates to (soma.ts). */
  soma?: SomaMeshed;
  blocks: number;
  /** Rough count of voxels visited while splatting segment distances. */
  bandVoxels: number;
  vertices: number;
  triangles: number;
  /** Triangles before mesh simplification. */
  rawTriangles: number;
  /** Quads dropped because a neighbouring cell had no vertex, or triangles dropped at a seam. Zero for a closed mesh. */
  defects: number;
  /**
   * Edges with more than two triangles, where two sheets pass through one voxel and share its vertex. Zero for a
   * 2-manifold mesh. A hybrid build counts them in its patches, as cut open; its tubes and collars have none.
   */
  nonManifoldEdges: number;
  /** Field accumulation time, summed over slabs. */
  fieldMs: number;
  /** Vertex and face extraction time, including the projection onto the field and the shading normals, summed over slabs. */
  extractMs: number;
  /** Mesh simplification time, summed over slabs. */
  simplifyMs: number;
  /** Most simplifier runs any slab needed before its result held up against the field; 0 without simplification. */
  simplifyPasses: number;
  /** Stitching, type smoothing, normal normalisation and counting the edges with more than two triangles. */
  mergeMs: number;
  /** Wall-clock time of the build. mergeSlabs fills in the summed CPU time; callers that time the build overwrite it. */
  totalMs: number;
  /** Memory allocated for the sparse field, summed over slabs, in MB. */
  fieldMB: number;
  slabs: number;
  /** Threads the slabs were spread over. */
  workers: number;
  /** Present when the field was accumulated on the GPU; `fieldMs` then includes the waiting. */
  gpu?: GpuFieldStats;
  /** Present for a hybrid build (hybrid.ts); `slabs` then counts its batches. */
  hybrid?: HybridStats;
  /** Why a hybrid build was given up for this voxel mesh, if it was. */
  fallback?: string;
}

/** What the hybrid mesher made of the skeleton. Times are summed over batches. */
export interface HybridStats {
  tubes: number;
  patches: number;
  interfaces: number;
  tubeTriangles: number;
  patchTriangles: number;
  collarTriangles: number;
  /** Share of the cable that is swept rather than voxelised. */
  plainFraction: number;
  /** Share of the cable that is meshed thicker than traced: in patches too coarse for it, and on the ramps out of them. */
  flooredFraction: number;
  /** The finest voxel of a patch, µm; `MeshStats.voxel` is the coarsest. */
  finestVoxel: number;
  /** How many times fibres that do not blend touch, each other or themselves: every one is a handle of the surface, more or less. */
  contacts: number;
  planMs: number;
  tubeMs: number;
  clipMs: number;
}

/** How the GPU backend (gpu-slab.ts) spent its time, per slab or summed over a build. */
export interface GpuFieldStats {
  /** Building the block lists and segment records, on the CPU. */
  binMs: number;
  /** Time the calling thread sat waiting for the GPU: every readback of the slab, the checks' included. */
  waitMs: number;
  /** Blocks evaluated, and blocks read back (those the surface crosses). */
  blocks: number;
  blocksRead: number;
  readMB: number;
  /** Slabs whose surface was extracted on the GPU too; their `readMB` is the raw mesh, not field blocks. */
  slabsExtracted: number;
}

/** A contiguous run of triangles that came from one slab, with its bounding box, for chunked rendering. */
export interface MeshChunk {
  indexStart: number;
  indexCount: number;
  /** min x, y, z, max x, y, z of the vertices the chunk's triangles use. */
  bounds: [number, number, number, number, number, number];
}

export interface MeshResult {
  /** Vertex positions relative to `center`, in µm. */
  positions: Float32Array;
  indices: Uint32Array;
  /** Unit vertex normals: the shading normals of the segments, or without the projection the area-weighted average of the adjacent faces. */
  normals: Float32Array;
  /** SWC type that dominates each vertex, for colouring. */
  vertexTypes: Uint8Array;
  /**
   * Per vertex, the radius (µm) of the closest section: a tube vertex's ring, a patch vertex's last field sample
   * (`projectVertices`; 0 without the projection), a cut vertex's near end's. Not part of the surface; the viewer
   * scales its bumps by it.
   */
  radii: Float32Array;
  /** Triangles grouped by slab, in index order. */
  chunks: MeshChunk[];
  center: [number, number, number];
  stats: MeshStats;
}

export interface PlanOptions {
  /** Upper bound on the number of slabs. */
  maxSlabs: number;
  /** Keep at least about this many band voxels per slab so small meshes are not split. */
  bandVoxelsPerSlab?: number;
  /** Go beyond `maxSlabs` rather than let a slab hold more than about this many band voxels. */
  maxBandVoxelsPerSlab?: number;
  /** Cut along this axis (0 = x, 1 = y, 2 = z) instead of the best-balanced one. */
  axis?: number;
}

export interface Grid {
  h: number;
  ox: number;
  oy: number;
  oz: number;
  nx: number;
  ny: number;
  nz: number;
  nbx: number;
  nby: number;
  nbz: number;
}

/** Everything needed to mesh one slab. Every array owns its buffer so jobs can be transferred to a worker. */
export interface SlabJob {
  index: number;
  grid: Grid;
  center: [number, number, number];
  /** Axis the block grid is cut along (0 = x, 1 = y, 2 = z). */
  axis: number;
  /** Block layers [a0, a1) along `axis` owned by this slab. */
  a0: number;
  a1: number;
  /** Whether another slab follows, so this slab's top cell layer must be recorded for stitching. */
  hasNext: boolean;
  /** Mesh simplification error (µm), 0 for none. */
  simplify: number;
  /** Whether to move the vertices onto the isosurface. */
  project: boolean;
  /** Packed ax, ay, az, ra, bx, by, bz, rb of the segments reaching this slab, in global section order. */
  segs: Float64Array;
  /** Segments of section p are [primStart[p], primStart[p + 1]). */
  primStart: Uint32Array;
  primType: Uint8Array;
  primBeta: Float64Array;
  /**
   * Per section: the width, in normalised distance, of the smooth minimum its segments fold by (`smoothMin`), for a
   * soma of more than one part (`somaRounding`); 0 for the plain minimum of every other section, and of a lone sphere.
   */
  primRound: Float64Array;
  /** The family of every section. Sections of one family follow each other; the field is the largest of the families' sums. */
  primFamily: Uint32Array;
  /** Sections with the same number here are parts of one. */
  primChain: Uint32Array;
}

/** What meshing slabs took: per slab, and summed over them (`addWork`), where `simplifyPasses` is the most any needed. */
export interface SlabWork {
  blocks: number;
  rawTriangles: number;
  fieldMs: number;
  extractMs: number;
  simplifyMs: number;
  simplifyPasses: number;
  fieldMB: number;
  gpu?: GpuFieldStats;
}

export interface SlabResult extends SlabWork {
  index: number;
  /** Vertices owned by this slab, followed by its halo vertices. */
  positions: Float32Array;
  vertexTypes: Uint8Array;
  /** Per vertex, not normalised: the unit shading normal, or without the projection the area-weighted sum of the adjacent faces' normals. */
  normals: Float32Array;
  /** Per vertex, the radius of the closest section (µm), as `projectVertices` leaves it; 0 without a field. */
  radii: Float32Array;
  /** Triangles of the owned blocks, in slab-local vertex indices. */
  indices: Uint32Array;
  ownedVertices: number;
  /** Seam keys and local indices of the halo vertices. */
  haloKeys: Float64Array;
  haloVertices: Uint32Array;
  /** Seam keys and local indices of owned vertices in the top cell layer, matched by the next slab's halo. */
  topKeys: Float64Array;
  topVertices: Uint32Array;
  defects: number;
}

/** The soma the field is built on (`collectPrimitives`). */
export interface SomaMeshed {
  /** Radius of the base sphere, µm. */
  radius: number;
  /** Arbors with a neck from the sphere to their target: the valid ones whose section is selected. */
  necks: number;
}

export interface MeshPlan {
  voxel: number;
  center: [number, number, number];
  sections: number;
  segments: number;
  points: number;
  rawPoints: number;
  untangle?: UntangleReport;
  soma?: SomaMeshed;
  bandVoxels: number;
  slabs: number;
  jobs: SlabJob[];
  /** The prepared skeleton that is being meshed, relative to `center`, for the overlay. */
  skeleton: SkeletonData;
}

/** A plan without its jobs and skeleton: what the merge needs of it. */
export type PlanInfo = Omit<MeshPlan, 'jobs' | 'skeleton'>;

/** Cells per block edge. */
export const B = 8;
/** Samples per block edge (cells + 1, boundary samples are shared). */
export const BS = B + 1;
const BS2 = BS * BS;
export const BS3 = BS * BS * BS;
export const B3 = B * B * B;
/** Sample rows per block (one 9-bit inside mask each). */
export const ROWS = BS * BS;
/** The inside mask of a row with every sample inside. */
export const ROW_FULL = (1 << BS) - 1;
/** Slack, in voxels, when dropping blocks that a segment's band cannot reach (`SegmentBand.reaches`). */
const CULL_MARGIN = 0.01;
/** Steps of a sample's closeness byte (`Block.meta`) per unit of normalised distance; the GPU field quantises alike. */
export const CLOSENESS_STEPS = 63;

/** The key of block (bx, by, bz) of a grid: (bz × nby + by) × nbx + bx. */
export function blockKey(g: Grid, bx: number, by: number, bz: number): number {
  return (bz * g.nby + by) * g.nbx + bx;
}

/**
 * Smallest tube radius, in voxels, at which fibres stay connected after
 * voxelisation. A fibre running through cell centres has its nearest sample
 * 0.707 voxels away, and diagonal-only contacts do not join sheets. Straight
 * tubes in random orientations survive from 0.85 on; the curved, kinked axon of
 * the sample cell still splits into pieces below 0.9 at 0.4 and 0.6 µm voxels,
 * so 1.0 leaves a margin.
 */
export const MIN_RADIUS_VOXELS = 1.0;

/** The tubes' tolerance when the mesh is not simplified, in voxels: the patches then keep their raw surface nets. */
const RAW_TOLERANCE_VOXELS = 0.1;

/** What the layout takes from the parameters: the radius floor, in voxels of whatever voxel a patch has, and the tubes' tolerance, µm. */
export function layoutOptions(params: Pick<MeshParams, 'voxel' | 'minRadius' | 'simplifyMesh'>): {
  floorVoxels: number;
  tolerance: number;
} {
  const simplifyMesh = Math.max(0, params.simplifyMesh ?? 0);
  return {
    floorVoxels: Math.max(MIN_RADIUS_VOXELS, params.minRadius / params.voxel),
    tolerance: simplifyMesh > 0 ? simplifyMesh : RAW_TOLERANCE_VOXELS * params.voxel,
  };
}

/**
 * Edge crossings stay this fraction of the edge away from its ends. A float32 sample comes out at exactly 1 a few
 * times per million vertices; every crossing next to it then sits on that sample, several cells put their vertex on
 * the same spot, and the simplifier, which treats vertices at one position as one vertex, hands triangles to the wrong
 * copy and leaves slits in the index buffer. The margin keeps such vertices a few float32 steps apart.
 */
export const CROSSING_MARGIN = 0.05;

/** Bytes per sample held by the field while accumulating. */
const BYTES_PER_SAMPLE = 4 + 1 + 1;

/**
 * Default lower bound on slab size. A slab this size takes a few tens of
 * milliseconds, well above the messaging cost, and finer slabs balance better
 * across the workers.
 */
const DEFAULT_BAND_VOXELS_PER_SLAB = 1e6;

let simplifierUp = false;
/** Resolves when the WASM simplifier is loaded. Await it before meshing with `simplifyMesh > 0`. */
export const simplifierReady: Promise<void> = MeshoptSimplifier.ready.then(() => {
  simplifierUp = true;
});

export interface Block {
  bx: number;
  by: number;
  bz: number;
  /** Accumulated field F at each of the 9³ samples. */
  acc: Float32Array;
  /**
   * Per sample, [0, BS3): how close the closest section came, as 255 minus the
   * quantised normalised distance (0 = none yet); [BS3, 2 BS3): that section's
   * SWC type. One zero-initialised array instead of two, allocation is a
   * noticeable part of the field time.
   */
  meta: Uint8Array | null;
  /**
   * The GPU field's form of `meta`, null on the CPU path: three words per
   * sample row, holding the SWC types of the row's nine samples (8 bits each)
   * and, from bit 8 of the third word, the row's 9-bit inside mask.
   */
  packed: Uint32Array | null;
  /** Allocation order; the block's row masks live at bi × ROWS. */
  bi: number;
  /**
   * Offset of the block's 8³ cell table in the slab's cell-vertex arena, or -1
   * if the surface misses the block. Entries are 0 for no vertex, v + 1 for a
   * single vertex v, or -1 - n to look up `multi[n]` (one vertex per inside corner).
   */
  cv: number;
  multi: Int32Array[] | null;
}

/**
 * A section, or the soma: what the field sums over. Within one, the segments' distances are combined by their minimum;
 * the soma's by a smooth one, so that its sphere and necks meet in a round (`smoothMin` in field.ts).
 */
export interface Prim {
  type: number;
  beta: number;
  /** Packed ax, ay, az, ra, bx, by, bz, rb per segment. */
  segs: Float64Array;
  /**
   * The skeleton's nodes at the two ends of a section, `SOMA_NODE` where it grows out of the soma (and twice for the
   * soma itself): sections that share one are joined there, and blend around it (kin.ts).
   */
  ends?: [number, number];
  /**
   * For the soma: the spheres its necks run to, x, y, z, r each, before any floor; none for a lone sphere. A mesher that
   * holds the soma to a floor of its own lays it again from them (`somaSegments`).
   */
  targets?: Float64Array;
}

/** A primitive as the field takes it: a section, or the part of one that is of one family (kin.ts). */
export interface FieldPrim extends Prim {
  /** The family whose sum it adds to. The field is the largest of the families' sums. */
  family: number;
  /** The section it is a part of. The parts of one are one surface, which the shading follows across the cuts. */
  chain: number;
}

/** Inclusive sample and block index bounds that a slab may write to. */
export interface Clip {
  gx0: number;
  gy0: number;
  gz0: number;
  gx1: number;
  gy1: number;
  gz1: number;
  bx0: number;
  by0: number;
  bz0: number;
  bx1: number;
  by1: number;
  bz1: number;
}

export interface Seam {
  keys: number[];
  vertices: number[];
}

/** Blocks in a slab's first arena chunk, and the size at which the chunks stop doubling. */
const ARENA_FIRST_BLOCKS = 32;
const ARENA_MAX_BLOCKS = 4096;

/**
 * The sample arrays of new blocks, cut from chunks that double in size. A buffer of its own for each of the two
 * arrays of every block cost more in allocation and garbage collection than the splatting into them: a third of the
 * field time on a cell with half a million blocks.
 */
class BlockArena {
  private accChunk = new Float32Array(0);
  private metaChunk = new Uint8Array(0);
  private used = 0;
  private capacity = 0;
  private nextCapacity = ARENA_FIRST_BLOCKS;
  /** The arrays of the block claimed last, zeroed. */
  acc = this.accChunk;
  meta = this.metaChunk;
  /** Blocks claimed so far. */
  claimed = 0;

  claim(): void {
    this.claimed++;
    if (this.used === this.capacity) {
      this.capacity = this.nextCapacity;
      this.nextCapacity = Math.min(ARENA_MAX_BLOCKS, 2 * this.capacity);
      this.accChunk = new Float32Array(this.capacity * BS3);
      this.metaChunk = new Uint8Array(this.capacity * 2 * BS3);
      this.used = 0;
    }
    this.acc = this.accChunk.subarray(this.used * BS3, (this.used + 1) * BS3);
    this.meta = this.metaChunk.subarray(this.used * 2 * BS3, (this.used + 1) * 2 * BS3);
    this.used++;
  }
}

/** Per-section minimum normalised distance for one block (the soma's smooth one), plus the list of samples written so far. */
class Scratch {
  data = new Float32Array(BS3).fill(Infinity);
  /** Sample indices written by this section, so the flush visits only those. */
  touched = new Uint16Array(BS3);
  count = 0;
}

/**
 * What a block's field is until a section writes to it: nothing, shared. A segment's band box takes in blocks that
 * its band does not reach, and they are kept, in the order in which they come, for that order is the vertex order.
 */
const ZERO_ACC = new Float32Array(BS3),
  ZERO_META = new Uint8Array(2 * BS3);

/** Scratch blocks and family sums that the sections have handed back, clean, for the next ones, from slab to slab. */
const scratchPool: Scratch[] = [];
const sumPool: FamilySum[] = [];
/** How many of each the pools keep from one slab to the next: 4.4 MB of scratch. */
const POOL_KEPT = 1024;

/** How many segments the primitives have. */
export function segmentCount(prims: Prim[]): number {
  let n = 0;
  for (const P of prims) n += P.segs.length / 8;
  return n;
}

/** The soma's base sphere, which the mesh is built around; null without a soma. */
export function somaSphere(
  m: Morphology
): { center: [number, number, number]; radius: number } | null {
  const st = m.somaStems;
  return m.soma.model !== 'none' && st.baseRadius > 0
    ? { center: st.center, radius: st.baseRadius }
    : null;
}

export function meshCenter(m: Morphology): [number, number, number] {
  if (m.soma.model !== 'none') return [...m.soma.center];
  return [
    (m.bbox.min[0] + m.bbox.max[0]) / 2,
    (m.bbox.min[1] + m.bbox.max[1]) / 2,
    (m.bbox.min[2] + m.bbox.max[2]) / 2,
  ];
}

/**
 * Mesh in the calling thread. By default the whole grid is one slab; `opts`
 * splits it the way the worker pool does and runs the slabs one after another.
 */
export function buildMesh(
  m: Morphology,
  params: MeshParams,
  opts: Partial<PlanOptions> = {}
): MeshResult {
  const t0 = performance.now();
  const plan = planMesh(m, params, { maxSlabs: 1, ...opts });
  const res = mergeSlabs(
    plan,
    plan.jobs.map((job) => meshSlab(job))
  );
  res.stats.totalMs = performance.now() - t0;
  return res;
}

/** Prepare the skeleton, collect the primitives, lay out the global grid and cut it into slab jobs. */
export function planMesh(m: Morphology, params: MeshParams, opts: PlanOptions): MeshPlan {
  const h = params.voxel;
  if (!(h > 0)) throw new Error('voxel size must be positive');

  const prepared = prepareMorphology(m, params);
  const prims = collectPrimitives(prepared, params);
  if (prims.length === 0) throw new Error('nothing to mesh: no sections selected');
  const center = meshCenter(m);
  // What blends with what: around the forks, and where fibres touch (kin.ts). The layout of the hybrid mesher is what
  // finds the touches; should it fail on a skeleton, the stars alone will do, which `planPrimitives` finds.
  let field: Prim[] = prims;
  try {
    field = splitFamilies(prims, layoutKinship(prims, { h, hMin: h, ...layoutOptions(params) }));
  } catch {}
  return {
    ...planPrimitives(field, params, center, opts),
    sections: prims.length,
    segments: segmentCount(prims),
    points: countPoints(prepared.sections),
    rawPoints: countPoints(m.sections),
    untangle: untangleReport(prepared),
    soma: somaMeshed(prepared, prims),
    skeleton: sectionSegments(meshedSections(prepared), center),
  };
}

/** A plan without what only a whole morphology has: its point counts, its soma and the skeleton overlay. */
export type PrimitivePlan = Omit<MeshPlan, 'points' | 'rawPoints' | 'soma' | 'skeleton'>;

/** Lay out the grid of a set of primitives and cut it into slab jobs. The hybrid mesher plans its patches with this. */
export function planPrimitives(
  prims: Prim[],
  params: Pick<MeshParams, 'voxel' | 'simplifyMesh' | 'project'>,
  center: [number, number, number],
  opts: PlanOptions
): PrimitivePlan {
  const h = params.voxel;
  const field = fieldPrimitives(prims, h);
  const grid = makeGrid(field, h);
  const bandVoxels = estimateBandVoxels(field, h);

  const perSlab = opts.bandVoxelsPerSlab ?? DEFAULT_BAND_VOXELS_PER_SLAB;
  const bySize = perSlab > 0 ? Math.ceil(bandVoxels / perSlab) : Infinity;
  const byCap = opts.maxBandVoxelsPerSlab ? Math.ceil(bandVoxels / opts.maxBandVoxelsPerSlab) : 0;
  const want = Math.max(1, Math.min(Math.max(Math.floor(opts.maxSlabs), byCap), bySize));
  const { axis, cuts } = chooseCuts(field, grid, want, opts.axis);
  const jobs = makeJobs(
    field,
    grid,
    center,
    axis,
    cuts,
    Math.max(0, params.simplifyMesh ?? 0),
    params.project !== false
  );
  return {
    voxel: h,
    center,
    sections: prims.length,
    segments: segmentCount(prims),
    bandVoxels,
    slabs: jobs.length,
    jobs,
  };
}

/**
 * The primitives as the field takes them: cut into the parts that blend and the parts that do not (kin.ts), unless
 * they come with their families already, and family by family, the largest first. A family's sum is formed apart
 * from the field and then put into it, except the first one's, which has the field to itself; so the first had better
 * be the soma with its stems. Within a family the order stays, and with it the sums to the last bit.
 */
function fieldPrimitives(given: Prim[], h: number): FieldPrim[] {
  const prims = given.some(isFieldPrim)
    ? (given as FieldPrim[])
    : splitFamilies(given, kinship(given, h));
  const size = new Map<number, number>();
  for (const P of prims) {
    let voxels = 0;
    for (let k = 0; k < P.segs.length; k += 8) voxels += segmentBandVoxels(P.segs, k, P.beta, h);
    size.set(P.family, (size.get(P.family) ?? 0) + voxels);
  }
  if (size.size < 2) return prims;
  const rank = new Map(
    [...size].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([family], i) => [family, i])
  );
  return prims
    .map((P, i) => ({ P, i }))
    .sort((a, b) => rank.get(a.P.family)! - rank.get(b.P.family)! || a.i - b.i)
    .map(({ P }) => P);
}

const isFieldPrim = (P: Prim): P is FieldPrim => (P as FieldPrim).family !== undefined;

/**
 * Majority-vote smoothing of per-vertex types over mesh neighbours. Where two
 * sections contribute almost equally (soma–dendrite junctions) the raw
 * per-sample choice flickers; a couple of votes turn that speckle into a
 * clean boundary. Ties keep the vertex's own type, otherwise go to the lowest
 * type, so the result does not depend on vertex order.
 */
export function smoothVertexTypes(indices: Uint32Array, types: Uint8Array, iterations = 2): void {
  const n = types.length;
  const present: number[] = [];
  const idOf = new Int16Array(256).fill(-1);
  for (let i = 0; i < n; i++) {
    const t = types[i];
    if (idOf[t] < 0) {
      idOf[t] = present.length;
      present.push(t);
    }
  }
  const K = present.length;
  if (K < 2) return;
  present.sort((a, b) => a - b);
  for (let k = 0; k < K; k++) idOf[present[k]] = k;
  const counts = new Uint16Array(n * K);
  const next = new Uint8Array(n);
  for (let it = 0; it < iterations; it++) {
    counts.fill(0);
    for (let t = 0; t < indices.length; t += 3) {
      const a = indices[t],
        b = indices[t + 1],
        c = indices[t + 2];
      const ta = idOf[types[a]],
        tb = idOf[types[b]],
        tc = idOf[types[c]];
      counts[a * K + tb]++;
      counts[a * K + tc]++;
      counts[b * K + ta]++;
      counts[b * K + tc]++;
      counts[c * K + ta]++;
      counts[c * K + tb]++;
    }
    let changed = 0;
    for (let i = 0; i < n; i++) {
      const own = idOf[types[i]];
      let best = own;
      let bestN = counts[i * K + own];
      for (let k = 0; k < K; k++) {
        const cnt = counts[i * K + k];
        if (cnt > bestN) {
          bestN = cnt;
          best = k;
        }
      }
      next[i] = present[best];
      if (best !== own) changed++;
    }
    types.set(next);
    if (changed === 0) break;
  }
}

// ---------------------------------------------------------------------------
// Primitives and grid

/**
 * The necks the soma has, by the index of the arbor's section: one to every valid or cut arbor (soma.ts) whose
 * section is selected, as the section's points from the neck's target on (`stemNeck`).
 */
export function somaNecks(m: Morphology, include: Set<number> | null): Map<number, Float64Array> {
  const necks = new Map<number, Float64Array>();
  for (const a of m.somaStems.arbors) {
    if (!(a.valid || a.cut) || (include !== null && !include.has(a.type))) continue;
    const neck = stemNeck(m.somaStems, a, m.sections[a.section]);
    if (neck !== null) necks.set(a.section, neck);
  }
  return necks;
}

/**
 * The sections as the mesh builds them, for the processed skeleton: an arbor with a neck (`somaNecks`) starts at the
 * soma's centre and goes on from the neck's target, without its soma point or anything before the target (points
 * untangling added, the part of a cut arbor inside the neck). Every type: the viewer hides types in the skeleton itself.
 */
export function meshedSections(m: Morphology): Pick<Section, 'type' | 'points'>[] {
  const soma = somaSphere(m);
  if (!soma) return m.sections;
  const necks = somaNecks(m, null);
  return m.sections.map((s, i) => {
    const neck = necks.get(i);
    if (!neck) return s;
    const points = new Float64Array(4 + neck.length);
    points.set([...soma.center, soma.radius]);
    points.set(neck, 4);
    return { type: s.type, points };
  });
}

/** The soma among the primitives `collectPrimitives` made of m, or undefined without one. */
export function somaMeshed(m: Morphology, prims: Prim[]): SomaMeshed | undefined {
  const soma = prims.find((P) => P.type === SWC_SOMA);
  return soma && { radius: m.somaStems.baseRadius, necks: soma.segs.length / 8 - 1 };
}

/**
 * A neck as one rounded-cone segment, packed as in `Prim.segs`: the side of the hull of the sphere of radius R at c and
 * the one of radius r at t, the cone tangent to both. The field measures a segment from the orthogonal projection onto
 * its axis, which puts the segment's cone on the equators of its end spheres (field.ts); a segment from centre to
 * centre would stand inside the base sphere for most of its length and come out of it at an edge. So the segment runs
 * between the two circles where the hull touches the spheres: with sin α = (R − r) / d, at R sin α and r sin α beyond
 * the centres along the axis, of radii R cos α and r cos α, and its cone is the hull's. Its end spheres are smaller than
 * the two it joins: the one at c lies inside the base sphere, and the one at t reaches past the sphere at t by up to
 * r (sin α + cos α − 1) along the axis, inside the tube of a section that goes on in about the neck's direction. Beyond
 * either end the field's shading takes the direction of the sphere the neck is tangent to there (field.ts), which the
 * segment gives back: its centre lies r (dr / len) along the axis from the end. Where one sphere holds the other, the
 * hull is the larger sphere, and the neck is that sphere, as a segment of no length.
 */
export function tangentNeck(
  c: ArrayLike<number>,
  R: number,
  t: ArrayLike<number>,
  r: number
): number[] {
  const dx = t[0] - c[0],
    dy = t[1] - c[1],
    dz = t[2] - c[2];
  const d = Math.hypot(dx, dy, dz);
  const sin = d > 0 ? (R - r) / d : 1;
  if (!(Math.abs(sin) < 1)) {
    const [q, rq] = R >= r ? [c, R] : [t, r];
    return [q[0], q[1], q[2], rq, q[0], q[1], q[2], rq];
  }
  const cos = Math.sqrt(1 - sin * sin),
    a = (R * sin) / d,
    b = (r * sin) / d;
  return [
    c[0] + a * dx,
    c[1] + a * dy,
    c[2] + a * dz,
    R * cos,
    t[0] + b * dx,
    t[1] + b * dy,
    t[2] + b * dz,
    r * cos,
  ];
}

/**
 * The soma's segments, with every radius at least `floor`: the sphere of radius R at c, then a neck to each of the
 * `targets` (x, y, z, r each), tangent to the two spheres as floored (`tangentNeck`). A neck raised to a floor once it
 * is laid would be tangent to neither, so the floor goes on the spheres first.
 */
export function somaSegments(
  c: ArrayLike<number>,
  R: number,
  targets: Float64Array,
  floor: number
): Float64Array {
  const r = Math.max(R, floor);
  const segs = new Float64Array(8 + 2 * targets.length);
  segs.set([c[0], c[1], c[2], r, c[0], c[1], c[2], r]);
  for (let k = 0; k < targets.length; k += 4) {
    segs.set(
      tangentNeck(c, r, targets.subarray(k, k + 4), Math.max(targets[k + 3], floor)),
      8 + 2 * k
    );
  }
  return segs;
}

/**
 * The soma and every selected section as rounded-cone segments. Radii are raised to `floor`: for the voxel mesher,
 * which leaves it out, the smallest radius its one grid can hold; the hybrid mesher passes its own, far lower.
 *
 * The soma is the base sphere of `Morphology.somaStems` and, for every valid or cut arbor whose section is selected,
 * a *neck*: the cone tangent to the base sphere and to the sphere at the arbor's target, of the target's radius, laid
 * as a rounded cone between the circles where it touches them (`tangentNeck`; soma.ts, step 9). A neck leaves the
 * sphere without an edge, and the field shades it as the cone it is (field.ts). Sphere and necks are one primitive, so
 * that within it the distances combine by a minimum and a neck adds nothing to the sphere or to another neck: a smooth
 * minimum (`smoothMin`, `SOMA_ROUNDING`), so that where two necks cross they meet in a round and not in a crease. Its
 * arbor's section starts at the target, rather than at the soma node, so that the two do not add up along the neck
 * either; there the cone meets the section's tube at the cone's half-angle, and the two blend as a section does with
 * its parent at a fork, in the soma's family (kin.ts), over the soma's blend scale on the neck's side. A far arbor's
 * section starts at the sample added at `STEM_FAR_DISTANCE`, at the neck's radius there, and comes down to its first
 * sample from it. Without a valid arbor, a cut arbor's section starts where it gets `neckDistance` from the centre.
 * Any other arbor gets no neck, and its section leaves the sphere from the soma node as it was traced.
 */
export function collectPrimitives(m: Morphology, params: MeshParams, floor?: number): Prim[] {
  const prims: Prim[] = [];
  const minR = floor ?? Math.max(params.minRadius, MIN_RADIUS_VOXELS * params.voxel);
  const include = params.includeTypes ? new Set(params.includeTypes) : null;
  const soma = somaSphere(m);
  let necks = new Map<number, Float64Array>();
  if (soma) {
    necks = somaNecks(m, include);
    const targets = new Float64Array(4 * necks.size);
    let k = 0;
    for (const n of necks.values()) targets.set(n.subarray(0, 4), 4 * k++);
    const segs = somaSegments(soma.center, soma.radius, targets, minR);
    prims.push({
      type: SWC_SOMA,
      beta: params.somaBlend,
      segs,
      ends: [SOMA_NODE, SOMA_NODE],
      targets,
    });
  }
  const hasSoma = prims.length > 0;
  for (let index = 0; index < m.sections.length; index++) {
    const sec = m.sections[index];
    if (include && !include.has(sec.type)) continue;
    const p = necks.get(index) ?? sec.points;
    if (p.length < 8) continue;
    prims.push({
      type: sec.type,
      beta: params.blend,
      segs: chainSegments(p, minR),
      ends: sectionEnds(m, sec, hasSoma),
    });
  }
  return prims;
}

function makeGrid(prims: Prim[], h: number): Grid {
  let lo0 = Infinity,
    lo1 = Infinity,
    lo2 = Infinity;
  let hi0 = -Infinity,
    hi1 = -Infinity,
    hi2 = -Infinity;
  for (const P of prims) {
    const s = P.segs;
    for (let k = 0; k < s.length; k += 4) {
      const w = bandHalfWidth(s[k + 3], P.beta, h);
      lo0 = Math.min(lo0, s[k] - w);
      lo1 = Math.min(lo1, s[k + 1] - w);
      lo2 = Math.min(lo2, s[k + 2] - w);
      hi0 = Math.max(hi0, s[k] + w);
      hi1 = Math.max(hi1, s[k + 1] + w);
      hi2 = Math.max(hi2, s[k + 2] + w);
    }
  }
  const ox = lo0 - 2 * h;
  const oy = lo1 - 2 * h;
  const oz = lo2 - 2 * h;
  const nx = Math.ceil((hi0 - ox) / h) + 3;
  const ny = Math.ceil((hi1 - oy) / h) + 3;
  const nz = Math.ceil((hi2 - oz) / h) + 3;
  const nbx = Math.ceil(nx / B) + 1;
  const nby = Math.ceil(ny / B) + 1;
  const nbz = Math.ceil(nz / B) + 1;
  if (nbx * nby * nbz > Number.MAX_SAFE_INTEGER)
    throw new Error('grid too large for this voxel size');
  return { h, ox, oy, oz, nx, ny, nz, nbx, nby, nbz };
}

/** Voxels in the bounding box of segment k's band. */
function segmentBandVoxels(s: Float64Array, k: number, beta: number, h: number): number {
  const w = bandHalfWidth(Math.max(s[k + 3], s[k + 7]), beta, h);
  const ex = Math.abs(s[k + 4] - s[k]) + 2 * w;
  const ey = Math.abs(s[k + 5] - s[k + 1]) + 2 * w;
  const ez = Math.abs(s[k + 6] - s[k + 2]) + 2 * w;
  return (ex / h + 1) * (ey / h + 1) * (ez / h + 1);
}

export function estimateBandVoxels(prims: Prim[], h: number): number {
  let total = 0;
  for (const P of prims) {
    const s = P.segs;
    for (let k = 0; k < s.length; k += 8) total += segmentBandVoxels(s, k, P.beta, h);
  }
  return Math.round(total);
}

// ---------------------------------------------------------------------------
// Slab planning

const axisOrigin = (g: Grid, axis: number): number =>
  axis === 0 ? g.ox : axis === 1 ? g.oy : g.oz;
const axisSamples = (g: Grid, axis: number): number =>
  axis === 0 ? g.nx : axis === 1 ? g.ny : g.nz;
const axisBlocks = (g: Grid, axis: number): number =>
  axis === 0 ? g.nbx : axis === 1 ? g.nby : g.nbz;

/** First sample index along `axis` inside segment k's band, before clipping to the grid. */
function bandFirstSample(s: Float64Array, k: number, beta: number, g: Grid, axis: number): number {
  const w = bandHalfWidth(Math.max(s[k + 3], s[k + 7]), beta, g.h);
  return Math.ceil((Math.min(s[k + axis], s[k + 4 + axis]) - w - axisOrigin(g, axis)) / g.h);
}

/** Last sample index along `axis` inside segment k's band, before clipping to the grid. */
function bandLastSample(s: Float64Array, k: number, beta: number, g: Grid, axis: number): number {
  const w = bandHalfWidth(Math.max(s[k + 3], s[k + 7]), beta, g.h);
  return Math.floor((Math.max(s[k + axis], s[k + 4 + axis]) + w - axisOrigin(g, axis)) / g.h);
}

/**
 * Cut the block layers into at most `want` slabs of roughly equal splatting
 * work, on the axis where the heaviest slab comes out lightest.
 */
function chooseCuts(
  prims: Prim[],
  g: Grid,
  want: number,
  forcedAxis?: number
): { axis: number; cuts: number[] } {
  if (want <= 1) {
    const axis = forcedAxis ?? 0;
    return { axis, cuts: [0, axisBlocks(g, axis)] };
  }
  let best = { axis: 0, cuts: [0, g.nbx], heaviest: Infinity };
  for (const axis of forcedAxis !== undefined ? [forcedAxis] : [0, 1, 2]) {
    const layers = axisBlocks(g, axis);
    const last = axisSamples(g, axis) - 1;
    const work = new Float64Array(layers);
    for (const P of prims) {
      const s = P.segs;
      for (let k = 0; k < s.length; k += 8) {
        const lo = Math.max(0, bandFirstSample(s, k, P.beta, g, axis));
        const hi = Math.min(last, bandLastSample(s, k, P.beta, g, axis));
        if (lo > hi) continue;
        const l0 = Math.floor(lo / B),
          l1 = Math.floor(hi / B);
        const share = segmentBandVoxels(s, k, P.beta, g.h) / (l1 - l0 + 1);
        for (let l = l0; l <= l1; l++) work[l] += share;
      }
    }
    const cuts = equalWorkCuts(work, want);
    let heaviest = 0;
    for (let i = 0; i + 1 < cuts.length; i++) {
      let sum = 0;
      for (let l = cuts[i]; l < cuts[i + 1]; l++) sum += work[l];
      heaviest = Math.max(heaviest, sum);
    }
    if (heaviest < best.heaviest) best = { axis, cuts, heaviest };
  }
  return { axis: best.axis, cuts: best.cuts };
}

/** Layer boundaries (strictly increasing, from 0 to work.length) splitting `work` into at most n equal parts. */
function equalWorkCuts(work: Float64Array, n: number): number[] {
  let total = 0;
  for (let l = 0; l < work.length; l++) total += work[l];
  const cuts = [0];
  let acc = 0;
  for (let l = 0; l + 1 < work.length && cuts.length < n; l++) {
    acc += work[l];
    if (acc >= (total * cuts.length) / n) cuts.push(l + 1);
  }
  cuts.push(work.length);
  return cuts;
}

/** Sample range [lo, hi] along the cut axis that slab [a0, a1) reads and writes, including its halo. */
function slabSampleRange(a0: number, a1: number): [number, number] {
  return [a0 > 0 ? a0 * B - 1 : 0, a1 * B];
}

function makeJobs(
  prims: FieldPrim[],
  g: Grid,
  center: [number, number, number],
  axis: number,
  cuts: number[],
  simplify: number,
  project: boolean
): SlabJob[] {
  const n = cuts.length - 1;
  const lo = new Float64Array(n),
    hi = new Float64Array(n);
  for (let j = 0; j < n; j++) [lo[j], hi[j]] = slabSampleRange(cuts[j], cuts[j + 1]);

  // Pass 1: find the slabs each segment reaches (with a sample of margin) and size the jobs.
  const total = segmentCount(prims);
  const first = new Int32Array(total),
    last = new Int32Array(total);
  const segCount = new Uint32Array(n),
    primCount = new Uint32Array(n);
  const lastPrim = new Int32Array(n).fill(-1);
  let si = 0;
  for (let p = 0; p < prims.length; p++) {
    const P = prims[p];
    const s = P.segs;
    for (let k = 0; k < s.length; k += 8, si++) {
      const s0 = bandFirstSample(s, k, P.beta, g, axis) - 1;
      const s1 = bandLastSample(s, k, P.beta, g, axis) + 1;
      // First slab whose range ends at or after s0 (hi is increasing).
      let a = 0,
        b = n;
      while (a < b) {
        const mid = (a + b) >> 1;
        if (hi[mid] < s0) a = mid + 1;
        else b = mid;
      }
      let j = a;
      first[si] = j;
      for (; j < n && lo[j] <= s1; j++) {
        segCount[j]++;
        if (lastPrim[j] !== p) {
          lastPrim[j] = p;
          primCount[j]++;
        }
      }
      last[si] = j - 1;
    }
  }

  const jobs: SlabJob[] = [];
  for (let j = 0; j < n; j++) {
    jobs.push({
      index: j,
      grid: g,
      center,
      axis,
      a0: cuts[j],
      a1: cuts[j + 1],
      hasNext: j + 1 < n,
      simplify,
      project,
      segs: new Float64Array(8 * segCount[j]),
      primStart: new Uint32Array(primCount[j] + 1),
      primType: new Uint8Array(primCount[j]),
      primBeta: new Float64Array(primCount[j]),
      primRound: new Float64Array(primCount[j]),
      primFamily: new Uint32Array(primCount[j]),
      primChain: new Uint32Array(primCount[j]),
    });
  }

  // Pass 2: copy segments into their slabs, opening a section entry on its first segment.
  const segPos = new Uint32Array(n),
    primPos = new Uint32Array(n);
  lastPrim.fill(-1);
  si = 0;
  for (let p = 0; p < prims.length; p++) {
    const P = prims[p];
    const s = P.segs;
    const round = P.type === SWC_SOMA && s.length > 8 ? somaRounding(P.beta) : 0;
    for (let k = 0; k < s.length; k += 8, si++) {
      for (let j = first[si]; j <= last[si]; j++) {
        const job = jobs[j];
        if (lastPrim[j] !== p) {
          lastPrim[j] = p;
          job.primStart[primPos[j]] = segPos[j];
          job.primType[primPos[j]] = P.type;
          job.primBeta[primPos[j]] = P.beta;
          job.primRound[primPos[j]] = round;
          job.primFamily[primPos[j]] = P.family;
          job.primChain[primPos[j]] = P.chain;
          primPos[j]++;
        }
        job.segs.set(s.subarray(k, k + 8), 8 * segPos[j]);
        segPos[j]++;
      }
    }
  }
  for (let j = 0; j < n; j++) jobs[j].primStart[primCount[j]] = segCount[j];
  return jobs;
}

// ---------------------------------------------------------------------------
// Slab meshing

const blockLayer = (blk: Block, axis: number): number =>
  axis === 0 ? blk.bx : axis === 1 ? blk.by : blk.bz;

export function slabClip(job: SlabJob): Clip {
  const g = job.grid;
  const c: Clip = {
    gx0: 0,
    gy0: 0,
    gz0: 0,
    gx1: g.nx - 1,
    gy1: g.ny - 1,
    gz1: g.nz - 1,
    bx0: 0,
    by0: 0,
    bz0: 0,
    bx1: g.nbx - 1,
    by1: g.nby - 1,
    bz1: g.nbz - 1,
  };
  const [lo, hi] = slabSampleRange(job.a0, job.a1);
  const b0 = Math.max(0, job.a0 - 1),
    b1 = job.a1 - 1;
  if (job.axis === 0) {
    c.gx0 = lo;
    c.gx1 = Math.min(c.gx1, hi);
    c.bx0 = b0;
    c.bx1 = b1;
  } else if (job.axis === 1) {
    c.gy0 = lo;
    c.gy1 = Math.min(c.gy1, hi);
    c.by0 = b0;
    c.by1 = b1;
  } else {
    c.gz0 = lo;
    c.gz1 = Math.min(c.gz1, hi);
    c.bz0 = b0;
    c.bz1 = b1;
  }
  return c;
}

/** The accumulated field of one slab, from either backend, ready for extraction. */
export interface SlabField {
  /** Blocks by key (bz × nby + by) × nbx + bx. The GPU backend only lists the blocks the surface crosses. */
  blocks: Map<number, Block>;
  /** Blocks allocated in the slab's own layers (not the halo), for the statistics. */
  ownedBlocks: number;
  fieldMB: number;
}

export function meshSlab(job: SlabJob): SlabResult {
  const t0 = performance.now();
  const field = accumulateField(job);
  return finishSlab(job, field, performance.now() - t0);
}

/** Field accumulation on the CPU: splat every section into the sparse blocks. */
export function accumulateField(job: SlabJob): SlabField {
  const g = job.grid;
  const clip = slabClip(job);
  const blocks = new Map<number, Block>();
  const arena = new BlockArena();
  const scratch = new Map<number, Scratch>();
  const s = job.segs;
  // A family's sum goes into the field by the maximum with what is there. The first family has the field to itself
  // and is summed in place; of the others, a lone section goes in by the maximum as it is, and several are summed
  // apart first, in blocks that are handed back when the family is done.
  const family = job.primFamily,
    count = job.primType.length;
  const sums = new Map<number, FamilySum>();
  for (let p = 0; p < count; p++) {
    const beta = job.primBeta[p],
      round = job.primRound[p];
    const end = 8 * job.primStart[p + 1];
    for (let k = 8 * job.primStart[p]; k < end; k += 8) {
      splatSegment(
        g,
        clip,
        scratch,
        s[k],
        s[k + 1],
        s[k + 2],
        s[k + 3],
        s[k + 4],
        s[k + 5],
        s[k + 6],
        s[k + 7],
        beta,
        round
      );
    }
    const first = family[p] === family[0],
      last = p + 1 === count || family[p + 1] !== family[p];
    const alone = last && (p === 0 || family[p - 1] !== family[p]);
    flushSection(
      blocks,
      arena,
      g,
      scratch,
      job.primType[p],
      first ? FLUSH_ADD : alone ? FLUSH_MAX : FLUSH_APART,
      sums
    );
    if (last && !first && !alone) mergeFamily(blocks, sums);
  }
  if (scratchPool.length > POOL_KEPT) scratchPool.length = POOL_KEPT;
  if (sumPool.length > POOL_KEPT) sumPool.length = POOL_KEPT;
  let ownedBlocks = 0;
  for (const blk of blocks.values()) if (blockLayer(blk, job.axis) >= job.a0) ownedBlocks++;
  return { blocks, ownedBlocks, fieldMB: (arena.claimed * BS3 * BYTES_PER_SAMPLE) / 1e6 };
}

/** The raw surface of one slab, from either extraction backend. */
export interface SlabSurface {
  /** Vertices of the slab's own blocks, then its halo vertices. */
  positions: Float32Array;
  vertexTypes: Uint8Array;
  indices: Uint32Array;
  ownedVertices: number;
  top: Seam;
  halo: Seam;
  defects: number;
  /**
   * Set when the backend has already moved the vertices onto the isosurface (gpu-slab.ts): the unit field normals it
   * left, zero where the gradient vanished and the face normal has to stand in, as `projectVertices` leaves it.
   */
  normals?: Float32Array;
  /** The radius of the closest section at every projected vertex, as `projectVertices` leaves it. */
  radii?: Float32Array;
  /** Vertices the backend could not reach the field at and left where they were, for `completeSlab` to project. */
  unprojected?: Uint32Array;
}

/** What the steps before `completeSlab` report into the slab's statistics. */
export interface SlabTimings {
  ownedBlocks: number;
  fieldMB: number;
  fieldMs: number;
  /** When the extraction started, on the `performance.now()` clock. */
  extractStart: number;
}

/** Surface extraction and simplification of a slab whose field took `fieldMs` to accumulate. */
export function finishSlab(job: SlabJob, field: SlabField, fieldMs: number): SlabResult {
  const extractStart = performance.now();
  const surface = extractSurface(job, field);
  return completeSlab(job, surface, {
    ownedBlocks: field.ownedBlocks,
    fieldMB: field.fieldMB,
    fieldMs,
    extractStart,
  });
}

/** Surface nets on the CPU. Empties `field.blocks`. */
function extractSurface(job: SlabJob, field: SlabField): SlabSurface {
  const g = job.grid;
  const { blocks } = field;

  // Row masks for every block; blocks the surface misses are dropped here.
  const rowMasks = new Uint16Array(blocks.size * ROWS);
  const owned: Block[] = [];
  const haloBlocks: Block[] = [];
  let active = 0;
  for (const blk of blocks.values()) {
    const isOwned = blockLayer(blk, job.axis) >= job.a0;
    if (!classifyBlock(blk, rowMasks)) {
      blk.meta = null;
      continue;
    }
    blk.cv = active++ * B3;
    (isOwned ? owned : haloBlocks).push(blk);
  }
  const cv = new Int32Array(active * B3);
  curCv = cv;

  const positions = new GrowableFloat32(1 << 16);
  const vertexTypes = new GrowableUint8(1 << 16);
  const indices = new GrowableUint32(1 << 17);
  const top: Seam = { keys: [], vertices: [] };
  const halo: Seam = { keys: [], vertices: [] };
  const topLayer = job.hasNext ? job.a1 - 1 : -1;

  for (const blk of owned) {
    const seam = blockLayer(blk, job.axis) === topLayer ? top : null;
    extractVertices(blk, rowMasks, cv, g, job.center, job.axis, 0, seam, positions, vertexTypes);
    blk.meta = null;
  }
  const ownedVertices = positions.length / 3;
  // Halo blocks only hold valid samples in their top two planes: extract just that cell layer.
  for (const blk of haloBlocks) {
    extractVertices(
      blk,
      rowMasks,
      cv,
      g,
      job.center,
      job.axis,
      B - 1,
      halo,
      positions,
      vertexTypes
    );
    blk.meta = null;
  }
  let defects = 0;
  for (const blk of owned) defects += extractFaces(blk, blocks, rowMasks, g, positions, indices);
  blocks.clear();
  // Let the cell tables go with the slab.
  curCv = NO_CELLS;
  nbMulti.fill(null);
  return {
    positions: positions.trimmed(),
    vertexTypes: vertexTypes.trimmed(),
    indices: indices.trimmed(),
    ownedVertices,
    top,
    halo,
    defects,
  };
}

/** A slab between its projection onto the field and its simplification. */
interface Completion {
  job: SlabJob;
  surface: SlabSurface;
  timings: SlabTimings;
  positions: Float32Array;
  normals: Float32Array;
  sampler: FieldSampler | null;
  radii: Float32Array | undefined;
  /** When the simplification started, on the `performance.now()` clock. */
  simplifyStart: number;
}

/** Vertex normals, projection onto the field, simplification and the slab's result record. */
export function completeSlab(job: SlabJob, surface: SlabSurface, timings: SlabTimings): SlabResult {
  const run = startCompletion(job, surface, timings);
  const { sampler, positions, normals, radii } = run;
  const checked =
    sampler !== null && simplifies(job)
      ? simplifyChecked(
          sampler,
          positions,
          normals,
          surface.indices,
          job.center,
          job.grid.h,
          job.simplify,
          radii
        )
      : null;
  return endCompletion(run, checked);
}

/** `completeSlab`, with the simplified triangles checked against the field by `elsewhere` (gpu-slab.ts). */
export async function completeSlabAsync(
  job: SlabJob,
  surface: SlabSurface,
  timings: SlabTimings,
  elsewhere: OffSurfaceCheck
): Promise<SlabResult> {
  const run = startCompletion(job, surface, timings);
  const { sampler, positions, normals, radii } = run;
  const checked =
    sampler !== null && simplifies(job)
      ? await simplifyCheckedAsync(
          sampler,
          positions,
          normals,
          surface.indices,
          job.center,
          job.grid.h,
          job.simplify,
          radii,
          elsewhere
        )
      : null;
  return endCompletion(run, checked);
}

/** Whether the slab is to be simplified; it throws if it is and the simplifier has not loaded. */
function simplifies(job: SlabJob): boolean {
  if (job.simplify <= 0) return false;
  if (!simplifierUp)
    throw new Error('mesh simplifier not loaded yet: await simplifierReady before meshing');
  return true;
}

/** The normals, and the projection onto the field unless the backend has done it. */
function startCompletion(job: SlabJob, surface: SlabSurface, timings: SlabTimings): Completion {
  const positions = surface.positions;
  const indices = surface.indices;
  // Either the backend projected the vertices and left the field normals, or they start as the faces' and the
  // projection below replaces them.
  const given = job.project ? surface.normals : undefined;
  const normals = given ?? faceNormalSums(positions, indices);
  const h = job.grid.h;
  const sampler =
    indices.length > 0 && (job.project || job.simplify > 0) ? new FieldSampler(job) : null;
  // The projection ends on a sample at every vertex's final position; the simplification wants the radius from it,
  // and the result carries it. Without the projection the vertices are not on the surface and have none.
  const radii = job.project ? (surface.radii ?? new Float32Array(positions.length / 3)) : undefined;
  // A halo vertex and its owner in the slab below see the same segments, so both copies land in the same place.
  // The normals it leaves are the field's own: the simplification checks which way its triangles face against them,
  // and the vertices that survive it trade them for shading normals below.
  if (job.project && sampler !== null) {
    // A projecting backend leaves the vertices it could not reach the field at (a step past the blocks it was given)
    // where they were, and this finishes them: a halo vertex and its owner still agree, both being done here.
    if (given === undefined) projectVertices(sampler, positions, normals, job.center, h, radii);
    else if (surface.unprojected !== undefined && surface.unprojected.length > 0) {
      projectVertices(sampler, positions, normals, job.center, h, radii, surface.unprojected);
    }
  }
  if (given !== undefined) fillBlankNormals(normals, positions, indices);
  return {
    job,
    surface,
    timings,
    positions,
    normals,
    sampler,
    radii,
    simplifyStart: performance.now(),
  };
}

/** The vertices the simplification kept, their shading normals, and the slab's result record. */
function endCompletion(run: Completion, checked: CheckedSimplification | null): SlabResult {
  const { job, surface, sampler } = run;
  const { ownedVertices, top, halo, defects } = surface;
  const { ownedBlocks, fieldMB, fieldMs, extractStart: t1 } = run.timings;
  const t2 = run.simplifyStart;
  let positionsOut = run.positions;
  let indicesOut = surface.indices;
  let typesOut = surface.vertexTypes;
  let normals = run.normals;
  let radii = run.radii;
  let haloKeys: Float64Array = Float64Array.from(halo.keys);
  let haloVertices: Uint32Array = Uint32Array.from(halo.vertices);
  let topKeys: Float64Array = Float64Array.from(top.keys);
  let topVertices: Uint32Array = Uint32Array.from(top.vertices);
  let owned2 = ownedVertices;
  const rawTriangles = indicesOut.length / 3;

  // ---- Compaction -----------------------------------------------------------
  let simplifyPasses = 0;
  if (checked !== null) {
    simplifyPasses = checked.passes;
    const c = compactVertices(checked.indices, positionsOut.length / 3, ownedVertices);
    indicesOut = c.indices;
    owned2 = c.ownedVertices;
    positionsOut = gather3(positionsOut, c.keep);
    normals = gather3(normals, c.keep);
    typesOut = gather1(typesOut, c.keep);
    if (radii !== undefined) radii = gather1(radii, c.keep);
    [haloKeys, haloVertices] = remapSeam(haloKeys, haloVertices, c.remap);
    [topKeys, topVertices] = remapSeam(topKeys, topVertices, c.remap);
  }
  const t3 = performance.now();

  // ---- Shading normals ------------------------------------------------------
  // Only now, for the few vertices that are left. As with the projection, a halo vertex and its owner get the same.
  if (job.project && sampler !== null) shadeVertices(sampler, positionsOut, normals, job.center);
  const t4 = performance.now();

  return {
    index: job.index,
    positions: positionsOut,
    vertexTypes: typesOut,
    normals,
    radii: radii ?? new Float32Array(positionsOut.length / 3),
    indices: indicesOut,
    ownedVertices: owned2,
    haloKeys,
    haloVertices,
    topKeys,
    topVertices,
    blocks: ownedBlocks,
    defects,
    rawTriangles,
    fieldMs,
    extractMs: t2 - t1 + (t4 - t3),
    simplifyMs: t3 - t2,
    simplifyPasses,
    fieldMB,
  };
}

// ---------------------------------------------------------------------------
// Simplification support

interface Compaction {
  /** Old → new vertex index, -1 for vertices no triangle uses any more. */
  remap: Int32Array;
  /** New → old vertex index. */
  keep: Uint32Array;
  ownedVertices: number;
  indices: Uint32Array;
}

/** Number the vertices still referenced by `indices`: owned vertices first, then halo vertices. */
function compactVertices(
  indices: Uint32Array,
  vertexCount: number,
  ownedVertices: number
): Compaction {
  const used = new Uint8Array(vertexCount);
  for (let i = 0; i < indices.length; i++) used[indices[i]] = 1;
  const remap = new Int32Array(vertexCount).fill(-1);
  const keep = new Uint32Array(vertexCount);
  let n = 0;
  for (let v = 0; v < ownedVertices; v++) {
    if (used[v]) {
      remap[v] = n;
      keep[n++] = v;
    }
  }
  const owned = n;
  for (let v = ownedVertices; v < vertexCount; v++) {
    if (used[v]) {
      remap[v] = n;
      keep[n++] = v;
    }
  }
  const out = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) out[i] = remap[indices[i]];
  return { remap, keep: keep.subarray(0, n), ownedVertices: owned, indices: out };
}

function gather3(src: Float32Array, keep: Uint32Array): Float32Array {
  const out = new Float32Array(3 * keep.length);
  for (let i = 0; i < keep.length; i++) {
    const o = 3 * keep[i];
    out[3 * i] = src[o];
    out[3 * i + 1] = src[o + 1];
    out[3 * i + 2] = src[o + 2];
  }
  return out;
}

function gather1<T extends Uint8Array | Float32Array>(src: T, keep: Uint32Array): T {
  const out = new (src.constructor as new (n: number) => T)(keep.length);
  for (let i = 0; i < keep.length; i++) out[i] = src[keep[i]];
  return out;
}

/** Drop seam entries whose vertex is gone and renumber the rest. */
function remapSeam(
  keys: Float64Array,
  vertices: Uint32Array,
  remap: Int32Array
): [Float64Array, Uint32Array] {
  let n = 0;
  for (let i = 0; i < vertices.length; i++) if (remap[vertices[i]] >= 0) n++;
  const k = new Float64Array(n),
    v = new Uint32Array(n);
  let j = 0;
  for (let i = 0; i < vertices.length; i++) {
    const nv = remap[vertices[i]];
    if (nv < 0) continue;
    k[j] = keys[i];
    v[j++] = nv;
  }
  return [k, v];
}

// ---------------------------------------------------------------------------
// Merging

/** A mesh stitched together from slabs: what `mergeSlabs` makes of them before the counting. */
export interface StitchedMesh {
  positions: Float32Array;
  indices: Uint32Array;
  /** Unit normals. */
  normals: Float32Array;
  vertexTypes: Uint8Array;
  radii: Float32Array;
  /** The triangles of each slab, in index order. */
  chunks: MeshChunk[];
  /** The slabs' defects, and the triangles that lost a vertex at a seam. */
  defects: number;
}

/** Stitch the results of the `count` slabs of a plan, in any order, into one mesh. */
export function stitchSlabs(results: SlabResult[], count: number): StitchedMesh {
  const slabs = [...results].sort((a, b) => a.index - b.index);
  const n = slabs.length;
  if (n !== count || slabs.some((r, i) => r.index !== i)) {
    throw new Error(
      `expected results for slabs 0..${count - 1}, got ${slabs.map((r) => r.index).join(', ')}`
    );
  }

  let defects = 0;
  for (const r of slabs) defects += r.defects;

  let positions: Float32Array,
    normals: Float32Array,
    vertexTypes: Uint8Array,
    radii: Float32Array,
    indices: Uint32Array;
  const chunks: MeshChunk[] = [];
  if (n === 1 && slabs[0].ownedVertices * 3 === slabs[0].positions.length) {
    // A lone slab owns every vertex it extracted, so its arrays are the mesh.
    ({ positions, normals, vertexTypes, radii, indices } = slabs[0]);
    chunks.push({
      indexStart: 0,
      indexCount: indices.length,
      bounds: boundsOf(positions, indices),
    });
  } else {
    // Pass 1: global vertex numbers. A slab's owned vertices come first, then
    // those of its halo vertices that have no counterpart in the slab below
    // (simplification collapsed it away, so every face around the vertex is up here).
    const base = new Uint32Array(n);
    const haloMaps: Int32Array[] = [];
    let nv = 0,
      ni = 0;
    for (let s = 0; s < n; s++) {
      const r = slabs[s];
      const own = r.ownedVertices;
      const nh = r.positions.length / 3 - own;
      base[s] = nv;
      nv += own;
      const haloTo = new Int32Array(nh).fill(-1);
      const used = new Uint8Array(nh);
      for (let t = 0; t < r.indices.length; t++) {
        const v = r.indices[t];
        if (v >= own) used[v - own] = 1;
      }
      if (s > 0 && r.haloKeys.length > 0) {
        const prev = slabs[s - 1];
        const owner = new Map<number, number>();
        for (let i = 0; i < prev.topKeys.length; i++)
          owner.set(prev.topKeys[i], base[s - 1] + prev.topVertices[i]);
        for (let i = 0; i < r.haloKeys.length; i++) {
          const gv = owner.get(r.haloKeys[i]);
          if (gv !== undefined) haloTo[r.haloVertices[i] - own] = gv;
        }
      }
      for (let i = 0; i < nh; i++) if (used[i] === 1 && haloTo[i] < 0) haloTo[i] = nv++;
      haloMaps.push(haloTo);
      ni += r.indices.length;
    }

    positions = new Float32Array(3 * nv);
    normals = new Float32Array(3 * nv);
    vertexTypes = new Uint8Array(nv);
    radii = new Float32Array(nv);
    indices = new Uint32Array(ni);

    // Pass 2: vertices. Owners collect the normal sums of their halo copies.
    for (let s = 0; s < n; s++) {
      const r = slabs[s];
      const own = r.ownedVertices,
        b = base[s];
      positions.set(r.positions.subarray(0, 3 * own), 3 * b);
      normals.set(r.normals.subarray(0, 3 * own), 3 * b);
      vertexTypes.set(r.vertexTypes.subarray(0, own), b);
      radii.set(r.radii.subarray(0, own), b);
      const haloTo = haloMaps[s];
      for (let i = 0; i < haloTo.length; i++) {
        const gv = haloTo[i];
        if (gv < 0) continue;
        const hv = own + i;
        if (gv < b) {
          normals[3 * gv] += r.normals[3 * hv];
          normals[3 * gv + 1] += r.normals[3 * hv + 1];
          normals[3 * gv + 2] += r.normals[3 * hv + 2];
        } else {
          positions.set(r.positions.subarray(3 * hv, 3 * hv + 3), 3 * gv);
          normals.set(r.normals.subarray(3 * hv, 3 * hv + 3), 3 * gv);
          vertexTypes[gv] = r.vertexTypes[hv];
          radii[gv] = r.radii[hv];
        }
      }
    }

    // Pass 3: faces, one chunk per slab.
    let ip = 0;
    for (let s = 0; s < n; s++) {
      const r = slabs[s];
      const own = r.ownedVertices,
        b = base[s];
      const haloTo = haloMaps[s];
      const src = r.indices;
      const start = ip;
      const bb: [number, number, number, number, number, number] = [
        Infinity,
        Infinity,
        Infinity,
        -Infinity,
        -Infinity,
        -Infinity,
      ];
      for (let t = 0; t < src.length; t += 3) {
        let ok = true;
        for (let e = 0; e < 3; e++) {
          const v = src[t + e];
          const gv = v < own ? b + v : haloTo[v - own];
          if (gv < 0) {
            ok = false;
            break;
          }
          indices[ip + e] = gv;
        }
        if (!ok) {
          defects++;
          continue;
        }
        for (let e = 0; e < 3; e++) {
          const o = 3 * indices[ip + e];
          const x = positions[o],
            y = positions[o + 1],
            z = positions[o + 2];
          if (x < bb[0]) bb[0] = x;
          if (y < bb[1]) bb[1] = y;
          if (z < bb[2]) bb[2] = z;
          if (x > bb[3]) bb[3] = x;
          if (y > bb[4]) bb[4] = y;
          if (z > bb[5]) bb[5] = z;
        }
        ip += 3;
      }
      if (ip === start) bb.fill(0);
      chunks.push({ indexStart: start, indexCount: ip - start, bounds: bb });
    }
    if (ip < ni) indices = indices.slice(0, ip);
  }

  normalize(normals);
  smoothVertexTypes(indices, vertexTypes, 2);
  return { positions, indices, normals, vertexTypes, radii, chunks, defects };
}

/** Stitch slab results (in any order) into one mesh. */
export function mergeSlabs(plan: PlanInfo, results: SlabResult[]): MeshResult {
  const t0 = performance.now();
  const slabs = [...results].sort((a, b) => a.index - b.index);
  const { positions, indices, normals, vertexTypes, radii, chunks, defects } = stitchSlabs(
    slabs,
    plan.slabs
  );
  const nonManifoldEdges = countNonManifoldEdges(indices, positions.length / 3);
  const mergeMs = performance.now() - t0;

  const work = sumWork(slabs);
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
    vertices: positions.length / 3,
    triangles: indices.length / 3,
    rawTriangles: work.rawTriangles,
    defects,
    nonManifoldEdges,
    fieldMs: work.fieldMs,
    extractMs: work.extractMs,
    simplifyMs: work.simplifyMs,
    simplifyPasses: work.simplifyPasses,
    mergeMs,
    totalMs: work.fieldMs + work.extractMs + work.simplifyMs + mergeMs,
    fieldMB: work.fieldMB,
    slabs: slabs.length,
    workers: 1,
    gpu: work.gpu,
  };
  return { positions, indices, normals, vertexTypes, radii, chunks, center: plan.center, stats };
}

/** Edges with more than two triangles. */
export function countNonManifoldEdges(indices: Uint32Array, vertexCount: number): number {
  // Every edge under its lower end.
  const start = new Uint32Array(vertexCount + 1);
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t],
      b = indices[t + 1],
      c = indices[t + 2];
    start[(a < b ? a : b) + 1]++;
    start[(b < c ? b : c) + 1]++;
    start[(c < a ? c : a) + 1]++;
  }
  for (let v = 0; v < vertexCount; v++) start[v + 1] += start[v];
  const fill = start.slice(0, vertexCount);
  const upper = new Uint32Array(indices.length);
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t],
      b = indices[t + 1],
      c = indices[t + 2];
    if (a < b) upper[fill[a]++] = b;
    else upper[fill[b]++] = a;
    if (b < c) upper[fill[b]++] = c;
    else upper[fill[c]++] = b;
    if (c < a) upper[fill[c]++] = a;
    else upper[fill[a]++] = c;
  }
  // The uses of each edge, counted at its lower end: the third makes it one.
  const seenBy = new Int32Array(vertexCount).fill(-1),
    uses = new Uint8Array(vertexCount);
  let crowded = 0;
  for (let v = 0; v < vertexCount; v++) {
    for (let q = start[v]; q < start[v + 1]; q++) {
      const w = upper[q];
      if (seenBy[w] !== v) {
        seenBy[w] = v;
        uses[w] = 1;
      } else if (++uses[w] === 3) crowded++;
    }
  }
  return crowded;
}

/** min x, y, z, max x, y, z of the vertices that `indices[start, start + count)` use; zero for none. */
export function boundsOf(
  P: Float32Array,
  indices: Uint32Array,
  start = 0,
  count = indices.length
): MeshChunk['bounds'] {
  const bb: MeshChunk['bounds'] = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = start; i < start + count; i++) {
    const v = 3 * indices[i];
    const x = P[v],
      y = P[v + 1],
      z = P[v + 2];
    if (x < bb[0]) bb[0] = x;
    if (y < bb[1]) bb[1] = y;
    if (z < bb[2]) bb[2] = z;
    if (x > bb[3]) bb[3] = x;
    if (y > bb[4]) bb[4] = y;
    if (z > bb[5]) bb[5] = z;
  }
  if (count === 0) bb.fill(0);
  return bb;
}

/** Add the work of a slab, or of several, into a running total. */
export function addWork(into: SlabWork, add: SlabWork): SlabWork {
  into.blocks += add.blocks;
  into.rawTriangles += add.rawTriangles;
  into.fieldMs += add.fieldMs;
  into.extractMs += add.extractMs;
  into.simplifyMs += add.simplifyMs;
  if (add.simplifyPasses > into.simplifyPasses) into.simplifyPasses = add.simplifyPasses;
  into.fieldMB += add.fieldMB;
  if (add.gpu) into.gpu = addGpuStats(into.gpu, add.gpu);
  return into;
}

/** The work of all of them, summed in their order. */
export function sumWork(all: SlabWork[]): SlabWork {
  const total: SlabWork = {
    blocks: 0,
    rawTriangles: 0,
    fieldMs: 0,
    extractMs: 0,
    simplifyMs: 0,
    simplifyPasses: 0,
    fieldMB: 0,
  };
  for (const w of all) addWork(total, w);
  return total;
}

/** Add one backend's slab statistics into a running total. */
export function addGpuStats(into: GpuFieldStats | undefined, add: GpuFieldStats): GpuFieldStats {
  const g = into ?? { binMs: 0, waitMs: 0, blocks: 0, blocksRead: 0, readMB: 0, slabsExtracted: 0 };
  g.binMs += add.binMs;
  g.waitMs += add.waitMs;
  g.blocks += add.blocks;
  g.blocksRead += add.blocksRead;
  g.readMB += add.readMB;
  g.slabsExtracted += add.slabsExtracted;
  return g;
}

/** Area-weighted face normals summed per vertex. */
function faceNormalSums(P: Float32Array, idx: Uint32Array): Float32Array {
  const N = new Float32Array(P.length);
  for (let t = 0; t < idx.length; t += 3) {
    const a = 3 * idx[t],
      b = 3 * idx[t + 1],
      c = 3 * idx[t + 2];
    const ux = P[b] - P[a],
      uy = P[b + 1] - P[a + 1],
      uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a],
      vy = P[c + 1] - P[a + 1],
      vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    N[a] += nx;
    N[a + 1] += ny;
    N[a + 2] += nz;
    N[b] += nx;
    N[b + 1] += ny;
    N[b + 2] += nz;
    N[c] += nx;
    N[c + 1] += ny;
    N[c + 2] += nz;
  }
  return N;
}

/**
 * Give the vertices a projecting backend left without a normal (the gradient vanished there, and it writes zero) the
 * sum of their faces' normals, which is what `projectVertices` leaves them with. It happens for no vertex of a
 * well-formed surface, so the faces are only summed when one turns up.
 */
function fillBlankNormals(
  normals: Float32Array,
  positions: Float32Array,
  indices: Uint32Array
): void {
  let blank = false;
  for (let v = 0; v < normals.length && !blank; v += 3) {
    blank = normals[v] === 0 && normals[v + 1] === 0 && normals[v + 2] === 0;
  }
  if (!blank) return;
  const faces = faceNormalSums(positions, indices);
  for (let v = 0; v < normals.length; v += 3) {
    if (normals[v] !== 0 || normals[v + 1] !== 0 || normals[v + 2] !== 0) continue;
    normals[v] = faces[v];
    normals[v + 1] = faces[v + 1];
    normals[v + 2] = faces[v + 2];
  }
}

function normalize(N: Float32Array): void {
  for (let i = 0; i < N.length; i += 3) {
    const len = Math.sqrt(N[i] * N[i] + N[i + 1] * N[i + 1] + N[i + 2] * N[i + 2]);
    if (len > 0) {
      N[i] /= len;
      N[i + 1] /= len;
      N[i + 2] /= len;
    }
  }
}

// ---------------------------------------------------------------------------
// Field accumulation

/**
 * A segment's band on the grid of a slab: the samples of the band's bounding box that the slab may write to, the
 * blocks that hold them (every one holds some), and which of those the band can reach at all. Both backends go by it
 * (`binSegments` in gpu-slab.ts), so that they take a segment to exactly the same samples.
 */
export class SegmentBand {
  gx0 = 0;
  gy0 = 0;
  gz0 = 0;
  gx1 = 0;
  gy1 = 0;
  gz1 = 0;
  bx0 = 0;
  by0 = 0;
  bz0 = 0;
  bx1 = 0;
  by1 = 0;
  bz1 = 0;
  /** The segment in voxels: its start, relative to the grid's origin, its axis and 1 / |axis|², 0 for none. */
  vx = 0;
  vy = 0;
  vz = 0;
  abx = 0;
  aby = 0;
  abz = 0;
  invLen2 = 0;
  /** How far, squared and in voxels, a block's centre may be from the segment for its band to reach the block. */
  private cull2 = 0;

  /** Take the segment from a to b whose band has the half-width w; false if the band has no sample in the slab. */
  set(
    g: Grid,
    clip: Clip,
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    w: number
  ): boolean {
    const h = g.h;
    let gx0 = Math.ceil((Math.min(ax, bx) - w - g.ox) / h);
    let gy0 = Math.ceil((Math.min(ay, by) - w - g.oy) / h);
    let gz0 = Math.ceil((Math.min(az, bz) - w - g.oz) / h);
    let gx1 = Math.floor((Math.max(ax, bx) + w - g.ox) / h);
    let gy1 = Math.floor((Math.max(ay, by) + w - g.oy) / h);
    let gz1 = Math.floor((Math.max(az, bz) + w - g.oz) / h);
    if (gx0 < clip.gx0) gx0 = clip.gx0;
    if (gy0 < clip.gy0) gy0 = clip.gy0;
    if (gz0 < clip.gz0) gz0 = clip.gz0;
    if (gx1 > clip.gx1) gx1 = clip.gx1;
    if (gy1 > clip.gy1) gy1 = clip.gy1;
    if (gz1 > clip.gz1) gz1 = clip.gz1;
    if (gx0 > gx1 || gy0 > gy1 || gz0 > gz1) return false;
    this.gx0 = gx0;
    this.gy0 = gy0;
    this.gz0 = gz0;
    this.gx1 = gx1;
    this.gy1 = gy1;
    this.gz1 = gz1;
    // Block bx covers global samples [bx*B, bx*B + B] inclusive, so a sample on a boundary belongs to two blocks and
    // is written to both (unless the other block lies outside the slab).
    this.bx0 = Math.max(clip.bx0, Math.floor((gx0 - 1) / B));
    this.by0 = Math.max(clip.by0, Math.floor((gy0 - 1) / B));
    this.bz0 = Math.max(clip.bz0, Math.floor((gz0 - 1) / B));
    this.bx1 = Math.min(clip.bx1, Math.floor(gx1 / B));
    this.by1 = Math.min(clip.by1, Math.floor(gy1 / B));
    this.bz1 = Math.min(clip.bz1, Math.floor(gz1 / B));
    this.vx = (ax - g.ox) / h;
    this.vy = (ay - g.oy) / h;
    this.vz = (az - g.oz) / h;
    const abx = (bx - ax) / h;
    const aby = (by - ay) / h;
    const abz = (bz - az) / h;
    this.abx = abx;
    this.aby = aby;
    this.abz = abz;
    const len2 = abx * abx + aby * aby + abz * abz;
    this.invLen2 = len2 * h * h > 1e-18 ? 1 / len2 : 0;
    const cull = (B / 2) * Math.sqrt(3) + CULL_MARGIN + w / h;
    this.cull2 = cull * cull;
    return true;
  }

  /** Whether the band can reach block (ib, jb, kb): whether its centre is within the band and the block's half diagonal of the segment. */
  reaches(ib: number, jb: number, kb: number): boolean {
    const dx = ib * B + B / 2 - this.vx,
      dy = jb * B + B / 2 - this.vy,
      dz = kb * B + B / 2 - this.vz;
    let t = (dx * this.abx + dy * this.aby + dz * this.abz) * this.invLen2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const cx = dx - this.abx * t,
      cy = dy - this.aby * t,
      cz = dz - this.abz * t;
    return !(cx * cx + cy * cy + cz * cz > this.cull2);
  }
}

const band = new SegmentBand();

/**
 * Write the normalised signed distance u = d / s of one rounded-cone segment
 * into the per-section scratch buffers of every block its band reaches,
 * keeping the minimum per sample, or for the soma folding it into the smooth
 * minimum over the width `smooth` (`smoothMin`; 0 elsewhere). Samples farther
 * than 2 s from the surface (u ≥ 2, kernel 0) are rejected on the squared
 * distance before any sqrt.
 */
function splatSegment(
  g: Grid,
  clip: Clip,
  scratch: Map<number, Scratch>,
  ax: number,
  ay: number,
  az: number,
  ra: number,
  bx: number,
  by: number,
  bz: number,
  rb: number,
  beta: number,
  smooth: number
): void {
  const h = g.h;
  if (!band.set(g, clip, ax, ay, az, bx, by, bz, bandHalfWidth(Math.max(ra, rb), beta, h))) return;
  const { gx0, gy0, gz0, gx1, gy1, gz1 } = band;

  const abx = bx - ax,
    aby = by - ay,
    abz = bz - az;
  const len2 = abx * abx + aby * aby + abz * abz;
  const invLen2 = len2 > 1e-18 ? 1 / len2 : 0;
  const dr = rb - ra;

  for (let kb = band.bz0; kb <= band.bz1; kb++) {
    const lz0 = Math.max(0, gz0 - kb * B),
      lz1 = Math.min(B, gz1 - kb * B);
    for (let jb = band.by0; jb <= band.by1; jb++) {
      const ly0 = Math.max(0, gy0 - jb * B),
        ly1 = Math.min(B, gy1 - jb * B);
      for (let ib = band.bx0; ib <= band.bx1; ib++) {
        const lx0 = Math.max(0, gx0 - ib * B),
          lx1 = Math.min(B, gx1 - ib * B);
        const key = blockKey(g, ib, jb, kb);
        let sc = scratch.get(key);
        if (sc === undefined) {
          sc = scratchPool.pop() ?? new Scratch();
          scratch.set(key, sc);
        }
        // The block is taken into the field all the same (see `ZERO_ACC`); only its samples are not visited.
        if (!band.reaches(ib, jb, kb)) continue;
        const data = sc.data,
          touched = sc.touched;
        let count = sc.count;
        const gxBase = ib * B;
        for (let lz = lz0; lz <= lz1; lz++) {
          const dz = g.oz + (kb * B + lz) * h - az;
          for (let ly = ly0; ly <= ly1; ly++) {
            const dy = g.oy + (jb * B + ly) * h - ay;
            const dotYZ = dy * aby + dz * abz;
            const row = (lz * BS + ly) * BS;
            if (smooth > 0) {
              // The soma, folded in by the smooth minimum. A loop of its own: a branch in the plain one below costs
              // every section a sixth of its splatting time.
              for (let lx = lx0; lx <= lx1; lx++) {
                const dx = g.ox + (gxBase + lx) * h - ax;
                let t = (dx * abx + dotYZ) * invLen2;
                if (t < 0) t = 0;
                else if (t > 1) t = 1;
                const cx = dx - abx * t,
                  cy = dy - aby * t,
                  cz = dz - abz * t;
                const dist2 = cx * cx + cy * cy + cz * cz;
                const r = ra + dr * t;
                let s = beta * r;
                if (s < h) s = h;
                const lim = r + 2 * s;
                if (dist2 < lim * lim) {
                  const u = (Math.sqrt(dist2) - r) / s;
                  const idx = row + lx;
                  const cur = data[idx];
                  if (cur === Infinity) {
                    touched[count++] = idx;
                    data[idx] = u;
                  } else data[idx] = smoothMin(cur, u, smooth);
                }
              }
              continue;
            }
            for (let lx = lx0; lx <= lx1; lx++) {
              const dx = g.ox + (gxBase + lx) * h - ax;
              let t = (dx * abx + dotYZ) * invLen2;
              if (t < 0) t = 0;
              else if (t > 1) t = 1;
              const cx = dx - abx * t,
                cy = dy - aby * t,
                cz = dz - abz * t;
              const dist2 = cx * cx + cy * cy + cz * cz;
              const r = ra + dr * t;
              let s = beta * r;
              if (s < h) s = h;
              const lim = r + 2 * s;
              if (dist2 < lim * lim) {
                const u = (Math.sqrt(dist2) - r) / s;
                const idx = row + lx;
                const cur = data[idx];
                if (u < cur) {
                  if (cur === Infinity) touched[count++] = idx;
                  data[idx] = u;
                }
              }
            }
          }
        }
        sc.count = count;
      }
    }
  }
}

/** How a section's kernel goes into the field: added to it, by the maximum with it, or added to its family's sum apart from it. */
const FLUSH_ADD = 0,
  FLUSH_MAX = 1,
  FLUSH_APART = 2;

/** The sum of a family in one block, apart from the field, with the samples it has been written at. */
class FamilySum {
  data = new Float32Array(BS3);
  touched = new Uint16Array(BS3);
  count = 0;
}

/**
 * Put the finished section's contribution into the persistent blocks, visiting only the samples it wrote: added to the
 * field, by the maximum with it, or added to its family's sum in `sums`, whose blocks come from `sumPool`, as `mode`
 * says.
 */
function flushSection(
  blocks: Map<number, Block>,
  arena: BlockArena,
  g: Grid,
  scratch: Map<number, Scratch>,
  type: number,
  mode: number,
  sums: Map<number, FamilySum>
): void {
  for (const [key, sc] of scratch) {
    let blk = blocks.get(key);
    if (blk === undefined) {
      const bx = key % g.nbx;
      const rest = (key - bx) / g.nbx;
      const by = rest % g.nby;
      const bz = (rest - by) / g.nby;
      blk = {
        bx,
        by,
        bz,
        acc: ZERO_ACC,
        meta: ZERO_META,
        packed: null,
        bi: blocks.size,
        cv: -1,
        multi: null,
      };
      blocks.set(key, blk);
    }
    if (sc.count > 0 && blk.acc === ZERO_ACC) {
      arena.claim();
      blk.acc = arena.acc;
      blk.meta = arena.meta;
    }
    const acc = blk.acc,
      meta = blk.meta!;
    const data = sc.data,
      touched = sc.touched;
    let sum: FamilySum | undefined;
    if (mode === FLUSH_APART) {
      sum = sums.get(key);
      if (sum === undefined) {
        sum = sumPool.pop() ?? new FamilySum();
        sums.set(key, sum);
      }
    }
    for (let n = 0, cnt = sc.count; n < cnt; n++) {
      const i = touched[n];
      const u = data[i];
      if (u < 2) {
        const k = kernel(u);
        if (mode === FLUSH_ADD) acc[i] += k;
        else if (mode === FLUSH_MAX) {
          // What is stored is a float32, and the maximum has to be taken of what is stored.
          const f = Math.fround(k);
          if (f > acc[i]) acc[i] = f;
        } else {
          // The kernel is positive wherever it is written, so a sample's sum is zero until then.
          if (sum!.data[i] === 0) sum!.touched[sum!.count++] = i;
          sum!.data[i] += k;
        }
        // u ∈ [-2, 2) → closeness 255..3; anything beats the initial 0.
        let q = ((u + 2) * CLOSENESS_STEPS) | 0;
        if (q < 0) q = 0;
        const closeness = 255 - q;
        if (closeness > meta[i]) {
          meta[i] = closeness;
          meta[BS3 + i] = type;
        }
      }
      data[i] = Infinity;
    }
    sc.count = 0;
    scratchPool.push(sc);
  }
  scratch.clear();
}

/** Put a family's sum into the field where it is the larger, and hand its blocks back. */
function mergeFamily(blocks: Map<number, Block>, sums: Map<number, FamilySum>): void {
  for (const [key, sum] of sums) {
    const acc = blocks.get(key)!.acc;
    const data = sum.data,
      touched = sum.touched;
    for (let n = 0, cnt = sum.count; n < cnt; n++) {
      const i = touched[n];
      if (data[i] > acc[i]) acc[i] = data[i];
      data[i] = 0;
    }
    sum.count = 0;
    sumPool.push(sum);
  }
  sums.clear();
}

// ---------------------------------------------------------------------------
// Surface nets
//
// One vertex per connected group of inside corners in each cell. Naive
// surface nets use a single vertex per cell, which pinches two separate sheets
// together (an edge shared by four quads) wherever a grid face has inside
// corners on both diagonals. Splitting by corner connectivity keeps those
// sheets apart.

/** Sample offset of cube corner c = ox | oy<<1 | oz<<2. */
export const CORNER_OFF = [0, 1, BS, BS + 1, BS2, BS2 + 1, BS2 + BS, BS2 + BS + 1];
export const EDGE_C0 = [0, 2, 4, 6, 0, 1, 4, 5, 0, 1, 2, 3];
export const EDGE_C1 = [1, 3, 5, 7, 2, 3, 6, 7, 4, 5, 6, 7];

/** Per corner mask: component of each inside corner, named by its lowest corner; -1 outside. */
export const COMP = new Int8Array(256 * 8);
/** Per corner mask: number of components and their names in increasing order. */
export const NCOMP = new Uint8Array(256);
export const ROOTS = new Int8Array(256 * 8);
/** Per corner mask: the crossing edges and the component of each one's inside end. */
export const XCOUNT = new Uint8Array(256);
export const XEDGE = new Uint8Array(256 * 12);
export const XROOT = new Uint8Array(256 * 12);

(function buildCellTables(): void {
  const root = new Int8Array(8);
  const find = (corner: number): number => {
    let c = corner;
    while (root[c] !== c) c = root[c];
    return c;
  };
  for (let mask = 0; mask < 256; mask++) {
    for (let c = 0; c < 8; c++) root[c] = c;
    for (let e = 0; e < 12; e++) {
      const c0 = EDGE_C0[e],
        c1 = EDGE_C1[e];
      if (((mask >> c0) & 1) === 1 && ((mask >> c1) & 1) === 1) {
        const r0 = find(c0),
          r1 = find(c1);
        if (r0 < r1) root[r1] = r0;
        else if (r1 < r0) root[r0] = r1;
      }
    }
    let n = 0;
    for (let c = 0; c < 8; c++) {
      if (((mask >> c) & 1) === 0) {
        COMP[mask * 8 + c] = -1;
        continue;
      }
      const r = find(c);
      COMP[mask * 8 + c] = r;
      if (r === c) ROOTS[mask * 8 + n++] = c;
    }
    NCOMP[mask] = n;
    let x = 0;
    for (let e = 0; e < 12; e++) {
      const c0 = EDGE_C0[e],
        c1 = EDGE_C1[e];
      const in0 = (mask >> c0) & 1,
        in1 = (mask >> c1) & 1;
      if (in0 === in1) continue;
      XEDGE[mask * 12 + x] = e;
      XROOT[mask * 12 + x] = COMP[mask * 8 + (in0 === 1 ? c0 : c1)];
      x++;
    }
    XCOUNT[mask] = x;
  }
})();

const compPos = new Float64Array(8 * 3);
const compCount = new Int32Array(8);
const compBestAcc = new Float64Array(8);
/** Sample index of each component's most interior corner. */
const compBest = new Int32Array(8);
const compVertex = new Int32Array(8);

/**
 * Identify a vertex on a seam plane by its cell's two in-plane coordinates and
 * the lowest corner of its component.
 */
export function seamKey(
  g: Grid,
  axis: number,
  cx: number,
  cy: number,
  cz: number,
  corner: number
): number {
  const n = Math.max(g.nx, g.ny, g.nz);
  const u = axis === 0 ? cy : cx;
  const v = axis === 2 ? cy : cz;
  return (v * n + u) * 8 + corner;
}

/** SWC type of sample `i` in the GPU field's packed rows (see Block.packed). */
function packedType(packed: Uint32Array, i: number): number {
  const row = (i / BS) | 0;
  const x = i - row * BS;
  return (packed[3 * row + (x >> 2)] >>> ((x & 3) * 8)) & 0xff;
}

/**
 * Fill the block's 81 row masks (bit i set where sample i of the row is
 * inside). Returns whether the surface crosses the block at all.
 */
function classifyBlock(blk: Block, rowMasks: Uint16Array): boolean {
  const acc = blk.acc;
  if (acc === ZERO_ACC) return false;
  const rb = blk.bi * ROWS;
  let any = 0,
    all = ROW_FULL;
  if (blk.packed !== null) {
    // The GPU field already made the masks.
    const packed = blk.packed;
    for (let r = 0; r < ROWS; r++) {
      const m = (packed[3 * r + 2] >>> 8) & ROW_FULL;
      rowMasks[rb + r] = m;
      any |= m;
      all &= m;
    }
    return any !== 0 && all !== ROW_FULL;
  }
  for (let r = 0; r < ROWS; r++) {
    const o = r * BS;
    let m = 0;
    for (let i = 0; i < BS; i++) if (acc[o + i] > 1) m |= 1 << i;
    rowMasks[rb + r] = m;
    any |= m;
    all &= m;
  }
  return any !== 0 && all !== ROW_FULL;
}

/**
 * Emit the vertices of a block's cells from cell layer `firstLayer` along
 * `axis` upwards. Vertices in the block's top cell layer are recorded in
 * `seam` when given.
 */
function extractVertices(
  blk: Block,
  rowMasks: Uint16Array,
  cv: Int32Array,
  g: Grid,
  center: [number, number, number],
  axis: number,
  firstLayer: number,
  seam: Seam | null,
  positions: GrowableFloat32,
  vertexTypes: GrowableUint8
): void {
  const acc = blk.acc;
  const typ = blk.meta !== null ? blk.meta.subarray(BS3) : null;
  const packed = blk.packed;
  const rb = blk.bi * ROWS;
  const cb = blk.cv;
  const h = g.h;
  const gx0 = blk.bx * B,
    gy0 = blk.by * B,
    gz0 = blk.bz * B;
  const i0 = axis === 0 ? firstLayer : 0,
    j0 = axis === 1 ? firstLayer : 0,
    k0 = axis === 2 ? firstLayer : 0;
  const rowFull = ROW_FULL >> i0;

  for (let k = k0; k < B; k++) {
    for (let j = j0; j < B; j++) {
      const r00 = rowMasks[rb + k * BS + j],
        r10 = rowMasks[rb + k * BS + j + 1];
      const r01 = rowMasks[rb + (k + 1) * BS + j],
        r11 = rowMasks[rb + (k + 1) * BS + j + 1];
      // A row of cells with every corner inside or every corner outside has no vertex.
      if ((r00 & r10 & r01 & r11) >> i0 === rowFull || (r00 | r10 | r01 | r11) >> i0 === 0)
        continue;
      for (let i = i0; i < B; i++) {
        const mask =
          ((r00 >> i) & 3) |
          (((r10 >> i) & 3) << 2) |
          (((r01 >> i) & 3) << 4) |
          (((r11 >> i) & 3) << 6);
        if (mask === 0 || mask === 255) continue;

        const s = (k * BS + j) * BS + i;
        const m8 = mask * 8,
          m12 = mask * 12;
        const nc = NCOMP[mask];
        for (let n = 0; n < nc; n++) {
          const c = ROOTS[m8 + n];
          compPos[3 * c] = compPos[3 * c + 1] = compPos[3 * c + 2] = 0;
          compCount[c] = 0;
          compBestAcc[c] = -Infinity;
        }
        // Accumulate crossing points per component of the inside endpoint.
        for (let n = 0, xn = XCOUNT[mask]; n < xn; n++) {
          const e = XEDGE[m12 + n],
            root = XROOT[m12 + n];
          const c0 = EDGE_C0[e],
            c1 = EDGE_C1[e];
          const v0 = 1 - acc[s + CORNER_OFF[c0]],
            v1 = 1 - acc[s + CORNER_OFF[c1]];
          let t = v0 / (v0 - v1);
          if (t < CROSSING_MARGIN) t = CROSSING_MARGIN;
          else if (t > 1 - CROSSING_MARGIN) t = 1 - CROSSING_MARGIN;
          const x0 = c0 & 1,
            y0 = (c0 >> 1) & 1,
            z0 = (c0 >> 2) & 1;
          compPos[3 * root] += x0 + t * ((c1 & 1) - x0);
          compPos[3 * root + 1] += y0 + t * (((c1 >> 1) & 1) - y0);
          compPos[3 * root + 2] += z0 + t * (((c1 >> 2) & 1) - z0);
          compCount[root]++;
        }
        // Colour each component by its most interior corner.
        for (let c = 0; c < 8; c++) {
          if (((mask >> c) & 1) === 0) continue;
          const root = COMP[m8 + c];
          const a = acc[s + CORNER_OFF[c]];
          if (a > compBestAcc[root]) {
            compBestAcc[root] = a;
            compBest[root] = s + CORNER_OFF[c];
          }
        }

        const cellSeam =
          seam !== null && (axis === 0 ? i : axis === 1 ? j : k) === B - 1 ? seam : null;
        let firstVertex = -1;
        for (let n = 0; n < nc; n++) {
          const c = ROOTS[m8 + n];
          const inv = 1 / compCount[c];
          const idx = positions.length / 3;
          positions.push3(
            g.ox + (gx0 + i + compPos[3 * c] * inv) * h - center[0],
            g.oy + (gy0 + j + compPos[3 * c + 1] * inv) * h - center[1],
            g.oz + (gz0 + k + compPos[3 * c + 2] * inv) * h - center[2]
          );
          const best = compBest[c];
          vertexTypes.push(typ !== null ? typ[best] : packedType(packed!, best));
          if (cellSeam !== null) {
            cellSeam.keys.push(seamKey(g, axis, gx0 + i, gy0 + j, gz0 + k, c));
            cellSeam.vertices.push(idx);
          }
          compVertex[c] = idx;
          if (n === 0) firstVertex = idx;
        }

        const cell = cb + (k * B + j) * B + i;
        if (nc === 1) {
          cv[cell] = firstVertex + 1;
        } else {
          // Rare: store a per-corner lookup for this cell.
          const perCorner = new Int32Array(8);
          for (let c = 0; c < 8; c++) {
            perCorner[c] = ((mask >> c) & 1) === 1 ? compVertex[COMP[m8 + c]] : -1;
          }
          if (blk.multi === null) blk.multi = [];
          cv[cell] = -1 - blk.multi.length;
          blk.multi.push(perCorner);
        }
      }
    }
  }
}

const NO_CELLS = new Int32Array(0);
/** Cell-vertex arena of the slab being extracted, and the neighbour blocks of the block whose faces are being emitted. */
let curCv = NO_CELLS;
const nbCv = new Int32Array(8);
const nbMulti: (Int32Array[] | null)[] = new Array(8).fill(null);

/** Vertex of the component that owns `corner` in the cell at (i, j, k); negative indices wrap into the neighbour blocks. */
function vertexAt(i: number, j: number, k: number, corner: number): number {
  const m = (i < 0 ? 1 : 0) | (j < 0 ? 2 : 0) | (k < 0 ? 4 : 0);
  const base = nbCv[m];
  if (base < 0) return -1;
  const ci = i < 0 ? B - 1 : i;
  const cj = j < 0 ? B - 1 : j;
  const ck = k < 0 ? B - 1 : k;
  const v = curCv[base + (ck * B + cj) * B + ci];
  if (v > 0) return v - 1;
  if (v === 0) return -1;
  return nbMulti[m]![-v - 1][corner];
}

function extractFaces(
  blk: Block,
  blocks: Map<number, Block>,
  rowMasks: Uint16Array,
  g: Grid,
  positions: GrowableFloat32,
  indices: GrowableUint32
): number {
  // Neighbour blocks on the negative side, indexed by (i<0) | (j<0)<<1 | (k<0)<<2.
  nbCv[0] = blk.cv;
  nbMulti[0] = blk.multi;
  for (let m = 1; m < 8; m++) {
    const bx = blk.bx - (m & 1),
      by = blk.by - ((m >> 1) & 1),
      bz = blk.bz - ((m >> 2) & 1);
    const b = bx < 0 || by < 0 || bz < 0 ? undefined : blocks.get(blockKey(g, bx, by, bz));
    nbCv[m] = b === undefined ? -1 : b.cv;
    nbMulti[m] = b === undefined ? null : b.multi;
  }

  const rb = blk.bi * ROWS;
  let defects = 0;
  for (let k = 0; k < B; k++) {
    for (let j = 0; j < B; j++) {
      const r = rowMasks[rb + k * BS + j];
      // Bit i: the edge from sample i to its neighbour along x, y or z changes sides.
      let xc = (r ^ (r >> 1)) & 0xff;
      let yc = (r ^ rowMasks[rb + k * BS + j + 1]) & 0xff;
      let zc = (r ^ rowMasks[rb + (k + 1) * BS + j]) & 0xff;
      while (xc !== 0) {
        const low = xc & -xc;
        xc ^= low;
        const i = 31 - Math.clz32(low);
        const in0 = ((r >> i) & 1) === 1;
        // Edge along x (corner bit 1): surrounding cells vary in y (bit 2) and z (bit 4).
        const c = in0 ? 0 : 1;
        defects += emitQuad(
          vertexAt(i, j, k, c),
          vertexAt(i, j - 1, k, c | 2),
          vertexAt(i, j - 1, k - 1, c | 6),
          vertexAt(i, j, k - 1, c | 4),
          in0,
          positions,
          indices
        );
      }
      while (yc !== 0) {
        const low = yc & -yc;
        yc ^= low;
        const i = 31 - Math.clz32(low);
        const in0 = ((r >> i) & 1) === 1;
        // Edge along y (bit 2): cells vary in z (bit 4) and x (bit 1).
        const c = in0 ? 0 : 2;
        defects += emitQuad(
          vertexAt(i, j, k, c),
          vertexAt(i, j, k - 1, c | 4),
          vertexAt(i - 1, j, k - 1, c | 5),
          vertexAt(i - 1, j, k, c | 1),
          in0,
          positions,
          indices
        );
      }
      while (zc !== 0) {
        const low = zc & -zc;
        zc ^= low;
        const i = 31 - Math.clz32(low);
        const in0 = ((r >> i) & 1) === 1;
        // Edge along z (bit 4): cells vary in x (bit 1) and y (bit 2).
        const c = in0 ? 0 : 4;
        defects += emitQuad(
          vertexAt(i, j, k, c),
          vertexAt(i - 1, j, k, c | 1),
          vertexAt(i - 1, j - 1, k, c | 3),
          vertexAt(i, j - 1, k, c | 2),
          in0,
          positions,
          indices
        );
      }
    }
  }
  return defects;
}

/**
 * Emit a quad (as two triangles, split along the shorter diagonal). The four
 * cells are listed so that the loop q0→q1→q2→q3 winds around the grid edge in
 * the positive axis direction; when the edge starts inside the surface the
 * outward normal points that way too, otherwise the loop is reversed.
 */
function emitQuad(
  q0: number,
  c1: number,
  q2: number,
  c3: number,
  startInside: boolean,
  positions: GrowableFloat32,
  indices: GrowableUint32
): number {
  if (q0 < 0 || c1 < 0 || q2 < 0 || c3 < 0) return 1;
  const q1 = startInside ? c1 : c3;
  const q3 = startInside ? c3 : c1;
  const P = positions.data;
  const a0 = 3 * q0,
    a1 = 3 * q1,
    a2 = 3 * q2,
    a3 = 3 * q3;
  const d02 = sq(P[a0] - P[a2]) + sq(P[a0 + 1] - P[a2 + 1]) + sq(P[a0 + 2] - P[a2 + 2]);
  const d13 = sq(P[a1] - P[a3]) + sq(P[a1 + 1] - P[a3 + 1]) + sq(P[a1 + 2] - P[a3 + 2]);
  if (d02 <= d13) {
    indices.push(q0, q1, q2);
    indices.push(q0, q2, q3);
  } else {
    indices.push(q1, q2, q3);
    indices.push(q1, q3, q0);
  }
  return 0;
}

const sq = (x: number): number => x * x;
