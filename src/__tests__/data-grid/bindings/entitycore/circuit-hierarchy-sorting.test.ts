import { describe, expect, it } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { circuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/circuit';
import { byContext, resolveColumns } from '@/features/data-grid/core';
import {
  CIRCUIT_VIEW_FACTOR,
  CircuitRepresentationView,
} from '@/ui/segments/explore/circuit/helpers';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IGridContext, IGridSchema } from '@/features/data-grid/core';

/**
 * REGRESSION — sorting in the circuit HIERARCHY view.
 *
 * The hierarchy rows are a derivation TREE (roots carrying `sub_circuits`) whose order
 * is structural, and the view-aware data source ignores `order_by` there. The legacy
 * antd listing therefore withheld `sortState`/`setSortState` from `useDataTableColumns`
 * in hierarchy view, so the headers offered no sort at all. The migrated grid kept the
 * headers sortable, so a click changed sort state without changing a single row.
 *
 * The fix is the schema-level contextual `IGridSchema.sortable` gate, resolved by
 * `resolveColumns`. FLAT view must be untouched.
 */
function context(over: Partial<IGridContext> = {}): IGridContext {
  return { dataType: 'circuit', section: WorkspaceSection.Data, scope: 'public', ...over };
}

const hierarchy = context({
  factors: { [CIRCUIT_VIEW_FACTOR]: CircuitRepresentationView.Hierarchy },
});
const flat = context({ factors: { [CIRCUIT_VIEW_FACTOR]: CircuitRepresentationView.Flat } });

function sortableIds(ctx: IGridContext): string[] {
  return resolveColumns<ICircuit>(circuitSchema, ctx)
    .filter((c) => c.sortable)
    .map((c) => c.id);
}

describe('circuit — sorting is off in hierarchy view', () => {
  it('resolves NO sortable column in hierarchy view', () => {
    expect(sortableIds(hierarchy)).toEqual([]);
  });

  it('keeps every declared sortable column in FLAT view', () => {
    const declared = circuitSchema.columns.filter((c) => c.sortable).map((c) => c.id);
    expect(declared.length).toBeGreaterThan(0);
    expect(sortableIds(flat)).toEqual(declared);
  });

  it('keeps sorting on a mount with no view factor (workflow pickers, non-Data surfaces)', () => {
    expect(sortableIds(context())).toEqual(sortableIds(flat));
  });

  it('only the sortable flag changes — the hierarchy column set is otherwise unchanged', () => {
    const ids = resolveColumns<ICircuit>(circuitSchema, hierarchy).map((c) => c.id);
    const filterable = resolveColumns<ICircuit>(circuitSchema, hierarchy)
      .filter((c) => c.filterAvailable)
      .map((c) => c.id);
    const flatFilterable = resolveColumns<ICircuit>(circuitSchema, flat)
      .filter((c) => c.filterAvailable)
      .map((c) => c.id);
    expect(ids.length).toBeGreaterThan(0);
    // filtering is a server concern in BOTH views, so the gate must not touch it
    expect(filterable).toEqual(expect.arrayContaining(flatFilterable));
  });
});

describe('resolveColumns — the generic whole-grid sort gate', () => {
  interface Row {
    id: string;
  }
  const base: IGridSchema<Row> = {
    id: 't',
    getRowId: (r) => r.id,
    columns: [
      { id: 'a', header: 'A', sortable: true },
      { id: 'b', header: 'B' },
    ],
  };

  it('defaults to sortable when a schema declares no gate (no regression)', () => {
    expect(resolveColumns(base, { dataType: 't' }).map((c) => c.sortable)).toEqual([
      true,
      undefined,
    ]);
  });

  it('forces every column non-sortable when the gate resolves false', () => {
    const gated: IGridSchema<Row> = {
      ...base,
      sortable: byContext<boolean>({
        default: true,
        rules: [{ when: { scope: 'tree' }, value: false }],
      }),
    };
    expect(resolveColumns(gated, { dataType: 't', scope: 'tree' }).map((c) => c.sortable)).toEqual([
      false,
      false,
    ]);
    expect(resolveColumns(gated, { dataType: 't', scope: 'list' }).map((c) => c.sortable)).toEqual([
      true,
      undefined,
    ]);
  });

  it('never makes a non-sortable column sortable', () => {
    const alwaysOn: IGridSchema<Row> = { ...base, sortable: true };
    expect(resolveColumns(alwaysOn, { dataType: 't' }).map((c) => c.sortable)).toEqual([
      true,
      undefined,
    ]);
  });
});
