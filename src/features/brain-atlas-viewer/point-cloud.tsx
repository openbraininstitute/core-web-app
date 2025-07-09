import { useAtomValue, useSetAtom } from 'jotai';
import { useThree } from '@react-three/fiber';
import { useMemo, useLayoutEffect, useRef } from 'react';

import { createPointCloud } from '@/features/brain-atlas-viewer/utils';
import { addMeshVisibilityAtom, getPointCloudAtom } from '@/features/brain-atlas-viewer/state';

type PointCloudMeshProps = {
  brainRegionId: string;
  brainRegionAnnotationValue: number;
  dataKey: string;
  color?: string;
};

export default function PointCloudMesh({
  brainRegionAnnotationValue,
  brainRegionId,
  dataKey,
  color,
}: PointCloudMeshProps) {
  const { scene } = useThree();
  const addMeshVisibility = useSetAtom(addMeshVisibilityAtom);
  const hasAddedVisibility = useRef(false);

  // Direct atom read - this will throw a promise if not resolved yet
  const pointCloudData = useAtomValue(
    useMemo(() => getPointCloudAtom(brainRegionAnnotationValue), [brainRegionAnnotationValue])
  );

  // Create point cloud object only when data is available
  const pointCloud3DObject = useMemo(() => {
    if (pointCloudData) {
      const pointCloudObj = createPointCloud(pointCloudData, color || '#FFF');
      pointCloudObj.userData = { brainRegionId };
      // Reset visibility tracking when new object is created
      hasAddedVisibility.current = false;
      return pointCloudObj;
    }
    return null;
  }, [pointCloudData, color, brainRegionId]);

  // Add to scene when point cloud is created
  useLayoutEffect(() => {
    if (pointCloud3DObject && !hasAddedVisibility.current) {
      scene.add(pointCloud3DObject);
      addMeshVisibility(dataKey, brainRegionId, 'pointCloud', pointCloud3DObject.uuid);
      hasAddedVisibility.current = true;

      return () => {
        scene.remove(pointCloud3DObject);
        hasAddedVisibility.current = false;
      };
    }
  }, [pointCloud3DObject, scene, addMeshVisibility, dataKey, brainRegionId]);

  return null;
}
