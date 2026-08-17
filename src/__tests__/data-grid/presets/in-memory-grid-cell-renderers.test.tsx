import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InMemoryGrid } from '@/features/data-grid/presets/in-memory-grid';
import { CellRendererRegistry } from '@/features/data-grid/react/cell-renderer-registry';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';

interface Row {
  id: string;
  lifecycle_status: string;
}

const rows: Row[] = [{ id: 'a', lifecycle_status: 'active' }];

/**
 * A schema column names its renderer by KEY (as the entitycore bindings do) rather than
 * supplying an inline `renderCell`.
 */
const columns: Array<ISimpleColumn<Row>> = [
  {
    id: 'lifecycleStatus',
    header: 'Lifecycle status',
    getValue: (r) => r.lifecycle_status,
    cellRenderer: 'lifecycleStatus',
    cellRendererParams: { tone: 'green' },
  },
];

function registry() {
  return new CellRendererRegistry().register<Row>('lifecycleStatus', ({ row, value, params }) => (
    <span data-testid="pill" data-tone={(params as { tone?: string })?.tone}>
      {`${row.id}:${String(value)}`}
    </span>
  ));
}

/**
 * Nested grids (e.g. the circuit hierarchy's subcircuit levels) reuse the parent's
 * schema columns, which carry renderer KEYS. Without a registry those cells silently
 * degrade to the plain `getValue` text, so the pills disappear below the top level.
 */
describe('InMemoryGrid — keyed cell renderers', () => {
  it('resolves a column`s `cellRenderer` key against the supplied registry', async () => {
    const { getByTestId } = render(
      <InMemoryGrid<Row>
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        cellRenderers={registry()}
      />
    );

    await waitFor(() => expect(getByTestId('pill')).toBeTruthy());
    // row and value both reach the renderer, as they do through `AgCellHost`
    expect(getByTestId('pill').textContent).toBe('a:active');
    // and so do the column's static renderer params
    expect(getByTestId('pill').getAttribute('data-tone')).toBe('green');
  });

  it('falls back to the plain value when no registry is supplied', async () => {
    const { container, queryByTestId } = render(
      <InMemoryGrid<Row> columns={columns} rows={rows} getRowId={(r) => r.id} />
    );

    await waitFor(() => expect(container.textContent).toContain('active'));
    expect(queryByTestId('pill')).toBeNull();
  });

  it('lets an inline `renderCell` win over the keyed renderer', async () => {
    const inline: Array<ISimpleColumn<Row>> = [
      { ...columns[0], renderCell: () => <span data-testid="inline">inline</span> },
    ];

    const { getByTestId, queryByTestId } = render(
      <InMemoryGrid<Row>
        columns={inline}
        rows={rows}
        getRowId={(r) => r.id}
        cellRenderers={registry()}
      />
    );

    await waitFor(() => expect(getByTestId('inline')).toBeTruthy());
    expect(queryByTestId('pill')).toBeNull();
  });
});
