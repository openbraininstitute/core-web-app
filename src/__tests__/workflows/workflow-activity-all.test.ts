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
      const ordered = [...rows].sort((a, b) => b.creation_date.localeCompare(a.creation_date));
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
