import { flatMap } from 'es-toolkit/compat';

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
  getLatestExecutionStatusFromRows,
  getTaskCampaignStatusCountMap,
  resolveTaskCampaigns,
  type TTaskCampaignExecutionRow,
} from '@/entity-configuration/domain/task-helpers';

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
  return resolveTaskCampaigns({
    withFacets,
    context,
    filters,
    campaignConfigType: TaskConfigType.CircuitExtractionCampaign,
    generationActivityType: TaskActivityType.CircuitExtractionConfigGeneration,
    generationConfigType: TaskConfigType.CircuitExtractionConfig,
    executionActivityType: TaskActivityType.CircuitExtractionExecution,
  });
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
  const generations = await getTaskActivities({
    context,
    withFacets: false,
    filters: {
      task_activity_type: TaskActivityType.CircuitExtractionConfigGeneration,
      used__id: id,
    },
  });

  // config generations → configs
  const allConfigIds = flatMap(generations.data, (gen) => gen.generated?.map((g) => g.id) ?? []);
  const configs =
    allConfigIds.length > 0
      ? await getTaskConfigs({
          context,
          withFacets: false,
          filters: {
            task_config_type: TaskConfigType.CircuitExtractionConfig,
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

type TEnrichedExtractionCampaign = TExtendedExtractionCampaignsType['data'][number];

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
