import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  IExecutionActivity,
  IExecutionActivityFilter,
  TCreateCircuitExtractionExecution,
  TUpdateExecutionActivity,
} from '@/api/entitycore/types/entities/execution';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/ion-channel-modeling-execution';

/**
 * Retrieves a list of ion channel modeling executions from the EntityCoreAPI.
 */
export async function getIonChannelModelingExecutions({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<IExecutionActivityFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IExecutionActivity>>(baseUri, {
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
 * Retrieves a specific ion channel modeling execution by its ID.
 */
export async function getIonChannelModelingExecution({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IExecutionActivity>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Creates a new ion channel modeling execution.
 */
export async function createIonChannelModelingExecution({
  data,
  context,
}: {
  data: TCreateCircuitExtractionExecution;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<IExecutionActivity>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Updates an existing ion channel modeling execution.
 */
export async function updateIonChannelModelingExecution({
  id,
  data,
  context,
}: {
  id: string;
  data: TUpdateExecutionActivity;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<IExecutionActivity>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Deletes an ion channel modeling execution by its ID.
 */
export async function deleteIonChannelModelingExecution({
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
