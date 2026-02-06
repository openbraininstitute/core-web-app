import z from 'zod';
import type {
  EMCellMeshFilter,
  ExpandEMCellMeshParm,
  IEMCellMesh,
  IEMCellMeshExpanded,
  IEmCellMeshQueryFilters,
} from '@/api/entitycore/types/entities/em-cell-mesh';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
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

///

const EMCellMeshSchema = z.object({
  name: z
    .string({ message: 'Cell mesh name is required' })
    .nonempty({ message: 'Cell mesh name is required' }),
  description: z
    .string({ message: 'Cell mesh description is required' })
    .nonempty({ message: 'Cell mesh description is required' }),
  brain_region_id: z
    .string({ message: 'Brain region is required' })
    .uuid()
    .nonempty({ message: 'Brain region is required' }),
  subject_id: z
    .string({ message: 'Subject is required' })
    .uuid()
    .nonempty({ message: 'Subject is required' }),
  license_id: z
    .string({ message: 'License is required' })
    .uuid()
    .nonempty({ message: 'License is required' }),
  experiment_date: z.string({ message: 'Experiment date is required' }).nullish(),
  contact_email: z
    .string({ message: 'Contact email is required' })
    .email({ message: 'Contact email is required' })
    .nullish(),
  published_in: z.string({ message: 'Published in is required' }).nullish(),
  location: z.object({ x: z.number(), y: z.number(), z: z.number() }).nullable(),
});

export type TEMCellMeshCreate = z.infer<typeof EMCellMeshSchema>;

/**
 * Creates a new cell morphology
 * @param param0
 * @returns A promise that resolves to the created cell morphology
 */
export async function createEMCellMesh({
  context,
  payload,
}: {
  context?: WorkspaceContext | null;
  payload: TEMCellMeshCreate;
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
