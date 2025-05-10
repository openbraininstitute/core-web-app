import { blueNaasUrl } from '@/config';
import {
  CurrentInjectionGraphResponse,
  CurrentInjectionGraphRequest,
} from '@/types/simulation/graph';
import { convertObjectKeysToSnakeCase } from '@/util/object-keys-format';

export default async function getStimuliPlot(
  modelId: string,
  token: string,
  config: CurrentInjectionGraphRequest,
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
      },
      body: JSON.stringify(formattedConfig),
    }
  );
  if (response.ok) {
    return await response.json();
  }
  throw new Error('Stimuli plot could not be retrieved');
}
