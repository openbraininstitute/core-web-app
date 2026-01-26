import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';
import type {
  IEmCellMeshQueryFilters,
  IEMCellMesh,
} from '@/api/entitycore/types/entities/em-cell-mesh';

const baseUri = '/em-cell-mesh';
/**
 * Retrieves a list of EM cell meshes from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {CellMorphologyFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<ICellMorphology>>} A promise that resolves to the list of EM cell meshes
 */
export async function getEmCellMeshes({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: IEmCellMeshQueryFilters;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IEMCellMesh>>(baseUri, {
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
 * Retrieves a specific EM cell mesh by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the EM cell mesh to retrieve
 * @returns {Promise<IEMCellMesh>} A promise that resolves to the requested EM cell mesh
 */
export async function getEmCellMesh({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IEMCellMesh>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
