import z from 'zod';

import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type {
  ExperimentalBoutonDensityFilter,
  IExperimentalBoutonDensity,
} from '@/api/entitycore/types/entities/bouton-density';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/experimental-bouton-density';
/**
 * Retrieves a list of bouton density morphologies from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {ExperimentalBoutonDensityFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IExperimentalBoutonDensity>>} A promise that resolves to the list of bouton density
 */
export async function getExperimentalBoutonDensities({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: ExperimentalBoutonDensityFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IExperimentalBoutonDensity>>(baseUri, {
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
 * Retrieves a specific bouton density by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the bouton density to retrieve
 * @returns {Promise<IExperimentalBoutonDensity>} A promise that resolves to the requested bouton density
 */
export async function getExperimentalBoutonDensity({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IExperimentalBoutonDensity>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}


export const measurementSchema = z.object({
  name: z
    .string({ message: 'Measurement name is required' })
    .nonempty({ message: 'Measurement name is required' }),
  unit: z
    .string({ message: 'Measurement unit is required' })
    .nonempty({ message: 'Measurement unit is required' }),
  value: z.number({ message: 'Measurement value must be a float number' }),
});

const ExperimentalBoutonDensitySchema = z.object({
  name: z
    .string({ message: 'Experimental bouton density name is required' })
    .nonempty({ message: 'Experimental bouton density name is required' }),
  description: z
    .string({ message: 'Experimental bouton density description is required' })
    .nonempty({ message: 'Experimental bouton density description is required' }),
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
  measurements: z.array(measurementSchema),
  legacy_id: z.string().uuid().nullable().optional(),
});

export type TExperimentalBoutonDensityCreate = z.infer<typeof ExperimentalBoutonDensitySchema>;

/**
 * Creates a new Experimental cell density
 * @param param0
 * @returns A promise that resolves to the created Experimental cell density
 */
export async function createExperimentalBoutonDensity({
  context,
  payload,
}: {
  context?: WorkspaceContext | null;
  payload: TExperimentalBoutonDensityCreate;
}) {
  const api = await entityCoreApi();
  return await api.post<IExperimentalBoutonDensity>(baseUri, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: payload,
  });
}
