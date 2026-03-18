import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';
import { convertObjectKeysToSnakeCase } from '@/util/object-keys-format';

import type { WorkspaceContext } from '@/types/common';
import type {
  CurrentInjectionGraphRequest,
  CurrentInjectionGraphResponse,
} from '@/types/small-scale-simulator/graph';

type Params = {
  ctx: WorkspaceContext;
  modelId: string;
  config: CurrentInjectionGraphRequest;
  signal?: AbortSignal;
};

export async function getStimuliPlot({
  modelId,
  config,
  ctx,
  signal,
}: Params): Promise<CurrentInjectionGraphResponse[]> {
  const api = await smallScaleSimulatorApi();

  const formattedConfig = convertObjectKeysToSnakeCase(config);

  return api.post<any>('/single-neuron/current-clamp-plot-data', {
    queryParams: { model_id: modelId },
    signal,
    headers: {
      ...getEntityCoreContext(ctx).headers,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: formattedConfig,
  });
}
