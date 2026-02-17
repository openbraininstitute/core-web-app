/* eslint-disable no-param-reassign */

import some from 'es-toolkit/compat/some';
import startsWith from 'es-toolkit/compat/startsWith';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { entityCoreApi, getAssetElement, getEntityCoreContext } from '@/api/entitycore/utils';
import { tryCatch } from '@/api/utils';
import { getColorFromGeneratedPalette } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/webgl-neuron-selector/colors';

import type {
  ISingleNeuronSynaptome,
  ISingleNeuronSynaptomeFilter,
  TCreateSingleNeuronSynaptome,
  TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/single-neuron-synaptome';

/**
 * Retrieves a list of synaptomes data from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.withFacets - Optional flag to include facets in the response.
 * @param params.filters - Optional filters to apply to the synaptome data query.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the synaptome data for a single neuron.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getSingleNeuronSynaptomes({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ISingleNeuronSynaptomeFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISingleNeuronSynaptome>>(baseUri, {
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
 * Retrieves a specific synaptome data from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the me-model to retrieve
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the synaptome data for a single neuron.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getSingleNeuronSynaptome({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ISingleNeuronSynaptome>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

export async function createSingleNeuronSynaptome({
  body,
  context,
}: {
  body: TCreateSingleNeuronSynaptome;
  context: Required<WorkspaceContext>;
}) {
  const api = await entityCoreApi();
  return await api.post<ISingleNeuronSynaptome>(`${baseUri}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body,
  });
}

export async function getSingleNeuronSynaptomeConfiguration(
  source: ISingleNeuronSynaptome,
  context?: WorkspaceContext
): Promise<{
  synapses: Array<TSingleNeuronSynaptomeConfiguration>;
} | null> {
  const configAsset = getAssetElement({
    assets: source.assets,
    filter(i) {
      return (
        i.label === AssetLabel.single_neuron_synaptome_config ||
        some(['single_neuron_synaptome_config', 'synaptome_config'], (prefix) =>
          startsWith(i.path, prefix)
        )
      );
    },
  });

  if (configAsset) {
    const { data: asset, error } = await tryCatch(
      downloadAsset({
        ctx: context,
        entityId: source.id,
        entityType: EntityTypeDict.SingleNeuronSynaptome,
        id: configAsset.id,
        asRawResponse: true,
      })
    );
    const data = await asset?.json();

    if (error) {
      return null;
    }
    const result = data as {
      synapses: Array<TSingleNeuronSynaptomeConfiguration>;
    };
    return assignColors(result);
  }
  return null;
}

function assignColors(result: { synapses: Array<TSingleNeuronSynaptomeConfiguration> }) {
  for (let i = 0; i < result.synapses.length; i++) {
    result.synapses[i].color = getColorFromGeneratedPalette(i);
  }
  return result;
}
