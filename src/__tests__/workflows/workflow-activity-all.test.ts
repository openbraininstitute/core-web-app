import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { SortDirection } from '@/features/data-grid/core';
import {
  ActivityValues,
  listActivities,
  listWorkflows,
  WorkflowListContextDict,
} from '@/ui/segments/workflows/config';
import {
  ALL_WORKFLOWS_SOURCES,
  allWorkflowsSources,
  createAllWorkflowsDataSource,
  type IAllWorkflowsSource,
  rowWorkflow,
} from '@/ui/segments/workflows/elements/workflow-activity-all';
import { buildWorkflowActivitySchema } from '@/ui/segments/workflows/elements/workflow-activity-schema';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { IGridQuery } from '@/features/data-grid/core';
import type { FeatureFlags } from '@/features/feature-flags/flags';

const getTaskConfigs = vi.fn();
const getSimulationCampaigns = vi.fn();

vi.mock('@/api/entitycore/queries/task/task-config', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getTaskConfigs: (args: unknown) => getTaskConfigs(args),
}));
vi.mock('@/api/entitycore/queries/simulation/campaign', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSimulationCampaigns: (args: unknown) => getSimulationCampaigns(args),
}));

const ALL_FLAGS = new Proxy({}, { get: () => true }) as FeatureFlags;
const NO_FLAGS = new Proxy({}, { get: () => false }) as FeatureFlags;
const workspace = { virtualLabId: 'vlab', projectId: 'proj' };

const schema = buildWorkflowActivitySchema({
  activity: undefined,
  activityName: '',
  entityType: undefined,
  workspace,
});

type TRow = { id: string; name: string; creation_date: string; type: string };

const at = (day: number) => `2026-10-${String(day).padStart(2, '0')}T12:00:00Z`;

/** EntityCore's order: `order_by`, then newest first and the id (`ensure_stable_sorting`). */
const serverOrder = (orderBy: string[]) => (a: TRow, b: TRow) => {
  for (const key of [...orderBy, '-creation_date', 'id']) {
    const field = key.replace(/^[-+]/, '') as keyof TRow;
    const order = a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
    if (order) return key.startsWith('-') ? -order : order;
  }
  return 0;
};

/** A source holding `rows` that answers pages the way EntityCore does: in its own order. */
function source(
  targetType: IAllWorkflowsSource['targetType'],
  rows: TRow[],
  facets?: Record<string, { id: string; label: string; count: number }[]>
): IAllWorkflowsSource & { calls: Record<string, unknown>[] } {
  const calls: Record<string, unknown>[] = [];
  return {
    activity: ActivityValues.Simulate,
    targetType,
    label: `label of ${targetType}`,
    calls,
    list: async ({ filters }) => {
      calls.push(filters);
      const page = Number(filters.page ?? 1);
      const pageSize = Number(filters.page_size ?? 30);
      const ordered = [...rows].sort(serverOrder([filters.order_by].flat() as string[]));
      return {
        data: ordered.slice((page - 1) * pageSize, page * pageSize) as never[],
        pagination: { page, page_size: pageSize, total_items: rows.length },
        facets,
      };
    },
  };
}

const row = (id: string, day: number, name = id): TRow => ({
  id,
  name,
  creation_date: at(day),
  type: EntityTypeDict.SimulationCampaign,
});

const query = (over: Partial<IGridQuery> = {}): IGridQuery => ({
  page: 1,
  pageSize: 3,
  sort: [{ columnId: 'creationDate', direction: SortDirection.Desc }],
  filters: {},
  ...over,
});

beforeEach(() => {
  getTaskConfigs.mockReset();
  getSimulationCampaigns.mockReset();
});

describe('allWorkflowsSources', () => {
  const browse = (flags: FeatureFlags) =>
    listActivities(flags).flatMap(({ value: activity }) =>
      listWorkflows({ activity, flags, context: WorkflowListContextDict.Browse })
    );

  it('covers every workflow of the Type menus but the legacy ones', () => {
    const listed = allWorkflowsSources(ALL_FLAGS).map((s) => s.targetType);
    const expected = browse(ALL_FLAGS)
      .filter((w) => !w.disabled && !w.legacy)
      .map((w) => w.targetType);

    expect(new Set(listed)).toEqual(new Set(expected));
    // a workflow added to the menus without a source would vanish from All unnoticed
    for (const type of expected) expect(ALL_WORKFLOWS_SOURCES[type], type).toBeDefined();
  });

  it('leaves out the legacy simulations, and the legacy builds with them', () => {
    const listed = allWorkflowsSources(ALL_FLAGS).map((s) => s.targetType);

    expect(listed).not.toContain(ExtendedEntitiesTypeDict.SingleNeuronSimulation);
    expect(listed).not.toContain(ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation);
    expect(listed).not.toContain(ExtendedEntitiesTypeDict.SingleNeuronSynaptome);
    expect(listed).not.toContain(ExtendedEntitiesTypeDict.IonChannelModelingCampaign);
    expect(listed).toContain(ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation);
  });

  it('follows the feature flags, as the menus do', () => {
    const listed = allWorkflowsSources(NO_FLAGS).map((s) => s.targetType);
    const expected = browse(NO_FLAGS)
      .filter((w) => !w.disabled && !w.legacy)
      .map((w) => w.targetType);

    expect(new Set(listed)).toEqual(new Set(expected));
    expect(listed).not.toContain(ExtendedEntitiesTypeDict.RegionCircuitSimulation);
  });

  it('narrows to a category: the types of its menu but the legacy ones', () => {
    for (const { value: activity } of listActivities(ALL_FLAGS)) {
      const listed = allWorkflowsSources(ALL_FLAGS, activity);
      const expected = listWorkflows({
        activity,
        flags: ALL_FLAGS,
        context: WorkflowListContextDict.Browse,
      })
        .filter((w) => !w.disabled && !w.legacy)
        .map((w) => w.targetType);

      expect(new Set(listed.map((s) => s.targetType))).toEqual(new Set(expected));
      for (const { activity: own } of listed) expect(own).toBe(activity);
    }
  });

  it("asks each workflow's endpoint with the filter of its own listing", async () => {
    getTaskConfigs.mockResolvedValue({ data: [], pagination: { total_items: 0 } });
    getSimulationCampaigns.mockResolvedValue({ data: [], pagination: { total_items: 0 } });
    const sources = allWorkflowsSources(ALL_FLAGS);
    const listOf = (type: IAllWorkflowsSource['targetType']) =>
      sources.find((s) => s.targetType === type)?.list;

    await listOf(ExtendedEntitiesTypeDict.MEModelBuildCampaign)?.({
      filters: { name__ilike: 'x' },
      withFacets: false,
      context: workspace,
    });
    await listOf(ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation)?.({
      filters: { name__ilike: 'x' },
      withFacets: false,
      context: workspace,
    });

    expect(getTaskConfigs.mock.calls[0][0].filters).toEqual({
      name__ilike: 'x',
      task_config_type: TaskConfigType.MEModelBuildCampaign,
    });
    expect(getSimulationCampaigns.mock.calls[0][0].filters).toEqual({
      name__ilike: 'x',
      circuit__scale: CircuitScaleDictionary.SmallMicrocircuit,
    });
  });
});

describe('createAllWorkflowsDataSource', () => {
  const small = () =>
    source(ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation, [
      row('s1', 1),
      row('s4', 4),
      row('s6', 6),
    ]);
  const micro = () =>
    source(ExtendedEntitiesTypeDict.MicrocircuitSimulation, [
      row('m2', 2),
      row('m3', 3),
      row('m5', 5),
    ]);
  const dataSource = (sources: IAllWorkflowsSource[]) =>
    createAllWorkflowsDataSource({ sources, schema, context: workspace });

  it('merges the sources newest first, a page at a time, over their summed total', async () => {
    const all = dataSource([small(), micro()]);

    const first = await all.fetch(query());
    const second = await all.fetch(query({ page: 2 }));

    expect(first.rows.map((r) => r.id)).toEqual(['s6', 'm5', 's4']);
    expect(second.rows.map((r) => r.id)).toEqual(['m3', 'm2', 's1']);
    expect(first.total).toBe(6);
  });

  it("asks every source for its rows up to the page's end, and nothing beyond", async () => {
    const sources = [small(), micro()];

    await dataSource(sources).fetch(query({ page: 2 }));

    for (const { calls } of sources) {
      expect(calls).toEqual([{ order_by: ['-creation_date'], page: 1, page_size: 6 }]);
    }
  });

  it('follows the sort the grid asks for', async () => {
    const byName = source(ExtendedEntitiesTypeDict.MicrocircuitSimulation, [
      row('a', 1, 'beta'),
      row('b', 2, 'Alpha'),
      row('c', 3, 'gamma'),
    ]);

    const page = await dataSource([byName]).fetch(
      query({ sort: [{ columnId: 'name', direction: SortDirection.Asc }] })
    );

    expect(page.rows.map((r) => r.name)).toEqual(['Alpha', 'beta', 'gamma']);
  });

  it('breaks ties as EntityCore does, so no row goes missing between pages', async () => {
    // the same name, so the order falls to creation date, newest first, and not to the id
    const sameName = source(ExtendedEntitiesTypeDict.MicrocircuitSimulation, [
      row('f', 4, 'L5PC'),
      row('c', 3, 'L5PC'),
      row('a', 2, 'L5PC'),
      row('b', 1, 'L5PC'),
    ]);
    const all = dataSource([sameName]);
    const byName = { pageSize: 2, sort: [{ columnId: 'name', direction: SortDirection.Asc }] };

    const first = await all.fetch(query(byName));
    const second = await all.fetch(query({ ...byName, page: 2 }));

    expect([...first.rows, ...second.rows].map((r) => r.id)).toEqual(['f', 'c', 'a', 'b']);
  });

  it('hands every row its workflow, which the Category column reads', async () => {
    const page = await dataSource([small()]).fetch(query());
    const category = schema.columns.find((c) => c.id === 'category');

    expect(rowWorkflow(page.rows[0])).toEqual({
      activity: ActivityValues.Simulate,
      targetType: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
      label: `label of ${ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation}`,
    });
    expect(category?.getValue?.(page.rows[0] as EntityCoreObjectTypes)).toBe('Simulation');
  });

  describe('the rows held between pages', () => {
    const many = (prefix: string, count: number, firstDay: number) =>
      Array.from({ length: count }, (_, i) => row(`${prefix}${i}`, firstDay + i));
    const ids = (page: { rows: { id: string }[] }) => page.rows.map((r) => r.id);

    it('asks, for the next page, only the sources with more rows, and only for those rows', async () => {
      const few = source(ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation, many('s', 2, 1));
      const lots = source(ExtendedEntitiesTypeDict.MicrocircuitSimulation, many('m', 8, 10));
      const all = dataSource([few, lots]);

      const first = await all.fetch(query());
      const second = await all.fetch(query({ page: 2 }));
      const third = await all.fetch(query({ page: 3 }));

      expect(ids(first)).toEqual(['m7', 'm6', 'm5']);
      expect(ids(second)).toEqual(['m4', 'm3', 'm2']);
      expect(ids(third)).toEqual(['m1', 'm0', 's1']);
      expect(few.calls).toHaveLength(1);
      expect(lots.calls.map(({ page, page_size }) => [page, page_size])).toEqual([
        [1, 3],
        [2, 3],
        [2, 6],
      ]);
    });

    it('asks the server again for a page it has already given, as a refetch does', async () => {
      const rows = many('m', 3, 1);
      const one = source(ExtendedEntitiesTypeDict.MicrocircuitSimulation, rows);
      const all = dataSource([one]);
      await all.fetch(query());

      rows[2] = { ...rows[2], name: 'renamed' };
      const again = await all.fetch(query());

      expect(again.rows[0].name).toBe('renamed');
      expect(one.calls).toHaveLength(2);
    });

    it('takes a page asked for again while still on its way as a refetch too', async () => {
      const one = source(ExtendedEntitiesTypeDict.MicrocircuitSimulation, many('m', 3, 1));
      const all = dataSource([one]);
      await all.fetch(query());

      await Promise.all([all.fetch(query({ page: 2 })), all.fetch(query({ page: 2 }))]);

      // the first of the two is answered by the rows held, the second asks again
      expect(one.calls).toHaveLength(2);
    });

    it('starts a source again when its total changed, so no row is listed twice', async () => {
      const rows = many('m', 6, 1);
      const one = source(ExtendedEntitiesTypeDict.MicrocircuitSimulation, rows);
      const all = dataSource([one]);
      const first = await all.fetch(query());

      rows.push(row('new', 20));
      const second = await all.fetch(query({ page: 2 }));

      expect(ids(first)).toEqual(['m5', 'm4', 'm3']);
      expect(ids(second)).toEqual(['m3', 'm2', 'm1']);
      expect(new Set(ids(second)).size).toBe(3);
      expect(second.total).toBe(7);
    });

    it('holds nothing over a change of sort', async () => {
      const one = source(ExtendedEntitiesTypeDict.MicrocircuitSimulation, many('m', 3, 1));
      const all = dataSource([one]);
      await all.fetch(query());

      const byName = await all.fetch(
        query({ page: 2, sort: [{ columnId: 'name', direction: SortDirection.Asc }] })
      );

      expect(byName.rows).toEqual([]);
      expect(one.calls).toHaveLength(2);
      expect(one.calls[1]).toMatchObject({ order_by: ['+name'], page: 1, page_size: 6 });
    });
  });

  describe('a source that fails', () => {
    const failing = (): IAllWorkflowsSource => ({
      activity: ActivityValues.Build,
      targetType: ExtendedEntitiesTypeDict.MEModelBuildCampaign,
      label: 'ME-model',
      list: () => Promise.reject(new Error('down')),
    });

    it('is left out of the page and told of, the rest listed', async () => {
      const onFailedSources = vi.fn();
      const all = createAllWorkflowsDataSource({
        sources: [failing(), small()],
        schema,
        context: workspace,
        onFailedSources,
      });

      const page = await all.fetch(query());

      expect(page.rows.map((r) => r.id)).toEqual(['s6', 's4', 's1']);
      expect(page.total).toBe(3);
      expect(onFailedSources).toHaveBeenLastCalledWith(['ME-model']);
    });

    it('is asked again on the next page', async () => {
      const broken = failing();
      const list = vi.spyOn(broken, 'list');
      const all = dataSource([broken, small()]);

      await all.fetch(query());
      await all.fetch(query({ page: 2 }));

      expect(list).toHaveBeenCalledTimes(2);
    });

    it('has failed where it gives no answer at all', async () => {
      const onFailedSources = vi.fn();
      const silent = { ...failing(), list: async () => undefined };
      const all = createAllWorkflowsDataSource({
        sources: [silent, small()],
        schema,
        context: workspace,
        onFailedSources,
      });

      await all.fetch(query());

      expect(onFailedSources).toHaveBeenLastCalledWith(['ME-model']);
    });

    it('tells of none once every source answers', async () => {
      const onFailedSources = vi.fn();
      const all = createAllWorkflowsDataSource({
        sources: [small()],
        schema,
        context: workspace,
        onFailedSources,
      });

      await all.fetch(query());

      expect(onFailedSources).toHaveBeenLastCalledWith([]);
    });

    it('fails the listing where every source does', async () => {
      const all = dataSource([failing(), failing()]);

      await expect(all.fetch(query())).rejects.toThrow('down');
      await expect(all.fetchFacets?.(query())).rejects.toThrow('down');
    });

    it('is left out of the facets', async () => {
      const counted = source(ExtendedEntitiesTypeDict.MicrocircuitSimulation, [], {
        created_by: [{ id: 'ana', label: 'Ana', count: 2 }],
      });

      const facets = await dataSource([failing(), counted]).fetchFacets?.(query());

      expect(facets?.created_by).toEqual([{ id: 'ana', label: 'Ana', count: 2 }]);
    });
  });

  it('sums the facet counts of the sources', async () => {
    const one = source(ExtendedEntitiesTypeDict.MicrocircuitSimulation, [], {
      created_by: [{ id: 'ana', label: 'Ana', count: 2 }],
    });
    const two = source(ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation, [], {
      created_by: [
        { id: 'ana', label: 'Ana', count: 1 },
        { id: 'bo', label: 'Bo', count: 5 },
      ],
    });

    const facets = await dataSource([one, two]).fetchFacets?.(query());

    expect(facets?.created_by).toEqual([
      { id: 'bo', label: 'Bo', count: 5 },
      { id: 'ana', label: 'Ana', count: 3 },
    ]);
  });
});
