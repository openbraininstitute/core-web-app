import flatMap from 'es-toolkit/compat/flatMap';
import keyBy from 'es-toolkit/compat/keyBy';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getCircuits } from '@/api/entitycore/queries/model/circuit';
import { getCircuitSimulations } from '@/api/entitycore/queries/simulation/circuit-simulation';
import {
  createSimulationCampaign,
  getCircuitSimulationCampaign,
  getCircuitSimulationCampaigns,
} from '@/api/entitycore/queries/simulation/circuit-simulation-campaign';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import type { ICircuitFilter } from '@/api/entitycore/types/entities/circuit';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import type {
  ICircuitSimulationCampaign,
  ICircuitSimulationCampaignFilter,
} from '@/api/entitycore/types/entities/circuit-simulation-campaign';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';
import { resolveExecutions } from './small-microcircuit-simulation';
import { getExtendedSimMap, migrateConfig } from './utils';

const SCALE = CircuitScaleDictionary.PairNeuron;

// NOTE: this is due entitycore do not support yet
async function resolveSimulationCampaigns({
  withFacets,
  context,
  filters,
  circuitScaleFilter,
}: {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<ICircuitSimulationCampaignFilter>;
  circuitScaleFilter?: Partial<ICircuitFilter>;
}) {
  // eslint-disable-next-line no-param-reassign
  filters = discardBrainRegionQueryParams(filters);

  const source = await getCircuitSimulationCampaigns({
    context,
    withFacets,
    filters: { ...filters, circuit__scale: SCALE },
  });
  // extract all simulation IDs
  const allSimIds = flatMap(
    source.data,
    (campaign) => campaign.simulations?.map((sim) => sim.id) ?? []
  );

  const [executions, simulationMap] = await Promise.all([
    resolveExecutions({ context, allSimIds }),
    // TODO: Switch to sim generation execution status for validation when implemented in obi-one.
    getExtendedSimMap(allSimIds, context),
  ]);

  // map simulationId -> array of executions that use it
  const executionsBySimId = executions.reduce<Record<string, typeof executions>>((acc, exec) => {
    exec.used.forEach((usedSim) => {
      if (!acc[usedSim.id]) acc[usedSim.id] = [];
      acc[usedSim.id].push(exec);
    });
    return acc;
  }, {});

  // TODO: Switch to sim generation execution status for validation when implemented in obi-one.
  const simulationMap = await getExtendedSimMap(allSimIds, context);

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
    filters: { id__in: source.data.map((l) => l.entity_id), ...circuitScaleFilter },
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

  if (!campaign) {
    throw new Error(`No campaign with id ${id} found`);
  }

  const source = await getCircuitSimulations({ context, filters: { simulation_campaign_id: id } });

  const simulation = source.data.at(0);
  const assets = campaign?.assets ?? [];
  const configAsset = getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.campaign_generation_config,
  });

  if (!configAsset) throw Error('No campaign config asset found');

  const rawConfig = await downloadAsset({
    entityId: campaign.id,
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

export const PairedNeuronCircuitSimulation: EntityCoreTypeConfig<ICircuitSimulationCampaign> = {
  group: EntityTypeGroup.Simulations,
  title: 'Paired neurons (beta)',
  extendedType: ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  type: EntityTypeDict.SimulationCampaign,
  slug: EntitySlug.PairedNeuronCircuitSimulation,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      count: (...params) => {
        const filters = discardBrainRegionQueryParams(params[0].filters);
        return getCircuitSimulationCampaigns({
          ...params,
          context: params[0].context,
          withFacets: params[0].withFacets,
          filters: {
            ...filters,
            circuit__scale: SCALE,
          },
        });
      },
      list: (params: Parameters<typeof resolveSimulationCampaigns>[0]) =>
        resolveSimulationCampaigns({
          ...params,
          circuitScaleFilter: {
            scale: SCALE,
          },
        }),
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
  isBookmarkable: false,
  isDownloadable: false,
  isCopyable: true,
  isSimulatable: false,
} as const;
