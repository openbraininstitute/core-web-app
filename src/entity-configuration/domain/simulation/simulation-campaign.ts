import { get, includes, keyBy } from 'es-toolkit/compat';

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
import {
  CircuitScaleDictionary,
  type ICircuit,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { TASK_PAGE_SIZE } from '@/features/task-runner/constants';
import { fetchChunkedPages } from '@/features/task-runner/query-utils';

import { getSimulationStatusFromExecutions, getSimulationStatusMap } from './status-utils';
import { getExtendedSimMap, migrateConfig } from './utils';

import type { IMEModel } from '@/api/entitycore/types';
import type { IExecutionActivity } from '@/api/entitycore/types/entities/execution';
import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type {
  ICircuitSimulationCampaign,
  ISimulationCampaignFilter,
  TSimulationCampaignEntityTypeDict,
} from '@/api/entitycore/types/entities/simulation-campaign';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { AwaitedType, WorkspaceContext } from '@/types/common';

export type SimulationCampaignListParams = {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<ISimulationCampaignFilter>;
};

export type SimulationRow = ISimulation & { status?: ActivityStatus };

export async function list({ withFacets, context, filters }: SimulationCampaignListParams) {
  filters = discardBrainRegionQueryParams(filters);

  const source = await getSimulationCampaigns({
    context,
    withFacets,
    filters,
  });
  const circuits = await getCircuits({
    context,
    filters: { id__in: source.data.map((campaign) => campaign.entity_id) },
  });
  const circuitMap = keyBy(circuits.data, 'id');

  return {
    data: source.data.map((campaign) => ({
      ...campaign,
      circuit: circuitMap[campaign.entity_id] || null,
    })),
    pagination: source.pagination,
    facets: source.facets,
  };
}

export function listByScale(scale: TCircuitScaleDictionary) {
  return (params: SimulationCampaignListParams) => {
    const filters = discardBrainRegionQueryParams(params.filters);

    return list({
      ...params,
      filters: { ...filters, circuit__scale: scale },
    });
  };
}

export function listByEntityType(entityType: TSimulationCampaignEntityTypeDict) {
  return ({ withFacets, context, filters }: SimulationCampaignListParams) => {
    filters = discardBrainRegionQueryParams(filters);

    return getSimulationCampaigns({
      context,
      withFacets,
      filters: { ...filters, entity__type: entityType },
    });
  };
}

export function count(extraFilters?: Partial<ISimulationCampaignFilter>) {
  return (params: SimulationCampaignListParams) => {
    const filters = discardBrainRegionQueryParams(params.filters);

    return getSimulationCampaigns({
      ...params,
      context: params.context,
      withFacets: params.withFacets,
      filters: {
        ...filters,
        ...extraFilters,
        page: 1,
        page_size: 1,
      },
    }).then((response) => response.pagination.total_items);
  };
}

export async function children({
  id,
  withFacets,
  context,
  filters,
}: {
  id: string;
  withFacets?: boolean;
  context?: WorkspaceContext | null;
  filters?: Record<string, unknown>;
}) {
  const source = await getSimulations({
    withFacets,
    context,
    filters: {
      ...filters,
      simulation_campaign_id: id,
    },
  });

  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  });

  return {
    ...source,
    data: [...source.data].sort((a, b) => collator.compare(a.name, b.name)),
  };
}

export async function statusByIds({
  simulations,
  simulationIds,
  context,
}: {
  simulations?: ISimulation[];
  simulationIds?: string[];
  context?: WorkspaceContext | null;
}) {
  const source =
    simulations ??
    Array.from((await getExtendedSimMap(simulationIds ?? [], context ?? undefined)).values());
  const ids = source.map((simulation) => simulation.id);
  const executions = await listExecutions({ simulationIds: ids, context });

  return getSimulationStatusMap({
    simulations: source,
    executions,
    createdStatus: ActivityStatus.CREATED,
    errorStatus: ActivityStatus.ERROR,
  }) as Map<string, ActivityStatus>;
}

export async function statusById({
  id,
  simulation,
  context,
}: {
  id: string;
  simulation?: ISimulation;
  context?: WorkspaceContext | null;
}) {
  const source =
    simulation ?? Array.from((await getExtendedSimMap([id], context ?? undefined)).values()).at(0);
  const executions = await listExecutionsBySimulationId({
    simulationId: id,
    context,
  });

  const results = getSimulationStatusFromExecutions({
    simulation: source ?? { id },
    executions,
    createdStatus: ActivityStatus.CREATED,
    errorStatus: ActivityStatus.ERROR,
  }) as ActivityStatus;

  return results;
}

export async function status({ id, context }: { id: string; context?: WorkspaceContext | null }) {
  const simulations = await listAllChildren({ id, context });
  const statusMap = await statusByIds({ simulations, context });

  return Array.from(statusMap.values()).reduce<Map<ActivityStatus, number>>(
    (map: Map<ActivityStatus, number>, value: ActivityStatus) => {
      map.set(value, (map.get(value) ?? 0) + 1);
      return map;
    },
    new Map<ActivityStatus, number>()
  );
}

export async function rows({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}): Promise<SimulationRow[]> {
  const simulations = await listAllChildren({ id, context });
  const statusMap = await statusByIds({ simulations, context });

  return simulations.map((simulation) => ({
    ...simulation,
    status: statusMap.get(simulation.id) ?? getSimulationStatus(simulation),
  }));
}

export async function listAllChildren({
  id,
  context,
  pageSize = 100,
}: {
  id: string;
  context?: WorkspaceContext | null;
  pageSize?: number;
}) {
  const simulations: ISimulation[] = [];
  let page = 1;

  while (true) {
    const response = await children({
      id,
      context,
      filters: { page, page_size: pageSize },
    });
    simulations.push(...response.data);

    if (response.data.length < pageSize) break;
    page += 1;
  }

  return simulations;
}

export async function listExecutions({
  simulationIds,
  context,
}: {
  simulationIds: string[];
  context?: WorkspaceContext | null;
}) {
  return fetchChunkedPages({
    values: simulationIds,
    chunkSize: TASK_PAGE_SIZE,
    pageSize: TASK_PAGE_SIZE,
    prepareValues: (values) => Array.from(new Set(values)),
    fetchPage: ({ chunkValues, page, pageSize }) =>
      getSimulationExecutions({
        context,
        withFacets: false,
        filters: { used__id__in: chunkValues, page, page_size: pageSize },
      }),
  });
}

export async function listExecutionsBySimulationId({
  simulationId,
  context,
  pageSize = TASK_PAGE_SIZE,
}: {
  simulationId: string;
  context?: WorkspaceContext | null;
  pageSize?: number;
}) {
  const executions: IExecutionActivity[] = [];
  let page = 1;

  while (true) {
    const response = await getSimulationExecutions({
      context,
      withFacets: false,
      filters: { used__id: simulationId, page, page_size: pageSize },
    });
    executions.push(...response.data);

    if (response.data.length < pageSize) break;
    page += 1;
  }

  return executions;
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

    if (
      includes([CircuitScaleDictionary.Microcircuit, CircuitScaleDictionary.Region], circuit.scale)
    ) {
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

  return getSimulationStatusFromExecutions({
    simulation,
    executions,
    createdStatus: ActivityStatus.CREATED,
    errorStatus: ActivityStatus.ERROR,
  }) as ActivityStatus;
}

export type ExtendedCampaignsType = AwaitedType<ReturnType<typeof list>>;

type TResolvedSimulationByCampaign = Awaited<ReturnType<typeof resolveSimulationByCampaignId>>;
type TResolvedSimulationByCampaigns = Awaited<ReturnType<typeof list>>;

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
      count: count(),
      list,
      one: getSimulationCampaign,
      resolve: resolveSimulationByCampaignId,
      create: createSimulationCampaign,
    },
    expandRow: (record, context) => rows({ id: record.id, context }),
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
