import z from 'zod';
import type {
  ExperimentalNeuronDensityFilter,
  IExperimentalNeuronDensity,
} from '@/api/entitycore/types/entities/neuron-density';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/experimental-neuron-density';
/**
 * Retrieves a list of neuron density from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {ExperimentalNeuronDensityFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IExperimentalNeuronDensity>>} A promise that resolves to the list of neuron density
 */
export async function getExperimentalNeuronDensities({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: ExperimentalNeuronDensityFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IExperimentalNeuronDensity>>(baseUri, {
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
 * Retrieves a specific neuron density by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the neuron density to retrieve
 * @returns {Promise<IExperimentalNeuronDensity>} A promise that resolves to the requested neuron density
 */
export async function getExperimentalNeuronDensity({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IExperimentalNeuronDensity>(`${baseUri}/${id}`, {
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

const ExperimentalNeuronDensitySchema = z.object({
  name: z
    .string({ message: 'Experimental cell density name is required' })
    .nonempty({ message: 'Experimental cell density name is required' }),
  description: z
    .string({ message: 'Experimental cell density description is required' })
    .nonempty({ message: 'Experimental cell density description is required' }),
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

export type TExperimentalNeuronDensityCreate = z.infer<typeof ExperimentalNeuronDensitySchema>;

/**
 * Creates a new Experimental cell density
 * @param param0
 * @returns A promise that resolves to the created Experimental cell density
 */
export async function createExperimentalNeuronDensity({
  context,
  payload,
}: {
  context?: WorkspaceContext | null;
  payload: TExperimentalNeuronDensityCreate;
}) {
  const api = await entityCoreApi();
  return await api.post<IExperimentalNeuronDensity>(baseUri, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: payload,
  });
}
