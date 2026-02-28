import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  IIonChannelModelingConfig,
  IIonChannelModelingConfigFilter,
  TCreateIonChannelModelingConfig,
  TUpdateIonChannelModelingConfig,
} from '@/api/entitycore/types/entities/ion-channel-modeling-config';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/ion-channel-modeling-config';

/**
 * Retrieves a list of ion channel modeling configs from the EntityCoreAPI.
 */
export async function getIonChannelModelingConfigs({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<IIonChannelModelingConfigFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IIonChannelModelingConfig>>(baseUri, {
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
 * Retrieves a specific ion channel modeling config by its ID.
 */
export async function getIonChannelModelingConfig({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IIonChannelModelingConfig>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Creates a new ion channel modeling config.
 */
export async function createIonChannelModelingConfig({
  data,
  context,
}: {
  data: TCreateIonChannelModelingConfig;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<IIonChannelModelingConfig>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Updates an existing ion channel modeling config.
 */
export async function updateIonChannelModelingConfig({
  id,
  data,
  context,
}: {
  id: string;
  data: TUpdateIonChannelModelingConfig;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<IIonChannelModelingConfig>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Deletes an ion channel modeling config by its ID.
 */
export async function deleteIonChannelModelingConfig({
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
