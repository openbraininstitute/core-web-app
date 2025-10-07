import { useMemo, useLayoutEffect, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { loadable } from 'jotai/utils';
import { useAtomValue } from 'jotai';
import get from 'es-toolkit/compat/get';

import { getAtlasMeshAsset } from '@/features/brain-atlas-viewer/context';
import { createMesh } from '@/features/brain-atlas-viewer/utils';
import { useAppNotification } from '@/components/notification';
import { messages } from '@/i18n/en/atlas';

export default function BrainRegionMesh({
  brainRegionId,
  color,
  dataKey,
  regionName,
  onLoadingChange,
}: {
  brainRegionId: string;
  color?: string;
  dataKey: string;
  regionName?: string;
  onLoadingChange?: (type: 'mesh', loading: boolean) => void;
}) {
  const { scene } = useThree();
  const notification = useAppNotification();

  const brainRegionMeshLoadable = useAtomValue(
    useMemo(() => loadable(getAtlasMeshAsset(brainRegionId)), [brainRegionId])
  );

  useEffect(() => {
    onLoadingChange?.('mesh', brainRegionMeshLoadable.state === 'loading');

    if (brainRegionMeshLoadable.state === 'hasError') {
      const error = brainRegionMeshLoadable.error as Error;
      notification.warning({
        message: <strong className="text-primary-9">{regionName ?? brainRegionId}</strong>,
        description: `${get(messages, error.message, messages.default)} mesh.`,
        placement: 'topRight',
        key: `mesh-warning-${brainRegionId}`,
      });
    }
    return () => {
      onLoadingChange?.('mesh', false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brainRegionMeshLoadable.state]);

  // Create mesh object only when data is available
  const meshObject = useMemo(() => {
    if (brainRegionMeshLoadable.state === 'hasData' && brainRegionMeshLoadable.data?.data) {
      const mesh = createMesh(brainRegionMeshLoadable.data.data, color || '#FFF');
      mesh.userData = { brainRegionId };
      return mesh;
    }
    return null;
  }, [brainRegionMeshLoadable, color, brainRegionId]);

  // Add to scene when mesh is created
  useLayoutEffect(() => {
    if (meshObject) {
      scene.add(meshObject);

      return () => {
        scene.remove(meshObject);
      };
    }
  }, [meshObject, scene, dataKey, brainRegionId]);

  return null;
}
