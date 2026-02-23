import { CameraFilled } from '@ant-design/icons';
import React from 'react';

import { usePainter, useVisibleRegions } from './hooks';

// Temporary disabled
// import { Settings } from './settings/settings';

import { useBrainRegionRootHierarchyQuery } from '@/features/brain-region-hierarchy/context';
import { useHierarchyRuntimeMetadataQuery } from '@/features/brain-region-hierarchy/hooks/use-brain-region-species';
import { useAccessToken } from '@/hooks/useAccessToken';
import { classNames } from '@/util/utils';

import styles from './brain-atlas-viewer-gltf.module.css';

export interface BrainAtlasViewerGltfProps {
  className?: string;
  onLoading(loading: boolean): void;
}

export function BrainAtlasViewerGltf({ className, onLoading }: BrainAtlasViewerGltfProps) {
  const [showResetCamera, setShowResetCamera] = React.useState(false);
  const accessToken = useAccessToken();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const previousPainterRef = React.useRef<{
    start: (canvas: HTMLCanvasElement | null) => void;
  } | null>(null);
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

  React.useEffect(() => {
    const previousPainter = previousPainterRef.current;
    if (previousPainter && previousPainter !== painter) {
      previousPainter.start(null);
    }
    previousPainterRef.current = painter;

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

  return (
    <div className={classNames(className, styles.brainAtlasViewerGltf)}>
      <canvas
        ref={(canvas) => {
          canvasRef.current = canvas;
          painter?.start(canvas);
        }}
      />
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
      {/*
      We disable this feature for now (dec 11th, 2025) until we agree
      on settings ranges.
      <Settings values={values} onChange={setValues} /> */}
    </div>
  );
}
