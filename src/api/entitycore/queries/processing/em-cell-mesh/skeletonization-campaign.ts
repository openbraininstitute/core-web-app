import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  IEMCellMeshSkeletonizationCampaign,
  IEMCellMeshSkeletonizationCampaignFilter,
  TCreateEMCellMeshSkeletonizationCampaign,
  TUpdateEMCellMeshSkeletonizationCampaign,
} from '@/api/entitycore/types/entities/em-cell-mesh-skeletonization-campaign';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/skeletonization-campaign';

export async function getSkeletonizationCampaign({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IEMCellMeshSkeletonizationCampaign>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

export async function getSkeletonizationCampaigns({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<IEMCellMeshSkeletonizationCampaignFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IEMCellMeshSkeletonizationCampaign>>(baseUri, {
    queryParams: compactRecord({
      ...filters,
      with_facets: withFacets,
    }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

export async function createSkeletonizationCampaign({
  data,
  context,
}: {
  data: TCreateEMCellMeshSkeletonizationCampaign;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<IEMCellMeshSkeletonizationCampaign>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

export async function updateSkeletonizationCampaign({
  id,
  data,
  context,
}: {
  id: string;
  data: TUpdateEMCellMeshSkeletonizationCampaign;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<IEMCellMeshSkeletonizationCampaign>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

export async function deleteSkeletonizationCampaign({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.delete(`${baseUri}/${id}`, {
    headers: {
      ...getEntityCoreContext(context).headers,
      accept: 'application/json',
    },
  });
}
