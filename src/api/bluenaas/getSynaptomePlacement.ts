import { blueNaasUrl } from '@/config';
import { SingleSynaptomeConfig } from '@/types/synaptome';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { createHeaders } from '@/util/utils';

export default async function getSynapsesPlacement({
  context,
  modelId,
  seed,
  config,
  token,
  signal,
}: {
  context: VirtualLabInfo;
  token: string;
  modelId: string;
  seed: number;
  config: SingleSynaptomeConfig;
  signal?: AbortSignal;
}) {
  const response = await fetch(
    `${blueNaasUrl}/synaptome/generate-placement?model_id=${encodeURIComponent(modelId)}`,
    {
      method: 'post',
      headers: createHeaders(token, {
        'Content-Type': 'application/json',
        accept: 'application/json',
        'virtual-lab-id': context.virtualLabId,
        'project-id': context.projectId,
      }),
      body: JSON.stringify({
        seed,
        config,
      }),
      signal,
    }
  );
  return response;
}
