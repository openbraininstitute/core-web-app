import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';

import type { WorkspaceContext } from '@/types/common';

type Params = {
  ctx: WorkspaceContext;
  meModelId: string;
  signal?: AbortSignal;
};

export async function getMorphology({ ctx, meModelId, signal }: Params) {
  const api = await smallScaleSimulatorApi();

  return api.get<any>('/single-neuron/morphology', {
    queryParams: { model_id: meModelId },
    headers: {
      ...getEntityCoreContext(ctx).headers,
      accept: 'application/json',
    },
    signal,
  });
}
