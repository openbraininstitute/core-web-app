import { CameraFilled } from '@ant-design/icons';
import React from 'react';

import { Settings } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/settings/settings';
import { useBrainRegionRootHierarchyQuery } from '@/features/brain-region-hierarchy/context';
import { useHierarchyRuntimeMetadataQuery } from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { SPECIES_TAXONOMY_IDS } from '@/features/brain-region-hierarchy/types';
import { useAccessToken } from '@/hooks/useAccessToken';
import { classNames } from '@/util/utils';

import {
  useAtlasViewerSettingsValues,
  usePainter,
  usePainterLoadingListener,
  useVisibleRegions,
} from './hooks';

import styles from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/brain-atlas-viewer-gltf.module.css';

export interface BrainAtlasViewerGltfProps {
  className?: string;
  /** A small preview: no settings or atlas label, and a smaller camera reset. */
  compact?: boolean;
  onLoading(loading: boolean): void;
}

/** Fills the small preview card the way the design does; the full viewer keeps 1. */
const COMPACT_CAMERA_ZOOM = 1.7;

const ATLAS_LABELS: Record<string, string> = {
  [SPECIES_TAXONOMY_IDS.HOMO_SAPIENS]: 'Julich Human Brain Atlas',
  [SPECIES_TAXONOMY_IDS.RATTUS_NORVEGICUS]: 'Waxholm Space Rat Brain Atlas',
};

export function BrainAtlasViewerGltf({
  className,
  compact = false,
  onLoading,
}: BrainAtlasViewerGltfProps) {
  const [showResetCamera, setShowResetCamera] = React.useState(false);
  const accessToken = useAccessToken();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const {
    loading,
    result: { workspaceHierarchyId },
  } = useBrainRegionRootHierarchyQuery();
  const { runtimeHierarchyById } = useHierarchyRuntimeMetadataQuery();
  const hierarchyMeta = runtimeHierarchyById.get(workspaceHierarchyId);
  const resolvedAtlasId = hierarchyMeta?.atlasId;
  const atlasLabel = hierarchyMeta?.species.taxonomyId
    ? ATLAS_LABELS[hierarchyMeta.species.taxonomyId]
    : undefined;
  const painter = usePainter({
    loading: loading || !resolvedAtlasId,
    atlasId: resolvedAtlasId,
    cameraZoom: compact ? COMPACT_CAMERA_ZOOM : 1,
  });
  const [values, setValues] = useAtlasViewerSettingsValues(painter);

  React.useEffect(() => {
    if (!painter) {
      setShowResetCamera(false);
      onLoading(false);
      if (canvasRef.current) {
        // Force-clear stale WebGL frame when no atlas is available.
        const width = canvasRef.current.width;
        canvasRef.current.width = width + 1;
        canvasRef.current.width = width;
      }
    }
  }, [painter, onLoading]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!painter || !canvas) return;

    painter.start(canvas);

    return () => {
      painter.start(null);
    };
  }, [painter]);

  // Temporary disabled
  // const [values, setValues] = useAtlasViewerSettingsValues(painter);
  const { region, regions } = useVisibleRegions();

  // the first finished load means a frame with the brain in it, which the atlas morph awaits
  const [isDrawn, setIsDrawn] = React.useState(false);
  const sawLoadingRef = React.useRef(false);
  const handleLoading = React.useCallback(
    (loading: boolean) => {
      if (loading) sawLoadingRef.current = true;
      else if (sawLoadingRef.current) setIsDrawn(true);
      onLoading(loading);
    },
    [onLoading]
  );
  usePainterLoadingListener(painter, handleLoading);

  React.useEffect(() => {
    const handleCameraChange = () => {
      setShowResetCamera(true);
    };
    painter?.eventCameraChange.addListener(handleCameraChange);

    if (accessToken && painter) {
      painter.setRegions(regions, accessToken);
      painter.setPointCloud(
        region?.annotation_value ?? -1,
        `#${region?.color_hex_triplet ?? 'FFFFFF'}`,
        accessToken
      );
    }

    return () => {
      painter?.eventCameraChange.removeListener(handleCameraChange);
    };
  }, [painter, region, regions, accessToken]);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const preventBrowserPinchZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };

    const preventGestureZoom = (event: Event) => {
      event.preventDefault();
    };

    element.addEventListener('wheel', preventBrowserPinchZoom, {
      passive: false,
    });
    element.addEventListener('gesturestart', preventGestureZoom, {
      passive: false,
    });
    element.addEventListener('gesturechange', preventGestureZoom, {
      passive: false,
    });
    element.addEventListener('gestureend', preventGestureZoom, {
      passive: false,
    });

    return () => {
      element.removeEventListener('wheel', preventBrowserPinchZoom);
      element.removeEventListener('gesturestart', preventGestureZoom);
      element.removeEventListener('gesturechange', preventGestureZoom);
      element.removeEventListener('gestureend', preventGestureZoom);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-atlas-drawn={isDrawn || undefined}
      className={classNames(className, styles.brainAtlasViewerGltf, compact && styles.compact)}
    >
      <canvas ref={canvasRef} />
      <header className={classNames(showResetCamera && styles.show)}>
        <button
          type="button"
          data-testid="atlas-reset-camera-button"
          onClick={() => {
            painter?.resetCamera();
            setShowResetCamera(false);
          }}
        >
          <CameraFilled /> <div>Reset camera</div>
        </button>
      </header>
      {!compact && <Settings values={values} onChange={setValues} />}
      {!compact && atlasLabel && <span className={styles.atlasLabel}>{atlasLabel}</span>}
    </div>
  );
}
