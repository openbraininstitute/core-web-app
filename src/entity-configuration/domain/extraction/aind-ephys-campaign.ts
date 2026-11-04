import { downloadAsset } from '@/api/entitycore/queries/assets';
import { createTaskConfig, getTaskConfig } from '@/api/entitycore/queries/task';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { Task, type TTaskFlowTypes } from '@/entity-configuration/domain/task-functions';

import type {
  ITaskConfig,
  ITaskConfigFilter,
  TTaskConfigType,
} from '@/api/entitycore/types/entities/task-config';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

type TTaskConfigMeta = {
  scan_parameters?: Record<string, unknown>;
};

function makeAindEphysCampaign({
  title,
  extendedType,
  slug,
  campaignConfigType,
}: {
  title: string;
  extendedType: TExtendedEntitiesTypeDict;
  slug: EntitySlugValue;
  campaignConfigType: TTaskConfigType;
}) {
  const TaskFlow: TTaskFlowTypes = { campaignConfigType };

  async function resolve({ id, context }: { id: string; context?: WorkspaceContext | null }) {
    const resolvedContext = context ?? undefined;
    const campaign = await getTaskConfig({ id, context: resolvedContext });
    if (!campaign) {
      throw new Error(`No ${title.toLowerCase()} campaign with id ${id} found`);
    }

    const configAsset = getAsset({
      assets: campaign.assets ?? [],
      label: AssetLabel.task_config,
    }).getOneOrNull();
    if (!configAsset) {
      return { campaign, config: null };
    }

    const rawConfig = await downloadAsset({
      entityId: campaign.id,
      entityType: EntityTypeDict.TaskConfig,
      id: configAsset.id,
      ctx: resolvedContext,
      asRawResponse: true,
    });
    return { campaign, config: await rawConfig.json() };
  }

  const config: EntityCoreTypeConfig<
    ITaskConfig<TTaskConfigMeta>,
    Awaited<ReturnType<typeof resolve>>
  > = {
    group: EntityTypeGroup.Extractions,
    title,
    extendedType,
    type: EntityTypeDict.TaskConfig,
    slug,
    api: {
      config: {
        allowedFacets: true,
        ilikeSearchEnabled: true,
      },
      query: {
        list: async ({
          withFacets,
          context,
          filters,
        }: {
          withFacets?: boolean;
          context: WorkspaceContext | undefined;
          filters?: Partial<ITaskConfigFilter>;
        }) =>
          Task.many<TTaskConfigMeta>({
            context,
            withFacets,
            ...TaskFlow,
            filters: { ...discardBrainRegionQueryParams(filters) },
          }),
        status: ({ id, context }: { id: string; context?: WorkspaceContext | null }) =>
          Task.status({ campaignId: id, context: context ?? undefined }),
        resolve,
        count: (params) => Task.count({ ...params, ...TaskFlow }),
        one: (params) => getTaskConfig({ id: params.id, context: params.context }),
        create: (data) => createTaskConfig({ data, context: data.context }),
      },
      expandRow: async (record, context) =>
        Task.one<TTaskConfigMeta>({
          campaign: record as ITaskConfig<TTaskConfigMeta>,
          id: record.id,
          context,
          ...TaskFlow,
        }),
    },
    asset: { extension: 'application/json' },
    detailViewSections: [DetailViewSectionsDict.Overview],
    isBookmarkable: false,
    isDownloadable: false,
    isCopyable: true,
    isSimulatable: false,
    isDeletable: false,
  };
  return config;
}

export const AindEphysPreprocessingCampaign = makeAindEphysCampaign({
  title: 'Extracellular preprocessing',
  extendedType: ExtendedEntitiesTypeDict.AindEphysPreprocessingCampaign,
  slug: EntitySlug.AindEphysPreprocessing,
  campaignConfigType: TaskConfigType.AindEphysPreprocessingCampaign,
});

// the sorters share one task config type, so each of these lists every sorter's campaigns
export const AindEphysSpikeSortingSpykingCircus2Campaign = makeAindEphysCampaign({
  title: 'Spike sorting: SpykingCircus2',
  extendedType: ExtendedEntitiesTypeDict.AindEphysSpikeSortingSpykingCircus2Campaign,
  slug: EntitySlug.AindEphysSpikeSortingSpykingCircus2,
  campaignConfigType: TaskConfigType.AindEphysSpikeSortingCampaign,
});

export const AindEphysSpikeSortingKilosort4Campaign = makeAindEphysCampaign({
  title: 'Spike sorting: Kilosort4',
  extendedType: ExtendedEntitiesTypeDict.AindEphysSpikeSortingKilosort4Campaign,
  slug: EntitySlug.AindEphysSpikeSortingKilosort4,
  campaignConfigType: TaskConfigType.AindEphysSpikeSortingCampaign,
});

export const AindEphysSpikeSortingLupinCampaign = makeAindEphysCampaign({
  title: 'Spike sorting: Lupin',
  extendedType: ExtendedEntitiesTypeDict.AindEphysSpikeSortingLupinCampaign,
  slug: EntitySlug.AindEphysSpikeSortingLupin,
  campaignConfigType: TaskConfigType.AindEphysSpikeSortingCampaign,
});
