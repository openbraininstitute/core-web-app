import { getTaskActivities, getTaskConfig } from '@/api/entitycore/queries/task';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

import type { TTaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import type { WorkspaceContext } from '@/types/common';

// ponytail: #2002 adds the same walk as `Task.campaignIdOf`; switch to it once that lands.
/** id of the task config an activity of `type` used to generate entity `id` */
async function usedTaskConfigId(id: string, type: TTaskActivityType, context: WorkspaceContext) {
  const { data } = await getTaskActivities({
    context,
    filters: { generated__id: id, task_activity_type: type },
  });
  return (
    data
      .flatMap((activity) => activity.used)
      // a ref's type may be absent; executions and generations only use task configs anyway
      .find((entity) => (entity.type ?? EntityTypeDict.TaskConfig) === EntityTypeDict.TaskConfig)
      ?.id ?? null
  );
}

/**
 * A task result has no FK to its campaign, so walk provenance: result → `__execution` activity →
 * config → campaign (`task_config_generator_id`, else the `__config_generation` activity).
 *
 * @returns the campaign id, or `null` when the chain cannot be traced
 */
export async function resolveTaskResultCampaignId(
  id: string,
  context: WorkspaceContext,
  activityTypes: { execution: TTaskActivityType; configGeneration: TTaskActivityType }
) {
  const configId = await usedTaskConfigId(id, activityTypes.execution, context);
  if (!configId) return null;

  const config = await getTaskConfig({ id: configId, context });
  return (
    config.task_config_generator_id ??
    (await usedTaskConfigId(configId, activityTypes.configGeneration, context))
  );
}
