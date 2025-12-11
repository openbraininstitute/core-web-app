import React from 'react';
import { CameraFilled } from '@ant-design/icons';

import { usePainter, useAtlasViewerSettingsValues, useVisibleRegions } from './hooks';
import { Settings } from './settings/settings';

import { classNames } from '@/util/utils';
import { useAccessToken } from '@/hooks/useAccessToken';

import styles from './brain-atlas-viewer-gltf.module.css';

export interface BrainAtlasViewerGltfProps {
  className?: string;
  dataKey: string;
  onLoading(loading: boolean): void;
}

export function BrainAtlasViewerGltf({ className, dataKey, onLoading }: BrainAtlasViewerGltfProps) {
  const [showResetCamera, setShowResetCamera] = React.useState(false);
  const accessToken = useAccessToken();
  const painter = usePainter();
  const [values, setValues] = useAtlasViewerSettingsValues(painter);
  const { region, regions } = useVisibleRegions(dataKey);
  React.useEffect(() => {
    if (accessToken) {
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
    painter.eventCameraChange.addListener(handleCameraChange);
    painter.eventLoading.addListener(onLoading);
    return () => {
      painter.eventCameraChange.removeListener(handleCameraChange);
      painter.eventLoading.removeListener(onLoading);
    };
  }, [painter, region, regions, accessToken, onLoading]);

  return (
    <div className={classNames(className, styles.brainAtlasViewerGltf)}>
      <canvas ref={painter.start} />
      <header className={classNames(showResetCamera && styles.show)}>
        <button
          type="button"
          onClick={() => {
            painter.resetCamera();
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
