import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type { IElectricalRecordingStimulusFilter } from '@/api/entitycore/types/shared/electricalrecordingstimulus';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { IElectricalRecordingStimulus } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/electrical-recording-stimulus';

/**
 * Retrieves licenses from the Entity Core API.
 *
 * @param filters - Optional filters to apply to the licenses query.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the licenses.
 */
export async function getElectricalRecordingStimulus({
  filters,
  context,
}: {
  filters?: Partial<IElectricalRecordingStimulusFilter>;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<IElectricalRecordingStimulus>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IElectricalRecordingStimulus>>(baseUri, {
    queryParams: compactRecord({
      ...filters,
    }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
