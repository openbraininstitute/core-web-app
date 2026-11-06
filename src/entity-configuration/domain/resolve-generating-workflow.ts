import { cache } from 'react';

import { getTaskActivities } from '@/api/entitycore/queries/task';
import { getTaskConfig } from '@/api/entitycore/queries/task/task-config';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { Task } from '@/entity-configuration/domain/task-functions';
import { resolveWorkflowTaskTypeBindings } from '@/features/scan-config/workflow/types';
import { ActivityRegistry } from '@/ui/segments/workflows/config/activities';

/**
 * The workflow that generated an entity, with the campaign and the single-coordinate task config
 * its execution used; `null` when it cannot be traced.
 *
 * Walks entity -> generating execution activity -> the task config it `used` -> campaign. The
 * workflow is the registered descriptor whose `taskTypeBindings.execution` is the activity's type,
 * so one entity type can come from different workflows (a circuit can be extracted, a synaptome
 * build, ...).
 *
 * `workflowActivity` is the registry activity the workflow is listed under (what the URL builders take).
 *
 * Cached per request (primitive args).
 */
export const resolveGeneratingWorkflow = cache(
  async (entityId: string, virtualLabId: string, projectId: string) => {
    const context = { virtualLabId, projectId };
    const { data } = await getTaskActivities({
      context,
      filters: { generated__id: entityId, page_size: 1 },
    });
    const activity = data.at(0);
    const configId = activity?.used.find(
      (entity) => (entity.type ?? EntityTypeDict.TaskConfig) === EntityTypeDict.TaskConfig
    )?.id;
    if (!activity || !configId) return null;

    const match = Object.values(ActivityRegistry)
      .flatMap((entry) => entry.workflows.map((workflow) => ({ workflow, entry })))
      .flatMap(({ workflow, entry }) => {
        const bindings = resolveWorkflowTaskTypeBindings(
          workflow.scanConfig?.definition.taskTypeBindings,
          { entity: null }
        );
        return bindings && bindings.execution === activity.task_activity_type
          ? [{ workflow, bindings, workflowActivity: entry.value }]
          : [];
      })
      .at(0);
    if (!match) return null;

    const campaignId = await Task.campaignIdFromConfigId({
      configId,
      configGenerationType: match.bindings.configGeneration,
      context,
    });
    if (!campaignId) return null;

    const [campaign, coordinateConfig] = await Promise.all([
      getTaskConfig({ id: campaignId, context }),
      getTaskConfig({ id: configId, context }),
    ]);

    return {
      activity,
      workflow: match.workflow,
      workflowActivity: match.workflowActivity,
      campaign,
      coordinateConfig,
    };
  }
);
