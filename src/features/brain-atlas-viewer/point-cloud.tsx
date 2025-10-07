import { useMemo, useLayoutEffect, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { loadable } from 'jotai/utils';
import { useAtomValue } from 'jotai';
import get from 'es-toolkit/compat/get';

import { createPointCloud } from '@/features/brain-atlas-viewer/utils';
import { getPointCloudAtom } from '@/features/brain-atlas-viewer/state';
import { useAppNotification } from '@/components/notification';
import { messages } from '@/i18n/en/atlas';

type PointCloudMeshProps = {
  brainRegionId: string;
  brainRegionAnnotationValue: number;
  dataKey: string;
  color?: string;
  onLoadingChange?: (type: 'pointCloud', loading: boolean) => void;
  regionName?: string;
};

export default function PointCloudMesh({
  brainRegionAnnotationValue,
  brainRegionId,
  dataKey,
  color,
  onLoadingChange,
  regionName,
}: PointCloudMeshProps) {
  const { scene } = useThree();
  const hasAddedVisibility = useRef(false);
  const notification = useAppNotification();

  // Direct atom read - this will throw a promise if not resolved yet
  const pointCloudLoadable = useAtomValue(
    useMemo(
      () => loadable(getPointCloudAtom(brainRegionAnnotationValue)),
      [brainRegionAnnotationValue]
    )
  );

  useEffect(() => {
    onLoadingChange?.('pointCloud', pointCloudLoadable.state === 'loading');

    if (pointCloudLoadable.state === 'hasError') {
      const error = pointCloudLoadable.error as Error;
      notification.warning({
        message: <strong className="text-primary-9">{regionName ?? brainRegionId}</strong>,
        description: `${get(messages, error.message, messages.default)} point cloud.`,
        placement: 'topRight',
        key: `point-cloud-warning-${brainRegionId}`,
      });
    }
    return () => {
      onLoadingChange?.('pointCloud', false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointCloudLoadable.state]);

  // Create point cloud object only when data is available
  const pointCloud3DObject = useMemo(() => {
    if (pointCloudLoadable.state === 'hasData' && pointCloudLoadable.data) {
      const pointCloudObj = createPointCloud(pointCloudLoadable.data, color || '#FFF');
      pointCloudObj.userData = { brainRegionId };
      // Reset visibility tracking when new object is created
      hasAddedVisibility.current = false;
      return pointCloudObj;
    }
    return null;
  }, [pointCloudLoadable, color, brainRegionId]);

  // Add to scene when point cloud is created
  useLayoutEffect(() => {
    if (pointCloud3DObject && !hasAddedVisibility.current) {
      scene.add(pointCloud3DObject);
      hasAddedVisibility.current = true;

      return () => {
        scene.remove(pointCloud3DObject);
        hasAddedVisibility.current = false;
      };
    }
  }, [pointCloud3DObject, scene, dataKey, brainRegionId]);

  return null;
}
