import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  IEMCellMesh,
  IEMCellMeshCreate,
  IEmCellMeshQueryFilters,
} from '@/api/entitycore/types/entities/em-cell-mesh';
import type { TMeasurableEntityExpandParam } from '@/api/entitycore/types/shared/expand';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

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
  expand,
}: {
  withFacets?: boolean;
  filters?: IEmCellMeshQueryFilters;
  context?: WorkspaceContext | null;
  expand?: ReadonlyArray<TMeasurableEntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IEMCellMesh>>(baseUri, {
    queryParams: {
      expand,
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
  expand,
}: {
  id: string;
  context?: WorkspaceContext | null;
  expand?: ReadonlyArray<TMeasurableEntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<IEMCellMesh>(`${baseUri}/${id}`, {
    queryParams: { expand },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

export async function createEMCellMesh({
  context,
  payload,
}: {
  context?: WorkspaceContext | null;
  payload: IEMCellMeshCreate;
}) {
  const api = await entityCoreApi();
  return await api.post<IEMCellMesh>(baseUri, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: payload,
  });
}
