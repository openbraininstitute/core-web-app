import { describe, expect, it } from 'vitest';

import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { essentialColumnIds } from '@/features/data-grid/core/domain/column-model';
import { FilterValueKind } from '@/features/data-grid/core/domain/filter-model';
import {
  AUXILIARY_FILTER_GROUP_ID,
  resolveFilterPanelGroups,
} from '@/features/data-grid/core/domain/filter-panel';
import { resolveColumns } from '@/features/data-grid/core/domain/resolve-schema';
import {
  buildGridQuery,
  createInitialState,
  GridController,
} from '@/features/data-grid/core/grid-controller';
import { OperatorId } from '@/features/data-grid/core/operators/default-operators';
import { GridActionType } from '@/features/data-grid/core/state/grid-state';

import type { IColumnModel } from '@/features/data-grid/core/domain/column-model';
import type { IGridContext } from '@/features/data-grid/core/domain/grid-context';
import type { IGridSchema } from '@/features/data-grid/core/domain/schema';

/**
 * Pins the auxiliary-column mechanism: `auxiliary` implies default-hidden, the advanced
 * panel is derived from visibility, and an applied filter survives the move between
 * panel and header untouched (both key it by column id) — breaking that last one would
 * silently corrupt the request.
 */

interface Row {
  id: string;
}

const CTX: IGridContext = { dataType: 'test' };

const strainColumn: IColumnModel<Row> = {
  id: 'strainName',
  header: 'Strain',
  field: 'subject__strain__name',
  auxiliary: true,
  sortable: false,
  filter: { operators: [OperatorId.Ilike, OperatorId.In], field: 'subject__strain__name' },
};

function schemaOf(columns: Array<IColumnModel<Row>>): IGridSchema<Row> {
  return { id: 'test', getRowId: (r) => r.id, columns };
}

const SCHEMA = schemaOf([
  { id: 'name', header: 'Name', field: 'name', filter: { operators: [OperatorId.Ilike] } },
  strainColumn,
]);

/** Every panel entry's state key, flattened across groups. */
function panelKeys(hidden: ReadonlyArray<string>, schema: IGridSchema<Row> = SCHEMA): string[] {
  return resolveFilterPanelGroups(schema, CTX, hidden).flatMap((g) => g.filters.map((f) => f.key));
}

describe('auxiliary implies hidden-by-default', () => {
  it('an auxiliary column resolves hidden without declaring hiddenByDefault', () => {
    const resolved = resolveColumns(SCHEMA, CTX);
    expect(resolved.find((c) => c.id === 'strainName')?.hiddenByDefaultResolved).toBe(true);
    expect(resolved.find((c) => c.id === 'name')?.hiddenByDefaultResolved).toBe(false);
  });

  it('the initial state hides it — one mechanism, not two', () => {
    expect(createInitialState(SCHEMA, CTX, 20).hiddenColumns).toEqual(['strainName']);
  });

  it('an explicit hiddenByDefault still wins over the implication', () => {
    const schema = schemaOf([{ ...strainColumn, hiddenByDefault: false }]);
    expect(createInitialState(schema, CTX, 20).hiddenColumns).toEqual([]);
  });
});

describe('the advanced-filters panel is derived from visibility', () => {
  it('lists a HIDDEN auxiliary column, keyed by its column id', () => {
    const groups = resolveFilterPanelGroups(SCHEMA, CTX, ['strainName']);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe(AUXILIARY_FILTER_GROUP_ID);
    expect(groups[0].filters.map((f) => [f.key, f.label])).toEqual([['strainName', 'Strain']]);
    expect(groups[0].filters[0].targets.map((t) => t.field)).toEqual(['subject__strain__name']);
  });

  it('drops it once it is VISIBLE — the header owns the filter then', () => {
    expect(panelKeys([])).toEqual([]);
  });

  it('never lists a NON-auxiliary column, hidden or not', () => {
    expect(panelKeys(['name', 'strainName'])).toEqual(['strainName']);
  });

  it('appends to a flat schema group rather than growing a second tab', () => {
    const schema: IGridSchema<Row> = {
      ...SCHEMA,
      advancedFilters: [
        {
          id: 'filters',
          label: 'Filters',
          filters: [{ id: 'id', label: 'ID', field: 'id', operators: [OperatorId.In] }],
        },
      ],
    };
    const groups = resolveFilterPanelGroups(schema, CTX, ['strainName']);
    expect(groups).toHaveLength(1);
    expect(groups[0].filters.map((f) => f.key)).toEqual(['adv:filters:id', 'strainName']);
  });

  it('gives auxiliary columns their own group when the schema really is grouped', () => {
    const group = (id: string) => ({
      id,
      label: id,
      filters: [{ id: 'x', label: 'X', field: `${id}_x`, operators: [OperatorId.In] }],
    });
    const schema: IGridSchema<Row> = { ...SCHEMA, advancedFilters: [group('a'), group('b')] };
    const groups = resolveFilterPanelGroups(schema, CTX, ['strainName']);
    expect(groups.map((g) => g.id)).toEqual(['a', 'b', AUXILIARY_FILTER_GROUP_ID]);
  });
});

describe('filter-state continuity across the tick', () => {
  it('a filter applied in the panel survives ticking the column, as ONE wire param', () => {
    const controller = new GridController<Row>({
      schema: SCHEMA,
      context: CTX,
      defaultPageSize: 20,
    });

    // 1. the column starts hidden, so the panel owns its filter
    const key = resolveFilterPanelGroups(
      SCHEMA,
      CTX,
      controller.store.getSnapshot().hiddenColumns
    )[0].filters[0].key;
    expect(key).toBe('strainName');

    // 2. apply it there, exactly as the editor does
    controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: key,
      entry: {
        columnId: key,
        operator: OperatorId.Ilike,
        value: { kind: FilterValueKind.Text, text: 'C57' },
      },
    });
    const applied = controller.store.getSnapshot().filters;
    const beforeParams = serializeQuery(buildGridQuery(controller.store.getSnapshot()), SCHEMA);

    // 3. tick the column in the chooser
    controller.store.dispatch({ type: GridActionType.SetHiddenColumns, hidden: [] });
    const after = controller.store.getSnapshot();

    expect(after.filters).toEqual(applied);
    expect(Object.keys(after.filters)).toEqual(['strainName']);
    expect(panelKeys(after.hiddenColumns)).toEqual([]);

    const afterParams = serializeQuery(buildGridQuery(after), SCHEMA);
    expect(afterParams).toEqual(beforeParams);
    expect(afterParams.subject__strain__name__ilike).toBe('%C57%');
    expect(
      Object.keys(afterParams).filter((k) => k.includes('subject__strain__name'))
    ).toHaveLength(1);
    expect(Object.keys(afterParams).some((k) => k.startsWith('adv:'))).toBe(false);

    // 4. untick it
    controller.store.dispatch({
      type: GridActionType.SetHiddenColumns,
      hidden: ['strainName'],
    });
    const back = controller.store.getSnapshot();
    expect(back.filters).toEqual(applied);
    expect(panelKeys(back.hiddenColumns)).toEqual(['strainName']);

    controller.dispose();
  });
});

describe('essentialColumnIds', () => {
  it('returns the marked columns, in declaration order', () => {
    expect(
      essentialColumnIds([
        { id: 'a' },
        { id: 'b', essential: true },
        { id: 'c', auxiliary: true, essential: true },
      ])
    ).toEqual(['b', 'c']);
  });

  it('falls back to the first NON-auxiliary column when a schema marks nothing', () => {
    expect(essentialColumnIds([{ id: 'aux', auxiliary: true }, { id: 'a' }, { id: 'b' }])).toEqual([
      'a',
    ]);
  });

  it('falls back to the first column when every column is auxiliary', () => {
    expect(
      essentialColumnIds([
        { id: 'a', auxiliary: true },
        { id: 'b', auxiliary: true },
      ])
    ).toEqual(['a']);
  });

  it('is empty only for an empty column list', () => {
    expect(essentialColumnIds([])).toEqual([]);
  });
});
