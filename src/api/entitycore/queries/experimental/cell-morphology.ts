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
  return await api.get<EntityCoreResponse<ICellMorphology | ICellMorphologyExpanded>>(baseUri, {
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
  return await api.get<ICellMorphology | ICellMorphologyExpanded>(`${baseUri}/${id}`, {
    queryParams: {
      expand,
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

const cellMorphologySchema = z.object({
  name: z
    .string({
      error: 'Cell morphology name is required',
    })
    .nonempty({
      error: 'Cell morphology name is required',
    }),
  description: z
    .string({
      error: 'Cell morphology description is required',
    })
    .nonempty({
      error: 'Cell morphology description is required',
    }),
  brain_region_id: z.uuid().nonempty({
    error: 'Brain region is required',
  }),
  subject_id: z.uuid().nonempty({
    error: 'Subject is required',
  }),
  license_id: z.uuid().nonempty({
    error: 'License is required',
  }),
  experiment_date: z
    .string({
      error: 'Experiment date is required',
    })
    .nullish(),
  contact_email: z
    .email({
      error: 'Contact email is required',
    })
    .nullish(),
  published_in: z
    .string({
      error: 'Published in is required',
    })
    .nullish(),
  location: z.object({ x: z.number(), y: z.number(), z: z.number() }).nullable(),
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
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: payload,
  });
}
