'use client';

import * as Comlink from 'comlink';
import { useEffect, useState } from 'react';

import { errorMessage } from '@/utils/error';
import { logError } from '@/utils/logger';

import { meshCentre, shareInside } from './engine/mesh-centre';

import type { SpinyWorkerApi } from './engine/spiny.worker';
import type { SpinyComparisonViewer } from './engine/spiny-viewer';
import type { SpinyCounts, SpinyProgress, Vec3 } from './engine/types';

/** Where a file is downloaded from: its URL and the headers it needs. */
export type Request = { url: string; headers: Record<string, string> };

export interface SpinySources {
  /** A key for the pair: another pair loads again. */
  key: string;
  /** The spiny H5. */
  spiny: () => Promise<Request>;
  /** The EM mesh's GLB, for where the EM viewer puts its origin. */
  mesh: () => Promise<Request>;
}

export interface SpinyLoad {
  progress: SpinyProgress | null;
  counts: SpinyCounts | null;
  centre: Vec3 | null;
  /** The skeleton does not lie inside the mesh's box: they are likely not of the same cell, or segmentation. */
  mismatch: boolean;
  error: string | null;
}

/** How much of the skeleton's box must lie inside the mesh's for the two to be taken as one cell. */
const INSIDE_ENOUGH = 0.9;

const INITIAL: SpinyLoad = {
  progress: null,
  counts: null,
  centre: null,
  mismatch: false,
  error: null,
};

/**
 * Loads the spiny H5 in a worker, all of it, and puts it in the viewer, moved onto the mesh's origin. Another pair, or
 * the viewer going, stops the load and the worker.
 */
export function useSpinyMorphology(
  viewer: SpinyComparisonViewer | null,
  sources: SpinySources | null
): SpinyLoad {
  const [state, setState] = useState(INITIAL);
  const key = sources?.key ?? null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: the sources are loaded again only for another key
  useEffect(() => {
    if (!viewer || !sources) return;
    setState(INITIAL);
    const controller = new AbortController();
    const { signal } = controller;
    const patch = (p: Partial<SpinyLoad>) => {
      if (!signal.aborted) setState((s) => ({ ...s, ...p }));
    };
    const worker = new Worker(new URL('./engine/spiny.worker.ts', import.meta.url), {
      type: 'module',
    });
    const api = Comlink.wrap<SpinyWorkerApi>(worker);

    (async () => {
      const [spinyRequest, meshRequest] = await Promise.all([sources.spiny(), sources.mesh()]);
      if (signal.aborted) return;
      const [box, data] = await Promise.all([
        meshCentre(meshRequest, signal).then((box) => {
          patch({ centre: box.centre });
          return box;
        }),
        api.load(
          { ...spinyRequest, fileKey: `spiny-${sources.key.replace(/[^\w-]/g, '_')}` },
          Comlink.proxy((progress: SpinyProgress) => patch({ progress }))
        ),
      ]);
      if (signal.aborted) return;
      viewer.setSpiny(data);
      viewer.setCentre(box.centre);
      patch({ counts: data.counts, mismatch: shareInside(data.bounds, box) < INSIDE_ENOUGH });
    })().catch((e: unknown) => {
      if (signal.aborted) return;
      logError('Could not load the spiny morphology', e);
      patch({ error: errorMessage(e) });
    });

    return () => {
      controller.abort();
      api[Comlink.releaseProxy]();
      worker.terminate();
    };
  }, [viewer, key]);

  return state;
}
