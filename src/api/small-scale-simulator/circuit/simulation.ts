import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';

import type { WorkspaceContext } from '@/types/common';

type Params = {
  ctx: WorkspaceContext;
  simulationIds: string[];
  signal?: AbortSignal;
};

export async function runBatch({ ctx, simulationIds, signal }: Params) {
  const api = await smallScaleSimulatorApi();

  return api.post<Response>(
    '/circuit/simulation/run-batch',
    {
      headers: {
        ...getEntityCoreContext(ctx).headers,
        accept: 'application/x-ndjson',
        'Content-Type': 'application/json',
      },
      body: { simulation_ids: simulationIds },
      signal,
    },
    { asRawResponse: true },
  );
}
