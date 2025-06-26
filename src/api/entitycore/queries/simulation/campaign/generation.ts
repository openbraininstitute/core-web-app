import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  ISimulationGeneration,
  ISimulationGenerationFilter,
  ISimulationGenerationCreate,
} from '@/api/entitycore/types/entities/simulation';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/simulation-generation';

export async function getSimulationGenerations({
  filters,
  context,
  withFacets,
}: {
  filters?: Partial<ISimulationGenerationFilter>;
  context?: WorkspaceContext | null;
  withFacets?: boolean;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISimulationGeneration>>(baseUri, {
    queryParams: compactRecord({ ...filters, with_facets: withFacets }),
    headers: { ...getEntityCoreContext(context).headers },
  });
}

export async function getSimulationGeneration({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ISimulationGeneration>(`${baseUri}/${id}`, {
    headers: { ...getEntityCoreContext(context).headers },
  });
}

export async function createSimulationGeneration({
  data,
  context,
}: {
  data: ISimulationGenerationCreate;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<ISimulationGeneration>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

export async function updateSimulationGeneration({
  id,
  data,
  context,
}: {
  id: string;
  data: Partial<ISimulationGeneration>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<ISimulationGeneration>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

export async function deleteSimulationGeneration({
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
