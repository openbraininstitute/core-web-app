'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useSceneSync, useWheelHint, ViewerFrame } from '@/features/viewer-3d/viewer-frame';

import { EmViewerChrome } from './chrome/em-viewer-chrome';
import { EmMeshViewer } from './engine/em-mesh-viewer';
import { surfaceColor } from './mesh-color';
import { useEmMesh } from './use-em-mesh';
import { type EmViewerSettings, useEmViewerSettings } from './use-em-viewer-settings';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

interface EmCellMeshViewerProps {
  className?: string;
  entity: { id: string; name: string };
  /** The mesh's GLB. */
  asset: Pick<IAsset, 'id' | 'size'>;
}

function EmCellMeshViewerComponent({ className, entity, asset }: EmCellMeshViewerProps) {
  const ctx = useParams<WorkspaceContext>();
  const refHost = useRef<HTMLDivElement | null>(null);
  const [viewer, setViewer] = useState<EmMeshViewer | null>(null);
  const { settings, update, chooseLook, chooseColor } = useEmViewerSettings();
  const { virtualLabId, projectId } = ctx ?? {};
  const source = {
    entityId: entity.id,
    asset,
    ctx: virtualLabId && projectId ? { virtualLabId, projectId } : null,
  };
  const load = useEmMesh(viewer, source, settings.standInTriangles);
  const wheelHint = useWheelHint(viewer);

  useEffect(() => {
    const host = refHost.current;
    if (!host) return;
    const created = new EmMeshViewer(host);
    setViewer(created);
    return () => {
      setViewer(null);
      created.dispose();
    };
  }, []);

  useViewerSync(viewer, settings);

  // After the look is set: its shaders compile while the mesh downloads.
  useEffect(() => {
    viewer?.prepare().catch(() => {});
  }, [viewer]);

  return (
    <ViewerFrame className={className} testId="em-mesh-viewer" hostRef={refHost}>
      {(root) =>
        viewer && (
          <EmViewerChrome
            viewer={viewer}
            root={root}
            settings={settings}
            update={update}
            chooseLook={chooseLook}
            chooseColor={chooseColor}
            load={load}
            name={entity.name}
            wheelHint={wheelHint}
          />
        )
      }
    </ViewerFrame>
  );
}

/** Apply the settings to the viewer, each as it changes. */
function useViewerSync(viewer: EmMeshViewer | null, settings: EmViewerSettings) {
  useSceneSync(viewer, settings);
  useEffect(() => viewer?.setSurfaceColor(surfaceColor(settings.color)), [viewer, settings.color]);
  useEffect(() => viewer?.setAODepth(settings.aoDepth), [viewer, settings.aoDepth]);
  useEffect(() => viewer?.setForcedMesh(settings.mesh), [viewer, settings.mesh]);
  useEffect(() => viewer?.showChunkBoxes(settings.chunkBoxes), [viewer, settings.chunkBoxes]);
  useEffect(() => viewer?.setMotion(settings.motion), [viewer, settings.motion]);
}

const EmCellMeshViewer = dynamic(() => Promise.resolve(EmCellMeshViewerComponent), {
  ssr: false,
});

export { EmCellMeshViewer };
