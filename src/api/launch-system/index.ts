import { authApiClient } from '@/api/apiClient';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { WorkspaceContext } from '@/types/common';

export async function launchSystemApi(url?: string) {
  const api = await authApiClient(
    url ?? 'https://staging.openbraininstitute.org/api/launch-system'
  );
  return api;
}

type Params = {
  ctx: WorkspaceContext;
  simulationId: string;
  name: string;
  instances: number;
  instanceType: string;
  signal?: AbortSignal;
};

export async function runSimulation({
  ctx,
  simulationId,
  name,
  instances,
  instanceType,
  signal,
}: Params) {
  const api = await launchSystemApi();

  return api.post<Response>('/simulation', {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: {
      name,
      instances,
      simulation_id: simulationId,
      instance_type: instanceType,
    },
    signal,
  });
}
