import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';

import type { IMEModel } from '@/api/entitycore/types';
import type { TCreateSingleNeuron } from '@/api/small-scale-simulator/types';
import type { WorkspaceContext } from '@/types/common';
import type { ApiResponse } from '@/types/small-scale-simulator/common';

type CreateSingleNeuronParams = {
  ctx: WorkspaceContext;
  modelInfo: TCreateSingleNeuron;
  signal?: AbortSignal;
};

export async function createModel({ ctx, modelInfo, signal }: CreateSingleNeuronParams) {
  const api = await smallScaleSimulatorApi();

  return await api.post<ApiResponse<IMEModel>>('/single-neuron', {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: modelInfo,
    signal,
  });
}
