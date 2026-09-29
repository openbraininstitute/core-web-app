import type { GpuMode } from './gpu-slab';
import type { BatchResult, HybridPlan } from './hybrid';
import type { MeshPlan, MeshResult, SlabJob, SlabResult } from './mesher';
import type { SomaStems } from './soma';

/**
 * Where a build's slabs are meshed: on the CPU, with the field on the GPU, or with the field and the surface
 * extraction on the GPU. The backends differ in the last bits of the field, so a build uses one for all its slabs.
 */
export type Backend = 'cpu' | GpuMode;

/**
 * The GPU failed, not the mesher: the device cannot build the shaders, raised an error or was lost, or a worker has
 * no WebGPU.
 */
export class GpuError extends Error {
  // Comlink rethrows a worker's error as a plain Error that keeps its name.
  name = 'GpuError';
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Slabs (and hybrid batches) planned per worker. Extra slabs even out uneven work and lower the peak field memory. */
export const SLABS_PER_WORKER = 4;

/**
 * How the surface is made: all of it from the voxel field, or tubes swept where a section runs alone and the field
 * only for the patches where sections blend (hybrid.ts).
 */
export type Mesher = 'voxel' | 'hybrid';

/**
 * Slab size limit for the "gpu" backend, in band voxels. The GPU extraction needs a slab's blocks in one batch
 * (55 233 blocks, see `maxBatch` in gpu-slab.ts); a block comes to about 512 band voxels and the heaviest slab to
 * about 1.4 × the mean, so this keeps slabs near 30 000 blocks. A slab that still comes out too large is extracted
 * on the CPU.
 */
export const GPU_MAX_BAND_VOXELS_PER_SLAB = 15e6;

/**
 * Band voxels above which a patch gets slabs of its own when the slabs go to the GPU. Small patches are the many,
 * and splatting them on a worker costs more than the round trip to a device that is idle 97% of the time, so with a
 * GPU backend every patch that is worth a dispatch takes that road; below this it is not.
 */
export const GPU_BIG_PATCH_BAND_VOXELS = 1e4;

export interface TypeSummary {
  type: number;
  sections: number;
  nodes: number;
  cableLength: number;
  minRadius: number;
  medianRadius: number;
}

export interface MorphologySummary {
  nodeCount: number;
  sectionCount: number;
  types: TypeSummary[];
  soma: { model: string; radius: number; pointCount: number };
  /** The soma sized from its stems (soma.ts): what the soma is built from, shown next to the fitted sphere. */
  somaStems: SomaStems;
  size: [number, number, number];
  center: [number, number, number];
}

export interface SkeletonData {
  positions: Float32Array;
  /** The radius at either end of each segment, µm: only the skeleton that stands in for the mesh has them. */
  radii?: Float32Array;
  types: Uint8Array;
  count: number;
}

/** What to measure the path distances of (distances.ts): a mesh's vertices, and the segments of the skeletons. */
export interface DistanceRequest {
  mesh?: { positions: Float32Array; types: Uint8Array };
  original?: SkeletonData;
  processed?: SkeletonData;
}

/** The path distances of what was asked, and the farthest node's. */
export interface DistanceReply {
  max: number;
  mesh?: Float32Array;
  original?: Float32Array;
  processed?: Float32Array;
}

/** The buffers of typed arrays, to transfer (not copy) with a message. */
function buffers(...arrays: ArrayBufferView[]): ArrayBuffer[] {
  return arrays.map((a) => a.buffer as ArrayBuffer);
}

export function jobTransfer(job: SlabJob): ArrayBuffer[] {
  return buffers(
    job.segs,
    job.primStart,
    job.primType,
    job.primBeta,
    job.primRound,
    job.primFamily,
    job.primChain
  );
}

export function skeletonTransfer(s: SkeletonData): ArrayBuffer[] {
  return buffers(...[s.positions, s.types, s.radii].filter((a) => a !== undefined));
}

/** A plan: its jobs and the prepared skeleton. */
export function planTransfer(plan: MeshPlan): ArrayBuffer[] {
  return [...plan.jobs.flatMap(jobTransfer), ...skeletonTransfer(plan.skeleton)];
}

export function resultTransfer(r: SlabResult): ArrayBuffer[] {
  return buffers(
    r.positions,
    r.vertexTypes,
    r.normals,
    r.radii,
    r.indices,
    r.haloKeys,
    r.haloVertices,
    r.topKeys,
    r.topVertices
  );
}

export function meshTransfer(r: MeshResult): ArrayBuffer[] {
  return buffers(r.positions, r.indices, r.normals, r.vertexTypes, r.radii);
}

/** A hybrid plan: the slab jobs of its big patches and the skeleton. */
export function hybridPlanTransfer(plan: HybridPlan): ArrayBuffer[] {
  return [
    ...plan.bigPatches.flatMap((b) => b.jobs.flatMap(jobTransfer)),
    ...skeletonTransfer(plan.skeleton),
  ];
}

/** The result of a batch or of a big patch. */
export function batchResultTransfer(r: BatchResult): ArrayBuffer[] {
  return buffers(
    r.positions,
    r.normals,
    r.vertexTypes,
    r.radii,
    r.indices,
    r.rings,
    r.loops,
    r.loopVertices
  );
}

export function distanceTransfer(d: DistanceReply): ArrayBuffer[] {
  return buffers(...[d.mesh, d.original, d.processed].filter((a) => a !== undefined));
}
