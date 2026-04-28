import { flatMap, keyBy } from 'es-toolkit/compat';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { createTaskConfig, getTaskConfig, getTaskConfigs } from '@/api/entitycore/queries/task';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import {
  buildTaskCampaignRows,
  getLatestExecutionStatusFromRows,
  getTaskCampaignStatusCountMap,
  type TTaskCampaignExecutionRow,
  type TTaskCampaignRows,
} from '@/entity-configuration/domain/task-helpers';
import {
  listAllTaskActivities,
  listTaskActivitiesByUsedIds,
  listTaskConfigsByIds,
} from '@/features/task-runner';

import type { ITaskConfig, ITaskConfigFilter } from '@/api/entitycore/types/entities/task-config';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { AwaitedType, WorkspaceContext } from '@/types/common';

export type TTaskConfigMeta = {
  scan_parameters?: Record<string, unknown>;
};

async function resolveExtractionCampaigns({
  withFacets,
  context,
  filters,
}: {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<ITaskConfigFilter>;
}) {
  filters = discardBrainRegionQueryParams(filters);

  const source = await getTaskConfigs({
    context,
    withFacets,
    filters: {
      task_config_type: TaskConfigType.CircuitExtractionCampaign,
      ...filters,
    },
  });

  return source;
}

async function resolveExtractionCampaignRows({
  campaigns,
  context,
}: {
  campaigns: ITaskConfig<TTaskConfigMeta>[];
  context: WorkspaceContext | undefined;
}) {
  const campaignIDs = campaigns.map((campaign) => campaign.id);
  const generations = await listTaskActivitiesByUsedIds({
    context,
    taskActivityType: TaskActivityType.CircuitExtractionConfigGeneration,
    usedIds: campaignIDs,
  });

  // map campaignId → generations that used it
  const generationsByCampaignId = generations.data.reduce<
    Record<string, (typeof generations.data)[number][]>
  >((acc, gen) => {
    gen.used.forEach((u) => {
      if (!acc[u.id]) acc[u.id] = [];
      acc[u.id].push(gen);
    });
    return acc;
  }, {});

  // fetch all configs produced by those generations
  const allConfigIds = flatMap(generations.data, (gen) => gen.generated?.map((g) => g.id) ?? []);
  const configs =
    allConfigIds.length > 0
      ? await listTaskConfigsByIds<TTaskConfigMeta>({
          context,
          taskConfigType: TaskConfigType.CircuitExtractionConfig,
          ids: allConfigIds,
        })
      : { data: [] };
  const configById = keyBy(configs.data, 'id');

  // fetch all executions linked to those configs
  const configIDs = configs.data.map((c) => c.id);
  const executionsResponse =
    configIDs.length > 0
      ? await listTaskActivitiesByUsedIds({
          context,
          taskActivityType: TaskActivityType.CircuitExtractionExecution,
          usedIds: configIDs,
        })
      : {
          data: [] as Awaited<ReturnType<typeof listTaskActivitiesByUsedIds>>['data'],
        };

  // map configId → executions that used it
  const executions = executionsResponse.data;
  const executionsByConfigId = executions.reduce<Record<string, typeof executions>>((acc, exec) => {
    for (const u of exec.used) {
      if (!acc[u.id]) acc[u.id] = [];
      acc[u.id].push(exec);
    }
    return acc;
  }, {});

  const enrichedData: TTaskCampaignRows<TTaskConfigMeta> = buildTaskCampaignRows({
    campaigns,
    generationsByCampaignId,
    configById,
    executionsByConfigId,
  });

  return enrichedData;
}

export async function rows({
  campaign,
  id,
  context,
}: {
  campaign?: ITaskConfig<TTaskConfigMeta>;
  id: string;
  context: WorkspaceContext | undefined;
}) {
  const resolvedCampaign = campaign ?? (await getTaskConfig<TTaskConfigMeta>({ id, context }));
  const [enriched] = await resolveExtractionCampaignRows({
    campaigns: [resolvedCampaign],
    context,
  });

  return enriched?.rows ?? [];
}

export async function status({ id, context }: { id: string; context?: WorkspaceContext | null }) {
  const campaignRows = await rows({
    id,
    context: context ?? undefined,
  });

  return getTaskCampaignStatusCountMap({ rows: campaignRows });
}

export async function resolveExtractionByCampaignId({
  id,
  context,
}: {
  id: string;
  context: WorkspaceContext | undefined;
}) {
  const campaign = await getTaskConfig({ id, context });

  if (!campaign) {
    throw new Error(`No extraction campaign with id ${id} found`);
  }

  // campaign → config generations
  const generations = await listAllTaskActivities({
    context,
    filters: {
      task_activity_type: TaskActivityType.CircuitExtractionConfigGeneration,
      used__id: id,
    },
  });

  // config generations → configs
  const allConfigIds = flatMap(generations.data, (gen) => gen.generated?.map((g) => g.id) ?? []);
  const configs =
    allConfigIds.length > 0
      ? await listTaskConfigsByIds<TTaskConfigMeta>({
          context,
          taskConfigType: TaskConfigType.CircuitExtractionConfig,
          ids: allConfigIds,
        })
      : { data: [] };

  const firstConfig = configs.data.at(0);
  // get the generation config asset from the campaign
  const assets = campaign.assets ?? [];

  const configAsset = getAsset({
    assets,
    label: AssetLabel.task_config,
  }).getOneOrNull();

  const circuitId = firstConfig?.inputs.at(0)?.id ?? null;
  if (!configAsset) {
    return {
      campaign,
      config: null,
      circuitId,
    };
  }

  const rawConfig = await downloadAsset({
    entityId: campaign.id,
    entityType: EntityTypeDict.TaskConfig,
    id: configAsset.id,
    ctx: context,
    asRawResponse: true,
  });
  const config = await rawConfig.json();

  return {
    campaign,
    config,
    circuitId,
  };
}

export type TExtendedExtractionCampaignsType = AwaitedType<
  ReturnType<typeof resolveExtractionCampaigns>
>;

type TEnrichedExtractionCampaign = ITaskConfig<TTaskConfigMeta> & {
  rows: TTaskCampaignExecutionRow<TTaskConfigMeta>[];
};

// FIXME: remove this after Pavlo changes, use only `getLatestExecutionStatusFromRows`
export function getExtractionStatus(rows: TTaskCampaignExecutionRow<TTaskConfigMeta>[]) {
  return getLatestExecutionStatusFromRows(rows);
}
// FIXME: remove this after Pavlo changes, use only `getTaskCampaignStatusCountMap`
export function getStatusCountMap(campaign: TEnrichedExtractionCampaign) {
  return getTaskCampaignStatusCountMap(campaign);
}

export type TResolvedExtractionByCampaign = Awaited<
  ReturnType<typeof resolveExtractionByCampaignId>
>;
export type TResolvedExtractionByCampaigns = Awaited<ReturnType<typeof resolveExtractionCampaigns>>;

export const CircuitExtractionCampaign: EntityCoreTypeConfig<
  ITaskConfig<TTaskConfigMeta>,
  TResolvedExtractionByCampaign,
  TResolvedExtractionByCampaigns
> = {
  group: EntityTypeGroup.Extractions,
  title: 'Circuit extraction campaign',
  extendedType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
  type: EntityTypeDict.TaskConfig,
  slug: EntitySlug.CircuitExtraction,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: resolveExtractionCampaigns,
      one: (params) => getTaskConfig({ id: params.id, context: params.context }),
      create: (data) => createTaskConfig({ data, context: data.context }),
    },
    expandRow: async (record, context) =>
      rows({
        campaign: record as ITaskConfig<TTaskConfigMeta>,
        id: record.id,
        context,
      }),
  },
  asset: {
    extension: 'application/json',
  },
  detailViewSections: [DetailViewSectionsDict.Overview],
  isBookmarkable: false,
  isDownloadable: false,
  isCopyable: true,
  isSimulatable: false,
  isDeletable: false,
} as const;
