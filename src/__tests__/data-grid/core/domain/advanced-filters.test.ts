import { describe, expect, it } from 'vitest';

import {
  ADVANCED_FILTER_KEY_PREFIX,
  advancedFilterDefsByKey,
  advancedFilterKey,
  byContext,
  FilterValueKind,
  GridActionType,
  GridController,
  isAdvancedFilterKey,
  OperatorId,
  pruneAdvancedFilters,
  resolveAdvancedFilterGroups,
} from '@/features/data-grid/core';

import type {
  IAdvancedFilterGroup,
  IFilterEntry,
  IGridContext,
  IGridSchema,
  IStatePersistence,
  TFilterModel,
} from '@/features/data-grid/core';

const ctx = (over: Partial<IGridContext> = {}): IGridContext => ({
  dataType: 'cell_morphology',
  section: 'data',
  scope: 'project',
  ...over,
});

type Row = { id: string };

const groups: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'protocol',
    label: 'Protocol',
    filters: [
      { id: 'design', label: 'Design', field: 'proto__design', operators: [OperatorId.In] },
      {
        id: 'doc',
        label: 'Document',
        field: 'proto__doc',
        operators: [OperatorId.Ilike],
        // only offered in the build-workflow section
        available: byContext<boolean>({
          default: false,
          rules: [{ when: { section: 'build' }, value: true }],
        }),
      },
    ],
  },
  {
    id: 'subject',
    label: 'Subject',
    available: byContext<boolean>({
      default: true,
      rules: [{ when: { scope: 'public' }, value: false }],
    }),
    filters: [
      { id: 'strain', label: 'Strain', field: 'subject__strain__name', operators: [OperatorId.In] },
    ],
  },
];

const schema: IGridSchema<Row> = {
  id: 'test',
  getRowId: (r) => r.id,
  advancedFilters: groups,
  columns: [
    { id: 'name', header: 'Name', filter: { operators: [OperatorId.Ilike], field: 'name' } },
  ],
};

const DESIGN_KEY = advancedFilterKey('protocol', 'design');
const DOC_KEY = advancedFilterKey('protocol', 'doc');
const STRAIN_KEY = advancedFilterKey('subject', 'strain');

function setEntry(key: string, targetId: string, values: string[]): IFilterEntry {
  return {
    columnId: key,
    operator: OperatorId.In,
    targetId,
    value: { kind: FilterValueKind.Set, values },
  };
}

describe('advanced filter keys', () => {
  it('namespaces group + filter so a column id can never collide', () => {
    expect(DESIGN_KEY).toBe('adv:protocol:design');
    expect(DESIGN_KEY.startsWith(ADVANCED_FILTER_KEY_PREFIX)).toBe(true);
    expect(isAdvancedFilterKey(DESIGN_KEY)).toBe(true);
    expect(isAdvancedFilterKey('name')).toBe(false);
  });

  it('the same filter id in two groups yields two distinct keys', () => {
    expect(advancedFilterKey('a', 'x')).not.toBe(advancedFilterKey('b', 'x'));
  });
});

describe('resolveAdvancedFilterGroups', () => {
  it('drops filters and whole groups the context excludes', () => {
    const resolved = resolveAdvancedFilterGroups(schema, ctx());
    expect(resolved.map((g) => g.id)).toEqual(['protocol', 'subject']);
    expect(resolved[0].filters.map((f) => f.def.id)).toEqual(['design']);

    const inBuild = resolveAdvancedFilterGroups(schema, ctx({ section: 'build' }));
    expect(inBuild[0].filters.map((f) => f.def.id)).toEqual(['design', 'doc']);

    const inPublic = resolveAdvancedFilterGroups(schema, ctx({ scope: 'public' }));
    expect(inPublic.map((g) => g.id)).toEqual(['protocol']);
  });

  it('carries the state key and the group label for the active-filters list', () => {
    const [protocol] = resolveAdvancedFilterGroups(schema, ctx());
    expect(protocol.filters[0]).toMatchObject({
      key: DESIGN_KEY,
      groupId: 'protocol',
      groupLabel: 'Protocol',
    });
  });

  it('a schema with no advancedFilters resolves to nothing', () => {
    expect(resolveAdvancedFilterGroups({ ...schema, advancedFilters: undefined }, ctx())).toEqual(
      []
    );
  });
});

describe('advancedFilterDefsByKey', () => {
  it('is CONTEXT-FREE — a filter hidden right now still resolves to its field', () => {
    const defs = advancedFilterDefsByKey(schema);
    expect([...defs.keys()]).toEqual([DESIGN_KEY, DOC_KEY, STRAIN_KEY]);
    expect(defs.get(DOC_KEY)?.field).toBe('proto__doc');
  });
});

describe('pruneAdvancedFilters', () => {
  it('drops entries whose definition is gone, keeping column filters untouched', () => {
    const filters: TFilterModel = {
      name: {
        columnId: 'name',
        operator: OperatorId.Ilike,
        value: { kind: FilterValueKind.Text, text: 'x' },
      },
      [DESIGN_KEY]: setEntry(DESIGN_KEY, 'design', ['a']),
      'adv:protocol:removed': setEntry('adv:protocol:removed', 'removed', ['b']),
      'adv:gone:strain': setEntry('adv:gone:strain', 'strain', ['c']),
    };
    expect(Object.keys(pruneAdvancedFilters(filters, schema))).toEqual(['name', DESIGN_KEY]);
  });

  it('repairs a stale targetId and returns the SAME reference when nothing changed', () => {
    const stale: TFilterModel = { [DESIGN_KEY]: setEntry(DESIGN_KEY, 'old-target', ['a']) };
    expect(pruneAdvancedFilters(stale, schema)[DESIGN_KEY].targetId).toBe('design');

    const clean: TFilterModel = { [DESIGN_KEY]: setEntry(DESIGN_KEY, 'design', ['a']) };
    expect(pruneAdvancedFilters(clean, schema)).toBe(clean);
  });
});

/** In-memory persistence adapter over the session slice the app really stores. */
function memoryPersistence(store: Record<string, string>): IStatePersistence {
  return {
    load: (key) => (store[key] ? JSON.parse(store[key]) : null),
    save: (key, state) => {
      store[key] = JSON.stringify({ filters: state.filters, sort: state.sort, page: state.page });
    },
    clear: (key) => {
      delete store[key];
    },
  };
}

describe('advanced filters in grid state', () => {
  const controllerWith = (store: Record<string, string>) =>
    new GridController<Row>({
      schema,
      context: ctx(),
      instanceKey: 'grid',
      persistence: [memoryPersistence(store)],
      defaultPageSize: 20,
    });

  it('ROUND-TRIP: an advanced filter persists and rehydrates through the SAME store', () => {
    const store: Record<string, string> = {};
    const first = controllerWith(store);
    first.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: DESIGN_KEY,
      entry: setEntry(DESIGN_KEY, 'design', ['cell_patch']),
    });

    // it lives in `filters`, next to column filters — not a parallel slice
    expect(first.store.getSnapshot().filters[DESIGN_KEY]).toBeDefined();
    expect(JSON.parse(store.grid).filters[DESIGN_KEY].value.values).toEqual(['cell_patch']);

    const second = controllerWith(store);
    expect(second.store.getSnapshot().filters[DESIGN_KEY]).toEqual(
      setEntry(DESIGN_KEY, 'design', ['cell_patch'])
    );
  });

  it('rehydration drops an entry whose filter the schema no longer declares', () => {
    const store: Record<string, string> = {
      grid: JSON.stringify({
        filters: { 'adv:protocol:removed': setEntry('adv:protocol:removed', 'removed', ['x']) },
        sort: [],
        page: 1,
      }),
    };
    expect(controllerWith(store).store.getSnapshot().filters).toEqual({});
  });

  it('setting a filter resets the page, exactly like a column filter', () => {
    const controller = controllerWith({});
    controller.store.dispatch({ type: GridActionType.SetPage, page: 4 });
    controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: DESIGN_KEY,
      entry: setEntry(DESIGN_KEY, 'design', ['a']),
    });
    expect(controller.store.getSnapshot().page).toBe(1);
  });

  it('CLEAR: one advanced filter can be removed on its own', () => {
    const controller = controllerWith({});
    controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: DESIGN_KEY,
      entry: setEntry(DESIGN_KEY, 'design', ['a']),
    });
    controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: STRAIN_KEY,
      entry: setEntry(STRAIN_KEY, 'strain', ['b']),
    });
    controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: DESIGN_KEY,
      entry: null,
    });
    expect(Object.keys(controller.store.getSnapshot().filters)).toEqual([STRAIN_KEY]);
  });

  it('RESET: clearFilters and resetState wipe advanced and column filters alike', () => {
    const controller = controllerWith({});
    controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: DESIGN_KEY,
      entry: setEntry(DESIGN_KEY, 'design', ['a']),
    });
    controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: 'name',
      entry: {
        columnId: 'name',
        operator: OperatorId.Ilike,
        value: { kind: FilterValueKind.Text, text: 'x' },
      },
    });
    controller.store.dispatch({ type: GridActionType.ClearFilters });
    expect(controller.store.getSnapshot().filters).toEqual({});

    controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: STRAIN_KEY,
      entry: setEntry(STRAIN_KEY, 'strain', ['b']),
    });
    controller.resetState();
    expect(controller.store.getSnapshot().filters).toEqual({});
  });
});
