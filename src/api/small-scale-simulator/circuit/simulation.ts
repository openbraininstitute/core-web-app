import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';

import type { WorkspaceContext } from '@/types/common';

type Params = {
  ctx: WorkspaceContext;
  simulationId: string;
  signal?: AbortSignal;
};

export async function runSimulation({ ctx, simulationId, signal }: Params) {
  const api = await smallScaleSimulatorApi();

  return api.post<Response>(
    '/circuit/simulation/run',
    {
      queryParams: { simulation_id: simulationId },
      headers: {
        ...getEntityCoreContext(ctx).headers,
        accept: 'application/x-ndjson',
        'Content-Type': 'application/json',
      },
      signal,
    },
    { asRawResponse: true }
  );
}
