import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';

import type { WorkspaceContext } from '@/types/common';
import type { ApiResponse } from '@/types/small-scale-simulator/common';

export type CompatibilityCheckResponse = {
  compatible: boolean;
  morphology_id: string;
  emodel_id: string;
  error?: string | null;
};

type CheckCompatibilityParams = {
  ctx: WorkspaceContext;
  morphologyId: string;
  emodelId: string;
  signal?: AbortSignal;
};

export async function checkCompatibility({
  ctx,
  morphologyId,
  emodelId,
  signal,
}: CheckCompatibilityParams) {
  const api = await smallScaleSimulatorApi();

  return await api.post<ApiResponse<CompatibilityCheckResponse>>(
    '/single-neuron/compatibility/run',
    {
      headers: {
        ...getEntityCoreContext(ctx).headers,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: {
        morphology_id: morphologyId,
        emodel_id: emodelId,
      },
      signal,
    }
  );
}
