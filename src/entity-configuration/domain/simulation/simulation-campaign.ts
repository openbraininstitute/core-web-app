import { flatMap, get, keyBy, sortBy } from 'es-toolkit/compat';

import { getMEModel } from '@/api/entitycore/queries';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { getCircuit, getCircuits } from '@/api/entitycore/queries/model/circuit';
import {
  createSimulationCampaign,
  getSimulationCampaign,
  getSimulationCampaigns,
} from '@/api/entitycore/queries/simulation/campaign';
import { getSimulations } from '@/api/entitycore/queries/simulation/campaign/simulation';
import { getSimulationExecutions } from '@/api/entitycore/queries/simulation/campaign/simulation-execution';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import { getExtendedSimMap, hasSimConfigAsset, migrateConfig } from './utils';

import type { IMEModel } from '@/api/entitycore/types';
import type { IExecutionActivity } from '@/api/entitycore/types/entities/execution';
import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type {
  ICircuitSimulationCampaign,
  ISimulationCampaignFilter,
} from '@/api/entitycore/types/entities/simulation-campaign';
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
  filters?: Partial<ISimulationCampaignFilter>;
}) {
  filters = discardBrainRegionQueryParams(filters);

  const source = await getSimulationCampaigns({
    context,
    withFacets,
    filters,
  });
  // extract all simulation IDs
  const allSimIds = flatMap(
    source.data,
    (campaign) => campaign.simulations?.map((sim) => sim.id) ?? []
  );
  // fetch executions related to those simulation IDs
  const executionsResponse = await getSimulationExecutions({
    context,
    withFacets: false,
    filters: { used__id__in: allSimIds },
  });
  const executions = executionsResponse.data;

  // TODO: Switch to sim generation execution status for validation when implemented in obi-one.
  const simulationMap = await getExtendedSimMap(allSimIds, context);

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
      ...simulationMap.get(sim.id),
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
  populate = ['entity', 'config'],
}: {
  id: string;
  context?: WorkspaceContext | null;
  populate?: Array<string>;
}) {
  const campaign = await getSimulationCampaign({ id, context });

  if (!campaign) {
    throw new Error(`No campaign with id ${id} found`);
  }

  const source = await getSimulations({
    context,
    filters: { simulation_campaign_id: id },
  });

  const simulation = source.data.at(0);
  const assets = campaign?.assets ?? [];
  const configAsset = getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.campaign_generation_config,
  });

  // if (!configAsset) throw Error('No campaign config asset found');
  // TODO Revert this back when microcircuit simulations have obi-one generation config.
  if (!configAsset) {
    const circuit = await getCircuit({ id: campaign?.entity_id, context });

    if (circuit.scale === CircuitScaleDictionary.Microcircuit) {
      return {
        campaign,
        simulation,
        entity: circuit,
        config: null,
      };
    }

    throw Error('No campaign config asset found');
  }

  let config = null;
  let entity: ICircuit | IMEModel | null = null;

  if (simulation?.entity_id && populate.includes('entity')) {
    const en = await getEntity({ id: campaign?.entity_id, context });
    if (en.type === EntityTypeDict.Circuit) {
      entity = await getCircuit({ id: campaign?.entity_id, context });
    }
    if (en.type === EntityTypeDict.Memodel) {
      entity = await getMEModel({ id: campaign?.entity_id, context });
    }
  }

  if (populate.includes('config')) {
    const rawConfig = await downloadAsset({
      entityId: campaign?.id,
      entityType: EntityTypeDict.SimulationCampaign,
      id: configAsset?.id,
      ctx: context,
      asRawResponse: true,
    });
    config = await rawConfig.json();
    migrateConfig(config);
  }

  return {
    campaign,
    simulation,
    entity,
    config,
  };
}

export function getSimulationStatus(simulation: ISimulation) {
  const executions = get(simulation, 'executions', []) as IExecutionActivity[];
  const sortedExecutions = sortBy(executions, (exec) => exec.creation_date);

  // Used when there are no executions present
  const fallbackStatus = hasSimConfigAsset(simulation)
    ? ActivityStatus.CREATED
    : ActivityStatus.ERROR;

  const status = sortedExecutions.at(-1)?.status ?? fallbackStatus;

  return status;
}

export function getCircuitSimulationStatusCountMap(simCampaign: ICircuitSimulationCampaign) {
  const simulations = get(simCampaign, 'simulations', []) as ISimulation[];

  const statusCountMap = simulations.reduce((map, simulation) => {
    const status = getSimulationStatus(simulation);

    return map.set(status, (map.get(status) ?? 0) + 1);
  }, new Map());

  return statusCountMap;
}

export type ExtendedCampaignsType = AwaitedType<ReturnType<typeof resolveSimulationCampaigns>>;

type TResolvedSimulationByCampaign = Awaited<ReturnType<typeof resolveSimulationByCampaignId>>;
type TResolvedSimulationByCampaigns = Awaited<ReturnType<typeof resolveSimulationCampaigns>>;

export const SimulationCampaign: EntityCoreTypeConfig<
  ICircuitSimulationCampaign,
  TResolvedSimulationByCampaign,
  TResolvedSimulationByCampaigns
> = {
  group: EntityTypeGroup.Simulations,
  title: 'Simulation campaign',
  extendedType: ExtendedEntitiesTypeDict.SimulationCampaign,
  type: EntityTypeDict.SimulationCampaign,
  slug: EntitySlug.SimulationCampaign,
  isDeletable: false,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      count: (...params) => {
        const filters = discardBrainRegionQueryParams(params[0].filters);
        return getSimulationCampaigns({
          ...params,
          context: params[0].context,
          withFacets: params[0].withFacets,
          filters: {
            ...filters,
            page: 1,
            page_size: 1,
          },
        }).then((response) => response.pagination.total_items);
      },
      list: resolveSimulationCampaigns,
      one: getSimulationCampaign,
      resolve: resolveSimulationByCampaignId,
      create: createSimulationCampaign,
    },
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
