import { downloadAsset } from '@/api/entitycore/queries/assets';
import { createTaskConfig, getTaskConfig } from '@/api/entitycore/queries/task';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { Task } from '@/entity-configuration/domain/task-functions';

import type {
  ITaskConfig,
  ITaskConfigFilter,
  TTaskConfigType,
} from '@/api/entitycore/types/entities/task-config';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

type TTaskConfigCampaignMeta = {
  scan_parameters?: Record<string, unknown>;
};

export function defineTaskConfigCampaign({
  campaignConfigType,
  campaignName,
  ...entity
}: Pick<
  EntityCoreTypeConfig<ITaskConfig<TTaskConfigCampaignMeta>>,
  'title' | 'extendedType' | 'slug' | 'requiredFeatures'
> & {
  campaignConfigType: TTaskConfigType;
  campaignName: string;
}) {
  async function list({
    withFacets,
    context,
    filters,
  }: {
    withFacets?: boolean;
    context: WorkspaceContext | undefined;
    filters?: Partial<ITaskConfigFilter>;
  }) {
    return Task.many<TTaskConfigCampaignMeta>({
      context,
      withFacets,
      campaignConfigType,
      filters: discardBrainRegionQueryParams(filters),
    });
  }

  async function resolve({ id, context }: { id: string; context?: WorkspaceContext | null }) {
    const resolvedContext = context ?? undefined;
    const campaign = await getTaskConfig<TTaskConfigCampaignMeta>({ id, context: resolvedContext });

    if (!campaign) {
      throw new Error(`No ${campaignName} campaign with id ${id} found`);
    }

    const configAsset = getAsset({
      assets: campaign.assets ?? [],
      label: AssetLabel.task_config,
    }).getOneOrNull();

    const [taskRows, config] = await Promise.all([
      Task.one<TTaskConfigCampaignMeta>({
        campaign,
        id,
        context: resolvedContext,
        campaignConfigType,
      }),
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

  const config: EntityCoreTypeConfig<
    ITaskConfig<TTaskConfigCampaignMeta>,
    Awaited<ReturnType<typeof resolve>>,
    Awaited<ReturnType<typeof list>>
  > = {
    ...entity,
    group: EntityTypeGroup.Models,
    type: EntityTypeDict.TaskConfig,
    api: {
      config: {
        allowedFacets: true,
        ilikeSearchEnabled: true,
      },
      query: {
        list,
        status: ({ id, context }) => Task.status({ campaignId: id, context: context ?? undefined }),
        resolve,
        count: (params) => Task.count({ ...params, campaignConfigType }),
        one: (params) => getTaskConfig({ id: params.id, context: params.context }),
        create: (data) => createTaskConfig({ data, context: data.context }),
      },
      expandRow: async (record, context) =>
        Task.one<TTaskConfigCampaignMeta>({
          campaign: record,
          id: record.id,
          context,
          campaignConfigType,
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
  };
  return config;
}
