import { describe, expect, it } from 'vitest';

import { AgCellHost } from './cell-host';
import { buildColDefs, EXPAND_COL_ID } from './col-def-mapper';
import { AgExpandHostCell } from './expand-host-cell';

import type { ResolvedColumn } from '../../core';

interface Row {
  id: string;
}

function col(id: string, over: Partial<ResolvedColumn<Row>> = {}): ResolvedColumn<Row> {
  return { id, header: id, filterAvailable: false, hiddenByDefaultResolved: false, ...over };
}

const OPTIONS = { hidden: new Set<string>(), columnWidths: {} };
const columns = [col('name'), col('subcircuit', { cellRenderer: 'count' }), col('scale')];

describe('buildColDefs — expander placement (backward-compatible default)', () => {
  it('DEFAULT: a detail grid prepends the fixed leading __expand column', () => {
    const defs = buildColDefs(columns, { ...OPTIONS, withExpandColumn: true });
    expect(defs[0]?.colId).toBe(EXPAND_COL_ID);
    expect(defs).toHaveLength(columns.length + 1);
    // the leading column is fixed/non-movable
    expect(defs[0]?.lockPosition).toBe('left');
  });

  it('no detail runtime → no expander column at all (unchanged)', () => {
    const defs = buildColDefs(columns, { ...OPTIONS, withExpandColumn: false });
    expect(defs.some((d) => d.colId === EXPAND_COL_ID)).toBe(false);
    expect(defs).toHaveLength(columns.length);
  });

  it('IN-COLUMN: hosts the expander inside the named column, no leading column', () => {
    const defs = buildColDefs(columns, {
      ...OPTIONS,
      withExpandColumn: true,
      expandColumn: { columnId: 'subcircuit', align: 'right' },
    });
    expect(defs.some((d) => d.colId === EXPAND_COL_ID)).toBe(false);
    expect(defs).toHaveLength(columns.length);

    const host = defs.find((d) => d.colId === 'subcircuit');
    expect(host?.cellRenderer).toBe(AgExpandHostCell);
    expect((host?.cellRendererParams as { expandAlign?: string }).expandAlign).toBe('right');
    // the host column still carries its normal renderer key for its content
    expect((host?.cellRendererParams as { rendererKey?: string }).rendererKey).toBe('count');

    // sibling columns keep the standard cell host (unchanged)
    const sibling = defs.find((d) => d.colId === 'name');
    expect(sibling?.cellRenderer).not.toBe(AgExpandHostCell);
  });

  it('defaults align to right and falls back to a leading column for an unknown columnId', () => {
    const defaultAlign = buildColDefs(columns, {
      ...OPTIONS,
      withExpandColumn: true,
      expandColumn: { columnId: 'subcircuit' },
    });
    const host = defaultAlign.find((d) => d.colId === 'subcircuit');
    expect((host?.cellRendererParams as { expandAlign?: string }).expandAlign).toBe('right');

    const unknown = buildColDefs(columns, {
      ...OPTIONS,
      withExpandColumn: true,
      expandColumn: { columnId: 'does-not-exist' },
    });
    expect(unknown[0]?.colId).toBe(EXPAND_COL_ID);
  });

  it('a plain column with a cellRenderer uses the standard AgCellHost', () => {
    const defs = buildColDefs(columns, { ...OPTIONS, withExpandColumn: false });
    const withRenderer = defs.find((d) => d.colId === 'subcircuit');
    expect(withRenderer?.cellRenderer).toBe(AgCellHost);
  });
});
