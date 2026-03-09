import { flatMap, keyBy } from 'es-toolkit/compat';

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

import { getExtendedSimMap, migrateConfig } from './utils';

import type { ICircuit, ICircuitFilter } from '@/api/entitycore/types/entities/circuit';
import type {
  ICircuitSimulationCampaign,
  ISimulationCampaignFilter,
} from '@/api/entitycore/types/entities/simulation-campaign';
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

  return executionsResponses.flatMap((r) => r.data);
}

const SCALE = CircuitScaleDictionary.SmallMicrocircuit;

// NOTE: this is due entitycore do not support yet the circuit inclusion
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
  context?: WorkspaceContext | null;
}) {
  const campaign = await getCircuitSimulationCampaign({ id, context });

  if (!campaign) {
    throw new Error(`No campaign with id ${id} found`);
  }

  const source = await getCircuitSimulations({
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

export const SmallMicrocircuitSimulation: EntityCoreTypeConfig<
  ICircuitSimulationCampaign,
  TResolvedSimulationByCampaign,
  TResolvedSimulationByCampaigns
> = {
  group: EntityTypeGroup.Simulations,
  title: 'Small microcircuit (beta)',
  extendedType: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  discriminator: { key: 'scale', value: [SCALE] },
  type: EntityTypeDict.SimulationCampaign,
  slug: EntitySlug.SmallMicrocircuitSimulation,
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
      resolve: resolveSimulationByCampaignId,
      create: createSimulationCampaign,
    },
    expandRow: async (record, _context) => record,
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
