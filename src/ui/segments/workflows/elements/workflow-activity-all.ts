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

/**
 * The table's catch-all Category and Type: the runs of every workflow but the legacy ones, or of
 * every such workflow in the chosen category.
 */
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

/**
 * Every workflow the Type menus offer, legacy ones aside, with the listing of its runs: those of
 * one category, or of them all.
 */
export function allWorkflowsSources(
  flags: FeatureFlags,
  category?: TActivityValue
): IAllWorkflowsSource[] {
  const seen = new Set<TExtendedEntitiesTypeDict>();
  const categories = category ? [category] : listActivities(flags).map(({ value }) => value);
  return categories.flatMap((activity) =>
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

/** A source's first rows in the requested order, and how many it holds in all. */
interface ISourceRows {
  rows: Row[];
  total: number;
}

const tagged = ({ label, activity, targetType }: IAllWorkflowsSource, rows: Row[]): Row[] =>
  rows.map((row) => ({ ...row, [ROW_WORKFLOW]: { activity, targetType, label } }));

async function firstRows(
  source: IAllWorkflowsSource,
  filters: TEntitycoreParams,
  count: number,
  context: WorkspaceContext
): Promise<ISourceRows> {
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
    if (!res) throw new Error(`No answer for the ${source.label} workflows`);
    const data = res.data ?? [];
    total = res.pagination?.total_items ?? 0;
    rows.push(...data);
    if (data.length < pageSize || rows.length >= total) break;
  }
  return { rows: tagged(source, rows.slice(0, count)), total };
}

/**
 * A source's first `count` rows, asking only for those past the ones `held`. EntityCore pages by
 * number, so the rows held are taken as its first page and the next of that size is asked for;
 * a jump further than that, or a total that changed meanwhile, starts the source again.
 */
async function rowsUpTo(
  source: IAllWorkflowsSource,
  held: ISourceRows | undefined,
  filters: TEntitycoreParams,
  count: number,
  context: WorkspaceContext
): Promise<ISourceRows> {
  const have = held?.rows.length ?? 0;
  if (held && (have >= count || have >= held.total)) return held;
  if (held && 2 * have >= count && have <= MAX_PAGE_SIZE) {
    const res = await source.list({
      filters: { ...filters, page: 2, page_size: have },
      withFacets: false,
      context,
    });
    if (res?.pagination?.total_items === held.total) {
      const ids = new Set(held.rows.map(({ id }) => id));
      const more = (res.data ?? []).filter(({ id }) => !ids.has(id));
      return { rows: [...held.rows, ...tagged(source, more)], total: held.total };
    }
  }
  return firstRows(source, filters, count, context);
}

/** Rows fetched for one filter and sort are kept this long for the pages that follow. */
const HELD_ROWS_MAX_AGE_MS = 60_000;

interface IHeldRows {
  key: string;
  since: number;
  /** a page asked for again is a refetch, which the rows held must not answer */
  served: Set<number>;
  bySource: Map<IAllWorkflowsSource, ISourceRows>;
}

const fieldOf = (row: Row, field: string): string =>
  String((row as unknown as Record<string, unknown>)[field] ?? '');

/** In microseconds, as EntityCore stores them; `Date.parse` stops at milliseconds. */
const microseconds = (iso: string): number =>
  Date.parse(iso) * 1000 + Number((/\.(\d+)/.exec(iso)?.[1] ?? '').padEnd(6, '0').slice(3, 6));

const byTime = (field: string) => (a: Row, b: Row) =>
  microseconds(fieldOf(a, field)) - microseconds(fieldOf(b, field));

/**
 * Orders merged rows as EntityCore orders each source: the grid's sort, then newest first and the
 * id (`ensure_stable_sorting`). Any other tie-break lets rows go missing between pages.
 */
function compareRows(query: IGridQuery, schema: IGridSchema<Row>) {
  const [sort] = query.sort;
  const column = schema.columns.find(({ id }) => id === sort?.columnId);
  const field = [column?.sortField].flat()[0] ?? 'creation_date';
  const descending = sort ? sort.direction === SortDirection.Desc : true;
  const bySort =
    field === 'creation_date' || field === 'update_date'
      ? byTime(field)
      : (a: Row, b: Row) => fieldOf(a, field).localeCompare(fieldOf(b, field));
  const byCreation = byTime('creation_date');
  return (a: Row, b: Row) =>
    (descending ? bySort(b, a) : bySort(a, b)) ||
    byCreation(b, a) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
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
 * its end, since any of them may hold the rows that belong on it; the total is their sum. The
 * rows fetched are held for the next pages of the same filter and sort. A source that fails is
 * left out and told of through `onFailedSources`, called on every page with those that failed.
 */
export function createAllWorkflowsDataSource({
  sources,
  schema,
  context,
  transformParams,
  onFailedSources,
}: {
  sources: ReadonlyArray<IAllWorkflowsSource>;
  schema: IGridSchema<Row>;
  context: WorkspaceContext;
  transformParams?: (params: TEntitycoreParams) => TEntitycoreParams;
  onFailedSources?: (labels: string[]) => void;
}): IGridDataSource<Row> {
  const filtersFor = (query: IGridQuery): TEntitycoreParams => {
    // every source's endpoint takes `ilike_search`
    const params = serializeQuery(query, schema, { searchMode: 'ilike' });
    return transformParams ? transformParams(params) : params;
  };

  let held: IHeldRows | null = null;

  const fetch = async (query: IGridQuery): Promise<IGridPage<Row>> => {
    const { page: _page, page_size: _pageSize, ...filters } = filtersFor(query);
    const start = (query.page - 1) * query.pageSize;
    const end = start + query.pageSize;
    const key = JSON.stringify(filters);
    if (
      held?.key !== key ||
      held.served.has(query.page) ||
      Date.now() - held.since > HELD_ROWS_MAX_AGE_MS
    ) {
      held = { key, since: Date.now(), served: new Set(), bySource: new Map() };
    }
    const mine = held;
    // before the answer: asked for again meanwhile, it is a refetch all the same
    mine.served.add(query.page);
    const settled = await Promise.allSettled(
      sources.map((source) => rowsUpTo(source, mine.bySource.get(source), filters, end, context))
    );
    const results: ISourceRows[] = [];
    const failed: string[] = [];
    settled.forEach((result, i) => {
      if (result.status === 'rejected') {
        failed.push(sources[i].label);
        return;
      }
      results.push(result.value);
      // two pages may be on their way at once: the longer answer stays
      const before = mine.bySource.get(sources[i]);
      if (
        !before ||
        before.total !== result.value.total ||
        result.value.rows.length >= before.rows.length
      ) {
        mine.bySource.set(sources[i], result.value);
      }
    });
    if (sources.length > 0 && results.length === 0) {
      throw (settled[0] as PromiseRejectedResult).reason;
    }
    onFailedSources?.(failed);
    const rows = results.flatMap((result) => result.rows).sort(compareRows(query, schema));
    return {
      rows: rows.slice(start, end),
      total: results.reduce((sum, result) => sum + result.total, 0),
    };
  };

  const fetchFacets = async (query: IGridQuery): Promise<TFacets | undefined> => {
    const filters = { ...filtersFor(query), ...FACETS_ONLY_PAGE };
    const settled = await Promise.allSettled(
      sources.map((source) => source.list({ filters, withFacets: true, context }))
    );
    const results = settled.flatMap((result) => (result.status === 'fulfilled' ? [result] : []));
    if (sources.length > 0 && results.length === 0) {
      throw (settled[0] as PromiseRejectedResult).reason;
    }
    return mergeFacets(results.map((result) => result.value?.facets));
  };

  return { fetch, fetchFacets };
}
