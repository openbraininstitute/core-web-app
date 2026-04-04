import { flatMap, keyBy, sortBy } from 'es-toolkit/compat';

import { getTaskActivities } from '@/api/entitycore/queries/task/task-activity';
import { getTaskConfigs } from '@/api/entitycore/queries/task/task-config';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import { ActivityStatus } from '@/api/entitycore/types/entities/task-activity';

import type {
  ITaskActivity,
  TTaskActivityType,
} from '@/api/entitycore/types/entities/task-activity';
import type {
  ITaskConfig,
  ITaskConfigFilter,
  TTaskConfigType,
} from '@/api/entitycore/types/entities/task-config';
import type { WorkspaceContext } from '@/types/common';

/**
 * one workflow row: an execution (or none yet) plus the config + generation activity that produced the config.
 * generic over task config `meta` so it works for any campaign / config-generation / execution chain.
 */
export type TTaskCampaignExecutionRow<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> = {
  execution: ITaskActivity | null;
  provenance: {
    config: ITaskConfig<TMeta>;
    generation: ITaskActivity;
  };
};
export type TTaskCampaignRow<TMeta extends Record<string, unknown> = Record<string, unknown>> =
  ITaskConfig<TMeta> & { rows: TTaskCampaignExecutionRow<TMeta>[] };
export type TTaskCampaignRows<TMeta extends Record<string, unknown> = Record<string, unknown>> =
  Array<TTaskCampaignRow<TMeta>>;
/**
 * joins root campaigns with config-generation activities, their generated configs, and executions that used those configs.
 * expects `generationsByCampaignId` built from activities whose `used` refs include the campaign id.
 */
export function buildTaskCampaignRows<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
>({
  campaigns,
  generationsByCampaignId,
  configById,
  executionsByConfigId,
}: {
  campaigns: readonly ITaskConfig<TMeta>[];
  generationsByCampaignId: Record<string, ITaskActivity[]>;
  configById: Record<string, ITaskConfig<TMeta>>;
  executionsByConfigId: Record<string, ITaskActivity[]>;
}): TTaskCampaignRows<TMeta> {
  return campaigns.map((campaign) => {
    const campaignGenerations = generationsByCampaignId[campaign.id] ?? [];
    const rows: TTaskCampaignExecutionRow<TMeta>[] = [];

    for (const generation of campaignGenerations) {
      for (const ref of generation.generated ?? []) {
        const config = configById[ref.id];
        if (!config) continue;

        const executionsForConfig = executionsByConfigId[ref.id] ?? [];
        if (executionsForConfig.length === 0) {
          rows.push({
            execution: null,
            provenance: { config, generation },
          });
          continue;
        }

        for (const execution of executionsForConfig) {
          rows.push({
            execution,
            provenance: { config, generation },
          });
        }
      }
    }

    return { ...campaign, rows };
  });
}

/**
 * all `rows` must refer to the same downstream config (same `provenance.config.id`).
 * uses the latest execution by `creation_date`, or `ActivityStatus.CREATED` when there are none.
 */
export function getLatestExecutionStatusFromRows<T extends TTaskCampaignExecutionRow>(
  rows: T[]
): ActivityStatus {
  const executions = rows.map((r) => r.execution).filter((e): e is ITaskActivity => e != null);
  const sorted = sortBy(executions, (e) => e.creation_date);
  return (sorted.at(-1)?.status as ActivityStatus) ?? ActivityStatus.CREATED;
}

/**
 * one status count per distinct `provenance.config.id` (latest execution wins per config).
 */
export function getTaskCampaignStatusCountMap<T extends TTaskCampaignExecutionRow>(campaign: {
  rows: T[];
}): Map<ActivityStatus, number> {
  const rowsByConfigId = campaign.rows.reduce<Record<string, T[]>>((acc, row) => {
    const id = row.provenance.config.id;
    if (!acc[id]) acc[id] = [];
    acc[id].push(row);
    return acc;
  }, {});

  const map = new Map<ActivityStatus, number>();
  for (const configRows of Object.values(rowsByConfigId)) {
    const status = getLatestExecutionStatusFromRows(configRows);
    map.set(status, (map.get(status) ?? 0) + 1);
  }
  return map;
}

export async function resolveTaskCampaigns<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
>({
  withFacets,
  context,
  filters,
  campaignConfigType,
  generationActivityType,
  generationConfigType,
  executionActivityType,
}: {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<ITaskConfigFilter>;
  campaignConfigType: TTaskConfigType;
  generationActivityType: TTaskActivityType;
  generationConfigType: TTaskConfigType;
  executionActivityType: TTaskActivityType;
}) {
  filters = discardBrainRegionQueryParams(filters);
  const source = await getTaskConfigs<TMeta>({
    context,
    withFacets,
    filters: {
      task_config_type: campaignConfigType,
      ...filters,
    },
  });
  const campaignIDs = source.data.map((o) => o.id);
  const generations = await getTaskActivities({
    context,
    filters: {
      task_activity_type: generationActivityType,
      used__id__in: campaignIDs,
    },
  });
  const generationsByCampaignId = generations.data.reduce<
    Record<string, (typeof generations.data)[number][]>
  >((acc, gen) => {
    gen.used.forEach((u) => {
      if (!acc[u.id]) acc[u.id] = [];
      acc[u.id].push(gen);
    });
    return acc;
  }, {});
  const allConfigIds = flatMap(generations.data, (gen) => gen.generated?.map((g) => g.id) ?? []);
  const configs = await getTaskConfigs<TMeta>({
    context,
    withFacets: false,
    filters: {
      task_config_type: generationConfigType,
      id__in: allConfigIds,
    },
  });
  const configById = keyBy<ITaskConfig<TMeta>>(configs.data, 'id');
  const configIDs = configs.data.map((c) => c.id);
  const executionsResponse =
    configIDs.length > 0
      ? await getTaskActivities({
          context,
          filters: {
            task_activity_type: executionActivityType,
            used__id__in: configIDs,
          },
        })
      : { data: [] };

  const executions = executionsResponse.data;
  const executionsByConfigId = executions.reduce<Record<string, ITaskActivity[]>>((acc, exec) => {
    for (const u of exec.used) {
      if (!acc[u.id]) acc[u.id] = [];
      acc[u.id].push(exec);
    }
    return acc;
  }, {});

  const enrichedData: TTaskCampaignRows<TMeta> = buildTaskCampaignRows<TMeta>({
    campaigns: source.data,
    generationsByCampaignId,
    configById,
    executionsByConfigId,
  });

  return {
    data: enrichedData,
    pagination: source.pagination,
    facets: source.facets,
  };
}
