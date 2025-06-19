import { useAtomValue, useSetAtom } from 'jotai';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { loadable } from 'jotai/utils';

import { getAtlasMeshAsset } from '@/features/brain-atlas-viewer/context';
import { createMesh } from '@/features/brain-atlas-viewer/utils';
import {
  addMeshVisibilityAtom,
  disableLoadingAtom,
  addLoadingAtom,
} from '@/features/brain-atlas-viewer/state';
import { useAppNotification } from '@/components/notification';
import { messages } from '@/i18n/en/atlas';

import type { ApplicationSection } from '@/types/common';

export default function BrainRegionMesh({
  brainRegionId,
  section,
  color,
}: {
  brainRegionId: string;
  section: ApplicationSection;
  color?: string;
}) {
  const { warning } = useAppNotification();
  const addLoading = useSetAtom(addLoadingAtom);
  const disableLoading = useSetAtom(disableLoadingAtom);

  const brainRegionMesh = useAtomValue(
    useMemo(() => loadable(getAtlasMeshAsset(brainRegionId)), [brainRegionId])
  );

  const addMeshVisibility = useSetAtom(addMeshVisibilityAtom);
  const { scene } = useThree();

  useEffect(() => {
    if (brainRegionMesh.state === 'loading') {
      addLoading(section, brainRegionId, 'mesh');
    }
    if (brainRegionMesh.state === 'hasError') {
      disableLoading(section, brainRegionId, 'mesh');
      warning({
        message: messages.brainRegionMeshLoadingError,
        description: typeof brainRegionMesh.error === 'string' ? brainRegionMesh.error : '',
        placement: 'topRight',
        key: 'brain-region-mesh',
      });
      return;
    }
    if (brainRegionMesh.state === 'hasData' && brainRegionMesh.data) {
      const mesh = createMesh(brainRegionMesh.data.data, color || '#FFF');
      mesh.userData = { brainRegionId };
      scene.add(mesh);
      addMeshVisibility(section, brainRegionId, 'mesh', mesh.uuid);
      disableLoading(section, brainRegionId, 'mesh');
    }
  }, [
    addLoading,
    addMeshVisibility,
    brainRegionId,
    brainRegionMesh,
    color,
    disableLoading,
    scene,
    section,
    warning,
  ]);

  return null;
}
