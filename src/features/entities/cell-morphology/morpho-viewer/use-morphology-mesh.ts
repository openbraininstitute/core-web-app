'use client';

import { useEffect, useRef, useState } from 'react';

import { logError, logWarn } from '@/utils/logger';

import { type BuildSettings, buildParams } from './constants';
import {
  errorMessage,
  GpuError,
  type MorphologySummary,
  type SkeletonData,
} from './engine/protocol';
import { SWC_SOMA } from './engine/swc';

import type { HybridParams } from './engine/hybrid';
import type { MeshResult } from './engine/mesher';
import type { BuildOptions, MeshPool } from './engine/pool';
import type { Viewer } from './engine/viewer';

export interface Engine {
  viewer: Viewer;
  pool: MeshPool;
}

/** What the viewer has been given to show. */
export interface Layers {
  original: SkeletonData | null;
  processed: SkeletonData | null;
  mesh: MeshResult | null;
}

export interface MorphologyMeshState {
  summary: MorphologySummary | null;
  /** Where the mesh was built, and why there: "GPU (apple metal-3)", "CPU (…)". */
  backend: string | null;
  /** How far the running build is, 0 to 1; null when none runs. */
  progress: number | null;
  /** The file could not be read. */
  loadError: string | null;
  /** Neither the GPU nor the CPU could build the mesh: the skeleton stays. */
  buildError: string | null;
  /** Whether the session has a GPU to build on, once the first build has asked. */
  gpu: GpuStatus | null;
  layers: Layers;
}

const INITIAL: MorphologyMeshState = {
  summary: null,
  backend: null,
  progress: null,
  loadError: null,
  buildError: null,
  gpu: null,
  layers: { original: null, processed: null, mesh: null },
};

export type GpuStatus = { adapter: string } | { adapter: null; reason: string };

/** For the session: the first viewer to build asks the workers, and a GPU that fails once stays off. */
let gpuSession: GpuStatus | null = null;

async function gpuStatus(pool: MeshPool): Promise<GpuStatus> {
  if (gpuSession) return gpuSession;
  try {
    const adapter = await pool.probeGpu();
    gpuSession = adapter
      ? { adapter }
      : { adapter: null, reason: 'WebGPU is not available in this browser' };
  } catch (e) {
    // The pool was dropped, not the GPU: the next viewer asks again.
    if (pool.isDisposed) throw e;
    // There is WebGPU, but the device cannot build the shaders.
    gpuSession = turnGpuOff(e);
  }
  return gpuSession;
}

function turnGpuOff(reason: unknown): GpuStatus {
  // The first line: a compiler's message can go on with an excerpt of the source.
  const why = errorMessage(reason).split('\n')[0];
  logWarn(`GPU mesher turned off: ${why}`);
  gpuSession = { adapter: null, reason: `GPU turned off: ${why}` };
  return gpuSession;
}

/**
 * On the GPU where the session has one and it is wanted, and on the CPU where it fails. Null if a later build or load
 * superseded it.
 */
async function buildMesh(
  pool: MeshPool,
  params: HybridParams,
  gpuFound: GpuStatus,
  useGpu: boolean,
  options: BuildOptions
): Promise<{ result: MeshResult; backend: string } | null> {
  let gpu = gpuFound;
  if (useGpu && gpu.adapter !== null) {
    try {
      const result = await pool.build(params, { ...options, backend: 'gpu' });
      if (!result) return null;
      if (result.stats.defects === 0) return { result, backend: `GPU (${gpu.adapter})` };
      // The GPU did not give shared samples the same value everywhere: this device cannot be used.
      gpu = turnGpuOff(`${result.stats.defects} open quads`);
    } catch (e) {
      if (pool.isDisposed) return null;
      // Only the GPU's own failures turn it off for the session; any other error gets one try on the CPU.
      if (e instanceof GpuError) gpu = turnGpuOff(e);
      else logWarn(`GPU build failed, building on the CPU: ${errorMessage(e)}`);
    }
  }
  const result = await pool.build(params, { ...options, backend: 'cpu' });
  if (!result) return null;
  if (gpu.adapter === null) return { result, backend: `CPU (${gpu.reason})` };
  return { result, backend: useGpu ? 'CPU' : 'CPU (GPU switched off)' };
}

/** The neurite types to mesh: those in the file but the hidden ones. The soma always goes in. */
function meshTypes(summary: MorphologySummary, hidden: number[]): number[] {
  return summary.types.map((t) => t.type).filter((t) => t !== SWC_SOMA && !hidden.includes(t));
}

/** How long the eyes wait for another toggle before the mesh is rebuilt, ms. */
const REBUILD_DELAY = 350;

/**
 * Reads the SWC into the workers and shows its skeleton at once, then builds the mesh of the types that are not
 * hidden and hands it to the viewer. Hiding or showing a type, or changing the build settings, rebuilds the mesh; the
 * old one stays until the new one is in.
 */
export function useMorphologyMesh(
  engine: Engine | null,
  swc: string,
  hiddenTypes: number[],
  settings: BuildSettings
): MorphologyMeshState {
  const [state, setState] = useState(INITIAL);
  const { summary } = state;
  // The types to mesh and the settings, as keys that stay the same while they do: an update with the same content
  // does not cancel the running build.
  const include = summary ? meshTypes(summary, hiddenTypes).join(',') : null;
  const settingsKey = JSON.stringify(settings);
  /** The types and the settings of the mesh on show. */
  const shown = useRef<string | null>(null);
  /** The morphology whose first build has started. */
  const started = useRef<MorphologySummary | null>(null);
  /** The morphology and the settings of the processed skeleton on show, which are the mesh's. */
  const planned = useRef<{ summary: MorphologySummary; settingsKey: string } | null>(null);

  useEffect(() => {
    if (!engine) return;
    const { viewer, pool } = engine;
    let live = true;
    setState(INITIAL);
    shown.current = null;
    viewer.clearMesh();
    pool.load(swc).then(
      ({ summary, skeleton }) => {
        if (!live) return;
        viewer.setSkeleton('original', skeleton, summary.size);
        // Until the build's plan brings the new one.
        viewer.setSkeleton('processed', null);
        setState({
          ...INITIAL,
          summary,
          progress: 0,
          layers: { ...INITIAL.layers, original: skeleton },
        });
      },
      (e) => {
        if (!live) return;
        logError('Could not read the morphology', e);
        setState({ ...INITIAL, loadError: errorMessage(e) });
      }
    );
    return () => {
      live = false;
    };
  }, [engine, swc]);

  useEffect(() => {
    if (!engine || !summary || include === null) return;
    const key = `${include}|${settingsKey}`;
    if (key === shown.current) {
      setState((s) => ({ ...s, progress: null }));
      return;
    }
    const { viewer, pool } = engine;
    const types = include === '' ? [] : include.split(',').map(Number);
    const b: BuildSettings = JSON.parse(settingsKey);
    let live = true;
    const patch = (p: Partial<MorphologyMeshState>) => {
      if (!live) return;
      const keys = Object.keys(p) as (keyof MorphologyMeshState)[];
      setState((s) => (keys.every((k) => s[k] === p[k]) ? s : { ...s, ...p }));
    };
    const show = (layers: Partial<Layers>) => {
      if (live) setState((s) => ({ ...s, layers: { ...s.layers, ...layers } }));
    };
    const showMesh = (mesh: MeshResult | null) => {
      if (mesh) viewer.setMesh(mesh);
      else viewer.clearMesh();
      show({ mesh });
    };
    patch({ progress: 0, buildError: null });

    const build = async () => {
      started.current = summary;
      if (types.length === 0 && summary.soma.model === 'none') {
        // Every type hidden, and no soma to mesh.
        showMesh(null);
        shown.current = key;
        patch({ progress: null });
        return;
      }
      // A tick per worker task, hundreds a build: the pill shows whole per cents.
      let percent = 0;
      // Set in a callback: a plain `null` would narrow it to null below.
      let processed = null as SkeletonData | null;
      try {
        const gpu = await gpuStatus(pool);
        // The first probe can outlast the pause: a build started now would cancel the newer one.
        if (!live) return;
        patch({ gpu });
        const built = await buildMesh(pool, buildParams(b, types), gpu, b.gpu, {
          mesher: b.tubes ? 'hybrid' : 'voxel',
          onProgress: (done, total) => {
            const next = total > 0 ? Math.round((100 * done) / total) : 0;
            if (next === percent) return;
            percent = next;
            patch({ progress: next / 100 });
          },
          onPlanned: (skeleton) => {
            processed = skeleton;
          },
        });
        if (!live || !built) return;
        showMesh(built.result);
        // With its mesh, not ahead of it: a build superseded after its plan would leave its skeleton by another's
        // mesh. The same for every build with these settings: the types left out are only left out of the mesh.
        const now = planned.current;
        if (processed && !(now?.summary === summary && now.settingsKey === settingsKey)) {
          planned.current = { summary, settingsKey };
          viewer.setSkeleton('processed', processed);
          show({ processed });
        }
        shown.current = key;
        patch({ backend: built.backend, progress: null });
      } catch (e) {
        if (!live) return;
        logError('Could not build the morphology mesh', e);
        // The mesh on show has the hidden types in it; the skeleton, without them, stands in.
        showMesh(null);
        shown.current = null;
        patch({ buildError: errorMessage(e), progress: null });
      } finally {
        // A GPU that failed this build is off for the session.
        patch({ gpu: gpuSession });
      }
    };
    // The first build starts at once; after that, the eyes and the sliders wait for the next change.
    const timer = window.setTimeout(build, started.current === summary ? REBUILD_DELAY : 0);
    return () => {
      live = false;
      window.clearTimeout(timer);
      pool.cancel();
    };
  }, [engine, summary, include, settingsKey]);

  return state;
}
