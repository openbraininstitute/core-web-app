'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';

import { buildAssetDownloadRequest } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { EmViewerChrome } from '@/features/entities/em-cell-mesh/viewer/chrome/em-viewer-chrome';
import { surfaceColor } from '@/features/entities/em-cell-mesh/viewer/mesh-color';
import { useEmMesh } from '@/features/entities/em-cell-mesh/viewer/use-em-mesh';
import {
  type EmViewerSettings,
  useEmViewerSettings,
} from '@/features/entities/em-cell-mesh/viewer/use-em-viewer-settings';
import { useSceneSync, useWheelHint, ViewerFrame } from '@/features/viewer-3d/viewer-frame';

import { SpinyComparisonViewer } from './engine/spiny-viewer';
import { SpinyControls } from './spiny-controls';
import { type SpinySources, useSpinyMorphology } from './use-spiny-morphology';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

export interface SpinyComparisonProps {
  className?: string;
  /** The EM cell mesh skeletonized, and its GLB. */
  mesh: { id: string; name: string; asset: Pick<IAsset, 'id' | 'size'> };
  /** The morphology made from it, and its spiny H5 (labelled morphology_with_spines). */
  morphology: { id: string; asset: Pick<IAsset, 'id'> };
  ctx: WorkspaceContext | null;
}

/**
 * A skeletonization's output on the mesh it came from: the EM mesh as the EM viewer loads and draws it, its chrome and
 * all, with the spiny morphology's skeleton, soma and spines over it, a wipe to compare them, and flights to spines.
 */
function SpinyComparisonComponent({ className, mesh, morphology, ctx }: SpinyComparisonProps) {
  const refHost = useRef<HTMLDivElement | null>(null);
  const [viewer, setViewer] = useState<SpinyComparisonViewer | null>(null);
  const { settings, update, chooseLook, chooseColor } = useEmViewerSettings();
  const load = useEmMesh(
    viewer,
    { entityId: mesh.id, asset: mesh.asset, ctx },
    settings.standInTriangles
  );
  const wheelHint = useWheelHint(viewer);

  useEffect(() => {
    const host = refHost.current;
    if (!host) return;
    const created = new SpinyComparisonViewer(host);
    setViewer(created);
    return () => {
      setViewer(null);
      created.dispose();
    };
  }, []);

  useViewerSync(viewer, settings);

  useEffect(() => {
    viewer?.prepare().catch(() => {});
  }, [viewer]);

  const ctxKey = ctx ? `${ctx.virtualLabId}/${ctx.projectId}` : '';
  // biome-ignore lint/correctness/useExhaustiveDependencies: the requests change only with the ids and the workspace
  const sources = useMemo<SpinySources>(
    () => ({
      key: `${mesh.id}/${morphology.id}/${morphology.asset.id}`,
      spiny: () =>
        buildAssetDownloadRequest({
          ctx,
          entityType: EntityTypeDict.CellMorphology,
          entityId: morphology.id,
          id: morphology.asset.id,
        }),
      mesh: () =>
        buildAssetDownloadRequest({
          ctx,
          entityType: EntityTypeDict.EMCellMesh,
          entityId: mesh.id,
          id: mesh.asset.id,
        }),
    }),
    [mesh.id, mesh.asset.id, morphology.id, morphology.asset.id, ctxKey]
  );
  const spiny = useSpinyMorphology(viewer, sources);

  return (
    <ViewerFrame className={className} testId="spiny-comparison-viewer" hostRef={refHost}>
      {(root) =>
        viewer && (
          <>
            <EmViewerChrome
              viewer={viewer}
              root={root}
              settings={settings}
              update={update}
              chooseLook={chooseLook}
              chooseColor={chooseColor}
              load={load}
              name={mesh.name}
              wheelHint={wheelHint}
            />
            <SpinyControls viewer={viewer} load={spiny} />
          </>
        )
      }
    </ViewerFrame>
  );
}

/** The settings every EM view has, each as it changes. */
function useViewerSync(viewer: SpinyComparisonViewer | null, settings: EmViewerSettings) {
  useSceneSync(viewer, settings);
  useEffect(() => viewer?.setSurfaceColor(surfaceColor(settings.color)), [viewer, settings.color]);
  useEffect(() => viewer?.setAODepth(settings.aoDepth), [viewer, settings.aoDepth]);
  useEffect(() => viewer?.setForcedMesh(settings.mesh), [viewer, settings.mesh]);
  useEffect(() => viewer?.setMotion(settings.motion), [viewer, settings.motion]);
}

export const SpinyComparisonViewerCard = dynamic(() => Promise.resolve(SpinyComparisonComponent), {
  ssr: false,
});
