'use client';

import { atomFamily, atomWithRefresh } from 'jotai/utils';
import { useAtomValue } from 'jotai';

import { ElectricalRecordingOriginDictionary } from '@/api/entitycore/types/entities/electrical-cell-recording';
import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  DEFAULT_BRAIN_REGION_HIERARCHY_ID,
} from '@/features/brain-region-hierarchy/context';
import { getEntitiesCount } from '@/api/entitycore/queries/general/entity';
import { findParentIds } from '@/features/brain-region-hierarchy/helpers';
import { getElectricalCellRecordings } from '@/api/entitycore/queries';
import { tempIsCircuitInDev } from '@/temp-circuit-check';
import { EntityTypeEnum } from '@/api/entitycore/types';
import { tryCatch } from '@/api/utils';

import type { EntityCountResponse } from '@/api/entitycore/types/entities/entity';
import type { WorkspaceContext } from '@/types/common';

type Params = WorkspaceContext & {
  brainRegionId?: string | null;
};

const entitiesCountKey = ({ virtualLabId, projectId, brainRegionId }: Params) => {
  const key = `entities-count/${virtualLabId}/${projectId}/${brainRegionId}`;
  return key;
};

const isListAtomEqual = (a: Params, b: Params): boolean =>
  entitiesCountKey(a) === entitiesCountKey(b);

export const entitiesCountAtom = atomFamily(
  ({ brainRegionId, virtualLabId, projectId }: Params) => {
    const childAtom = atomWithRefresh(async () => {
      const { data: restData, error: restError } = await tryCatch(
        getEntitiesCount({
          context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
          types: [
            'experimental_synapses_per_connection',
            'experimental_neuron_density',
            'experimental_bouton_density',
            'cell_morphology',
            'single_neuron_synaptome',
            'memodel',
            'emodel',
            ...(tempIsCircuitInDev() ? (['circuit'] as const) : []),
          ],
          brainRegion: {
            within_brain_region_hierarchy_id: DEFAULT_BRAIN_REGION_HIERARCHY_ID,
            within_brain_region_brain_region_id: brainRegionId ?? null,
            within_brain_region_ascendants: false,
          },
        })
      );
      const { data: ephysData, error: ephysError } = await tryCatch(
        getElectricalCellRecordings({
          withFacets: false,
          context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
          filters: {
            recording_origin: ElectricalRecordingOriginDictionary.InVitro,
            page: 1,
            page_size: 1,
            within_brain_region_hierarchy_id: DEFAULT_BRAIN_REGION_HIERARCHY_ID,
            within_brain_region_brain_region_id: brainRegionId ?? null,
            within_brain_region_ascendants: false,
          },
        })
      );

      const data: EntityCountResponse = {} as EntityCountResponse;
      let error = null;

      if (restData) Object.assign(data, restData);
      if (ephysData)
        Object.assign(data, {
          [EntityTypeEnum.ElectricalCellRecording]: ephysData.pagination.total_items,
        });

      if (ephysError || restError) error = restError ?? ephysError;
      return { data, error };
    });
    childAtom.debugLabel = `count-atom/${brainRegionId}`;
    return childAtom;
  },
  isListAtomEqual
);

export const useEntitiesCountAtom = () => {
  const keys = [...entitiesCountAtom.getParams()];
  const brainRegionHierarchyResult = useAtomValue(brainRegionBasicCellGroupsRegionsHierarchyAtom);

  return function refreshEntityCountsToParent(brainRegionId: string) {
    if (brainRegionHierarchyResult) {
      const parents = findParentIds(brainRegionHierarchyResult.root, brainRegionId);
      const filterKeys = keys.filter((o) => {
        if (o.brainRegionId) return parents.includes(o.brainRegionId);
        return false;
      });

      filterKeys.forEach((key) => {
        entitiesCountAtom.remove(key);
      });
    }
  };
};
