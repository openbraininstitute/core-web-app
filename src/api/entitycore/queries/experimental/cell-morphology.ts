import z from 'zod';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type {
  ExpandCellMorphologyParm,
  CellMorphologyFilter,
  ICellMorphology,
  ICellMorphologyExpanded,
} from '@/api/entitycore/types/entities/cell-morphology';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/cell-morphology';
/**
 * Retrieves a list of cell morphologies from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {CellMorphologyFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<ICellMorphology>>} A promise that resolves to the list of cell morphologies
 */
export async function getCellMorphologies({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: CellMorphologyFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<
    EntityCoreResponse<ICellMorphology | ICellMorphologyExpanded>
  >(baseUri, {
    queryParams: {
      ...filters,
      with_facets: withFacets,
    },
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a specific cell morphology by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the cell morphology to retrieve
 * @param {ExpandCellMorphologyParm} params.expand - Parameter to specify if the morphology should be expanded
 * @returns {Promise<ICellMorphology | ICellMorphologyExpanded>} A promise that resolves to the requested cell morphology
 */
export async function getCellMorphology({
  id,
  expand,
  context,
}: {
  id: string;
  expand?: ExpandCellMorphologyParm;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ICellMorphology | ICellMorphologyExpanded>(
    `${baseUri}/${id}`,
    {
      queryParams: {
        expand,
      },
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        ...getEntityCoreContext(context).headers,
      },
    },
  );
}

const cellMorphologySchema = z.object({
  name: z
    .string({ message: 'Cell morphology name is required' })
    .nonempty({ message: 'Cell morphology name is required' }),
  description: z
    .string({ message: 'Cell morphology description is required' })
    .nonempty({ message: 'Cell morphology description is required' }),
  brain_region_id: z
    .string({ message: 'Brain region is required' })
    .uuid()
    .nonempty({ message: 'Brain region is required' }),
  subject_id: z
    .string({ message: 'Subject is required' })
    .uuid()
    .nonempty({ message: 'Subject is required' }),
  cell_morphology_protocol_id: z
    .string({ message: 'Protocol is required' })
    .uuid()
    .nonempty({ message: 'Protocol is required' }),
  license_id: z
    .string({ message: 'License is required' })
    .uuid()
    .nonempty({ message: 'License is required' }),
  experiment_date: z
    .string({ message: 'Experiment date is required' })
    .nullish(),
  contact_email: z
    .string({ message: 'Contact email is required' })
    .email({ message: 'Contact email is required' })
    .nullish(),
  published_in: z.string({ message: 'Published in is required' }).nullish(),
  location: z
    .object({ x: z.number(), y: z.number(), z: z.number() })
    .nullable(),
});

export type TCellMorphologyCreate = z.infer<typeof cellMorphologySchema>;

/**
 * Creates a new cell morphology
 * @param param0
 * @returns A promise that resolves to the created cell morphology
 */
export async function createCellMorphology({
  context,
  payload,
}: {
  context?: WorkspaceContext | null;
  payload: TCellMorphologyCreate;
}) {
  const api = await entityCoreApi();
  return await api.post<ICellMorphology>(baseUri, {
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: payload,
  });
}
