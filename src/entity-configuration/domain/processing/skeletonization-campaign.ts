import { flatMap, keyBy } from 'es-toolkit/compat';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import {
  createTaskConfig,
  getTaskActivities,
  getTaskConfig,
  getTaskConfigs,
} from '@/api/entitycore/queries/task';
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

import type { ITaskConfig, ITaskConfigFilter } from '@/api/entitycore/types/entities/task-config';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { AwaitedType, WorkspaceContext } from '@/types/common';

export type TSkeletonizationTaskConfigMeta = {
  scan_parameters?: Record<string, unknown>;
};

async function resolveSkeletonizationCampaigns({
  withFacets,
  context,
  filters,
}: {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<ITaskConfigFilter>;
}) {
  filters = discardBrainRegionQueryParams(filters);

  const source = await getTaskConfigs<TSkeletonizationTaskConfigMeta>({
    context,
    withFacets,
    filters: {
      task_config_type: TaskConfigType.SkeletonizationCampaign,
      ...filters,
    },
  });

  const campaignIDs = source.data.map((o) => o.id);
  const generations = await getTaskActivities({
    context,
    filters: {
      task_activity_type: TaskActivityType.SkeletonizationConfigGeneration,
      used__id__in: campaignIDs,
    },
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
      ? await getTaskConfigs<TSkeletonizationTaskConfigMeta>({
          context,
          withFacets: false,
          filters: {
            task_config_type: TaskConfigType.SkeletonizationConfig,
            id__in: allConfigIds,
          },
        })
      : { data: [] };
  const configById = keyBy(configs.data, 'id');

  // fetch all executions linked to those configs
  const configIDs = configs.data.map((c) => c.id);
  const executionsResponse =
    configIDs.length > 0
      ? await getTaskActivities({
          context,
          withFacets: false,
          filters: {
            task_activity_type: TaskActivityType.SkeletonizationExecution,
            used__id__in: configIDs,
          },
        })
      : {
          data: [] as Awaited<ReturnType<typeof getTaskActivities>>['data'],
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

  const enrichedData: TTaskCampaignRows<TSkeletonizationTaskConfigMeta> = buildTaskCampaignRows({
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

export async function resolveSkeletonizationByCampaignId({
  id,
  context,
}: {
  id: string;
  context: WorkspaceContext | undefined;
}) {
  const campaign = await getTaskConfig<TSkeletonizationTaskConfigMeta>({ id, context });

  if (!campaign) {
    throw new Error(`No skeletonization campaign with id ${id} found`);
  }

  // campaign → config generations
  const generations = await getTaskActivities({
    context,
    withFacets: false,
    filters: {
      task_activity_type: TaskActivityType.SkeletonizationConfigGeneration,
      used__id: id,
    },
  });

  // config generations → configs
  const allConfigIds = flatMap(generations.data, (gen) => gen.generated?.map((g) => g.id) ?? []);
  const configs =
    allConfigIds.length > 0
      ? await getTaskConfigs<TSkeletonizationTaskConfigMeta>({
          context,
          withFacets: false,
          filters: {
            task_config_type: TaskConfigType.SkeletonizationConfig,
            id__in: allConfigIds,
          },
        })
      : { data: [] };

  const firstConfig = configs.data.at(0);
  // get the generation config asset from the campaign
  const assets = campaign.assets ?? [];

  const configAsset = getAsset({
    assets,
    label: AssetLabel.task_config,
  }).getOneOrNull();

  const emCellMeshId = firstConfig?.inputs.at(0)?.id ?? null;
  if (!configAsset) {
    return {
      campaign,
      config: null,
      emCellMeshId,
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
    emCellMeshId,
  };
}

export type TExtendedSkeletonizationCampaignsType = AwaitedType<
  ReturnType<typeof resolveSkeletonizationCampaigns>
>;

type TEnrichedSkeletonizationCampaign = TExtendedSkeletonizationCampaignsType['data'][number];

export function getSkeletonizationStatus(
  rows: TTaskCampaignExecutionRow<TSkeletonizationTaskConfigMeta>[]
) {
  return getLatestExecutionStatusFromRows(rows);
}

export function getSkeletonizationStatusCountMap(campaign: TEnrichedSkeletonizationCampaign) {
  return getTaskCampaignStatusCountMap(campaign);
}

export type TResolvedSkeletonizationByCampaign = Awaited<
  ReturnType<typeof resolveSkeletonizationByCampaignId>
>;
export type TResolvedSkeletonizationByCampaigns = Awaited<
  ReturnType<typeof resolveSkeletonizationCampaigns>
>;

export const SkeletonizationCampaign: EntityCoreTypeConfig<
  ITaskConfig<TSkeletonizationTaskConfigMeta>,
  TResolvedSkeletonizationByCampaign,
  TResolvedSkeletonizationByCampaigns
> = {
  group: EntityTypeGroup.Processing,
  title: 'Skeletonization Campaign',
  extendedType: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
  type: EntityTypeDict.TaskConfig,
  slug: EntitySlug.Skeletonization,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: resolveSkeletonizationCampaigns,
      one: (params) => getTaskConfig({ id: params.id, context: params.context }),
      create: (data) => createTaskConfig({ data, context: data.context }),
    },
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
