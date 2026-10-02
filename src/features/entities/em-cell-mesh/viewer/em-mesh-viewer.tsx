'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useSignal } from '@/features/viewer-3d/use-signal';
import { cn } from '@/utils/css-class';
import { FullscreenPortalScope, toggleFullscreen } from '@/utils/fullscreen';

import { EmViewerChrome } from './chrome/em-viewer-chrome';
import { EmMeshViewer } from './engine/em-mesh-viewer';
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
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const refHost = useRef<HTMLDivElement | null>(null);
  const [viewer, setViewer] = useState<EmMeshViewer | null>(null);
  const { settings, update, chooseLook } = useEmViewerSettings();
  const { virtualLabId, projectId } = ctx ?? {};
  const source = useMemo(
    () => ({
      entityId: entity.id,
      asset: { id: asset.id, size: asset.size },
      ctx: virtualLabId && projectId ? { virtualLabId, projectId } : null,
    }),
    [entity.id, asset.id, asset.size, virtualLabId, projectId]
  );
  const load = useEmMesh(viewer, source, settings.standInTriangles);
  const [wheelHint, setWheelHint] = useSignal(10000);

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

  useEffect(() => viewer?.onWheelWithoutCtrl(() => setWheelHint(true)), [viewer, setWheelHint]);

  useViewerSync(viewer, settings);

  // After the look is set: its shaders compile while the mesh downloads.
  useEffect(() => {
    viewer?.prepare().catch(() => {});
  }, [viewer]);

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      ref={setRoot}
      data-testid="em-mesh-viewer"
    >
      <FullscreenPortalScope root={root}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: if you are blind, fullscreen won't give you more information */}
        <div
          className="absolute inset-0"
          ref={refHost}
          onDoubleClick={() => toggleFullscreen(root)}
        />
        {viewer && (
          <EmViewerChrome
            viewer={viewer}
            root={root}
            settings={settings}
            update={update}
            chooseLook={chooseLook}
            load={load}
            name={entity.name}
            wheelHint={wheelHint}
          />
        )}
      </FullscreenPortalScope>
    </div>
  );
}

/** Apply the settings to the viewer, each as it changes. */
function useViewerSync(viewer: EmMeshViewer | null, settings: EmViewerSettings) {
  useEffect(() => viewer?.setDark(settings.dark), [viewer, settings.dark]);
  useEffect(() => viewer?.setLook(settings.look), [viewer, settings.look]);
  useEffect(() => viewer?.setAO(settings.ao), [viewer, settings.ao]);
  useEffect(() => viewer?.setWireframe(settings.wireframe), [viewer, settings.wireframe]);
  useEffect(() => viewer?.setSpin(settings.spin), [viewer, settings.spin]);
  useEffect(() => viewer?.setProjection(settings.projection), [viewer, settings.projection]);
  useEffect(() => viewer?.setAODepth(settings.aoDepth), [viewer, settings.aoDepth]);
  useEffect(() => viewer?.setForcedMesh(settings.mesh), [viewer, settings.mesh]);
  useEffect(() => viewer?.showChunkBoxes(settings.chunkBoxes), [viewer, settings.chunkBoxes]);
  useEffect(() => viewer?.setMotion(settings.motion), [viewer, settings.motion]);
}

const EmCellMeshViewer = dynamic(() => Promise.resolve(EmCellMeshViewerComponent), {
  ssr: false,
});

export { EmCellMeshViewer };
