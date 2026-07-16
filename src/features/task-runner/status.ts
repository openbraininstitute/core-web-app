import { ActivityStatus } from '@/api/entitycore/types/entities/task-activity';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { TActivityStatus } from '@/api/entitycore/types/shared/activity';

const TERMINAL_ACTIVITY_STATUSES: readonly TActivityStatus[] = [
  ActivityStatus.DONE,
  ActivityStatus.ERROR,
  ActivityStatus.CANCELLED,
];

/** Terminal = the run is finished and its status will not change anymore. */
export function isTerminalActivityStatus(status: TActivityStatus): boolean {
  return TERMINAL_ACTIVITY_STATUSES.includes(status);
}

function getExecutionsForEntity(executions: ITaskActivity[], entityId: string): ITaskActivity[] {
  return executions
    .filter((exec) => exec.used?.some((ref) => ref.id === entityId))
    .sort((a, b) => new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime());
}

export function buildActivityStatusMap({
  entityIds,
  executions,
}: {
  entityIds: string[];
  executions: ITaskActivity[];
}): Map<string, TActivityStatus> {
  const map = new Map<string, TActivityStatus>();

  for (const entityId of entityIds) {
    const sorted = getExecutionsForEntity(executions, entityId);
    if (sorted.length > 0) {
      map.set(entityId, sorted[0].status);
    }
  }

  return map;
}

export function findLatestExecutionForEntity(
  executions: ITaskActivity[],
  entityId: string
): ITaskActivity | undefined {
  return getExecutionsForEntity(executions, entityId)[0];
}
