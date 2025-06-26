import { convertObjectKeysToSnakeCase } from '@/util/object-keys-format';
import { blueNaasUrl } from '@/config';

import type {
  CurrentInjectionGraphResponse,
  CurrentInjectionGraphRequest,
} from '@/types/simulation/graph';

export default async function getStimuliPlot(
  modelId: string,
  token: string,
  config: CurrentInjectionGraphRequest,
  projectId: string,
  virtualLabId: string,
  signal?: AbortSignal
): Promise<CurrentInjectionGraphResponse[]> {
  const formattedConfig = convertObjectKeysToSnakeCase(config);
  const response = await fetch(
    `${blueNaasUrl}/entitycore/graph/direct-current-plot?model_id=${modelId}`,
    {
      signal,
      method: 'post',
      headers: {
        accept: 'application/json',
        authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
        'virtual-lab-id': virtualLabId,
        'project-id': projectId,
      },
      body: JSON.stringify(formattedConfig),
    }
  );
  if (response.ok) {
    return await response.json();
  }
  throw new Error('Stimuli plot could not be retrieved');
}
