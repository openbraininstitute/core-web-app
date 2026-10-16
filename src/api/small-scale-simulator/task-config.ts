import { getEntityCoreContext } from '@/api/entitycore/utils';
import { smallScaleSimulatorApi } from '@/api/small-scale-simulator/utils';

import type { WorkspaceContext } from '@/types/common';

type TTaskConfigRunLaunch = {
  job_id: string;
  execution_id: string;
};

export function taskConfigRunner(path: string) {
  return async ({
    ctx,
    config_id,
    signal,
  }: {
    ctx: WorkspaceContext;
    config_id: string;
    signal?: AbortSignal;
  }) => {
    const api = await smallScaleSimulatorApi();

    return await api.post<TTaskConfigRunLaunch>(path, {
      headers: {
        ...getEntityCoreContext(ctx).headers,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: { config_id },
      signal,
    });
  };
}
