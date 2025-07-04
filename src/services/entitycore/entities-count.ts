'use client';

import { atomFamily, atomWithRefresh } from 'jotai/utils';

import { useAtomValue } from 'jotai';
import { getBulkEntityCoreResult } from '@/app/api/entity-core/entities/count/route';
import { findParentIds } from '@/features/brain-region-hierarchy/helpers';
import { tryCatch } from '@/api/utils';

import type { ExperimentalDataType } from '@/entity-configuration/domain/experimental';
import type { ModelDataType } from '@/entity-configuration/domain/model';
import { brainRegionBasicCellGroupsRegionsHierarchyAtom } from '@/features/brain-region-hierarchy/context';

export type BulkEntityCoreCountResult = {
  experimental: Record<ExperimentalDataType, number | string>;
  model: Record<ModelDataType, number | string>;
};

type Params = {
  virtualLabId?: string;
  projectId?: string;
  brainRegionId?: string | null;
};

const getBulkEntityCoreCount = async ({
  virtualLabId,
  projectId,
  brainRegionId,
}: Params): Promise<BulkEntityCoreCountResult> => {
  const searchParam = new URLSearchParams();
  if (virtualLabId) searchParam.set('virtualLabId', virtualLabId);
  if (projectId) searchParam.set('projectId', projectId);
  if (brainRegionId) searchParam.set('brainRegionId', brainRegionId);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl}/api/entitycore/entities/count?${searchParam.toString()}`;

  const result = await fetch(url);
  return await result.json();
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
      const { data, error } = await tryCatch(
        getBulkEntityCoreResult({
          context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
          brainRegionId,
        })
      );
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
