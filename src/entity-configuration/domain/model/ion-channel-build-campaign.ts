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

import type { ITaskConfig, ITaskConfigFilter } from '@/api/entitycore/types/entities/task-config';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

export type TIonChannelBuildCampaignMeta = {
  scan_parameters?: Record<string, unknown>;
};

const TaskFlow: TTaskFlowTypes = {
  campaignConfigType: TaskConfigType.IonChannelModelingCampaign,
};

async function list({
  withFacets,
  context,
  filters,
}: {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<ITaskConfigFilter>;
}) {
  return Task.many<TIonChannelBuildCampaignMeta>({
    context,
    withFacets,
    ...TaskFlow,
    filters: {
      ...discardBrainRegionQueryParams(filters),
    },
  });
}

async function rows({
  campaign,
  id,
  context,
}: {
  campaign?: ITaskConfig<TIonChannelBuildCampaignMeta>;
  id: string;
  context: WorkspaceContext | undefined;
}) {
  return Task.one<TIonChannelBuildCampaignMeta>({
    campaign,
    id,
    context,
    ...TaskFlow,
  });
}

async function status({ id, context }: { id: string; context?: WorkspaceContext | null }) {
  return Task.status({
    campaignId: id,
    context: context ?? undefined,
  });
}

async function resolve({ id, context }: { id: string; context?: WorkspaceContext | null }) {
  const resolvedContext = context ?? undefined;
  const campaign = await getTaskConfig({ id, context: resolvedContext });

  if (!campaign) {
    throw new Error(`No ion channel build campaign with id ${id} found`);
  }

  const configAsset = getAsset({
    assets: campaign.assets ?? [],
    label: AssetLabel.task_config,
  }).getOneOrNull();

  const [taskRows, config] = await Promise.all([
    Task.one<TIonChannelBuildCampaignMeta>({ campaign, id, context: resolvedContext, ...TaskFlow }),
    configAsset
      ? downloadAsset({
          entityId: campaign.id,
          entityType: EntityTypeDict.TaskConfig,
          id: configAsset.id,
          ctx: resolvedContext,
          asRawResponse: true,
        }).then((response) => response.json())
      : null,
  ]);

  return {
    campaign,
    config,
    sourceEntityId: taskRows.at(0)?.provenance.config.inputs.at(0)?.id ?? null,
  };
}

export type TResolvedIonChannelBuildByCampaign = Awaited<ReturnType<typeof resolve>>;
export type TResolvedIonChannelBuildByCampaigns = Awaited<ReturnType<typeof list>>;

export const IonChannelBuildCampaign: EntityCoreTypeConfig<
  ITaskConfig<TIonChannelBuildCampaignMeta>,
  TResolvedIonChannelBuildByCampaign,
  TResolvedIonChannelBuildByCampaigns
> = {
  group: EntityTypeGroup.Models,
  title: 'Ion channel',
  extendedType: ExtendedEntitiesTypeDict.IonChannelBuildCampaign,
  type: EntityTypeDict.TaskConfig,
  slug: EntitySlug.IonChannelBuildCampaign,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list,
      status,
      resolve,
      count: (params) => Task.count({ ...params, ...TaskFlow }),
      one: (params) => getTaskConfig({ id: params.id, context: params.context }),
      create: (data) => createTaskConfig({ data, context: data.context }),
    },
    expandRow: async (record, context) =>
      rows({
        campaign: record as ITaskConfig<TIonChannelBuildCampaignMeta>,
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
