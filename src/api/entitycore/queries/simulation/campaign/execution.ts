import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  ISimulationExecution,
  ISimulationExecutionFilter,
  ISimulationExecutionCreate,
} from '@/api/entitycore/types/entities/simulation';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/simulation-execution';

export async function getSimulationExecutions({
  filters,
  context,
  withFacets,
}: {
  filters?: Partial<ISimulationExecutionFilter>;
  context?: WorkspaceContext | null;
  withFacets?: boolean;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISimulationExecution>>(baseUri, {
    queryParams: compactRecord({ ...filters, with_facets: withFacets }),
    headers: { ...getEntityCoreContext(context).headers },
  });
}

export async function getSimulationExecution({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ISimulationExecution>(`${baseUri}/${id}`, {
    headers: { ...getEntityCoreContext(context).headers },
  });
}

export async function createSimulationExecution({
  data,
  context,
}: {
  data: ISimulationExecutionCreate;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<ISimulationExecution>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

export async function updateSimulationExecution({
  id,
  data,
  context,
}: {
  id: string;
  data: Partial<ISimulationExecution>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<ISimulationExecution>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

export async function deleteSimulationExecution({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.delete<void>(`${baseUri}/${id}`, {
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}
