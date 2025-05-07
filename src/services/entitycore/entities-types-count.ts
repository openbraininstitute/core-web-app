import type { BulkEntityCoreCountResult } from '@/app/api/entity-core/entities/count/route';

export const getBulkEntityCoreCount = async ({
  virtualLabId,
  projectId,
  brainRegion,
}: {
  virtualLabId?: string;
  projectId?: string;
  brainRegion?: string | null;
}): Promise<BulkEntityCoreCountResult> => {
  const searchParam = new URLSearchParams();
  if (virtualLabId) searchParam.set('virtualLabId', virtualLabId);
  if (projectId) searchParam.set('projectId', projectId);
  if (brainRegion) searchParam.set('brainRegion', brainRegion);
  try {
    const result = await fetch(`/api/entity-core/entities/count?${searchParam.toString()}`);
    return await result.json();
  } catch (error) {
    throw error;
  }
};
