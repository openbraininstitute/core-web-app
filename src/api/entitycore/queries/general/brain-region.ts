import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { config } from '@/config';

import type {
  IBrainRegion,
  IBrainRegionFilter,
  IBrainRegionHierarchy,
  IBrainRegionHierarchyObject,
} from '@/api/entitycore/types/entities/brain-region';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';
import type { IBrainRegionHierarchyRequestFilter } from '../../types/shared/request';

/**
 * Retrieves the brain region hierarchy from the entity core API.
 *
 * @param params - An object containing the name of the brain region hierarchy to fetch.
 * @param params.name - The name of the brain region hierarchy. Defaults to 'aibs'.
 * @returns A promise that resolves to the brain region hierarchy data.
 */
export async function getBrainRegionHierarchy({
  id = config.DEFAULT_BRAIN_REGION_HIERARCHY_ID,
}: {
  id?: string;
}) {
  const api = await entityCoreApi();
  return await api.get<IBrainRegionHierarchy>(`/brain-region-hierarchy/${id}/hierarchy`);
}

export async function getBrainRegionHierarchies({
  context,
  filters,
}: {
  context?: WorkspaceContext | null;
  filters?: Partial<IBrainRegionHierarchyRequestFilter>;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IBrainRegionHierarchyObject>>(`/brain-region-hierarchy`, {
    queryParams: {
      ...filters,
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

export async function getBrainRegion({ id }: { id?: string }) {
  const api = await entityCoreApi();
  return await api.get<IBrainRegion>(`/brain-region/${id}`);
}

export async function getBrainRegions({
  context,
  filters,
}: {
  id?: string;
  context?: WorkspaceContext | null;
  filters?: Partial<IBrainRegionFilter>;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IBrainRegion>>(`/brain-region`, {
    queryParams: {
      ...filters,
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
