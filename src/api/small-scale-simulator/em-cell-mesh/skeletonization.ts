import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';

import type { WorkspaceContext } from '@/types/common';

type Params = {
  ctx: WorkspaceContext;
  skeletonizationIds: string[];
  signal?: AbortSignal;
};

export async function runBatch({ ctx, skeletonizationIds, signal }: Params) {
  const api = await smallScaleSimulatorApi();

  return api.post<Response>('/mesh/skeletonization/run-batch', {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      accept: 'application/x-ndjson',
      'Content-Type': 'application/json',
    },
    body: { skeletonization_ids: skeletonizationIds },
    signal,
  });
}
