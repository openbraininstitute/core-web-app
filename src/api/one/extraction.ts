import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';
import type { WorkspaceContext } from '@/types/common';

export const ObiOneTaskTypeDict = {
  CircuitExtraction: 'circuit_extraction',
  CircuitSimulation: 'circuit_simulation',
} as const;

export type TObiOneTaskType = (typeof ObiOneTaskTypeDict)[keyof typeof ObiOneTaskTypeDict];

type LaunchExtractionParams = {
  ctx: WorkspaceContext;
  task_type: TObiOneTaskType;
  config_id: string;
  signal?: AbortSignal;
};

/**
 * Launches a circuit extraction task via the obi-one API.
 *
 * @param params - The parameters for the API request.
 * @param params.ctx - The workspace context (virtualLabId, projectId).
 * @param params.entityType - The entity type (e.g., 'CircuitExtractionConfig').
 * @param params.entityId - The entity ID (circuit extraction config ID).
 * @param params.signal - Optional AbortSignal for request cancellation.
 *
 * @returns A promise that resolves to the execution activity ID.
 */
export async function launchExtraction({
  ctx,
  task_type,
  config_id,
  signal,
}: LaunchExtractionParams): Promise<string> {
  const api = await obioneApi();

  const response = await api.post<string>(`/declared/task-launch`, {
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
