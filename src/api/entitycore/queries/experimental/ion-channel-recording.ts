import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type {
  IonChannelRecordingFilter,
  IIonChannelRecording,
} from '@/api/entitycore/types/entities/ion-channel-recording';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/electrical-cell-recording';
/**
 * Retrieves a list of electrical cell recordings from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {IonChannelRecordingFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IIonChannelRecording>>} A promise that resolves to the list of electrical cell recordings
 */
export async function getIonChannelRecordings({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: IonChannelRecordingFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IIonChannelRecording>>(baseUri, {
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
 * Retrieves a specific electrical cell recording by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the recording to retrieve
 * @returns {Promise<IIonChannelRecording>} A promise that resolves to the requested recording
 */
export async function getIonChannelRecording({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IIonChannelRecording>(`${baseUri}/${id}`, {
    // TODO: add expand parameter if/when supported by the API
    // queryParams: {
    //   expand,
    // },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
