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

export type TTaskConfigMeta = {
  scan_parameters?: Record<string, unknown>;
};

const TaskFlow: TTaskFlowTypes = {
  campaignConfigType: TaskConfigType.CircuitExtractionCampaign,
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
  return Task.many<TTaskConfigMeta>({
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
  campaign?: ITaskConfig<TTaskConfigMeta>;
  id: string;
  context: WorkspaceContext | undefined;
}) {
  return Task.one<TTaskConfigMeta>({
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
    throw new Error(`No extraction campaign with id ${id} found`);
  }

  const taskRows = await Task.one<TTaskConfigMeta>({
    id,
    context: resolvedContext,
    ...TaskFlow,
  });
  const firstConfig = taskRows.at(0)?.provenance.config;
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
    ctx: resolvedContext,
    asRawResponse: true,
  });
  const config = await rawConfig.json();

  return {
    campaign,
    config,
    circuitId,
  };
}

export type TExtendedExtractionCampaignsType = AwaitedType<ReturnType<typeof list>>;

export type TResolvedExtractionByCampaign = Awaited<ReturnType<typeof resolve>>;
export type TResolvedExtractionByCampaigns = Awaited<ReturnType<typeof list>>;

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
      list,
      status,
      // NOTE: this is guaranteed to be defined because it is used in the workflow definitions
      resolve,
      count: (params) => Task.count({ ...params, ...TaskFlow }),
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
