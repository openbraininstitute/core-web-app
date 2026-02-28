import { flatMap, get, sortBy } from 'es-toolkit/compat';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getIonChannelModel } from '@/api/entitycore/queries/model/ion-channel-model';
import {
  getIonChannelModelingCampaign,
  getIonChannelModelingCampaigns,
} from '@/api/entitycore/queries/model/ion-channel-modeling-campaign';
import { getIonChannelModelingConfigs } from '@/api/entitycore/queries/model/ion-channel-modeling-config';
import { getIonChannelModelingExecutions } from '@/api/entitycore/queries/model/ion-channel-modeling-execution';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type {
  IonChannelModelingCampaign as IIonChannelModelingCampaign,
  IonChannelModelingCampaignFilter,
} from '@/api/entitycore/types/entities/ion-channel-modeling-campaign';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { AwaitedType, WorkspaceContext } from '@/types/common';

async function resolveIonChannelModelingCampaigns({
  withFacets,
  context,
  filters,
}: {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<IonChannelModelingCampaignFilter>;
}) {
  filters = discardBrainRegionQueryParams(filters);

  const source = await getIonChannelModelingCampaigns({
    context,
    withFacets,
    filters,
  });

  const campaignIDs = source.data.map((o) => o.id);

  // fetch all configs belonging to these campaigns
  const configs =
    campaignIDs.length > 0
      ? await getIonChannelModelingConfigs({
          context,
          withFacets: false,
          filters: { ion_channel_modeling_campaign_id__in: campaignIDs },
        })
      : { data: [] };

  const configsByCampaignId = configs.data.reduce<Record<string, (typeof configs.data)[number][]>>(
    (acc, config) => {
      const cid = config.ion_channel_modeling_campaign_id;
      if (!acc[cid]) acc[cid] = [];
      acc[cid].push(config);
      return acc;
    },
    {}
  );

  // fetch all executions linked to those configs
  const configIDs = configs.data.map((c) => c.id);
  const executionsResponse =
    configIDs.length > 0
      ? await getIonChannelModelingExecutions({
          context,
          withFacets: false,
          filters: { used__id__in: configIDs },
        })
      : {
          data: [] as Awaited<ReturnType<typeof getIonChannelModelingExecutions>>['data'],
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

  // enrich each campaign with configs → executions
  const enrichedData = source.data.map((campaign) => {
    const campaignConfigs = configsByCampaignId[campaign.id] ?? [];
    const enrichedConfigs = campaignConfigs.map((config) => ({
      ...config,
      executions: executionsByConfigId[config.id] ?? [],
    }));
    return { ...campaign, configs: enrichedConfigs };
  });

  return {
    data: enrichedData,
    pagination: source.pagination,
    facets: source.facets,
  };
}

export async function resolveIonChannelModelingByCampaignId({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const campaign = await getIonChannelModelingCampaign({ id, context });

  if (!campaign) {
    throw new Error(`No ion channel modeling campaign with id ${id} found`);
  }

  // campaign → configs
  const configs = await getIonChannelModelingConfigs({
    context,
    withFacets: false,
    filters: { ion_channel_modeling_campaign_id: id },
  });

  // configs → executions
  const configIDs = configs.data.map((c) => c.id);
  const executionsResponse =
    configIDs.length > 0
      ? await getIonChannelModelingExecutions({
          context,
          withFacets: false,
          filters: { used__id__in: configIDs },
        })
      : {
          data: [] as Awaited<ReturnType<typeof getIonChannelModelingExecutions>>['data'],
        };

  // extract generated ion channel model IDs from executions
  const generatedModelIds = flatMap(
    executionsResponse.data,
    (exec) => exec.generated?.map((g) => g.id) ?? []
  );

  return {
    campaign,
    configs: configs.data,
    generatedModelIds,
  };
}

export type TExtendedIonChannelModelingCampaignsType = AwaitedType<
  ReturnType<typeof resolveIonChannelModelingCampaigns>
>;

export async function resolveIonChannelModelingCampaignConfig({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const campaign = await getIonChannelModelingCampaign({ id, context });

  if (!campaign) {
    throw new Error(`No ion channel modeling campaign with id ${id} found`);
  }

  const assets = campaign.assets ?? [];
  const configAsset = getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.campaign_generation_config,
  });

  if (!configAsset) {
    return { campaign, config: null };
  }

  const rawConfig = await downloadAsset({
    entityId: campaign.id,
    entityType: EntityTypeDict.IonChannelModelingCampaign,
    id: configAsset.id,
    ctx: context,
    asRawResponse: true,
  });
  const config = await rawConfig.json();

  return { campaign, config };
}

/**
 * resolves the full build output for a campaign in readonly mode
 * fetches configs → executions → generated models (with assets) so the output
 * component can display input/output files without triggering a new build.
 */
export async function resolveIonChannelModelingCampaignBuilds({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const { campaign, configs, generatedModelIds } = await resolveIonChannelModelingByCampaignId({
    id,
    context,
  });

  // Fetch configs with assets
  const configIDs = configs.map((c) => c.id);
  const executionsResponse =
    configIDs.length > 0
      ? await getIonChannelModelingExecutions({
          context,
          withFacets: false,
          filters: { used__id__in: configIDs },
        })
      : {
          data: [] as Awaited<ReturnType<typeof getIonChannelModelingExecutions>>['data'],
        };

  const models = await Promise.all(
    generatedModelIds.map((modelId) => getIonChannelModel({ id: modelId, context }))
  );
  const modelsById = new Map(models.map((m) => [m.id, m]));
  const configsById = new Map(configs.map((c) => [c.id, c]));

  const builds = executionsResponse.data.map((execution) => {
    const configId = execution.used.at(0)?.id;
    const config = configId ? configsById.get(configId) : undefined;
    const modelRef = execution.generated?.at(0);
    const model = modelRef ? modelsById.get(modelRef.id) : undefined;

    return {
      executionId: execution.id,
      status: execution.status,
      executionStatus: execution.status,
      configEntity: config
        ? { id: config.id, type: config.type, assets: config.assets ?? [] }
        : { id: '', type: '' as any, assets: [] },
      modelEntity: model
        ? { id: model.id, type: model.type, assets: model.assets ?? [] }
        : undefined,
    };
  });

  return { campaign, builds };
}

type TResolvedIonChannelModelingByCampaign = Awaited<
  ReturnType<typeof resolveIonChannelModelingByCampaignId>
>;
type TResolvedIonChannelModelingByCampaigns = Awaited<
  ReturnType<typeof resolveIonChannelModelingCampaigns>
>;

type TEnrichedIonChannelModelingCampaign = TExtendedIonChannelModelingCampaignsType['data'][number];
type TEnrichedIonChannelModelingConfig = TEnrichedIonChannelModelingCampaign['configs'][number];

function getIonChannelModelingConfigStatus(config: TEnrichedIonChannelModelingConfig) {
  const executions = get(config, 'executions', []) as Array<{
    status?: string;
    creation_date?: string;
  }>;
  const sorted = sortBy(executions, (e) => e.creation_date);
  return (sorted.at(-1)?.status as ActivityStatus) ?? ActivityStatus.CREATED;
}

export function getStatusCountMap(campaign: TEnrichedIonChannelModelingCampaign) {
  const allConfigs = campaign.configs ?? [];

  return allConfigs.reduce((map, config) => {
    const status = getIonChannelModelingConfigStatus(config);
    return map.set(status, (map.get(status) ?? 0) + 1);
  }, new Map<ActivityStatus, number>());
}

export const IonChannelModelingCampaign: EntityCoreTypeConfig<
  IIonChannelModelingCampaign,
  TResolvedIonChannelModelingByCampaign,
  TResolvedIonChannelModelingByCampaigns
> = {
  group: EntityTypeGroup.Models,
  title: 'Ion channel modeling campaign',
  extendedType: ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
  type: EntityTypeDict.IonChannelModelingCampaign,
  slug: EntitySlug.IonChannelModelingCampaign,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: resolveIonChannelModelingCampaigns,
      one: getIonChannelModelingCampaign,
      resolve: resolveIonChannelModelingByCampaignId,
    },
  },
  asset: {
    extension: 'application/json',
  },
  detailViewSections: [DetailViewSectionsDict.Overview],
  isBookmarkable: false,
  isDownloadable: false,
  isCopyable: false,
  isSimulatable: false,
} as const;
