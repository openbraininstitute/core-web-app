'use client';

import { useEffect, useRef, useState } from 'react';

import { buildAssetDownloadRequest } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { logError } from '@/utils/logger';

import { type Budget, deviceOf } from './engine/budget';
import { type LoadReport, loadEmMesh, type Stage } from './engine/load';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';
import type { DownloadRequest } from './engine/download';
import type { EmMeshViewer } from './engine/em-mesh-viewer';
import type { Grid, PackedMesh } from './engine/types';

/** The mesh's GLB, which the viewer loads; a mesh without one has no viewer. */
export function meshAsset(assets: IAsset[] | null | undefined): IAsset | null {
  return (
    assets?.find(
      (a) =>
        a.label === AssetLabel.cell_surface_mesh && a.content_type === AssetContentType.gltf_binary
    ) ?? null
  );
}

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
  /** The stand-in is on show. */
  hasStandIn: boolean;
  /** The full mesh can be drawn, or the stand-in is the whole mesh. */
  fullReady: boolean;
  /** Why the mesh was not loaded: too large for the browser, or for this device until "Load anyway". */
  refused: Budget | null;
  /** Where loading failed; after the stand-in, the stand-in stays. */
  error: { stage: Stage; message: string } | null;
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
  hasStandIn: false,
  fullReady: false,
  refused: null,
  error: null,
  report: null,
  times: { standIn: null, full: null, ready: null },
  request: null,
  meshes: { standIn: null, full: null },
};

/** The device pixels of the screen, which the view takes fullscreen. */
function fullscreenPixels(): number {
  return window.screen.width * window.screen.height * Math.min(window.devicePixelRatio, 2) ** 2;
}

/**
 * Loads the mesh into the viewer: the stand-in as soon as there is one, then the full mesh. Another mesh, or the
 * viewer going, aborts the load; a context lost with the full mesh loads it again, keeping the stand-in.
 */
export function useEmMesh(viewer: EmMeshViewer | null, source: EmMeshSource | null) {
  const [state, setState] = useState(INITIAL);
  /** The mesh the user chose to load over the budget. */
  const [loadAnywayKey, setLoadAnywayKey] = useState<string | null>(null);
  const [rebuilds, setRebuilds] = useState(0);
  const key = source ? `${source.entityId}/${source.asset.id}` : null;
  const ignoreBudget = key !== null && loadAnywayKey === key;
  /** The mesh the viewer has, which a rebuild keeps the stand-in of. */
  const shown = useRef<string | null>(null);
  const started = useRef(0);
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => viewer?.onRebuildNeeded(() => setRebuilds((n) => n + 1)), [viewer]);
  useEffect(
    () =>
      viewer?.onFullReady(() =>
        setState((s) => ({
          ...s,
          fullReady: true,
          times: { ...s.times, ready: performance.now() - started.current },
        }))
      ),
    [viewer]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: a rebuild is asked for by its count
  useEffect(() => {
    const src = sourceRef.current;
    if (!viewer || !src || !key) return;
    const again = shown.current === key;
    shown.current = key;
    if (!again) viewer.clear();
    setState((s) =>
      again
        ? { ...s, refused: null, error: null, fullReady: false }
        : { ...INITIAL, total: src.asset.size }
    );
    const controller = new AbortController();
    const { signal } = controller;
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
      const outcome = await loadEmMesh(
        { request, device: deviceOf(navigator, fullscreenPixels()), ignoreBudget, signal },
        {
          onProgress: (received, total) => patch(() => ({ received, total })),
          onReport: (report) => patch(() => ({ report })),
          onStandIn: (standIn, report) => {
            if (signal.aborted) return;
            viewer.setStandIn(standIn);
            patch((s) => ({
              hasStandIn: true,
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
      logError('Could not load the EM cell mesh', e);
      const stage: Stage = (e as { stage?: Stage }).stage ?? 'download';
      patch(() => ({ error: { stage, message: e instanceof Error ? e.message : String(e) } }));
    });
    return () => controller.abort();
  }, [viewer, key, ignoreBudget, rebuilds]);

  const loadAnyway = () => setLoadAnywayKey(key);
  return { ...state, loadAnyway };
}

export type EmMeshLoad = ReturnType<typeof useEmMesh>;
