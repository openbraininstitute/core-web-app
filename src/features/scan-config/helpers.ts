import { ScanConfigActivity, type TScanConfigActivity } from '@/features/scan-config/types';

/**
 * Maps scan config activities to their AI agent state configuration names.
 * Used to sync configuration state with the AI assistant for different activities.
 */
export const ACTIVITY_AI_CONFIG_MAP: Record<TScanConfigActivity, string> = {
  [ScanConfigActivity.Simulate]: 'smc_simulation_config',
  [ScanConfigActivity.Extract]: 'smc_extraction_config',
};

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { TActivityStatus } from '@/api/entitycore/types/shared/activity';

/**
 * find all executions whose `used` list references the given entity ID,
 * sorted by creation date descending (most recent first)
 */
function getExecutionsForEntity(
  executions: Array<ITaskActivity>,
  entityId: string
): Array<ITaskActivity> {
  return executions
    .filter((exec) => exec.used?.some((ref) => ref.id === entityId))
    .sort((a, b) => new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime());
}

/**
 * build a map of entity ID → latest execution status.
 *
 * for each entity in `entityIds`, finds the most recent execution that
 * references it in `used`, and maps the entity ID to that execution's status
 * entities with no executions are omitted from the map
 */
export function buildActivityStatusMap({
  entityIds,
  executions,
}: {
  entityIds: Array<string>;
  executions: Array<ITaskActivity>;
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

/**
 * find the most recent execution that references the given entity ID
 * in its `used` list. Returns `undefined` if no execution exists.
 */
export function findLatestExecutionForEntity(
  executions: Array<ITaskActivity>,
  entityId: string
): ITaskActivity | undefined {
  const sorted = getExecutionsForEntity(executions, entityId);
  return sorted[0];
}
