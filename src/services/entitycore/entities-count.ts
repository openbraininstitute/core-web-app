'use client';

import { atomFamily, atomWithRefresh } from 'jotai/utils';

import { getBulkEntityCoreResult } from '@/app/api/entity-core/entities/count/route';
import { tryCatch } from '@/api/utils';

import type { ExperimentalDataType } from '@/entity-configuration/domain/experimental';
import type { ModelDataType } from '@/entity-configuration/domain/model';

export type BulkEntityCoreCountResult = {
  experimental: Record<ExperimentalDataType, number | string>;
  model: Record<ModelDataType, number | string>;
};

type Params = {
  virtualLabId?: string;
  projectId?: string;
  brainRegionId?: string | null;
};

export const getBulkEntityCoreCount = async ({
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

  try {
    const result = await fetch(url);
    return await result.json();
  } catch (error) {
    throw error;
  }
};

const entitiesCountKey = ({ virtualLabId, projectId, brainRegionId }: Params) => {
  const key = `entities-count/${virtualLabId}/${projectId}/${brainRegionId}`;
  return key;
};

const isListAtomEqual = (a: Params, b: Params): boolean =>
  entitiesCountKey(a) === entitiesCountKey(b);

export const EntitiesCountAtom = atomFamily(
  ({ brainRegionId, virtualLabId, projectId }: Params) =>
    atomWithRefresh(async () => {
      const { data, error } = await tryCatch(
        getBulkEntityCoreResult({
          context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
          brainRegionId,
        })
      );
      return { data, error };
    }),
  isListAtomEqual
);
