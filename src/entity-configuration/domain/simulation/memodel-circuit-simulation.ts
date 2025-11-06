import flatMap from 'es-toolkit/compat/flatMap';
import keyBy from 'es-toolkit/compat/keyBy';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getCircuitSimulations } from '@/api/entitycore/queries/simulation/circuit-simulation';
import { getCircuitSimulationExecutions } from '@/api/entitycore/queries/simulation/circuit-simulation-execution';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import {
  createSimulationCampaign,
  getCircuitSimulationCampaign,
  getCircuitSimulationCampaigns,
} from '@/api/entitycore/queries/simulation/circuit-simulation-campaign';

import { getMEModels } from '@/api/entitycore/queries';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import type {
  ICircuitSimulationCampaign,
  ICircuitSimulationCampaignFilter,
} from '@/api/entitycore/types/entities/circuit-simulation-campaign';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

export async function resolveExecutions({
  context,
  allSimIds,
}: {
  context: WorkspaceContext | undefined;
  allSimIds: string[];
}) {
  const chunkSize = 30;

  const promises: ReturnType<typeof getCircuitSimulationExecutions>[] = [];

  for (let i = 0; i < allSimIds.length; i += chunkSize) {
    const chunk = allSimIds.slice(i, i + chunkSize);

    promises.push(
      getCircuitSimulationExecutions({
        context,
        withFacets: false,
        filters: { used__id__in: [...chunk] },
      })
    );
  }

  const executionsResponses = await Promise.all(promises);

  return executionsResponses.map((r) => r.data).flat();
}

// NOTE: this is due entitycore do not support yet the circuit inclusion
async function resolveSimulationCampaigns({
  withFacets,
  context,
  filters,
}: {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<ICircuitSimulationCampaignFilter>;
}) {
  // eslint-disable-next-line no-param-reassign
  filters = discardBrainRegionQueryParams(filters);
  const source = await getCircuitSimulationCampaigns({
    context,
    withFacets,
    filters: { ...filters },
  });

  // extract all simulation IDs
  const allSimIds = flatMap(
    source.data,
    (campaign) => campaign.simulations?.map((sim) => sim.id) ?? []
  );

  const executions = await resolveExecutions({ context, allSimIds });

  // map simulationId -> array of executions that use it
  const executionsBySimId = executions.reduce<Record<string, typeof executions>>((acc, exec) => {
    exec.used.forEach((usedSim) => {
      if (!acc[usedSim.id]) acc[usedSim.id] = [];
      acc[usedSim.id].push(exec);
    });
    return acc;
  }, {});

  // attach executions to each simulation (choose to add all executions as array)
  const enrichedData = source.data.map((campaign) => ({
    ...campaign,
    simulations: campaign.simulations?.map((sim) => ({
      ...sim,
      executions: executionsBySimId[sim.id] ?? [],
    })),
  }));

  const memodels = await getMEModels({
    context,
    filters: { id__in: source.data.map((l) => l.entity_id) },
  });
  const memodelMap = keyBy(memodels.data, 'id');
  const result = enrichedData.map((entity) => ({
    ...entity,
    memodel: memodelMap[entity.entity_id] || null,
  }));

  return {
    data: result,
    pagination: source.pagination,
    facets: source.facets,
  };
}

export async function resolveSimulationByCampaignId({
  id,
  context,
}: {
  id: string;
  context: WorkspaceContext | undefined;
}) {
  const campaign = await getCircuitSimulationCampaign({ id, context });
  const source = await getCircuitSimulations({ context, filters: { simulation_campaign_id: id } });

  const simulation = source.data.at(0);
  const assets = campaign?.assets ?? [];
  const configAsset = getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.campaign_generation_config,
  });

  if (!configAsset) throw Error('No campaign config asset found');

  const rawConfig = await downloadAsset({
    entityId: campaign?.id!,
    entityType: EntityTypeDict.SimulationCampaign,
    id: configAsset?.id,
    ctx: context,
    asRawResponse: true,
  });
  const config = await rawConfig.json();

  return {
    campaign,
    simulation,
    config,
  };
}

export const MEModelCircuitSimulation: EntityCoreTypeConfig<ICircuitSimulationCampaign> = {
  group: EntityTypeGroup.Simulations,
  title: 'Single neuron [Unified UI] simulation',
  extendedType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  type: EntityTypeDict.SimulationCampaign,
  slug: EntitySlug.MEModelCircuitSimulation,
  api: {
    config: { allowedFacets: true },
    query: {
      list: (params: Parameters<typeof resolveSimulationCampaigns>[0]) =>
        resolveSimulationCampaigns(params),
      one: getCircuitSimulationCampaign,
      create: createSimulationCampaign,
    },
  },
  explore: {
    basePrefix: 'simulate',
    routePrefix: 'simulate',
  },
  asset: {
    extension: 'application/json',
  },
  detailViewSections: ['overview'],
  isBookmarkable: true,
  isDownloadable: false,
  isCopyable: true,
  isSimulatable: false,
} as const;
