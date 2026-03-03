import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  IIonChannelModelingConfigGeneration,
  IIonChannelModelingConfigGenerationFilter,
  TCreateIonChannelModelingConfigGeneration,
  TUpdateIonChannelModelingConfigGeneration,
} from '@/api/entitycore/types/entities/ion-channel-modeling-config-generation';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/ion-channel-modeling-config-generation';

/**
 * Retrieves a list of ion channel modeling config generations from the EntityCoreAPI.
 */
export async function getIonChannelModelingConfigGenerations({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<IIonChannelModelingConfigGenerationFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IIonChannelModelingConfigGeneration>>(baseUri, {
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

/**
 * Retrieves a specific ion channel modeling config generation by its ID.
 */
export async function getIonChannelModelingConfigGeneration({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IIonChannelModelingConfigGeneration>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Creates a new ion channel modeling config generation.
 */
export async function createIonChannelModelingConfigGeneration({
  data,
  context,
}: {
  data: TCreateIonChannelModelingConfigGeneration;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<IIonChannelModelingConfigGeneration>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Updates an existing ion channel modeling config generation.
 */
export async function updateIonChannelModelingConfigGeneration({
  id,
  data,
  context,
}: {
  id: string;
  data: TUpdateIonChannelModelingConfigGeneration;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<IIonChannelModelingConfigGeneration>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Deletes an ion channel modeling config generation by its ID.
 */
export async function deleteIonChannelModelingConfigGeneration({
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
