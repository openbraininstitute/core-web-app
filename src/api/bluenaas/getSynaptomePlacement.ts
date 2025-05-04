import { createHeaders } from '@/util/utils';
import { blueNaasUrl } from '@/config';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';

export default async function getSynapsesPlacement({
  modelId,
  seed,
  config,
  token,
  signal,
}: {
  token: string;
  modelId: string;
  seed: number;
  config: TSingleNeuronSynaptomeConfiguration;
  signal?: AbortSignal;
}) {
  const response = await fetch(
    `${blueNaasUrl}/synaptome/generate-placement?model_id=${encodeURIComponent(modelId)}`,
    {
      method: 'post',
      headers: createHeaders(token),
      body: JSON.stringify({
        seed,
        config: { ...config, distribution: 'formula' },
      }),
      signal,
    }
  );
  return response;
}
