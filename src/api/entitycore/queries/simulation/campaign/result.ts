import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  ISimulationResult,
  ISimulationFilter,
} from '@/api/entitycore/types/entities/simulation';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/simulation-result';

export async function getSimulationResults({
  filters,
  context,
  withFacets,
}: {
  filters?: Partial<ISimulationFilter>;
  context?: WorkspaceContext | null;
  withFacets?: boolean;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISimulationResult>>(baseUri, {
    queryParams: compactRecord({ ...filters, with_facets: withFacets }),
    headers: { ...getEntityCoreContext(context).headers },
  });
}

export async function getSimulationResult({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ISimulationResult>(`${baseUri}/${id}`, {
    headers: { ...getEntityCoreContext(context).headers },
  });
}

export async function createSimulationResult({
  data,
  context,
}: {
  data: Partial<ISimulationResult>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<ISimulationResult>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}
