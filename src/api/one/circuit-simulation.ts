import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';

import type { WorkspaceContext } from '@/types/common';

type RunSimulationParams = {
  ctx: WorkspaceContext;
  simulationId: string;
  signal?: AbortSignal;
};

export async function runSimulation({ ctx, simulationId, signal }: RunSimulationParams) {
  const api = await obioneApi();

  return api.post<any>('/declared/task/launch', {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: {
      task_type: 'circuit_simulation',
      config_id: simulationId,
    },
    signal,
  });
}
