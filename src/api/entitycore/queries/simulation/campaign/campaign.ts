import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  ISimulationCampaign,
  ISimulationCampaignFilter,
  ISimulationCampaignCreate,
} from '@/api/entitycore/types/entities/simulation';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/simulation-campaign';

export async function getSimulationCampaigns({
  filters,
  context,
  withFacets,
}: {
  filters?: Partial<ISimulationCampaignFilter>;
  context?: WorkspaceContext | null;
  withFacets?: boolean;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISimulationCampaign>>(baseUri, {
    queryParams: compactRecord({ ...filters, with_facets: withFacets }),
    headers: { ...getEntityCoreContext(context).headers },
  });
}

export async function getSimulationCampaign({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ISimulationCampaign>(`${baseUri}/${id}`, {
    headers: { ...getEntityCoreContext(context).headers },
  });
}

export async function createSimulationCampaign({
  data,
  context,
}: {
  data: ISimulationCampaignCreate;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<ISimulationCampaign>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}
