import { getEntityCoreContext } from '@/api/entitycore/utils';
import { bluenaasApi } from '@/api/bluenaas/utils';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { SectionSynapses } from '@/api/bluenaas/types';
import type { WorkspaceContext } from '@/types/common';

type Params = {
  ctx: WorkspaceContext;
  model_id: string;
  payload: {
    seed: number;
    config: TSingleNeuronSynaptomeConfiguration;
  };
  signal?: AbortSignal;
};

export default async function getSynapsesPlacement({ ctx, model_id, payload, signal }: Params) {
  const api = await bluenaasApi();
  return await api.post<{ synapses: Array<SectionSynapses> }>(
    '/entitycore/synaptome/generate-placement',
    {
      queryParams: { model_id },
      headers: {
        ...getEntityCoreContext(ctx).headers,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: {
        ...payload,
        config: {
          ...payload.config,
          distribution: 'formula',
        },
      },
      signal,
    }
  );
}
