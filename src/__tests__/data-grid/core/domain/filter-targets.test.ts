import { describe, expect, it } from 'vitest';

import { byContext } from '@/features/data-grid/core/domain/contextual';
import {
  activeFilterTarget,
  availableFilterTargets,
  DEFAULT_FILTER_TARGET_ID,
  hydrateFilterTargetIds,
  isFreeEntryTarget,
  resolveFilterTargets,
} from '@/features/data-grid/core/domain/filter-targets';
import { GridController } from '@/features/data-grid/core/grid-controller';

import type { IColumnModel } from '@/features/data-grid/core/domain/column-model';
import type { TFilterModel } from '@/features/data-grid/core/domain/filter-model';
import type { IGridContext } from '@/features/data-grid/core/domain/grid-context';
import type { IGridSchema } from '@/features/data-grid/core/domain/schema';
import type { IStatePersistence } from '@/features/data-grid/core/ports/state-persistence';
import type { IGridState } from '@/features/data-grid/core/state/grid-state';

type Row = { id: string };

const ctx = (over: Partial<IGridContext> = {}): IGridContext => ({
  dataType: 'cell_morphology',
  section: 'data',
  scope: 'project',
  ...over,
});

const setValue = (values: string[]) => ({ kind: 'set', values }) as const;

const speciesLike: IColumnModel<Row> = {
  id: 'species',
  header: 'Species',
  filter: {
    operators: ['in', 'ilike'],
    field: 'subject__species__name',
    facetKey: 'species',
    options: { kind: 'facets' },
    targets: [
      {
        id: 'name',
        label: 'Name',
        field: 'subject__species__name',
        operators: ['in', 'ilike'],
        facetKey: 'species',
        options: { kind: 'facets' },
      },
      { id: 'id', label: 'ID', field: 'subject__species__id', operators: ['in'], advanced: true },
    ],
  },
};

describe('resolveFilterTargets — back-compat synthesis', () => {
  it('synthesises ONE target from a legacy flat filter, keeping the field precedence', () => {
    const [target] = resolveFilterTargets<Row>({
      id: 'mtype',
      header: 'M-type',
      field: 'mtype',
      filter: { operators: ['in'], field: 'mtype__pref_label', facetKey: 'mtype' },
    });
    expect(target).toEqual({
      id: DEFAULT_FILTER_TARGET_ID,
      label: 'M-type',
      field: 'mtype__pref_label',
      operators: ['in'],
      options: undefined,
      facetKey: 'mtype',
      description: undefined,
    });
  });

  it('falls back to column.field then column.id when the filter declares no field', () => {
    expect(
      resolveFilterTargets<Row>({
        id: 'a',
        header: 'A',
        field: 'a_field',
        filter: { operators: [] },
      })[0]?.field
    ).toBe('a_field');
    expect(
      resolveFilterTargets<Row>({ id: 'b', header: 'B', filter: { operators: [] } })[0]?.field
    ).toBe('b');
  });

  it('returns no targets for a column without a filter declaration', () => {
    expect(resolveFilterTargets<Row>({ id: 'weight', header: 'Weight', field: 'weight' })).toEqual(
      []
    );
  });

  it('returns the declared targets verbatim when present', () => {
    expect(resolveFilterTargets(speciesLike).map((t) => t.id)).toEqual(['name', 'id']);
  });
});

describe('availableFilterTargets', () => {
  it('drops targets whose contextual `available` resolves to false', () => {
    const column: IColumnModel<Row> = {
      id: 'species',
      header: 'Species',
      filter: {
        operators: ['in'],
        targets: [
          { id: 'name', label: 'Name', field: 'species__name', operators: ['in'] },
          {
            id: 'id',
            label: 'ID',
            field: 'species__id',
            operators: ['in'],
            available: byContext<boolean>({
              default: false,
              rules: [{ when: { scope: 'project' }, value: true }],
            }),
          },
        ],
      },
    };
    expect(availableFilterTargets(column, ctx()).map((t) => t.id)).toEqual(['name', 'id']);
    expect(availableFilterTargets(column, ctx({ scope: 'public' })).map((t) => t.id)).toEqual([
      'name',
    ]);
  });
});

describe('activeFilterTarget', () => {
  const targets = resolveFilterTargets(speciesLike);

  it('picks the named target', () => {
    expect(activeFilterTarget(targets, 'id')?.field).toBe('subject__species__id');
  });

  it('falls back to the first target for a missing or unknown id', () => {
    expect(activeFilterTarget(targets)?.field).toBe('subject__species__name');
    expect(activeFilterTarget(targets, 'nope')?.field).toBe('subject__species__name');
    expect(activeFilterTarget([])).toBeUndefined();
  });
});

describe('isFreeEntryTarget', () => {
  it('is true only for a DECLARED target with no option source', () => {
    const [name, id] = resolveFilterTargets(speciesLike);
    expect(isFreeEntryTarget(name)).toBe(false);
    expect(isFreeEntryTarget(id)).toBe(true);
    // the synthesised legacy target keeps meaning "fall back to the grid facets"
    const [legacy] = resolveFilterTargets<Row>({
      id: 'x',
      header: 'X',
      filter: { operators: ['in'] },
    });
    expect(isFreeEntryTarget(legacy)).toBe(false);
  });
});

describe('hydrateFilterTargetIds — persisted entries predate targetId', () => {
  const schema: IGridSchema<Row> = {
    id: 'test',
    getRowId: (r) => r.id,
    columns: [
      speciesLike,
      { id: 'name', header: 'Name', filter: { operators: ['ilike'], field: 'name' } },
      { id: 'weight', header: 'Weight', field: 'weight' },
    ],
  };

  it('defaults a missing targetId to targets[0]', () => {
    const stored: TFilterModel = {
      species: { columnId: 'species', operator: 'in', value: setValue(['Mus musculus']) },
    };
    expect(hydrateFilterTargetIds(stored, schema).species?.targetId).toBe('name');
  });

  it('defaults a legacy single-target column to its synthesised target', () => {
    const stored: TFilterModel = {
      name: { columnId: 'name', operator: 'ilike', value: { kind: 'text', text: 'foo' } },
    };
    expect(hydrateFilterTargetIds(stored, schema).name?.targetId).toBe(DEFAULT_FILTER_TARGET_ID);
  });

  it('keeps a known targetId and repairs an unknown one', () => {
    const stored: TFilterModel = {
      species: {
        columnId: 'species',
        operator: 'in',
        targetId: 'id',
        value: setValue(['b2f0e1b2-0000-4000-8000-000000000000']),
      },
    };
    expect(hydrateFilterTargetIds(stored, schema).species?.targetId).toBe('id');

    const stale: TFilterModel = {
      species: { columnId: 'species', operator: 'in', targetId: 'gone', value: setValue(['x']) },
    };
    expect(hydrateFilterTargetIds(stale, schema).species?.targetId).toBe('name');
  });

  it('leaves entries on columns without a filter (and unchanged models) alone', () => {
    const stored: TFilterModel = {
      weight: {
        columnId: 'weight',
        operator: 'range',
        value: { kind: 'range', min: 1, max: null },
      },
    };
    expect(hydrateFilterTargetIds(stored, schema)).toBe(stored);
    expect(hydrateFilterTargetIds({}, schema)).toEqual({});
  });

  it('the controller applies it when hydrating a persisted session slice', () => {
    const slice: Partial<IGridState> = {
      filters: {
        species: { columnId: 'species', operator: 'in', value: setValue(['Mus musculus']) },
      },
    };
    const persistence: IStatePersistence = {
      load: () => slice,
      save: () => {},
      clear: () => {},
    };
    const controller = new GridController<Row>({
      schema,
      context: ctx(),
      instanceKey: 'k',
      persistence: [persistence],
      defaultPageSize: 20,
    });
    expect(controller.store.getSnapshot().filters.species?.targetId).toBe('name');
    controller.dispose();
  });
});
