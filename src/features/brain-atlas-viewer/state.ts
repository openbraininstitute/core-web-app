import { atomFamily, atomWithReset } from 'jotai/utils';
import { atom } from 'jotai';
import uniqBy from 'lodash/uniqBy';
import sessionAtom from '@/state/session';

import { LoadingState, MeshVisibility, VisibilityType } from '@/features/brain-atlas-viewer/types';
import { fetchPointCloud } from '@/features/brain-atlas-viewer/api';
import { ApplicationSection } from '@/types/common';
import { cellSvcBaseUrl } from '@/config';
import { env } from '@/env';

export const meshVisibilityAtom = atomFamily(() => atomWithReset<MeshVisibility[]>([]));

export const addMeshVisibilityAtom = atom(
  null,
  (
    get,
    set,
    section: ApplicationSection,
    brainRegionId: string,
    type: VisibilityType,
    sceneId: string
  ) => {
    const visibility = get(meshVisibilityAtom(section));
    set(
      meshVisibilityAtom(section),
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
 * @param brainRegionId
 * @param circuitConfigPathOverride
 */
export const getPointCloudAtom = (brainRegionAnnotationValue: number) =>
  atom(async (get) => {
    const session = await get(sessionAtom);
    if (!session) {
      return null;
    }

    const url = `${cellSvcBaseUrl}/circuit?circuit_id=${encodeURIComponent(
      env.NEXT_PUBLIC_LEGACY_DEFAULT_CIRCUIT_ID || ''
    )}&region=${brainRegionAnnotationValue}&how=arrow`;
    return await fetchPointCloud(url, session.accessToken);
  });

export const loadingAtom = atom<Record<ApplicationSection, LoadingState[]>>({
  explore: [],
  build: [],
  simulate: [],
});

export const addLoadingAtom = atom(
  null,
  (get, set, section: ApplicationSection, brainRegionId: string, type: VisibilityType) => {
    const loading = get(loadingAtom);
    if (!loading[section].find((l) => l.id === brainRegionId && l.type === type)) {
      set(loadingAtom, {
        ...loading,
        [section]: [...loading[section], { id: brainRegionId, type }],
      });
    }
  }
);

export const disableLoadingAtom = atom(
  null,
  (get, set, section: ApplicationSection, brainRegionId: string, type: VisibilityType) => {
    const loading = get(loadingAtom);
    set(loadingAtom, {
      ...loading,
      [section]: [...loading[section].filter((l) => l.id !== brainRegionId || l.type !== type)],
    });
  }
);
