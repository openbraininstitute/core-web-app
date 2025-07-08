import { useAtomValue, useSetAtom } from 'jotai';
import { useThree } from '@react-three/fiber';
import { useMemo, useLayoutEffect } from 'react';

import { getAtlasMeshAsset } from '@/features/brain-atlas-viewer/context';
import { createMesh } from '@/features/brain-atlas-viewer/utils';
import { addMeshVisibilityAtom } from '@/features/brain-atlas-viewer/state';

export default function BrainRegionMesh({
  brainRegionId,
  color,
  dataKey,
}: {
  brainRegionId: string;
  color?: string;
  dataKey: string;
}) {
  const addMeshVisibility = useSetAtom(addMeshVisibilityAtom);
  const { scene } = useThree();

  // Direct atom read - this will throw a promise if not resolved yet
  const brainRegionMeshData = useAtomValue(
    useMemo(() => getAtlasMeshAsset(brainRegionId), [brainRegionId])
  );

  // Create mesh object only when data is available
  const meshObject = useMemo(() => {
    if (brainRegionMeshData?.data) {
      const mesh = createMesh(brainRegionMeshData.data, color || '#FFF');
      mesh.userData = { brainRegionId };
      return mesh;
    }
    return null;
  }, [brainRegionMeshData, color, brainRegionId]);

  // Add to scene and register visibility when mesh is created
  useLayoutEffect(() => {
    if (meshObject) {
      scene.add(meshObject);
      addMeshVisibility(dataKey, brainRegionId, 'mesh', meshObject.uuid);

      return () => {
        scene.remove(meshObject);
      };
    }
  }, [meshObject, scene, addMeshVisibility, dataKey, brainRegionId]);

  return null;
}
