import { CameraFilled } from '@ant-design/icons';
import React from 'react';

import { usePainter, useVisibleRegions } from './hooks';

// Temporary disabled
// import { Settings } from './settings/settings';

import {
  AppSpeciesBrainRegionConfig,
  getSpeciesConfigByHierarchyId,
  useBrainRegionRootHierarchyQuery,
} from '@/features/brain-region-hierarchy/context';
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
  const {
    loading,
    result: { workspaceHierarchyId },
  } = useBrainRegionRootHierarchyQuery();
  const SpeciesConfig = getSpeciesConfigByHierarchyId(workspaceHierarchyId);
  const painter = usePainter({
    loading,
    atlasId: SpeciesConfig.AtlasId ?? AppSpeciesBrainRegionConfig.Common.DefaultAtlasId,
  });

  // Temporary disabled
  // const [values, setValues] = useAtlasViewerSettingsValues(painter);
  const { region, regions } = useVisibleRegions();

  React.useEffect(() => {
    if (accessToken && painter) {
      painter.setRegions(regions, accessToken);
      painter.setPointCloud(
        region?.annotation_value ?? -1,
        `#${region?.color_hex_triplet ?? 'FFFFFF'}`,
        accessToken
      );
    }
    const handleCameraChange = () => {
      setShowResetCamera(true);
    };
    painter?.eventCameraChange.addListener(handleCameraChange);
    painter?.eventLoading.addListener(onLoading);

    return () => {
      painter?.eventCameraChange.removeListener(handleCameraChange);
      painter?.eventLoading.removeListener(onLoading);
    };
  }, [painter, region, regions, accessToken, onLoading]);

  return (
    <div className={classNames(className, styles.brainAtlasViewerGltf)}>
      <canvas ref={painter?.start} />
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
