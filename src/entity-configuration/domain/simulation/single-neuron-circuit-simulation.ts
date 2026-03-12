import flatMap from 'es-toolkit/compat/flatMap';
import keyBy from 'es-toolkit/compat/keyBy';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getCircuit, getCircuits } from '@/api/entitycore/queries/model/circuit';
import {
  createSimulationCampaign,
  getSimulationCampaign,
  getSimulationCampaigns,
} from '@/api/entitycore/queries/simulation/campaign';
import { getSimulations } from '@/api/entitycore/queries/simulation/campaign/simulation';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import { resolveExecutions } from './small-microcircuit-simulation';
import { getExtendedSimMap, migrateConfig } from './utils';

import type { ICircuit, ICircuitFilter } from '@/api/entitycore/types/entities/circuit';
import type {
  ICircuitSimulationCampaign,
  ISimulationCampaignFilter,
} from '@/api/entitycore/types/entities/simulation-campaign';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

const SCALE = CircuitScaleDictionary.Single;

// NOTE: this is due entitycore do not support yet
async function resolveSimulationCampaigns({
  withFacets,
  context,
  filters,
  circuitScaleFilter,
}: {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<ISimulationCampaignFilter>;
  circuitScaleFilter?: Partial<ICircuitFilter>;
}) {
  filters = discardBrainRegionQueryParams(filters);

  const source = await getSimulationCampaigns({
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
    filters: {
      id__in: source.data.map((l) => l.entity_id),
      ...circuitScaleFilter,
    },
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

  if (!configAsset) throw Error('No campaign config asset found');

  let entity: ICircuit | null = null;
  if (simulation?.entity_id) entity = await getCircuit({ id: simulation?.entity_id, context });

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
    entity,
    config,
  };
}

type TResolvedSimulationByCampaign = Awaited<ReturnType<typeof resolveSimulationByCampaignId>>;
type TResolvedSimulationByCampaigns = Awaited<ReturnType<typeof resolveSimulationCampaigns>>;

export const SingeNeuronCircuitSimulation: EntityCoreTypeConfig<
  ICircuitSimulationCampaign,
  TResolvedSimulationByCampaign,
  TResolvedSimulationByCampaigns
> = {
  group: EntityTypeGroup.Simulations,
  title: 'Synaptome (beta)',
  extendedType: ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
  type: EntityTypeDict.SimulationCampaign,
  slug: EntitySlug.SingleNeuronCircuitSimulation,
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
      one: getSimulationCampaign,
      create: createSimulationCampaign,
    },
    expandRow: async (record, _context) => record,
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
