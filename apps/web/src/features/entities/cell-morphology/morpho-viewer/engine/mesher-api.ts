import * as Comlink from 'comlink';

import { PathDistances } from './distances';
import { GpuMesher } from './gpu-slab';
import {
  type BatchResult,
  type BigPatchInfo,
  finishPatch,
  type HybridBatch,
  type HybridParams,
  type HybridPlanInfo,
  type HybridPlanOptions,
  mergeHybrid,
  meshBatch,
  planHybrid,
} from './hybrid';
import {
  type MeshParams,
  mergeSlabs,
  meshCenter,
  meshSlab,
  type PlanInfo,
  type PlanOptions,
  planMesh,
  type SlabJob,
  type SlabResult,
  simplifierReady,
  somaSphere,
} from './mesher';
import { sectionSegments, sortedRadii } from './prepare';
import {
  type Backend,
  batchResultTransfer,
  type DistanceReply,
  type DistanceRequest,
  distanceTransfer,
  GpuError,
  hybridPlanTransfer,
  type MorphologySummary,
  meshTransfer,
  planTransfer,
  resultTransfer,
  skeletonTransfer,
} from './protocol';
import { type Morphology, parseSwc } from './swc';

function summarize(m: Morphology): MorphologySummary {
  const sections = new Map<number, number>();
  for (const s of m.sections) sections.set(s.type, (sections.get(s.type) ?? 0) + 1);
  const types = [...new Set(m.types)]
    .sort((a, b) => a - b)
    .map((type) => {
      const radii = sortedRadii(m, type);
      return {
        type,
        sections: sections.get(type) ?? 0,
        nodes: radii.length,
        cableLength: m.cableLength.get(type) ?? 0,
        minRadius: radii[0],
        medianRadius: radii[radii.length >> 1],
      };
    });
  return {
    nodeCount: m.nodeCount,
    sectionCount: m.sections.length,
    types,
    soma: { model: m.soma.model, radius: m.soma.radius, pointCount: m.soma.pointCount },
    somaStems: m.somaStems,
    size: [
      m.bbox.max[0] - m.bbox.min[0],
      m.bbox.max[1] - m.bbox.min[1],
      m.bbox.max[2] - m.bbox.min[2],
    ],
    center: meshCenter(m),
  };
}

/**
 * What a mesher worker exposes. Worker 0 of a pool holds the parsed morphology: it loads, plans and merges; every
 * worker meshes slabs and batches. One instance per worker, created by `mesher.worker.ts`, or in-process by the tests.
 */
export function createMesherApi() {
  let morph: Morphology | null = null;
  /** Measured the first time the colours ask for them. */
  let paths: PathDistances | null = null;
  /** Created on first use; resolves to null without WebGPU, and rejects where the device cannot build the shaders. */
  let gpuMesher: Promise<GpuMesher | null> | null = null;
  const gpu = (): Promise<GpuMesher | null> => (gpuMesher ??= GpuMesher.create());
  /** Free the GPU mesher's device: after a GPU error, which leaves buffers behind, or once the GPU is not to be used. */
  const dropGpu = async (): Promise<void> => {
    const pending = gpuMesher;
    gpuMesher = null;
    (await pending?.catch(() => null))?.destroy();
  };
  const loaded = (): Morphology => {
    if (!morph) throw new Error('no morphology loaded');
    return morph;
  };

  // A GPU slab waits for its readbacks, so calls are chained: each one runs after the one before it has finished, even
  // when the pool has moved on to a newer build. Only the meshing waits for the WASM simplifier, so the skeleton loads
  // and shows even if the simplifier fails.
  let queue: Promise<unknown> = Promise.resolve();
  const serial =
    <A extends unknown[], R>(fn: (...args: A) => R | Promise<R>, meshes = false) =>
    (...args: A): Promise<R> => {
      const run = queue.then(() => (meshes ? simplifierReady : undefined)).then(() => fn(...args));
      queue = run.catch(() => undefined);
      return run;
    };

  return {
    load: serial((text: string) => {
      morph = parseSwc(text);
      paths = null;
      // The traced skeleton stands in for the mesh until it comes.
      const skeleton = sectionSegments(morph.sections, meshCenter(morph), {
        radii: true,
        soma: somaSphere(morph),
      });
      return Comlink.transfer({ summary: summarize(morph), skeleton }, skeletonTransfer(skeleton));
    }),
    plan: serial((params: MeshParams, options: PlanOptions) => {
      const plan = planMesh(loaded(), params, options);
      return Comlink.transfer(plan, planTransfer(plan));
    }),
    releaseGpu: serial(dropGpu),
    /** Name of the WebGPU adapter, or null without WebGPU. */
    probeGpu: serial(async () => {
      const mesher = await gpu();
      return mesher ? mesher.adapterName || 'WebGPU' : null;
    }),
    slab: serial(async (job: SlabJob, backend: Backend) => {
      let result: SlabResult;
      if (backend !== 'cpu') {
        const mesher = await gpu();
        // No quiet fallback: a mesh must not mix slabs from the CPU and the GPU field.
        if (!mesher) throw new GpuError('WebGPU is not available in this worker');
        try {
          result = await mesher.meshSlab(job, backend);
        } catch (e) {
          if (e instanceof GpuError) await dropGpu();
          throw e;
        }
      } else {
        result = meshSlab(job);
      }
      return Comlink.transfer(result, resultTransfer(result));
    }, true),
    merge: serial((plan: PlanInfo, results: SlabResult[]) => {
      const mesh = mergeSlabs(plan, results);
      return Comlink.transfer(mesh, meshTransfer(mesh));
    }),
    hybridPlan: serial((params: HybridParams, options: HybridPlanOptions) => {
      const plan = planHybrid(loaded(), params, options);
      return Comlink.transfer(plan, hybridPlanTransfer(plan));
    }),
    hybridBatch: serial((batch: HybridBatch) => {
      const result = meshBatch(batch);
      return Comlink.transfer(result, batchResultTransfer(result));
    }, true),
    /** Stitch and clip a big patch from the results of its slabs. */
    hybridPatch: serial((patch: BigPatchInfo, results: SlabResult[]) => {
      const result = finishPatch(patch, results);
      return Comlink.transfer(result, batchResultTransfer(result));
    }),
    hybridMerge: serial((plan: HybridPlanInfo, results: BatchResult[]) => {
      const mesh = mergeHybrid(plan, results);
      return Comlink.transfer(mesh, meshTransfer(mesh));
    }),
    /** Path distances to the soma of what is asked, for the loaded morphology. */
    distances: serial(({ mesh, original, processed }: DistanceRequest) => {
      const m = loaded();
      paths ??= new PathDistances(m, meshCenter(m));
      const result: DistanceReply = {
        max: paths.max,
        mesh: mesh && paths.atPoints(mesh.positions, mesh.types),
        original: original && paths.ofSkeleton(original),
        processed: processed && paths.ofSkeleton(processed),
      };
      return Comlink.transfer(result, distanceTransfer(result));
    }),
  };
}

export type MesherApi = ReturnType<typeof createMesherApi>;
