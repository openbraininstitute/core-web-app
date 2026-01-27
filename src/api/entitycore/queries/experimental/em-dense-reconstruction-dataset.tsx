import type { IEMDenseReconstructionDatasetFilter } from '@/api/entitycore/types/shared/em-dense-reconstruction-dataset';
import type { IEMDenseReconstructionDataset } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { WorkspaceContext } from '@/types/common';
import { compactRecord } from '@/utils/dictionary';

const baseUri = '/em-dense-reconstruction-dataset';

/**
 * Retrieves EMDenseReconstructionDatasets from the Entity Core API.
 *
 * @param filters - Optional filters to apply to the EMDenseReconstructionDataset query.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the EMDenseReconstructionDatasets.
 */
export async function getEMDenseReconstructionDatasets({
  filters,
  context,
}: {
  filters?: Partial<IEMDenseReconstructionDatasetFilter>;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<IEMDenseReconstructionDataset>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IEMDenseReconstructionDataset>>(baseUri, {
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

/**
 * Retrieves a EMDenseReconstructionDataset from the Entity Core API.
 *
 * @param id - The ID of the EMDenseReconstructionDataset to retrieve.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the EMDenseReconstructionDataset.
 */
export async function getEMDenseReconstructionDataset({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<IEMDenseReconstructionDataset>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IEMDenseReconstructionDataset>>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
