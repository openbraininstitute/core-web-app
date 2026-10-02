'use client';

import { useEffect, useRef, useState } from 'react';

import { buildAssetDownloadRequest } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { logError } from '@/utils/logger';

import { type Budget, deviceOf } from './engine/budget';
import { LoadError, type LoadReport, loadEmMesh, type Stage } from './engine/load';
import { readStandIn } from './engine/stand-in-cache';
import { clearLoading, markLoading, stoppedLoading } from './load-mark';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';
import type { DownloadRequest } from './engine/download';
import type { EmMeshViewer } from './engine/em-mesh-viewer';
import type { Grid, PackedMesh } from './engine/types';

export interface EmMeshSource {
  entityId: string;
  asset: Pick<IAsset, 'id' | 'size'>;
  ctx: WorkspaceContext | null;
}

/** What the Debug menu says of a mesh loaded. */
export interface MeshSummary {
  triangles: number;
  vertices: number;
  chunks: number;
  grid: Grid;
  /** The stand-in's, µm. */
  errorUm?: number;
}

function summary(mesh: PackedMesh & { errorUm?: number }): MeshSummary {
  const { triangles, vertices, grid, errorUm } = mesh;
  return { triangles, vertices, grid, errorUm, chunks: mesh.chunks.length };
}

export interface EmMeshState {
  /** Bytes of the GLB received, of all of them. */
  received: number;
  total: number;
  /** The full mesh can be drawn, or the stand-in is the whole mesh. */
  fullReady: boolean;
  /** Why the mesh was not loaded: too large for the browser, or for this device until "Load anyway". */
  refused: Budget | null;
  /** Where loading failed; after the stand-in, the stand-in stays. */
  error: { stage: Stage; message: string } | null;
  /** The step at which loading this mesh stopped the page last time, which it isn't loaded again until asked. */
  stopped: Stage | null;
  /** The GPU took the context, with the mesh; and hasn't given it back for a while. */
  context: 'drawn' | 'lost' | 'gone';
  /** After a second lost context the full mesh is not loaded again until asked. */
  fullDropped: boolean;
  report: LoadReport | null;
  /** When the stand-in showed, the full mesh arrived and it could be drawn, ms after the load started. */
  times: { standIn: number | null; full: number | null; ready: number | null };
  /** Where the GLB is downloaded from, for a link to it. */
  request: DownloadRequest | null;
  meshes: { standIn: MeshSummary | null; full: MeshSummary | null };
}

const INITIAL: EmMeshState = {
  received: 0,
  total: 0,
  fullReady: false,
  refused: null,
  error: null,
  stopped: null,
  context: 'drawn',
  fullDropped: false,
  report: null,
  times: { standIn: null, full: null, ready: null },
  request: null,
  meshes: { standIn: null, full: null },
};

/** How long the GPU may take to give the context back before the view says to reload, ms. */
const RESTORE_WAIT_MS = 5000;

/** Run `run` now if the page is on show, else once it is; or not, if the returned function is called first. */
function whenVisible(run: () => void): () => void {
  if (!document.hidden) {
    run();
    return () => {};
  }
  const onChange = () => {
    if (document.hidden) return;
    document.removeEventListener('visibilitychange', onChange);
    run();
  };
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/** The device pixels of the screen, which the view takes fullscreen. */
function fullscreenPixels(): number {
  return window.screen.width * window.screen.height * Math.min(window.devicePixelRatio, 2) ** 2;
}

/**
 * Loads the mesh into the viewer: the stand-in as soon as there is one, then the full mesh. Another mesh, or the
 * viewer going, aborts the load.
 *
 * A context lost with the full mesh loads it again, keeping the stand-in, once the page is on show; a second time for
 * the same mesh, only when asked. A load that stopped the page last time (`load-mark.ts`) is not tried again until
 * asked, the cached stand-in shown meanwhile.
 */
export function useEmMesh(viewer: EmMeshViewer | null, source: EmMeshSource) {
  const [state, setState] = useState(INITIAL);
  /** The mesh the user chose to load over the budget. */
  const [loadAnywayKey, setLoadAnywayKey] = useState<string | null>(null);
  /** Loads again of the same mesh: after a lost context, or when asked to try again. */
  const [rebuilds, setRebuilds] = useState(0);
  const key = `${source.entityId}/${source.asset.id}`;
  const ignoreBudget = loadAnywayKey === key;
  /** The mesh the viewer has, which a rebuild keeps the stand-in of. */
  const shown = useRef<string | null>(null);
  /** The mesh loaded again once already after a lost context. */
  const rebuilt = useRef<string | null>(null);
  const started = useRef(0);
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    if (!viewer) return;
    let cancel = () => {};
    const off = viewer.onRebuildNeeded(() => {
      cancel();
      if (rebuilt.current === shown.current) {
        setState((s) => ({ ...s, fullDropped: true }));
        return;
      }
      rebuilt.current = shown.current;
      cancel = whenVisible(() => setRebuilds((n) => n + 1));
    });
    return () => {
      off();
      cancel();
    };
  }, [viewer]);
  useEffect(() => {
    if (!viewer) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = viewer.onContextChange((lost) => {
      clearTimeout(timer);
      setState((s) => ({ ...s, context: lost ? 'lost' : 'drawn' }));
      if (lost)
        timer = setTimeout(() => setState((s) => ({ ...s, context: 'gone' })), RESTORE_WAIT_MS);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, [viewer]);
  useEffect(
    () =>
      viewer?.onFullReady(() => {
        clearLoading(sourceRef.current.asset.id);
        setState((s) => ({
          ...s,
          fullReady: true,
          times: { ...s.times, ready: performance.now() - started.current },
        }));
      }),
    [viewer]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: a rebuild is asked for by its count
  useEffect(() => {
    const src = sourceRef.current;
    if (!viewer) return;
    const again = shown.current === key;
    shown.current = key;
    if (!again) viewer.clear();
    setState((s) =>
      again
        ? { ...s, refused: null, error: null, stopped: null, fullDropped: false, fullReady: false }
        : { ...INITIAL, context: s.context, total: src.asset.size }
    );
    const controller = new AbortController();
    const { signal } = controller;
    const assetId = src.asset.id;
    // Only a mark this load set: one left by a load that stopped the page stays until it is tried again.
    let marked = false;
    const unmark = () => {
      if (marked) clearLoading(assetId);
    };
    window.addEventListener('pagehide', unmark);
    const t0 = performance.now();
    started.current = t0;
    const since = () => performance.now() - t0;
    const patch = (p: (s: EmMeshState) => Partial<EmMeshState>) => {
      if (!signal.aborted) setState((s) => ({ ...s, ...p(s) }));
    };

    (async () => {
      const request = {
        ...(await buildAssetDownloadRequest({
          ctx: src.ctx,
          entityType: EntityTypeDict.EMCellMesh,
          entityId: src.entityId,
          id: src.asset.id,
        })),
        size: src.asset.size,
      };
      if (signal.aborted) return;
      patch(() => ({ request }));
      const stopped = again ? null : await stoppedLoading(assetId);
      if (signal.aborted) return;
      if (stopped) {
        patch(() => ({ stopped }));
        const standIn = await readStandIn(request.url);
        if (!standIn || signal.aborted) return;
        viewer.setStandIn(standIn);
        patch(() => ({ meshes: { standIn: summary(standIn), full: null } }));
        return;
      }
      const outcome = await loadEmMesh(
        {
          request,
          device: deviceOf(navigator, fullscreenPixels()),
          ignoreBudget,
          seen: viewer.seen(),
          signal,
        },
        {
          onStage: (stage) => {
            if (stage === 'download' || signal.aborted) return;
            marked = true;
            markLoading(assetId, stage);
          },
          onProgress: (received, total) => patch(() => ({ received, total })),
          onReport: (report) => patch(() => ({ report })),
          onStandIn: (standIn, report) => {
            if (signal.aborted) return;
            viewer.setStandIn(standIn);
            patch((s) => ({
              report,
              times: { ...s.times, standIn: since() },
              meshes: { ...s.meshes, standIn: summary(standIn) },
            }));
          },
          onFull: (mesh, report) => {
            if (signal.aborted) return;
            viewer.setFull(mesh);
            patch((s) => ({
              report,
              times: { ...s.times, full: since() },
              meshes: { ...s.meshes, full: summary(mesh) },
            }));
          },
        }
      );
      if (outcome.kind === 'refused') patch(() => ({ refused: outcome.budget }));
    })().catch((e: unknown) => {
      if (signal.aborted) return;
      unmark();
      logError('Could not load the EM cell mesh', e);
      const stage = e instanceof LoadError ? e.stage : 'download';
      patch(() => ({ error: { stage, message: e instanceof Error ? e.message : String(e) } }));
    });
    return () => {
      controller.abort();
      window.removeEventListener('pagehide', unmark);
      // Stopped by the page, for another mesh or as the card goes: not by the browser.
      unmark();
    };
  }, [viewer, key, ignoreBudget, rebuilds]);

  const loadAnyway = () => setLoadAnywayKey(key);
  /** Load the mesh again: after it stopped the page last time, or after its full detail was let go of. */
  const loadAgain = () => setRebuilds((n) => n + 1);
  return { ...state, loadAnyway, loadAgain };
}

export type EmMeshLoad = ReturnType<typeof useEmMesh>;
