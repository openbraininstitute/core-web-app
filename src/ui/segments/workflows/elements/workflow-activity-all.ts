import { getSimulationCampaigns } from '@/api/entitycore/queries/simulation/campaign';
import { getTaskConfigs } from '@/api/entitycore/queries/task/task-config';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { SimulationCampaignEntityTypeDict } from '@/api/entitycore/types/entities/simulation-campaign';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { FACETS_ONLY_PAGE } from '@/constants';
import { Task } from '@/entity-configuration/domain/task-functions';
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
  ITaskConfig,
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
  signal?: AbortSignal;
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
  ({ filters, withFacets, context, signal }) =>
    getTaskConfigs({
      context,
      withFacets,
      signal,
      filters: { ...(filters as Partial<ITaskConfigFilter>), task_config_type: taskConfigType },
    }) as unknown as Promise<EntityCoreResponse<Row>>;

const simulationCampaigns =
  (own: Partial<ISimulationCampaignFilter>): TSourceList =>
  ({ filters, withFacets, context, signal }) =>
    getSimulationCampaigns({
      context,
      withFacets,
      signal,
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

/**
 * The rows the All listing reaches, EntityCore's largest page: a page takes each source's rows up
 * to its end, so no page asks a source for more than one request.
 */
export const MAX_LISTED_ROWS = 1000;

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
  context: WorkspaceContext,
  signal?: AbortSignal
): Promise<ISourceRows> {
  const res = await source.list({
    filters: { ...filters, page: 1, page_size: count },
    withFacets: false,
    context,
    signal,
  });
  if (!res) throw new Error(`No answer for the ${source.label} workflows`);
  return { rows: tagged(source, res.data ?? []), total: res.pagination?.total_items ?? 0 };
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
  context: WorkspaceContext,
  signal?: AbortSignal
): Promise<ISourceRows> {
  const have = held?.rows.length ?? 0;
  if (held && (have >= count || have >= held.total)) return held;
  if (held && 2 * have >= count) {
    const res = await source.list({
      filters: { ...filters, page: 2, page_size: have },
      withFacets: false,
      context,
      signal,
    });
    if (res?.pagination?.total_items === held.total) {
      const ids = new Set(held.rows.map(({ id }) => id));
      const more = (res.data ?? []).filter(({ id }) => !ids.has(id));
      return { rows: [...held.rows, ...tagged(source, more)], total: held.total };
    }
  }
  return firstRows(source, filters, count, context, signal);
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

const TIME_FIELDS = ['creation_date', 'update_date'];

const sortFieldOf = (schema: IGridSchema<Row>, columnId: string | undefined) =>
  [schema.columns.find(({ id }) => id === columnId)?.sortField].flat()[0];

/**
 * The query with a sort the merge can repeat: by a date, or else the listing's own. A sort by
 * name follows the database's collation, which the browser cannot reproduce.
 */
function mergeable(query: IGridQuery, schema: IGridSchema<Row>): IGridQuery {
  const [sort] = query.sort;
  if (!sort || TIME_FIELDS.includes(sortFieldOf(schema, sort.columnId) ?? '')) return query;
  return { ...query, sort: [...(schema.defaultSort ?? [])] };
}

/**
 * Orders merged rows as EntityCore orders each source: the grid's sort, then newest first and the
 * id, whichever way the sort runs (`ensure_stable_sorting` in its `app/queries/common.py`). Any
 * other tie-break lets rows go missing between pages.
 */
function compareRows(query: IGridQuery, schema: IGridSchema<Row>) {
  const [sort] = query.sort;
  const bySort = byTime(sortFieldOf(schema, sort?.columnId) ?? 'creation_date');
  const descending = sort ? sort.direction === SortDirection.Desc : true;
  const byCreation = byTime('creation_date');
  return (a: Row, b: Row) =>
    (descending ? bySort(b, a) : bySort(a, b)) ||
    byCreation(b, a) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

const EXPANDABLE: ReadonlyArray<string> = [
  TaskConfigType.CircuitExtractionCampaign,
  TaskConfigType.SkeletonizationCampaign,
];

/**
 * A page's task configs with their executions joined in, as a type's own listing has them, in two
 * requests for the page: the Status cell would ask for each row's otherwise. The campaigns that
 * expand are left to it, as in their own listings, and so is every row where the join fails.
 */
async function withExecutions(rows: Row[], context: WorkspaceContext): Promise<Row[]> {
  const campaigns = rows.filter(
    (row): row is Row & ITaskConfig<Record<string, unknown>> =>
      row.type === EntityTypeDict.TaskConfig &&
      'task_config_type' in row &&
      !EXPANDABLE.includes(String(row.task_config_type))
  );
  if (campaigns.length === 0) return rows;
  try {
    const joined = new Map(
      (await Task.withExecutions({ campaigns, context })).map((row) => [row.id, row])
    );
    return rows.map((row) => (joined.get(row.id) as Row | undefined) ?? row);
  } catch {
    return rows;
  }
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

/** What a page of the All listing leaves out. */
export interface IAllWorkflowsGaps {
  /** the workflows whose listing failed, by label */
  failed: string[];
  /** the rows past `MAX_LISTED_ROWS`, which no page reaches */
  unlisted: number;
}

/**
 * The All listing: one request per workflow, merged. A page needs every source's rows up to
 * its end, since any of them may hold the rows that belong on it; the total is their sum, up to
 * `MAX_LISTED_ROWS`. The rows fetched are held for the next pages of the same filter and sort.
 * A source that fails is left out. What a page leaves out is told through `onGaps`, called on
 * every page.
 */
export function createAllWorkflowsDataSource({
  sources,
  schema,
  context,
  transformParams,
  onGaps,
}: {
  sources: ReadonlyArray<IAllWorkflowsSource>;
  schema: IGridSchema<Row>;
  context: WorkspaceContext;
  transformParams?: (params: TEntitycoreParams) => TEntitycoreParams;
  onGaps?: (gaps: IAllWorkflowsGaps) => void;
}): IGridDataSource<Row> {
  const filtersFor = (query: IGridQuery): TEntitycoreParams => {
    // every source's endpoint takes `ilike_search`
    const params = serializeQuery(query, schema, { searchMode: 'ilike' });
    return transformParams ? transformParams(params) : params;
  };

  let held: IHeldRows | null = null;

  const fetch = async (asked: IGridQuery, signal?: AbortSignal): Promise<IGridPage<Row>> => {
    const query = mergeable(asked, schema);
    const { page: _page, page_size: _pageSize, ...filters } = filtersFor(query);
    const start = (query.page - 1) * query.pageSize;
    const end = Math.min(start + query.pageSize, MAX_LISTED_ROWS);
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
      sources.map((source) =>
        rowsUpTo(source, mine.bySource.get(source), filters, end, context, signal)
      )
    );
    if (signal?.aborted) {
      // a page given up on was not served, and its sources did not fail
      mine.served.delete(query.page);
      throw signal.reason;
    }
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
    const total = results.reduce((sum, result) => sum + result.total, 0);
    onGaps?.({ failed, unlisted: Math.max(0, total - MAX_LISTED_ROWS) });
    const rows = results.flatMap((result) => result.rows).sort(compareRows(query, schema));
    return {
      rows: await withExecutions(rows.slice(start, end), context),
      total: Math.min(total, MAX_LISTED_ROWS),
    };
  };

  const fetchFacets = async (
    query: IGridQuery,
    signal?: AbortSignal
  ): Promise<TFacets | undefined> => {
    const filters = { ...filtersFor(query), ...FACETS_ONLY_PAGE };
    const settled = await Promise.allSettled(
      sources.map((source) => source.list({ filters, withFacets: true, context, signal }))
    );
    if (signal?.aborted) throw signal.reason;
    const results = settled.flatMap((result) => (result.status === 'fulfilled' ? [result] : []));
    if (sources.length > 0 && results.length === 0) {
      throw (settled[0] as PromiseRejectedResult).reason;
    }
    return mergeFacets(results.map((result) => result.value?.facets));
  };

  return { fetch, fetchFacets };
}
