'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useBareViewer } from '@/features/viewer-3d/bare';
import { useSceneSync, useWheelHint, ViewerFrame } from '@/features/viewer-3d/viewer-frame';
import { useLatest } from '@/ui/hooks/use-latest';

import { EmViewerChrome } from './chrome/em-viewer-chrome';
import { EmMeshViewer } from './engine/em-mesh-viewer';
import { surfaceColor } from './mesh-color';
import { type EmMeshLoad, useEmMesh } from './use-em-mesh';
import { type EmViewerSettings, useEmViewerSettings } from './use-em-viewer-settings';

import type { RefObject } from 'react';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

interface EmCellMeshViewerProps {
  className?: string;
  entity: { id: string; name: string };
  /** The mesh's GLB. */
  asset: Pick<IAsset, 'id' | 'size'>;
  /** Settings to begin with, over the viewer's own: such as a look, spinning, no scale bar. */
  defaults?: Partial<EmViewerSettings>;
  /** A flat colour in place of the look's light background. */
  lightCanvas?: string;
  /** Told of a click on the mesh; the pointer over it then says it can be clicked. */
  onSurfaceClick?: () => void;
  /** Told of a click beside the mesh. */
  onEmptyClick?: () => void;
  /** Told once the full mesh is drawn. */
  onReady?: () => void;
}

/** A press that moves under this, in px, is a click; and the pointer is looked under every this many ms at most. */
const CLICK_REACH = 4;
const LOOK_MS = 100;

function EmCellMeshViewerComponent({
  className,
  entity,
  asset,
  defaults,
  lightCanvas,
  onSurfaceClick,
  onEmptyClick,
  onReady,
}: EmCellMeshViewerProps) {
  const ctx = useParams<WorkspaceContext>();
  const bare = useBareViewer();
  const refHost = useRef<HTMLDivElement | null>(null);
  const [viewer, setViewer] = useState<EmMeshViewer | null>(null);
  const { settings, update, chooseLook, chooseColor } = useEmViewerSettings(defaults);
  const { virtualLabId, projectId } = ctx ?? {};
  const source = {
    entityId: entity.id,
    asset,
    ctx: virtualLabId && projectId ? { virtualLabId, projectId } : null,
  };
  const load = useEmMesh(viewer, source, settings.standInTriangles);
  const readyHeard = useLatest(onReady);
  const ready = load.times.ready !== null;
  useEffect(() => {
    if (ready) readyHeard.current?.();
  }, [ready, readyHeard]);
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
  useEffect(() => viewer?.setLightCanvas(lightCanvas ?? null), [viewer, lightCanvas]);

  // After the look is set: its shaders compile while the mesh downloads.
  useEffect(() => {
    viewer?.prepare().catch(() => {});
  }, [viewer]);

  useSurfaceClicks(viewer, refHost, onSurfaceClick, onEmptyClick);

  return (
    <ViewerFrame className={className} testId="em-mesh-viewer" hostRef={refHost}>
      {(root) =>
        viewer &&
        (bare ? (
          <BareStatus load={load} />
        ) : (
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
        ))
      }
    </ViewerFrame>
  );
}

/** Bare, only what keeps the canvas from looking broken: that the mesh is coming, or that it could not. */
function BareStatus({ load }: { load: EmMeshLoad }) {
  const note = 'pointer-events-none absolute inset-0 flex items-center justify-center';
  if (load.error && load.times.standIn === null) {
    return <p className={`${note} text-[13px] text-neutral-500`}>The mesh could not be loaded.</p>;
  }
  if (load.times.standIn !== null || load.times.ready !== null) return null;
  const share = load.total > 0 ? Math.round((100 * load.received) / load.total) : null;
  return (
    <p className={`${note} text-[11px] tracking-[0.12em] text-neutral-400 uppercase`}>
      Loading the mesh{share === null ? '…' : ` · ${share}%`}
    </p>
  );
}

/** Clicks on the mesh and beside it, told apart by a ray; with a pointer cursor over the mesh where it can be clicked. */
function useSurfaceClicks(
  viewer: EmMeshViewer | null,
  hostRef: RefObject<HTMLDivElement | null>,
  onSurfaceClick: (() => void) | undefined,
  onEmptyClick: (() => void) | undefined
) {
  const surfaceClicked = useLatest(onSurfaceClick);
  const emptyClicked = useLatest(onEmptyClick);
  const clickable = onSurfaceClick !== undefined;
  useEffect(() => {
    const host = hostRef.current;
    if (!viewer || !host || !clickable) return;
    let down: { x: number; y: number } | null = null;
    let lookedAt = 0;
    const press = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const release = (e: PointerEvent) => {
      const from = down;
      down = null;
      if (!from || Math.hypot(e.clientX - from.x, e.clientY - from.y) > CLICK_REACH) return;
      if (viewer.surfaceAt(e.clientX, e.clientY)) surfaceClicked.current?.();
      else emptyClicked.current?.();
    };
    const move = (e: PointerEvent) => {
      if (e.buttons !== 0 || e.timeStamp - lookedAt < LOOK_MS) return;
      lookedAt = e.timeStamp;
      host.style.cursor = viewer.surfaceAt(e.clientX, e.clientY) ? 'pointer' : '';
    };
    host.addEventListener('pointerdown', press);
    host.addEventListener('pointerup', release);
    host.addEventListener('pointermove', move);
    return () => {
      host.removeEventListener('pointerdown', press);
      host.removeEventListener('pointerup', release);
      host.removeEventListener('pointermove', move);
      host.style.cursor = '';
    };
  }, [viewer, hostRef, clickable, surfaceClicked, emptyClicked]);
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
