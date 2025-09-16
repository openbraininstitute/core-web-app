import startsWith from 'lodash/startsWith';
import some from 'lodash/some';

import { entityCoreApi, getAssetElement, getEntityCoreContext } from '@/api/entitycore/utils';
import { SingleNeuronSynaptomeSimulation } from '@/entity-configuration/domain/simulation';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeEnum } from '@/api/entitycore/types';
import { tryCatch } from '@/api/utils';

import type {
  ISingleNeuronSynaptomeSimulation,
  ISingleNeuronSynaptomeSimulationFilter,
  TCreateSingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types/entities/single-neuron-synaptome-simulation';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { SimulationPayload } from '@/types/small-scale-simulator/single-neuron';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/single-neuron-synaptome-simulation';

/**
 * Retrieves a specific single neuron synaptome simulations by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the reconstruction morphology to retrieve
 * @returns {Promise<ISingleNeuronSynaptomeSimulation>} A promise that resolves to the requested reconstruction morphology
 */
export async function getSingleNeuronSynaptomeSimulation({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ISingleNeuronSynaptomeSimulation>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a list of single neuron synaptome simulations data from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.withFacets - Optional flag to include facets in the response.
 * @param params.filters - Optional filters to apply to the single neuron synaptome simulations data query.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the simulation data for a single neuron.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getSingleNeuronSynaptomeSimulations({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ISingleNeuronSynaptomeSimulationFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISingleNeuronSynaptomeSimulation>>(baseUri, {
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
 * Creates a new single neuron synaptome simulation in entity core API.
 *
 * @param params - The parameters for creating the single neuron synaptome simulations.
 * @param params.body - The payload containing the data for the new single neuron synaptome simulations.
 * @param params.context - The workspace context containing necessary headers and configurations.
 * @returns {Promise<IEModel>} A promise that resolves to the created single neuron synaptome simulation.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function createSingleNeuronSynaptomeSimulation({
  body,
  context,
}: {
  body: TCreateSingleNeuronSynaptomeSimulation;
  context: Required<WorkspaceContext>;
}) {
  const api = await entityCoreApi();
  return await api.post<ISingleNeuronSynaptomeSimulation>(`${baseUri}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body,
  });
}

export async function getSingleNeuronSynaptomeSimulationIOResult(
  source: ISingleNeuronSynaptomeSimulation,
  context?: WorkspaceContext
): Promise<SimulationPayload | null> {
  const configAsset = getAssetElement({
    assets: source.assets,
    filter: (i) =>
      i.label === SingleNeuronSynaptomeSimulation.asset.configfile ||
      some(['simulation-config'], (prefix) => startsWith(i.path, prefix)),
  });

  if (configAsset) {
    const { data, error } = await tryCatch(
      downloadAsset({
        ctx: context,
        entityId: source.id,
        entityType: EntityTypeEnum.SingleNeuronSynaptomeSimulation,
        id: configAsset.id,
        asRawResponse: true,
      })
    );
    const asset = await data?.json();

    if (error) {
      return null;
    }
    return asset as SimulationPayload;
  }
  return null;
}
