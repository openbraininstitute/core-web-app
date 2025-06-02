import { useAtomValue, useSetAtom } from 'jotai';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { loadable } from 'jotai/utils';
import get from 'lodash/get';

import { createPointCloud } from '@/features/brain-atlas-viewer/utils';
import {
  addLoadingAtom,
  addMeshVisibilityAtom,
  disableLoadingAtom,
  getPointCloudAtom,
} from '@/features/brain-atlas-viewer/state';
import { useAppNotification } from '@/components/notification';
import { messages } from '@/i18n/en/atlas';

import type { ApplicationSection } from '@/types/common';

type PointCloudMeshProps = {
  brainRegionId: string;
  brainRegionAnnotationValue: number;
  section: ApplicationSection;
  color?: string;
};

export default function PointCloudMesh({
  brainRegionAnnotationValue,
  brainRegionId,
  section,
  color,
}: PointCloudMeshProps) {
  const { scene } = useThree();
  const { info } = useAppNotification();
  const addMeshVisibility = useSetAtom(addMeshVisibilityAtom);
  const disableLoading = useSetAtom(disableLoadingAtom);
  const addLoading = useSetAtom(addLoadingAtom);

  const pointCloudData = useAtomValue(
    useMemo(
      () => loadable(getPointCloudAtom(brainRegionAnnotationValue)),
      [brainRegionAnnotationValue]
    )
  );

  useEffect(() => {
    if (pointCloudData.state === 'loading') {
      addLoading(section, brainRegionId, 'pointCloud');
    }
    if (pointCloudData.state === 'hasError') {
      info({
        message: get(messages, (pointCloudData.error as Error).message, messages.default),
        placement: 'topRight',
        key: 'point-cloud-warning',
      });
      disableLoading(section, brainRegionId, 'pointCloud');
      return;
    }
    if (pointCloudData.state === 'hasData' && pointCloudData.data) {
      const pointCloud3DObject = createPointCloud(pointCloudData.data, color || '#FFF');
      pointCloud3DObject.userData = { brainRegionId };
      addMeshVisibility(section, brainRegionId, 'pointCloud', pointCloud3DObject.uuid);
      scene.add(pointCloud3DObject);
      disableLoading(section, brainRegionId, 'pointCloud');
    }
  }, [
    addLoading,
    addMeshVisibility,
    brainRegionId,
    color,
    disableLoading,
    info,
    pointCloudData,
    scene,
    section,
  ]);

  return null;
}
