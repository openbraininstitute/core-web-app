import z from 'zod';

import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type {
  ExperimentalSynapsesPerConnectionFilter,
  IExperimentalSynapsesPerConnection,
} from '@/api/entitycore/types/entities/synapses-per-connection';
import type { WorkspaceContext } from '@/types/common';
import {measurementSchema} from '@/api/entitycore/queries/experimental/neuron-density';

const baseUri = '/experimental-synapses-per-connection';
/**
 * Retrieves a list of synapses per connection morphologies from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {ExperimentalSynapsesPerConnectionFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IExperimentalSynapsesPerConnection>>} A promise that resolves to the list of synapse per connection
 */
export async function getExperimentalSynapsesPerConnections({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: ExperimentalSynapsesPerConnectionFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IExperimentalSynapsesPerConnection>>(baseUri, {
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
 * Retrieves a specific synapses per connection by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the synapse per connection to retrieve
 * @returns {Promise<IExperimentalSynapsesPerConnection>} A promise that resolves to the requested synapse per connection
 */
export async function getExperimentalSynapsesPerConnection({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IExperimentalSynapsesPerConnection>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

const ExperimentalSynapsesPerConnectionSchema = z.object({
  name: z
    .string({ message: 'Experimental bouton density name is required' })
    .nonempty({ message: 'Experimental bouton density name is required' }),
  description: z
    .string({ message: 'Experimental bouton density description is required' })
    .nonempty({ message: 'Experimental bouton density description is required' }),
  pre_mtype: z
    .string({ message: 'Pre m-type is required' })
    .uuid()
    .nonempty({ message: 'Pre m-type  is required' }),
  post_mtype: z
    .string({ message: 'Pre m-type is required' })
    .uuid()
    .nonempty({ message: 'Pre m-type  is required' }),
  pre_region: z
    .string({ message: 'Pre brain region is required' })
    .uuid()
    .nonempty({ message: 'Pre brain region is required' }),
  post_region: z
    .string({ message: 'Post brain region is required' })
    .uuid()
    .nonempty({ message: 'Post brain region is required' }),
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

export type TExperimentalSynapsesPerConnectionCreate = z.infer<typeof ExperimentalSynapsesPerConnectionSchema>;

/**
 * Creates a new Experimental cell density
 * @param param0
 * @returns A promise that resolves to the created Experimental cell density
 */
export async function createExperimentalSynapsesPerConnection({
  context,
  payload,
}: {
  context?: WorkspaceContext | null;
  payload: TExperimentalSynapsesPerConnectionCreate;
}) {
  const api = await entityCoreApi();
  return await api.post<IExperimentalSynapsesPerConnection>(baseUri, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: payload,
  });
}