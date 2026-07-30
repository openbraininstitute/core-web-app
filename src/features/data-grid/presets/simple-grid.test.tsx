import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildSimpleColDefs, SimpleGrid } from './simple-grid';

import type { SimpleColumn } from './simple-grid';

interface Row {
  id: string;
  name: string;
  count: number;
  scan_parameters: Record<string, unknown>;
}

const rows: Row[] = [
  { id: 'a', name: 'Alpha', count: 1, scan_parameters: { seed: 10 } },
  { id: 'b', name: 'Beta', count: 2, scan_parameters: { seed: 20 } },
  { id: 'c', name: 'Gamma', count: 3, scan_parameters: { seed: 30 } },
];

const columns: Array<SimpleColumn<Row>> = [
  { id: 'name', header: 'Name', field: 'name', width: { width: 200 }, pinned: 'left' },
  { id: 'seed', header: 'Seed', getValue: (r) => r.scan_parameters.seed as number },
  {
    id: 'status',
    header: 'Status',
    align: 'center',
    pinned: 'right',
    renderCell: (r) => <span data-testid="status-cell">{r.count > 1 ? 'many' : 'one'}</span>,
  },
];

describe('buildSimpleColDefs', () => {
  it('maps id, header and pinning', () => {
    const defs = buildSimpleColDefs(columns, { sortable: false });
    expect(defs.map((d) => d.colId)).toEqual(['name', 'seed', 'status']);
    expect(defs[0].headerName).toBe('Name');
    expect(defs[0].pinned).toBe('left');
    expect(defs[2].pinned).toBe('right');
  });

  it('uses field when there is no getValue/renderCell', () => {
    const [name] = buildSimpleColDefs(columns, { sortable: false });
    expect(name.field).toBe('name');
    expect(name.valueGetter).toBeUndefined();
    expect(name.cellRenderer).toBeUndefined();
  });

  it('wires getValue into a valueGetter', () => {
    const [, seed] = buildSimpleColDefs(columns, { sortable: false });
    expect(seed.field).toBeUndefined();
    expect(typeof seed.valueGetter).toBe('function');
    // @ts-expect-error narrow to the function form for the test
    expect(seed.valueGetter({ data: rows[1] })).toBe(20);
    // @ts-expect-error null-data path returns null, not undefined
    expect(seed.valueGetter({ data: undefined })).toBeNull();
  });

  it('wires renderCell into a cell renderer with the row-level render fn', () => {
    const [, , status] = buildSimpleColDefs(columns, { sortable: false });
    expect(status.cellRenderer).toBeTypeOf('function');
    expect(status.cellRendererParams?.render).toBe(columns[2].renderCell);
    expect(status.cellClass).toBe('ag-center-aligned-cell');
  });

  it('toggles client-side sorting via the option (opt-out per column)', () => {
    const off = buildSimpleColDefs(columns, { sortable: false });
    expect(off.every((d) => d.sortable === false)).toBe(true);

    const on = buildSimpleColDefs(
      [...columns, { id: 'locked', header: 'Locked', field: 'name', sortable: false }],
      { sortable: true }
    );
    expect(on[0].sortable).toBe(true);
    expect(on.at(-1)?.sortable).toBe(false);
  });
});

describe('SimpleGrid (jsdom mount)', () => {
  it('mounts AG Grid and renders row + column content', async () => {
    const { container } = render(
      <SimpleGrid columns={columns} rows={rows} getRowId={(r) => r.id} />
    );

    await waitFor(() => {
      expect(container.querySelector('.ag-root-wrapper')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(container.querySelector('.ag-header-cell-text')).toBeInTheDocument();
    });
    expect(container.textContent).toContain('Alpha');
    expect(container.querySelectorAll('[data-testid="status-cell"]').length).toBeGreaterThan(0);
  });

  it('renders a pagination panel when pagination is enabled', async () => {
    const { container } = render(
      <SimpleGrid columns={columns} rows={rows} getRowId={(r) => r.id} pagination pageSize={2} />
    );

    await waitFor(() => {
      expect(container.querySelector('.ag-paging-panel')).toBeInTheDocument();
    });
  });
});
