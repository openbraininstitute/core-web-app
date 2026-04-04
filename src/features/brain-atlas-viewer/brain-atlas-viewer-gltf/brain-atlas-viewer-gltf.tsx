import { CameraFilled } from '@ant-design/icons';
import React from 'react';

import { Settings } from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/settings/settings';
import { useBrainRegionRootHierarchyQuery } from '@/features/brain-region-hierarchy/context';
import { useHierarchyRuntimeMetadataQuery } from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { useAccessToken } from '@/hooks/useAccessToken';
import { classNames } from '@/util/utils';

import { useAtlasViewerSettingsValues, usePainter, useVisibleRegions } from './hooks';

import styles from '@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/brain-atlas-viewer-gltf.module.css';

export interface BrainAtlasViewerGltfProps {
  className?: string;
  onLoading(loading: boolean): void;
}

export function BrainAtlasViewerGltf({ className, onLoading }: BrainAtlasViewerGltfProps) {
  const [showResetCamera, setShowResetCamera] = React.useState(false);
  const accessToken = useAccessToken();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const {
    loading,
    result: { workspaceHierarchyId },
  } = useBrainRegionRootHierarchyQuery();
  const { runtimeHierarchyById } = useHierarchyRuntimeMetadataQuery();
  const resolvedAtlasId = runtimeHierarchyById.get(workspaceHierarchyId)?.atlasId;
  const painter = usePainter({
    loading: loading || !resolvedAtlasId,
    atlasId: resolvedAtlasId,
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

  React.useEffect(() => {
    const handleCameraChange = () => {
      setShowResetCamera(true);
    };
    painter?.eventCameraChange.addListener(handleCameraChange);
    painter?.eventLoading.addListener(onLoading);

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
      painter?.eventLoading.removeListener(onLoading);
    };
  }, [painter, region, regions, accessToken, onLoading]);

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

    element.addEventListener('wheel', preventBrowserPinchZoom, { passive: false });
    element.addEventListener('gesturestart', preventGestureZoom, { passive: false });
    element.addEventListener('gesturechange', preventGestureZoom, { passive: false });
    element.addEventListener('gestureend', preventGestureZoom, { passive: false });

    return () => {
      element.removeEventListener('wheel', preventBrowserPinchZoom);
      element.removeEventListener('gesturestart', preventGestureZoom);
      element.removeEventListener('gesturechange', preventGestureZoom);
      element.removeEventListener('gestureend', preventGestureZoom);
    };
  }, []);

  return (
    <div ref={containerRef} className={classNames(className, styles.brainAtlasViewerGltf)}>
      <canvas ref={canvasRef} />
      <header className={classNames(showResetCamera && styles.show)}>
        <button
          type="button"
          onClick={() => {
            painter?.resetCamera();
            setShowResetCamera(false);
          }}
        >
          <CameraFilled /> <div>Reset camera</div>
        </button>
      </header>
      <Settings values={values} onChange={setValues} />
    </div>
  );
}
