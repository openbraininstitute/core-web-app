import { describe, expect, it } from 'vitest';

import { reconcileHiddenColumns } from '@/features/data-grid/core/domain/column-layout';
import { GridController } from '@/features/data-grid/core/grid-controller';

import type { IColumnModel } from '@/features/data-grid/core/domain/column-model';
import type { IGridSchema } from '@/features/data-grid/core/domain/schema';
import type { IStatePersistence } from '@/features/data-grid/core/ports/state-persistence';
import type { IGridState } from '@/features/data-grid/core/state/grid-state';

interface Row {
  id: string;
}

function schemaOf(columns: Array<IColumnModel<Row>>): IGridSchema<Row> {
  return { id: 'test', getRowId: (r) => r.id, columns };
}

/** A stub local-layout adapter serving one fixed slice. */
function storedLayout(slice: Partial<IGridState> | null): IStatePersistence {
  return {
    load: () => slice,
    save: () => {},
    clear: () => {},
  };
}

function hydrate(columns: Array<IColumnModel<Row>>, slice: Partial<IGridState> | null): string[] {
  const controller = new GridController<Row>({
    schema: schemaOf(columns),
    context: { dataType: 'test' },
    instanceKey: 'test-key',
    persistence: [storedLayout(slice)],
    defaultPageSize: 10,
  });
  const hidden = controller.store.getSnapshot().hiddenColumns;
  controller.dispose();
  return hidden;
}

const COLUMNS: Array<IColumnModel<Row>> = [
  { id: 'a', header: 'A' },
  { id: 'b', header: 'B' },
  // an AUXILIARY column: declared, but opt-in via the column chooser
  { id: 'aux', header: 'Aux', hiddenByDefault: true },
];

describe('reconcileHiddenColumns', () => {
  it('falls back to hiddenByDefault when nothing is stored', () => {
    expect(
      reconcileHiddenColumns(
        [
          { id: 'a', hiddenByDefaultResolved: false },
          { id: 'aux', hiddenByDefaultResolved: true },
        ],
        null
      )
    ).toEqual(['aux']);
  });

  it('lets a stored snapshot that covers every column win', () => {
    expect(
      reconcileHiddenColumns(
        [
          { id: 'a', hiddenByDefaultResolved: false },
          { id: 'aux', hiddenByDefaultResolved: true },
        ],
        { hiddenColumns: ['a'], columnOrder: ['a', 'aux'] }
      )
    ).toEqual(['a']);
  });

  it('falls back to hiddenByDefault for a column the snapshot never saw', () => {
    expect(
      reconcileHiddenColumns(
        [
          { id: 'a', hiddenByDefaultResolved: false },
          { id: 'aux', hiddenByDefaultResolved: true },
        ],
        { hiddenColumns: [], columnOrder: ['a'] }
      )
    ).toEqual(['aux']);
  });

  it('ignores stored ids that are no longer declared', () => {
    expect(
      reconcileHiddenColumns([{ id: 'a', hiddenByDefaultResolved: false }], {
        hiddenColumns: ['gone'],
        columnOrder: ['a', 'gone'],
      })
    ).toEqual([]);
  });

  it('treats a stored slice with no columnOrder as knowing only its hidden ids', () => {
    expect(
      reconcileHiddenColumns(
        [
          { id: 'a', hiddenByDefaultResolved: false },
          { id: 'aux', hiddenByDefaultResolved: true },
        ],
        { hiddenColumns: ['a'] }
      )
    ).toEqual(['a', 'aux']);
  });

  // an `alwaysVisible` column is load-bearing (e.g. the circuit tree's expand-chevron
  // host), so a layout saved before it became un-hideable is repaired on load
  it('never hides an alwaysVisible column, whatever the stored layout says', () => {
    expect(
      reconcileHiddenColumns(
        [
          { id: 'a', hiddenByDefaultResolved: false },
          { id: 'tree', hiddenByDefaultResolved: false, alwaysVisible: true },
        ],
        { hiddenColumns: ['tree'], columnOrder: ['a', 'tree'] }
      )
    ).toEqual([]);
  });
});

describe('GridController hydration — column visibility', () => {
  it('uses the schema defaults when there is no stored layout', () => {
    expect(hydrate(COLUMNS, null)).toEqual(['aux']);
  });

  it('honours a stored layout that covers every declared column', () => {
    expect(hydrate(COLUMNS, { hiddenColumns: ['b'], columnOrder: ['a', 'b', 'aux'] })).toEqual([
      'b',
    ]);
  });

  // regression: an auxiliary column declared after the user saved a layout is absent
  // from the stored `hiddenColumns` and used to hydrate as visible
  it('hides a NEWLY-declared hiddenByDefault column for a user with stored state', () => {
    expect(hydrate(COLUMNS, { hiddenColumns: [], columnOrder: ['a', 'b'] })).toEqual(['aux']);
  });

  it('keeps a column the user deliberately hid hidden across a schema change', () => {
    expect(hydrate(COLUMNS, { hiddenColumns: ['a'], columnOrder: ['a', 'b'] })).toEqual([
      'a',
      'aux',
    ]);
  });

  it('keeps an auxiliary column the user opted INTO visible', () => {
    expect(hydrate(COLUMNS, { hiddenColumns: [], columnOrder: ['a', 'b', 'aux'] })).toEqual([]);
  });

  it('ignores a stored hidden id that is no longer declared', () => {
    expect(
      hydrate(COLUMNS, { hiddenColumns: ['dropped'], columnOrder: ['a', 'b', 'aux', 'dropped'] })
    ).toEqual([]);
  });
});
