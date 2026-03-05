import { entityCoreApi, getEntityCoreContext } from "@/api/entitycore/utils";
import { compactRecord } from "@/utils/dictionary";

import type {
  IIonChannelModelingCampaign,
  IonChannelModelingCampaignFilter,
  TCreateIonChannelModelingCampaign,
  TUpdateIonChannelModelingCampaign,
} from "@/api/entitycore/types/entities/ion-channel-modeling-campaign";
import type { EntityCoreResponse } from "@/api/entitycore/types/shared/response";
import type { WorkspaceContext } from "@/types/common";

const baseUri = "/ion-channel-modeling-campaign";

/**
 * Retrieves a list of ion channel modeling campaigns from the EntityCoreAPI.
 */
export async function getIonChannelModelingCampaigns({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<IonChannelModelingCampaignFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IIonChannelModelingCampaign>>(
    baseUri,
    {
      queryParams: compactRecord({
        ...filters,
        with_facets: withFacets,
      }),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...getEntityCoreContext(context).headers,
      },
    },
  );
}

/**
 * Retrieves a specific ion channel modeling campaign by its ID.
 */
export async function getIonChannelModelingCampaign({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IIonChannelModelingCampaign>(`${baseUri}/${id}`, {
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Creates a new ion channel modeling campaign.
 */
export async function createIonChannelModelingCampaign({
  data,
  context,
}: {
  data: TCreateIonChannelModelingCampaign;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<IIonChannelModelingCampaign>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      "content-type": "application/json",
      accept: "application/json",
    },
  });
}

/**
 * Updates an existing ion channel modeling campaign.
 */
export async function updateIonChannelModelingCampaign({
  id,
  data,
  context,
}: {
  id: string;
  data: TUpdateIonChannelModelingCampaign;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<IIonChannelModelingCampaign>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      "content-type": "application/json",
      accept: "application/json",
    },
  });
}

/**
 * Deletes an ion channel modeling campaign by its ID.
 */
export async function deleteIonChannelModelingCampaign({
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
      accept: "application/json",
    },
  });
}
