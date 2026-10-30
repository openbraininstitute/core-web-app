import { getSimulationCampaigns } from '@/api/entitycore/queries/simulation/campaign';
import { getTaskConfigs } from '@/api/entitycore/queries/task/task-config';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { SimulationCampaignEntityTypeDict } from '@/api/entitycore/types/entities/simulation-campaign';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { FACETS_ONLY_PAGE } from '@/constants';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { SortDirection } from '@/features/data-grid/core';
import {
  listActivities,
  listWorkflows,
  WorkflowListContextDict,
} from '@/ui/segments/workflows/config';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { ISimulationCampaignFilter } from '@/api/entitycore/types/entities/simulation-campaign';
import type {
  ITaskConfigFilter,
  TTaskConfigType,
} from '@/api/entitycore/types/entities/task-config';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TEntitycoreParams } from '@/features/data-grid/bindings/entitycore/query-serializer';
import type {
  IFacetBucket,
  IGridDataSource,
  IGridPage,
  IGridQuery,
  IGridSchema,
  TFacets,
} from '@/features/data-grid/core';
import type { FeatureFlags } from '@/features/feature-flags/flags';
import type { WorkspaceContext } from '@/types/common';
import type { TActivityValue } from '@/ui/segments/workflows/config';

/** The table's catch-all Category and Type: the runs of every workflow but the legacy ones. */
export const ALL_WORKFLOWS = 'all';
export type TAllWorkflows = typeof ALL_WORKFLOWS;

type Row = EntityCoreObjectTypes;

type TSourceList = (args: {
  filters: TEntitycoreParams;
  withFacets: boolean;
  context: WorkspaceContext;
}) => Promise<EntityCoreResponse<Row> | undefined>;

/** The workflow a row of the All listing belongs to: its cells read it instead of the toolbar. */
export interface IRowWorkflow {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  /** the workflow's name in the Type menu */
  label: string;
}

export interface IAllWorkflowsSource extends IRowWorkflow {
  list: TSourceList;
}

const taskConfigs =
  (taskConfigType: TTaskConfigType): TSourceList =>
  ({ filters, withFacets, context }) =>
    getTaskConfigs({
      context,
      withFacets,
      filters: { ...(filters as Partial<ITaskConfigFilter>), task_config_type: taskConfigType },
    }) as unknown as Promise<EntityCoreResponse<Row>>;

const simulationCampaigns =
  (own: Partial<ISimulationCampaignFilter>): TSourceList =>
  ({ filters, withFacets, context }) =>
    getSimulationCampaigns({
      context,
      withFacets,
      filters: { ...(filters as Partial<ISimulationCampaignFilter>), ...own },
    }) as unknown as Promise<EntityCoreResponse<Row>>;

/**
 * Where each workflow's runs live and the filter that picks them out: the same as its own
 * listing (its domain config's `list`), without the joins that one makes for rows it expands.
 */
export const ALL_WORKFLOWS_SOURCES: Partial<Record<TExtendedEntitiesTypeDict, TSourceList>> = {
  [ExtendedEntitiesTypeDict.IonChannelBuildCampaign]: taskConfigs(
    TaskConfigType.IonChannelModelingCampaign
  ),
  [ExtendedEntitiesTypeDict.MEModelBuildCampaign]: taskConfigs(TaskConfigType.MEModelBuildCampaign),
  [ExtendedEntitiesTypeDict.BuildSynaptomeCampaign]: taskConfigs(
    TaskConfigType.BuildSynaptomeCampaign
  ),
  [ExtendedEntitiesTypeDict.EmSynapseMappingCampaign]: taskConfigs(
    TaskConfigType.EmSynapseMappingCampaign
  ),
  [ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign]: taskConfigs(
    TaskConfigType.ExtracellularRecordingWeightsCalculationCampaign
  ),
  [ExtendedEntitiesTypeDict.CircuitSynapticPhysiologyCampaign]: taskConfigs(
    TaskConfigType.CircuitSynapticPhysiologyCampaign
  ),
  [ExtendedEntitiesTypeDict.CircuitExtractionCampaign]: taskConfigs(
    TaskConfigType.CircuitExtractionCampaign
  ),
  [ExtendedEntitiesTypeDict.EFeatureExtractionCampaign]: taskConfigs(
    TaskConfigType.EFeatureExtractionCampaign
  ),
  [ExtendedEntitiesTypeDict.SkeletonizationCampaign]: taskConfigs(
    TaskConfigType.SkeletonizationCampaign
  ),
  [ExtendedEntitiesTypeDict.EModelOptimizationCampaign]: taskConfigs(
    TaskConfigType.EModelOptimizationCampaign
  ),
  [ExtendedEntitiesTypeDict.EModelValidationCampaign]: taskConfigs(
    TaskConfigType.EModelValidationCampaign
  ),
  [ExtendedEntitiesTypeDict.IonChannelModelSimulation]: simulationCampaigns({
    entity__type: SimulationCampaignEntityTypeDict.IonChannelModel,
  }),
  [ExtendedEntitiesTypeDict.MemodelCircuitSimulation]: simulationCampaigns({
    entity__type: SimulationCampaignEntityTypeDict.Memodel,
  }),
  [ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation]: simulationCampaigns({
    circuit__scale: CircuitScaleDictionary.Single,
  }),
  [ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation]: simulationCampaigns({
    circuit__scale: CircuitScaleDictionary.PairNeuron,
  }),
  [ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation]: simulationCampaigns({
    circuit__scale: CircuitScaleDictionary.SmallMicrocircuit,
  }),
  [ExtendedEntitiesTypeDict.MicrocircuitSimulation]: simulationCampaigns({
    circuit__scale: CircuitScaleDictionary.Microcircuit,
  }),
  [ExtendedEntitiesTypeDict.RegionCircuitSimulation]: simulationCampaigns({
    circuit__scale: CircuitScaleDictionary.Region,
  }),
  [ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation]: simulationCampaigns({
    circuit__scale: CircuitScaleDictionary.WholeBrain,
  }),
};

/** Every workflow the Type menus offer, legacy ones aside, with the listing of its runs. */
export function allWorkflowsSources(flags: FeatureFlags): IAllWorkflowsSource[] {
  const seen = new Set<TExtendedEntitiesTypeDict>();
  return listActivities(flags).flatMap(({ value: activity }) =>
    listWorkflows({ activity, flags, context: WorkflowListContextDict.Browse }).flatMap(
      ({ targetType, label, disabled, legacy }) => {
        const list = ALL_WORKFLOWS_SOURCES[targetType];
        if (disabled || legacy || !list || seen.has(targetType)) return [];
        seen.add(targetType);
        return [{ activity, targetType, label, list }];
      }
    )
  );
}

const ROW_WORKFLOW = '__workflow';

/** The workflow an All row came from; `undefined` on the rows of a single type's listing. */
export function rowWorkflow(row: unknown): IRowWorkflow | undefined {
  return (row as { [ROW_WORKFLOW]?: IRowWorkflow } | null)?.[ROW_WORKFLOW];
}

/** EntityCore's largest page. */
const MAX_PAGE_SIZE = 1000;

/** A source's first `count` rows in the requested order, and how many it holds in all. */
async function firstRows(
  source: IAllWorkflowsSource,
  filters: TEntitycoreParams,
  count: number,
  context: WorkspaceContext
): Promise<{ rows: Row[]; total: number }> {
  const rows: Row[] = [];
  let total = 0;
  for (let page = 1; rows.length < count; page++) {
    const pageSize = Math.min(MAX_PAGE_SIZE, count);
    // one request unless a page reaches past EntityCore's largest page
    const res = await source.list({
      filters: { ...filters, page, page_size: pageSize },
      withFacets: false,
      context,
    });
    const data = res?.data ?? [];
    total = res?.pagination?.total_items ?? 0;
    rows.push(...data);
    if (data.length < pageSize || rows.length >= total) break;
  }
  const { label, activity, targetType } = source;
  return {
    rows: rows.slice(0, count).map((row) => ({
      ...row,
      [ROW_WORKFLOW]: { activity, targetType, label },
    })),
    total,
  };
}

/** Orders merged rows as EntityCore orders each source: the grid's sort, else newest first. */
function compareRows(query: IGridQuery, schema: IGridSchema<Row>) {
  const [sort] = query.sort;
  const column = schema.columns.find(({ id }) => id === sort?.columnId);
  const field = [column?.sortField].flat()[0] ?? 'creation_date';
  const descending = sort ? sort.direction === SortDirection.Desc : true;
  const sortValue = (row: Row): string =>
    String((row as unknown as Record<string, unknown>)[field] ?? '');
  return (a: Row, b: Row) => {
    const order =
      field === 'creation_date' || field === 'update_date'
        ? Date.parse(sortValue(a)) - Date.parse(sortValue(b))
        : sortValue(a).localeCompare(sortValue(b), undefined, { sensitivity: 'base' });
    return (descending ? -order : order) || a.id.localeCompare(b.id);
  };
}

/** One facet list per key, counts summed over the sources. */
function mergeFacets(all: ReadonlyArray<TFacets | undefined>): TFacets {
  const merged: Record<string, Map<string, IFacetBucket>> = {};
  for (const facets of all) {
    for (const [key, buckets] of Object.entries(facets ?? {})) {
      merged[key] ??= new Map();
      const byId = merged[key];
      for (const bucket of buckets) {
        const seen = byId.get(bucket.id);
        byId.set(bucket.id, seen ? { ...seen, count: seen.count + bucket.count } : { ...bucket });
      }
    }
  }
  return Object.fromEntries(
    Object.entries(merged).map(([key, byId]) => [
      key,
      [...byId.values()].sort((a, b) => b.count - a.count),
    ])
  );
}

/**
 * The All listing: one request per workflow, merged. A page needs every source's rows up to
 * its end, since any of them may hold the rows that belong on it; the total is their sum.
 */
export function createAllWorkflowsDataSource({
  sources,
  schema,
  context,
  transformParams,
}: {
  sources: ReadonlyArray<IAllWorkflowsSource>;
  schema: IGridSchema<Row>;
  context: WorkspaceContext;
  transformParams?: (params: TEntitycoreParams) => TEntitycoreParams;
}): IGridDataSource<Row> {
  const filtersFor = (query: IGridQuery): TEntitycoreParams => {
    // every source's endpoint takes `ilike_search`
    const params = serializeQuery(query, schema, { searchMode: 'ilike' });
    return transformParams ? transformParams(params) : params;
  };

  const fetch = async (query: IGridQuery): Promise<IGridPage<Row>> => {
    const { page: _page, page_size: _pageSize, ...filters } = filtersFor(query);
    const start = (query.page - 1) * query.pageSize;
    const end = start + query.pageSize;
    const results = await Promise.all(
      sources.map((source) => firstRows(source, filters, end, context))
    );
    const rows = results.flatMap((result) => result.rows).sort(compareRows(query, schema));
    return {
      rows: rows.slice(start, end),
      total: results.reduce((sum, result) => sum + result.total, 0),
    };
  };

  const fetchFacets = async (query: IGridQuery): Promise<TFacets | undefined> => {
    const filters = { ...filtersFor(query), ...FACETS_ONLY_PAGE };
    const results = await Promise.all(
      sources.map((source) => source.list({ filters, withFacets: true, context }))
    );
    return mergeFacets(results.map((result) => result?.facets));
  };

  return { fetch, fetchFacets };
}
