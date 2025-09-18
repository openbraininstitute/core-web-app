import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type {
  ElectricalCellRecordingFilter,
  IElectricalCellRecording,
} from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/electrical-cell-recording';
/**
 * Retrieves a list of electrical cell recordings from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {ElectricalCellRecordingFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IElectricalCellRecording>>} A promise that resolves to the list of electrical cell recordings
 */
export async function getElectricalCellRecordings({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: ElectricalCellRecordingFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IElectricalCellRecording>>(baseUri, {
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
 * @returns {Promise<IElectricalCellRecording>} A promise that resolves to the requested recording
 */
export async function getElectricalCellRecording({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IElectricalCellRecording>(`${baseUri}/${id}`, {
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
