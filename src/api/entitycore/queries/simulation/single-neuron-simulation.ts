import {
  TCreateSingleNeuronSimulation,
  ISingleNeuronSimulation,
} from '../../types/entities/single-neuron-simulation';
import { entityCoreApi, getEntityCoreContext } from '../../utils';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/single-neuron-simulation';
/**
 * Creates a new ME model in entity core API.
 *
 * @param params - The parameters for creating the ME model.
 * @param params.body - The payload containing the data for the new ME model.
 * @param params.context - The workspace context containing necessary headers and configurations.
 * @returns {Promise<IEModel>} A promise that resolves to the created ME model.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function createSingleNeuronSimulation({
  body,
  context,
}: {
  body: TCreateSingleNeuronSimulation;
  context: Required<WorkspaceContext>;
}) {
  const api = await entityCoreApi();
  return await api.post<ISingleNeuronSimulation>(`${baseUri}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body,
  });
}
