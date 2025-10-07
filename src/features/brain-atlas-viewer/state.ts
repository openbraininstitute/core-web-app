import { atomFamily, atomWithReset } from 'jotai/utils';
import { atom } from 'jotai';

import uniqBy from 'es-toolkit/compat/uniqBy';
import sessionAtom from '@/state/session';

import { MeshVisibility, VisibilityType } from '@/features/brain-atlas-viewer/types';
import { fetchPointCloud } from '@/features/brain-atlas-viewer/api';
import { cellSvcBaseUrl } from '@/config';
import { env } from '@/env';

export const meshVisibilityAtom = atomFamily(() => atomWithReset<MeshVisibility[]>([]));

export const addMeshVisibilityAtom = atom(
  null,
  (get, set, dataKey: string, brainRegionId: string, type: VisibilityType, sceneId: string) => {
    const visibility = get(meshVisibilityAtom(dataKey));
    set(
      meshVisibilityAtom(dataKey),
      uniqBy(
        [...visibility, { brainRegionId, type, sceneId }],
        (item) => `${item.brainRegionId}-${item.type}`
      )
    );
  }
);

/**
 * Returns an async atom that fetches the point cloud of a given brain region
 * in a buffer array format
 *
 * @param brainRegionAnnotationValue
 */
export const getPointCloudAtom = atomFamily((brainRegionAnnotationValue: number) =>
  atom(async (get) => {
    const session = await get(sessionAtom);
    if (!session) {
      return null;
    }

    const url = `${cellSvcBaseUrl}/circuit?circuit_id=${encodeURIComponent(
      env.NEXT_PUBLIC_LEGACY_DEFAULT_CIRCUIT_ID || ''
    )}&region=${brainRegionAnnotationValue}&how=arrow`;
    return await fetchPointCloud(url, session.accessToken);
  })
);
