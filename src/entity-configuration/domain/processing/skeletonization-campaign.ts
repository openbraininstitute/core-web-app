import { flatMap, get, keyBy, sortBy } from 'es-toolkit/compat';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import {
  createSkeletonizationCampaign,
  getSkeletonizationCampaign,
  getSkeletonizationCampaigns,
} from '@/api/entitycore/queries/processing/em-cell-mesh/skeletonization-campaign';
import { getSkeletonizationConfigs } from '@/api/entitycore/queries/processing/em-cell-mesh/skeletonization-config';
import { getSkeletonizationConfigGenerations } from '@/api/entitycore/queries/processing/em-cell-mesh/skeletonization-config-generation';
import { getSkeletonizationExecutions } from '@/api/entitycore/queries/processing/em-cell-mesh/skeletonization-execution';
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
  ISkeletonizationCampaign,
  ISkeletonizationCampaignFilter,
} from '@/api/entitycore/types/entities/skeletonization-campaign';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { AwaitedType, WorkspaceContext } from '@/types/common';

async function resolveSkeletonizationCampaigns({
  withFacets,
  context,
  filters,
}: {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<ISkeletonizationCampaignFilter>;
}) {
  filters = discardBrainRegionQueryParams(filters);

  const source = await getSkeletonizationCampaigns({
    context,
    withFacets,
    filters,
  });
  const campaignIDs = source.data.map((o) => o.id);

  // fetch all generations linked to these campaigns
  const generations = await getSkeletonizationConfigGenerations({
    context,
    withFacets: false,
    filters: { used__id__in: campaignIDs },
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
      ? await getSkeletonizationConfigs({
          context,
          withFacets: false,
          filters: { id__in: allConfigIds },
        })
      : { data: [] };
  const configById = keyBy(configs.data, 'id');

  // fetch all executions linked to those configs
  const configIDs = configs.data.map((c) => c.id);
  const executionsResponse =
    configIDs.length > 0
      ? await getSkeletonizationExecutions({
          context,
          withFacets: false,
          filters: { used__id__in: configIDs },
        })
      : {
          data: [] as Awaited<ReturnType<typeof getSkeletonizationExecutions>>['data'],
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

  // enrich each campaign with its generations → configs → executions
  const enrichedData = source.data.map((campaign) => {
    const campaignGenerations = generationsByCampaignId[campaign.id] ?? [];
    const enrichedGenerations = campaignGenerations.map((gen) => {
      const genConfigs = (gen.generated ?? []).map((g) => {
        const config = configById[g.id];
        return {
          ...config,
          executions: executionsByConfigId[g.id] ?? [],
        };
      });
      return { ...gen, configs: genConfigs };
    });
    return { ...campaign, generations: enrichedGenerations };
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
  const campaign = await getSkeletonizationCampaign({ id, context });

  if (!campaign) {
    throw new Error(`No skeletonization campaign with id ${id} found`);
  }

  // campaign → config generations
  const generations = await getSkeletonizationConfigGenerations({
    context,
    withFacets: false,
    filters: { used__id: id },
  });

  // config generations → configs
  const allConfigIds = flatMap(generations.data, (gen) => gen.generated?.map((g) => g.id) ?? []);
  const configs =
    allConfigIds.length > 0
      ? await getSkeletonizationConfigs({
          context,
          withFacets: false,
          filters: { id__in: allConfigIds },
        })
      : { data: [] };

  const firstConfig = configs.data.at(0);

  // get the generation config asset from the campaign
  const assets = campaign.assets ?? [];
  const configAsset = getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.campaign_generation_config,
  });

  if (!configAsset) {
    return {
      campaign,
      config: null,
      emCellMeshId: firstConfig?.em_cell_mesh_id ?? null,
    };
  }

  const rawConfig = await downloadAsset({
    entityId: campaign.id,
    entityType: EntityTypeDict.SkeletonizationCampaign,
    id: configAsset.id,
    ctx: context,
    asRawResponse: true,
  });
  const config = await rawConfig.json();

  return {
    campaign,
    config,
    emCellMeshId: firstConfig?.em_cell_mesh_id ?? null,
  };
}

export type TExtendedSkeletonizationCampaignsType = AwaitedType<
  ReturnType<typeof resolveSkeletonizationCampaigns>
>;

export type TEnrichedSkeletonizationCampaign =
  TExtendedSkeletonizationCampaignsType['data'][number];
type TEnrichedConfig = TEnrichedSkeletonizationCampaign['generations'][number]['configs'][number];

export function getSkeletonizationStatus(config: TEnrichedConfig) {
  const executions = get(config, 'executions', []) as Array<{
    status?: string;
    creation_date?: string;
  }>;
  const sorted = sortBy(executions, (e) => e.creation_date);
  return (sorted.at(-1)?.status as ActivityStatus) ?? ActivityStatus.CREATED;
}

export function getSkeletonizationStatusCountMap(campaign: TEnrichedSkeletonizationCampaign) {
  const allConfigs = campaign.generations.flatMap((gen) => gen.configs);

  return allConfigs.reduce((map, config) => {
    const status = getSkeletonizationStatus(config);
    return map.set(status, (map.get(status) ?? 0) + 1);
  }, new Map<ActivityStatus, number>());
}

export const SkeletonizationCampaign: EntityCoreTypeConfig<ISkeletonizationCampaign> = {
  group: EntityTypeGroup.Processing,
  title: 'Skeletonization Campaign',
  extendedType: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
  type: EntityTypeDict.SkeletonizationCampaign,
  slug: EntitySlug.Skeletonization,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: resolveSkeletonizationCampaigns,
      one: getSkeletonizationCampaign,
      create: createSkeletonizationCampaign,
    },
    expandRow: async (record, _context) => record,
  },
  explore: {
    basePrefix: 'process',
    routePrefix: 'process',
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
