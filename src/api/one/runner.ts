import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';

import type { TObiOneTaskType } from '@/api/one/types/task';
import type { WorkspaceContext } from '@/types/common';

type RunTaskParams = {
  ctx: WorkspaceContext;
  task_type: TObiOneTaskType;
  config_id: string;
  signal?: AbortSignal;
};

/**
 * runs a task via the obi-one API.
 *
 * @param params - The parameters for the API request.
 * @param params.ctx - The workspace context (virtualLabId, projectId).
 * @param params.task_type - The task type.
 * @param params.config_id - The config ID.
 * @param params.signal - Optional AbortSignal for request cancellation.
 *
 * @returns A promise that resolves to the execution activity ID.
 */
export async function runTask({
  ctx,
  task_type,
  config_id,
  signal,
}: RunTaskParams): Promise<string> {
  const api = await obioneApi();

  const response = await api.post<string>(`/declared/task/launch`, {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: {
      task_type,
      config_id,
    },
    signal,
  });

  return response;
}
