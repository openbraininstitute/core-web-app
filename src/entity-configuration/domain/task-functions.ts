import { sortBy } from 'es-toolkit/compat';

import { getTaskConfig, getTaskConfigs } from '@/api/entitycore/queries/task/task-config';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import { ActivityStatus } from '@/api/entitycore/types/entities/task-activity';
import {
  listTaskActivitiesByUsedIdsAnyType,
  listTaskConfigsByGeneratorIdAnyType,
  listTaskConfigsByGeneratorIdsAnyType,
} from '@/features/task-runner/functions';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type {
  ITaskConfig,
  ITaskConfigFilter,
  TTaskConfigType,
} from '@/api/entitycore/types/entities/task-config';
import type { WorkspaceContext } from '@/types/common';

/**
 * one workflow row: an execution (or none yet) plus the config + generation activity that produced the config
 * generic over task config `meta` so it works for any campaign / config-generation / execution chain
 */
export type TTaskCampaignExecutionRow<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string;
  legacy_id: null;
  execution: ITaskActivity | null;
  provenance: {
    config: ITaskConfig<TMeta>;
  };
};
export type TTaskCampaignRow<TMeta extends Record<string, unknown> = Record<string, unknown>> =
  ITaskConfig<TMeta> & { rows: TTaskCampaignExecutionRow<TMeta>[] };
type TTaskCampaignRows<TMeta extends Record<string, unknown> = Record<string, unknown>> = Array<
  TTaskCampaignRow<TMeta>
>;

export type TTaskFlowTypes = {
  campaignConfigType: TTaskConfigType;
};

type TaskCampaignListParams = {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<ITaskConfigFilter>;
};
/**
 * joins root campaigns with generated configs and executions that used those configs
 */
function buildTaskCampaignRows<TMeta extends Record<string, unknown> = Record<string, unknown>>({
  campaigns,
  configsByCampaignId,
  executionsByConfigId,
}: {
  campaigns: readonly ITaskConfig<TMeta>[];
  configsByCampaignId: Record<string, ITaskConfig<TMeta>[]>;
  executionsByConfigId: Record<string, ITaskActivity[]>;
}): TTaskCampaignRows<TMeta> {
  return campaigns.map((campaign) => {
    const generatedConfigs = configsByCampaignId[campaign.id] ?? [];
    const rows: TTaskCampaignExecutionRow<TMeta>[] = [];

    for (const config of generatedConfigs) {
      const executionsForConfig = executionsByConfigId[config.id] ?? [];
      if (executionsForConfig.length === 0) {
        rows.push({
          id: `${config.id}:created`,
          legacy_id: null,
          execution: null,
          provenance: { config },
        });
        continue;
      }

      for (const execution of executionsForConfig) {
        rows.push({
          id: `${config.id}:${execution.id}`,
          legacy_id: null,
          execution,
          provenance: { config },
        });
      }
    }

    return { ...campaign, rows };
  });
}

/**
 * all `rows` must refer to the same downstream config (same `provenance.config.id`)
 * uses the latest execution by `creation_date`, or `ActivityStatus.CREATED` when there are none
 */
function getLatestExecutionStatusFromRows<T extends TTaskCampaignExecutionRow>(
  rows: T[]
): ActivityStatus {
  const executions = rows.map((r) => r.execution).filter((e): e is ITaskActivity => e != null);
  const sorted = sortBy(executions, (e) => e.creation_date);
  return (sorted.at(-1)?.status as ActivityStatus) ?? ActivityStatus.CREATED;
}

/**
 * one status count per distinct `provenance.config.id` (latest execution wins per config)
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

export namespace Task {
  export async function many<TMeta extends Record<string, unknown> = Record<string, unknown>>({
    withFacets,
    context,
    filters,
    campaignConfigType,
  }: {
    withFacets?: boolean;
    context: WorkspaceContext | undefined;
    filters?: Partial<ITaskConfigFilter>;
    campaignConfigType: TTaskConfigType;
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
    const configsResponse = await listTaskConfigsByGeneratorIdsAnyType<TMeta>({
      context,
      generatorIds: campaignIDs,
    });
    const configsData = configsResponse.data;
    const configsByCampaignId = configsData.reduce<Record<string, ITaskConfig<TMeta>[]>>(
      (acc, config) => {
        const campaignId = config.task_config_generator_id;
        if (!campaignId) return acc;
        if (!acc[campaignId]) acc[campaignId] = [];
        acc[campaignId].push(config);
        return acc;
      },
      {}
    );
    const configIDs = configsData.map((c) => c.id);
    const executionsResponse = await listTaskActivitiesByUsedIdsAnyType({
      context,
      usedIds: configIDs,
    });
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
      configsByCampaignId,
      executionsByConfigId,
    });

    return {
      data: enrichedData,
      pagination: source.pagination,
      facets: source.facets,
    };
  }

  export async function one<TMeta extends Record<string, unknown> = Record<string, unknown>>({
    campaign,
    id,
    context,
  }: {
    campaign?: ITaskConfig<TMeta>;
    id: string;
    context: WorkspaceContext | undefined;
  } & TTaskFlowTypes): Promise<TTaskCampaignExecutionRow<TMeta>[]> {
    const resolvedCampaign = campaign ?? (await getTaskConfig<TMeta>({ id, context }));
    if (!resolvedCampaign) return [];

    const configsResponse = await listTaskConfigsByGeneratorIdAnyType<TMeta>({
      context,
      generatorId: resolvedCampaign.id,
    });
    const configsData = configsResponse.data;
    const configsByCampaignId = configsData.reduce<Record<string, ITaskConfig<TMeta>[]>>(
      (acc, config) => {
        const campaignId = config.task_config_generator_id;
        if (!campaignId) return acc;
        if (!acc[campaignId]) acc[campaignId] = [];
        acc[campaignId].push(config);
        return acc;
      },
      {}
    );
    const configIds = configsData.map((c) => c.id);
    if (!configIds.length) return [];

    const executionsResponse = await listTaskActivitiesByUsedIdsAnyType({
      context,
      usedIds: configIds,
    });
    const executions = executionsResponse.data;
    const executionsByConfigId = executions.reduce<Record<string, ITaskActivity[]>>((acc, exec) => {
      for (const used of exec.used) {
        if (!acc[used.id]) acc[used.id] = [];
        acc[used.id].push(exec);
      }
      return acc;
    }, {});

    const [campaignWithRows] = buildTaskCampaignRows<TMeta>({
      campaigns: [resolvedCampaign],
      configsByCampaignId,
      executionsByConfigId,
    });

    return campaignWithRows?.rows ?? [];
  }

  export function count({
    withFacets,
    context,
    filters,
    campaignConfigType,
    extraFilters,
  }: TaskCampaignListParams & TTaskFlowTypes & { extraFilters?: Partial<ITaskConfigFilter> }) {
    const resolvedFilters = discardBrainRegionQueryParams(filters);

    return getTaskConfigs({
      context,
      withFacets,
      filters: {
        task_config_type: campaignConfigType,
        ...resolvedFilters,
        ...extraFilters,
        page: 1,
        page_size: 1,
      },
    }).then((response) => response.pagination.total_items);
  }

  export async function status({
    campaignId,
    context,
  }: {
    campaignId: string;
    context: WorkspaceContext | undefined;
  }): Promise<Map<ActivityStatus, number>> {
    const configsResponse = await listTaskConfigsByGeneratorIdAnyType({
      context,
      generatorId: campaignId,
    });
    const configs = configsResponse.data;
    const configIds = configs.map((config) => config.id);
    if (!configIds.length) {
      return new Map();
    }

    const executionsResponse = await listTaskActivitiesByUsedIdsAnyType({
      context,
      usedIds: configIds,
    });
    const executions = executionsResponse.data;
    const executionsByConfigId = executions.reduce<Record<string, ITaskActivity[]>>((acc, exec) => {
      for (const used of exec.used) {
        if (!acc[used.id]) acc[used.id] = [];
        acc[used.id].push(exec);
      }
      return acc;
    }, {});

    const statusesByConfigId = new Map<string, ActivityStatus>();
    for (const cfg of configs) {
      if (statusesByConfigId.has(cfg.id)) continue;
      const configExecutions = executionsByConfigId[cfg.id] ?? [];
      const latestExecution = sortBy(configExecutions, (execution) => execution.creation_date).at(
        -1
      );
      statusesByConfigId.set(cfg.id, latestExecution?.status ?? ActivityStatus.CREATED);
    }

    const statusCountMap = new Map<ActivityStatus, number>();
    for (const statusValue of statusesByConfigId.values()) {
      statusCountMap.set(statusValue, (statusCountMap.get(statusValue) ?? 0) + 1);
    }

    return statusCountMap;
  }
}
