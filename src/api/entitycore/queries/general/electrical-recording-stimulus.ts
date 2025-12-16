import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type {
  IElectricalRecordingStimulusFilter,
  IElectricalRecordingStimulus,
} from '@/api/entitycore/types/shared/electrical-recording-stimulus';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/electrical-recording-stimulus';

/**
 * Retrieves electrical recording stimuli from the Entity Core API.
 *
 * @param filters - Optional filters to apply to the electrical recording stimuli query.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the electrical recording stimuli.
 */
export async function getElectricalRecordingStimulus({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<IElectricalRecordingStimulusFilter>;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<IElectricalRecordingStimulus>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IElectricalRecordingStimulus>>(baseUri, {
    queryParams: compactRecord({
      with_facets: withFacets,
      ...filters,
    }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
