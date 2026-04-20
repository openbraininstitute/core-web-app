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

export type TEmSynapseMappingCampaignMeta = {
  scan_parameters?: Record<string, unknown>;
};

/**
 * Resolves the list of EM synapse mapping campaigns plus the chain of
 * related data (config generations → configs → executions) so that the
 * listing can render rollup status for each row.
 */
async function resolveEmSynapseMappingCampaigns({
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
      task_config_type: TaskConfigType.EmSynapseMappingCampaign,
      ...filters,
    },
  });

  const campaignIDs = source.data.map((o) => o.id);
  const generations = await getTaskActivities({
    context,
    filters: {
      task_activity_type: TaskActivityType.EmSynapseMappingConfigGeneration,
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
  const configs =
    allConfigIds.length > 0
      ? await getTaskConfigs({
          context,
          withFacets: false,
          filters: {
            task_config_type: TaskConfigType.EmSynapseMappingConfig,
            id__in: allConfigIds,
          },
        })
      : { data: [] };
  const configById = keyBy(configs.data, 'id');

  const configIDs = configs.data.map((c) => c.id);
  const executionsResponse =
    configIDs.length > 0
      ? await getTaskActivities({
          context,
          withFacets: false,
          filters: {
            task_activity_type: TaskActivityType.EmSynapseMappingExecution,
            used__id__in: configIDs,
          },
        })
      : {
          data: [] as Awaited<ReturnType<typeof getTaskActivities>>['data'],
        };

  const executions = executionsResponse.data;
  const executionsByConfigId = executions.reduce<Record<string, typeof executions>>((acc, exec) => {
    for (const u of exec.used) {
      if (!acc[u.id]) acc[u.id] = [];
      acc[u.id].push(exec);
    }
    return acc;
  }, {});

  const enrichedData: TTaskCampaignRows<TEmSynapseMappingCampaignMeta> = buildTaskCampaignRows({
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

export async function resolveEmSynapseMappingByCampaignId({
  id,
  context,
}: {
  id: string;
  context: WorkspaceContext | undefined;
}) {
  const campaign = await getTaskConfig({ id, context });

  if (!campaign) {
    throw new Error(`No EM synapse mapping campaign with id ${id} found`);
  }

  const generations = await getTaskActivities({
    context,
    withFacets: false,
    filters: {
      task_activity_type: TaskActivityType.EmSynapseMappingConfigGeneration,
      used__id: id,
    },
  });

  const allConfigIds = flatMap(generations.data, (gen) => gen.generated?.map((g) => g.id) ?? []);
  const configs =
    allConfigIds.length > 0
      ? await getTaskConfigs({
          context,
          withFacets: false,
          filters: {
            task_config_type: TaskConfigType.EmSynapseMappingConfig,
            id__in: allConfigIds,
          },
        })
      : { data: [] };

  const firstConfig = configs.data.at(0);
  const assets = campaign.assets ?? [];

  const configAsset = getAsset({
    assets,
    label: AssetLabel.task_config,
  }).getOneOrNull();

  const sourceEntityId = firstConfig?.inputs.at(0)?.id ?? null;
  if (!configAsset) {
    return {
      campaign,
      config: null,
      sourceEntityId,
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
    sourceEntityId,
  };
}

export type TExtendedEmSynapseMappingCampaignsType = AwaitedType<
  ReturnType<typeof resolveEmSynapseMappingCampaigns>
>;

type TEnrichedEmSynapseMappingCampaign = TExtendedEmSynapseMappingCampaignsType['data'][number];

export function getEmSynapseMappingStatus(
  rows: TTaskCampaignExecutionRow<TEmSynapseMappingCampaignMeta>[]
) {
  return getLatestExecutionStatusFromRows(rows);
}

export function getEmSynapseMappingStatusCountMap(campaign: TEnrichedEmSynapseMappingCampaign) {
  return getTaskCampaignStatusCountMap(campaign);
}

export type TResolvedEmSynapseMappingByCampaign = Awaited<
  ReturnType<typeof resolveEmSynapseMappingByCampaignId>
>;
export type TResolvedEmSynapseMappingByCampaigns = Awaited<
  ReturnType<typeof resolveEmSynapseMappingCampaigns>
>;

export const EmSynapseMappingCampaign: EntityCoreTypeConfig<
  ITaskConfig<TEmSynapseMappingCampaignMeta>,
  TResolvedEmSynapseMappingByCampaign,
  TResolvedEmSynapseMappingByCampaigns
> = {
  group: EntityTypeGroup.Models,
  title: 'Electron Microscopy Synaptome',
  extendedType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
  type: EntityTypeDict.TaskConfig,
  slug: EntitySlug.EmSynapseMappingCampaign,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: resolveEmSynapseMappingCampaigns,
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
