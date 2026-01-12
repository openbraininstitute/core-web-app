import { authApiClient } from '@/api/apiClient';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { WorkspaceContext } from '@/types/common';

export async function launchSystemApi(url?: string) {
  const api = await authApiClient(
    url ?? 'https://staging.openbraininstitute.org/api/launch-system'
  );
  return api;
}

type RunSimulationParams = {
  ctx: WorkspaceContext;
  simulationId: string;
  signal?: AbortSignal;
};

export async function runSimulation({ ctx, simulationId, signal }: RunSimulationParams) {
  const api = await launchSystemApi();

  return api.post<any>('/simulation', {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: {
      simulation_id: simulationId,
    },
    signal,
  });
}
