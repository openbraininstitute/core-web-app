import type {
  IEMDenseReconstructionDatasetFilter,
  IEmDenseReconstructionDataset,
} from '@/api/entitycore/types/entities/em-dense-reconstruction-dataset';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/em-dense-reconstruction-dataset';

/**
 * Fetch EM dense reconstruction datasets from the Entity Core API.
 *
 * @param options.withFacets - If true, include facet information in the response.
 * @param options.filters - Optional filters to apply to the dataset query (IEMDenseReconstructionDatasetFilter).
 * @param options.context - Optional WorkspaceContext (or null) used to populate request headers.
 * @returns A promise that resolves to an EntityCoreResponse<IEmDenseReconstructionDataset>.
 * @throws If the API client or network request fails.
 */
export async function getEmDenseReconstructionDatasets({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: IEMDenseReconstructionDatasetFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IEmDenseReconstructionDataset>>(baseUri, {
    queryParams: {
      ...filters,
      with_facets: withFacets,
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Fetches an EM dense reconstruction dataset by its identifier from the Entity Core API.
 *
 * @param params - Parameters for the request.
 * @param params.id - The unique identifier of the EM dense reconstruction dataset to retrieve.
 * @param params.context - Optional workspace context used to populate request headers; may be null or omitted.
 * @returns A promise that resolves with the requested IEmDenseReconstructionDataset.
 * @throws Will reject if the underlying API call fails (network error or non-successful HTTP response).
 *
 * @example
 * const dataset = await getEmDenseReconstructionDataset({ id: "dataset-id-123", context });
 */
export async function getEmDenseReconstructionDataset({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IEmDenseReconstructionDataset>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
