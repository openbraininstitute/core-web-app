import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { ISimulation, ISimulationFilter } from '@/api/entitycore/types/entities/simulation';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/simulation';

export async function getSimulations({
  filters,
  context,
  withFacets,
}: {
  filters?: Partial<ISimulationFilter>;
  context?: WorkspaceContext | null;
  withFacets?: boolean;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISimulation>>(baseUri, {
    queryParams: compactRecord({ ...filters, with_facets: withFacets }),
    headers: { ...getEntityCoreContext(context).headers },
  });
}

export async function getSimulation(id: string, context?: WorkspaceContext | null) {
  const api = await entityCoreApi();
  return await api.get<ISimulation>(`${baseUri}/${id}`, {
    headers: { ...getEntityCoreContext(context).headers },
  });
}

export async function createSimulation(
  data: Partial<ISimulation>,
  context?: WorkspaceContext | null
) {
  const api = await entityCoreApi();
  return await api.post<ISimulation>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}
