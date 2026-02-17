import type {
  ISkeletonizationConfigGeneration,
  ISkeletonizationConfigGenerationFilter,
  TCreateSkeletonizationConfigGeneration,
  TUpdateSkeletonizationConfigGeneration,
} from '@/api/entitycore/types/entities/skeletonization-config-generation';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { WorkspaceContext } from '@/types/common';
import { compactRecord } from '@/utils/dictionary';

const baseUri = '/skeletonization-config-generation';

export async function getSkeletonizationConfigGeneration({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ISkeletonizationConfigGeneration>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

export async function getSkeletonizationConfigGenerations({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ISkeletonizationConfigGenerationFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISkeletonizationConfigGeneration>>(baseUri, {
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

export async function createSkeletonizationConfigGeneration({
  data,
  context,
}: {
  data: TCreateSkeletonizationConfigGeneration;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<ISkeletonizationConfigGeneration>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

export async function updateSkeletonizationConfigGeneration({
  id,
  data,
  context,
}: {
  id: string;
  data: TUpdateSkeletonizationConfigGeneration;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<ISkeletonizationConfigGeneration>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

export async function deleteSkeletonizationConfigGeneration({
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
