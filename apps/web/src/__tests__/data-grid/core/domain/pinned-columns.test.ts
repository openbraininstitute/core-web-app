import { describe, expect, it } from 'vitest';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { circuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/circuit';
import { dropPinnedColumns, reconcileColumnOrder } from '@/features/data-grid/core';
import { buildColDefs } from '@/features/data-grid/renderers/aggrid/col-def-mapper';

import type { IResolvedColumn } from '@/features/data-grid/core';

/**
 * Regression: the Subcircuits column hosts the expand chevron, so it must not be
 * drag-reorderable. Pinned via `IColumnModel.movable`, honoured by both the AG Grid
 * mapper and the stored-order reconciliation.
 */
interface Row {
  id: string;
}

function col(id: string, over: Partial<IResolvedColumn<Row>> = {}): IResolvedColumn<Row> {
  return { id, header: id, filterAvailable: false, hiddenByDefaultResolved: false, ...over };
}

describe('movable flag — AG Grid col defs', () => {
  it('suppresses the drag handle for `movable: false` only', () => {
    const defs = buildColDefs([col('name'), col('subcircuit', { movable: false })], {
      hidden: new Set<string>(),
      columnWidths: {},
    });
    expect(defs.find((d) => d.colId === 'subcircuit')?.suppressMovable).toBe(true);
    expect(defs.find((d) => d.colId === 'name')?.suppressMovable).toBe(false);
  });
});

describe('dropPinnedColumns — a pinned column keeps its declared slot', () => {
  const columns = [col('name'), col('subcircuit', { movable: false }), col('scale')];
  const declared = columns.map((c) => c.id);

  it('ignores a stored position for the pinned column', () => {
    // a layout that parked the pinned column last
    const stored = ['name', 'scale', 'subcircuit'];
    const order = reconcileColumnOrder(declared, dropPinnedColumns(columns, stored));
    expect(order).toEqual(['name', 'subcircuit', 'scale']);
  });

  it('still honours the stored order of the MOVABLE columns', () => {
    const stored = ['scale', 'subcircuit', 'name'];
    const order = reconcileColumnOrder(declared, dropPinnedColumns(columns, stored));
    expect(order).toEqual(['scale', 'name', 'subcircuit']);
  });

  it('is a no-op when nothing is pinned or nothing is stored', () => {
    const movable = [col('name'), col('scale')];
    expect(dropPinnedColumns(movable, ['scale', 'name'])).toEqual(['scale', 'name']);
    expect(dropPinnedColumns(columns, undefined)).toBeUndefined();
    expect(dropPinnedColumns(columns, [])).toEqual([]);
  });
});

describe('circuit schema', () => {
  it('declares the Subcircuits column non-movable', () => {
    const subcircuits = circuitSchema.columns.find(
      (c) => c.id === EntityCoreFields.CircuitSubCircuit
    );
    expect(subcircuits?.movable).toBe(false);
  });

  it('leaves every other circuit column movable', () => {
    const pinned = circuitSchema.columns.filter((c) => c.movable === false).map((c) => c.id);
    expect(pinned).toEqual([EntityCoreFields.CircuitSubCircuit]);
  });
});
