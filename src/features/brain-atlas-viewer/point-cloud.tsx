import { useEffect, useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { loadable } from 'jotai/utils';
import { useThree } from '@react-three/fiber';
import { createPointCloud } from '@/features/brain-atlas-viewer/utils';
import { ApplicationSection } from '@/types/common';
import {
  addLoadingAtom,
  addMeshVisibilityAtom,
  disableLoadingAtom,
  getPointCloudAtom,
} from '@/features/brain-atlas-viewer/state';
import { BRAIN_REGION_DOES_NOT_EXIST, CIRCUIT_NOT_BUILT_ERROR } from '@/constants/errors';
import { useAppNotification } from '@/components/notification';
import { serverMessages, messages } from '@/i18n/en/atlas';

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
      if ((pointCloudData.error as Error).message === serverMessages.CIRCUIT_NOT_BUILT_ERROR) {
        info({
          message: messages.circuitNotBuiltError,
          placement: 'topRight',
          key: 'point-cloud-warning',
        });
      } else if (
        (pointCloudData.error as Error).message === serverMessages.BRAIN_REGION_DOES_NOT_EXIST
      ) {
        info({
          message: messages.brainRegionDoesNotExist,
          placement: 'topRight',
          key: 'point-cloud-warning',
        });
      } else {
        info({
          message: messages.default,
          placement: 'topRight',
          key: 'point-cloud-warning',
        });
      }
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
