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
import type { AwaitedType, WorkspaceContext } from '@/types/common';

export type TExtracellularRecordingArrayCampaignMeta = {
  scan_parameters?: Record<string, unknown>;
};

// The build campaign is tracked through the launchable weights-calculation task family (there is no
// dedicated `create_extracellular_recording_array` entitycore task type).
const TaskFlow: TTaskFlowTypes = {
  campaignConfigType: TaskConfigType.ExtracellularRecordingWeightsCalculationCampaign,
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
  return Task.many<TExtracellularRecordingArrayCampaignMeta>({
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
  campaign?: ITaskConfig<TExtracellularRecordingArrayCampaignMeta>;
  id: string;
  context: WorkspaceContext | undefined;
}) {
  return Task.one<TExtracellularRecordingArrayCampaignMeta>({
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
    throw new Error(`No extracellular recording array campaign with id ${id} found`);
  }

  const taskRows = await Task.one<TExtracellularRecordingArrayCampaignMeta>({
    id,
    context: resolvedContext,
    ...TaskFlow,
  });
  const firstConfig = taskRows.at(0)?.provenance.config;
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
    ctx: resolvedContext,
    asRawResponse: true,
  });
  const config = await rawConfig.json();

  return {
    campaign,
    config,
    sourceEntityId,
  };
}

export type TExtendedExtracellularRecordingArrayCampaignsType = AwaitedType<
  ReturnType<typeof list>
>;

export type TResolvedExtracellularRecordingArrayByCampaign = Awaited<ReturnType<typeof resolve>>;
export type TResolvedExtracellularRecordingArrayByCampaigns = Awaited<ReturnType<typeof list>>;

export const ExtracellularRecordingArrayCampaign: EntityCoreTypeConfig<
  ITaskConfig<TExtracellularRecordingArrayCampaignMeta>,
  TResolvedExtracellularRecordingArrayByCampaign,
  TResolvedExtracellularRecordingArrayByCampaigns
> = {
  group: EntityTypeGroup.Models,
  title: 'Extracellular recording array (beta)',
  extendedType: ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign,
  type: EntityTypeDict.TaskConfig,
  slug: EntitySlug.ExtracellularRecordingArrayCampaign,
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
        campaign: record as ITaskConfig<TExtracellularRecordingArrayCampaignMeta>,
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
