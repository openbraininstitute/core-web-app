import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  MeasurementAnnotation,
  MeasurementAnnotationFilter,
} from '@/api/entitycore/types/entities/measurement-annotation';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/measurement-annotation';

/**
 * Retrieves a list of measurement annotations from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {MeasurementAnnotationFilter} [options.filters] - Optional filters to apply to the query
 * @param {WorkspaceContext | null} [options.context] - Optional context for the request
 *
 * @returns {Promise<EntityCoreResponse<MeasurementAnnotation>>} A promise that resolves to the list of cell morphologies
 */
export async function getMeasurementAnnotations({
  filters,
  context,
}: {
  filters?: MeasurementAnnotationFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<MeasurementAnnotation>>(baseUri, {
    queryParams: filters,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a specific measurement annotation by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the cell morphology to retrieve
 * @param {WorkspaceContext | null} [params.context] - Optional context for the request
 *
 * @returns {Promise<MeasurementAnnotation>} A promise that resolves to the requested measurement annotation
 */
export async function getMeasurementAnnotation({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<MeasurementAnnotation>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
