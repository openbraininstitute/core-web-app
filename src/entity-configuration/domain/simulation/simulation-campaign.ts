import flatMap from 'es-toolkit/compat/flatMap';
import keyBy from 'es-toolkit/compat/keyBy';

import { migrateConfig } from './utils';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getCircuit, getCircuits } from '@/api/entitycore/queries/model/circuit';
import { getCircuitSimulations } from '@/api/entitycore/queries/simulation/circuit-simulation';
import {
  createSimulationCampaign,
  getCircuitSimulationCampaign,
  getCircuitSimulationCampaigns,
} from '@/api/entitycore/queries/simulation/circuit-simulation-campaign';
import { getCircuitSimulationExecutions } from '@/api/entitycore/queries/simulation/circuit-simulation-execution';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type {
  ICircuitSimulationCampaign,
  ICircuitSimulationCampaignFilter,
} from '@/api/entitycore/types/entities/circuit-simulation-campaign';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { AwaitedType, WorkspaceContext } from '@/types/common';

// NOTE: this is due entitycore do not support yet
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

  const source = await getCircuitSimulationCampaigns({ context, withFacets, filters });
  // extract all simulation IDs
  const allSimIds = flatMap(
    source.data,
    (campaign) => campaign.simulations?.map((sim) => sim.id) ?? []
  );
  // fetch executions related to those simulation IDs
  const executionsResponse = await getCircuitSimulationExecutions({
    context,
    withFacets: false,
    filters: { used__id__in: allSimIds.join(',') },
  });
  const executions = executionsResponse.data;

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

  const circuits = await getCircuits({
    context,
    filters: { id__in: source.data.map((l) => l.entity_id).join(',') },
  });
  const circuitMap = keyBy(circuits.data, 'id');
  const result = enrichedData.map((entity) => ({
    ...entity,
    circuit: circuitMap[entity.entity_id] || null,
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

  // if (!configAsset) throw Error('No campaign config asset found');
  // TODO Revert this back when microcircuit simulations have obi-one generation config.
  if (!configAsset) {
    const circuit = await getCircuit({ id: campaign?.entity_id!, context });

    if (circuit.scale === CircuitScaleDictionary.Microcircuit) {
      return {
        campaign,
        simulation,
        config: null,
      };
    }

    throw Error('No campaign config asset found');
  }

  const rawConfig = await downloadAsset({
    entityId: campaign?.id!,
    entityType: EntityTypeDict.SimulationCampaign,
    id: configAsset?.id,
    ctx: context,
    asRawResponse: true,
  });
  const config = await rawConfig.json();

  migrateConfig(config);

  return {
    campaign,
    simulation,
    config,
  };
}

export type ExtendedCampaignsType = AwaitedType<ReturnType<typeof resolveSimulationCampaigns>>;

export const SimulationCampaign: EntityCoreTypeConfig<ICircuitSimulationCampaign> = {
  group: EntityTypeGroup.Simulations,
  title: 'Simulation campaign',
  extendedType: ExtendedEntitiesTypeDict.SimulationCampaign,
  type: EntityTypeDict.SimulationCampaign,
  slug: EntitySlug.SimulationCampaign,
  api: {
    config: { allowedFacets: true },
    query: {
      list: resolveSimulationCampaigns,
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
  detailViewSections: [DetailViewSectionsDict.Overview],
  isBookmarkable: true,
  isDownloadable: false,
  isCopyable: true,
  isSimulatable: false,
} as const;
